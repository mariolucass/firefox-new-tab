"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Command, Search } from "lucide-react";
import { useSettings } from "@features/preferences/model/use-settings";
import { AppHeader } from "@widgets/app-header/ui/app-header";
import { CommandPalette } from "@widgets/command-palette/ui/command-palette";
import { FocusArea } from "@widgets/focus-area/ui/focus-area";
import {
  SettingsPanel,
  type EditorTarget,
} from "@widgets/settings-panel/ui/settings-panel";
import { ShortcutGrid } from "@widgets/shortcut-grid/ui/shortcut-grid";
import { contextNames, contexts } from "@shared/model/settings";
import { Button } from "@shared/ui/button";

export function HomePage() {
  const { settings, ready, error, setError, update } = useSettings();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!editor) setPaletteOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
        setEditor(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  const favorites = useMemo(
    () =>
      settings.shortcuts
        .filter((item) => item.favorite)
        .sort((a, b) => a.order - b.order),
    [settings.shortcuts],
  );
  const contextual = useMemo(
    () =>
      settings.shortcuts
        .filter(
          (item) => item.context === settings.activeContext && !item.favorite,
        )
        .sort((a, b) => a.order - b.order),
    [settings.shortcuts, settings.activeContext],
  );
  const focusItems = useMemo(
    () =>
      settings.focusItems
        .filter((item) => item.context === settings.activeContext)
        .sort((a, b) => a.order - b.order),
    [settings.focusItems, settings.activeContext],
  );
  const date =
    now &&
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(now);
  const time =
    now &&
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(now);

  return (
    <div className="app-shell">
      <AppHeader
        activeContext={settings.activeContext}
        onContextChange={(context) =>
          update((previous) => ({ ...previous, activeContext: context }))
        }
        onSearch={() => setPaletteOpen(true)}
        onSettings={() => setEditor({ kind: "settings" })}
      />
      <main className="main-content">
        <section className="hero" aria-label="Início">
          <div className="hero-meta">
            <span className="status-dot" /> SEU ESPAÇO DE TRABALHO{" "}
            <span className="hero-line" />
          </div>
          <div className="hero-content">
            <div>
              <p className="hero-date">{date}</p>
              <h1>
                O que vamos <em>construir</em> hoje?
              </h1>
              <p className="hero-subtitle">
                Tudo o que importa, a um comando de distância.
              </p>
            </div>
            {settings.showClock && now && (
              <time className="clock" dateTime={now.toISOString()}>
                {time}
                <span>LOCAL TIME</span>
              </time>
            )}
          </div>
          <Button
            variant="ghost"
            className="search-trigger"
            onClick={() => setPaletteOpen(true)}
          >
            <Search size={21} aria-hidden="true" />
            <span>Busque um atalho, projeto ou pesquise na web...</span>
            <kbd>
              <Command size={13} /> K
            </kbd>
          </Button>
          <div className="hero-bottom">
            <span>ACESSO RÁPIDO</span>
            <span>⌘ K PARA COMEÇAR</span>
          </div>
        </section>
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError(null)} aria-label="Dispensar aviso">
              ×
            </button>
          </div>
        )}
        <ShortcutGrid
          title="Seus favoritos"
          eyebrow="SEMPRE À MÃO"
          items={favorites}
          onAdd={() => setEditor({ kind: "shortcut" })}
          onEdit={(item) => setEditor({ kind: "shortcut", item })}
        />
        <section className="context-section" aria-label="Contextos">
          <div className="context-header">
            <div>
              <span className="eyebrow">MUDE O FOCO</span>
              <h2>Seu contexto</h2>
            </div>
            <p>Um espaço para cada parte do seu dia.</p>
          </div>
          <div
            className="context-tabs"
            role="group"
            aria-label="Escolher contexto"
          >
            {contexts.map((context) => (
              <Button
                variant="secondary"
                key={context}
                aria-pressed={settings.activeContext === context}
                className={settings.activeContext === context ? "active" : ""}
                onClick={() =>
                  update((previous) => ({
                    ...previous,
                    activeContext: context,
                  }))
                }
              >
                <span className="tab-dot" />
                {contextNames[context]}
              </Button>
            ))}
          </div>
        </section>
        <div className="context-content">
          <ShortcutGrid
            title={`Explorar ${contextNames[settings.activeContext]}`}
            eyebrow="FERRAMENTAS DO CONTEXTO"
            items={contextual}
            onAdd={() => setEditor({ kind: "shortcut" })}
            onEdit={(item) => setEditor({ kind: "shortcut", item })}
          />
          <FocusArea
            items={focusItems}
            onAdd={() => setEditor({ kind: "focus" })}
            onEdit={(item) => setEditor({ kind: "focus", item })}
          />
        </div>
      </main>
      <footer className="footer">
        <span>
          <span className="footer-dot" />{" "}
          {ready
            ? "Preferências neste navegador"
            : "Carregando dados locais..."}
        </span>
        <span>
          PERSONAL OS <span className="footer-separator">/</span> V 0.1.0{" "}
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </footer>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        settings={settings}
      />
      {editor && (
        <SettingsPanel
          key={
            editor.kind === "settings"
              ? "settings"
              : `${editor.kind}-${editor.item?.id ?? "new"}`
          }
          target={editor}
          settings={settings}
          update={update}
          onClose={() => setEditor(null)}
          onError={setError}
        />
      )}
    </div>
  );
}
