"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { Check, Keyboard, Search, Settings2, Timer } from "lucide-react";
import { contextNames, contexts, type ContextId } from "@shared/model/settings";
import { contextIcons } from "@shared/ui/context-icons";

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

// Geometria do dock na grade de 8pt (px). O CSS usa os mesmos números:
// barra de 56 = respiro 8 + alvo 40 + respiro 8; 16 depois do rótulo.
const PAD = 8;
const SLOT = 40;
const LABEL_TAIL = 16;
/** A partir desta largura todos os contextos mostram o nome (reconhecer > lembrar). */
const ALL_LABELS = "(min-width: 1180px)";
/** Abaixo desta, só ícones: o nome do contexto não cabe ao lado das ações. */
const TIGHT = "(max-width: 640px)";

/**
 * Cabeçalho, revisto pelas heurísticas de Nielsen:
 * - reconhecer em vez de lembrar: com espaço, todo contexto mostra o nome,
 *   não só o ícone; a tecla (Alt N) aparece junto;
 * - estética e minimalismo: no topo, a busca e a hora já estão na dobra, então
 *   o cabeçalho é só uma linha fina; "Buscar" e o relógio entram ao rolar,
 *   quando a busca grande sai de vista;
 * - visibilidade do estado: topo = linha transparente; rolando = ilha de vidro
 *   compacta com o contexto ativo;
 * - controle e liberdade: o logo volta ao topo e foca a busca;
 * - consistência: três peças da mesma altura (56), alvos de 40, grade de 8pt.
 *
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
  const [labelWidth, setLabelWidth] = useState<number[]>(() => contexts.map(() => 0));
  const [rest, setRest] = useState<number | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [roomy, setRoomy] = useState(false);
  const [tight, setTight] = useState(false);
  const [settled, setSettled] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const leaveTimer = useRef(0);
  const readyTimer = useRef(0);
  const [hoverReady, setHoverReady] = useState(true);
  const bar = useRef<HTMLDivElement>(null);
  const barWidth = useRef(0);
  const firstScroll = useRef(true);
  // Abre na hora, fecha com um pequeno atraso: dá tempo de chegar ao item sem
  // a ilha se fechar debaixo do ponteiro.
  const engage = () => {
    window.clearTimeout(leaveTimer.current);
    if (!engaged) {
      // Enquanto os itens se abrem eles deslizam sob o ponteiro: ignorar o
      // "repouso" nesse intervalo evita o brilho pulando de item em item.
      setHoverReady(false);
      window.clearTimeout(readyTimer.current);
      readyTimer.current = window.setTimeout(() => setHoverReady(true), 480);
    }
    setEngaged(true);
  };
  const rest_ = (index: number) => {
    if (hoverReady || !scrolled) setRest(index);
  };
  const release = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setEngaged(false);
      setRest(null);
    }, 320);
  };
  useEffect(
    () => () => {
      window.clearTimeout(leaveTimer.current);
      window.clearTimeout(readyTimer.current);
    },
    [],
  );
  const shown = useRef(false);
  const settledRef = useRef(false);
  settledRef.current = settled;
  const activeIndex = contexts.indexOf(activeContext);

  // Antes da primeira pintura: largura da janela e posição da rolagem já
  // certas, então nada "se arruma" depois de visível.
  useLayoutEffect(() => {
    const wide = window.matchMedia(ALL_LABELS);
    const narrow = window.matchMedia(TIGHT);
    const sync = () => {
      setRoomy(wide.matches);
      setTight(narrow.matches);
    };
    sync();
    wide.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
    };
  }, []);

  // Rolagem com histerese (liga além de 48 px, desliga abaixo de 12 px): sem
  // vai e volta quando a rolagem repousa perto do limite.
  useLayoutEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const next = shown.current ? y > 12 : y > 48;
      if (next === shown.current) return;
      shown.current = next;
      setScrolled(next);
      // A primeira leitura só ajusta o estado inicial; as seguintes são trocas
      // de verdade e ganham o "assentar" da barra (ver data-swapped no CSS).
      if (settledRef.current) setSwapped(true);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Largura natural de cada rótulo, medida antes de pintar e de novo quando a
  // fonte carrega. Só depois (settled) as transições ligam.
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      if (alive) setLabelWidth(labels.current.map((node) => Math.ceil(node?.scrollWidth ?? 0)));
    };
    measure();
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      measure();
      requestAnimationFrame(() => requestAnimationFrame(() => alive && setSettled(true)));
    });
    return () => {
      alive = false;
    };
  }, []);

  // Última largura da barra (também durante uma animação): ponto de partida
  // da próxima transformação.
  useLayoutEffect(() => {
    const node = bar.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    barWidth.current = node.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      barWidth.current = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Topo ↔ ilha como a Dynamic Island: o layout já está no estado novo, e a
  // barra anima da largura antiga para a nova, com mola. Os grupos deslizam
  // junto (grade → centro) e o vidro acende por fade no CSS.
  useLayoutEffect(() => {
    if (firstScroll.current) {
      firstScroll.current = false;
      return;
    }
    const node = bar.current;
    if (!node || !settled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const from = barWidth.current;
    // Largura final de verdade. Na ilha (scrolled) ela depende do conteúdo, e as
    // peças internas ainda estão em transição: mede-se um clone sem transições
    // (ele já nasce com as larguras novas). No topo a barra tem largura de
    // layout fixa (min(100%, 1152px)): vale ler direto. Medir o clone aí daria
    // a largura do cabeçalho com o respiro lateral, 48px a mais em janelas
    // estreitas, e a barra "passaria" do ponto e voltaria.
    let to = node.getBoundingClientRect().width;
    if (scrolled) {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.classList.add("bar-measure");
      clone.setAttribute("aria-hidden", "true");
      node.parentElement?.appendChild(clone);
      to = clone.getBoundingClientRect().width;
      clone.remove();
    }
    if (!from || Math.abs(from - to) < 2) return;
    node.animate([{ width: `${from}px` }, { width: `${to}px` }], { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
  }, [scrolled]); //  

  const compact = scrolled && !engaged;
  // Ilha recolhida: só o ativo mostra o nome. Desdobrar o item sob o ponteiro
  // empurraria os vizinhos e faria o alvo fugir do mouse.
  const unfolded = scrolled ? activeIndex : (rest ?? activeIndex);
  // Com espaço e no topo, todos os nomes ficam à vista; senão, só o do item
  // ativo (ou o que está sob o ponteiro).
  const allLabels = roomy && !scrolled;
  const labelled = (index: number) => !tight && (allLabels || index === unfolded);
  const widths = contexts.map((_, index) => {
    if (compact && index !== activeIndex) return 0;
    // O último item, quando não é o ativo, deixa a cauda menor: o rótulo
    // termina mais perto da borda e o conjunto fica no centro óptico.
    const tail = index === contexts.length - 1 && index !== activeIndex ? LABEL_TAIL - 8 : LABEL_TAIL;
    return SLOT + (labelled(index) ? labelWidth[index] + tail : 0);
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
      <header className="app-header" data-scrolled={scrolled} data-settled={settled}
        data-swapped={swapped}
      >
        <div ref={bar} className="app-header-bar">
          <button
            type="button"
            className="header-pill brand"
            onClick={onSearch}
            aria-label="Nexo — voltar ao topo e buscar"
            title="Voltar ao topo · Alt Home"
          >
            {/* Assets oficiais em public/brand (textos já em curvas). */}
            <img className="brand-mark for-dark" src="brand/mark.svg" alt="" aria-hidden="true" />
            <img className="brand-mark for-light" src="brand/mark-black.svg" alt="" aria-hidden="true" />
            <img className="brand-name for-dark" src="brand/wordmark.svg" alt="" aria-hidden="true" />
            <img className="brand-name for-light" src="brand/wordmark-black.svg" alt="" aria-hidden="true" />
          </button>

          <div
            className="dock"
            role="radiogroup"
            aria-label="Contexto"
            data-compact={compact}
            style={style}
            onKeyDown={onKeyDown}
            onPointerEnter={engage}
            onPointerLeave={release}
            onFocus={engage}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) release();
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
                  style={{ width: widths[index], "--d": Math.abs(index - activeIndex) } as CSSProperties}
                  onClick={() => onContextChange(context)}
                  onPointerEnter={() => rest_(index)}
                  onPointerMove={() => rest_(index)}
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
                    data-on={labelled(index) && widths[index] > 0}
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
            <span className="header-actions">
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
            </span>
          </div>
        </div>
      </header>
    </>
  );
}
