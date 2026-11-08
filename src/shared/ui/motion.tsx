"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * Motion carregado em modo enxuto: só o necessário (domAnimation, sem drag nem
 * layout) e `strict`, para ninguém puxar o pacote completo por engano.
 * `reducedMotion="user"` desliga transformações para quem pede menos movimento.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

const ease = [0.22, 1, 0.36, 1] as const;

type RevealProps = ComponentProps<typeof m.div> & { delay?: number };

/**
 * Entrada ao rolar: sobe 18 px e aparece, uma vez só. Só opacity e transform
 * (compositor), e ao terminar o elemento volta a não ter transform nenhum, então
 * o vidro (backdrop-filter) dos filhos funciona normalmente em repouso.
 */
export function Reveal({ delay = 0, children, ...rest }: RevealProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.7, ease, delay }}
      {...rest}
    >
      {children}
    </m.div>
  );
}

/**
 * Paralaxe de saída: ao rolar, o conteúdo sobe mais devagar que a página e
 * esmaece, dando profundidade à abertura. Motion values, só transform e opacity.
 */
export function ScrollDrift({ children }: { children: ReactNode }) {
  const calm = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 70]);
  const opacity = useTransform(scrollY, [0, 380], [1, 0.15]);
  return <m.div style={calm ? undefined : { y, opacity }}>{children}</m.div>;
}

/** Fio de progresso de leitura no topo: scaleX por mola, só transform. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.4,
  });
  return (
    <m.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />
  );
}

export { m, ease };
