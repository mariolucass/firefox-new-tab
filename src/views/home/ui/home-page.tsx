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
import { useToday } from "@features/today/model/use-today";
import { driveShortcuts } from "@features/drive/model/links";
import { useDriveInbox } from "@features/drive/model/use-drive-inbox";
import { useAppearance } from "@features/preferences/model/use-appearance";
import { isDueToday } from "@features/today/model/use-today";
import { useHiddenSections } from "@features/preferences/model/use-hidden-sections";
import { useSettings } from "@features/preferences/model/use-settings";
import { favoriteShortcuts } from "@features/search/model/filter";
import { AppHeader } from "@widgets/app-header/ui/app-header";
import { BrandMark } from "@shared/ui/brand-mark";
import {
  IntroProvider,
  MotionProvider,
  Reveal,
  ScrollProgress,
  useIntroStageState,
  useScrollParallax,
} from "@shared/ui/motion";
import { Backdrop } from "@widgets/backdrop/ui/backdrop";
import { FocusArea } from "@widgets/focus-area/ui/focus-area";
import { DayPanel, Greeting } from "@widgets/greeting/ui/greeting";
import { TodayList } from "@widgets/today-list/ui/today-list";
import { FrequentSites } from "@widgets/frequent-sites/ui/frequent-sites";
import {
  SearchBar,
  type SearchBarHandle,
} from "@widgets/search-bar/ui/search-bar";
import type { EditorTarget } from "@widgets/settings-panel/ui/settings-panel";
import { NotesList } from "@widgets/notes-list/ui/notes-list";
import { ScrollRail } from "@widgets/scroll-rail/ui/scroll-rail";
import { SectionNav, type SectionLink } from "@widgets/section-nav/ui/section-nav";
import { ShortcutGrid } from "@widgets/shortcut-grid/ui/shortcut-grid";
import { useHotkeys } from "@views/home/model/use-hotkeys";
import { DocumentTitle } from "@views/home/ui/document-title";
import { reorderByIds } from "@shared/lib/reorder";
import { openAfterPress, openMany } from "@shared/lib/navigation";
import { contextNames, contexts, type ContextId } from "@shared/model/settings";
import { contextIcons } from "@shared/ui/context-icons";
import { CalendarCheck, Gauge, HardDrive, Languages, StickyNote, Target } from "lucide-react";
import {
  logVisit,
  setLogContext,
  type VisitSource,
} from "@features/log/model/visit-log";
import { useClipboardLink } from "@features/search/model/use-clipboard-link";

// Modais (configurações, ajuda, boas-vindas) só entram quando abertos: cada
// nova aba deixa de interpretá-los à toa. No ocioso, os três são pré-baixados,
// então abrir continua instantâneo.
const loadSettings = () => import("@widgets/settings-panel/ui/settings-panel");
const loadHelp = () => import("@widgets/shortcuts-help/ui/shortcuts-help");
const loadWelcome = () => import("@widgets/welcome/ui/welcome");
const SettingsPanel = lazy(() =>
  loadSettings().then((module) => ({ default: module.SettingsPanel })),
);
const ShortcutsHelp = lazy(() =>
  loadHelp().then((module) => ({ default: module.ShortcutsHelp })),
);
const Welcome = lazy(() =>
  loadWelcome().then((module) => ({ default: module.Welcome })),
);
// Inglês e Drive ficam bem abaixo da dobra: entram logo depois da primeira
// pintura, sem disputar a abertura da aba.
const EnglishPanel = lazy(() =>
  import("@widgets/english-panel/ui/english-panel").then((module) => ({
    default: module.EnglishPanel,
  })),
);
const DrivePanel = lazy(() =>
  import("@widgets/drive-panel/ui/drive-panel").then((module) => ({
    default: module.DrivePanel,
  })),
);

const favoritesHint = ["1–9"];
const contextHint = ["Alt", "L"];

const StaticBackdrop = memo(Backdrop);
const StaticScrollRail = memo(ScrollRail);
const StaticGreeting = memo(Greeting);
const StaticDayPanel = memo(DayPanel);
const StaticSearchBar = memo(SearchBar);
const StaticShortcutGrid = memo(ShortcutGrid);
const StaticDrivePanel = memo(DrivePanel);
const StaticTodayList = memo(TodayList);
const StaticNotesList = memo(NotesList);
const StaticFrequentSites = memo(FrequentSites);

