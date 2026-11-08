import type { CSSProperties } from "react";

import { fonts } from "./font";

export { fonts, type FontToken } from "./font";

/**
 * Fonte única dos tokens de tema. O layout injeta estes valores no <html> como
 * variáveis `--theme-*`, e `app/globals.css` as expõe ao Tailwind via @theme.
 * Ao criar ou renomear um token aqui, espelhe-o no bloco @theme do CSS.
 *
 * Navy Apple: os mesmos valores do Firefox Developer Edition
 * (perfil/chrome/styles/themes/theme-navy.css, prefixo --mx-*) e do Ferdium
 * (estilos/ferdium.css, prefixo --fd-*). A Nova Aba abre dentro da moldura
 * navy do Firefox; com as mesmas cores, a página parece parte do navegador e
 * não há salto de cor ao abrir uma aba. Ao mudar um valor aqui, mude lá também.
 */
export const colors = {
  // Superfícies, da mais funda à mais clara.
  bg: "#0c1629", // --mx-frame; igual a browser.display.background_color.dark
  field: "#0f1b32", // --mx-frame-hi
  surface: "#111d36", // --mx-toolbar
  surfaceHover: "#16243e", // --mx-panel
  surfaceRaised: "#182744", // --mx-surface
  surfaceStrong: "#223760", // --mx-surface-2
  panel: "#16243e", // menus e painel de resultados
  borderSubtle: "rgba(255, 255, 255, 0.07)",
  border: "rgba(255, 255, 255, 0.11)", // --mx-border
  borderStrong: "rgba(255, 255, 255, 0.22)", // --mx-border-2
  hairline: "rgba(255, 255, 255, 0.08)",
  sheen: "rgba(255, 255, 255, 0.10)", // --mx-sheen: brilho de 1px no topo
  // Texto: escala de rótulos do iOS (contraste ≥ 4,5:1 sobre bg e surface).
  text: "#f5f5f7",
  textSoft: "#dfe4ee",
  muted: "#c9d2e3", // --mx-text-dim
  subtle: "#b2bdd2",
  faint: "#98a4bd",
  // Acento: azul de sistema. `accent` é a versão para texto sobre navy
  // (#0a84ff puro fica abaixo de 4,5:1 em texto pequeno); `accentFill` é o
  // azul cheio de fundos, linha selecionada e foco, como no Firefox.
  accent: "#4da3ff",
  accentStrong: "#64b5ff",
  accentFill: "#0a84ff",
  // Fundo azul com texto branco (linha selecionada, botão primário): um tom
  // abaixo do azul de sistema para o branco passar de 4,5:1 (#0a84ff dá 3,65:1).
  accentSelected: "#0a70e0",
  accentGlow: "rgba(10, 132, 255, 0.28)", // --mx-accent-glow
  onAccent: "#ffffff",
  // Estados (cores de sistema Apple, variante escura).
  success: "#30d158",
  warn: "#ff9f0a",
  danger: "#ff453a",
  dangerText: "#ffb4ae",
  dangerBg: "rgba(255, 69, 58, 0.12)",
  dangerBorder: "rgba(255, 69, 58, 0.40)",
} as const;

/** Escala de espaçamento (base 4px). Nenhum valor fora dela. */
export const space = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "24px",
  6: "32px",
  7: "48px",
  8: "64px",
} as const;

/**
 * Raios concêntricos, a escala do Firefox (tokens.css): interno = externo −
 * respiro. Ex.: painel de resultados 16px com 6px de respiro → linhas 10px.
 */
export const radius = {
  sm: "7px", // teclas, selos
  md: "8px", // botões pequenos, ícones dentro de linhas
  control: "10px", // cartões, linhas, campos
  panel: "12px", // menus
  container: "16px", // painéis, diálogos, painel de resultados
  pill: "999px", // campo de busca, chips
} as const;

/**
 * Escala tipográfica no estilo da Apple (HIG), com alturas de linha na grade
 * de 4/8pt: 12/16, 13/16, 15/20, 17/24, 22/28, 28/32. Corpo em 15px: a 14px
 * a Inter perdia leitura nos rótulos.
 */
export const fontSizes = {
  xs: "13px",
  sm: "14px",
  md: "16px",
  lg: "18px",
  title: "22px",
  xl: "28px",
} as const;

