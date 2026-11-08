import { loadSettings, saveSettings } from "./storage";
import { parseSettings, type Settings } from "@shared/model/settings";

/**
 * Backup completo: as configurações (fonte de verdade em chrome.storage) mais
 * os dados que moram no localStorage. Lista fixa de chaves: caches (sites
 * frequentes, favicons, ícones) e a cópia das configurações ficam de fora, pois
 * se refazem sozinhos. Chaves novas de dados do usuário entram aqui.
 */
export const backupKeys = [
  "nt-notes",
  "nt-today",
  "nt-vocab",
  "nt-english",
  "nt-drive-inbox",
  "nt-focus-stats",
  "nt-hidden-sections",
  "nt-appearance",
  "nt-recent-opened",
  "nt-welcomed",
] as const;

const format = "nexo-backup";

export type Backup = {
  format: typeof format;
  version: 1;
  exportedAt: string;
  settings: Settings;
  data: Record<string, string>;
};

export async function createBackup(): Promise<Backup> {
  const { settings } = await loadSettings();
  const data: Record<string, string> = {};
  for (const key of backupKeys) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    } catch {
      // Sem localStorage: só as configurações entram.
    }
  }
  return { format, version: 1, exportedAt: new Date().toISOString(), settings, data };
}

/** Valida tudo antes de tocar em qualquer coisa: arquivo ruim não estraga dados atuais. */
export function parseBackup(json: string): Backup {
  const raw = JSON.parse(json) as Partial<Backup> | null;
  if (!raw || raw.format !== format || raw.version !== 1)
    throw new Error("Este arquivo não é um backup do Nexo.");
  const settings = parseSettings(raw.settings);
  const data: Record<string, string> = {};
  for (const key of backupKeys) {
    const value = raw.data?.[key];
    if (typeof value === "string" && value.length < 2_000_000) {
      JSON.parse(value); // cada chave guarda JSON; texto quebrado derruba a leitura
      data[key] = value;
    }
  }
  return { format, version: 1, exportedAt: String(raw.exportedAt ?? ""), settings, data };
}

export async function restoreBackup(backup: Backup): Promise<void> {
  for (const key of backupKeys) {
    try {
      if (key in backup.data) localStorage.setItem(key, backup.data[key]);
      else localStorage.removeItem(key);
    } catch {
      // idem
    }
  }
  await saveSettings(backup.settings);
}

export function backupFileName(date = new Date()): string {
  return `nexo-backup-${date.toLocaleDateString("sv-SE")}.json`;
}

/** Baixa o backup como arquivo (link temporário; funciona na página da extensão). */
export function downloadBackup(backup: Backup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
