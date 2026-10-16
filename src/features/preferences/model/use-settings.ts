import { useCallback, useEffect, useRef, useState } from "react";
import { defaultSettings } from "@shared/model/defaults";
import { parseSettings, type Settings } from "@shared/model/settings";
import { loadSettings, saveSettings } from "@shared/lib/storage";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    structuredClone(defaultSettings),
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(settings);
  const queue = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void loadSettings().then(({ settings: loaded, error: loadError }) => {
      if (!active) return;
      current.current = loaded;
      setSettings(loaded);
      setError(loadError ?? null);
      setReady(true);
    });
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
