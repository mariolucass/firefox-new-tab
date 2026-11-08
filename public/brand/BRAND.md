# Nexo — assets

| Arquivo | Uso |
|---|---|
| `logo.svg` / `logo-black.svg` | Logo + nome (tinta branca p/ fundo escuro · tinta preta p/ fundo claro) |
| `logo-mono-white.svg` / `logo-mono-black.svg` | Logo + nome em 1 cor |
| `mark.svg` / `mark-black.svg` | Só o símbolo |
| `mark-mono-white.svg` / `mark-mono-black.svg` | Só o símbolo em 1 cor |
| `wordmark.svg` / `wordmark-black.svg` | Só o nome |
| `icon.svg` | Ícone de app (squircle) em 1024 |
| `favicon.svg` / `favicon.ico` | Favicon (o .ico tem 16, 32 e 48) |
| `apple-touch-icon.png` | iOS, 180×180 (quadrado — o iOS arredonda) |
| `icon-192.png` / `icon-512.png` / `icon-maskable-512.png` | PWA |
| `og-image.png` | Open Graph / Twitter, 1200×630 |
| `site.webmanifest` | Manifest PWA |

Os textos dos SVGs estão em curvas (Inter Tight 600), não dependem de fonte.

Cores (tema navy): fundo `#0C1629` · tinta `#F5F5F7` · lente `#0A84FF` (no claro: tinta `#0C1629`, lente `#007AFF`) · squircle `#223760` → `#0C1629`.

## `<head>`

```html
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0c1629">

<meta property="og:title" content="Nexo">
<meta property="og:description" content="Nova aba para Firefox. Onde tudo se encontra.">
<meta property="og:image" content="https://SEU-DOMINIO/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://SEU-DOMINIO/og-image.png">
```

## Next.js (App Router)

Copie `favicon.ico`, `icon.svg` e `apple-touch-icon.png` para `app/` (como `favicon.ico`, `icon.svg`, `apple-icon.png`) e `og-image.png` para `app/opengraph-image.png` — o Next gera as tags sozinho. O resto vai em `public/`.

## Tokens (somar ao seu `colors`)

```ts
export const brand = {
  lens: "#0a84ff",       // = colors.accentFill — lente da marca no escuro
  lensOnLight: "#007aff", // lente em fundo claro
  ink: "#f5f5f7",        // = colors.text — anéis e nome
  inkOnLight: "#0c1629", // = colors.bg
  iconTop: "#223760",    // = colors.surfaceStrong
  iconBottom: "#0c1629", // = colors.bg
  iconSheen: "rgba(255, 255, 255, 0.10)", // = colors.sheen
} as const;
```
