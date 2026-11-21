import { glideToTop } from "@shared/lib/glide";
import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ArrowUpRight, Calculator, ClipboardPaste, X, HelpCircle, Languages, Volume2, LayoutGrid, ListPlus, Mic, Plus, Search, Settings2, SquareX, StickyNote, Sparkles, Timer, Zap } from "lucide-react";
import { isNoiseHost, type TopSite } from "@features/frequent/model/top-sites";
import {
  displayUrl,
  filterItems,
  typedUrl,
  type SearchResult,
} from "@features/search/model/filter";
import { normalizeVoice, voiceLang } from "@features/search/model/voice";
import { useSpeech } from "@features/search/model/use-speech";
import { describeCommand, parseCommands, type Command } from "@features/search/model/commands";
import { fetchClosedTabs, type ClosedTab } from "@features/closed/model/closed-tabs";
import { bangs, parseBang, type Bang } from "@features/search/model/bangs";
import { aiProviders, parseAiPrefix, type AiProvider } from "@features/search/model/ai-providers";
import {
  pushRecent,
  readRecent,
  recentToResult,
  type RecentEntry,
} from "@features/search/model/recent";
import type { Settings } from "@shared/model/settings";
import { calculate, formatResult } from "@features/search/model/calc";
import { logVisit } from "@features/log/model/visit-log";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";
import { AiGlyph } from "@shared/ui/ai-logo";
import { SearchCursor, type CursorBox } from "./search-cursor";
import { aiLogos } from "@shared/ui/ai-logos";

/** Ícone de marca de cada busca direta (chaves da biblioteca de ícones). */
const bangIcons: Record<string, string> = {
  gh: "github",
  yt: "youtube",
  mdn: "si:mdnwebdocs",
  npm: "si:npm",
  so: "si:stackoverflow",
  dr: "googledrive",
  w: "wikipedia",
  maps: "si:googlemaps",
  tr: "si:googletranslate",
  img: "si:google",
  sch: "si:googlescholar",
  rd: "reddit",
  x: "x",
  sp: "si:spotify",
  imdb: "si:imdb",
  hn: "si:ycombinator",
  hf: "si:huggingface",
  am: "lu:ShoppingCart",
  gm: "gmail",
};

type Row =
  | { kind: "address"; url: string }
  | { kind: "result"; result: SearchResult; group?: "recent" | "closed" }
  | { kind: "web"; url: string }
  | { kind: "ai"; provider: AiProvider; text: string }
  | { kind: "bang"; bang: Bang; text: string }
  | { kind: "command"; command: Command }
  | { kind: "calc"; value: number }
  /** Dica de prefixo digitado sozinho ("+", "nota"): explica o que vem depois. */
  | { kind: "hint"; icon: "task" | "note"; title: string; sub: string };

type Props = {
  settings: Settings;
  frequent: TopSite[];
  favicons: Map<string, string>;
  /** Tecla 1–9 com o campo vazio: abre o favorito correspondente. */
  onFavoriteKey: (index: number) => boolean;
  /** Comando digitado na busca ("+ tarefa", "foco 25"). */
  onCommand: (command: Command) => void;
  /** Link na área de transferência ao abrir a aba: Enter com o campo vazio abre. */
  clipboardUrl?: string | null;
  /** O link copiado foi aberto ou dispensado. */
  onClipboardUsed?: () => void;
};

export type SearchBarHandle = {
  /** Foca o campo e seleciona o texto (Ctrl+K, "/"). */
  focus: () => void;
  /** Foca a busca já com o texto (ex.: "ia " para perguntar a uma IA). */
  focusWith: (text: string) => void;
  /** Liga/desliga o ditado por voz. */
  toggleVoice: () => void;
};

/** Dicas sob o campo: ensinam o atalho e, ao clicar, já preenchem o prefixo. */
const tips: { key: string; label: string; fill: string | null; title: string }[] = [
  { key: "1–9", label: "favoritos", fill: null, title: "Com a busca vazia, 1 a 9 abrem os favoritos" },
  { key: "gh", label: "GitHub", fill: "gh ", title: "Prefixos buscam direto no site: gh, yt, g, w…" },
  { key: "cl", label: "perguntar à IA", fill: "cl ", title: "cl, gpt ou gem + pergunta" },
  { key: "+", label: "tarefa", fill: "+ ", title: "Adicionar uma tarefa de hoje" },
  { key: "@", label: "contexto", fill: "@", title: "Trocar de contexto: @dev, @acad…" },
];

