import { useEffect, useState } from "react";
import {
  cachedIcon,
  iconsFor,
  rememberIcon,
  searchIcons,
  type IconHit,
} from "@shared/lib/icon-library";
import { IconGlyph, ShortcutIcon } from "@shared/ui/shortcut-icon";

type Props = {
  value: string;
  label: string;
  url: string;
  onChange: (value: string) => void;
};

/** Sugestões antes de digitar: o que mais se usa em atalhos. */
const suggestions = [
  "lu:Inbox", "lu:Folder", "lu:BookOpen", "lu:GraduationCap", "lu:Briefcase", "lu:Code",
  "lu:Terminal", "lu:Mail", "lu:Calendar", "lu:Globe", "lu:Star", "lu:Bookmark",
  "si:github", "si:googledrive", "si:notion", "si:figma", "si:youtube", "si:spotify",
  "si:linkedin", "si:discord", "si:vercel", "si:openai", "si:anthropic", "si:slack",
];

const isLibrary = (value: string) => /^(si|lu):/.test(value);

/**
 * Escolha de ícone entre ~5.800 (marcas + Lucide). Por padrão o ícone sai do
 * próprio site; aqui dá para fixar outro, ou usar até duas letras. A busca só
 * carrega a biblioteca quando o seletor é aberto.
 */
export function IconPicker({ value, label, url, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<IconHit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setBusy(true);
    const timer = window.setTimeout(() => {
      const run = query.trim() ? searchIcons(query) : iconsFor(suggestions);
      void run
        .then((result) => active && setHits(result))
        .catch(() => active && setHits([]))
        .finally(() => active && setBusy(false));
    }, query.trim() ? 140 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const current = isLibrary(value) ? cachedIcon(value) : null;
  const note = current
    ? current.title
    : value
      ? `Letras: ${value.toUpperCase()}`
      : "Automático, pelo site";

  return (
    <>
      <div className="icon-field">
        <span className="icon-field-label">Ícone</span>
        <button
          type="button"
          className="icon-field-button"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className="mini-icon">
            <ShortcutIcon icon={value} label={label || "?"} url={url} />
          </span>
          <span className="icon-field-note">{note}</span>
        </button>
      </div>
      {open && (
        <div className="icon-picker">
          <input
            autoFocus
            className="icon-picker-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar em ~5.800 ícones: github, pasta, livro, notion…"
            aria-label="Buscar ícone"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="icon-grid" role="listbox" aria-label="Ícones" aria-busy={busy}>
            {hits.map((hit) => (
              <button
                key={hit.key}
                type="button"
                role="option"
                aria-selected={hit.key === value}
                className="icon-cell"
                title={hit.entry.title}
                onClick={() => {
                  rememberIcon(hit);
                  onChange(hit.key);
                  setOpen(false);
                }}
              >
                <IconGlyph entry={hit.entry} seed={hit.key} />
              </button>
            ))}
            {!hits.length && (
              <p className="icon-empty">
                {busy ? "Carregando biblioteca…" : "Nenhum ícone com esse nome."}
              </p>
            )}
          </div>
          <div className="icon-picker-foot">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Automático (pelo site)
            </button>
            <label className="icon-letters">
              ou letras
              <input
                maxLength={2}
                value={isLibrary(value) ? "" : value}
                onChange={(event) => onChange(event.target.value)}
                aria-label="Letras do ícone"
              />
            </label>
          </div>
        </div>
      )}
    </>
  );
}
