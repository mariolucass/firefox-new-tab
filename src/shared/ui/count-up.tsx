"use client";

import { useEffect, useRef } from "react";

type Props = { value: number; duration?: number };

/**
 * Número que conta até o valor (e de um valor a outro quando muda). Escreve no
 * nó de texto direto, sem renderizar o React por quadro; sem movimento, mostra
 * o valor final na hora. O texto inicial já é o valor final, então a hidratação
 * e leitores de tela veem o número certo.
 */
export function CountUp({ value, duration = 800 }: Props) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = shown.current;
    if (calm || from === value) {
      shown.current = value;
      el.textContent = String(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      shown.current = Math.round(from + (value - from) * eased);
      el.textContent = String(shown.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    el.textContent = String(from);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span ref={node}>{value}</span>;
}
