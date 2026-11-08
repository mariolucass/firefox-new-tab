"use client";

import { BrandMark } from "@shared/ui/brand-mark";
import { useState, type FormEvent } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import type { useNotes } from "@features/notes/model/use-notes";

type Props = { notes: ReturnType<typeof useNotes> };

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function ago(at: number): string {
  const minutes = Math.round((at - Date.now()) / 60_000);
  if (Math.abs(minutes) < 1) return "agora";
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  return relative.format(Math.round(hours / 24), "day");
}

const visible = 6;

/**
 * Notas rápidas: o que não é tarefa (uma ideia, um trecho, um link). Entram
 * pela busca ("nota texto") ou pelo campo aqui; copiar devolve o texto.
 */
export function NotesList({ notes: store }: Props) {
  const { notes, add, remove } = store;
  const [text, setText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? notes : notes.slice(0, visible);

  function submit(event: FormEvent) {
    event.preventDefault();
    add(text);
    setText("");
  }
  function copy(id: string, value: string) {
    void navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(id);
        window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1400);
      })
      .catch(() => undefined);
  }

  return (
    <section className="section notes-section" aria-label="Notas">
      <div className="section-heading">
        <h2>
          Notas
          {notes.length > 0 && <span className="section-count">{notes.length}</span>}
          <span className="section-hint" aria-hidden="true">
            <kbd>Alt</kbd>
            <kbd>N</kbd>
          </span>
        </h2>
        {notes.length > visible && (
          <button type="button" className="text-button is-quiet" onClick={() => setAll((value) => !value)}>
            {all ? "Mostrar menos" : `Ver todas (${notes.length})`}
          </button>
        )}
      </div>
      <div className="notes-body">
        <form className="note-composer" onSubmit={submit}>
          <div className="note-composer-head">
            <span>Nova nota</span>
            <span>{text.length > 0 ? `${text.length}/500` : ""}</span>
          </div>
          <textarea
            data-hotkey="note"
            aria-keyshortcuts="Alt+N"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(event);
              }
            }}
            placeholder="Escreva aqui…"
            maxLength={500}
            aria-label="Nova nota"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="note-composer-bar">
            <span className="note-hint">
              <kbd>Enter</kbd> salva · <kbd>Shift</kbd> <kbd>Enter</kbd> nova linha
            </span>
            <button type="submit" className="note-save" disabled={!text.trim()}>
              <Plus size={14} aria-hidden="true" /> Salvar
            </button>
          </div>
        </form>
        {shown.length > 0 ? (
          <ul className="note-grid">
            {shown.map((note, index) => {
              const [title, ...rest] = note.text.split("\n").filter((line) => line.trim());
              return (
                <li
                  key={note.id}
                  className="note-card"
                  style={{ "--i": Math.min(index, 8) } as React.CSSProperties}
                >
                  <div className="note-main">
                    <span className="note-title">{title}</span>
                    <span className="note-sub">
                      <time className="note-time" dateTime={new Date(note.at).toISOString()}>
                        {ago(note.at)}
                      </time>
                      {rest.length > 0 && <span className="note-preview">{rest.join(" ")}</span>}
                    </span>
                  </div>
                  <span className="note-actions">
                    <button
                      type="button"
                      className="note-action"
                      onClick={() => copy(note.id, note.text)}
                      aria-label="Copiar nota"
                      title="Copiar"
                    >
                      {copied === note.id ? (
                        <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                      ) : (
                        <Copy size={15} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="note-action"
                      onClick={() => remove(note.id)}
                      aria-label="Remover nota"
                      title="Remover"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="note-empty">
            <BrandMark size={22} />
            <strong>Nenhuma nota</strong>
            <span>O que você escrever à esquerda aparece aqui.</span>
          </div>
        )}
      </div>
    </section>
  );
}
