"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, Check, Plus, Repeat as RepeatIcon, X } from "lucide-react";
import { isDueToday, type Repeat, type useToday } from "@features/today/model/use-today";

type Props = { today: ReturnType<typeof useToday> };

/**
 * Lista do dia: o que precisa acontecer hoje, a um clique da busca. Enter
 * adiciona, o círculo conclui, e o que foi concluído some na virada do dia.
 */
export function TodayList({ today }: Props) {
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

  return (
    <section className="section" aria-label="Hoje">
      <div className="section-heading">
        <h2>
          Hoje
          <span className="section-hint" aria-hidden="true">
            <kbd>Alt</kbd>
            <kbd>T</kbd>
          </span>
        </h2>
        {done > 0 && (
          <button type="button" className="text-button is-quiet" onClick={clearDone}>
            Limpar concluídas ({done})
          </button>
        )}
      </div>
      <div className="rem-card">
        <header className="rem-head">
          <span className="rem-icon" aria-hidden="true">
            {date.getDate()}
          </span>
          <span className="rem-count" data-zero={pending === 0} aria-hidden="true">
            {pending}
          </span>
        </header>
        <p className="rem-sub" aria-live="polite">
          {total === 0
            ? `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${longDate}. Dia livre.`
            : pending === 0
              ? "Tudo feito. Aproveite o resto do dia."
              : `${pending} ${pending === 1 ? "pendente" : "pendentes"} · ${weekday}, ${longDate}`}
        </p>
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
