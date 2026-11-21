"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardCopy,
  FileJson,
  FileSpreadsheet,
  LayoutGrid,
  Lightbulb,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import {
  clearLog,
  csv,
  hostStats,
  markdownSummary,
  queryStats,
  readLog,
  sourceName,
  suggestions,
  type Suggestion,
  type VisitSource,
} from "@features/log/model/visit-log";
import type { Settings } from "@shared/model/settings";

type Props = {
  settings: Settings;
  update: (change: (previous: Settings) => Settings) => void;
};

const DAY = 86_400_000;
const periods = [
  { id: "7", label: "7 dias", ms: 7 * DAY },
  { id: "30", label: "30 dias", ms: 30 * DAY },
  { id: "all", label: "Tudo", ms: 0 },
] as const;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

const ideaIcon = { shortcut: Plus, favorite: Star, section: LayoutGrid, search: Search } as const;

/**
 * Registro de acessos feitos pelo Nexo: o que você mais abre, de onde (busca,
 * favorito, atalho…) e o que mais digita. Daí saem sugestões — criar atalho,
 * pensar numa seção — e um resumo em Markdown para analisar com uma IA.
 */
export function LogSection({ settings, update }: Props) {
  const [period, setPeriod] = useState<(typeof periods)[number]["id"]>("30");
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [created, setCreated] = useState<string[]>([]);

  // `version` refaz a leitura depois de limpar.
  const log = useMemo(() => (version >= 0 ? readLog() : []), [version]);
  const since = useMemo(() => {
    const ms = periods.find((item) => item.id === period)?.ms ?? 0;
    return ms ? Date.now() - ms : 0;
  }, [period]);
  const inPeriod = log.filter((visit) => visit.at >= since);
  const hosts = useMemo(() => hostStats(log, since).slice(0, 12), [log, since]);
  const queries = useMemo(() => queryStats(log, since).slice(0, 8), [log, since]);
  const shortcutHosts = useMemo(() => new Set(settings.shortcuts.map((item) => hostOf(item.url))), [settings.shortcuts]);
  const favoriteHosts = useMemo(
    () => new Set(settings.shortcuts.filter((item) => item.favorite).map((item) => hostOf(item.url))),
    [settings.shortcuts],
  );
  const ideas = useMemo(
    () => suggestions(log, shortcutHosts, since, favoriteHosts),
    [log, shortcutHosts, since, favoriteHosts],
  );
  const max = hosts[0]?.count ?? 1;
  const periodLabel = periods.find((item) => item.id === period)?.label ?? "";

  function createShortcut(idea: Suggestion) {
    const url = idea.url;
    if (!url) return;
    update((previous) => ({
      ...previous,
      shortcuts: [
        ...previous.shortcuts,
        {
          id: crypto.randomUUID(),
          label: (idea.label || hostOf(url)).slice(0, 60),
          url,
          context: previous.activeContext,
          keywords: [],
          order: previous.shortcuts.length,
          favorite: false,
        },
      ],
    }));
    setCreated((list) => [...list, idea.title]);
  }

  function favorite(idea: Suggestion) {
    if (!idea.host) return;
    update((previous) => {
      const index = previous.shortcuts.findIndex((item) => hostOf(item.url) === idea.host);
      if (index < 0) return previous;
      const shortcuts = [...previous.shortcuts];
      shortcuts[index] = { ...shortcuts[index], favorite: true };
      return { ...previous, shortcuts };
    });
    setCreated((list) => [...list, idea.title]);
  }

  function copySummary() {
    void navigator.clipboard
      ?.writeText(markdownSummary(log, since, periodLabel))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => undefined);
  }

  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <section className="settings-section">
      <div className="settings-caption-row">
        <h3 className="settings-caption">Registro de acessos</h3>
        <div className="segmented log-period" role="radiogroup" aria-label="Período">
          {periods.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={period === item.id}
              data-active={period === item.id}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-card log-card">
        <p className="log-lede">
          <strong>{inPeriod.length}</strong> {inPeriod.length === 1 ? "acesso" : "acessos"} feitos a partir desta página
          {period !== "all" ? ` nos últimos ${periodLabel}` : ""}. Fica só neste navegador.
        </p>

        {ideas.length > 0 && (
          <div className="log-block">
            <p className="log-title">
              <Lightbulb size={14} aria-hidden="true" /> Sugestões
            </p>
            <ul className="log-ideas">
              {ideas.map((idea) => {
                const Icon = ideaIcon[idea.kind];
                const done = created.includes(idea.title);
                return (
                  <li key={idea.title} className="log-idea" data-kind={idea.kind}>
                    <span className="log-idea-icon" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span className="log-idea-text">
                      <strong>{idea.title}</strong>
                      <span>{idea.detail}</span>
                    </span>
                    {idea.kind === "favorite" && (
                      <button type="button" className="text-button" onClick={() => favorite(idea)} disabled={done}>
                        {done ? <Check size={14} aria-hidden="true" /> : <Star size={14} aria-hidden="true" />}
                        {done ? "Favorito" : "Favoritar"}
                      </button>
                    )}
                    {idea.kind === "shortcut" && (
                      <button type="button" className="text-button" onClick={() => createShortcut(idea)} disabled={done}>
                        {done ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                        {done ? "Criado" : "Criar"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hosts.length > 0 ? (
          <div className="log-block">
            <p className="log-title">Mais acessados</p>
            <ol className="log-hosts">
              {hosts.map((stat) => (
                <li key={stat.host}>
                  <span className="log-host-name">{stat.host}</span>
                  <span className="log-host-bar" aria-hidden="true">
                    <i style={{ width: `${(stat.count / max) * 100}%` }} />
                  </span>
                  <span className="log-host-count">{stat.count}</span>
                  <span className="log-host-src">
                    {Object.entries(stat.bySource)
                      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                      .slice(0, 2)
                      .map(([source, count]) => `${sourceName(source as VisitSource)} ${count}`)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="log-empty">Ainda não há acessos neste período. Use a página normalmente — busca, favoritos, atalhos — e volte aqui.</p>
        )}

        {queries.length > 0 && (
          <div className="log-block">
            <p className="log-title">Mais buscados</p>
            <ul className="log-queries">
              {queries.map((item) => (
                <li key={item.query}>
                  “{item.query}” <span>{item.count}×</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="log-actions">
          <button type="button" className="text-button" onClick={copySummary} disabled={!inPeriod.length}>
            {copied ? <Check size={14} aria-hidden="true" /> : <ClipboardCopy size={14} aria-hidden="true" />}
            {copied ? "Copiado" : "Copiar resumo para IA"}
          </button>
          <button
            type="button"
            className="text-button is-quiet"
            onClick={() => download(`nexo-acessos-${stamp}.csv`, csv(inPeriod), "text/csv")}
            disabled={!inPeriod.length}
          >
            <FileSpreadsheet size={14} aria-hidden="true" /> CSV
          </button>
          <button
            type="button"
            className="text-button is-quiet"
            onClick={() => download(`nexo-acessos-${stamp}.json`, JSON.stringify(inPeriod, null, 2), "application/json")}
            disabled={!inPeriod.length}
          >
            <FileJson size={14} aria-hidden="true" /> JSON
          </button>
          <span className="log-spacer" />
          {confirmClear ? (
            <>
              <span className="log-confirm">Apagar todo o registro?</span>
              <button type="button" className="text-button is-quiet" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="text-button is-danger"
                onClick={() => {
                  clearLog();
                  setConfirmClear(false);
                  setVersion((value) => value + 1);
                }}
              >
                Apagar
              </button>
            </>
          ) : (
            <button type="button" className="text-button is-quiet" onClick={() => setConfirmClear(true)} disabled={!log.length}>
              <Trash2 size={14} aria-hidden="true" /> Limpar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
