import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  accents,
  colors,
  fg,
  lightColors,
  palettes,
  type AccentId,
  type PaletteId,
} from "@shared/config/theme";

export type ThemeChoice = "system" | "dark" | "light";
/** `auto` = o destaque da atmosfera escolhida. */
export type AccentChoice = AccentId | "auto";
export type Appearance = {
  theme: ThemeChoice;
  palette: PaletteId;
  accent: AccentChoice;
  glow: number;
};

export const defaultAppearance: Appearance = {
  theme: "system",
  palette: "midnight",
  accent: "auto",
  glow: 60,
};

export const paletteIds = Object.keys(palettes) as PaletteId[];

const key = "nt-appearance";
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export function parseAppearance(input: unknown): Appearance {
  const value = (input ?? {}) as Partial<Appearance>;
  const palette =
    typeof value.palette === "string" && value.palette in palettes
      ? (value.palette as PaletteId)
      : "midnight";
  // Antes das atmosferas o padrão gravado era "blue": sem paleta salva, azul
  // vira automático, para a troca de atmosfera também trocar o destaque.
  const legacyBlue = value.palette === undefined && value.accent === "blue";
  return {
    theme:
      value.theme === "dark" || value.theme === "light" ? value.theme : "system",
    palette,
    accent:
      !legacyBlue && typeof value.accent === "string" && value.accent in accents
        ? (value.accent as AccentId)
        : "auto",
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

const mix = (base: string, ink: string, amount: number) =>
  `color-mix(in oklab, ${base}, ${ink} ${amount}%)`;

/**
 * Aplica no <html>: data-theme, color-scheme, os tokens `--theme-*` e os da
 * atmosfera (`--bg-*`, `--glow-*`, `--tone-*`, `--glass-tint*`), inline, pois
 * o layout já escreve inline e só outro inline os vence. Os conjuntos são
 * escritos por inteiro, então trocar de volta nunca deixa resto. As cores da
 * atmosfera são @property no CSS: a troca vira um crossfade da página.
 */
export function applyAppearance(appearance: Appearance, systemDark: boolean) {
  const dark =
    appearance.theme === "system" ? systemDark : appearance.theme === "dark";
  const root = document.documentElement;
  const set = (name: string, value: string) => root.style.setProperty(`--${name}`, value);

  const base = dark ? colors : lightColors;
  for (const [name, value] of Object.entries(base)) set(`theme-${kebab(name)}`, value);

  const palette = palettes[appearance.palette];
  const mode = palette[dark ? "dark" : "light"];
  // Meia-noite é o navy original do Firefox: as superfícies ficam exatas.
  if (appearance.palette !== "midnight") {
    set("theme-bg", mode.bg);
    if (dark) {
      set("theme-field", mix(mode.bg, "white", 3));
      set("theme-surface", mix(mode.bg, "white", 4));
      set("theme-surface-hover", mix(mode.bg, "white", 7));
      set("theme-surface-raised", mix(mode.bg, "white", 8));
      set("theme-surface-strong", mix(mode.bg, "white", 15));
      set("theme-panel", mix(mode.bg, "white", 7));
    } else {
      set("theme-field", mix(mode.bg, "black", 3));
      set("theme-surface-strong", mix(mode.bg, "black", 8));
    }
  }
  set("bg-top", mode.top);
  set("bg-bottom", mode.bottom);
  set("glass-tint", mode.glass);
  set("glass-tint-hi", mode.glassHi);
  mode.glow.forEach((value, i) => set(`glow-${i + 1}`, value));
  mode.spectrum.forEach((value, i) => set(`tone-${i + 1}`, value));

  const accent = appearance.accent === "auto" ? palette.accent : appearance.accent;
  const [fill, text, strong, selected] = accents[accent][dark ? "dark" : "light"];
  set("theme-accent-fill", fill);
  set("theme-accent", text);
  set("theme-accent-strong", strong);
  set("theme-accent-selected", selected);
  set("theme-accent-glow", `color-mix(in srgb, ${fill} ${dark ? 28 : 22}%, transparent)`);
  set("theme-fg", dark ? fg.dark : fg.light);
  set("glow", String(appearance.glow / 100));
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.palette = appearance.palette;
  // O crossfade só liga depois do primeiro quadro: abrir a aba já pinta a
  // atmosfera certa, sem transição a partir do padrão do CSS.
  if (!root.dataset.atmo)
    requestAnimationFrame(() => requestAnimationFrame(() => (root.dataset.atmo = "ready")));
}

/** Tema, atmosfera, cor de destaque e intensidade do fundo. Local (localStorage), aplicado antes do primeiro quadro. */
export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [systemDark, setSystemDark] = useState(true);
  const current = useRef(appearance);
  current.current = appearance;

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

  /** Próxima atmosfera (Alt P). Devolve o nome para o aviso. */
  const cyclePalette = useCallback(() => {
    const index = paletteIds.indexOf(current.current.palette);
    const next = paletteIds[(index + 1) % paletteIds.length];
    change({ palette: next });
    return palettes[next].label;
  }, [change]);

  return { appearance, change, cyclePalette };
}