const kindLabel: Record<SearchResult["type"], string> = {
  shortcut: "Atalho",
  project: "Projeto",
  frequent: "Frequente",
  recent: "Recente",
  closed: "Fechada",
};

/** Sem acento e em minúsculas, na mesma extensão do texto original. */
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Destaca o trecho que casou com a busca: o olho acha o site sem ler tudo. */
function Highlight({ text, query }: { text: string; query: string }) {
  const needle = fold(query.trim());
  if (!needle) return <>{text}</>;
  const hay = fold(text);
  const at = hay.length === text.length ? hay.indexOf(needle) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  );
}

function sectionOf(row: Row): string {
  if (row.kind === "hint") return "Comandos";
  if (row.kind === "calc") return "Resultado";
  if (row.kind === "address") return "Ir para";
  if (row.kind === "command") return "Comandos";
  if (row.kind === "web" || row.kind === "bang") return "Pesquisar";
  if (row.kind === "ai") return "Perguntar à IA";
  if (row.group === "recent") return "Recentes";
  if (row.group === "closed") return "Fechadas há pouco";
  return "Sites";
}

function hostOf(url: string) {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
}

function searchUrl(query: string, provider: Settings["searchProvider"]) {
  const base =
    provider === "google"
      ? "https://www.google.com/search?q="
      : "https://duckduckgo.com/?q=";
  return base + encodeURIComponent(query.trim());
}

/**
 * Busca no estilo da barra de endereços do Firefox (urlbar.css do perfil):
 * pílula em repouso, anel azul que se fecha ao focar, resultados num painel
 * logo abaixo, linha selecionada em azul cheio com texto branco e endereço no
 * tom de acento. Sempre visível: nada fica escondido atrás de um modal.
 */
