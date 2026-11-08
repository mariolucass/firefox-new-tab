import {
  forwardRef,
  Fragment,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { ArrowUpRight, Globe2, HelpCircle, Languages, Volume2, LayoutGrid, ListPlus, Mic, Plus, Search, Settings2, SquareX, StickyNote, Sparkles, Timer, Zap } from "lucide-react";
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
import { ShortcutIcon } from "@shared/ui/shortcut-icon";

type Row =
  | { kind: "address"; url: string }
  | { kind: "result"; result: SearchResult; group?: "recent" | "closed" }
  | { kind: "web"; url: string }
  | { kind: "ai"; provider: AiProvider; text: string }
  | { kind: "bang"; bang: Bang; text: string }
  | { kind: "command"; command: Command };

type Props = {
  settings: Settings;
  frequent: TopSite[];
  favicons: Map<string, string>;
  /** Tecla 1–9 com o campo vazio: abre o favorito correspondente. */
  onFavoriteKey: (index: number) => boolean;
  /** Comando digitado na busca ("+ tarefa", "foco 25"). */
  onCommand: (command: Command) => void;
};

export type SearchBarHandle = {
  /** Foca o campo e seleciona o texto (Ctrl+K, "/"). */
  focus: () => void;
  /** Foca a busca já com o texto (ex.: "ia " para perguntar a uma IA). */
  focusWith: (text: string) => void;
  /** Liga/desliga o ditado por voz. */
  toggleVoice: () => void;
};

const kindLabel: Record<SearchResult["type"], string> = {
  shortcut: "Atalho",
  project: "Projeto",
  frequent: "Frequente",
  recent: "Recente",
  closed: "Fechada",
};

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
  { settings, frequent, favicons, onFavoriteKey, onCommand },
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
  const listId = useId();
  const provider = settings.searchProvider === "google" ? "Google" : "DuckDuckGo";

  const [voiceNote, setVoiceNote] = useState<string | null>(null);
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

  useImperativeHandle(ref, () => ({
    focus() {
      input.current?.focus();
      input.current?.select();
      openPanel();
    },
    focusWith(text: string) {
      setQuery(text);
      input.current?.focus();
      openPanel();
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
    const address = typedUrl(text);
    const aiTarget = parseAiPrefix(text);
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
      !address && !results.length
        ? aiProviders.map((provider) => ({ kind: "ai", provider, text }) as Row)
        : [];
    return [
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

  useEffect(() => setSelected(0), [query]);

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
          : row.kind === "command"
            ? ""
            : row.url;

  function remember(row: Row) {
    if (row.kind === "ai" || row.kind === "web" || row.kind === "bang" || row.kind === "command")
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
    if (row.kind === "command") {
      onCommand(row.command);
      setQuery("");
      setOpen(false);
      return;
    }
    remember(row);
    const url = urlOf(row);
    if (row.kind === "ai" && !row.provider.prefill) {
      // Sem parâmetro de URL: copia a pergunta; o usuário só cola no chat.
      const copy = navigator.clipboard?.writeText(row.text);
      if (newTab || !copy) go(url, newTab);
      else void copy.catch(() => undefined).finally(() => go(url, false));
      return;
    }
    go(url, newTab);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (
      !query &&
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

  const expanded = rows.length > 0;
  const showingRecent = !query.trim() && expanded;
  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div
      className="search"
      data-expanded={expanded}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
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
      {(voiceNote || speech.error) && (
        <p className="search-note" role="status">
          {voiceNote ?? speech.error}
        </p>
      )}

      {expanded && (
        <div className="search-panel" onMouseDown={(event) => event.preventDefault()}>
          <ul id={listId} role="listbox" aria-label="Resultados" className="search-results">
            {rows.map((row, index) => {
              const group = row.kind === "result" ? row.group : undefined;
              const previous = rows[index - 1];
              const groupLabel =
                group && (!previous || previous.kind !== "result" || previous.group !== group) ? (
                  <li key={`label-${group}`} role="presentation" className="search-label">
                    {group === "recent" ? "Recentes" : "Fechadas há pouco"}
                  </li>
                ) : null;
              const node = ((): React.ReactNode => {
              const isSelected = index === selected;
              const common = {
                id: optionId(index),
                role: "option" as const,
                "aria-selected": isSelected,
                className: "search-row",
                "data-selected": isSelected,
                onMouseEnter: () => setSelected(index),
                onClick: (event: MouseEvent) => {
                  if (event.button !== 0) return;
                  if (row.kind === "ai" || row.kind === "command") {
                    event.preventDefault();
                    openRow(row, event.ctrlKey || event.metaKey);
                  } else remember(row);
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
              if (row.kind === "web")
                return (
                  <li key="web" {...common}>
                    <a href={row.url} className="search-row-link" tabIndex={-1}>
                      <span className="search-row-icon" aria-hidden="true">
                        <Globe2 size={16} />
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
                      <span className="search-row-icon" aria-hidden="true">
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
              if (row.kind === "bang")
                return (
                  <li key={`bang-${row.bang.key}`} {...common}>
                    <a href={urlOf(row)} className="search-row-link" tabIndex={-1}>
                      <span className="search-row-icon" aria-hidden="true">
                        <Zap size={16} />
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">{row.text}</span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">Pesquisar no {row.bang.name}</span>
                      </span>
                      <span className="search-row-kind">{row.bang.key}</span>
                    </a>
                  </li>
                );
              if (row.kind === "ai")
                return (
                  <li key={`ai-${row.provider.id}`} {...common}>
                    <a href={urlOf(row)} className="search-row-link" tabIndex={-1}>
                      <span className="search-row-icon" aria-hidden="true">
                        <Sparkles size={16} />
                      </span>
                      <span className="search-row-text">
                        <span className="search-row-title">
                          Perguntar ao {row.provider.name}
                        </span>
                        <span className="search-row-sep"> — </span>
                        <span className="search-row-url">
                          {row.provider.prefill
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
                    <span className="search-row-icon" aria-hidden="true">
                      <ShortcutIcon
                        icon={result.icon}
                        label={result.label}
                        url={result.url}
                        favicon={result.host ? favicons.get(result.host) : undefined}
                      />
                    </span>
                    <span className="search-row-text">
                      <span className="search-row-title">{result.label}</span>
                      <span className="search-row-sep"> — </span>
                      <span className="search-row-url">{result.detail}</span>
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
          {showingRecent && (
            <div className="search-chips">
              <span className="search-chips-label">Busca direta</span>
              {bangs.map((bang) => (
                <button
                  key={bang.key}
                  type="button"
                  className="search-chip"
                  title={`Pesquisar no ${bang.name}`}
                  onClick={() => {
                    setQuery(`${bang.key} `);
                    input.current?.focus();
                  }}
                >
                  {bang.key}
                </button>
              ))}
              <span className="search-chips-label is-gap">Perguntar a</span>
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
                  {provider.name}
                </button>
              ))}
              <span className="search-chips-label is-gap">Comandos</span>
              {["+ ", "nota ", "foco ", "@"].map((text) => (
                <button
                  key={text}
                  type="button"
                  className="search-chip"
                  title={
                    text === "+ "
                      ? "Adicionar tarefa de hoje: + texto"
                      : text === "nota "
                        ? "Salvar uma nota rápida: nota texto"
                        : text === "@"
                        ? "Trocar de contexto: @dev, @acad, @carreira, @pessoal"
                        : "Iniciar foco: foco 25"
                  }
                  onClick={() => {
                    setQuery(text);
                    input.current?.focus();
                  }}
                >
                  {text === "+ " ? "+ tarefa" : text === "nota " ? "nota" : text === "@" ? "@contexto" : "foco 25"}
                </button>
              ))}
            </div>
          )}
          <p className="search-hint" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
            <span><kbd>Enter</kbd> abrir</span>
            <span><kbd>Ctrl</kbd><kbd>Enter</kbd> nova aba</span>
            <span><kbd>Esc</kbd> limpar</span>
          </p>
        </div>
      )}
    </div>
  );
});
