"use client";

import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  faviconsByHost,
  frequentNotSaved,
  siteName,
} from "@features/frequent/model/top-sites";
import { useTopSites } from "@features/frequent/model/use-top-sites";
import type { Command } from "@features/search/model/commands";
import {
  formatRemaining,
  useFocusTimer,
} from "@features/timer/model/use-focus-timer";
import { useNotes } from "@features/notes/model/use-notes";
import { useVocab } from "@features/english/model/use-vocab";
import { useEnglish } from "@features/english/model/use-english";
import { wordOfTheDay } from "@features/english/model/content";
import { guessDirection, translate } from "@features/english/model/translate";
import { speak } from "@features/english/model/speak";
import { EnglishPanel } from "@widgets/english-panel/ui/english-panel";
import { useToday } from "@features/today/model/use-today";
import { driveShortcuts } from "@features/drive/model/links";
import { useDriveInbox } from "@features/drive/model/use-drive-inbox";
import { useAppearance } from "@features/preferences/model/use-appearance";
import { isDueToday } from "@features/today/model/use-today";
import { useHiddenSections } from "@features/preferences/model/use-hidden-sections";
import { useSettings } from "@features/preferences/model/use-settings";
import { favoriteShortcuts } from "@features/search/model/filter";
import { AppHeader } from "@widgets/app-header/ui/app-header";
import { Welcome } from "@widgets/welcome/ui/welcome";
import { BrandMark } from "@shared/ui/brand-mark";
import {
  MotionProvider,
  Reveal,
  ScrollDrift,
  ScrollProgress,
} from "@shared/ui/motion";
import { Backdrop } from "@widgets/backdrop/ui/backdrop";
import { DrivePanel } from "@widgets/drive-panel/ui/drive-panel";
import { FocusArea } from "@widgets/focus-area/ui/focus-area";
import { Greeting } from "@widgets/greeting/ui/greeting";
import { TodayList } from "@widgets/today-list/ui/today-list";
import { FrequentSites } from "@widgets/frequent-sites/ui/frequent-sites";
import {
  SearchBar,
  type SearchBarHandle,
} from "@widgets/search-bar/ui/search-bar";
import type { EditorTarget } from "@widgets/settings-panel/ui/settings-panel";
import { NotesList } from "@widgets/notes-list/ui/notes-list";
import { ShortcutsHelp } from "@widgets/shortcuts-help/ui/shortcuts-help";
import { ScrollRail } from "@widgets/scroll-rail/ui/scroll-rail";
import { ShortcutGrid } from "@widgets/shortcut-grid/ui/shortcut-grid";
import { useHotkeys } from "@views/home/model/use-hotkeys";
import { reorderByIds } from "@shared/lib/reorder";
import { openAfterPress, openMany } from "@shared/lib/navigation";
import { contextNames, contexts, type ContextId } from "@shared/model/settings";

// O painel de configurações (o maior componente) só é carregado quando
// aberto: cada nova aba deixa de interpretá-lo à toa.
const SettingsPanel = lazy(() =>
  import("@widgets/settings-panel/ui/settings-panel").then((module) => ({
    default: module.SettingsPanel,
  })),
);

const favoritesHint = ["1–9"];
const contextHint = ["Alt", "L"];

const StaticBackdrop = memo(Backdrop);
const StaticScrollRail = memo(ScrollRail);
const StaticGreeting = memo(Greeting);
const StaticSearchBar = memo(SearchBar);
const StaticShortcutGrid = memo(ShortcutGrid);
const StaticDrivePanel = memo(DrivePanel);
const StaticTodayList = memo(TodayList);
const StaticNotesList = memo(NotesList);
const StaticFrequentSites = memo(FrequentSites);