export const SearchBar = forwardRef<SearchBarHandle, Props>(function SearchBar(
  { settings, frequent, favicons, onFavoriteKey, onCommand, clipboardUrl, onClipboardUsed },
  ref,
) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  // Lido na primeira abertura da busca (clique ou atalho), não ao montar.
  const [recent, setRecent] = useState<RecentEntry[] | null>(null);
  const [closed, setClosed] = useState<ClosedTab[]>([]);
  const closedLoaded = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [pressed, setPressed] = useState(false);
  const [cursor, setCursor] = useState<CursorBox | null>(null);
  const listId = useId();
  const provider = settings.searchProvider === "google" ? "Google" : "DuckDuckGo";

  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [copiedCalc, setCopiedCalc] = useState(false);
  const speech = useSpeech((text, final) => {
    setQuery(final ? normalizeVoice(text) : text);
    openPanel();
    if (final) input.current?.focus();
  }, voiceLang);
  function toggleSpeech() {
    setVoiceNote(null);
    if (!speech.supported) {
      setVoiceNote(
        "O Firefox não tem ditado embutido. Troque o teclado do sistema para inglês e use o ditado dele: Win + H (Windows) ou Fn duas vezes (macOS), com a busca focada.",
      );
      input.current?.focus();
      window.setTimeout(() => setVoiceNote(null), 9000);
      return;
    }
    speech.toggle();
    input.current?.focus();
  }

  /** Desliza até o topo e, ao chegar, o campo dá um pulso de luz. */
  function arrive() {
    void glideToTop().then((moved) => {
      if (!moved) return;
      const field = input.current?.closest(".search-field");
      if (!field) return;
      field.removeAttribute("data-arrive");
      void (field as HTMLElement).offsetWidth;
      field.setAttribute("data-arrive", "");
      window.setTimeout(() => field.removeAttribute("data-arrive"), 1100);
    });
  }

  useImperativeHandle(ref, () => ({
    focus() {
      // Foco sem salto (o navegador rolaria de uma vez); a rolagem é nossa.
      input.current?.focus({ preventScroll: true });
      input.current?.select();
      openPanel();
      arrive();
    },
    focusWith(text: string) {
      setQuery(text);
      input.current?.focus({ preventScroll: true });
      openPanel();
      arrive();
    },
    toggleVoice() {
      toggleSpeech();
    },
  }));

  function openPanel() {
    setOpen(true);
    setRecent((current) => current ?? readRecent());
    // Abas fechadas há pouco: consulta uma vez, só quando a busca é aberta.
    if (!closedLoaded.current) {
      closedLoaded.current = true;
      void fetchClosedTabs().then(setClosed);
    }
  }

  const rows = useMemo<Row[]>(() => {
    const text = query.trim();
    if (!text) {
      if (!open) return [];
      // Campo vazio e clicado: o que abri há pouco, depois os mais visitados.
      const seen = new Set<string>();
      const results: SearchResult[] = [];
      const candidates: SearchResult[] = [
        ...(recent ?? []).map(recentToResult),
        ...frequent.map((site) => ({
          type: "frequent" as const,
          id: site.host,
          label: site.title,
          detail: displayUrl(site.url),
          url: site.url,
          host: site.host,
        })),
      ];
      const limitRecent = 5;
      for (const item of candidates) {
        // localhost, logins e buscadores ficam fora; digitando, ainda aparecem.
        if (item.host && isNoiseHost(item.host)) continue;
        if (seen.has(item.host ?? item.url)) continue;
        seen.add(item.host ?? item.url);
        results.push(item);
        if (results.length === limitRecent) break;
      }
      const urls = new Set(results.map((item) => item.url));
      const reopened = closed
        .filter((tab) => !urls.has(tab.url))
        .slice(0, 3)
        .map(
          (tab): SearchResult => ({
            type: "closed",
            id: tab.url,
            label: tab.title,
            detail: displayUrl(tab.url),
            url: tab.url,
            host: tab.host,
          }),
        );
      return [
        ...results.map((result) => ({ kind: "result", result, group: "recent" }) as Row),
        ...reopened.map((result) => ({ kind: "result", result, group: "closed" }) as Row),
      ];
    }
    // Prefixo sozinho ("gh", "cl", "+", "nota"): em vez de esperar mais texto,
    // mostra o que ele faz e o que digitar a seguir. Vem antes dos resultados
    // normais, que continuam abaixo (o prefixo pode ser só uma palavra).
    const solo = /^(\S+)$/.exec(text)?.[1];
    const soloAi = solo ? parseAiPrefix(`${solo} x`) : null;
    const soloBang = solo ? parseBang(`${solo} x`) : null;
    const soloHint: Row[] =
      solo === "+"
        ? [{ kind: "hint", icon: "task", title: "Adicionar tarefa de hoje", sub: "Digite o texto depois do +, ex.: + comprar pão" }]
        : solo?.toLowerCase() === "nota"
          ? [{ kind: "hint", icon: "note", title: "Salvar uma nota rápida", sub: "Digite o texto depois de nota, ex.: nota ideia para o projeto" }]
          : [];
    const soloRows: Row[] = [
      ...soloHint,
      ...(soloBang ? [{ kind: "bang", bang: soloBang.bang, text: "" } as Row] : []),
      ...(soloAi
        ? [soloAi.provider, ...aiProviders.filter((item) => item.id !== soloAi.provider.id)].map(
            (provider) => ({ kind: "ai", provider, text: "" }) as Row,
          )
        : []),
    ];
    const address = typedUrl(text);
    const aiTarget = soloAi ? null : parseAiPrefix(text);
    if (aiTarget) {
      // "cl pergunta": só IAs, a escolhida primeiro. Enter envia.
      const ordered = [
        aiTarget.provider,
        ...aiProviders.filter((item) => item.id !== aiTarget.provider.id),
      ];
      return ordered.map(
        (provider) => ({ kind: "ai", provider, text: aiTarget.text }) as Row,
      );
    }
    const calc = calculate(text);
    if (calc !== null) {
      // Conta: o resultado primeiro; a busca na web continua logo abaixo.
      return [
        { kind: "calc", value: calc } as Row,
        { kind: "web", url: searchUrl(text, settings.searchProvider) } as Row,
      ];
    }
    const direct = parseBang(text);
    const commands = parseCommands(text);
    const results = filterItems(
      settings.shortcuts,
      settings.focusItems,
      text,
      frequent,
    ).filter((item) => !address || item.url !== address);
    // Nada local casou: oferece perguntar direto a uma IA.
    const ai: Row[] =
      !address && !results.length && !soloAi
        ? aiProviders.map((provider) => ({ kind: "ai", provider, text }) as Row)
        : [];
    return [
      ...soloRows,
      ...commands.map((command) => ({ kind: "command", command }) as Row),
      ...(direct ? [{ kind: "bang", bang: direct.bang, text: direct.text } as Row] : []),
      ...(address ? [{ kind: "address", url: address } as Row] : []),
      ...results.map((result) => ({ kind: "result", result }) as Row),
      { kind: "web", url: searchUrl(text, settings.searchProvider) },
      ...ai,
    ];
  }, [
    query,
    open,
    recent,
    closed,
    settings.shortcuts,
    settings.focusItems,
    settings.searchProvider,
    frequent,
  ]);

  useEffect(() => {
    setSelected(0);
    setCopiedCalc(false);
    // Avisa o título da aba (DocumentTitle) sem passar pelo estado da página.
    window.dispatchEvent(new CustomEvent("nexo:query", { detail: query }));
  }, [query]);

  // ?q=texto abre a busca já preenchida (marcadores, testes). Depois de
  // montar, para o HTML pré-renderizado e o cliente não divergirem.
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) setQuery(initial);
  }, []);

  const urlOf = (row: Row) =>
    row.kind === "result"
      ? row.result.url
      : row.kind === "ai"
        ? row.provider.url(row.text)
        : row.kind === "bang"
          ? row.bang.url(row.text)
          : row.kind === "command" || row.kind === "calc" || row.kind === "hint"
            ? ""
            : row.url;

  /** Registro de acessos: o que foi aberto pela busca e o que foi digitado. */
  function track(row: Row) {
    const url = urlOf(row);
    if (!url) return;
    const label =
      row.kind === "result" ? row.result.label : row.kind === "ai" ? row.provider.name : row.kind === "bang" ? row.bang.name : "";
    logVisit({ url, label, source: "busca", query: query.trim() || undefined });
  }

  function remember(row: Row) {
    if (row.kind === "ai" || row.kind === "web" || row.kind === "bang" || row.kind === "command" || row.kind === "calc" || row.kind === "hint")
      return;
    const url = urlOf(row);
    const label = row.kind === "result" ? row.result.label : displayUrl(url);
    setRecent((list) => pushRecent(list ?? readRecent(), { url, label, host: hostOf(url) }));
  }

  function go(url: string, newTab: boolean) {
    if (newTab) window.open(url, "_blank", "noopener");
    else window.location.assign(url);
  }

  function openRow(row: Row, newTab: boolean) {
    if (row.kind === "hint") {
      // Só uma dica: devolve o foco ao campo para continuar digitando.
      input.current?.focus();
      return;
    }
    if (row.kind === "calc") {
      void navigator.clipboard
        ?.writeText(formatResult(row.value))
        .then(() => setCopiedCalc(true))
        .catch(() => undefined);
      return;
    }
    if (row.kind === "command") {
      onCommand(row.command);
      setQuery("");
      setOpen(false);
      return;
    }
    remember(row);
    track(row);
    const url = urlOf(row);
    if (row.kind === "ai" && !row.provider.prefill && row.text) {
      // Sem parâmetro de URL: copia a pergunta; o usuário só cola no chat.
      const copy = navigator.clipboard?.writeText(row.text);
      if (newTab || !copy) go(url, newTab);
      else void copy.catch(() => undefined).finally(() => go(url, false));
      return;
    }
    go(url, newTab);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 1–9 abre favorito só na aba recém-aberta (campo vazio, painel fechado).
    // Depois de clicar no campo, números são texto — dá para digitar contas.
    if (
      !query &&
      !open &&
      /^[1-9]$/.test(event.key) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      if (onFavoriteKey(Number(event.key) - 1)) event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      if (query) {
        event.preventDefault();
        setQuery("");
      } else if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    // Campo vazio + link copiado: Enter abre o link (Ctrl+T, Enter).
    if (event.key === "Enter" && !query.trim() && clipboardUrl && selected === 0) {
      event.preventDefault();
      onClipboardUsed?.();
      logVisit({ url: clipboardUrl, source: "copiado" });
      go(clipboardUrl, event.ctrlKey || event.metaKey);
      return;
    }
    if (!rows.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((value) => (value + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((value) => (value - 1 + rows.length) % rows.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openRow(rows[selected], event.ctrlKey || event.metaKey);
    }
  }

  // Só com a busca ativa: clicar fora fecha o painel mesmo com texto digitado
  // (o clique fora mostra que a pessoa queria outra coisa).
  const expanded = open && rows.length > 0;
  // O que Enter fará agora: mostrado dentro do campo, para colar e ir sem ler.
  const current = query.trim() ? rows[selected] : undefined;
  const enterLabel = !current
    ? !query.trim() && clipboardUrl
      ? "Abrir copiado"
      : null
    : current.kind === "calc"
      ? copiedCalc
        ? "Copiado"
        : "Copiar"
      : current.kind === "address" || current.kind === "result"
      ? "Abrir"
      : current.kind === "web"
        ? "Pesquisar"
        : current.kind === "ai"
          ? "Perguntar"
          : current.kind === "bang"
            ? current.text
              ? "Buscar"
              : "Abrir"
            : current.kind === "hint"
              ? "Continue"
              : "Executar";
  const showingRecent = !query.trim() && expanded;
  const optionId = (index: number) => `${listId}-option-${index}`;
  // Ação da linha selecionada, mostrada dentro do cursor que desliza.
  const act = !expanded
    ? null
    : query.trim()
      ? enterLabel
      : clipboardUrl && selected === 0
        ? "Abrir copiado"
        : "Abrir";

  // O cursor desliza até a linha selecionada (posição medida, mola no CSS) e a
  // lista rola só o necessário para mantê-la à vista.
  useLayoutEffect(() => {
    const box = scroller.current;
    const row = expanded ? document.getElementById(optionId(selected)) : null;
    if (!box || !row) {
      setCursor(null);
      return;
    }
    // O cursor mora no contêiner de rolagem; a lista pode estar deslocada nele.
    const list = row.offsetParent as HTMLElement;
    setCursor({
      x: row.offsetLeft + list.offsetLeft,
      y: row.offsetTop + list.offsetTop,
      w: row.offsetWidth,
      h: row.offsetHeight,
      tint: row.dataset.tint ?? "",
      card: row.dataset.kind === "ai",
    });
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop - 8;
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight)
      box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight + 8;
  }, [selected, expanded, rows, listId]);

  return (
    <div
      className="search"
      data-expanded={expanded}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {clipboardUrl && !query.trim() && (
        <div className="search-clip-slot">
        <div className="search-clip">
          <button
            type="button"
            className="search-clip-open"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              onClipboardUsed?.();
              logVisit({ url: clipboardUrl, source: "copiado" });
              go(clipboardUrl, event.ctrlKey || event.metaKey);
            }}
            title={clipboardUrl}
          >
            <ClipboardPaste size={16} aria-hidden="true" />
            <span className="search-clip-label">Abrir link copiado</span>
            <span className="search-clip-url">{displayUrl(clipboardUrl)}</span>
            <kbd aria-hidden="true">↵</kbd>
          </button>
          <button
            type="button"
            className="search-clip-dismiss"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onClipboardUsed?.()}
            aria-label="Dispensar link copiado"
            title="Dispensar"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        </div>
      )}
      <div className="search-field" onMouseDown={openPanel}>
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          ref={input}
          // Foco ao abrir a aba: o autoconfig do Firefox entrega o teclado
          // para a página (extras/autoconfig/config.js), então digitar já
          // cai aqui e não na barra de endereços.
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            openPanel();
          }}
          onKeyDown={onKeyDown}
          placeholder="Buscar, gh react, + tarefa, cl pergunta… ou fale (Alt M)"
          aria-label="Buscar"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? optionId(selected) : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {enterLabel && (
          <span className="search-enter" data-kind={current?.kind ?? "address"} aria-hidden="true">
            <kbd>↵</kbd>
            {enterLabel}
          </span>
        )}
        <button
          type="button"
          className="search-mic"
          data-listening={speech.listening}
          aria-pressed={speech.listening}
          aria-label={speech.listening ? "Parar de ouvir" : "Falar em inglês (Alt M)"}
          title={speech.listening ? "Stop listening" : "Speak English · Alt M"}
          onMouseDown={(event) => event.preventDefault()}
          onClick={toggleSpeech}
        >
          <Mic size={17} aria-hidden="true" />
        </button>
      </div>
      {/* Espaço reservado de altura fixa: dicas ou link copiado. Ao digitar só
          fica invisível — a dobra é centralizada e não pode pular. */}
      <div className="search-below" data-hidden={expanded || undefined}>
      {!voiceNote && !speech.error && (
        <div className="search-tips" aria-label="Atalhos da busca">
          {tips.map((tip) => (
            <button
              key={tip.label}
              type="button"
              className="search-tip"
              title={tip.title}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (tip.fill === null) return;
                setQuery(tip.fill);
                input.current?.focus();
                openPanel();
              }}
              tabIndex={tip.fill === null ? -1 : 0}
            >
              <kbd>{tip.key}</kbd>
              {tip.label}
            </button>
          ))}
        </div>
      )}
      </div>
      {(voiceNote || speech.error) && (
        <p className="search-note" role="status">
          {voiceNote ?? speech.error}
        </p>
      )}

      {expanded && (
        <div
          className="search-panel"
          onMouseDown={(event) => {
            event.preventDefault();
            if ((event.target as HTMLElement).closest(".search-row")) {
              setPressed(true);
              window.addEventListener("mouseup", () => setPressed(false), { once: true });
            }
          }}
        >
          <div className="search-scroll" ref={scroller}>
          {cursor && (
            <SearchCursor box={cursor} pressed={pressed}>
              {act && (
                <span className="search-cursor-act" key={act}>
                  <kbd>↵</kbd>
                  {act}
                </span>
              )}
            </SearchCursor>
          )}
          <ul id={listId} role="listbox" aria-label="Resultados" className="search-results">
            {rows.map((row, index) => {
              const previous = rows[index - 1];
              const section = sectionOf(row);
              const groupLabel =
                !previous || sectionOf(previous) !== section ? (
                  <li key={`label-${section}`} role="presentation" className="search-label">
                    {section}
                  </li>
                ) : null;
              const node = ((): React.ReactNode => {
              const isSelected = index === selected;
              const common = {
                id: optionId(index),
                role: "option" as const,
                "aria-selected": isSelected,
                className: "search-row",
                "data-kind": row.kind === "result" ? row.result.type : row.kind,
                "data-tint":
                  row.kind === "ai"
                    ? aiLogos[row.provider.id]?.tint
                    : row.kind === "web"
                      ? settings.searchProvider === "google"
                        ? "#4285f4"
                        : "#de5833"
                      : row.kind === "calc"
                        ? "#34d399"
                        : undefined,
                style: { "--n": Math.min(index, 10) } as React.CSSProperties,
                "data-selected": isSelected,
                onMouseEnter: () => setSelected(index),
                onClick: (event: MouseEvent) => {
                  if (event.button !== 0) return;
                  if (row.kind === "ai" || row.kind === "command" || row.kind === "calc" || row.kind === "hint") {
                    event.preventDefault();
                    openRow(row, event.ctrlKey || event.metaKey);
                  } else {
                    remember(row);
                    track(row);
                  }
                },
              };
              if (row.kind === "address")
                return (
                  <li key="address" {...common}>
                    <a href={row.url} className="search-row-link" tabIndex={-1}>
                      <span className="search-row-icon" aria-hidden="true">
                        <ArrowUpRight size={16} />
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">{displayUrl(row.url)}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">Abrir endereço</span>
                      </span>
                      <span className="search-row-kind">Endereço</span>
                    </a>
                  </li>
                );
              if (row.kind === "calc")
                return (
                  <li key="calc" {...common}>
                    <a href="#" className="search-row-link" tabIndex={-1} onClick={(event) => event.preventDefault()}>
                      <span className="search-row-icon" aria-hidden="true">
                        <Calculator size={16} />
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title search-calc">= {formatResult(row.value)}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">{copiedCalc ? "Copiado" : "Enter copia o resultado"}</span>
                      </span>
                      <span className="search-row-kind">Conta</span>
                    </a>
                  </li>
                );
              if (row.kind === "web")
                return (
                  <li key="web" {...common}>
                    <a href={row.url} className="search-row-link" tabIndex={-1}>
                      <span className="search-row-icon" data-brand aria-hidden="true">
                        <ShortcutIcon
                          icon={settings.searchProvider === "google" ? "si:google" : "si:duckduckgo"}
                          label={provider}
                        />
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">{query.trim()}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">Pesquisar no {provider}</span>
                      </span>
                      <span className="search-row-kind">Web</span>
                    </a>
                  </li>
                );
              if (row.kind === "command")
                return (
                  <li key={`command-${index}`} {...common}>
                    <a href="#" className="search-row-link" tabIndex={-1} onClick={(event) => event.preventDefault()}>
                      <span className="search-row-icon" data-cmd={row.command.type} aria-hidden="true">
                        {row.command.type === "task" ? (
                          <ListPlus size={16} />
                        ) : row.command.type === "note" ? (
                          <StickyNote size={16} />
                        ) : row.command.type === "focus" ? (
                          <Timer size={16} />
                        ) : row.command.type === "settings" ? (
                          <Settings2 size={16} />
                        ) : row.command.type === "shortcut" ? (
                          <Plus size={16} />
                        ) : row.command.type === "stop-focus" ? (
                          <SquareX size={16} />
                        ) : row.command.type === "help" ? (
                          <HelpCircle size={16} />
                        ) : row.command.type === "translate" ? (
                          <Languages size={16} />
                        ) : row.command.type === "say" ? (
                          <Volume2 size={16} />
                        ) : (
                          <LayoutGrid size={16} />
                        )}
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">
                          {describeCommand(row.command).title}
                        </span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">
                          {describeCommand(row.command).hint}
                        </span>
                      </span>
                      <span className="search-row-kind">Comando</span>
                    </a>
                  </li>
                );
              if (row.kind === "hint")
                return (
                  <li key={`hint-${row.icon}`} {...common}>
                    <a href="#" className="search-row-link" tabIndex={-1} onClick={(event) => event.preventDefault()}>
                      <span className="search-row-icon" data-cmd={row.icon} aria-hidden="true">
                        {row.icon === "task" ? <ListPlus size={16} /> : <StickyNote size={16} />}
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">{row.title}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">{row.sub}</span>
                      </span>
                      <span className="search-row-kind">Dica</span>
                    </a>
                  </li>
                );
              if (row.kind === "bang")
                return (
                  <li key={`bang-${row.bang.key}`} {...common}>
                    <a href={urlOf(row)} className="search-row-link" tabIndex={-1}>
                      <span className="search-row-icon" data-brand={bangIcons[row.bang.key] ? "" : undefined} aria-hidden="true">
                        {bangIcons[row.bang.key] ? (
                          <ShortcutIcon icon={bangIcons[row.bang.key]} label={row.bang.name} />
                        ) : (
                          <Zap size={16} />
                        )}
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">{row.text || `Buscar no ${row.bang.name}`}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">
                          {row.text ? `Pesquisar no ${row.bang.name}` : `Digite o que procurar depois de ${row.bang.key}`}
                        </span>
                      </span>
                      <span className="search-row-kind">{row.bang.key}</span>
                    </a>
                  </li>
                );
              if (row.kind === "ai")
                return (
                  <li key={`ai-${row.provider.id}`} {...common}>
                    <a href={urlOf(row)} className="search-row-link" tabIndex={-1}>
                      <span
                        className="search-row-icon"
                        data-logo
                        style={aiLogos[row.provider.id] ? { background: aiLogos[row.provider.id].bg } : undefined}
                        aria-hidden="true"
                      >
                        {aiLogos[row.provider.id] ? <AiGlyph id={row.provider.id} /> : <Sparkles size={16} />}
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">{row.provider.name}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">
                          {!row.text
                            ? row.provider.prefill
                              ? "digite a pergunta"
                              : "digite a pergunta e cole no chat"
                            : row.provider.prefill
                              ? "abre já com a pergunta"
                              : "copia a pergunta, cole com Ctrl+V"}
                        </span>
                      </span>
                      <span className="search-row-kind">IA</span>
                    </a>
                  </li>
                );
              const { result } = row;
              return (
                <li key={`${result.type}-${result.id}`} {...common}>
                  <a href={result.url} className="search-row-link" tabIndex={-1}>
                    <span className="search-row-icon" data-brand aria-hidden="true">
                      <ShortcutIcon
                        icon={result.icon}
                        label={result.label}
                        url={result.url}
                        favicon={result.host ? favicons.get(result.host) : undefined}
                      />
                    </span>
                    <span className="search-row-text">
                      <span className="search-row-title">
                        <Highlight text={result.label} query={query} />
                      </span>
                      <span className="search-row-sep"> — </span>
                      <span className="search-row-url">
                        <Highlight text={result.detail ?? ""} query={query} />
                      </span>
                    </span>
                    <span className="search-row-kind">{kindLabel[result.type]}</span>
                  </a>
                </li>
              );
              })();
              return (
                <Fragment key={index}>
                  {groupLabel}
                  {node}
                </Fragment>
              );
            })}
          </ul>
          </div>
          {showingRecent && (
            <div className="search-chips">
              <div className="search-chip-group">
                <span className="search-label">Busca direta</span>
                <div className="search-chip-grid">
                  {bangs.map((bang) => (
                    <button
                      key={bang.key}
                      type="button"
                      className="search-chip"
                      title={`Pesquisar no ${bang.name}: ${bang.key} texto`}
                      onClick={() => {
                        setQuery(`${bang.key} `);
                        input.current?.focus();
                      }}
                    >
                      <span className="search-chip-icon" data-brand={bangIcons[bang.key] ? "" : undefined}>
                        {bangIcons[bang.key] ? <ShortcutIcon icon={bangIcons[bang.key]} label={bang.name} /> : <Zap size={14} />}
                      </span>
                      <span className="search-chip-name">{bang.name}</span>
                      <kbd>{bang.key}</kbd>
                    </button>
                  ))}
                </div>
              </div>
              <div className="search-chip-group">
                <span className="search-label">Perguntar a</span>
                <div className="search-chip-grid">
                  {aiProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className="search-chip is-ai"
                      title={`${provider.name}: digite ${provider.keys[0]} e a pergunta`}
                      onClick={() => {
                        setQuery(`${provider.keys[0]} `);
                        input.current?.focus();
                      }}
                    >
                      <span className="search-chip-icon" data-logo style={{ background: aiLogos[provider.id]?.bg }}>
                        <AiGlyph id={provider.id} size={14} />
                      </span>
                      <span className="search-chip-name">{provider.name}</span>
                      <kbd>{provider.keys[0]}</kbd>
                    </button>
                  ))}
                </div>
              </div>
              <div className="search-chip-group">
                <span className="search-label">Comandos</span>
                <div className="search-chip-grid">
                  {(
                    [
                      ["+ ", "Tarefa", "+", ListPlus, "Adicionar tarefa de hoje: + texto"],
                      ["nota ", "Nota", "nota", StickyNote, "Salvar uma nota rápida: nota texto"],
                      ["foco ", "Foco", "foco", Timer, "Iniciar foco: foco 25"],
                      ["@", "Contexto", "@", LayoutGrid, "Trocar de contexto: @dev, @acad, @carreira, @pessoal"],
                    ] as const
                  ).map(([text, name, key, Icon, title]) => (
                    <button
                      key={text}
                      type="button"
                      className="search-chip"
                      title={title}
                      onClick={() => {
                        setQuery(text);
                        input.current?.focus();
                      }}
                    >
                      <span className="search-chip-icon" data-cmd={name === "Tarefa" ? "task" : name === "Nota" ? "note" : name === "Foco" ? "focus" : "context"}>
                        <Icon size={14} />
                      </span>
                      <span className="search-chip-name">{name}</span>
                      <kbd>{key}</kbd>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <p className="search-hint" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
            <span><kbd>Enter</kbd> abrir</span>
            <span><kbd>Ctrl</kbd><kbd>Enter</kbd> nova aba</span>
            <span><kbd>Esc</kbd> limpar</span>
            <span className="search-hint-count">
              {rows.length} {rows.length === 1 ? "resultado" : "resultados"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
});
