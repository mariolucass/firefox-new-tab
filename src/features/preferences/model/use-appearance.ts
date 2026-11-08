import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { accents, colors, fg, lightColors, type AccentId } from "@shared/config/theme";

export type ThemeChoice = "system" | "dark" | "light";
export type Appearance = { theme: ThemeChoice; accent: AccentId; glow: number };

export const defaultAppearance: Appearance = { theme: "system", accent: "blue", glow: 60 };

const key = "nt-appearance";
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export function parseAppearance(input: unknown): Appearance {
  const value = (input ?? {}) as Partial<Appearance>;
  return {
    theme:
      value.theme === "dark" || value.theme === "light" ? value.theme : "system",
    accent:
      typeof value.accent === "string" && value.accent in accents
        ? (value.accent as AccentId)
        : "blue",
    glow:
      typeof value.glow === "number"
        ? Math.min(100, Math.max(0, Math.round(value.glow)))
        : defaultAppearance.glow,
  };
}

function read(): Appearance {
  try {
    return parseAppearance(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return defaultAppearance;
  }
}

/**
 * Aplica no <html>: data-theme, color-scheme e os tokens `--theme-*` (inline,
 * pois o layout já os escreve inline e só outro inline os vence). Os dois
 * conjuntos são escritos por inteiro, então trocar de volta nunca deixa resto.
 */
export function applyAppearance(appearance: Appearance, systemDark: boolean) {
  const dark =
    appearance.theme === "system" ? systemDark : appearance.theme === "dark";
  const root = document.documentElement;
  const palette = dark ? colors : lightColors;
  for (const [name, value] of Object.entries(palette))
    root.style.setProperty(`--theme-${kebab(name)}`, value);
  const [fill, text, strong, selected] = accents[appearance.accent][dark ? "dark" : "light"];
  const set = (name: string, value: string) =>
    root.style.setProperty(`--theme-${name}`, value);
  set("accent-fill", fill);
  set("accent", text);
  set("accent-strong", strong);
  set("accent-selected", selected);
  const glow = appearance.accent === "blue" ? null : fill;
  if (glow) set("accent-glow", `color-mix(in srgb, ${fill} 28%, transparent)`);
  set("fg", dark ? fg.dark : fg.light);
  root.style.setProperty("--glow", String(appearance.glow / 100));
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.theme = dark ? "dark" : "light";
}

/** Tema, cor de destaque e intensidade do fundo. Local (localStorage), aplicado antes do primeiro quadro. */
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [systemDark, setSystemDark] = useState(true);

  useBeforePaint(() => {
    setAppearance(read());
    setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useBeforePaint(() => applyAppearance(appearance, systemDark), [appearance, systemDark]);

  const change = useCallback((patch: Partial<Appearance>) => {
    setAppearance((previous) => {
      const next = parseAppearance({ ...previous, ...patch });
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Sem localStorage: vale só nesta aba.
      }
      return next;
    });
  }, []);

  return { appearance, change };
}
