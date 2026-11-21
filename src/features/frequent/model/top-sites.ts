import type { Shortcut } from "@shared/model/settings";

/** Site frequente, vindo do histórico do navegador (API topSites). */
export type TopSite = {
  url: string;
  title: string;
  host: string;
  /** data: URL do favicon, entregue pelo próprio navegador (sem rede). */
  favicon?: string;
  /** Visitas nos últimos 60 dias (histórico do navegador), quando a permissão existe. */
  visits?: number;
};

type HistoryItem = {
  url?: string;
  title?: string;
  visitCount?: number;
  typedCount?: number;
  lastVisitTime?: number;
};

type RawTopSite = { url?: string; title?: string; favicon?: string | null };

declare const browser:
  | {
      history?: {
        search(query: { text: string; startTime?: number; maxResults?: number }): Promise<HistoryItem[]>;
      };
      topSites?: {
        get(options: {
          includeFavicon?: boolean;
          onePerDomain?: boolean;
          limit?: number;
        }): Promise<RawTopSite[]>;
      };
    }
  | undefined;

/**
 * Domínios que aparecem muito no histórico mas não são destino: login, a
 * própria página de busca (o Nexo já busca) e redirecionadores.
 */
const ignoredHosts = new Set([
  "www.google.com",
  "google.com",
  "accounts.google.com",
  "accounts.google.com.br",
  "accounts.youtube.com",
  "consent.google.com",
  "login.microsoftonline.com",
]);

export function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

/** Histórico dos últimos `days` dias (Firefox ou Chromium); vazio sem permissão. */
async function readHistory(days: number): Promise<HistoryItem[]> {
  const query = { text: "", startTime: Date.now() - days * 86_400_000, maxResults: 5000 };
  try {
    if (typeof browser !== "undefined" && browser?.history?.search) return await browser.history.search(query);
    if (typeof chrome !== "undefined" && chrome.history?.search)
      return await new Promise<HistoryItem[]>((resolve) => chrome.history.search(query, (items) => resolve(items)));
  } catch {
    // Sem permissão "history": segue só com topSites.
  }
  return [];
}

/**
 * Lê os sites mais frequentes. O topSites do navegador devolve poucos (e o
 * Firefox ainda tira os fixados), então o ranking vem do histórico: por
 * domínio, visitas + digitadas ×3 nos últimos 60 dias. O topSites entra como
 * bônus de frecência e como fonte dos favicons. Fora de uma extensão, vazio.
 */
export async function fetchTopSites(limit = 60): Promise<TopSite[]> {
  let raw: RawTopSite[] = [];
  try {
    if (typeof browser !== "undefined" && browser?.topSites?.get) {
      raw = await browser.topSites.get({
        includeFavicon: true,
        onePerDomain: true,
        limit: 100,
      });
    } else if (typeof chrome !== "undefined" && chrome.topSites?.get) {
      raw = await new Promise<RawTopSite[]>((resolve) =>
        chrome.topSites.get((sites) => resolve(sites)),
      );
    }
  } catch {
    raw = [];
  }
  const history = await readHistory(60);

  type Entry = TopSite & { score: number; best: number };
  const byHost = new Map<string, Entry>();
  raw.forEach((item, index) => {
    if (!item.url || !/^https?:/.test(item.url)) return;
    const host = hostOf(item.url);
    if (!host || byHost.has(host)) return;
    byHost.set(host, {
      url: item.url,
      title: (item.title || host).trim(),
      host,
      favicon: item.favicon || undefined,
      score: Math.max(0, 40 - index),
      best: 0,
    });
  });
  const visitsOf = new Map<string, number>();
  for (const item of history) {
    if (!item.url || !/^https?:/.test(item.url)) continue;
    const host = hostOf(item.url);
    if (!host) continue;
    const weight = (item.visitCount ?? 1) + (item.typedCount ?? 0) * 3;
    visitsOf.set(host, (visitsOf.get(host) ?? 0) + weight);
    const entry = byHost.get(host) ?? {
      url: new URL(item.url).origin + "/",
      title: host,
      host,
      score: 0,
      best: 0,
    };
    // A página mais visitada do domínio dá o título.
    if (weight > entry.best && item.title) {
      entry.best = weight;
      if (!byHost.has(host) || entry.title === host) entry.title = item.title.trim();
    }
    byHost.set(host, entry);
  }
  return [...byHost.values()]
    .map((entry) => ({ ...entry, visits: visitsOf.get(entry.host), score: entry.score + (visitsOf.get(entry.host) ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry): TopSite => ({
      url: entry.url,
      title: entry.title,
      host: entry.host,
      favicon: entry.favicon,
      visits: entry.visits,
    }));
}

/** localhost e IPs: portas de desenvolvimento passageiras, não destinos. */
export function isLocal(host: string): boolean {
  return /^(localhost|127\.|\d{1,3}(\.\d{1,3}){3}|\[::1\]|.+\.(local|localhost))(:|$)/.test(
    host,
  );
}

/** Não é destino: porta de desenvolvimento, login ou página de busca. Fora dos Recentes. */
export function isNoiseHost(host: string): boolean {
  return isLocal(host) || ignoredHosts.has(host);
}

/** Frequentes que ainda não são atalhos, sem logins, buscadores e localhost. */
export function frequentNotSaved(
  sites: TopSite[],
  shortcuts: Shortcut[],
  limit = 12,
): TopSite[] {
  const saved = new Set(shortcuts.map((item) => hostOf(item.url)));
  return sites
    .filter(
      (site) =>
        !saved.has(site.host) &&
        !ignoredHosts.has(site.host) &&
        !isLocal(site.host),
    )
    .slice(0, limit);
}

/**
 * Nome curto para o bloco (cabe em ~12 caracteres): o título da página até o
 * primeiro separador, se for curto; senão, o nome do domínio sem www e sem
 * sufixo ("biblioteca.ifce.edu.br" → "biblioteca", "jobs.quickin.io" →
 * "quickin"). O endereço completo continua na dica (title) do bloco.
 */
export function siteName(site: TopSite): string {
  const title = site.title.split(/\s[-–—|·:]\s/)[0].trim();
  if (title && title.length <= 14 && title !== site.host) return title;
  const parts = site.host.replace(/^www\./, "").split(".");
  const suffixes = new Set([
    "com",
    "net",
    "org",
    "edu",
    "gov",
    "co",
    "io",
    "br",
    "app",
    "dev",
  ]);
  while (parts.length > 1 && suffixes.has(parts[parts.length - 1])) parts.pop();
  const name =
    parts.length > 1 && parts[0].length <= 4
      ? parts[parts.length - 1]
      : parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Favicon por domínio, para os atalhos salvos ganharem o ícone real do site. */
export function faviconsByHost(sites: TopSite[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const site of sites) if (site.favicon) map.set(site.host, site.favicon);
  return map;
}
