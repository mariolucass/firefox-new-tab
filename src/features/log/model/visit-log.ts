/**
 * Registro de acessos feitos a partir do Nexo — para olhar depois e decidir
 * o que vira atalho, seção ou recurso. Só neste navegador (localStorage),
 * nada sai daqui. Teto de 5.000 entradas (as mais antigas saem).
 */
export type VisitSource =
  | "busca"
  | "favorito"
  | "atalho"
  | "foco"
  | "drive"
  | "frequente"
  | "copiado"
  | "pagina";

export type Visit = {
  /** Epoch ms. */
  at: number;
  url: string;
  host: string;
  label: string;
  source: VisitSource;
  context: string;
  /** O que foi digitado na busca, quando veio de lá. */
  query?: string;
};

const key = "nt-visit-log";
const LIMIT = 5000;
let context = "";

/** O contexto ativo entra em cada registro (a página atualiza ao trocar). */
export function setLogContext(name: string) {
  context = name;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function readLog(): Visit[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as Visit[]) : [];
  } catch {
    return [];
  }
}

export function logVisit(entry: { url: string; label?: string; source: VisitSource; query?: string }) {
  if (!/^https?:\/\//i.test(entry.url)) return;
  const visit: Visit = {
    at: Date.now(),
    url: entry.url,
    host: hostOf(entry.url),
    label: (entry.label ?? "").trim().slice(0, 120),
    source: entry.source,
    context,
    ...(entry.query ? { query: entry.query.trim().slice(0, 200) } : {}),
  };
  try {
    const log = readLog();
    log.push(visit);
    localStorage.setItem(key, JSON.stringify(log.slice(-LIMIT)));
  } catch {
    // Sem espaço ou sem localStorage: o registro é só um extra.
  }
}

export function clearLog() {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignora.
  }
}

export type HostStat = { host: string; count: number; bySource: Partial<Record<VisitSource, number>>; last: number; sample: Visit };
export type QueryStat = { query: string; count: number };
export type Suggestion = {
  kind: "shortcut" | "favorite" | "section" | "search";
  title: string;
  detail: string;
  url?: string;
  label?: string;
  host?: string;
};

/** Domínios mais acessados no período, com a origem de cada acesso. */
export function hostStats(log: Visit[], since = 0): HostStat[] {
  const byHost = new Map<string, HostStat>();
  for (const visit of log) {
    if (visit.at < since || !visit.host) continue;
    const stat = byHost.get(visit.host) ?? { host: visit.host, count: 0, bySource: {}, last: 0, sample: visit };
    stat.count += 1;
    stat.bySource[visit.source] = (stat.bySource[visit.source] ?? 0) + 1;
    if (visit.at >= stat.last) {
      stat.last = visit.at;
      stat.sample = visit;
    }
    byHost.set(visit.host, stat);
  }
  return [...byHost.values()].sort((a, b) => b.count - a.count || b.last - a.last);
}

/** Termos mais buscados (normalizados), para ver o que falta ter à mão. */
export function queryStats(log: Visit[], since = 0): QueryStat[] {
  const counts = new Map<string, number>();
  for (const visit of log) {
    if (visit.at < since || !visit.query) continue;
    const query = visit.query.toLowerCase().replace(/\s+/g, " ").trim();
    if (query.length < 2 || /^https?:/.test(query)) continue;
    counts.set(query, (counts.get(query) ?? 0) + 1);
  }
  return [...counts.entries()].map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count);
}

/**
 * Sugestões a partir do uso: domínio aberto muitas vezes sem atalho → criar
 * atalho; muito acesso a um mesmo domínio → talvez uma seção; termo buscado
 * repetidamente → um prefixo ou atalho resolveria mais rápido.
 */
export function suggestions(
  log: Visit[],
  shortcutHosts: Set<string>,
  since = 0,
  favoriteHosts: Set<string> = new Set(),
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const stat of hostStats(log, since).slice(0, 30)) {
    const viaSearch = (stat.bySource.busca ?? 0) + (stat.bySource.copiado ?? 0);
    const mostlySearched = stat.count >= 3 && viaSearch >= Math.ceil(stat.count / 2);
    if (shortcutHosts.has(stat.host) && !favoriteHosts.has(stat.host) && mostlySearched) {
      // Tem atalho, mas a pessoa ainda digita: o atalho não está à mão.
      out.push({
        kind: "favorite",
        title: `Tornar ${stat.host} favorito`,
        detail: `Você tem o atalho, mas abriu ${viaSearch} de ${stat.count} vezes pela busca. Como favorito, abre com uma tecla (1–9).`,
        host: stat.host,
      });
    } else if (!shortcutHosts.has(stat.host) && mostlySearched) {
      out.push({
        kind: "shortcut",
        title: `Criar atalho para ${stat.host}`,
        detail: `${stat.count} acessos, ${viaSearch} digitando ou colando o endereço`,
        url: stat.sample.url,
        label: stat.sample.label || stat.host,
      });
    } else if (stat.count >= 15) {
      out.push({
        kind: "section",
        title: `${stat.host} merece uma seção?`,
        detail: `${stat.count} acessos no período — o que você faz lá que daria para fazer daqui?`,
      });
    }
  }
  for (const query of queryStats(log, since).slice(0, 10)) {
    if (query.count >= 3)
      out.push({
        kind: "search",
        title: `Você buscou "${query.query}" ${query.count} vezes`,
        detail: "Um atalho, prefixo ou seção resolveria isso sem digitar.",
      });
  }
  return out.slice(0, 8);
}

const sourceNames: Record<VisitSource, string> = {
  busca: "busca",
  favorito: "favorito",
  atalho: "atalho do contexto",
  foco: "em foco",
  drive: "Drive",
  frequente: "frequentes",
  copiado: "link copiado",
  pagina: "outro link da página",
};
export const sourceName = (source: VisitSource) => sourceNames[source];

/** Resumo em Markdown, pronto para colar numa IA e pedir uma análise. */
export function markdownSummary(log: Visit[], since: number, label: string): string {
  const hosts = hostStats(log, since).slice(0, 25);
  const queries = queryStats(log, since).slice(0, 20);
  const total = log.filter((visit) => visit.at >= since).length;
  const lines = [
    `# Uso do Nexo (nova aba) — ${label}`,
    "",
    `${total} acessos feitos a partir da nova aba.`,
    "",
    "## Domínios mais acessados",
    "",
    "| Domínio | Acessos | Origem |",
    "|---|---:|---|",
    ...hosts.map(
      (stat) =>
        `| ${stat.host} | ${stat.count} | ${Object.entries(stat.bySource)
          .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
          .map(([source, count]) => `${sourceNames[source as VisitSource]} ${count}`)
          .join(", ")} |`,
    ),
    "",
    "## Termos mais buscados",
    "",
    ...(queries.length ? queries.map((query) => `- "${query.query}" — ${query.count}×`) : ["- (nenhum)"]),
    "",
    "## Pergunta",
    "",
    "Com base nesse uso, o que deveria virar atalho, seção ou recurso na minha página de nova aba para eu chegar mais rápido onde vou com frequência? O que eu acesso de forma indireta que poderia ser resolvido direto na nova aba?",
  ];
  return lines.join("\n");
}

export function csv(log: Visit[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return [
    "data,dominio,origem,contexto,nome,busca,url",
    ...log.map((visit) =>
      [new Date(visit.at).toISOString(), visit.host, visit.source, visit.context, visit.label, visit.query ?? "", visit.url]
        .map((value) => escape(String(value)))
        .join(","),
    ),
  ].join("\n");
}
