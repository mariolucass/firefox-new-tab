"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

type Icon = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" }>;

export type MenuItem =
  | {
      icon: Icon;
      label: string;
      /** Tecla mostrada à direita (só dica). */
      hint?: string;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    }
  | "separator";

type Props = {
  /** Ponto do clique (clientX/clientY). */
  x: number;
  y: number;
  /** Nome do alvo, no topo do menu (ex.: "GitHub"). */
  title?: string;
  items: MenuItem[];
  onClose: () => void;
};

const MARGIN = 8;

/**
 * Menu de contexto próprio (botão direito ou Shift+F10 / tecla Menu).
 * Teclado completo: setas, Home/End, Enter, Esc; o foco volta a quem abriu.
 * Fica dentro da tela (vira para cima/esquerda perto da borda) e fecha ao
 * clicar fora, rolar, redimensionar ou trocar de janela.
 */
export function ContextMenu({ x, y, title, items, onClose }: Props) {
  const menu = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number; origin: string } | null>(null);
  const actionable = items
    .map((item, index) => (item !== "separator" && !item.disabled ? index : -1))
    .filter((index) => index >= 0);

  useLayoutEffect(() => {
    const node = menu.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const flipX = x + width + MARGIN > window.innerWidth;
    const flipY = y + height + MARGIN > window.innerHeight;
    setPlace({
      left: Math.max(MARGIN, flipX ? x - width : x),
      top: Math.max(MARGIN, flipY ? y - height : y),
      origin: `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}`,
    });
  }, [x, y]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    menu.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const close = () => onClose();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) onClose();
    };
    // Esc fecha de qualquer lugar (o foco pode não ter entrado no menu).
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", escape, true);
    window.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("keydown", escape, true);
      window.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
      previous?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const go = (index: number) => buttons[(index + buttons.length) % buttons.length]?.focus();
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      go(at + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      go(at - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      go(0);
    } else if (event.key === "End") {
      event.preventDefault();
      go(buttons.length - 1);
    }
  }

  // No <body>: um ancestral com transform (a deriva das seções) viraria o
  // referencial de `position: fixed` e o menu sairia do lugar.
  return createPortal(
    <div
      ref={menu}
      className="context-menu"
      role="menu"
      aria-label={title ?? "Ações"}
      data-ready={place !== null}
      style={place ? { left: place.left, top: place.top, transformOrigin: place.origin } : { left: x, top: y }}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {title && <p className="context-menu-title">{title}</p>}
      {items.map((item, index) =>
        item === "separator" ? (
          <hr key={`sep-${index}`} className="context-menu-sep" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            className="context-menu-item"
            data-danger={item.danger || undefined}
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            <item.icon size={16} strokeWidth={2} aria-hidden="true" />
            <span>{item.label}</span>
            {item.hint && <kbd>{item.hint}</kbd>}
          </button>
        ),
      )}
      {actionable.length === 0 && <p className="context-menu-title">Sem ações</p>}
    </div>,
    document.body,
  );
}
