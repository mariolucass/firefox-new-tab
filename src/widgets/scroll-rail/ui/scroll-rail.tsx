"use client";

import { useEffect, useRef } from "react";

/**
 * Trilho de rolagem próprio no lugar da barra nativa (escondida em CSS): um
 * fio de vidro à direita que só aparece enquanto se rola. Um único listener
 * passivo; cada quadro escreve só transform e height no polegar.
 */
export function ScrollRail() {
  const rail = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const railNode = rail.current;
    const thumbNode = thumb.current;
    if (!railNode || !thumbNode) return;
    let frame = 0;
    let hide = 0;

    const paint = () => {
      frame = 0;
      const overflow = root.scrollHeight - root.clientHeight;
      if (overflow <= 8) {
        railNode.dataset.on = "false";
        return;
      }
      const track = railNode.clientHeight;
      const size = Math.max(36, (root.clientHeight / root.scrollHeight) * track);
      const y = (root.scrollTop / overflow) * (track - size);
      thumbNode.style.height = `${size.toFixed(1)}px`;
      thumbNode.style.transform = `translateY(${y.toFixed(1)}px)`;
    };
    const onScroll = () => {
      railNode.dataset.on = "true";
      window.clearTimeout(hide);
      hide = window.setTimeout(() => {
        railNode.dataset.on = "false";
      }, 900);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <div ref={rail} className="scroll-rail" data-on="false" aria-hidden="true">
      <span ref={thumb} className="scroll-rail-thumb" />
    </div>
  );
}
