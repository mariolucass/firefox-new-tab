import { validUrl } from "@shared/model/settings";

export function openUrl(raw: string): void {
  const url = validUrl(raw);
  if (!url) return;
  window.location.assign(url);
}

export function searchWeb(
  query: string,
  provider: "google" | "duckduckgo",
): void {
  const term = query.trim();
  if (!term) return;
  const base =
    provider === "google"
      ? "https://www.google.com/search?q="
      : "https://duckduckgo.com/?q=";
  openUrl(base + encodeURIComponent(term));
}

declare const browser:
  | {
      tabs?: {
        create(options: { url: string; active: boolean }): Promise<unknown>;
      };
    }
  | undefined;

/** Abre várias URLs em abas de fundo (API de abas da extensão; fora dela, window.open). */
export function openMany(urls: string[]): void {
  const safe = urls
    .map((raw) => validUrl(raw))
    .filter((url): url is string => Boolean(url));
  for (const url of safe) {
    if (typeof browser !== "undefined" && browser?.tabs?.create)
      void browser.tabs.create({ url, active: false });
    else window.open(url, "_blank", "noopener");
  }
}

/**
 * Abre a URL depois de um instante curto, para a tecla acionada ficar visível.
 * Com movimento reduzido, abre na hora.
 */
export function openAfterPress(url: string, done?: () => void): void {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  window.setTimeout(
    () => {
      openUrl(url);
      done?.();
    },
    reduceMotion ? 0 : 140,
  );
}
