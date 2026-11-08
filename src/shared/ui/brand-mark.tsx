type Props = {
  /** Altura em px; a largura segue a proporção do símbolo (~1,47:1). */
  size?: number;
  className?: string;
};

/**
 * Símbolo da marca em tinta única (public/brand/mark-mono-white.svg). Decorativo:
 * a cor vem do arquivo e a intensidade, da opacidade definida pelo CSS de quem usa.
 * Caminho relativo, como no cabeçalho: a página é index.html na raiz da extensão.
 */
export function BrandMark({ size = 16, className }: Props) {
  return (
    <img
      className={className ? `brand-glyph ${className}` : "brand-glyph"}
      src="brand/mark-mono-white.svg"
      style={{ height: size }}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
