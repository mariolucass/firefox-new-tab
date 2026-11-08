"use client";

import { BrandMark } from "@shared/ui/brand-mark";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronUp, Plus, Timer, X } from "lucide-react";
import { formatRemaining, type FocusSession, type useFocusTimer } from "@features/timer/model/use-focus-timer";
import { useSpotlight } from "@shared/lib/use-spotlight";
import type { FocusItem } from "@shared/model/settings";

type Props = {
  items: FocusItem[];
  contextName: string;
  onAdd: () => void;
  onEdit: (item: FocusItem) => void;
  timer: ReturnType<typeof useFocusTimer>;
};

const presets = [15, 25, 45, 60] as const;

/** Barra de progresso do foco: uma animação CSS linear até zero (nenhum JS por quadro). */
function TimerBar({ session }: { session: FocusSession }) {
  const [from] = useState(() => {
    const left = Math.max(0, session.endsAt - Date.now());
    return { fraction: Math.min(1, left / session.total), ms: left };
  });
  return (
    <span className="timer-track" aria-hidden="true">
      <span
        className="timer-bar"
        style={{ "--from": from.fraction, animationDuration: `${from.ms}ms` } as CSSProperties}
      />
    </span>
  );
}

/** Matiz estável por id: cada projeto tem a sua cor sem ninguém escolher. */
function hueOf(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1)
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  return Math.abs(hash) % 360;
}

/**
 * Pilha de cartões rolante. O cartão da frente é o único interativo; os
 * outros aparecem em degraus atrás dele. Rolar (botões, setas, deslizar ou
 * tocar num cartão de trás) manda o da frente para o fim da pilha. Tudo é
 * transform/opacity, e a pilha mede 168px + 14px por cartão atrás.
 */
