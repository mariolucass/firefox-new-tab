"use client";

import {
  createElement,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type SyntheticEvent,
} from "react";
import {
  cachedAuto,
  cachedIcon,
  iconsVersion,
  requestIcon,
  subscribeIcons,
  type IconEntry,
} from "@shared/lib/icon-library";
import { brandIcons, type BrandIconKey } from "./brand-icons";

type Props = {
  icon?: string;
  label: string;
  /** Endereço do atalho: dele sai o ícone automático da marca. */
  url?: string;
  /** Favicon real (data: URL do navegador). Tem prioridade: é o que se reconhece. */
  favicon?: string;
};

/**
 * Luminância média dos pixels visíveis do favicon (0 = preto, 1 = branco).
 * Favicons escuros (GitHub, Vercel, X) somem no navy; acima de um limiar
 * baixo, nada muda. data: URLs não "sujam" o canvas, então a leitura é local.
 */
function isDarkImage(image: HTMLImageElement): boolean {
  try {
    const size = 16;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(image, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);
    let total = 0;
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 128) continue;
      total +=
        (0.2126 * data[index] +
          0.7152 * data[index + 1] +
          0.0722 * data[index + 2]) /
        255;
      count += 1;
    }
    return count > 0 && total / count < 0.22;
  } catch {
    return false;
  }
}

/**
 * Resultado da medição por favicon (hash curto do data: URL), em memória e no
 * localStorage. Cada favicon é medido uma vez na vida, não a cada aba: o
 * GitHub já nasce invertido, sem piscar escuro, e não há canvas por abertura.
 */
const darkKey = "nt-favicon-dark";
let darkCache: Record<string, boolean> | null = null;

function darkMap(): Record<string, boolean> {
  if (darkCache) return darkCache;
  try {
    darkCache = JSON.parse(localStorage.getItem(darkKey) ?? "{}") as Record<
      string,
      boolean
    >;
  } catch {
    darkCache = {};
  }
  return darkCache;
}

function hashOf(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1)
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  return (hash >>> 0).toString(36);
}

function rememberDark(key: string, dark: boolean) {
  const map = darkMap();
  if (map[key] === dark) return;
  map[key] = dark;
  try {
    localStorage.setItem(darkKey, JSON.stringify(map));
  } catch {
    // Sem localStorage: mede de novo na próxima aba, só isso.
  }
}

/** Cor da marca legível sobre o navy: marcas quase pretas viram branco, escuras clareiam. */
const brandColorCache = new Map<string, string>();
function brandColor(hex: string): string {
  const cached = brandColorCache.get(hex);
  if (cached) return cached;
  const channels = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const linear = channels.map((value) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  let result = `#${hex}`;
  if (luminance < 0.04) result = "#f5f5f7";
  else if (luminance < 0.2) {
    const mixed = channels.map((value) =>
      Math.round(value + (255 - value) * 0.5),
    );
    result = `rgb(${mixed.join(" ")})`;
  }
  brandColorCache.set(hex, result);
  return result;
}

/** Monograma com matiz fixo por nome: cada atalho sem ícone tem a sua cor. */
function monogramColor(text: string): string {
  return `hsl(${parseInt(hashOf(text), 36) % 360} 85% 72%)`;
}

/**
 * Ordem: favicon do site (reconhecimento imediato, como nos Favoritos do
 * Safari) → ícone de marca monocromático → monograma de até 4 caracteres.
 */
const allowedTags = new Set([
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
]);
const allowedAttrs = new Set([
  "d",
  "points",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "width",
  "height",
]);

/**
 * Desenha um ícone da biblioteca a partir dos nós estruturados (nunca HTML do
 * cache): só tags e atributos de uma lista fechada. Marca = cor oficial
 * ajustada ao fundo; Lucide = traço da interface com matiz próprio.
 */
export function IconGlyph({
  entry,
  seed,
  size = 20,
}: {
  entry: IconEntry;
  seed: string;
  size?: number;
}) {
  const color = entry.color ? brandColor(entry.color) : monogramColor(seed);
  const stroke = entry.kind === "stroke";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : undefined}
      strokeWidth={stroke ? 1.8 : undefined}
      strokeLinecap={stroke ? "round" : undefined}
      strokeLinejoin={stroke ? "round" : undefined}
      style={{ color }}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {entry.nodes.map(([tag, attrs], index) => {
        if (!allowedTags.has(tag)) return null;
        const safe: Record<string, string> = { key: String(index) };
        for (const [name, value] of Object.entries(attrs))
          if (allowedAttrs.has(name)) safe[name] = value;
        return createElement(tag, safe);
      })}
    </svg>
  );
}

function hostOf(url?: string): string {
  try {
    return url ? new URL(url).host.toLowerCase() : "";
  } catch {
    return "";
  }
}

const libraryKey = /^(si|lu):/;

/**
 * Ordem: ícone legado (chave antiga, imediato) → ícone escolhido da
 * biblioteca ("si:"/"lu:") → marca automática pelo site → favicon do
 * navegador → monograma. Marca antes do favicon: o conjunto fica coerente
 * (todos no mesmo desenho e cor oficial) em vez de misturar estilos.
 */
export function ShortcutIcon({ icon, label, url, favicon }: Props) {
  useSyncExternalStore(subscribeIcons, iconsVersion, iconsVersion);
  const host = hostOf(url);
  const legacy =
    icon && Object.hasOwn(brandIcons, icon)
      ? brandIcons[icon as BrandIconKey]
      : null;
  const chosen = icon && libraryKey.test(icon) ? icon : null;
  // Chave antiga que saiu do catálogo (texto longo, não é monograma): trata
  // como "sem ícone" e deixa o site decidir.
  const stale = Boolean(icon && !legacy && !chosen && icon.length > 2);
  const automatic = !chosen && !legacy && (!icon || stale);

  useEffect(() => {
    if (legacy) return;
    if (chosen) requestIcon({ key: chosen });
    else if (automatic && host) requestIcon({ host });
  }, [legacy, chosen, automatic, host]);

  const faviconKey = favicon ? hashOf(favicon) : "";
  // Lido do cache só no cliente e depois de montar (o pré-render não tem
  // localStorage); o valor certo entra antes do primeiro quadro.
  const [dark, setDark] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    if (faviconKey) setDark(darkMap()[faviconKey] ?? null);
  }, [faviconKey]);

  if (legacy) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="currentColor"
        style={{ color: brandColor(legacy.hex) }}
        role="img"
        aria-hidden="true"
        focusable="false"
      >
        <path d={legacy.path} />
      </svg>
    );
  }

  const autoKey = automatic && host ? cachedAuto(host) : undefined;
  const entry = chosen
    ? cachedIcon(chosen)
    : autoKey
      ? cachedIcon(autoKey)
      : null;
  if (entry)
    return <IconGlyph entry={entry} seed={chosen ?? autoKey ?? label} />;

  if (favicon) {
    return (
      <img
        className={dark ? "site-favicon is-dark" : "site-favicon"}
        src={favicon}
        alt=""
        width={32}
        height={32}
        draggable={false}
        decoding="async"
        onLoad={(event: SyntheticEvent<HTMLImageElement>) => {
          if (darkMap()[faviconKey] !== undefined) return;
          const measured = isDarkImage(event.currentTarget);
          rememberDark(faviconKey, measured);
          setDark(measured);
        }}
      />
    );
  }
  const letters = icon && !chosen && !stale ? icon : label.slice(0, 2);
  return (
    <span className="monogram" style={{ color: monogramColor(label) }}>
      {letters.slice(0, 4).toUpperCase()}
    </span>
  );
}
