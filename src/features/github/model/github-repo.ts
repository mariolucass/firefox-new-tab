/**
 * Dados públicos de um repositório do GitHub (API REST, sem login): descrição,
 * linguagem, estrelas, última atualização, site de deploy (o campo "homepage"
 * do repositório). Guardado em cache local por 6 h: a API anônima permite só
 * 60 consultas por hora, e a aba abre dezenas de vezes por dia. Se a consulta
 * falha (offline, limite, repositório privado), vale o cache antigo; sem ele,
 * o cartão só mostra os links.
 */
export type RepoInfo = {
  fullName: string;
  url: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  issues: number;
  pushedAt: string | null;
  archived: boolean;
  fetchedAt: number;
};

const prefix = "nt-gh-";
const ttl = 6 * 60 * 60 * 1000;

/** "owner/nome", ou um link do GitHub (com .git, /tree/main, etc.) → "owner/nome". */
export function parseRepo(input: string | undefined | null): string | null {
  const text = (input ?? "").trim();
  if (!text) return null;
  const link = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i.exec(text);
  const plain = /^([\w.-]+)\/([\w.-]+)$/.exec(text);
  const match = link ?? plain;
  if (!match) return null;
  const [, owner, name] = match;
  if (name === "." || name === "..") return null;
  return `${owner}/${name}`;
}

export function readCached(repo: string): RepoInfo | null {
  try {
    const raw = localStorage.getItem(prefix + repo.toLowerCase());
    return raw ? (JSON.parse(raw) as RepoInfo) : null;
  } catch {
    return null;
  }
}

export const isFresh = (info: RepoInfo | null) => Boolean(info && Date.now() - info.fetchedAt < ttl);

export async function fetchRepo(repo: string): Promise<RepoInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      full_name: string;
      html_url: string;
      description: string | null;
      homepage: string | null;
      language: string | null;
      stargazers_count: number;
      forks_count: number;
      open_issues_count: number;
      pushed_at: string | null;
      archived: boolean;
    };
    const info: RepoInfo = {
      fullName: data.full_name,
      url: data.html_url,
      description: data.description,
      homepage: data.homepage && /^https?:\/\//.test(data.homepage) ? data.homepage : null,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      issues: data.open_issues_count,
      pushedAt: data.pushed_at,
      archived: data.archived,
      fetchedAt: Date.now(),
    };
    try {
      localStorage.setItem(prefix + repo.toLowerCase(), JSON.stringify(info));
    } catch {
      // Sem cota: só perde o cache.
    }
    return info;
  } catch {
    return null;
  }
}

/** Cores das linguagens mais comuns (as do GitHub). */
const languageColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  "C#": "#178600",
  C: "#8a8a8a",
  "C++": "#f34b7d",
  PHP: "#4f5d95",
  Ruby: "#cc342d",
  HTML: "#e34c26",
  CSS: "#7c5cff",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dart: "#00b4ab",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Dockerfile: "#384d54",
  Lua: "#7a7aff",
  "Jupyter Notebook": "#da5b0b",
};
export const languageColor = (name: string) => languageColors[name] ?? "#9aa3b2";

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto", style: "short" });
/** "há 2 d", "ontem", "há 3 meses" a partir de um instante ISO. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "agora";
}
