import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type Note = { id: string; text: string; at: number };

const key = "nt-notes";
const limit = 50;
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function read(): Note[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? (parsed as Note[]).filter(
          (note) =>
            typeof note?.id === "string" &&
            typeof note.text === "string" &&
            typeof note.at === "number",
        )
      : [];
  } catch {
    return [];
  }
}

/** Notas rápidas, mais novas primeiro. Locais (localStorage), lidas antes do primeiro quadro. */
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  useBeforePaint(() => setNotes(read()), []);

  const commit = useCallback((change: (previous: Note[]) => Note[]) => {
    setNotes((previous) => {
      const next = change(previous);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Sem localStorage: as notas valem só nesta aba.
      }
      return next;
    });
  }, []);

  const add = useCallback((text: string) => {
      const clean = text.trim().slice(0, 500);
      if (!clean) return;
      commit((previous) =>
        [
          { id: crypto.randomUUID(), text: clean, at: Date.now() },
          ...previous,
        ].slice(0, limit),
      );
    }, [commit]);
  const remove = useCallback((id: string) =>
    commit((previous) => previous.filter((note) => note.id !== id)), [commit]);

  return useMemo(() => ({ notes, add, remove }), [notes, add, remove]);
}
