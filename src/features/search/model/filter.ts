import type { TopSite } from "@features/frequent/model/top-sites";
import {
  validUrl,
  type FocusItem,
  type Shortcut,
} from "@shared/model/settings";

export type SearchResult = {
  type: "shortcut" | "project" | "frequent" | "recent" | "closed";
  id: string;
  label: string;
  /** Endereço sem esquema, como a barra do Firefox mostra. */
  detail: string;
  url: string;
  icon?: string;
  host?: string;
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

/** Endereço para exibir: sem https://, sem barra final. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Se o texto digitado já é um endereço, devolve a URL para abrir direto.
 * Prevenção de erro: "github.com/x" ou "localhost:3000" não devem virar uma
 * pesquisa no Google. Texto com espaço nunca é endereço.
 */
export function typedUrl(query: string): string | null {
  const text = query.trim();
  if (!text || /\s/.test(text)) return null;
  if (/^https?:\/\//i.test(text)) return validUrl(text);
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d{1,5})?(\/\S*)?$/i.test(text))
    return validUrl(`http://${text}`);
  if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d{1,5})?(\/\S*)?$/i.test(text))
    return validUrl(`https://${text}`);
  return null;
}

/** Favoritos na ordem do usuário; os nove primeiros ganham teclas 1–9. */
export function favoriteShortcuts(shortcuts: Shortcut[]): Shortcut[] {
  return shortcuts
    .filter((item) => item.favorite)
    .sort((a, b) => a.order - b.order);
}

/** 0 = o nome começa com a busca, 1 = alguma palavra começa, 2 = contém. */
function rank(label: string, query: string): number {
  const name = normalize(label);
  if (name.startsWith(query)) return 0;
  return name.split(/[\s\-_.:/]+/).some((word) => word.startsWith(query))
    ? 1
    : 2;
}

function matches(value: string, query: string): boolean {
  return normalize(value).includes(query);
}

export function filterItems(
  shortcuts: Shortcut[],
  focusItems: FocusItem[],
  query: string,
  frequent: TopSite[] = [],
): SearchResult[] {
  const normalized = normalize(query.trim());
  if (!normalized) return [];
  const links: SearchResult[] = shortcuts
    .filter((item) =>
      matches(
        [item.label, item.context, hostOf(item.url), ...item.keywords].join(
          " ",
        ),
        normalized,
      ),
    )
    .sort(
      (a, b) =>
        rank(a.label, normalized) - rank(b.label, normalized) ||
        Number(b.favorite) - Number(a.favorite) ||
        a.order - b.order,
    )
    .map((item) => ({
      type: "shortcut",
      id: item.id,
      label: item.label,
      detail: displayUrl(item.url),
      url: item.url,
      icon: item.icon,
      host: hostOf(item.url),
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
      detail: displayUrl(item.url!),
      url: item.url!,
      host: hostOf(item.url!),
    }));
  // Frequentes do navegador que não repetem um atalho já listado.
  const listed = new Set(links.map((item) => item.host));
  const sites: SearchResult[] = frequent
    .filter(
      (site) =>
        !listed.has(site.host) &&
        matches(`${site.title} ${site.host}`, normalized),
    )
    .sort((a, b) => rank(a.host, normalized) - rank(b.host, normalized))
    .map((site) => ({
      type: "frequent",
      id: site.host,
      label: site.title,
      detail: displayUrl(site.url),
      url: site.url,
      host: site.host,
    }));
  return [...links, ...projects, ...sites].slice(0, 8);
}
