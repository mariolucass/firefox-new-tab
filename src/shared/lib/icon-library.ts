/**
 * Biblioteca de ícones sob demanda: ~3.500 marcas (simple-icons, com a cor
 * oficial) e ~2.300 ícones de linha (Lucide, o mesmo traço da interface).
 *
 * Marcas são arquivos JSON locais divididos em grupos pequenos. Uma aba lê
 * só os grupos de que precisa. A biblioteca Lucide entra apenas no seletor.
 * Cada ícone resolvido também fica em cache para as próximas abas.
 *
 * Chaves: "si:github" (marca), "lu:Inbox" (Lucide). Sem chave, o ícone sai do
 * site (host → marca) e, se não houver marca, do favicon ou do monograma.
 */

export type IconNode = [tag: string, attrs: Record<string, string>];
export type IconEntry = {
  kind: "fill" | "stroke";
  nodes: IconNode[];
  /** Cor oficial da marca (hex sem #), quando há. */
  color?: string;
  title: string;
};

const iconsKey = "nt-icons-v1";
const autoKey = "nt-icons-auto-v1";

let entries: Record<string, IconEntry> | null = null;
/** host → chave do ícone, ou "" quando o host não tem marca (resultado negativo também é cache). */
let autoMap: Record<string, string> | null = null;
let version = 0;
const listeners = new Set<() => void>();

function load<T>(key: string): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "{}") as T;
  } catch {
    return {} as T;
  }
}
type Store = {
  entries: Record<string, IconEntry>;
  autoMap: Record<string, string>;
};
function store(): Store {
  entries ??= load<Record<string, IconEntry>>(iconsKey);
  autoMap ??= load<Record<string, string>>(autoKey);
  return { entries, autoMap };
}
function persist() {
  const { entries: known, autoMap: autos } = store();
  try {
    localStorage.setItem(iconsKey, JSON.stringify(known));
    localStorage.setItem(autoKey, JSON.stringify(autos));
  } catch {
    // Cota cheia: os ícones só recarregam na próxima aba.
  }
}
function notify() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export const subscribeIcons = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const iconsVersion = () => version;

export function cachedIcon(key: string): IconEntry | null {
  return store().entries[key] ?? null;
}
/** undefined = ainda não sabemos; "" = sem marca para este host. */
export function cachedAuto(host: string): string | undefined {
  return store().autoMap[host];
}

// ---------- bibliotecas ----------

type SimpleIcon = { title: string; hex: string; path: string };
type IconIndex = Array<[slug: string, title: string]>;
type LucideIcons = Record<string, Array<[string, Record<string, string>]>>;
const brandGroups = new Map<string, Promise<Record<string, SimpleIcon>>>();
let brandIndex: Promise<IconIndex> | null = null;
let lucideIcons: Promise<LucideIcons> | null = null;

function bucket(slug: string): string {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i++) hash = Math.imul(hash ^ slug.charCodeAt(i), 16777619);
  return (hash >>> 0 & 63).toString(16).padStart(2, "0");
}

function catalogUrl(file: string): string {
  return new URL(`icon-data/${file}.json`, document.baseURI).href;
}

async function readCatalog<T>(file: string): Promise<T> {
  const response = await fetch(catalogUrl(file));
  if (!response.ok) throw new Error(`Icon catalog ${file}: ${response.status}`);
  return response.json() as Promise<T>;
}

function brands(letter: string): Promise<Record<string, SimpleIcon>> {
  let group = brandGroups.get(letter);
  if (!group) {
    group = readCatalog<Record<string, SimpleIcon>>(letter).catch((error) => {
      brandGroups.delete(letter);
      throw error;
    });
    brandGroups.set(letter, group);
  }
  return group;
}

function index(): Promise<IconIndex> {
  brandIndex ??= readCatalog<IconIndex>("index").catch((error) => {
    brandIndex = null;
    throw error;
  });
  return brandIndex;
}

function lucide(): Promise<LucideIcons> {
  lucideIcons ??= import("lucide").then(
    (module) => module.icons as unknown as LucideIcons,
  );
  return lucideIcons;
}

const words = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

function brandEntry(icon: SimpleIcon | undefined): IconEntry | null {
  return icon
    ? {
        kind: "fill",
        nodes: [["path", { d: icon.path }]],
        color: icon.hex,
        title: icon.title,
      }
    : null;
}

function lucideEntry(name: string, all: LucideIcons): IconEntry | null {
  const node = all[name];
  return node
    ? {
        kind: "stroke",
        nodes: node.map(([tag, attrs]) => [tag, attrs] as IconNode),
        title: words(name),
      }
    : null;
}

async function entriesFor(keys: string[]): Promise<IconHit[]> {
  const brandKeys = keys.filter((key) => key.startsWith("si:"));
  const lineKeys = keys.filter((key) => key.startsWith("lu:"));
  const letters = [...new Set(brandKeys.map((key) => bucket(key.slice(3))))];
  const [groups, lines] = await Promise.all([
    Promise.all(letters.map((letter) => brands(letter))),
    lineKeys.length ? lucide() : Promise.resolve(null),
  ]);
  const byLetter = new Map(letters.map((letter, at) => [letter, groups[at]]));
  return keys.flatMap((key) => {
    const entry = key.startsWith("si:")
      ? brandEntry(byLetter.get(bucket(key.slice(3)))?.[key.slice(3)])
      : lines && key.startsWith("lu:")
        ? lucideEntry(key.slice(3), lines)
        : null;
    return entry ? [{ key, entry }] : [];
  });
}

