export type Bang = {
  /** Prefixo digitado antes do espaço: "gh react" pesquisa "react" no GitHub. */
  key: string;
  name: string;
  url: (query: string) => string;
};

const q = encodeURIComponent;

/**
 * Buscas diretas por prefixo. Dados, não código: para ganhar um novo destino
 * basta acrescentar uma linha aqui (a barra e a dica de chips leem desta lista).
 */
export const bangs: Bang[] = [
  {
    key: "gh",
    name: "GitHub",
    url: (t) => `https://github.com/search?q=${q(t)}`,
  },
  {
    key: "yt",
    name: "YouTube",
    url: (t) => `https://www.youtube.com/results?search_query=${q(t)}`,
  },
  {
    key: "mdn",
    name: "MDN",
    url: (t) => `https://developer.mozilla.org/pt-BR/search?q=${q(t)}`,
  },
  {
    key: "npm",
    name: "npm",
    url: (t) => `https://www.npmjs.com/search?q=${q(t)}`,
  },
  {
    key: "so",
    name: "Stack Overflow",
    url: (t) => `https://stackoverflow.com/search?q=${q(t)}`,
  },
  {
    key: "dr",
    name: "Google Drive",
    url: (t) => `https://drive.google.com/drive/search?q=${q(t)}`,
  },
  {
    key: "w",
    name: "Wikipédia",
    url: (t) => `https://pt.wikipedia.org/w/index.php?search=${q(t)}`,
  },
  {
    key: "maps",
    name: "Google Maps",
    url: (t) => `https://www.google.com/maps/search/${q(t)}`,
  },
  {
    key: "tr",
    name: "Tradutor",
    url: (t) => `https://translate.google.com/?sl=auto&tl=pt&text=${q(t)}`,
  },
  {
    key: "img",
    name: "Google Imagens",
    url: (t) => `https://www.google.com/search?tbm=isch&q=${q(t)}`,
  },
  {
    key: "sch",
    name: "Google Acadêmico",
    url: (t) => `https://scholar.google.com/scholar?q=${q(t)}`,
  },
];

const byKey = new Map(bangs.map((bang) => [bang.key, bang]));

/** "gh react hooks" → { bang: GitHub, text: "react hooks" }; sem texto ou prefixo desconhecido → null. */
export function parseBang(query: string): { bang: Bang; text: string } | null {
  const match = /^(\S+)\s+(\S.*)$/.exec(query.trim());
  if (!match) return null;
  const bang = byKey.get(match[1].toLowerCase());
  return bang ? { bang, text: match[2].trim() } : null;
}
