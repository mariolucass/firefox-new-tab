/**
 * Arquivos do Google Drive mais acessados, a partir do próprio navegador —
 * sem login, sem API do Google, nada sai da máquina.
 *
 * Fonte principal: `browser.history` (conta visitas de verdade; permissão
 * "history"). Sem ela, `browser.topSites` com `onePerDomain: false`, que
 * devolve páginas (não domínios) por frecência. Fora da extensão, lista vazia.
 */
export type DriveKind = "doc" | "sheet" | "slides" | "form" | "folder" | "file";
export type DriveFile = {
  id: string;
  kind: DriveKind;
  title: string;
  url: string;
  visits: number;
  lastVisit: number;
};

type HistoryItem = { url?: string; title?: string; visitCount?: number; lastVisitTime?: number };
type TopSite = { url?: string; title?: string };
declare const browser:
  | {
      history?: {
        search(query: { text: string; startTime?: number; maxResults?: number }): Promise<HistoryItem[]>;
      };
      topSites?: {
        get(options: { onePerDomain?: boolean; limit?: number; includeFavicon?: boolean }): Promise<TopSite[]>;
      };
    }
  | undefined;

/** Tipo e id do arquivo a partir do endereço; null se não for um arquivo. */
export function parseDriveUrl(raw: string): { kind: DriveKind; id: string } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname;
  const path = url.pathname;
  if (host === "docs.google.com") {
    const match = /^\/(document|spreadsheets|presentation|forms)\/(?:u\/\d+\/)?d\/(?:e\/)?([\w-]{10,})/.exec(path);
    if (!match) return null;
    const kind = { document: "doc", spreadsheets: "sheet", presentation: "slides", forms: "form" }[
      match[1] as "document" | "spreadsheets" | "presentation" | "forms"
    ] as DriveKind;
    return { kind, id: match[2] };
  }
  if (host === "drive.google.com") {
    const folder = /\/folders\/([\w-]{10,})/.exec(path);
    if (folder) return { kind: "folder", id: folder[1] };
    const file = /\/file\/(?:u\/\d+\/)?d\/([\w-]{10,})/.exec(path);
    if (file) return { kind: "file", id: file[1] };
  }
  return null;
}

/** "Relatório - Documentos Google" → "Relatório". */
export function cleanTitle(title: string): string {
  return title
    .replace(/\s+[-–—]\s+(Google\s+)?(Docs|Documentos|Sheets|Planilhas|Slides|Apresentações|Forms|Formulários|Drive)(\s+Google)?\s*$/i, "")
    .replace(/\s+[-–—]\s+Google Drive\s*$/i, "")
    .trim();
}

/** Endereço canônico (abre direto no editor/pasta, sem parâmetros de sessão). */
function canonical(kind: DriveKind, id: string): string {
  switch (kind) {
    case "doc":
      return `https://docs.google.com/document/d/${id}/edit`;
    case "sheet":
      return `https://docs.google.com/spreadsheets/d/${id}/edit`;
    case "slides":
      return `https://docs.google.com/presentation/d/${id}/edit`;
    case "form":
      return `https://docs.google.com/forms/d/${id}/edit`;
    case "folder":
      return `https://drive.google.com/drive/folders/${id}`;
    default:
      return `https://drive.google.com/file/d/${id}/view`;
  }
}

/** Junta visitas do mesmo arquivo (edit, view, preview, #gid…) e ordena. */
export function rankDriveFiles(items: HistoryItem[], limit = 8): DriveFile[] {
  const byId = new Map<string, DriveFile>();
  for (const item of items) {
    if (!item.url) continue;
    const parsed = parseDriveUrl(item.url);
    if (!parsed) continue;
    const title = cleanTitle(item.title ?? "");
    const current = byId.get(parsed.id);
    const visits = Math.max(item.visitCount ?? 1, 1);
    const last = item.lastVisitTime ?? 0;
    if (current) {
      current.visits += visits;
      current.lastVisit = Math.max(current.lastVisit, last);
      if (!current.title && title) current.title = title;
    } else {
      byId.set(parsed.id, {
        id: parsed.id,
        kind: parsed.kind,
        title,
        url: canonical(parsed.kind, parsed.id),
        visits,
        lastVisit: last,
      });
    }
  }
  return [...byId.values()]
    .filter((file) => file.title)
    .sort((a, b) => b.visits - a.visits || b.lastVisit - a.lastVisit)
    .slice(0, limit);
}

/** Lê os arquivos do Drive mais acessados (últimos 90 dias no histórico). */
export async function fetchDriveTop(limit = 8): Promise<DriveFile[]> {
  if (typeof browser === "undefined" || !browser) return [];
  try {
    if (browser.history?.search) {
      const since = Date.now() - 90 * 24 * 60 * 60 * 1000;
      const [docs, drive] = await Promise.all([
        browser.history.search({ text: "docs.google.com", startTime: since, maxResults: 1000 }),
        browser.history.search({ text: "drive.google.com", startTime: since, maxResults: 1000 }),
      ]);
      return rankDriveFiles([...docs, ...drive], limit);
    }
    if (browser.topSites?.get) {
      const pages = await browser.topSites.get({ onePerDomain: false, limit: 100 });
      // topSites já vem ordenado por frecência: a posição vira o peso.
      return rankDriveFiles(
        pages.map((page, index) => ({ ...page, visitCount: 100 - index })),
        limit,
      );
    }
  } catch {
    // Permissão negada ou API indisponível: o painel mostra o estado vazio.
  }
  return [];
}