// ---------- host → marca ----------

const hostAlias: Record<string, string> = {
  "mail.google.com": "gmail",
  "gemini.google.com": "googlegemini",
  "music.youtube.com": "youtubemusic",
  "x.com": "x",
  "twitter.com": "x",
  "chatgpt.com": "openai",
  "claude.ai": "claude",
  "developer.mozilla.org": "mdnwebdocs",
  "dev.to": "devdotto",
  "t.me": "telegram",
  "web.whatsapp.com": "whatsapp",
  "docs.google.com": "googledocs",
  "sheets.google.com": "googlesheets",
  "slides.google.com": "googleslides",
};
const secondLevel = new Set(["com", "org", "net", "gov", "edu", "co", "ac"]);

function hostCandidates(host: string): string[] {
  const clean = host
    .replace(/^www\./, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
  if (hostAlias[clean]) return [hostAlias[clean]];
  const labels = clean.split(".");
  if (labels.length < 2 || /^\d+$/.test(labels[labels.length - 1])) return [];
  labels.pop();
  if (labels.length > 1 && secondLevel.has(labels[labels.length - 1]))
    labels.pop();
  const base = labels[labels.length - 1];
  const sub = labels.length > 1 ? labels[0] : "";
  const joined = (value: string) => value.replace(/[^a-z0-9]/g, "");
  return [
    ...(sub ? [joined(base + sub), joined(sub + base)] : []),
    ...(base.length >= 3 ? [joined(base)] : []),
  ];
}

// ---------- fila de resolução (em ociosidade) ----------

const pendingKeys = new Set<string>();
const pendingHosts = new Set<string>();
let scheduled = false;

async function flush() {
  scheduled = false;
  const { entries: known, autoMap: autos } = store();
  const keys = [...pendingKeys].filter((key) => !known[key]);
  const hosts = [...pendingHosts].filter((host) => autos[host] === undefined);
  pendingKeys.clear();
  pendingHosts.clear();
  if (!keys.length && !hosts.length) return;
  try {
    const available = hosts.length ? new Set((await index()).map(([slug]) => slug)) : null;
    const hostMatches = new Map(
      hosts.map((host) => [host, hostCandidates(host).find((slug) => available?.has(slug))]),
    );
    const candidates = [...new Set([...hostMatches.values()].filter((slug): slug is string => !!slug))];
    const found = await entriesFor([
      ...keys,
      ...candidates.map((slug) => `si:${slug}`),
    ]);
    const resolved = new Map(found.map(({ key, entry }) => [key, entry]));
    for (const key of keys) {
      const entry = resolved.get(key);
      if (entry) known[key] = entry;
    }
    for (const host of hosts) {
      const match = hostMatches.get(host);
      if (match) {
        const key = `si:${match}`;
        const entry = resolved.get(key);
        if (entry) known[key] = entry;
        autos[host] = key;
      } else autos[host] = "";
    }
    persist();
    notify();
  } catch {
    // Sem a biblioteca (falha de carga): fica o favicon ou o monograma.
  }
}

/** Pede a resolução de um ícone/host; agrupa tudo numa única passada ociosa. */
export function requestIcon(request: { key?: string; host?: string }) {
  const { entries: known, autoMap: autos } = store();
  if (request.key && !known[request.key]) pendingKeys.add(request.key);
  if (request.host && autos[request.host] === undefined)
    pendingHosts.add(request.host);
  if (scheduled || (!pendingKeys.size && !pendingHosts.size)) return;
  scheduled = true;
  const run = () => void flush();
  if (typeof requestIdleCallback === "function")
    requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 800);
}

// ---------- busca (seletor) ----------

export type IconHit = { key: string; entry: IconEntry };

/** Busca nas duas bibliotecas. Só é chamada com o seletor aberto. */
export async function searchIcons(
  query: string,
  limit = 60,
): Promise<IconHit[]> {
  const text = query.trim().toLowerCase().replace(/\s+/g, "");
  if (!text) return [];
  const scored: Array<{ key: string; rank: number }> = [];
  const [allBrands, allLines] = await Promise.all([index(), lucide()]);
  for (const [slug, title] of allBrands) {
    const name = title.toLowerCase().replace(/\s+/g, "");
    if (slug.startsWith(text) || name.startsWith(text))
      scored.push({ key: `si:${slug}`, rank: 0 });
    else if (slug.includes(text) || name.includes(text))
      scored.push({ key: `si:${slug}`, rank: 2 });
  }
  for (const name of Object.keys(allLines)) {
    const flat = name.toLowerCase();
    if (flat.startsWith(text)) scored.push({ key: `lu:${name}`, rank: 1 });
    else if (flat.includes(text)) scored.push({ key: `lu:${name}`, rank: 3 });
  }
  scored.sort((a, b) => a.rank - b.rank || a.key.length - b.key.length);
  return entriesFor(scored.slice(0, limit).map(({ key }) => key));
}

/** Entradas para chaves conhecidas (sugestões iniciais do seletor). */
export async function iconsFor(keys: string[]): Promise<IconHit[]> {
  return entriesFor(keys);
}

/** Grava no cache a escolha feita no seletor, para a página inicial não precisar carregar nada. */
export function rememberIcon(hit: IconHit) {
  store().entries[hit.key] = hit.entry;
  persist();
  notify();
}
