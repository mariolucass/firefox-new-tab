"use client";

import { Archive, CircleDot, Clock, GitFork, Globe, Star } from "lucide-react";
import { languageColor, parseRepo, timeAgo } from "@features/github/model/github-repo";
import { useGithubRepo } from "@features/github/model/use-github-repo";
import type { FocusItem } from "@shared/model/settings";

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact" });

const GithubMark = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

/**
 * Miolo do cartão de foco: descrição (a escrita à mão ou a do GitHub), uma
 * linha de números do repositório e os links (GitHub, deploy). Sem
 * repositório, um convite para conectar um.
 */
export function FocusInfo({
  item,
  isFront,
  onEdit,
}: {
  item: FocusItem;
  isFront: boolean;
  onEdit: (item: FocusItem) => void;
}) {
  // Sem repositório cadastrado, um link do GitHub no destino já serve.
  const repo = parseRepo(item.repo) ?? parseRepo(item.url);
  const info = useGithubRepo(repo);
  const description = item.description || info?.description;
  const deploy = item.deploy || info?.homepage || null;
  const tab = isFront ? 0 : -1;
  return (
    <>
      <div className="stack-body">
        <h3>{item.title}</h3>
        {description && <p>{description}</p>}
        {info && (
          <ul className="stack-meta" aria-label="Repositório">
            {info.language && (
              <li>
                <span className="stack-lang" style={{ background: languageColor(info.language) }} aria-hidden="true" />
                {info.language}
              </li>
            )}
            <li title="Estrelas">
              <Star size={12} aria-hidden="true" />
              {compact.format(info.stars)}
            </li>
            {info.forks > 0 && (
              <li title="Forks">
                <GitFork size={12} aria-hidden="true" />
                {compact.format(info.forks)}
              </li>
            )}
            {info.issues > 0 && (
              <li title="Issues e PRs abertos">
                <CircleDot size={12} aria-hidden="true" />
                {info.issues}
              </li>
            )}
            {info.pushedAt && (
              <li title="Último push">
                <Clock size={12} aria-hidden="true" />
                {timeAgo(info.pushedAt)}
              </li>
            )}
            {info.archived && (
              <li data-kind="archived">
                <Archive size={12} aria-hidden="true" />
                arquivado
              </li>
            )}
          </ul>
        )}
      </div>
      <div className="stack-links">
        {repo ? (
          <a
            href={info?.url ?? `https://github.com/${repo}`}
            className="stack-link"
            tabIndex={tab}
            title={`Abrir ${repo} no GitHub`}
          >
            <GithubMark />
            {repo.split("/")[1]}
          </a>
        ) : (
          <button type="button" className="stack-link is-ghost" tabIndex={tab} onClick={() => onEdit(item)}>
            <GithubMark />
            Conectar GitHub
          </button>
        )}
        {deploy && (
          <a href={deploy} className="stack-link" tabIndex={tab} title={`Abrir o deploy: ${deploy}`}>
            <Globe size={14} aria-hidden="true" />
            {new URL(deploy).host.replace(/^www\./, "")}
          </a>
        )}
      </div>
    </>
  );
}