export function FocusArea({ items, contextName, onAdd, onEdit, timer }: Props) {
  const [picking, setPicking] = useState(false);
  const count = items.length;
  const full = count >= 3;
  const [front, setFront] = useState(0);
  const [sent, setSent] = useState<string | null>(null);
  const start = useRef<{ y: number; moved: boolean } | null>(null);
  const current = count ? front % count : 0;
  const spotlight = useSpotlight(".stack-card");
  // A abertura em leque roda só na primeira vez, não a cada troca de contexto.
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  function roll(step: 1 | -1) {
    if (count < 2) return;
    setSent(step === 1 ? items[current].id : null);
    setFront((current + step + count) % count);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      roll(1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      roll(-1);
    }
  }

  function onPointerDown(event: PointerEvent) {
    start.current = { y: event.clientY, moved: false };
  }
  function onPointerUp(event: PointerEvent) {
    const origin = start.current;
    if (!origin) return;
    const delta = event.clientY - origin.y;
    if (Math.abs(delta) > 40) {
      origin.moved = true;
      roll(delta < 0 ? 1 : -1);
    }
  }

  return (
    <section className="section" aria-label="Em foco">
      <div className="section-heading">
        <h2>Em foco</h2>
        <button
          type="button"
          className="text-button"
          onClick={onAdd}
          disabled={full}
          title={full ? "Limite de 3 prioridades por contexto" : undefined}
        >
          <Plus size={14} aria-hidden="true" /> Adicionar
        </button>
      </div>
      {count ? (
        <>
          <ul
            className="stack"
            data-intro={intro}
            style={{ "--n": count } as CSSProperties}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={spotlight}
            onPointerUp={onPointerUp}
            onClickCapture={(event) => {
              // Um deslize não pode virar clique no link do cartão.
              if (start.current?.moved) {
                event.preventDefault();
                event.stopPropagation();
                start.current = null;
              }
            }}
          >
            {items.map((item, index) => {
              const position = (index - current + count) % count;
              const isFront = position === 0;
              const mine =
                timer.session && timer.session.itemId === item.id ? timer.session : null;
              return (
                <li
                  key={item.id}
                  className="stack-card"
                  data-front={isFront}
                  data-sent={sent === item.id}
                  data-done={mine?.state === "done"}
                  aria-hidden={!isFront}
                  style={
                    { "--p": position, "--hue": hueOf(item.id) } as CSSProperties
                  }
                  onClick={() => {
                    if (!isFront) {
                      setSent(null);
                      setFront(index);
                    }
                  }}
                >
                  <span className="stack-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="stack-body">
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </div>
                  <div className="stack-foot">
                    <div className="stack-foot-main">
                      {item.url ? (
                        <a
                          href={item.url}
                          className="stack-open"
                          tabIndex={isFront ? 0 : -1}
                        >
                          Continuar <ArrowUpRight size={15} aria-hidden="true" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="stack-open is-muted"
                          tabIndex={isFront ? 0 : -1}
                          onClick={() => onEdit(item)}
                        >
                          Definir link
                        </button>
                      )}
                      {mine?.state === "running" ? (
                        <>
                          <span className="timer-chip" role="timer">
                            <Timer size={14} aria-hidden="true" />
                            {formatRemaining(timer.remaining)}
                          </span>
                          <button
                            type="button"
                            className="timer-icon"
                            tabIndex={isFront ? 0 : -1}
                            onClick={timer.stop}
                            aria-label="Parar foco"
                            title="Parar foco"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </>
                      ) : mine?.state === "done" ? (
                        <>
                          <span className="timer-chip is-done">
                            <Check size={14} strokeWidth={2.4} aria-hidden="true" />
                            Concluído
                          </span>
                          <button
                            type="button"
                            className="timer-preset"
                            tabIndex={isFront ? 0 : -1}
                            onClick={() =>
                              timer.start({ id: item.id, title: item.title }, mine.total / 60_000)
                            }
                          >
                            Mais {Math.round(mine.total / 60_000)} min
                          </button>
                          <button
                            type="button"
                            className="timer-icon"
                            tabIndex={isFront ? 0 : -1}
                            onClick={timer.stop}
                            aria-label="Dispensar"
                            title="Dispensar"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </>
                      ) : picking && isFront ? (
                        <div className="timer-presets" role="group" aria-label="Duração do foco">
                          {presets.map((minutes) => (
                            <button
                              key={minutes}
                              type="button"
                              className="timer-preset"
                              onClick={() => {
                                timer.start({ id: item.id, title: item.title }, minutes);
                                setPicking(false);
                              }}
                            >
                              {minutes}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="timer-icon"
                            onClick={() => setPicking(false)}
                            aria-label="Cancelar"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="timer-start"
                          tabIndex={isFront ? 0 : -1}
                          onClick={() => setPicking(true)}
                          title="Iniciar uma sessão de foco"
                        >
                          <Timer size={15} aria-hidden="true" />
                          Focar
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="text-button is-quiet"
                      tabIndex={isFront ? 0 : -1}
                      onClick={() => onEdit(item)}
                      aria-label={`Editar ${item.title}`}
                    >
                      Editar
                    </button>
                  </div>
                  {mine?.state === "running" && <TimerBar key={mine.endsAt} session={mine} />}
                </li>
              );
            })}
          </ul>
          {count > 1 && (
            <div className="stack-controls">
              <button
                type="button"
                className="stack-step"
                onClick={() => roll(-1)}
                aria-label="Cartão anterior"
              >
                <ChevronUp size={16} aria-hidden="true" />
              </button>
              <span className="stack-count" aria-live="polite">
                {current + 1} / {count}
              </span>
              <button
                type="button"
                className="stack-step"
                onClick={() => roll(1)}
                aria-label="Próximo cartão"
              >
                <ChevronDown size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="empty-state">
          <BrandMark size={18} />
          Nada em foco em {contextName}. Fixe até 3 prioridades para tê-las à mão.
        </p>
      )}
    </section>
  );
}
