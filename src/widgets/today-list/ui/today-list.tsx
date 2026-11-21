"use client";

import { useState, type FormEvent } from "react";
import { CalendarCheck, CalendarDays, Check, CircleAlert, ListX, Plus, Repeat as RepeatIcon, Timer, X } from "lucide-react";
import { SectionAction, SectionHead } from "@shared/ui/section-head";
import { isDueToday, type Repeat, type useToday } from "@features/today/model/use-today";

type Props = {
  today: ReturnType<typeof useToday>;
  /** Inicia um foco de 25 min nesta tarefa. */
  onFocusTask?: (text: string) => void;
};

/** Para o dia livre: começos fáceis, a um clique. */
const starters = ["Revisar e-mails", "Estudar 25 min", "Treinar", "Planejar a semana"];

/**
 * Lista do dia: o que precisa acontecer hoje, a um clique da busca. Enter
 * adiciona, o círculo conclui, e o que foi concluído some na virada do dia.
 */
export function TodayList({ today, onFocusTask }: Props) {
  const { tasks: all, add, toggle, remove, clearDone, full } = today;
  const [text, setText] = useState("");
  const [options, setOptions] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("none");
  const [due, setDue] = useState("");
  // Com data futura a tarefa fica guardada em "Próximas" até o dia chegar.
  const tasks = all.filter((task) => isDueToday(task));
  const upcoming = all
    .filter((task) => !isDueToday(task))
    .sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
  const done = tasks.filter((task) => task.done).length;

  function submit(event: FormEvent) {
    event.preventDefault();
    add(text, { repeat, due: due || undefined });
    setText("");
    setRepeat("none");
    setDue("");
    setOptions(false);
  }

  const dayLabel = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  const todayKey = new Date().toLocaleDateString("sv-SE");

  const total = tasks.length;
  const pending = total - done;
  const date = new Date();
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
  const longDate = date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  const open = tasks.filter((task) => !task.done);
  const finished = tasks.filter((task) => task.done);

  const row = (task: (typeof tasks)[number], index: number) => (
    <li
      key={task.id}
      className="rem-item"
      data-done={task.done}
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <button
        type="button"
        className="rem-check"
        role="checkbox"
        aria-checked={task.done}
        aria-label={task.text}
        onClick={() => toggle(task.id)}
      >
        <Check size={15} strokeWidth={3} aria-hidden="true" />
      </button>
      <span className="rem-text">{task.text}</span>
      {task.repeat && task.repeat !== "none" && (
        <span className="rem-tag" title="Repete" aria-label="Repete">
          <RepeatIcon size={12} aria-hidden="true" />
        </span>
      )}
      {task.due && task.due < todayKey && !task.done && (
        <span className="rem-tag is-late" title="Atrasada">
          {dayLabel(task.due)}
        </span>
      )}
      {onFocusTask && !task.done && (
        <button
          type="button"
          className="rem-focus"
          onClick={() => onFocusTask(task.text)}
          aria-label={`Focar 25 min em ${task.text}`}
          title="Focar 25 min nisto"
        >
          <Timer size={15} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="rem-remove"
        onClick={() => remove(task.id)}
        aria-label={`Remover ${task.text}`}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </li>
  );
  const late = open.filter((task) => task.due && task.due < todayKey).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");

  return (
    <section className="section" aria-label="Hoje">
      <SectionHead
        icon={CalendarCheck}
        title="Hoje"
        hint={["Alt", "T"]}
        meta={total ? `${done} de ${total} ${total === 1 ? "feita" : "feitas"}` : "Nada marcado para hoje"}
        actions={
          done > 0 ? (
            <SectionAction icon={ListX} label={`Limpar ${done} concluída${done === 1 ? "" : "s"}`} badge={done} onClick={clearDone} />
          ) : undefined
        }
      />
      <div className="rem-card">
        <header className="rem-hero">
          <div className="rem-ring" data-complete={total > 0 && pending === 0} aria-hidden="true">
            <svg viewBox="0 0 80 80">
              <circle className="rem-ring-track" cx="40" cy="40" r="34" />
              <circle
                className="rem-ring-arc"
                cx="40"
                cy="40"
                r="34"
                pathLength={100}
                strokeDasharray={`${pct} 100`}
              />
            </svg>
            <span className="rem-ring-num">
              {total === 0 ? date.getDate() : pending === 0 ? <Check size={26} strokeWidth={3} /> : pending}
            </span>
            <span className="rem-ring-cap">
              {total === 0 ? month : pending === 0 ? "feito" : pending === 1 ? "pendente" : "pendentes"}
            </span>
          </div>
          <div className="rem-hero-text">
            <p className="rem-hello">
              {weekday.charAt(0).toUpperCase() + weekday.slice(1)} · {longDate}
            </p>
            <p className="rem-sub" aria-live="polite">
              {total === 0
                ? "Dia livre. Escolha o que precisa acontecer hoje."
                : pending === 0
                  ? "Tudo feito. Aproveite o resto do dia."
                  : pending === 1
                    ? "Falta só uma. Dá para fechar agora."
                    : `${pending} para fechar hoje.`}
            </p>
            {(total > 0 || upcoming.length > 0) && (
              <ul className="rem-stats">
                <li data-kind="done">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                  {done} {done === 1 ? "feita" : "feitas"}
                </li>
                {upcoming.length > 0 && (
                  <li data-kind="next">
                    <CalendarDays size={12} aria-hidden="true" />
                    {upcoming.length} {upcoming.length === 1 ? "próxima" : "próximas"}
                  </li>
                )}
                {late > 0 && (
                  <li data-kind="late">
                    <CircleAlert size={12} aria-hidden="true" />
                    {late} {late === 1 ? "atrasada" : "atrasadas"}
                  </li>
                )}
              </ul>
            )}
          </div>
        </header>
        {total === 0 && upcoming.length === 0 && !full && (
          <div className="rem-suggest" role="group" aria-label="Sugestões">
            {starters.map((starter) => (
              <button key={starter} type="button" onClick={() => add(starter, {})}>
                <Plus size={13} strokeWidth={2.6} aria-hidden="true" />
                {starter}
              </button>
            ))}
          </div>
        )}
        <ul className="rem-list">
          {open.map((task, index) => row(task, index))}
        </ul>
        {finished.length > 0 && (
          <>
            <p className="rem-divider">Concluídas</p>
            <ul className="rem-list">
              {finished.map((task, index) => row(task, index))}
            </ul>
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <p className="rem-divider">Próximas</p>
            <ul className="rem-list">
              {upcoming.map((task) => (
                <li key={task.id} className="rem-item" data-upcoming="true">
                  <span className="rem-check" aria-hidden="true" />
                  <span className="rem-text">{task.text}</span>
                  <span className="rem-tag">{dayLabel(task.due ?? "")}</span>
                  <button
                    type="button"
                    className="rem-remove"
                    onClick={() => remove(task.id)}
                    aria-label={`Remover ${task.text}`}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <form className="rem-add" onSubmit={submit}>
          <span className="rem-add-plus" aria-hidden="true">
            <Plus size={16} strokeWidth={2.6} />
          </span>
          <input
            data-hotkey="task"
            aria-keyshortcuts="Alt+T"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={full ? "Lista cheia (12 tarefas)" : "Novo lembrete"}
            disabled={full}
            maxLength={120}
            aria-label="Nova tarefa"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="rem-options-toggle"
            aria-expanded={options}
            aria-label="Data e repetição"
            title="Data e repetição"
            data-set={repeat !== "none" || due !== ""}
            onClick={() => setOptions((value) => !value)}
          >
            <CalendarDays size={16} aria-hidden="true" />
          </button>
          {options && (
            <div className="rem-options">
              <label>
                Quando
                <input
                  type="date"
                  value={due}
                  min={todayKey}
                  onChange={(event) => setDue(event.target.value)}
                />
              </label>
              <label>
                Repetir
                <select
                  value={repeat}
                  onChange={(event) => setRepeat(event.target.value as Repeat)}
                >
                  <option value="none">Não</option>
                  <option value="daily">Todo dia</option>
                  <option value="weekdays">Dias úteis</option>
                  <option value="weekly">Toda semana</option>
                </select>
              </label>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
