import { Pin } from "lucide-react";
import { siteName, type TopSite } from "@features/frequent/model/top-sites";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";

type Props = {
  sites: TopSite[];
  /** Fixar: abre o editor com nome e endereço já preenchidos. */
  onPin: (site: TopSite) => void;
};

/**
 * Frequentes que ainda não são atalhos, lidos ao vivo do histórico do
 * navegador (topSites). A lista se ajusta sozinha quando o hábito muda.
 */
export function FrequentSites({ sites, onPin }: Props) {
  if (!sites.length) return null;
  return (
    <section className="section" aria-label="Frequentes">
      <div className="section-heading">
        <h2>
          Frequentes <span className="section-note">do seu histórico</span>
        </h2>
      </div>
      <ul className="tile-grid">
        {sites.map((site) => (
          <li key={site.host} className="tile">
            <a
              href={site.url}
              className="tile-link"
              title={`${site.title} — ${site.host}`}
            >
              <span className="site-icon" aria-hidden="true">
                <ShortcutIcon label={site.host} url={site.url} favicon={site.favicon} />
              </span>
              <span className="item-label">{siteName(site)}</span>
            </a>
            <button
              type="button"
              className="item-edit"
              onClick={() => onPin(site)}
              aria-label={`Fixar ${site.host} como atalho`}
              title="Fixar como atalho"
            >
              <Pin size={13} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
