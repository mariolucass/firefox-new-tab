"use client";

import { useEffect } from "react";
import { m, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";

/**
 * Fundo fixo em profundidade: o chão da atmosfera em degradê e luzes (CSS) e,
 * por cima, três planos com paralaxe — uma luz distante, uma próxima que
 * percorre o espectro da paleta conforme a rolagem e o símbolo da marca.
 * Cada plano anda numa velocidade com a rolagem e com o ponteiro, o que dá
 * a sensação de volume. Por baixo de tudo, a grade de 8pt em que a página é
 * desenhada, com uma lanterna que a revela sob o cursor. Tudo por motion
 * values (nenhuma renderização do React por quadro) e só transform.
 */
/** Diâmetro da lanterna e a sobra da grade além da tela (para a paralaxe). */
const SPOT = 480;
const GRID_BLEED = 64;

export function Backdrop() {
  const calm = useReducedMotion();
  const { scrollY } = useScroll();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 40, damping: 18, mass: 0.8 });
  const y = useSpring(py, { stiffness: 40, damping: 18, mass: 0.8 });

  // Plano de trás: lento. Plano do meio: mais rápido e em sentido oposto no x.
  const farX = useTransform(x, (v) => v * 0.6);
  const farY = useTransform([y, scrollY], ([a, s]: number[]) => a * 0.6 - s * 0.05);
  const nearX = useTransform(x, (v) => v * -1.6);
  const nearY = useTransform([y, scrollY], ([a, s]: number[]) => a * -1.4 - s * 0.32);
  const nearScale = useTransform(scrollY, [0, 1600], [1, 1.35]);

  // Espectro: a luz próxima troca de cor ao descer a página (tom 1 → 4).
  const { scrollYProgress } = useScroll();
  const tone1 = useTransform(scrollYProgress, [0, 0.22, 0.38], [1, 1, 0]);
  const tone2 = useTransform(scrollYProgress, [0.22, 0.38, 0.55, 0.7], [0, 1, 1, 0]);
  const tone3 = useTransform(scrollYProgress, [0.55, 0.7, 0.82, 0.92], [0, 1, 1, 0]);
  const tone4 = useTransform(scrollYProgress, [0.82, 0.95], [0, 1]);

  // Grade de 8pt (blueprint): anda devagar com a rolagem. A lanterna segue o
  // ponteiro e desenha a mesma grade mais acesa, com o fundo compensado para
  // as linhas das duas camadas coincidirem.
  const gridY = useTransform([y, scrollY], ([a, s]: number[]) => a * 0.4 - (s * 0.12) % 64);
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);
  const sx = useSpring(mx, { stiffness: 260, damping: 30, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 260, damping: 30, mass: 0.5 });
  const spotX = useTransform(sx, (v) => v - SPOT / 2);
  const spotY = useTransform(sy, (v) => v - SPOT / 2);
  const spotBg = useTransform([sx, sy, gridY], ([a, b, g]: number[]) =>
    `${-GRID_BLEED - (a - SPOT / 2)}px ${-GRID_BLEED + g - (b - SPOT / 2)}px`,
  );

  // Marca d'água: sobe devagar, gira um tico e segue o ponteiro.
  const markY = useTransform([y, scrollY], ([a, s]: number[]) => a - s * 0.14);
  const rotate = useTransform(scrollY, (value) => value * 0.006);

  useEffect(() => {
    if (calm) return;
    const move = (event: PointerEvent) => {
      px.set((event.clientX / window.innerWidth - 0.5) * -28);
      py.set((event.clientY / window.innerHeight - 0.5) * -20);
      if (event.pointerType === "mouse") {
        mx.set(event.clientX);
        my.set(event.clientY);
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [calm, px, py, mx, my]);

  return (
    <div className="backdrop" aria-hidden="true">
      <m.div className="backdrop-grid" style={calm ? undefined : { y: gridY }} />
      {!calm && (
        <m.div
          className="backdrop-spot"
          style={{ x: spotX, y: spotY, backgroundPosition: spotBg }}
        />
      )}
      <m.div
        className="backdrop-orb backdrop-orb-far"
        style={calm ? undefined : { x: farX, y: farY }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <m.div
        className="backdrop-orb backdrop-orb-near"
        style={calm ? undefined : { x: nearX, y: nearY, scale: nearScale }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {[tone1, tone2, tone3, tone4].map((opacity, i) => (
          <m.span key={i} className="backdrop-tone" data-layer={i + 1} style={{ opacity }} />
        ))}
      </m.div>
      <m.img
        className="backdrop-mark"
        src="brand/mark-mono-white.svg"
        alt=""
        draggable={false}
        style={calm ? undefined : { x, y: markY, rotate }}
      />
    </div>
  );
}
