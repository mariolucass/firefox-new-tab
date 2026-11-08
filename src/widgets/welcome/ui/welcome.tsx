"use client";

import { useEffect, useRef } from "react";
import { Command, Keyboard, MousePointer2, Timer } from "lucide-react";

type Props = { onClose: () => void };

const tips = [
  {
    Icon: Command,
    title: "Tudo começa na busca",
    body: "Digite um atalho, um endereço ou uma pergunta. Prefixos como g, yt ou gh buscam direto no site.",
    keys: ["/", "Ctrl K"],
  },
  {
    Icon: Keyboard,
    title: "Contextos e favoritos",
    body: "Troque entre Desenvolvimento, Acadêmico, Carreira e Pessoal. As teclas 1 a 9 abrem os favoritos.",
    keys: ["Alt 1–4", "1–9"],
  },
  {
    Icon: Timer,
    title: "Foco, tarefas e notas",
    body: "Inicie um foco de 25 minutos, anote o dia e guarde ideias rápidas, tudo na mesma página.",
    keys: ["Alt T", "Alt N"],
  },
  {
    Icon: MousePointer2,
    title: "Do seu jeito",
    body: "Em Configurações: tema claro ou escuro, cor de destaque, seções e backup dos seus dados.",
    keys: ["Alt ,"],
  },
];

/** Boas-vindas da primeira abertura: o que o Nexo faz e as teclas que mais valem. Esc, clique fora ou o botão fecham. */
export function Welcome({ onClose }: Props) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div
      className="help-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        className="help-dialog welcome"
        role="dialog"
        aria-modal="true"
        aria-label="Boas-vindas ao Nexo"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <header className="welcome-head">
          <img className="welcome-logo for-dark" src="brand/logo.svg" alt="Nexo" draggable={false} />
          <img className="welcome-logo for-light" src="brand/logo-black.svg" alt="Nexo" draggable={false} />
          <p>Nova aba para Firefox. Onde tudo se encontra.</p>
        </header>
        <ul className="welcome-tips">
          {tips.map(({ Icon, title, body, keys }, index) => (
            <li key={title} style={{ "--i": index } as React.CSSProperties}>
              <span className="welcome-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <span className="welcome-keys" aria-hidden="true">
                {keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <footer className="welcome-foot">
          <span>Tudo fica salvo só neste navegador.</span>
          <button type="button" className="primary-button" onClick={onClose}>
            Começar
          </button>
        </footer>
      </div>
    </div>
  );
}
