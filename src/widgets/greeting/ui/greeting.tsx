"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Volume2 } from "lucide-react";
import { CountUp } from "@shared/ui/count-up";
import { speak } from "@features/english/model/speak";

type Resume = { title: string; url: string };
type Props = {
  /** Prioridade do contexto com link: vira o cartão "Continuar". */
  resume: Resume | null;
  /** Nome do contexto ativo (eyebrow). */
  contextName: string;
  /** Tarefas de hoje. */
  tasks: { done: number; total: number };
  notes: number;
  /** Foco concluído hoje. */
  focus: { sessions: number; minutes: number };
  /** Palavra do dia de inglês (some se a seção estiver oculta). */
  dailyWord: { en: string; pt: string } | null;
  /** Chamado ao ouvir a palavra (conta para a meta do dia). */
  onWord: () => void;
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function greetingFor(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function lede(tasks: Props["tasks"], resume: Resume | null): React.ReactNode {
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

/**
 * Abertura da aba. À esquerda a saudação e uma frase sobre o dia; à direita um
 * cartão com a prioridade para continuar e o dia em números. A altura mínima
 * é reservada no CSS para não pular ao montar.
 */
export function Greeting({
  resume,
  contextName,
  tasks,
  notes,
  focus,
  dailyWord,
  onWord,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const date = now ? dateFormat.format(now) : "";

  return (
    <div className="greeting">
      <div className="greeting-copy">
        <span className="greeting-eyebrow">{contextName}</span>
        <h1 className="greeting-title">
          {now ? greetingFor(now.getHours()) : "\u00a0"}.
          <span>{date.charAt(0).toUpperCase() + date.slice(1)}.</span>
        </h1>
        <p className="greeting-lede">{lede(tasks, resume)}</p>
        {dailyWord && (
          <button
            type="button"
            className="greeting-word"
            onClick={() => {
              speak(dailyWord.en);
              onWord();
            }}
            title="Ouvir a palavra do dia"
          >
            <Volume2 size={15} aria-hidden="true" />
            <span className="greeting-word-en">{dailyWord.en}</span>
            <span className="greeting-word-pt">{dailyWord.pt}</span>
          </button>
        )}
      </div>
      <div className="greeting-card">
        {resume ? (
          <a href={resume.url} className="greeting-resume">
            <span className="greeting-resume-label">
              Continuar
              <ArrowUpRight size={16} aria-hidden="true" />
            </span>
            <span className="greeting-resume-title">{resume.title}</span>
          </a>
        ) : (
          <div className="greeting-resume">
            <span className="greeting-resume-label">Em foco</span>
            <span className="greeting-resume-title">Nada com link</span>
          </div>
        )}
        <div className="greeting-stats">
          <div className="greeting-stat">
            <span className="greeting-stat-value">
              <CountUp value={tasks.done} />/{tasks.total}
            </span>
            <span className="greeting-stat-label">tarefas</span>
          </div>
          <div className="greeting-stat">
            <span className="greeting-stat-value">
              <CountUp value={focus.minutes} />
            </span>
            <span className="greeting-stat-label">min de foco</span>
          </div>
          <div className="greeting-stat">
            <span className="greeting-stat-value">
              <CountUp value={notes} />
            </span>
            <span className="greeting-stat-label">
              {notes === 1 ? "nota" : "notas"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
