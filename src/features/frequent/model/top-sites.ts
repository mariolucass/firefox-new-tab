import type { Shortcut } from "@shared/model/settings";

/** Site frequente, vindo do histórico do navegador (API topSites). */
export type TopSite = {
  url: string;
  title: string;
  host: string;
  /** data: URL do favicon, entregue pelo próprio navegador (sem rede). */
  favicon?: string;
};

type RawTopSite = { url?: string; title?: string; favicon?: string | null };

declare const browser:
  | {
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

/**
 * Lê os sites mais frequentes. Firefox: `browser.topSites` (frecência do
 * histórico, um por domínio, com favicon). Chromium: `chrome.topSites`, sem
 * favicon. Fora de uma extensão (pnpm dev), devolve lista vazia.
 */
export async function fetchTopSites(limit = 40): Promise<TopSite[]> {
  let raw: RawTopSite[] = [];
  try {
    if (typeof browser !== "undefined" && browser?.topSites?.get) {
      raw = await browser.topSites.get({
        includeFavicon: true,
        onePerDomain: true,
        limit,
      });
    } else if (typeof chrome !== "undefined" && chrome.topSites?.get) {
      raw = await new Promise<RawTopSite[]>((resolve) =>
        chrome.topSites.get((sites) => resolve(sites)),
      );
    }
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const sites: TopSite[] = [];
  for (const item of raw) {
    if (!item.url || !/^https?:/.test(item.url)) continue;
    const host = hostOf(item.url);
    if (!host || seen.has(host)) continue;
    seen.add(host);
    sites.push({
      url: item.url,
      title: (item.title || host).trim(),
      host,
      favicon: item.favicon || undefined,
    });
  }
  return sites;
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
  limit = 8,
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
