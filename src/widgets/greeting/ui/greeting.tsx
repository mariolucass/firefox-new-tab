"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Gauge, Volume2 } from "lucide-react";
import { SectionHead } from "@shared/ui/section-head";
import {
  AnimatePresence,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { CountUp } from "@shared/ui/count-up";
import { m, ease, rise, spring, stagger, useLayer, useTilt } from "@shared/ui/motion";
import { holidayInfo, holidayOn, nextHoliday } from "@shared/lib/holidays-br";
import { speak } from "@features/english/model/speak";

type Resume = { title: string; url: string };

/** Meta diária de foco que fecha o anel (4 sessões de 25 min). */
const FOCUS_GOAL = 100;

const weekdayFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const dayMonthFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
});
const shortDay = new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" });
const holidayDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" });

function greetingFor(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function lede(tasks: { done: number; total: number }, resume: Resume | null): React.ReactNode {
  const pending = tasks.total - tasks.done;
  if (tasks.total === 0) {
    return resume
      ? "Dia livre. Continue de onde parou ou anote o que precisa acontecer hoje."
      : "Dia livre. Anote o que precisa acontecer hoje, ou comece pela busca.";
  }
  if (pending === 0) return "Tudo feito por hoje. O resto do dia é seu.";
  return (
    <>
      Você tem{" "}
      <strong>
        {pending} {pending === 1 ? "tarefa" : "tarefas"}
      </strong>{" "}
      para hoje.
    </>
  );
}

/** Semana ISO 8601. */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + 1) / 7);
}