/** Movimento: as curvas e durações do Firefox (tokens.css). */
export const motion = {
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeIn: "cubic-bezier(0.5, 0, 0.75, 0)",
  press: "90ms",
  fast: "140ms",
  base: "220ms",
  slow: "320ms",
} as const;


export type ColorToken = keyof typeof colors;
export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type FontSizeToken = keyof typeof fontSizes;

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/** Variáveis CSS (`--theme-*`) geradas a partir dos tokens acima. */
export const themeVars = {
  colorScheme: "dark",
  "--theme-fg": "255 255 255",
  ...Object.fromEntries([
    ...Object.entries(colors).map(([name, value]) => [
      `--theme-${kebab(name)}`,
      value,
    ]),
    ...Object.entries(fonts).map(([name, value]) => [
      `--theme-font-${name}`,
      value,
    ]),
    ...Object.entries(space).map(([name, value]) => [
      `--theme-space-${name}`,
      value,
    ]),
    ...Object.entries(radius).map(([name, value]) => [
      `--theme-radius-${name}`,
      value,
    ]),
    ...Object.entries(fontSizes).map(([name, value]) => [
      `--theme-text-${name}`,
      value,
    ]),
    ...Object.entries(motion).map(([name, value]) => [
      `--theme-${kebab(name)}`,
      value,
    ]),
  ]),
} as CSSProperties;

/** Tinta de sobreposições (bordas, brilhos, hover): branco no escuro, navy no claro. `rgb(var(--theme-fg) / .1)`. */
export const fg = { dark: "255 255 255", light: "12 22 41" } as const;

/**
 * Paleta clara, mesma estrutura de `colors`. Tinta e lente vêm da marca
 * (public/brand/BRAND.md: tinta #0C1629, lente #007AFF).
 */
export const lightColors: Record<ColorToken, string> = {
  bg: "#eef2f8",
  field: "#e5ebf5",
  surface: "#ffffff",
  surfaceHover: "#f3f6fb",
  surfaceRaised: "#ffffff",
  surfaceStrong: "#dce4f1",
  panel: "#ffffff",
  borderSubtle: "rgba(12, 22, 41, 0.07)",
  border: "rgba(12, 22, 41, 0.12)",
  borderStrong: "rgba(12, 22, 41, 0.24)",
  hairline: "rgba(12, 22, 41, 0.09)",
  sheen: "rgba(255, 255, 255, 0.75)",
  text: "#0c1629",
  textSoft: "#1c2946",
  muted: "#38476a",
  subtle: "#4f5e7e",
  faint: "#5d6b88",
  accent: "#0062d1",
  accentStrong: "#004fa8",
  accentFill: "#007aff",
  accentSelected: "#0a6ae6",
  accentGlow: "rgba(0, 122, 255, 0.22)",
  onAccent: "#ffffff",
  success: "#1c8f3a",
  warn: "#a85f00",
  danger: "#d70015",
  dangerText: "#b3261e",
  dangerBg: "rgba(215, 0, 21, 0.08)",
  dangerBorder: "rgba(215, 0, 21, 0.35)",
};

/** Cores de destaque. `fill` = azul cheio, `text` = para texto, no escuro e no claro. */
export const accents = {
  blue: { label: "Azul", dark: ["#0a84ff", "#4da3ff", "#64b5ff", "#0a70e0"], light: ["#007aff", "#0062d1", "#004fa8", "#0a6ae6"] },
  indigo: { label: "Índigo", dark: ["#6e6cf0", "#9d9bff", "#b3b1ff", "#5b59d8"], light: ["#5856d6", "#4543b5", "#34329a", "#4c4ac4"] },
  teal: { label: "Turquesa", dark: ["#1fb5a6", "#4fd6c8", "#7be6da", "#13917f"], light: ["#0f9d8f", "#0b756a", "#075a51", "#0d8a7d"] },
  pink: { label: "Rosa", dark: ["#ff4f86", "#ff82a8", "#ffa3bf", "#e03b72"], light: ["#e0245e", "#b81c4c", "#901539", "#cc2155"] },
  orange: { label: "Laranja", dark: ["#ff8a1f", "#ffa84d", "#ffbf7a", "#d9700f"], light: ["#e8710a", "#a85100", "#823e00", "#c46000"] },
  green: { label: "Verde", dark: ["#30d158", "#5fe07f", "#8aeba2", "#1fa844"], light: ["#1fa844", "#157a31", "#0f5d25", "#1a8f3a"] },
} as const;
export type AccentId = keyof typeof accents;
