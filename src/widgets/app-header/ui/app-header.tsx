"use client";

import { useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { Search, Settings2 } from "lucide-react";
import { contextNames, contexts, type ContextId } from "@shared/model/settings";

type Props = {
  activeContext: ContextId;
  onContextChange: (context: ContextId) => void;
  onSearch: () => void;
  onSettings: () => void;
};

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const isScrolled = () => window.scrollY > 8;

const subscribeNever = () => () => {};
const modifierKey = () =>
  /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

export function AppHeader({
  activeContext,
  onContextChange,
  onSearch,
  onSettings,
}: Props) {
  const scrolled = useSyncExternalStore(
    subscribeToScroll,
    isScrolled,
    () => false,
  );
  const modifier = useSyncExternalStore(
    subscribeNever,
    modifierKey,
    () => "Ctrl",
  );
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = contexts.indexOf(activeContext);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (activeIndex + step + contexts.length) % contexts.length;
    onContextChange(contexts[next]);
    buttons.current[next]?.focus();
  }

  return (
    <header className="app-header" data-scrolled={scrolled}>
      <div className="app-header-inner">
        <div className="app-brand">
          <span className="app-brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="app-brand-name">
            Personal <em>OS</em>
          </span>
        </div>

        <div
          className="context-switch"
          role="radiogroup"
          aria-label="Contexto ativo"
          style={
            {
              "--count": contexts.length,
              "--index": activeIndex,
            } as React.CSSProperties
          }
          onKeyDown={onKeyDown}
        >
          <span className="context-switch-thumb" aria-hidden="true" />
          {contexts.map((context, index) => (
            <button
              key={context}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={context === activeContext}
              tabIndex={context === activeContext ? 0 : -1}
              className="context-switch-option"
              onClick={() => onContextChange(context)}
            >
              {contextNames[context]}
            </button>
          ))}
        </div>

        <div className="app-header-actions">
          <button
            type="button"
            className="header-search"
            onClick={onSearch}
            aria-label="Abrir busca"
          >
            <Search size={16} aria-hidden="true" />
            <span className="header-search-label">Buscar</span>
            <kbd>{modifier} K</kbd>
          </button>
          <button
            type="button"
            className="header-icon-button"
            onClick={onSettings}
            aria-label="Abrir configurações"
            title="Configurações"
          >
            <Settings2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
