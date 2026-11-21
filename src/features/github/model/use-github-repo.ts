import { useEffect, useLayoutEffect, useState } from "react";
import { fetchRepo, isFresh, readCached, type RepoInfo } from "./github-repo";

const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Dados do repositório: o cache entra antes do primeiro quadro, a consulta vem depois (só se vencido). */
export function useGithubRepo(repo: string | null): RepoInfo | null {
  const [info, setInfo] = useState<RepoInfo | null>(null);
  useBeforePaint(() => setInfo(repo ? readCached(repo) : null), [repo]);
  useEffect(() => {
    if (!repo) return;
    const cached = readCached(repo);
    if (isFresh(cached)) return;
    let active = true;
    void fetchRepo(repo).then((fresh) => {
      if (active && fresh) setInfo(fresh);
    });
    return () => {
      active = false;
    };
  }, [repo]);
  return info;
}
