"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  HardDrive,
  Inbox,
  Link2,
  Pencil,
  Presentation,
  Search,
  Sheet,
  Star,
  Users,
} from "lucide-react";
import {
  driveNav,
  driveNew,
  driveSearchUrl,
  type DriveInbox,
} from "@features/drive/model/links";

type Props = {
  inbox: DriveInbox;
  onSaveInbox: (inbox: DriveInbox) => boolean;
};

const navIcons = { my: HardDrive, recent: Clock, shared: Users, starred: Star } as const;
const newIcons = { doc: FileText, sheet: Sheet, slides: Presentation, form: ClipboardList } as const;

/**
 * Google Drive a um clique: a pasta de entrada em destaque (é para onde tudo
 * vai antes de ser organizado), busca direta no Drive, navegação e criação de
 * arquivos em branco. Só links: nada de API, token ou permissão.
 */
export function DrivePanel({ inbox, onSaveInbox }: Props) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(inbox.label);
  const [url, setUrl] = useState(inbox.url);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  function saveInbox(event: FormEvent) {
    event.preventDefault();
    if (onSaveInbox({ label, url })) {
      setEditing(false);
      setError("");
    } else setError("Use o endereço de uma pasta do Drive (drive.google.com/drive/folders/…).");
  }

  function copyLink() {
    void navigator.clipboard
      ?.writeText(inbox.url)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => undefined);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) window.location.assign(driveSearchUrl(query));
  }

  return (
    <section className="section" aria-label="Google Drive">
      <div className="section-heading">
        <h2>Drive</h2>
      </div>
      <div className="drive">
        <div className="drive-inbox">
          {editing ? (
            <form className="drive-edit" onSubmit={saveInbox}>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Nome"
                maxLength={40}
                aria-label="Nome da pasta"
              />
              <input
                autoFocus
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                aria-label="Link da pasta"
              />
              {error && <p className="form-error">{error}</p>}
              <div className="drive-edit-actions">
                <button type="button" className="text-button is-quiet" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
                <button type="submit" className="text-button">
                  Salvar
                </button>
              </div>
            </form>
          ) : (
            <>
              <a href={inbox.url} className="drive-inbox-link">
                <span className="drive-inbox-icon" aria-hidden="true">
                  <Inbox size={26} strokeWidth={1.7} />
                </span>
                <span className="drive-inbox-text">
                  <span className="drive-inbox-title">{inbox.label}</span>
                  <span className="drive-inbox-note">Pasta de entrada · abrir no Drive</span>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <div className="drive-inbox-actions">
                <a href={inbox.url} target="_blank" rel="noopener" className="drive-act">
                  <ExternalLink size={14} aria-hidden="true" />
                  Nova aba
                </a>
                <button type="button" className="drive-act" onClick={copyLink} aria-live="polite">
                  {copied ? (
                    <Check size={14} strokeWidth={2.4} aria-hidden="true" />
                  ) : (
                    <Link2 size={14} aria-hidden="true" />
                  )}
                  {copied ? "Copiado" : "Copiar link"}
                </button>
              </div>
              <button
                type="button"
                className="drive-inbox-edit"
                onClick={() => {
                  setLabel(inbox.label);
                  setUrl(inbox.url);
                  setError("");
                  setEditing(true);
                }}
                aria-label="Trocar a pasta de entrada"
                title="Trocar a pasta de entrada"
              >
                <Pencil size={14} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className="drive-side">
          <form className="drive-search" onSubmit={search} role="search">
            <Search size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar no Drive"
              aria-label="Buscar no Drive"
              autoComplete="off"
            />
          </form>

          <div>
            <p className="drive-caption">Navegar</p>
            <div className="drive-tiles" role="group" aria-label="Navegar">
              {driveNav.map((link) => {
                const Icon = navIcons[link.id];
                return (
                  <a key={link.id} href={link.url} className="drive-tile">
                    <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>
          <details className="drive-more">
            <summary className="drive-caption">Criar novo</summary>
            <div className="drive-tiles" role="group" aria-label="Criar novo">
              {driveNew.map((link) => {
                const Icon = newIcons[link.id];
                return (
                  <a key={link.id} href={link.url} className="drive-tile is-new">
                    <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                    {link.label}
                  </a>
                );
              })}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
