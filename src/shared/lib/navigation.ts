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
