"use client";

import { BrandMark } from "@shared/ui/brand-mark";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { hotkeyGroups, hotkeys } from "@shared/model/hotkeys";

type Props = { onClose: () => void };

/** Cola de atalhos (tecla ?). Esc ou clique fora fecha; o foco volta a quem abriu. */
export function ShortcutsHelp({ onClose }: Props) {
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
        className="help-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Atalhos de teclado"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape" || event.key === "?") {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <header className="help-head">
          <div>
            <h2>
              <BrandMark size={15} /> Atalhos de teclado
            </h2>
            <p>Letra solta vai para a busca. Os comandos usam Alt.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="help-grid">
          {hotkeyGroups.map((group) => (
            <section key={group} className="help-group">
              <h3>{group}</h3>
              <ul>
                {hotkeys
                  .filter((hotkey) => hotkey.group === group)
                  .map((hotkey) => (
                    <li key={hotkey.id}>
                      <span>{hotkey.label}</span>
                      <span className="help-keys">
                        {hotkey.keys.map((key, index) =>
                          key === "–" ? (
                            <span key={index}>–</span>
                          ) : (
                            <kbd key={index}>{key}</kbd>
                          ),
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
          <section className="help-group">
            <h3>Na busca</h3>
            <ul>
              <li><span>Tarefa em Hoje</span><span className="help-keys"><kbd>+</kbd><em>texto</em></span></li>
              <li><span>Nota rápida</span><span className="help-keys"><kbd>nota</kbd><em>texto</em></span></li>
              <li><span>Foco</span><span className="help-keys"><kbd>foco</kbd><em>45</em></span></li>
              <li><span>Trocar de contexto</span><span className="help-keys"><kbd>@</kbd><em>dev</em></span></li>
              <li><span>Traduzir, ouvir e salvar</span><span className="help-keys"><kbd>en</kbd><em>bom dia</em></span></li>
              <li><span>Só ouvir em inglês</span><span className="help-keys"><kbd>say</kbd><em>hello</em></span></li>
              <li><span>Abrir configurações</span><span className="help-keys"><kbd>config</kbd></span></li>
              <li><span>Novo atalho</span><span className="help-keys"><kbd>atalho</kbd></span></li>
              <li><span>Parar o foco</span><span className="help-keys"><kbd>parar</kbd></span></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
