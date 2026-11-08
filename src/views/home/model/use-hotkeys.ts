import { useEffect, useRef } from "react";
import { contexts, contextNames, type ContextId } from "@shared/model/settings";

type Actions = {
  /** Desligado com painel ou ajuda abertos: eles cuidam das próprias teclas. */
  enabled: boolean;
  focusSearch: () => void;
  notify: (message: string) => void;
  changeContext: (context: ContextId) => void;
  openSettings: () => void;
  addShortcut: () => void;
  openHelp: () => void;
  toggleFocus: () => void;
};

const fields = {
  task: "Hoje",
  note: "Notas",
  english: "Inglês",
} as const;

/** Leva o foco a um campo marcado com data-hotkey, rolando até ele. */
function focusField(name: keyof typeof fields, notify: Actions["notify"]) {
  const node = document.querySelector<HTMLElement>(`[data-hotkey="${name}"]`);
  if (!node) {
    notify(`A seção ${fields[name]} está oculta (Configurações → Seções)`);
    return;
  }
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.focus({ preventScroll: true });
}

/** Alt ↓ / Alt ↑: vai à seção seguinte ou anterior e foca o primeiro controle dela. */
function jumpSection(step: 1 | -1, focusSearch: () => void) {
  const sections = [...document.querySelectorAll<HTMLElement>("main .section")];
  if (!sections.length) return;
  let current = -1;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= 140) current = index;
  });
  const next = current + step;
  if (next < 0) {
    focusSearch();
    return;
  }
  const target = sections[Math.min(next, sections.length - 1)];
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target
    .querySelector<HTMLElement>("a[href], button:not([disabled]), input, textarea")
    ?.focus({ preventScroll: true });
}

/**
 * Atalhos de teclado da página inicial (a lista legível está em
 * shared/model/hotkeys.ts). Letra solta nunca é atalho: vai para a busca.
 * Os comandos usam Alt; `?` abre a ajuda; Esc sai de um campo de Hoje/Notas.
 */
export function useHotkeys(actions: Actions) {
  const latest = useRef(actions);
  latest.current = actions;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const a = latest.current;
      if (!a.enabled) return;
      const target = event.target as HTMLElement | null;
      const typing = !!target?.closest("input, textarea, select, [contenteditable]");

      if (event.key === "Escape" && target?.closest("[data-hotkey]")) {
        target.blur();
        return;
      }
      if (event.key === "?" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        a.openHelp();
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const digit = /^Digit([1-9])$/.exec(event.code);
      if (digit && Number(digit[1]) <= contexts.length) {
        event.preventDefault();
        const context = contexts[Number(digit[1]) - 1];
        a.changeContext(context);
        a.notify(`Contexto: ${contextNames[context]}`);
        return;
      }
      const actionByCode: Record<string, () => void> = {
        KeyT: () => focusField("task", a.notify),
        KeyN: () => focusField("note", a.notify),
        KeyI: () => focusField("english", a.notify),
        KeyL: a.addShortcut,
        KeyF: a.toggleFocus,
        Comma: a.openSettings,
        Home: () => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          a.focusSearch();
        },
        ArrowDown: () => jumpSection(1, a.focusSearch),
        ArrowUp: () => jumpSection(-1, a.focusSearch),
      };
      const action = actionByCode[event.code];
      if (action) {
        event.preventDefault();
        action();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
