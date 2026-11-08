import { isNoiseHost, hostOf } from "@features/frequent/model/top-sites";

export type ClosedTab = { url: string; title: string; host: string };

type RawSession = { tab?: { url?: string; title?: string } };

declare const browser:
  | {
      sessions?: {
        getRecentlyClosed(options: {
          maxResults?: number;
        }): Promise<RawSession[]>;
      };
    }
  | undefined;

/**
 * Abas fechadas há pouco (API `sessions` do Firefox, permissão "sessions").
 * Só http(s); sem localhost, logins e buscadores; sem repetir endereço.
 * Fora de uma extensão (pnpm dev), devolve lista vazia.
 */
export async function fetchClosedTabs(limit = 10): Promise<ClosedTab[]> {
  try {
    if (typeof browser === "undefined" || !browser?.sessions?.getRecentlyClosed)
      return [];
    const raw = await browser.sessions.getRecentlyClosed({ maxResults: 25 });
    const seen = new Set<string>();
    const tabs: ClosedTab[] = [];
    for (const session of raw) {
      const url = session.tab?.url;
      if (!url || !/^https?:\/\//.test(url) || seen.has(url)) continue;
      const host = hostOf(url);
      if (!host || isNoiseHost(host)) continue;
      seen.add(url);
      tabs.push({ url, title: session.tab?.title?.trim() || host, host });
      if (tabs.length === limit) break;
    }
    return tabs;
  } catch {
    return [];
  }
}