/** Domingo a sábado da semana de `date` (a semana brasileira começa no domingo). */
function weekOf(date: Date): Date[] {
  const sunday = new Date(date);
  sunday.setHours(0, 0, 0, 0);
  sunday.setDate(sunday.getDate() - sunday.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

/** Posição na coreografia de abertura (ver "Abertura" no CSS). */
const order = (n: number) => ({ "--o": n }) as React.CSSProperties;
const shortWeekday = (d: Date) => capitalize(d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
const pad = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Relógio que só avança no virar do minuto. */
function useMinute(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = window.setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Dígitos que rolam: cada caractere troca subindo por uma janela recortada. */
function Roll({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text} role="text">
      {text.split("").map((ch, i) => (
        <span key={i} className="roll-slot" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={ch}
              className="roll-char"
              initial={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
              transition={{ ...spring.snappy, opacity: { duration: 0.25 } }}
            >
              {ch}
            </m.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

/* =====================================================================
   Cabeça da dobra
   Um caminho em mono acima (contexto, semana, quanto do dia já foi), a
   saudação em uma linha e a data com a hora. Monocromática. Entra rápido
   (~0,6 s) e, ao rolar, fica para trás e desfoca.
   ===================================================================== */
export function Greeting() {
  const now = useMinute();
  const hello = now ? greetingFor(now.getHours()) : "";
  const { scrollY } = useScroll();
  const layer = useLayer(scrollY, { speed: 280, fade: [0, 360], blur: 8 });

  return (
    <m.div className="fold-head" style={layer}>
      <h1 className="fold-title" style={order(1)}>
        {now ? `${hello}.` : " "}
      </h1>
      <p className="fold-date" style={order(2)}>
        {now ? (
          <>
            {capitalize(weekdayFormat.format(now))}, {dayMonthFormat.format(now)}
            <span className="fold-date-sep" aria-hidden="true" />
            <Roll className="fold-time" text={`${pad(now.getHours())}:${pad(now.getMinutes())}`} />
          </>
        ) : (
          " "
        )}
      </p>
    </m.div>
  );
}

/* ---------- Mostrador ----------
   viewBox 200×200, centro (100,100). De fora para dentro: 24 marcas de hora,
   o arco do dia (meia-noite no topo), o anel de tarefas e o anel de foco.
   Quando o painel entra na tela: as marcas acendem em volta, os anéis se
   desenham por mola e o ponteiro varre da meia-noite até a hora atual. */
const C = 100;
const R_TICK = 96;
const R_DAY = 82;
const R_TASKS = 68;
const R_FOCUS = 54;
/** Arredonda para o SSR e o cliente gerarem o mesmo atributo. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const TICKS = Array.from({ length: 24 }, (_, h) => {
  const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
  const major = h % 6 === 0;
  const r0 = major ? R_TICK - 7 : R_TICK - 3.5;
  return {
    h,
    major,
    x1: r2(C + r0 * Math.cos(a)),
    y1: r2(C + r0 * Math.sin(a)),
    x2: r2(C + R_TICK * Math.cos(a)),
    y2: r2(C + R_TICK * Math.sin(a)),
  };
});

function Ring({
  r,
  value,
  tone,
  width,
  delay,
  shown,
}: {
  r: number;
  value: number;
  tone: string;
  width: number;
  delay: number;
  shown: boolean;
}) {
  const v = clamp(value);
  return (
    <g className="dial-ring" data-ring={tone}>
      <m.circle
        className="dial-track"
        cx={C}
        cy={C}
        r={r}
        strokeWidth={width}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={shown ? { pathLength: 1, opacity: 1 } : undefined}
        transition={{
          pathLength: { duration: 1.2, ease, delay: delay - 0.25 },
          opacity: { duration: 0.3, delay: delay - 0.25 },
        }}
      />
      <m.circle
        className="dial-arc"
        cx={C}
        cy={C}
        r={r}
        strokeWidth={width}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={shown ? { pathLength: Math.max(v, 0.0001), opacity: v > 0 ? 1 : 0 } : undefined}
        transition={{ pathLength: { ...spring.dial, delay }, opacity: { duration: 0.2, delay } }}
      />
    </g>
  );
}

function Dial({
  now,
  day,
  tasks,
  focus,
  shown,
}: {
  now: Date | null;
  day: number;
  tasks: number;
  focus: number;
  shown: boolean;
}) {
  // Ponteiro: ângulo por mola, posição derivada (nenhum render por quadro).
  const target = useMotionValue(0);
  const angle = useSpring(target, spring.dial);
  const cx = useTransform(angle, (a) => C + R_DAY * Math.cos(((a - 90) * Math.PI) / 180));
  const cy = useTransform(angle, (a) => C + R_DAY * Math.sin(((a - 90) * Math.PI) / 180));
  useEffect(() => {
    if (!now || !shown) return;
    const id = window.setTimeout(() => target.set(day * 360), 350);
    return () => window.clearTimeout(id);
  }, [now, day, shown, target]);

  const left = now ? 24 * 60 - (now.getHours() * 60 + now.getMinutes()) : 0;

  return (
    <div className="dial">
      <div className="dial-halo" aria-hidden="true" />
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <g className="dial-ticks">
          {TICKS.map(({ h, major, x1, y1, x2, y2 }) => (
            <m.line
              key={h}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              data-major={major || undefined}
              data-past={(now && h <= now.getHours()) || undefined}
              initial={{ opacity: 0 }}
              animate={shown ? { opacity: 1 } : undefined}
              transition={{ duration: 0.4, ease, delay: 0.1 + h * 0.022 }}
            />
          ))}
        </g>
        <g transform={`rotate(-90 ${C} ${C})`}>
          <Ring r={R_DAY} value={day} tone="day" width={2} delay={0.4} shown={shown} />
          <Ring r={R_TASKS} value={tasks} tone="tasks" width={9} delay={0.6} shown={shown} />
          <Ring r={R_FOCUS} value={focus} tone="focus" width={9} delay={0.72} shown={shown} />
        </g>
        {now && shown && (
          <>
            <m.circle
              className="dial-pulse"
              cx={cx}
              cy={cy}
              initial={{ r: 4, opacity: 0 }}
              animate={{ r: [4, 13], opacity: [0.55, 0] }}
              transition={{ duration: 2.4, ease: "easeOut", repeat: Infinity, delay: 1.6 }}
            />
            <m.circle
              className="dial-now"
              cx={cx}
              cy={cy}
              r={4}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            />
          </>
        )}
      </svg>
      <m.div
        className="dial-center"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={shown ? { opacity: 1, scale: 1 } : undefined}
        transition={{ ...spring.soft, delay: 0.5, opacity: { duration: 0.4, delay: 0.5 } }}
      >
        <Roll className="dial-time" text={now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : "--:--"} />
        <span className="dial-left">{now ? `${Math.floor(left / 60)}h${pad(left % 60)} até 0h` : " "}</span>
      </m.div>
    </div>
  );
}

const legendRow = {
  hidden: { opacity: 0, x: 24, filter: "blur(6px)" },
  shown: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { ...spring.snappy, opacity: { duration: 0.4 }, filter: { duration: 0.4 } },
    transitionEnd: { transform: "none", filter: "none" },
  },
};

type DayProps = {
  /** Prioridade do contexto com link: vira a linha "Continuar". */
  resume: Resume | null;
  tasks: { done: number; total: number };
  notes: number;
  focus: { sessions: number; minutes: number };
  /** Palavra do dia de inglês (some se a seção estiver oculta). */
  dailyWord: { en: string; pt: string } | null;
  /** Chamado ao ouvir a palavra (conta para a meta do dia). */
  onWord: () => void;
};

/* =====================================================================
   Seu dia
   Primeira seção abaixo da busca. À esquerda a semana, a frase do dia e a
   palavra; à direita o mostrador com a legenda. Cada métrica tem a cor da sua
   seção (tarefas = Hoje, foco = Em foco, notas = Notas). Tudo se encena quando
   o painel entra na tela; o cartão segue o ponteiro em 3D.
   ===================================================================== */
export function DayPanel({ resume, tasks, notes, focus, dailyWord, onWord }: DayProps) {
  const now = useMinute();
  const ref = useRef<HTMLElement>(null);
  const shown = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const day = now ? (now.getHours() * 60 + now.getMinutes()) / 1440 : 0;
  const week = now ? weekOf(now) : [];
  const weekHolidays = week.flatMap((d) => {
    const info = holidayInfo(d);
    return info ? [{ d, info }] : [];
  });
  const next = now && !weekHolidays.length ? nextHoliday(new Date(week[6])) : null;
  const taskRatio = tasks.total ? tasks.done / tasks.total : 0;
  const focusRatio = focus.minutes / FOCUS_GOAL;
  const tilt = useTilt(6);
  const state = shown ? "shown" : "hidden";

  return (
    <section ref={ref} className="section day" aria-label="Seu dia">
      <SectionHead
        icon={Gauge}
        title="Seu dia"
        meta={
          now
            ? `${capitalize(weekdayFormat.format(now))}, ${dayMonthFormat.format(now)} · semana ${isoWeek(now)}${holidayOn(now) ? ` · ${holidayOn(now)}` : ""}`
            : " "
        }
      />
      <div className="day-grid">
        <div className="day-copy">
          {now && (
            <m.ol className="week" aria-label="Esta semana" variants={stagger(0.045, 0.1)} initial="hidden" animate={state}>
              {week.map((d) => {
                const when = d.toDateString() === now.toDateString() ? "today" : d < now ? "past" : "next";
                const holiday = holidayOn(d);
                return (
                  <m.li
                    key={d.toISOString()}
                    className="week-day"
                    data-state={when}
                    data-holiday={holiday ? "" : undefined}
                    title={holiday ?? undefined}
                    variants={rise}
                  >
                    <span className="week-day-name">{shortDay.format(d).toUpperCase()}</span>
                    <span className="week-day-num">{d.getDate()}</span>
                  </m.li>
                );
              })}
            </m.ol>
          )}
          {now && weekHolidays.length > 0 && (
            <ul className="week-holidays" aria-label="Feriados desta semana">
              {weekHolidays.map(({ d, info }) => {
                const isToday = d.toDateString() === now.toDateString();
                return (
                  <li key={d.toISOString()} className="week-holiday" data-today={isToday || undefined}>
                    <span className="week-holiday-date" aria-hidden="true">
                      <small>{shortWeekday(d)}</small>
                      {d.getDate()}
                    </span>
                    <span className="week-holiday-text">
                      <span className="week-holiday-title">
                        <strong>{info.name}</strong>
                        <em>{isToday ? "Hoje" : info.optional ? "Ponto facultativo" : "Feriado nacional"}</em>
                      </span>
                      <span className="week-holiday-why">{info.why}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {next && (
            <p className="week-next">
              Sem feriados esta semana. Próximo: <strong>{next.info.name}</strong>, {holidayDate.format(next.date)} (em{" "}
              {next.days} {next.days === 1 ? "dia" : "dias"}).
            </p>
          )}
          <p className="day-lede">{lede(tasks, resume)}</p>
          <div className="day-actions">
            {dailyWord && (
              <m.button
                type="button"
                className="greeting-word"
                onClick={() => {
                  speak(dailyWord.en);
                  onWord();
                }}
                title="Ouvir a palavra do dia"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={spring.snappy}
              >
                <Volume2 size={15} aria-hidden="true" />
                <span className="greeting-word-en">{dailyWord.en}</span>
                <span className="greeting-word-pt">{dailyWord.pt}</span>
              </m.button>
            )}
            {resume && (
              <m.a
                href={resume.url}
                className="greeting-resume"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={spring.snappy}
              >
                <span className="greeting-resume-label">
                  Continuar
                  <ArrowUpRight size={14} aria-hidden="true" />
                </span>
                <span className="greeting-resume-title">{resume.title}</span>
              </m.a>
            )}
          </div>
        </div>

        <m.div ref={tilt.ref} className="greeting-card" style={tilt.style} {...tilt.handlers}>
          <m.div className="greeting-glare" style={{ background: tilt.glare }} aria-hidden="true" />
          <Dial now={now} day={day} tasks={taskRatio} focus={focusRatio} shown={shown} />
          <m.dl className="legend" variants={stagger(0.07, 0.45)} initial="hidden" animate={state}>
            {[
              { tone: "day", label: "Dia", value: Math.round(day * 100), unit: "%" },
              { tone: "tasks", label: "Tarefas", value: tasks.done, unit: `/${tasks.total}` },
              { tone: "focus", label: "Foco", value: focus.minutes, unit: `/${FOCUS_GOAL} min` },
              { tone: "notes", label: notes === 1 ? "Nota" : "Notas", value: notes, unit: "" },
            ].map((row) => (
              <m.div key={row.tone} className="legend-row" data-tone-key={row.tone} variants={legendRow}>
                <dt>{row.label}</dt>
                <dd>
                  <CountUp value={row.value} />
                  {row.unit && <small>{row.unit}</small>}
                </dd>
              </m.div>
            ))}
          </m.dl>
        </m.div>
      </div>
    </section>
  );
}
