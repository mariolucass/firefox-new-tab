import { defaultSettings } from "@shared/model/defaults";
import { parseSettings, type Settings } from "@shared/model/settings";

const key = "personal-command-center-settings";

function extensionStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function loadSettings(): Promise<{
  settings: Settings;
  error?: string;
}> {
  try {
    const raw = extensionStorage()
      ? (await chrome.storage.local.get(key))[key]
      : localStorage.getItem(key);
    if (raw == null) return { settings: structuredClone(defaultSettings) };
    return {
      settings: parseSettings(typeof raw === "string" ? JSON.parse(raw) : raw),
    };
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
  if (extensionStorage()) await chrome.storage.local.set({ [key]: valid });
  else localStorage.setItem(key, JSON.stringify(valid));
}

export function importSettings(json: string): Settings {
  return parseSettings(JSON.parse(json) as unknown);
}

export function exportSettings(settings: Settings): string {
  return JSON.stringify(parseSettings(settings), null, 2);
}
