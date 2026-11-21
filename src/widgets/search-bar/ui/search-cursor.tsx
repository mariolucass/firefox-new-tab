"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { useSpring, useTransform, useVelocity } from "motion/react";
import { m } from "@shared/ui/motion";

export type CursorBox = { x: number; y: number; w: number; h: number; tint: string; card: boolean };

/** Mola de posição: firme e quase sem sobra (estilo Apple), não elástica. */
const move = { stiffness: 560, damping: 46, mass: 0.7 };
/** Largura e altura: superamortecidas — nunca passam do alvo (a linha tem largura fixa). */
const size = { stiffness: 480, damping: 52, mass: 0.7 };
/** Aura: mesma trajetória, mas mais mole — chega um instante depois e deixa rastro. */
const trail = { stiffness: 150, damping: 20, mass: 0.9 };
/** Mola do esticar: acompanha a velocidade e volta a 1 logo depois. */
const squash = { stiffness: 320, damping: 26, mass: 0.5 };
const press = { stiffness: 700, damping: 30, mass: 0.4 };

/**
 * O quadrado de seleção da lista, em três camadas:
 * - corpo: x, y, largura e altura são molas de verdade (uma trajetória física,
 *   não quatro transições soltas). O preenchimento se estica na direção do
 *   movimento e se estreita na outra (squash and stretch, só na vertical) — só ele: o texto
 *   da ação fica sem distorção;
 * - aura: um brilho desfocado na cor da marca, numa mola mais mole, que chega
 *   depois do corpo e dá profundidade;
 * - pressão: ao apertar, o preenchimento afunda um pouco (por mola).
 */
export function SearchCursor({
  box,
  pressed,
  children,
}: {
  box: CursorBox;
  pressed: boolean;
  children?: ReactNode;
}) {
  // Bordas, não largura: esquerda e direita são molas independentes que ficam
  // sempre entre o ponto de partida e o de chegada. Com x + largura separados,
  // ao subir de um cartão (à direita) para uma linha cheia a soma passava da
  // borda da lista e aparecia rolagem horizontal.
  const x = useSpring(box.x, move);
  const right = useSpring(box.x + box.w, move);
  const y = useSpring(box.y, move);
  const height = useSpring(box.h, size);
  const ax = useSpring(box.x, trail);
  const aRight = useSpring(box.x + box.w, trail);
  const ay = useSpring(box.y, trail);
  const ah = useSpring(box.h, size);
  const width = useTransform([x, right], ([l, r]: number[]) => Math.max(0, r - l));
  const aw = useTransform([ax, aRight], ([l, r]: number[]) => Math.max(0, r - l));
  const sink = useSpring(1, press);
  useEffect(() => {
    x.set(box.x);
    right.set(box.x + box.w);
    y.set(box.y);
    height.set(box.h);
    ax.set(box.x);
    aRight.set(box.x + box.w);
    ay.set(box.y);
    ah.set(box.h);
  }, [box.x, box.y, box.w, box.h, x, right, y, height, ax, aRight, ay, ah]);
  useEffect(() => sink.set(pressed ? 0.972 : 1), [pressed, sink]);

  const vy = useVelocity(y);
  // Só estica na vertical (até 4%) e só estreita na horizontal: o quadrado
  // nunca passa da largura da linha, nem encosta nas bordas do painel.
  const sy = useSpring(useTransform(vy, (a: number) => 1 + Math.min(Math.abs(a) / 40000, 0.04)), squash);
  const sx = useSpring(useTransform(vy, (a: number) => 1 - Math.min(Math.abs(a) / 90000, 0.02)), squash);
  const scaleX = useTransform([sx, sink], ([a, b]: number[]) => Math.min(1, a * b));
  const scaleY = useTransform([sy, sink], ([a, b]: number[]) => a * b);

  const tint = box.tint ? ({ "--tint": box.tint } as CSSProperties) : undefined;
  return (
    <>
      <m.div
        className="search-cursor-aura"
        style={{ x: ax, y: ay, width: aw, height: ah, ...tint } as unknown as CSSProperties}
        aria-hidden="true"
      />
      <m.div
        className="search-cursor"
        data-card={box.card || undefined}
        style={{ x, y, width, height, ...tint } as unknown as CSSProperties}
        aria-hidden="true"
      >
        <m.span className="search-cursor-fill" style={{ scaleX, scaleY }} />
        {children}
      </m.div>
    </>
  );
}
