import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { defaultFilter, levels, themes, type Filter } from "./content";

/** Metas do dia: ouvir a palavra, praticar a frase e mexer no vocabulário. */
export const goals = [
  { id: "word", label: "Palavra" },
  { id: "phrase", label: "Frase" },
  { id: "vocab", label: "Vocabulário" },
] as const;
export type GoalId = (typeof goals)[number]["id"];

type Stored = {
  filter: Filter;
  day: string;
  done: GoalId[];
  /** Dias (AAAA-MM-DD) em que as três metas foram cumpridas. */
  days: string[];
};

const key = "nt-english";
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

const dayKey = (date = new Date()) => date.toLocaleDateString("sv-SE");

const empty = (): Stored => ({ filter: defaultFilter, day: dayKey(), done: [], days: [] });

function read(): Stored {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as Partial<Stored> | null;
    if (!parsed) return empty();
    const level = levels.some((item) => item.id === parsed.filter?.level) || parsed.filter?.level === "all";
    const theme = themes.some((item) => item.id === parsed.filter?.theme) || parsed.filter?.theme === "all";
    const today = dayKey();
    return {
      filter: {
        level: level ? (parsed.filter!.level as Filter["level"]) : "all",
        theme: theme ? (parsed.filter!.theme as Filter["theme"]) : "all",
      },
      day: today,
      // Virou o dia: as metas recomeçam.
      done: parsed.day === today && Array.isArray(parsed.done)
        ? parsed.done.filter((id): id is GoalId => goals.some((goal) => goal.id === id))
        : [],
      days: Array.isArray(parsed.days) ? parsed.days.filter((value) => typeof value === "string").slice(-400) : [],
    };
  } catch {
    return empty();
  }
}

/** Dias seguidos até hoje (ou até ontem, se hoje ainda não fechou as metas). */
function streakOf(days: string[], todayDone: boolean): number {
  const set = new Set(days);
  let count = 0;
  const cursor = new Date();
  if (!todayDone) cursor.setDate(cursor.getDate() - 1);
  while (set.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/** Preferências (nível e tema) e metas do dia do painel de inglês. Locais, lidas antes do primeiro quadro. */
export function useEnglish() {
  const [state, setState] = useState<Stored>(empty);
  useBeforePaint(() => setState(read()), []);

  const commit = useCallback((change: (previous: Stored) => Stored) => {
    setState((previous) => {
      const next = change(previous);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Sem localStorage: vale só nesta aba.
      }
      return next;
    });
  }, []);

  const setFilter = useCallback(
    (patch: Partial<Filter>) => commit((previous) => ({ ...previous, filter: { ...previous.filter, ...patch } })),
    [commit],
  );

  /** Marca uma meta como cumprida hoje; ao fechar as três, o dia entra na sequência. */
  const mark = useCallback(
    (goal: GoalId) =>
      commit((previous) => {
        if (previous.done.includes(goal)) return previous;
        const done = [...previous.done, goal];
        const complete = goals.every((item) => done.includes(item.id));
        return {
          ...previous,
          done,
          days: complete && !previous.days.includes(previous.day) ? [...previous.days, previous.day] : previous.days,
        };
      }),
    [commit],
  );

  return useMemo(() => {
    const todayDone = goals.every((goal) => state.done.includes(goal.id));
    return {
      filter: state.filter,
      setFilter,
      done: state.done,
      mark,
      complete: todayDone,
      streak: streakOf(state.days, todayDone),
    };
  }, [state, setFilter, mark]);
}

