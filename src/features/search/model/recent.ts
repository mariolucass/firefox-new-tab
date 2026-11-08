import type { SearchResult } from "./filter";

const key = "nt-recent-opened";
const limit = 8;

export type RecentEntry = { url: string; label: string; host: string };

/** Lê só quando a busca é aberta pela primeira vez: nada no caminho da abertura da aba. */
export function readRecent(): RecentEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? (parsed as RecentEntry[]).slice(0, limit)
      : [];
  } catch {
    return [];
  }
}

export function pushRecent(
  list: RecentEntry[],
  entry: RecentEntry,
): RecentEntry[] {
  const next = [entry, ...list.filter((item) => item.url !== entry.url)].slice(
    0,
    limit,
  );
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Sem localStorage: só perde o histórico.
  }
  return next;
}

export function recentToResult(entry: RecentEntry): SearchResult {
  return {
    type: "recent",
    id: entry.url,
    label: entry.label,
    detail: entry.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    url: entry.url,
    host: entry.host,
  };
}
