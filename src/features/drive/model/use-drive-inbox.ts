import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { defaultInbox, parseFolderUrl, type DriveInbox } from "./links";

const key = "nt-drive-inbox";
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Pasta de entrada do Drive: local a este navegador, com a pasta padrão como ponto de partida. */
export function useDriveInbox() {
  const [inbox, setInbox] = useState<DriveInbox>(defaultInbox);
  useBeforePaint(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem(key) ?? "null",
      ) as Partial<DriveInbox> | null;
      const url = raw?.url ? parseFolderUrl(raw.url) : null;
      if (url)
        setInbox({
          url,
          label: raw?.label?.trim().slice(0, 40) || defaultInbox.label,
        });
    } catch {
      // Sem localStorage: fica a padrão.
    }
  }, []);

  const save = useCallback((next: DriveInbox): boolean => {
    const url = parseFolderUrl(next.url);
    if (!url) return false;
    const value = {
      url,
      label: next.label.trim().slice(0, 40) || defaultInbox.label,
    };
    setInbox(value);
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // idem
    }
    return true;
  }, []);

  return { inbox, save };
}
