"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Briefcase, Check, Code, GraduationCap, Keyboard, Search, Settings2, Timer, User } from "lucide-react";
import { contextNames, contexts, type ContextId } from "@shared/model/settings";

const contextIcons = {
  development: Code,
  academic: GraduationCap,
  career: Briefcase,
  personal: User,
} satisfies Record<ContextId, unknown>;

type Props = {
  activeContext: ContextId;
  showClock: boolean;
  onContextChange: (context: ContextId) => void;
  onSettings: () => void;
  onHelp: () => void;
  /** Rola ao topo e foca a busca (a busca some de vista ao rolar). */
  onSearch: () => void;
  /** Sessão de foco em andamento (ou concluída): vira um selo no cabeçalho. */
  focus: { label: string; done: boolean } | null;
};

/** Hora curta, atualizada a cada 30 s. Nada antes de montar (sem hidratação errada). */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

// Geometria do dock (px). O CSS usa os mesmos números: padding 6, ícone 44
// (40 de polegar + 2 de folga de cada lado), 14 de respiro depois do rótulo.
const PAD = 6;
const SLOT = 44;
const LABEL_TAIL = 14;

/**
 * Dock em ilha, no estilo "Dynamic Island":
 * - o polegar líquido desliza até o item ativo (mola em linear(), sem JS por
 *   quadro) e um brilho segue o item em que o ponteiro repousa;
 * - o rótulo se desdobra onde se repousa (ou no contexto ativo, em repouso);
 * - ao rolar a página a ilha se compacta: só o item ativo fica, e o resto
 *   volta ao apontar ou focar.
 * As larguras são calculadas aqui (rótulo medido uma vez), então polegar e
 * itens animam juntos por transição de CSS, sem medir durante o movimento.
 */
export function AppHeader({
  activeContext,
  showClock,
  onContextChange,
  onSettings,
  onHelp,
  onSearch,
  focus,
}: Props) {
  const now = useNow();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const sentinel = useRef<HTMLDivElement>(null);
  const [labelWidth, setLabelWidth] = useState<number[]>(() => contexts.map(() => 0));
  const [rest, setRest] = useState<number | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const activeIndex = contexts.indexOf(activeContext);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setScrolled(!entry.isIntersecting),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Largura natural de cada rótulo, medida uma vez (e quando a fonte carrega).
  useLayoutEffect(() => {
    const measure = () =>
      setLabelWidth(labels.current.map((node) => Math.ceil(node?.scrollWidth ?? 0)));
    measure();
    void document.fonts?.ready.then(measure);
  }, []);

  const compact = scrolled && !engaged;
  const unfolded = rest ?? activeIndex;
  const widths = contexts.map((_, index) => {
    if (compact && index !== activeIndex) return 0;
    return SLOT + (index === unfolded ? labelWidth[index] + LABEL_TAIL : 0);
  });
  const offsetOf = (index: number) =>
    PAD + widths.slice(0, index).reduce((sum, value) => sum + value, 0);
  const style = {
    "--x": `${offsetOf(activeIndex) + 2}px`,
    "--w": `${Math.max(widths[activeIndex] - 4, 0)}px`,
    "--gx": `${offsetOf(rest ?? activeIndex) + 2}px`,
    "--gw": `${Math.max(widths[rest ?? activeIndex] - 4, 0)}px`,
  } as CSSProperties;

  // Setas trocam de contexto, como em um grupo de rádio nativo.
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
    <>
      <div ref={sentinel} className="header-sentinel" aria-hidden="true" />
      <header className="app-header" data-scrolled={scrolled}>
        <div className="app-header-bar">
          <div className="header-pill brand">
            {/* Assets oficiais em public/brand (textos já em curvas). */}
            <img className="brand-mark for-dark" src="brand/mark.svg" alt="" aria-hidden="true" />
            <img className="brand-mark for-light" src="brand/mark-black.svg" alt="" aria-hidden="true" />
            <img className="brand-name for-dark" src="brand/wordmark.svg" alt="Nexo" />
            <img className="brand-name for-light" src="brand/wordmark-black.svg" alt="Nexo" />
          </div>

          <div
            className="dock"
            role="radiogroup"
            aria-label="Contexto"
            data-compact={compact}
            style={style}
            onKeyDown={onKeyDown}
            onPointerEnter={() => setEngaged(true)}
            onPointerLeave={() => {
              setEngaged(false);
              setRest(null);
            }}
            onFocus={() => setEngaged(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setEngaged(false);
                setRest(null);
              }
            }}
          >
            <span className="dock-glow" data-on={rest !== null && rest !== activeIndex} aria-hidden="true" />
            <span className="dock-thumb" aria-hidden="true" />
            {contexts.map((context, index) => {
              const Icon = contextIcons[context];
              return (
                <button
                  key={context}
                  ref={(node) => {
                    buttons.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={context === activeContext}
                  aria-label={contextNames[context]}
                  aria-keyshortcuts={`Alt+${index + 1}`}
                  title={`${contextNames[context]} · Alt ${index + 1}`}
                  tabIndex={context === activeContext ? 0 : -1}
                  className="dock-item"
                  data-active={context === activeContext}
                  data-gone={widths[index] === 0}
                  style={{ width: widths[index] }}
                  onClick={() => onContextChange(context)}
                  onPointerEnter={() => setRest(index)}
                  onFocus={() => setRest(index)}
                >
                  <span className="dock-icon">
                    <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span
                    ref={(node) => {
                      labels.current[index] = node;
                    }}
                    className="dock-label"
                    data-on={index === unfolded && widths[index] > 0}
                  >
                    {contextNames[context]}
                    <kbd aria-hidden="true">Alt {index + 1}</kbd>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="header-pill app-header-end">
            {focus && (
              <span className="focus-chip" data-done={focus.done} role="timer">
                {focus.done ? (
                  <Check size={14} strokeWidth={2.4} aria-hidden="true" />
                ) : (
                  <Timer size={14} strokeWidth={2.2} aria-hidden="true" />
                )}
                {focus.label}
              </span>
            )}
            <button
              type="button"
              className="header-search"
              onClick={onSearch}
              aria-label="Buscar (Ctrl K)"
              title="Buscar · Ctrl K ou /"
            >
              <Search size={16} strokeWidth={2} aria-hidden="true" />
              <span className="header-search-text">
                Buscar
                <kbd>Ctrl K</kbd>
              </span>
            </button>
            {showClock && now && (
              <time className="app-clock" dateTime={now.toISOString()}>
                {timeFormat.format(now)}
              </time>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={onHelp}
              aria-label="Atalhos de teclado (?)"
              title="Atalhos de teclado · ?"
            >
              <Keyboard size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onSettings}
              aria-label="Configurações (Alt ,)"
              title="Configurações · Alt ,"
            >
              <Settings2 size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
