import { useCallback, useEffect, useState } from "react";
import { typedUrl } from "./filter";

const usedKey = "nt-clip-used";

/** Só dentro da extensão (com a permissão clipboardRead). Em página comum o
 *  navegador pediria confirmação para colar — aí fica desligado. */
const inExtension = () =>
  typeof location !== "undefined" && /^(moz|chrome)-extension:$/.test(location.protocol);

/**
 * O link que está na área de transferência ao abrir a aba ("Ctrl+T, Enter"
 * abre o que você acabou de copiar). Ignora o que não é endereço e o link que
 * já foi aberto por aqui, para não oferecer o mesmo em toda aba nova.
 */
export function useClipboardLink() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!inExtension() || !navigator.clipboard?.readText) return;
    let alive = true;
    // Depois do primeiro quadro: o foco da busca vem antes de tudo.
    const id = window.setTimeout(() => {
      navigator.clipboard
        .readText()
        .then((text) => {
          const link = text && text.length < 2048 ? typedUrl(text.trim()) : null;
          let used: string | null = null;
          try {
            used = localStorage.getItem(usedKey);
          } catch {
            // Sem localStorage: oferece sempre.
          }
          if (alive && link && link !== used) setUrl(link);
        })
        .catch(() => undefined);
    }, 60);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, []);

  /** Marca o link como usado (ao abrir ou ao dispensar). */
  const consume = useCallback(() => {
    setUrl((current) => {
      if (current) {
        try {
          localStorage.setItem(usedKey, current);
        } catch {
          // Ignora.
        }
      }
      return null;
    });
  }, []);

  return { url, consume };
}
