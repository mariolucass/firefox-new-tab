import type { Shortcut } from "@shared/model/settings";

export type DriveInbox = { label: string; url: string };

/** Pasta de entrada padrão. Dá para trocar no próprio painel (lápis). */
export const defaultInbox: DriveInbox = {
  label: "00-Inbox",
  url: "https://drive.google.com/drive/folders/1h5LwTJ0DBV1mhlKqoLwdW50r41J8PG1d",
};

const drive = "https://drive.google.com/drive";

/** Links fixos do Drive: navegação e criação (os `.new` abrem um arquivo em branco). */
export const driveNav = [
  { id: "my", label: "Meu Drive", url: `${drive}/my-drive` },
  { id: "recent", label: "Recentes", url: `${drive}/recent` },
  { id: "shared", label: "Compartilhados", url: `${drive}/shared-with-me` },
  { id: "starred", label: "Com estrela", url: `${drive}/starred` },
] as const;

export const driveNew = [
  { id: "doc", label: "Documento", url: "https://docs.new" },
  { id: "sheet", label: "Planilha", url: "https://sheets.new" },
  { id: "slides", label: "Apresentação", url: "https://slides.new" },
  { id: "form", label: "Formulário", url: "https://forms.new" },
] as const;

export const driveSearchUrl = (query: string) =>
  `${drive}/search?q=${encodeURIComponent(query.trim())}`;

/** Aceita só endereço de pasta do Drive (evita salvar um link qualquer como "Inbox"). */
export function parseFolderUrl(value: string): string | null {
  const text = value.trim();
  return /^https:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\/[\w-]+/.test(
    text,
  )
    ? text
    : null;
}

/**
 * Os links do Drive como atalhos sintéticos, só para a busca: digitar
 * "inbox", "drive" ou "planilha" já encontra o destino. Não são salvos.
 */
export function driveShortcuts(inbox: DriveInbox): Shortcut[] {
  const entries: Array<{
    id: string;
    label: string;
    url: string;
    keywords: string[];
    icon: string;
  }> = [
    {
      id: "inbox",
      label: inbox.label,
      url: inbox.url,
      keywords: ["inbox", "entrada", "drive", "pasta"],
      icon: "lu:Inbox",
    },
    ...driveNav.map((link) => ({
      ...link,
      keywords: ["drive", "arquivos"],
      icon: "google-drive",
    })),
    ...driveNew.map((link) => ({
      ...link,
      label: `Novo: ${link.label}`,
      keywords: ["novo", "criar", "drive"],
      icon: "google-docs",
    })),
  ];
  return entries.map((entry, index) => ({
    id: `drive-${entry.id}`,
    label: entry.label,
    url: entry.url,
    context: "global" as const,
    keywords: entry.keywords,
    icon: entry.icon,
    order: 9000 + index,
    favorite: false,
  }));
}
