"use client";

import { useState, type ComponentType, type FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  Clock,
  File,
  FileText,
  Folder,
  FolderInput,
  HardDrive,
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
import type { DriveFile, DriveKind } from "@features/drive/model/drive-top";
import { useDriveTop } from "@features/drive/model/use-drive-top";
import { SectionAction, SectionHead } from "@shared/ui/section-head";

type Props = {
  inbox: DriveInbox;
  onSaveInbox: (inbox: DriveInbox) => boolean;
};

type Icon = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" }>;

const navIcons = { my: HardDrive, recent: Clock, shared: Users, starred: Star } as const;

/** Cor e ícone de cada tipo de arquivo: as cores dos próprios apps do Google. */
const kinds: Record<DriveKind, { icon: Icon; label: string; color: string }> = {
  doc: { icon: FileText, label: "Documento", color: "#4285f4" },
  sheet: { icon: Sheet, label: "Planilha", color: "#0f9d58" },
  slides: { icon: Presentation, label: "Apresentação", color: "#f4b400" },
  form: { icon: ClipboardList, label: "Formulário", color: "#7248b9" },
  folder: { icon: Folder, label: "Pasta", color: "#8ab4f8" },
  file: { icon: File, label: "Arquivo", color: "#9aa0a6" },
};
const newKind = { doc: "doc", sheet: "sheet", slides: "slides", form: "form" } as const;

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
function ago(time: number): string {
  if (!time) return "";
  const days = Math.round((time - Date.now()) / 86_400_000);
  if (days === 0) return "hoje";
  if (days > -7) return relative.format(days, "day");
  return relative.format(Math.round(days / 7), "week");
}

function KindIcon({ kind, size = 18 }: { kind: DriveKind; size?: number }) {
  const { icon: Glyph, color } = kinds[kind];
  return (
    <span className="drive-kind" style={{ "--kind": color } as React.CSSProperties} aria-hidden="true">
      <Glyph size={size} strokeWidth={1.9} />
    </span>
  );
}

function TopList({ files }: { files: DriveFile[] | null }) {
  if (files === null)
    return (
      <ul className="drive-top" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="drive-top-skeleton" />
        ))}
      </ul>
    );
  if (!files.length)
    return (
      <div className="drive-top-empty">
        <Clock size={20} aria-hidden="true" />
        <p>
          Os arquivos que você mais abre no Drive aparecem aqui, lidos do histórico deste navegador — nada sai
          daqui.
        </p>
      </div>
    );
  return (
    <ol className="drive-top">
      {files.map((file, index) => (
        <li key={file.id} style={{ "--i": index } as React.CSSProperties}>
          <a href={file.url} className="drive-top-row" title={file.title}>
            <KindIcon kind={file.kind} />
            <span className="drive-top-text">
              <span className="drive-top-title">{file.title}</span>
              <span className="drive-top-meta">
                {kinds[file.kind].label}
                {file.lastVisit ? ` · ${ago(file.lastVisit)}` : ""}
              </span>
            </span>
            <span className="drive-top-visits" title={`${file.visits} visitas`}>
              {file.visits}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * Google Drive, de verdade útil: busca direta, a pasta de entrada, os arquivos
 * que você mais abre (do histórico, sem login), criar em branco e navegar.
 * Tipos de arquivo por ícone e cor do app, não por texto.
 */
export function DrivePanel({ inbox, onSaveInbox }: Props) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(inbox.label);
  const [url, setUrl] = useState(inbox.url);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const top = useDriveTop(8);

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
      <SectionHead
        icon={HardDrive}
        title="Drive"
        meta={top?.length ? `${top.length} mais acessados · pasta ${inbox.label}` : `Pasta de entrada · ${inbox.label}`}
        actions={
          <SectionAction
            icon={Pencil}
            label="Trocar a pasta de entrada"
            onClick={() => {
              setLabel(inbox.label);
              setUrl(inbox.url);
              setError("");
              setEditing(true);
            }}
          />
        }
      />

      <form className="drive-search" onSubmit={search} role="search">
        <Search size={18} aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar no Drive — nome, conteúdo, dono…"
          aria-label="Buscar no Drive"
          autoComplete="off"
        />
        <kbd aria-hidden="true">↵</kbd>
      </form>

      <div className="drive">
        <div className="drive-main">
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
            <div className="drive-inbox">
              <a href={inbox.url} className="drive-inbox-link">
                <span className="drive-inbox-icon" aria-hidden="true">
                  <FolderInput size={28} strokeWidth={1.6} />
                </span>
                <span className="drive-inbox-text">
                  <span className="drive-inbox-title">{inbox.label}</span>
                  <span className="drive-inbox-note">Pasta de entrada — tudo cai aqui antes de ser organizado</span>
                </span>
                <ArrowUpRight size={20} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="drive-inbox-copy"
                onClick={copyLink}
                aria-label={copied ? "Link copiado" : "Copiar link da pasta"}
                title={copied ? "Copiado" : "Copiar link da pasta"}
              >
                {copied ? <Check size={16} strokeWidth={2.4} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
              </button>
            </div>
          )}

          <div className="drive-block">
            <p className="drive-caption">Criar em branco</p>
            <div className="drive-new" role="group" aria-label="Criar em branco">
              {driveNew.map((link) => (
                <a key={link.id} href={link.url} className="drive-new-tile" title={`Novo ${link.label.toLowerCase()}`}>
                  <KindIcon kind={newKind[link.id]} size={22} />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="drive-block">
            <p className="drive-caption">Ir para</p>
            <nav className="drive-nav" aria-label="Navegar no Drive">
              {driveNav.map((link) => {
                const Glyph = navIcons[link.id];
                return (
                  <a key={link.id} href={link.url} className="drive-chip">
                    <Glyph size={16} strokeWidth={1.9} aria-hidden="true" />
                    {link.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="drive-side">
          <p className="drive-caption">Mais acessados</p>
          <TopList files={top} />
        </div>
      </div>
    </section>
  );
}
