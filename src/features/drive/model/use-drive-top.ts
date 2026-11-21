import { useEffect, useState } from "react";
import { fetchDriveTop, type DriveFile } from "./drive-top";

/**
 * Mais acessados do Drive. Lê o histórico só quando o navegador fica ocioso:
 * o painel está longe da primeira tela e não deve disputar o primeiro quadro.
 * `null` enquanto carrega.
 */
export function useDriveTop(limit = 8): DriveFile[] | null {
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  useEffect(() => {
    let alive = true;
    const run = () => void fetchDriveTop(limit).then((list) => alive && setFiles(list));
    const idle = window.requestIdleCallback?.(run, { timeout: 2000 });
    const timer = idle === undefined ? window.setTimeout(run, 400) : undefined;
    return () => {
      alive = false;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [limit]);
  return files;
}
