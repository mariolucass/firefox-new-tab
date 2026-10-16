import type { FocusItem, Shortcut } from "@shared/model/settings";

export type SearchResult =
  | { type: "shortcut"; id: string; label: string; detail: string; url: string }
  | { type: "project"; id: string; label: string; detail: string; url: string };

function matches(value: string, query: string): boolean {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .includes(query);
}

export function filterItems(
  shortcuts: Shortcut[],
  focusItems: FocusItem[],
  query: string,
): SearchResult[] {
  const normalized = query
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
  if (!normalized) return [];
  const links: SearchResult[] = shortcuts
    .filter((item) =>
      matches(
        [item.label, item.context, ...item.keywords].join(" "),
        normalized,
      ),
    )
    .sort(
      (a, b) => Number(b.favorite) - Number(a.favorite) || a.order - b.order,
    )
    .map((item) => ({
      type: "shortcut",
      id: item.id,
      label: item.label,
      detail: item.url,
      url: item.url,
    }));
  const projects: SearchResult[] = focusItems
    .filter(
      (item) =>
        item.url &&
        matches(
          [item.title, item.description ?? "", item.context].join(" "),
          normalized,
        ),
    )
    .map((item) => ({
      type: "project",
      id: item.id,
      label: item.title,
      detail: "Projeto · " + item.context,
      url: item.url!,
    }));
  return [...links, ...projects].slice(0, 8);
}
