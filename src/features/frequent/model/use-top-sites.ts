import { useEffect, useLayoutEffect, useState } from "react";
import { fetchTopSites, type TopSite } from "./top-sites";

const cacheKey = "nt-topsites-cache";
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function readCache(): TopSite[] {
  try {
    const raw = localStorage.getItem(cacheKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as TopSite[]) : [];
  } catch {
    return [];
  }
}

/**
 * Sites frequentes do navegador. A última lista fica em cache local e entra
 * antes do primeiro quadro (favicons e Frequentes aparecem na hora, sem
 * empurrar a página); a consulta ao histórico roda depois e atualiza o cache.
 * 24 sites bastam: 8 viram Frequentes, o resto só empresta favicons.
 */
export function useTopSites(): TopSite[] {
  const [sites, setSites] = useState<TopSite[]>([]);
  useBeforePaint(() => {
    const cached = readCache();
    if (cached.length) setSites(cached);
  }, []);
  useEffect(() => {
    let active = true;
    void fetchTopSites(24).then((result) => {
      if (!active || !result.length) return;
      setSites(result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        // Cota cheia ou sem localStorage: só perde a aceleração.
      }
    });
    return () => {
      active = false;
    };
  }, []);
  return sites;
}
