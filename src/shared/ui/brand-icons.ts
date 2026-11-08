import {
  siClaude,
  siExcalidraw,
  siGithub,
  siGmail,
  siGoogleclassroom,
  siGoogledocs,
  siGoogledrive,
  siGooglegemini,
  siGoogletranslate,
  siIlovepdf,
  siInstagram,
  siNeon,
  siReddit,
  siTailscale,
  siTrello,
  siVercel,
  siWikipedia,
  siX,
  siYoutube,
  siYoutubemusic,
} from "simple-icons";

/**
 * Ícones monocromáticos de reserva, usados quando o navegador não entrega o
 * favicon real do site (ver ShortcutIcon). Chaves antigas que saíram do
 * catálogo continuam aceitas no schema e caem no monograma.
 */
export const brandIcons = {
  github: siGithub,
  claude: siClaude,
  gemini: siGooglegemini,
  vercel: siVercel,
  neon: siNeon,
  tailscale: siTailscale,
  trello: siTrello,
  gmail: siGmail,
  "google-drive": siGoogledrive,
  "google-docs": siGoogledocs,
  "google-classroom": siGoogleclassroom,
  "google-translate": siGoogletranslate,
  wikipedia: siWikipedia,
  ilovepdf: siIlovepdf,
  excalidraw: siExcalidraw,
  youtube: siYoutube,
  "youtube-music": siYoutubemusic,
  instagram: siInstagram,
  reddit: siReddit,
  x: siX,
} as const;

export type BrandIconKey = keyof typeof brandIcons;
