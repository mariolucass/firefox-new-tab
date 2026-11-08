import { ExternalLink, MoreHorizontal, Plus } from "lucide-react";
import { hostOf } from "@features/frequent/model/top-sites";
import { displayUrl } from "@features/search/model/filter";
import { useSpotlight } from "@shared/lib/use-spotlight";
import { useReorder } from "@shared/lib/use-reorder";
import type { Shortcut } from "@shared/model/settings";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";
import { BrandMark } from "@shared/ui/brand-mark";

type Props = {
  title: string;
  /** Teclas mostradas ao lado do título (dica de atalho). */
  hint?: string[];
  items: Shortcut[];
  emptyText: string;
  /** "tiles": blocos com ícone grande (Favoritos). "list": linhas densas (contexto). */
  variant?: "tiles" | "list";
  /** Mostra 1–9 nos nove primeiros itens, que abrem com a tecla correspondente. */
  numbered?: boolean;
  /** Índice do item cuja tecla numérica está pressionada. */
  pressedIndex?: number | null;
  favicons: Map<string, string>;
  onAdd: () => void;
  onEdit: (item: Shortcut) => void;
  /** Novos ids na ordem final, ao soltar um item arrastado (ou Alt + setas). */
  onReorder?: (ids: string[]) => void;
  /** Abre todos os itens em abas de fundo. */
  onOpenAll?: () => void;
};

export function ShortcutGrid({
  title,
  hint,
  items,
  emptyText,
  variant = "tiles",
  numbered,
  pressedIndex,
  favicons,
  onAdd,
  onEdit,
  onReorder,
  onOpenAll,
}: Props) {
  const { ordered, itemProps, listProps } = useReorder(items, onReorder);
  const spotlight = useSpotlight(".site-icon");
  return (
    <section className="section" aria-label={title}>
      <div className="section-heading">
        <h2>
          {title}
          {hint && (
            <span className="section-hint" aria-hidden="true">
              {hint.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </span>
          )}
        </h2>
        <div className="section-actions">
          {onOpenAll && items.length > 1 && (
            <button
              type="button"
              className="text-button is-quiet"
              onClick={onOpenAll}
              title="Abrir todos em abas de fundo"
            >
              <ExternalLink size={14} aria-hidden="true" /> Abrir tudo ({Math.min(items.length, 12)})
            </button>
          )}
          <button type="button" className="text-button" onClick={onAdd}>
            <Plus size={14} aria-hidden="true" /> Adicionar
          </button>
        </div>
      </div>
      {items.length ? (
        <ul
          className={variant === "tiles" ? "tile-grid" : "row-list"}
          {...listProps}
          onPointerMove={spotlight}
        >
          {ordered.map((item, index) => {
            const key = numbered && index < 9 ? String(index + 1) : undefined;
            return (
              <li
                key={item.id}
                className={variant === "tiles" ? "tile" : "row"}
                data-pressed={pressedIndex === index}
                style={{ "--i": Math.min(index, 14) } as React.CSSProperties}
                {...itemProps(item.id)}
              >
                <a
                  href={item.url}
                  className={variant === "tiles" ? "tile-link" : "row-link"}
                  draggable={false}
                  aria-keyshortcuts={key}
                  title={
                    key
                      ? `${item.label} · tecla ${key} · arraste para reordenar`
                      : `${item.label} · arraste para reordenar`
                  }
                  // Clique direito edita, como "Obter informações" no Finder.
                  onContextMenu={(event) => {
                    event.preventDefault();
                    onEdit(item);
                  }}
                >
                  <span className="site-icon" aria-hidden="true">
                    <ShortcutIcon
                      icon={item.icon}
                      label={item.label}
                      url={item.url}
                      favicon={favicons.get(hostOf(item.url))}
                    />
                  </span>
                  <span className="item-label">{item.label}</span>
                  {variant === "list" && displayUrl(item.url) !== item.label && (
                    <span className="item-host">{displayUrl(item.url)}</span>
                  )}
                  {key && (
                    <kbd className="key-badge" aria-hidden="true">
                      {key}
                    </kbd>
                  )}
                </a>
                <button
                  type="button"
                  className="item-edit"
                  onClick={() => onEdit(item)}
                  aria-label={`Editar ${item.label}`}
                  title="Editar (ou clique direito)"
                >
                  <MoreHorizontal size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty-state">
          <BrandMark size={18} />
          {emptyText}
        </p>
      )}
    </section>
  );
}
