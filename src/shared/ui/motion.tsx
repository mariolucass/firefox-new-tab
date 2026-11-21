"use client";

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  scroll,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Transition,
  type Variants,
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

/* ---------- Abertura da aba ----------
   Uma só coreografia para tudo: a página espera (wait) até ter os dados do
   primeiro quadro (configurações, hora, fontes, medidas do cabeçalho), então
   toca (play) uma vez, com cada peça escalonada por --o no CSS, e termina
   (done). Nada anima antes de a página estar no lugar final: sem saltos. */
export type IntroStage = "wait" | "play" | "done";
const IntroContext = createContext<IntroStage>("done");
export const useIntroStage = () => useContext(IntroContext);
export const IntroProvider = IntroContext.Provider;

/** Libera a abertura quando fontes e dados prontos (com teto de 450 ms). */
export function useIntroStageState(ready: boolean): IntroStage {
  const [stage, setStage] = useState<IntroStage>("wait");
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let alive = true;
    const open = () => alive && setFonts(true);
    const cap = window.setTimeout(open, 450);
    (document.fonts?.ready ?? Promise.resolve()).then(open, open);
    return () => {
      alive = false;
      window.clearTimeout(cap);
    };
  }, []);
  useEffect(() => {
    if (!ready || !fonts || stage !== "wait") return;
    // Dois quadros: o layout final (larguras do dock, hora) já foi pintado.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setStage("play"));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [ready, fonts, stage]);
  useEffect(() => {
    if (stage !== "play") return;
    const id = window.setTimeout(() => setStage("done"), 1800);
    return () => window.clearTimeout(id);
  }, [stage]);
  return stage;
}

/* ---------- Linguagem de movimento ----------
   Uma curva de saída (ease) para opacidade e desfoque, e três molas:
   `soft` para blocos grandes, `snappy` para peças pequenas, `dial` para
   ponteiros e anéis. Nenhuma quica de verdade: o overshoot fica em ~2–4%. */
const ease = [0.22, 1, 0.36, 1] as const;
const spring = {
  soft: { type: "spring", stiffness: 70, damping: 18, mass: 1 },
  snappy: { type: "spring", stiffness: 260, damping: 24, mass: 0.7 },
  dial: { type: "spring", stiffness: 38, damping: 14, mass: 1.1 },
} satisfies Record<string, Transition>;

/**
 * Ao terminar, filtro e transform voltam a "none": qualquer filter/transform
 * num ancestral vira raiz de backdrop e apaga o vidro (backdrop-filter) dos
 * filhos. Em repouso, nada fica preso.
 */
const rest = { filter: "none", transform: "none" } as const;

type RevealProps = ComponentProps<typeof m.div> & { delay?: number; drift?: number };

/**
 * Entrada ao rolar, em duas camadas:
 * - entrada (uma vez): o bloco chega de 96 px abaixo, em 90%, deitado 10° em
 *   3D e saindo de um leve desfoque, com mola; ao terminar, transform e filtro
 *   voltam a "none". Marca `data-shown`, que encena o interior no CSS (fio,
 *   título, itens em cascata).
 * - deriva (contínua): enquanto atravessa a tela, o conteúdo desliza ±`drift`
 *   px — cada seção numa velocidade diferente do fundo e dos títulos.
 * Transform não apaga o vidro dos filhos (só filter/opacity fazem isso), e
 * menus fixos são renderizados no <body>, fora deste contêiner.
 */
export function Reveal({ delay = 0, drift = 32, children, style, className, ...props }: RevealProps) {
  const stage = useIntroStage();
  // Fixado na montagem: mudar `initial` depois deixaria o bloco preso invisível.
  const [born] = useState(stage);
  const calm = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  // "Já chegou": o topo entrou na tela (ou ficou para trás, se a rolagem
  // saltou). Um IntersectionObserver perde blocos pulados por End/arrasto e
  // deixa um vazio; aqui basta o topo estar acima de 90% da altura.
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const check = () => {
      const top = ref.current?.getBoundingClientRect().top;
      if (top !== undefined && top < window.innerHeight * 0.9) setInView(true);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [inView]);
  // Espera a abertura começar; o que já está à vista entra depois da dobra.
  const go = inView && stage !== "wait";
  const lead = useRef(0);
  if (go && lead.current === 0 && stage === "play") lead.current = 0.55;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);
  const at = delay + lead.current;
  return (
    <m.div
      ref={ref}
      // Montada depois da abertura (troca de contexto): já nasce visível, sem piscar.
      initial={born === "done" ? false : { opacity: 0, y: 40 }}
      animate={go ? { opacity: 1, y: 0, transitionEnd: rest } : undefined}
      transition={{
        y: { duration: 0.9, ease, delay: at },
        opacity: { duration: 0.7, ease, delay: at },
      }}
      data-shown={go || undefined}
      style={style}
      {...props}
    >
      {/* A classe de layout (ex.: a grade de .context-content) vai na camada
          interna, onde o conteúdo mora; os data-* ficam na externa. */}
      <m.div className={className ? `reveal-drift ${className}` : "reveal-drift"} style={calm ? undefined : { y }}>
        {children}
      </m.div>
    </m.div>
  );
}