export function HomePage() {
  const { settings, ready, error, setError, update } = useSettings();
  const stage = useIntroStageState(ready);
  const topSites = useTopSites();
  const sections = useHiddenSections();
  const {
    appearance,
    change: changeAppearance,
    cyclePalette,
  } = useAppearance();
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
  const [toast, setToast] = useState<{
    message: string;
    action?: { label: string; run: () => void };
  } | null>(null);
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
      logVisit({
        url: favorite.url,
        label: favorite.label,
        source: "favorito",
      });
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
  const notify = useCallback(
    (message: string, action?: { label: string; run: () => void }) => {
      const next = { message, action };
      setToast(next);
      // Com ação (Desfazer), o aviso fica mais tempo para dar tempo de reagir.
      window.setTimeout(
        () => setToast((current) => (current === next ? null : current)),
        action ? 6000 : 2400,
      );
    },
    [],
  );
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
  const focusTask = useCallback(
    (text: string) => {
      timer.start({ id: null, title: text }, 25);
      notify(`Foco de 25 min: ${text}`);
    },
    [timer.start, notify],
  );
  const focusSearch = useCallback(() => {
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
  // Menu de contexto dos ícones. Atalhos virtuais (os do Drive) não estão em
  // settings.shortcuts: para eles as ações de edição avisam onde mudar.
  const toggleFavorite = useCallback(
    (item: (typeof settings.shortcuts)[number]) => {
      if (!settings.shortcuts.some((entry) => entry.id === item.id)) {
        notify("Atalho do Drive: troque a pasta no painel do Drive");
        return;
      }
      update((previous) => ({
        ...previous,
        shortcuts: previous.shortcuts.map((entry) =>
          entry.id === item.id
            ? { ...entry, favorite: !entry.favorite }
            : entry,
        ),
      }));
      notify(
        item.favorite
          ? `${item.label} saiu dos favoritos`
          : `${item.label} agora é favorito`,
      );
    },
    [settings.shortcuts, update, notify],
  );
  const removeShortcut = useCallback(
    (item: (typeof settings.shortcuts)[number]) => {
      const index = settings.shortcuts.findIndex(
        (entry) => entry.id === item.id,
      );
      if (index < 0) {
        notify("Atalho do Drive: troque a pasta no painel do Drive");
        return;
      }
      const removed = settings.shortcuts[index];
      update((previous) => ({
        ...previous,
        shortcuts: previous.shortcuts.filter((entry) => entry.id !== item.id),
      }));
      // Prevenção de erro: em vez de perguntar antes, deixa desfazer depois.
      notify(`${item.label} removido`, {
        label: "Desfazer",
        run: () =>
          update((previous) => {
            if (previous.shortcuts.some((entry) => entry.id === removed.id))
              return previous;
            const shortcuts = [...previous.shortcuts];
            shortcuts.splice(Math.min(index, shortcuts.length), 0, removed);
            return { ...previous, shortcuts };
          }),
      });
    },
    [settings.shortcuts, update, notify],
  );
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
  const openAll = useCallback(() => {
    const items = contextual.slice(0, 12);
    items.forEach((item) =>
      logVisit({ url: item.url, label: item.label, source: "atalho" }),
    );
    openMany(items.map((item) => item.url));
  }, [contextual]);
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

  // Estável: o painel do dia é memo e não deve renderizar a cada tecla.
  const englishRef = useRef(english);
  englishRef.current = english;
  const markWord = useCallback(() => englishRef.current.mark("word"), []);

  // Pré-carrega os modais quando o navegador fica ocioso.
  useEffect(() => {
    const warm = () =>
      void Promise.all([loadHelp(), loadSettings(), loadWelcome()]).catch(
        () => undefined,
      );
    const idle = window.requestIdleCallback?.(warm, { timeout: 4000 });
    const timer =
      idle === undefined ? window.setTimeout(warm, 1500) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // Link na área de transferência ao abrir a aba: Ctrl+T, Enter abre.
  const clipboard = useClipboardLink();

  // Registro de acessos: o contexto entra em cada linha, e todo clique num
  // link da página é anotado com a origem (a busca registra o próprio uso).
  useEffect(() => setLogContext(contextName), [contextName]);
  useEffect(() => {
    const sourceOf = (link: Element): VisitSource | null => {
      if (link.closest(".search, .context-menu, .settings-panel")) return null;
      if (link.closest(".fold-dock")) return "favorito";
      if (link.closest("[aria-label='Google Drive']")) return "drive";
      if (link.closest(".stack")) return "foco";
      if (link.closest(".frequent")) return "frequente";
      if (link.closest(".tile-grid, .row-list")) return "atalho";
      return "pagina";
    };
    const onClick = (event: MouseEvent) => {
      if (event.button > 1) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const source = sourceOf(link);
      if (!source) return;
      const label =
        link.getAttribute("aria-label") ||
        link.querySelector(".item-label, .drive-top-title, .drive-inbox-title")
          ?.textContent ||
        link.title ||
        link.textContent ||
        "";
      logVisit({ url: link.href, label, source });
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  // Colar fora de um campo (Ctrl+V logo ao abrir a aba) cai direto na busca,
  // que já mostra "↵ Abrir" para um link: colar e Enter, nada mais.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const text = event.clipboardData?.getData("text/plain").trim();
      if (!text) return;
      event.preventDefault();
      search.current?.focusWith(text);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // Títulos das seções derivam com a rolagem (profundidade entre camadas).
  useScrollParallax(".section-heading", 24, [
    settings.activeContext,
    ready,
    sections.hidden,
  ]);

  useHotkeys({
    enabled: !editor && !help,
    focusSearch,
    notify,
    changeContext,
    openSettings,
    addShortcut,
    openHelp,
    cyclePalette,
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
      title="Favoritos"
      hint={favoritesHint}
      items={favorites}
      numbered
      pressedIndex={pressedKey}
      favicons={favicons}
      emptyText="Nenhum favorito ainda. Marque um atalho como favorito para abri-lo com as teclas 1–9."
      onAdd={addShortcut}
      onEdit={editShortcut}
      onReorder={reorderShortcuts}
      onToggleFavorite={toggleFavorite}
      onRemove={removeShortcut}
      onNotify={notify}
    />
  );
  const driveBlock = show("drive") && (
    <Suspense key="drive" fallback={<div className="section-placeholder" />}>
      <StaticDrivePanel
        key="drive"
        inbox={drive.inbox}
        onSaveInbox={drive.save}
      />
    </Suspense>
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
      {show("today") && <StaticTodayList today={today} onFocusTask={focusTask} />}
    </div>
  );
  const englishBlock = show("english") && (
    <Suspense key="english" fallback={<div className="section-placeholder" />}>
      <EnglishPanel vocab={vocab} english={english} />
    </Suspense>
  );
  const notesBlock = show("notes") && (
    <StaticNotesList key="notes" notes={notes} />
  );
  const shortcutsBlock = show("shortcuts") && (
    <StaticShortcutGrid
      key="shortcuts"
      title={contextName}
      icon={contextIcons[settings.activeContext]}
      hint={contextHint}
      items={contextual}
      variant={isHome ? "list" : "tiles"}
      favicons={favicons}
      emptyText={`Nenhum atalho em ${contextName}. Use Adicionar para criar o primeiro.`}
      onOpenAll={openAll}
      onAdd={addShortcut}
      onEdit={editShortcut}
      onReorder={reorderShortcuts}
      onToggleFavorite={toggleFavorite}
      onRemove={removeShortcut}
      onNotify={notify}
    />
  );
  // A dobra (saudação, busca, favoritos 1–9) e "Seu dia" valem para todos os
  // contextos. Casa: o dia (foco e hoje) ao lado da lista do contexto, notas,
  // inglês e Drive. Outro contexto: a lista do contexto primeiro. Cada bloco
  // leva um matiz do espectro (data-tone), sempre o mesmo para a mesma seção.
  // "Seu dia" não depende do contexto: vem depois do que muda com ele (foco,
  // hoje e atalhos), então trocar de contexto mexe no que está logo abaixo da
  // dobra e o resto da página fica no lugar.
  const dayBlock = (
    <Reveal key="day" data-tone="6">
      <StaticDayPanel
        resume={resume}
        tasks={taskCount}
        notes={notes.notes.length}
        focus={timer.stats}
        dailyWord={dailyWord}
        onWord={markWord}
      />
    </Reveal>
  );
  const blocks = isHome ? (
    <>
      <Reveal
        className="context-content"
        data-solo={!hasColumn || !show("shortcuts")}
      >
        {columnBlock}
        {shortcutsBlock}
      </Reveal>
      {dayBlock}
      {notesBlock && (
        <Reveal key="notes" data-tone="7">
          {notesBlock}
        </Reveal>
      )}
      {englishBlock && (
        <Reveal key="english" data-tone="5">
          {englishBlock}
        </Reveal>
      )}
      {driveBlock && (
        <Reveal key="drive" data-tone="1">
          {driveBlock}
        </Reveal>
      )}
    </>
  ) : (
    <>
      {shortcutsBlock && (
        <Reveal key={`shortcuts-${settings.activeContext}`} data-tone="4">
          {shortcutsBlock}
        </Reveal>
      )}
      {columnBlock && (
        <Reveal key="column" className="context-content" data-solo="true">
          {columnBlock}
        </Reveal>
      )}
      {dayBlock}
      {notesBlock && (
        <Reveal key="notes" data-tone="7">
          {notesBlock}
        </Reveal>
      )}
      {englishBlock && (
        <Reveal key="english" data-tone="5">
          {englishBlock}
        </Reveal>
      )}
      {driveBlock && (
        <Reveal key="drive" data-tone="1">
          {driveBlock}
        </Reveal>
      )}
    </>
  );

  // Atalhos para as seções, na ordem em que aparecem na página.
  const pending = taskCount.total - taskCount.done;
  const nav: Record<string, SectionLink | null> = {
    shortcuts: show("shortcuts")
      ? { label: contextName, name: contextName, icon: contextIcons[settings.activeContext] }
      : null,
    focus: show("focus") ? { label: "Em foco", name: "Em foco", icon: Target } : null,
    today: show("today") ? { label: "Hoje", name: "Hoje", icon: CalendarCheck, badge: pending } : null,
    day: { label: "Seu dia", name: "Seu dia", icon: Gauge },
    notes: show("notes") ? { label: "Notas", name: "Notas", icon: StickyNote, badge: notes.notes.length } : null,
    english: show("english") ? { label: "Inglês", name: "Inglês", icon: Languages } : null,
    drive: show("drive") ? { label: "Google Drive", name: "Drive", icon: HardDrive } : null,
  };
  const navOrder = isHome
    ? ["focus", "today", "shortcuts", "day", "notes", "english", "drive"]
    : ["shortcuts", "focus", "today", "day", "notes", "english", "drive"];
  const sectionLinks = navOrder.flatMap((id) => (nav[id] ? [nav[id] as SectionLink] : []));

  return (
    <MotionProvider>
      <IntroProvider value={stage}>
      <div className="app-shell" data-stage={stage}>
        <DocumentTitle
          contextName={contextName}
          pending={taskCount.total - taskCount.done}
          focus={
            timer.session
              ? {
                  label: formatRemaining(timer.remaining),
                  done: timer.session.state === "done",
                }
              : null
          }
        />
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
          {/* A dobra: tudo o que importa para sair rápido, numa tela só. */}
          <div className="fold">
            <StaticGreeting />
            <StaticSearchBar
              ref={search}
              settings={searchSettings}
              frequent={topSites}
              favicons={favicons}
              onFavoriteKey={openFavorite}
              onCommand={runCommand}
              clipboardUrl={clipboard.url}
              onClipboardUsed={clipboard.consume}
            />
            {favoritesBlock && (
              <div className="fold-dock" data-tone="1">
                {favoritesBlock}
              </div>
            )}
            <SectionNav links={sectionLinks} />
          </div>
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
          {show("frequent") && frequent.length > 0 && (
            <Reveal key="frequent" data-tone="3">
              <StaticFrequentSites sites={frequent} onPin={pinSite} />
            </Reveal>
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
            <span className="footer-key">
              <span className="keys">
                <kbd>/</kbd>
              </span>
              busca
            </span>
            <span className="footer-key">
              <span className="keys">
                <kbd>1–9</kbd>
              </span>
              favoritos
            </span>
            <span className="footer-key">
              <span className="keys">
                <kbd>Alt</kbd>
                <kbd>1–4</kbd>
              </span>
              contexto
            </span>
            <span className="footer-key">
              <span className="keys">
                <kbd>Alt</kbd>
                <kbd>T</kbd>
              </span>
              tarefa
            </span>
            <span className="footer-key">
              <span className="keys">
                <kbd>Alt</kbd>
                <kbd>N</kbd>
              </span>
              nota
            </span>
            <button type="button" className="footer-help" onClick={openHelp}>
              <span className="keys">
                <kbd>?</kbd>
              </span>
              todos os atalhos
            </button>
          </span>
        </footer>
        <div
          className="toast"
          data-on={toast !== null}
          data-action={toast?.action ? true : undefined}
          role="status"
          aria-live="polite"
        >
          {toast?.message}
          {toast?.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <Suspense fallback={null}>
          {welcome && ready && <Welcome onClose={closeWelcome} />}
          {help && <ShortcutsHelp onClose={() => setHelp(false)} />}
        </Suspense>
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
      </IntroProvider>
    </MotionProvider>
  );
}
