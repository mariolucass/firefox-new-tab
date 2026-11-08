import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type Repeat = "none" | "daily" | "weekdays" | "weekly";
export type Task = {
  id: string;
  text: string;
  done: boolean;
  /** Recorrência: ao virar o dia (ou a semana) a tarefa concluída volta pendente. */
  repeat?: Repeat;
  /** AAAA-MM-DD. Antes dessa data a tarefa fica guardada em "Próximas". Em recorrência semanal, define o dia da semana. */
  due?: string;
};
type Stored = { day: string; tasks: Task[] };

const key = "nt-today";
const limit = 12;
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const dayOf = (date: Date) => date.toLocaleDateString("sv-SE"); // AAAA-MM-DD, local
const today = () => dayOf(new Date());
const parseDay = (day: string) => new Date(`${day}T12:00:00`);

/** A recorrência vale no dia `day`? Semanal usa o dia da semana de `due` (ou do cadastro). */
export function repeatsOn(task: Task, day: string, anchor: string): boolean {
  const date = parseDay(day);
  if (task.repeat === "daily") return true;
  if (task.repeat === "weekdays") return date.getDay() >= 1 && date.getDay() <= 5;
  if (task.repeat === "weekly")
    return parseDay(task.due ?? anchor).getDay() === date.getDay();
  return false;
}

/** Tarefas visíveis hoje: sem data, ou com data de hoje ou anterior (atrasada). */
export const isDueToday = (task: Task, day = today()) => !task.due || task.due <= day;

function read(): Task[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as Stored | null;
    if (!parsed || !Array.isArray(parsed.tasks)) return [];
    const valid = parsed.tasks.filter(
      (task) => typeof task?.id === "string" && typeof task.text === "string",
    );
    const now = today();
    if (parsed.day === now) return valid;
    // Virou o dia: recorrentes concluídas voltam (se a regra vale hoje); as
    // demais concluídas somem; o pendente continua.
    return valid.flatMap((task) => {
      if (!task.done) return [task];
      if (task.repeat && task.repeat !== "none" && repeatsOn(task, now, parsed.day))
        return [{ ...task, done: false }];
      return task.repeat && task.repeat !== "none" ? [task] : [];
    });
  } catch {
    return [];
  }
}

/** Lista do dia. Local (localStorage), lida antes do primeiro quadro, sem tocar nas configurações. */
export function useToday() {
  const [tasks, setTasks] = useState<Task[]>([]);
  useBeforePaint(() => setTasks(read()), []);

  const commit = useCallback((change: (previous: Task[]) => Task[]) => {
    setTasks((previous) => {
      const next = change(previous);
      try {
        localStorage.setItem(
          key,
          JSON.stringify({ day: today(), tasks: next }),
        );
      } catch {
        // Sem localStorage: a lista vale só nesta aba.
      }
      return next;
    });
  }, []);

  const add = useCallback((text: string, options: { repeat?: Repeat; due?: string } = {}) => {
      const clean = text.trim().slice(0, 120);
      if (!clean) return;
      commit((previous) =>
        previous.length >= limit
          ? previous
          : [
              ...previous,
              {
                id: crypto.randomUUID(),
                text: clean,
                done: false,
                ...(options.repeat && options.repeat !== "none" ? { repeat: options.repeat } : {}),
                ...(options.due ? { due: options.due } : {}),
              },
            ],
      );
    }, [commit]);
  const toggle = useCallback((id: string) =>
      commit((previous) =>
        previous.map((task) =>
          task.id === id ? { ...task, done: !task.done } : task,
        ),
      ), [commit]);
  const remove = useCallback((id: string) =>
    commit((previous) => previous.filter((task) => task.id !== id)), [commit]);
  const clearDone = useCallback(() =>
    commit((previous) => previous.filter((task) => !task.done)), [commit]);

  return useMemo(() => ({
    tasks, add, toggle, remove, clearDone, full: tasks.length >= limit,
  }), [tasks, add, toggle, remove, clearDone]);
}