export function HomePage() {
  const { settings, ready, error, setError, update } = useSettings();
  const topSites = useTopSites();
  const sections = useHiddenSections();
  const { appearance, change: changeAppearance } = useAppearance();
  // Primeira abertura: boas-vindas uma única vez (nt-welcomed fica no backup).
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem("nt-welcomed")) setWelcome(true);
    } catch {
      // Sem localStorage: não incomoda.
    }
  }, []);
  const closeWelcome = useCallback(() => {
    setWelcome(false);
    try {
      localStorage.setItem("nt-welcomed", "true");
    } catch {
      // idem
    }
  }, []);
  const { show } = sections;
  const drive = useDriveInbox();
  const today = useToday();
  const notes = useNotes();
  const vocab = useVocab();
  const english = useEnglish();
  const timer = useFocusTimer();
  const [toast, setToast] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [pressedKey, setPressedKey] = useState<number | null>(null);
  const [help, setHelp] = useState(false);
  const search = useRef<SearchBarHandle>(null);

  const favorites = useMemo(
    () => favoriteShortcuts(settings.shortcuts),
    [settings.shortcuts],
  );
  const favicons = useMemo(() => faviconsByHost(topSites), [topSites]);
  const frequent = useMemo(
    () => frequentNotSaved(topSites, settings.shortcuts),
    [topSites, settings.shortcuts],
  );
  // A primeira aba é a "casa". Qualquer outra significa que a casa não serviu:
  // o contexto escolhido sobe para o topo e o resto desce.
  const isHome = settings.activeContext === contexts[0];
  const contextual = useMemo(
    () =>
      settings.shortcuts
        .filter(
          (item) =>
            item.context === settings.activeContext &&
            (!item.favorite || !isHome),
        )
        .sort((a, b) => a.order - b.order),
    [settings.shortcuts, settings.activeContext, isHome],
  );
  const focusItems = useMemo(
    () =>
      settings.focusItems
        .filter((item) => item.context === settings.activeContext)
        .sort((a, b) => a.order - b.order),
    [settings.focusItems, settings.activeContext],
  );
  const contextName = contextNames[settings.activeContext];

  /** Tecla 1–9: o bloco afunda antes de navegar, para o gesto ser visível. */
  const openFavorite = useCallback(
    (index: number) => {
      const favorite = ready ? favorites[index] : null;
      if (!favorite) return false;
      setPressedKey(index);
      openAfterPress(favorite.url, () => setPressedKey(null));
      return true;
    },
    [favorites, ready],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (editor || help) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search.current?.focus();
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        // Alt A: perguntar a uma IA. Alt M: ditado por voz.
        if (event.code === "KeyA") {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          search.current?.focusWith("ia ");
        } else if (event.code === "KeyM") {
          event.preventDefault();
          search.current?.toggleVoice();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "?") {
        // Tratado em useHotkeys (abre a ajuda); aqui só não vira texto na busca.
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        search.current?.focus();
      } else if (/^[1-9]$/.test(event.key)) {
        if (openFavorite(Number(event.key) - 1)) event.preventDefault();
      } else if (event.key.length === 1 && event.key !== " ") {
        // Foco fora da busca (depois de um clique): a letra vai para a busca.
        // Sem preventDefault, o próprio navegador a insere no campo focado.
        search.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor, help, openFavorite]);

  // Pré-carrega o painel quando o navegador fica ocioso: fora do caminho da
  // abertura da aba, mas pronto antes do primeiro clique em Configurações.
  useEffect(() => {
    const load = () =>
      void import("@widgets/settings-panel/ui/settings-panel").catch(
        () => undefined,
      );
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(load, 2000);
    return () => globalThis.clearTimeout(id);
  }, []);

  // Links do Drive entram só na busca (atalhos sintéticos, não salvos).
  const driveOn = show("drive");
  const searchSettings = useMemo(
    () =>
      driveOn
        ? {
            ...settings,
            shortcuts: [...settings.shortcuts, ...driveShortcuts(drive.inbox)],
          }
        : settings,
    [settings, drive.inbox, driveOn],
  );
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((current) => (current === message ? null : current)),
      2400,
    );
  }, []);
  const changeContext = useCallback(
    (context: ContextId) =>
      update((previous) => ({ ...previous, activeContext: context })),
    [update],
  );
  const runCommand = useCallback(
    (command: Command) => {
      if (command.type === "task") {
        today.add(command.text);
        notify("Adicionado a Hoje");
      } else if (command.type === "note") {
        notes.add(command.text);
        notify("Nota salva");
      } else if (command.type === "context") {
        changeContext(command.context);
        notify(`Contexto: ${contextNames[command.context]}`);
      } else if (command.type === "settings") {
        setEditor({ kind: "settings" });
      } else if (command.type === "shortcut") {
        setEditor({ kind: "shortcut" });
      } else if (command.type === "help") {
        setHelp(true);
      } else if (command.type === "say") {
        if (!speak(command.text)) notify("Sem voz em inglês neste sistema");
      } else if (command.type === "translate") {
        const direction = guessDirection(command.text);
        notify("Traduzindo…");
        translate(command.text, direction)
          .then((result) => {
            const en = direction === "pt|en" ? result : command.text;
            const pt = direction === "pt|en" ? command.text : result;
            vocab.add(en, pt);
            english.mark("vocab");
            speak(en);
            notify(`${en} · ${pt} (salvo)`);
          })
          .catch((error: unknown) =>
            notify(
              error instanceof Error ? error.message : "Falha na tradução",
            ),
          );
      } else if (command.type === "stop-focus") {
        timer.stop();
        notify("Foco encerrado");
      } else {
        const item = focusItems[0];
        timer.start(
          { id: item?.id ?? null, title: item?.title ?? "Foco" },
          command.minutes,
        );
        notify(`Foco de ${command.minutes} min iniciado`);
      }
    },
    [
      today.add,
      notes.add,
      changeContext,
      focusItems,
      timer.start,
      timer.stop,
      vocab.add,
      english.mark,
      notify,
    ],
  );
  const focusSearch = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    search.current?.focus();
  }, []);
  const dailyWord = useMemo(
    () => (show("english") ? wordOfTheDay(english.filter) : null),
    [show, english.filter],
  );
  const taskCount = useMemo(
    () => ({
      done: today.tasks.filter((task) => isDueToday(task) && task.done).length,
      total: today.tasks.filter((task) => isDueToday(task)).length,
    }),
    [today.tasks],
  );
  const resume = useMemo(() => {
    const item = focusItems.find((entry) => entry.url);
    return item?.url ? { title: item.title, url: item.url } : null;
  }, [focusItems]);

  const reorderShortcuts = useCallback(
    (ids: string[]) =>
      update((previous) => ({
        ...previous,
        shortcuts: reorderByIds(previous.shortcuts, ids),
      })),
    [update],
  );
  const addShortcut = useCallback(() => setEditor({ kind: "shortcut" }), []);
  const editShortcut = useCallback(
    (item: (typeof settings.shortcuts)[number]) =>
      setEditor({ kind: "shortcut", item }),
    [],
  );
  const addFocus = useCallback(() => setEditor({ kind: "focus" }), []);
  const editFocus = useCallback(
    (item: (typeof settings.focusItems)[number]) =>
      setEditor({ kind: "focus", item }),
    [],
  );
  const openAll = useCallback(
    () => openMany(contextual.slice(0, 12).map((item) => item.url)),
    [contextual],
  );
  const pinSite = useCallback(
    (site: (typeof topSites)[number]) =>
      setEditor({
        kind: "shortcut",
        draft: { label: siteName(site), url: site.url },
      }),
    [],
  );
  const openSettings = useCallback(() => setEditor({ kind: "settings" }), []);
  const openHelp = useCallback(() => setHelp(true), []);

  useHotkeys({
    enabled: !editor && !help,
    focusSearch,
    notify,
    changeContext,
    openSettings,
    addShortcut,
    openHelp,
    toggleFocus: () =>
      runCommand(
        timer.session?.state === "running"
          ? { type: "stop-focus" }
          : { type: "focus", minutes: 25 },
      ),
  });

  const favoritesBlock = show("favorites") && (
    <StaticShortcutGrid
      key="favorites"
      title={isHome ? "Favoritos" : "Favoritos de sempre"}
      hint={favoritesHint}
      items={favorites}
      numbered
      pressedIndex={pressedKey}
      favicons={favicons}
      emptyText="Nenhum favorito ainda. Marque um atalho como favorito para abri-lo com as teclas 1–9."
      onAdd={addShortcut}
      onEdit={editShortcut}
      onReorder={reorderShortcuts}
    />
  );
  const driveBlock = show("drive") && (
    <StaticDrivePanel
      key="drive"
      inbox={drive.inbox}
      onSaveInbox={drive.save}
    />
  );
  const hasColumn = show("focus") || show("today");
  const columnBlock = hasColumn && (
    <div className="context-column" key="column">
      {show("focus") && (
        <FocusArea
          items={focusItems}
          contextName={contextName}
          onAdd={addFocus}
          onEdit={editFocus}
          timer={timer}
        />
      )}
      {show("today") && <StaticTodayList today={today} />}
    </div>
  );
  const englishBlock = show("english") && (
    <EnglishPanel key="english" vocab={vocab} english={english} />
  );
  const notesBlock = show("notes") && (
    <StaticNotesList key="notes" notes={notes} />
  );
  const shortcutsBlock = show("shortcuts") && (
    <StaticShortcutGrid
      key="shortcuts"
      title={contextName}
      hint={contextHint}
      items={contextual}
      variant={isHome ? "list" : "tiles"}
      favicons={favicons}
      emptyText={`Nenhum atalho em ${contextName}. Use Adicionar para criar o primeiro.`}
      onOpenAll={openAll}
      onAdd={addShortcut}
      onEdit={editShortcut}
      onReorder={reorderShortcuts}
    />
  );
  // Casa: favoritos, o dia (foco e hoje) ao lado da lista do contexto, notas
  // em largura total e por último o Drive. Outro contexto: o contexto primeiro,
  // depois o que o acompanha, e só então o que vale para qualquer contexto.
  const blocks = isHome ? (
    <>
      {favoritesBlock && <Reveal key="favorites">{favoritesBlock}</Reveal>}
      <Reveal
        className="context-content"
        data-solo={!hasColumn || !show("shortcuts")}
      >
        {columnBlock}
        {shortcutsBlock}
      </Reveal>
      {notesBlock && <Reveal key="notes">{notesBlock}</Reveal>}
      {englishBlock && <Reveal key="english">{englishBlock}</Reveal>}
      {driveBlock && <Reveal key="drive">{driveBlock}</Reveal>}
    </>
  ) : (
    <>
      {shortcutsBlock}
      {columnBlock && (
        <div className="context-content" data-solo="true">
          {columnBlock}
        </div>
      )}
      {notesBlock}
      {englishBlock}
      {favoritesBlock}
      {driveBlock}
    </>
  );

  return (
    <MotionProvider>
      <div className="app-shell">
        <StaticBackdrop />
        <ScrollProgress />
        <AppHeader
          activeContext={settings.activeContext}
          showClock={settings.showClock}
          onContextChange={changeContext}
          onSettings={openSettings}
          onHelp={openHelp}
          onSearch={focusSearch}
          focus={
            timer.session
              ? {
                  label:
                    timer.session.state === "done"
                      ? "Concluído"
                      : formatRemaining(timer.remaining),
                  done: timer.session.state === "done",
                }
              : null
          }
        />
        <StaticScrollRail />
        <main className="main-content">
          <Reveal>
            <ScrollDrift>
              <StaticGreeting
                resume={resume}
                contextName={contextName}
                tasks={taskCount}
                notes={notes.notes.length}
                focus={timer.stats}
                dailyWord={dailyWord}
                onWord={() => english.mark("word")}
              />
            </ScrollDrift>
          </Reveal>
          <StaticSearchBar
            ref={search}
            settings={searchSettings}
            frequent={topSites}
            favicons={favicons}
            onFavoriteKey={openFavorite}
            onCommand={runCommand}
          />
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                aria-label="Dispensar aviso"
              >
                Dispensar
              </button>
            </div>
          )}
          {blocks}
          {/* Por último: vem do histórico e pode chegar depois do primeiro
            quadro; aqui embaixo, aparecer não empurra mais nada. */}
          {show("frequent") && (
            <StaticFrequentSites sites={frequent} onPin={pinSite} />
          )}
        </main>
        <footer className="footer">
          <span className="footer-status">
            <span className="footer-brand">
              <BrandMark size={13} />
              <img
                src="brand/wordmark.svg"
                height={11}
                alt="Nexo"
                draggable={false}
              />
            </span>
            <span className="footer-saved" data-ready={ready}>
              {ready ? "Salvo neste navegador" : "Carregando…"}
            </span>
          </span>
          <span className="footer-keys">
            <kbd>/</kbd> busca · <kbd>1</kbd>–<kbd>9</kbd> favoritos ·{" "}
            <kbd>Alt</kbd> <kbd>1–4</kbd> contexto · <kbd>Alt</kbd> <kbd>T</kbd>{" "}
            tarefa · <kbd>Alt</kbd> <kbd>N</kbd> nota ·{" "}
            <button type="button" className="footer-help" onClick={openHelp}>
              <kbd>?</kbd> todos os atalhos
            </button>
          </span>
        </footer>
        <div
          className="toast"
          data-on={toast !== null}
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
        {welcome && ready && <Welcome onClose={closeWelcome} />}
        {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
        {editor && (
          <Suspense fallback={null}>
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
              appearance={appearance}
              onAppearance={changeAppearance}
              hiddenSections={sections.hidden}
              onToggleSection={sections.toggle}
            />
          </Suspense>
        )}
      </div>
    </MotionProvider>
  );
}
