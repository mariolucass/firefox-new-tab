import { useCallback, useRef, type PointerEvent } from "react";

/**
 * Escreve --mx/--my (posição do ponteiro dentro do alvo) para o brilho que
 * segue o cursor. Um único manipulador no contêiner, no máximo uma escrita por
 * quadro (rAF), só no elemento sob o ponteiro: sem listeners por item.
 */
export function useSpotlight(selector: string) {
  const frame = useRef(0);
  return useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        selector,
      );
      if (!target) return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();
        target.style.setProperty("--mx", `${clientX - box.left}px`);
        target.style.setProperty("--my", `${clientY - box.top}px`);
      });
    },
    [selector],
  );
}
