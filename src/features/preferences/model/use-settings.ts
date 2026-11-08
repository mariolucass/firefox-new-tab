import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { defaultSettings } from "@shared/model/defaults";
import { parseSettings, type Settings } from "@shared/model/settings";
import {
  loadSettings,
  readCachedSettings,
  saveSettings,
  writeCachedSettings,
} from "@shared/lib/storage";

/** useLayoutEffect no navegador (antes de pintar); no pré-render, useEffect. */
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    structuredClone(defaultSettings),
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(settings);
  const queue = useRef(Promise.resolve());

  // Primeiro quadro: a cópia síncrona (localStorage) entra antes de o
  // navegador pintar, então a página não pisca dos padrões para os seus dados.
  useBeforePaint(() => {
    const cached = readCachedSettings();
    if (!cached) return;
    current.current = cached;
    setSettings(cached);
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    void loadSettings().then(
      ({ settings: loaded, error: loadError, migrated }) => {
        if (!active) return;
        current.current = loaded;
        setSettings(loaded);
        setError(loadError ?? null);
        setReady(true);
        if (!loadError) writeCachedSettings(loaded);
        // Catálogo novo aplicado na leitura: grava uma vez para a troca valer
        // também fora desta aba. Falha aqui não apaga nada; só repete depois.
        if (migrated) void saveSettings(loaded).catch(() => undefined);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((change: (previous: Settings) => Settings) => {
    try {
      const next = parseSettings(change(current.current));
      current.current = next;
      setSettings(next);
      setError(null);
      queue.current = queue.current
        .catch(() => undefined)
        .then(() => saveSettings(next));
      void queue.current.catch(() =>
        setError(
          "Não foi possível salvar. Verifique o armazenamento do navegador.",
        ),
      );
    } catch {
      setError(
        "Os dados informados são inválidos. Nenhuma alteração foi salva.",
      );
    }
  }, []);

  return { settings, ready, error, setError, update };
}