/**
 * Texto por máscara: cada palavra sobe de trás de uma janela recortada, com um
 * leve giro, em cascata. O texto inteiro fica no aria-label para leitores de
 * tela não soletrarem palavra por palavra.
 */
export function MaskText({
  text,
  delay = 0,
  stagger = 0.07,
  className,
}: {
  text: string;
  delay?: number;
  stagger?: number;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text} role="text">
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {i > 0 ? " " : null}
          <span className="mask-word" aria-hidden="true">
          <m.span
            className="mask-word-inner"
            initial={{ y: "112%", rotate: 7, opacity: 0 }}
            animate={{ y: "0%", rotate: 0, opacity: 1, transitionEnd: { transform: "none" } }}
            transition={{
              default: { ...spring.soft, stiffness: 90, delay: delay + i * stagger },
              opacity: { duration: 0.4, ease, delay: delay + i * stagger },
            }}
          >
            {word}
          </m.span>
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** Contêiner e item de cascata com variantes (para listas pequenas). */
export const stagger = (each = 0.05, delay = 0): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: each, delayChildren: delay } },
});
export const rise: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.92, filter: "blur(6px)" },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { ...spring.snappy, opacity: { duration: 0.35, ease }, filter: { duration: 0.45, ease } },
    transitionEnd: rest,
  },
};

/**
 * Inclinação 3D que segue o ponteiro (±`max` graus) e um reflexo que acompanha
 * o cursor (variáveis --gx/--gy para o CSS). Molas, nenhuma renderização do
 * React por quadro. Sem ponteiro fino ou com menos movimento, fica parado.
 */
export function useTilt(max = 7) {
  const calm = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const config = { stiffness: 120, damping: 16, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), config);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), config);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx} ${gy}, rgb(var(--theme-fg) / 0.14), transparent 60%)`;

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (calm || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width);
    py.set((event.clientY - box.top) / box.height);
  };
  const onPointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };
  return {
    ref,
    calm,
    handlers: { onPointerMove, onPointerLeave },
    style: calm ? undefined : { rotateX, rotateY, transformPerspective: 1100 },
    glare,
  };
}

/**
 * Paralaxe por camada: `speed` em px de deslocamento por 1000 px rolados
 * (positivo = fica para trás). `fade`/`blur` fazem a camada sumir na saída.
 * Só para camadas sem vidro dentro (transform num ancestral apaga o vidro).
 */
export function useLayer(
  scrollY: MotionValue<number>,
  { speed = 0, fade, blur, scale }: { speed?: number; fade?: [number, number]; blur?: number; scale?: number },
) {
  const y = useTransform(scrollY, (v) => (v * speed) / 1000);
  const opacity = useTransform(scrollY, fade ?? [0, 1], fade ? [1, 0] : [1, 1]);
  const blurPx = useTransform(scrollY, fade ?? [0, 1], [0, blur ?? 0]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;
  const s = useTransform(scrollY, fade ?? [0, 1], [1, scale ?? 1]);
  return { y, opacity, ...(blur ? { filter } : {}), ...(scale ? { scale: s } : {}) };
}

/**
 * Paralaxe dos títulos de seção: cada `selector` deriva `distance` px ao
 * atravessar a tela (entra um pouco abaixo, sai um pouco acima), por `scroll`
 * do Motion, escrito direto no estilo (nenhum render). Só em cabeçalhos: não
 * têm vidro dentro. `deps` refaz a ligação quando a página troca de seções.
 */
export function useScrollParallax(selector: string, distance: number, deps: unknown[]) {
  const calm = useReducedMotion();
  useEffect(() => {
    if (calm) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const stops = els.map((el) =>
      scroll(
        (progress: number) => {
          el.style.transform = `translate3d(0, ${((0.5 - progress) * distance).toFixed(1)}px, 0)`;
        },
        { target: el, offset: ["start end", "end start"] },
      ),
    );
    return () => {
      stops.forEach((stop) => stop());
      els.forEach((el) => (el.style.transform = ""));
    };
  }, [calm, selector, distance, ...deps]);
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

export { m, ease, spring };
