import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { sections, type SectionId } from "@views/home/model/sections";

const key = "nt-hidden-sections";
const known = new Set<string>(sections.map((section) => section.id));
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Seções ocultas, por pessoa e neste navegador. Fora das configurações exportadas de propósito: é layout, não dado. */
export function useHiddenSections() {
  const [hidden, setHidden] = useState<SectionId[]>([]);
  useBeforePaint(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
      if (Array.isArray(parsed))
        setHidden(
          parsed.filter((id): id is SectionId => known.has(id as string)),
        );
    } catch {
      // Sem localStorage: tudo visível.
    }
  }, []);

  const toggle = useCallback((id: SectionId) => {
    setHidden((previous) => {
      const next = previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id];
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // idem
      }
      return next;
    });
  }, []);

  return { hidden, toggle, show: (id: SectionId) => !hidden.includes(id) };
}
