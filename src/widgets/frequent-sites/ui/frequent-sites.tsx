import type { CSSProperties } from "react";
import { History, Pin } from "lucide-react";
import { SectionHead } from "@shared/ui/section-head";
import { siteName, type TopSite } from "@features/frequent/model/top-sites";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";

type Props = {
  sites: TopSite[];
  /** Fixar: abre o editor com nome e endereço já preenchidos. */
  onPin: (site: TopSite) => void;
};

const countFormat = new Intl.NumberFormat("pt-BR", { notation: "compact" });

/**
 * Frequentes que ainda não são atalhos, lidos ao vivo do histórico do
 * navegador (visitas por domínio nos últimos 60 dias). Cada cartão mostra
 * nome, domínio e uma barra de uso relativa ao mais visitado; fixar fica a
 * um clique, no canto.
 */
export function FrequentSites({ sites, onPin }: Props) {
  if (!sites.length) return null;
  const max = Math.max(1, ...sites.map((site) => site.visits ?? 0));
  const ranked = sites.some((site) => site.visits);
  return (
    <section className="section frequent" aria-label="Frequentes">
      <SectionHead
        icon={History}
        title="Frequentes"
        meta={`${sites.length} sites mais visitados${ranked ? " · últimos 60 dias" : " · do seu histórico"}`}
      />
      <ul className="freq-grid">
        {sites.map((site, index) => (
          <li
            key={site.host}
            className="freq-card"
            style={{ "--i": Math.min(index, 14), "--v": (site.visits ?? 0) / max } as CSSProperties}
          >
            <a href={site.url} className="freq-link" title={`${site.title} — ${site.host}`}>
              <span className="freq-icon" aria-hidden="true">
                <ShortcutIcon label={site.host} url={site.url} favicon={site.favicon} />
              </span>
              <span className="freq-text">
                <span className="freq-name">{siteName(site)}</span>
                <span className="freq-host">{site.host.replace(/^www\./, "")}</span>
              </span>
              {site.visits ? (
                <span className="freq-visits" title={`${site.visits} visitas`}>
                  {countFormat.format(site.visits)}
                </span>
              ) : null}
              {ranked && <span className="freq-bar" aria-hidden="true" />}
            </a>
            <button
              type="button"
              className="freq-pin"
              onClick={() => onPin(site)}
              aria-label={`Fixar ${site.host} como atalho`}
              title="Fixar como atalho"
            >
              <Pin size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
