"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import {
  createBackup,
  downloadBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from "@shared/lib/backup";

/**
 * Backup e restauração. Tudo fica neste navegador, então um arquivo é a única
 * cópia de segurança. Restaurar substitui os dados atuais e, por isso, pede
 * confirmação e mostra o que há no arquivo antes de aplicar.
 */
export function DataSection() {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function exportData() {
    try {
      downloadBackup(await createBackup());
      setMessage({ text: "Backup baixado." });
    } catch {
      setMessage({ text: "Não foi possível gerar o backup.", error: true });
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
      setMessage(null);
    } catch (error) {
      setPending(null);
      setMessage({
        text:
          error instanceof Error && error.message.startsWith("Este arquivo")
            ? error.message
            : "Arquivo inválido ou corrompido. Nada foi alterado.",
        error: true,
      });
    }
    if (input.current) input.current.value = "";
  }

  async function apply() {
    if (!pending) return;
    try {
      await restoreBackup(pending);
      window.location.reload();
    } catch {
      setMessage({ text: "Não foi possível restaurar. Nada foi alterado.", error: true });
    }
  }

  return (
    <section className="settings-section">
      <h3 className="settings-caption">Dados</h3>
      <p className="settings-help">
        Atalhos, notas, tarefas, vocabulário e preferências ficam só neste
        navegador. Guarde um backup de vez em quando.
      </p>
      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row-text">
            <span className="settings-row-title">Exportar backup</span>
            <span className="settings-row-note">Um arquivo .json com tudo.</span>
          </span>
          <button type="button" className="text-button" onClick={exportData}>
            <Download size={14} aria-hidden="true" /> Exportar
          </button>
        </div>
        <div className="settings-row">
          <span className="settings-row-text">
            <span className="settings-row-title">Restaurar backup</span>
            <span className="settings-row-note">Substitui os dados atuais.</span>
          </span>
          <button type="button" className="text-button" onClick={() => input.current?.click()}>
            <Upload size={14} aria-hidden="true" /> Escolher arquivo
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void pick(event.target.files?.[0])}
          />
        </div>
        {pending && (
          <div className="settings-row backup-confirm" role="alertdialog" aria-label="Confirmar restauração">
            <span className="settings-row-text">
              <span className="settings-row-title">Restaurar este backup?</span>
              <span className="settings-row-note">
                {pending.settings.shortcuts.length} atalhos
                {pending.exportedAt
                  ? ` · de ${new Date(pending.exportedAt).toLocaleDateString("pt-BR")}`
                  : ""}
                . Os dados de agora serão substituídos.
              </span>
            </span>
            <span className="backup-actions">
              <button type="button" className="text-button is-quiet" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button type="button" className="text-button" onClick={() => void apply()}>
                Restaurar
              </button>
            </span>
          </div>
        )}
      </div>
      {message && (
        <p className={message.error ? "form-error" : "settings-help"} role={message.error ? "alert" : "status"}>
          {message.text}
        </p>
      )}
    </section>
  );
}
