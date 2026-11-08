import type { Shortcut } from "./settings";

/**
 * Catálogo de fábrica da primeira versão (nome + URL), extraído de defaults.ts
 * antes da troca pelo catálogo baseado no histórico real (07/11/2026).
 *
 * Serve só para a migração: se todos os atalhos salvos forem itens desta
 * lista, sem edição, a pessoa nunca personalizou nada e pode receber o
 * catálogo novo sem perder trabalho. Qualquer atalho próprio ou editado
 * bloqueia a migração. Não edite esta lista.
 */
const legacy: ReadonlyArray<readonly [string, string]> = [
  ["GitHub", "https://github.com"],
  ["ChatGPT", "https://chatgpt.com"],
  ["Claude", "https://claude.ai"],
  ["Vercel", "https://vercel.com"],
  ["Neon", "https://console.neon.tech"],
  ["AWS Console", "https://console.aws.amazon.com"],
  ["Trello", "https://trello.com"],
  ["Q-Acadêmico", "https://novo.qacademico.ifce.edu.br/"],
  ["Gmail", "https://mail.google.com"],
  ["Google Drive", "https://drive.google.com"],
  ["LinkedIn", "https://linkedin.com"],
  ["Google Calendar", "https://calendar.google.com"],
  ["Docker Hub", "https://hub.docker.com"],
  ["TypeScript", "https://www.typescriptlang.org/docs/"],
  ["MDN", "https://developer.mozilla.org"],
  ["Prisma", "https://www.prisma.io/docs"],
  ["Tailwind", "https://tailwindcss.com/docs"],
  ["Next.js", "https://nextjs.org/docs"],
  ["GitHub Issues", "https://github.com/issues"],
  ["GitHub Pull Requests", "https://github.com/pulls"],
  ["IFCE", "https://ifce.edu.br"],
  ["Google Scholar", "https://scholar.google.com"],
  ["arXiv", "https://arxiv.org"],
  ["Excalidraw", "https://excalidraw.com"],
  ["Gupy", "https://www.gupy.io"],
  ["Wellfound", "https://wellfound.com"],
  ["Remote OK", "https://remoteok.com"],
  ["LeetCode", "https://leetcode.com"],
  ["roadmap.sh", "https://roadmap.sh"],
  ["Dev.to", "https://dev.to"],
  ["WhatsApp Web", "https://web.whatsapp.com"],
  ["Google Keep", "https://keep.google.com"],
  ["YouTube Music", "https://music.youtube.com"],
  ["FamilySearch", "https://www.familysearch.org"],
];

const key = (label: string, url: string) =>
  `${label.trim()}|${url.trim().replace(/\/+$/, "")}`;
const legacyKeys = new Set(legacy.map(([label, url]) => key(label, url)));

/** Verdadeiro só se houver atalhos e todos forem itens de fábrica sem edição. */
export function isLegacyCatalog(shortcuts: Shortcut[]): boolean {
  return (
    shortcuts.length > 0 &&
    shortcuts.every((item) => legacyKeys.has(key(item.label, item.url)))
  );
}
