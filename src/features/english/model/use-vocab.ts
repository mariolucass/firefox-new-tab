import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type VocabEntry = { id: string; en: string; pt: string; at: number };

const key = "nt-vocab";
const limit = 200;
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

function read(): VocabEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed)
      ? (parsed as VocabEntry[]).filter(
          (entry) =>
            typeof entry?.id === "string" &&
            typeof entry.en === "string" &&
            typeof entry.pt === "string" &&
            typeof entry.at === "number",
        )
      : [];
  } catch {
    return [];
  }
}

/** Vocabulário salvo (inglês → português), mais novo primeiro. Local, lido antes do primeiro quadro. */
export function useVocab() {
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  useBeforePaint(() => setEntries(read()), []);

  const commit = useCallback((change: (previous: VocabEntry[]) => VocabEntry[]) => {
    setEntries((previous) => {
      const next = change(previous);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Sem localStorage: o vocabulário vale só nesta aba.
      }
      return next;
    });
  }, []);

  /** Salva (ou move para o topo) uma palavra. Devolve false se já existia. */
  const add = useCallback(
    (en: string, pt: string) => {
      const cleanEn = en.trim().slice(0, 120);
      const cleanPt = pt.trim().slice(0, 200);
      if (!cleanEn || !cleanPt) return false;
      let isNew = true;
      commit((previous) => {
        const lower = cleanEn.toLowerCase();
        isNew = !previous.some((entry) => entry.en.toLowerCase() === lower);
        return [
          { id: crypto.randomUUID(), en: cleanEn, pt: cleanPt, at: Date.now() },
          ...previous.filter((entry) => entry.en.toLowerCase() !== lower),
        ].slice(0, limit);
      });
      return isNew;
    },
    [commit],
  );
  const remove = useCallback(
    (id: string) => commit((previous) => previous.filter((entry) => entry.id !== id)),
    [commit],
  );
  const has = useCallback(
    (en: string) => entries.some((entry) => entry.en.toLowerCase() === en.trim().toLowerCase()),
    [entries],
  );

  return useMemo(() => ({ entries, add, remove, has }), [entries, add, remove, has]);
}
