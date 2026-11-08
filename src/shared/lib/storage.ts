import { defaultSettings } from "@shared/model/defaults";
import { isLegacyCatalog } from "@shared/model/legacy-catalog";
import { parseSettings, type Settings } from "@shared/model/settings";

const key = "personal-command-center-settings";

/**
 * Cópia síncrona das preferências no localStorage da extensão. O
 * chrome.storage.local é assíncrono: sem a cópia, cada nova aba desenhava os
 * padrões e só depois trocava pelos dados salvos. Com ela, o primeiro quadro
 * já sai certo; o chrome.storage continua sendo a fonte de verdade e corrige
 * a cópia logo em seguida, se divergir.
 */
const cacheKey = "nt-settings-cache";

export function readCachedSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(cacheKey);
    return raw
      ? migrateSettings(parseSettings(JSON.parse(raw))).settings
      : null;
  } catch {
    return null;
  }
}

export function writeCachedSettings(settings: Settings): void {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(settings));
  } catch {
    // Sem localStorage (navegação privada estrita): só perde a aceleração.
  }
}

function extensionStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

/**
 * Troca o catálogo de fábrica antigo pelo novo quando a pessoa nunca mexeu
 * nos atalhos. Contexto ativo, itens de foco, relógio e provedor de busca
 * ficam como estão. Com qualquer atalho próprio ou editado, nada muda.
 */
export function migrateSettings(settings: Settings): {
  settings: Settings;
  migrated: boolean;
} {
  if (!isLegacyCatalog(settings.shortcuts))
    return { settings, migrated: false };
  return {
    settings: parseSettings({
      ...settings,
      shortcuts: structuredClone(defaultSettings.shortcuts),
    }),
    migrated: true,
  };
}

export async function loadSettings(): Promise<{
  settings: Settings;
  error?: string;
  /** O catálogo antigo foi substituído; quem carregou deve salvar. */
  migrated?: boolean;
}> {
  try {
    const raw = extensionStorage()
      ? (await chrome.storage.local.get(key))[key]
      : localStorage.getItem(key);
    if (raw == null) return { settings: structuredClone(defaultSettings) };
    return migrateSettings(
      parseSettings(typeof raw === "string" ? JSON.parse(raw) : raw),
    );
  } catch {
    return {
      settings: structuredClone(defaultSettings),
      error:
        "Não foi possível ler as configurações salvas. Os padrões foram exibidos; seus dados não foram sobrescritos.",
    };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const valid = parseSettings(settings);
  writeCachedSettings(valid);
  if (extensionStorage()) await chrome.storage.local.set({ [key]: valid });
  else localStorage.setItem(key, JSON.stringify(valid));
}

export function importSettings(json: string): Settings {
  return parseSettings(JSON.parse(json) as unknown);
}

export function exportSettings(settings: Settings): string {
  return JSON.stringify(parseSettings(settings), null, 2);
}
