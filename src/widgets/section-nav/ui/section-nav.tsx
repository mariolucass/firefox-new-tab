"use client";

import type { ComponentType } from "react";
import { glideTo } from "@shared/lib/glide";

type Icon = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" }>;
export type SectionLink = {
  /** aria-label da seção na página (é por ele que se acha o destino). */
  label: string;
  name: string;
  icon: Icon;
  /** Número vivo ao lado do nome (tarefas pendentes, notas). */
  badge?: number;
};

/**
 * Atalhos para as seções, na dobra: um clique leva direto, com rolagem suave,
 * sem passar por tudo o que está no meio. A ordem é a da página.
 */
export function SectionNav({ links }: { links: SectionLink[] }) {
  if (!links.length) return null;
  function go(label: string) {
    const target = document.querySelector<HTMLElement>(
      `.main-content section.section[aria-label="${label.replace(/"/g, '\\"')}"]`,
    );
    if (!target) return;
    // Posição de layout (offsetTop), não a medida na tela: as seções entram com
    // deslocamento e deriva por transform, que enganariam getBoundingClientRect.
    let top = 0;
    for (let node: HTMLElement | null = target; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
    void glideTo(top - 96);
  }
  return (
    <nav className="fold-nav" aria-label="Ir para uma seção">
      <span className="fold-nav-label">Ir para</span>
      <ul>
        {links.map(({ label, name, icon: Icon, badge }) => (
          <li key={label}>
            <button type="button" className="fold-nav-chip" onClick={() => go(label)}>
              <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
              {name}
              {badge ? <span className="fold-nav-badge">{badge}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
