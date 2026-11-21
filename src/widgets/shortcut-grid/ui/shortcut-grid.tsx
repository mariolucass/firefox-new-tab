import { ArrowUpRight, Copy, ExternalLink, MoreHorizontal, Pencil, Plus, Star, StarOff, Trash2 } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { ContextMenu, type MenuItem } from "@shared/ui/context-menu";
import { logVisit } from "@features/log/model/visit-log";
import { SectionAction, SectionHead } from "@shared/ui/section-head";
import { hostOf, isLocal } from "@features/frequent/model/top-sites";
import { displayUrl } from "@features/search/model/filter";
import { useSpotlight } from "@shared/lib/use-spotlight";
import { useReorder } from "@shared/lib/use-reorder";
import type { Shortcut } from "@shared/model/settings";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";
import { BrandMark } from "@shared/ui/brand-mark";

/**
 * Colunas para a grade dos blocos: linhas equilibradas em vez de 9 + 3 sobrando.
 * 12 itens → 2 linhas de 6; 10 → 5 + 5; até 9 → uma linha só.
 */
function columnsFor(count: number): number {
  const rows = Math.max(1, Math.ceil(count / 9));
  return Math.max(1, Math.ceil(count / rows));
}

type Props = {
  title: string;
  /** Ícone do título (padrão: estrela). */
  icon?: ComponentProps<typeof SectionHead>["icon"];
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
  /** Menu de contexto: marcar/desmarcar favorito. */
  onToggleFavorite?: (item: Shortcut) => void;
  /** Menu de contexto: remover (a página oferece Desfazer). */
  onRemove?: (item: Shortcut) => void;
  /** Aviso curto (ex.: "Link copiado"). */
  onNotify?: (message: string) => void;
};

export function ShortcutGrid({
  title,
  icon = Star,
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
  onToggleFavorite,
  onRemove,
  onNotify,
}: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number; item: Shortcut } | null>(null);
  const menuItems = (item: Shortcut): MenuItem[] => [
    {
      icon: ArrowUpRight,
      label: "Abrir",
      hint: "↵",
      onSelect: () => {
        logVisit({ url: item.url, label: item.label, source: numbered ? "favorito" : "atalho" });
        window.location.assign(item.url);
      },
    },
    {
      icon: ExternalLink,
      label: "Abrir em nova aba",
      hint: "Ctrl ↵",
      onSelect: () => {
        logVisit({ url: item.url, label: item.label, source: numbered ? "favorito" : "atalho" });
        window.open(item.url, "_blank", "noopener");
      },
    },
    {
      icon: Copy,
      label: "Copiar link",
      onSelect: () =>
        void navigator.clipboard
          ?.writeText(item.url)
          .then(() => onNotify?.("Link copiado"))
          .catch(() => undefined),
    },
    "separator",
    ...(onToggleFavorite
      ? [
          {
            icon: item.favorite ? StarOff : Star,
            label: item.favorite ? "Tirar dos favoritos" : "Marcar como favorito",
            onSelect: () => onToggleFavorite(item),
          },
        ]
      : []),
    { icon: Pencil, label: "Editar…", onSelect: () => onEdit(item) },
    ...(onRemove
      ? ["separator" as const, { icon: Trash2, label: "Remover", danger: true, onSelect: () => onRemove(item) }]
      : []),
  ];
  const { ordered, itemProps, listProps } = useReorder(items, onReorder);
  const spotlight = useSpotlight(".site-icon");
  return (
    <section className="section" aria-label={title} style={{ "--cols": columnsFor(items.length) } as React.CSSProperties}>
      <SectionHead
        icon={icon}
        title={title}
        hint={hint}
        meta={`${items.length} ${items.length === 1 ? "atalho" : "atalhos"}${numbered && items.length ? " · teclas 1–9" : ""}`}
        actions={
          <>
            {onOpenAll && items.length > 1 && (
              <SectionAction
                icon={ExternalLink}
                label={`Abrir ${Math.min(items.length, 12)} em abas de fundo`}
                badge={Math.min(items.length, 12)}
                onClick={onOpenAll}
              />
            )}
            <SectionAction icon={Plus} label="Adicionar atalho (Alt L)" onClick={onAdd} primary />
          </>
        }
      />
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
                  // Clique direito (ou tecla Menu / Shift+F10) abre o menu de ações.
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (event.button === 2 || event.clientX || event.clientY) {
                      setMenu({ x: event.clientX, y: event.clientY, item });
                    } else {
                      const box = event.currentTarget.getBoundingClientRect();
                      setMenu({ x: box.left + 16, y: box.bottom - 8, item });
                    }
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
                  {variant === "list" ? (
                    <span className="item-text">
                      <span className="item-label">
                        {item.label}
                        {item.favorite && <Star size={11} fill="currentColor" className="item-fav" aria-label="Favorito" />}
                      </span>
                      <span className="item-host">
                        {isLocal(hostOf(item.url)) ? "Servidor local" : displayUrl(item.url)}
                      </span>
                    </span>
                  ) : (
                    <span className="item-label">{item.label}</span>
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
                  onClick={(event) => {
                    const box = event.currentTarget.getBoundingClientRect();
                    setMenu({ x: box.left, y: box.bottom + 4, item });
                  }}
                  aria-label={`Mais ações para ${item.label}`}
                  aria-haspopup="menu"
                  title="Mais ações (ou clique direito)"
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
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.item.label}
          items={menuItems(menu.item)}
          onClose={() => setMenu(null)}
        />
      )}
    </section>
  );
}
