import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Command, Globe2, Search, X } from "lucide-react";
import { filterItems } from "@features/search/model/filter";
import { openUrl, searchWeb } from "@shared/lib/navigation";
import { useDialogFocus } from "@shared/lib/use-dialog-focus";
import type { Settings } from "@shared/model/settings";
import { Input } from "@shared/ui/input";

type Props = { open: boolean; onClose: () => void; settings: Settings };

export function CommandPalette({ open, onClose, settings }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog, open);
  const results = useMemo(
    () => filterItems(settings.shortcuts, settings.focusItems, query),
    [settings.shortcuts, settings.focusItems, query],
  );
  const count = results.length + (query.trim() ? 1 : 0);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  useEffect(() => setSelected(0), [query]);
  if (!open) return null;

  function execute(index: number) {
    if (index < results.length) openUrl(results[index].url);
    else if (query.trim()) searchWeb(query, settings.searchProvider);
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar comandos"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelected((value) => Math.min(value + 1, count - 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelected((value) => Math.max(value - 1, 0));
          }
          if (event.key === "Enter" && count) {
            event.preventDefault();
            execute(selected);
          }
        }}
      >
        <div className="palette-input-row">
          <Search size={20} aria-hidden="true" />
          <Input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar atalhos, projetos ou pesquisar na web..."
            aria-label="Pesquisa"
          />
          <button
            className="icon-button"
            aria-label="Fechar busca"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="palette-list">
          {query.trim() ? (
            <>
              {results.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  className={`palette-result ${index === selected ? "selected" : ""}`}
                  onMouseEnter={() => setSelected(index)}
                  onClick={() => execute(index)}
                >
                  <span className="result-icon">
                    {item.type === "project" ? (
                      <Command size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span className="result-kind">
                    {item.type === "project" ? "Projeto" : "Atalho"}
                  </span>
                </button>
              ))}
              <button
                className={`palette-result ${selected === results.length ? "selected" : ""}`}
                onMouseEnter={() => setSelected(results.length)}
                onClick={() => execute(results.length)}
              >
                <span className="result-icon">
                  <Globe2 size={18} />
                </span>
                <span>
                  <strong>Pesquisar “{query.trim()}”</strong>
                  <small>
                    {settings.searchProvider === "google"
                      ? "Google"
                      : "DuckDuckGo"}{" "}
                    · somente ao confirmar
                  </small>
                </span>
                <span className="result-kind">Web</span>
              </button>
            </>
          ) : (
            <p className="palette-hint">
              Digite para encontrar atalhos ou projetos. ↑ ↓ para navegar, Enter
              para abrir.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
