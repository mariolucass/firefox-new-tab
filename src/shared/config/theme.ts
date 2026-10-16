import type { CSSProperties } from "react";

/**
 * Fonte única dos tokens de tema. O layout injeta estes valores no <html> como
 * variáveis `--theme-*`, e `app/globals.css` as expõe ao Tailwind via @theme.
 * Ao criar ou renomear um token aqui, espelhe-o no bloco @theme do CSS.
 */
export const colors = {
  bg: "#0b0d10",
  field: "#0e1217",
  surface: "#14181d",
  surfaceHover: "#1b2027",
  surfaceRaised: "#252d36",
  surfaceStrong: "#323b46",
  borderSubtle: "#272d35",
  border: "#444c57",
  borderStrong: "#7c8998",
  text: "#f4f5f7",
  textSoft: "#e0e5eb",
  accent: "#b8c1ce",
  accentStrong: "#cad5e2",
  muted: "#9ba6b3",
  subtle: "#8995a3",
  faint: "#737f8d",
  success: "#69ba91",
  danger: "#d38c8c",
  dangerText: "#f2c5c5",
  dangerBg: "#392525",
  dangerBorder: "#805353",
} as const;

export const fonts = {
  sans: '"Mulish Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  heading: 'Philosopher, Georgia, "Times New Roman", serif',
  mono: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export type ColorToken = keyof typeof colors;
export type FontToken = keyof typeof fonts;

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Variáveis CSS (`--theme-*`) geradas a partir dos tokens acima. */
export const themeVars = {
  colorScheme: "dark",
  ...Object.fromEntries([
    ...Object.entries(colors).map(([name, value]) => [
      `--theme-${kebab(name)}`,
      value,
    ]),
    ...Object.entries(fonts).map(([name, value]) => [
      `--theme-font-${name}`,
      value,
    ]),
  ]),
} as CSSProperties;
