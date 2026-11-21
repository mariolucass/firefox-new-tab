/**
 * Rolagem com curva própria (o "smooth" do navegador é linear e seco). Duração
 * proporcional à distância, entrada e saída suaves; qualquer gesto do usuário
 * (roda, toque) interrompe na hora. Devolve a distância percorrida (0 = já
 * estava lá ou foi interrompida).
 */
let cancel: (() => void) | null = null;

const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

export function glideTo(target: number): Promise<number> {
  cancel?.();
  const from = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const to = Math.max(0, Math.min(target, max));
  const distance = Math.abs(to - from);
  if (distance < 4) return Promise.resolve(0);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, to);
    return Promise.resolve(distance);
  }
  const duration = Math.min(1100, Math.max(560, 420 + distance * 0.22));
  return new Promise((resolve) => {
    const start = performance.now();
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      cancel = null;
    };
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + (to - from) * easeInOutQuart(t));
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        stop();
        resolve(distance);
      }
    };
    cancel = () => {
      stop();
      resolve(0);
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    frame = requestAnimationFrame(step);
  });
}

export const glideToTop = () => glideTo(0);
