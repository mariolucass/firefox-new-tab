"use client";

import { useEffect } from "react";
import { m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

/**
 * Fundo fixo: degradê azul-noite e luzes suaves (CSS). Sobre ele, o símbolo da
 * marca em marca d'água com paralaxe: sobe devagar com a rolagem e acompanha o
 * ponteiro por alguns pixels. Tudo por motion values (nenhuma renderização do
 * React por quadro) e só transform.
 */
export function Backdrop() {
  const calm = useReducedMotion();
  const { scrollY } = useScroll();
  const scrolled = useTransform(scrollY, (value) => value * -0.14);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 40, damping: 18, mass: 0.8 });
  const y = useSpring(py, { stiffness: 40, damping: 18, mass: 0.8 });
  const sum = useTransform([y, scrolled], ([a, b]: number[]) => a + b);
  const rotate = useTransform(scrollY, (value) => value * 0.006);

  useEffect(() => {
    if (calm) return;
    const move = (event: PointerEvent) => {
      px.set((event.clientX / window.innerWidth - 0.5) * -28);
      py.set((event.clientY / window.innerHeight - 0.5) * -20);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [calm, px, py]);

  return (
    <div className="backdrop" aria-hidden="true">
      <m.img
        className="backdrop-mark"
        src="brand/mark-mono-white.svg"
        alt=""
        draggable={false}
        style={calm ? undefined : { x, y: sum, rotate }}
      />
    </div>
  );
}
