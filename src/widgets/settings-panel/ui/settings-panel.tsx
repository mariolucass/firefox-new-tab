import { BrandMark } from "@shared/ui/brand-mark";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronRight,
  Plus,
  RotateCcw,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { sections, type SectionId } from "@views/home/model/sections";
import { defaultSettings } from "@shared/model/defaults";
import { Button } from "@shared/ui/button";
import { IconPicker } from "./icon-picker";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";
import { Input } from "@shared/ui/input";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import type { Appearance } from "@features/preferences/model/use-appearance";
import { useDialogFocus } from "@shared/lib/use-dialog-focus";
import {
  contextNames,
  contexts,
  validUrl,
  type ContextId,
  type FocusItem,
  type Settings,
  type Shortcut,
} from "@shared/model/settings";

export type EditorTarget =
  | { kind: "settings" }
  | {
      kind: "shortcut";
      item?: Shortcut;
      /** Pré-preenche um atalho novo (ex.: fixar um site frequente). */
      draft?: { label: string; url: string };
    }
  | { kind: "focus"; item?: FocusItem };
type Props = {
  target: EditorTarget;
  settings: Settings;
  update: (change: (previous: Settings) => Settings) => void;
  onClose: () => void;
  hiddenSections: SectionId[];
  onToggleSection: (id: SectionId) => void;
  appearance: Appearance;
  onAppearance: (patch: Partial<Appearance>) => void;
};

function shortcutDraft(
  item: Shortcut | undefined,
  activeContext: ContextId,
  draft?: { label: string; url: string },
) {
  return {
    label: item?.label ?? draft?.label ?? "",
    url: item?.url ?? draft?.url ?? "",
    // Atalho novo nasce no contexto que está na tela, não sempre em
    // Desenvolvimento: é onde a pessoa espera encontrá-lo depois.
    context: item?.context ?? activeContext,
    keywords: item?.keywords.join(", ") ?? "",
    icon: item?.icon ?? "",
    favorite: item?.favorite ?? false,
  };
}

function focusDraft(item: FocusItem | undefined, activeContext: ContextId) {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    url: item?.url ?? "",
    context: item?.context ?? activeContext,
  };
}

const shortcutGroups = ["global", ...contexts] as const;
const groupName = (id: (typeof shortcutGroups)[number]) =>
  id === "global" ? "Globais" : contextNames[id];

export function SettingsPanel({
  target,
  settings,
  update,
  onClose,
  hiddenSections,
  onToggleSection,
  appearance,
  onAppearance,
}: Props) {
  const [screen, setScreen] = useState<EditorTarget>(target);
  const [shortcut, setShortcut] = useState(() =>
    shortcutDraft(
      target.kind === "shortcut" ? target.item : undefined,
      settings.activeContext,
      target.kind === "shortcut" ? target.draft : undefined,
    ),
  );
  const [focus, setFocus] = useState(() =>
    focusDraft(
      target.kind === "focus" ? target.item : undefined,
      settings.activeContext,
    ),
  );
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLElement>(null);
  useDialogFocus(dialog);

  useEffect(() => {
    if (screen.kind === "settings")
      dialog.current
        ?.querySelector<HTMLElement>(".settings-header button")
        ?.focus();
  }, [screen.kind]);

  function edit(next: EditorTarget) {
    setScreen(next);
    setFormError("");
    setShortcut(
      shortcutDraft(
        next.kind === "shortcut" ? next.item : undefined,
        settings.activeContext,
        next.kind === "shortcut" ? next.draft : undefined,
      ),
    );
    setFocus(
      focusDraft(
        next.kind === "focus" ? next.item : undefined,
        settings.activeContext,
      ),
    );
  }

  function saveShortcut(event: FormEvent) {
    event.preventDefault();
    const url = validUrl(shortcut.url);
    if (!url) {
      setFormError("Informe uma URL http ou https válida.");
      return;
    }
    const item: Shortcut = {
      id:
        screen.kind === "shortcut" && screen.item
          ? screen.item.id
          : crypto.randomUUID(),
      label: shortcut.label.trim(),
      url,
      context: shortcut.context as Shortcut["context"],
      keywords: shortcut.keywords
        .split(",")
        .map((word) => word.trim())
        .filter(Boolean),
      icon: shortcut.icon.trim() || undefined,
      favorite: shortcut.favorite,
      order:
        screen.kind === "shortcut" && screen.item
          ? screen.item.order
          : settings.shortcuts.length,
    };
    update((previous) => ({
      ...previous,
      shortcuts:
        screen.kind === "shortcut" && screen.item
          ? previous.shortcuts.map((old) => (old.id === item.id ? item : old))
          : [...previous.shortcuts, item],
    }));
    edit({ kind: "settings" });
  }

  function saveFocus(event: FormEvent) {
    event.preventDefault();
    const url = focus.url.trim() ? validUrl(focus.url) : undefined;
    if (focus.url.trim() && !url) {
      setFormError("Informe uma URL http ou https válida.");
      return;
    }
    const context = focus.context as ContextId;
    const isEditing = screen.kind === "focus" && Boolean(screen.item);
    if (
      settings.focusItems.filter(
        (item) =>
          item.context === context &&
          (!isEditing ||
            item.id !== (screen.kind === "focus" ? screen.item?.id : "")),
      ).length >= 3
    ) {
      setFormError("Este contexto já tem três itens de foco.");
      return;
    }
    const item: FocusItem = {
      id:
        screen.kind === "focus" && screen.item
          ? screen.item.id
          : crypto.randomUUID(),
      context,
      title: focus.title.trim(),
      description: focus.description.trim() || undefined,
      url: url || undefined,
      order:
        screen.kind === "focus" && screen.item
          ? screen.item.order
          : settings.focusItems.length,
    };
    update((previous) => ({
      ...previous,
      focusItems: isEditing
        ? previous.focusItems.map((old) => (old.id === item.id ? item : old))
        : [...previous.focusItems, item],
    }));
    edit({ kind: "settings" });
  }

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="settings-header">
          <div className="settings-title">
            <BrandMark size={16} />
            <h2>
              {screen.kind === "settings"
                ? "Configurações"
                : screen.kind === "shortcut"
                  ? screen.item
                    ? "Editar atalho"
                    : "Novo atalho"
                  : screen.item
                    ? "Editar foco"
                    : "Novo foco"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Fechar configurações"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="settings-body">
          {screen.kind === "shortcut" ? (
            <form onSubmit={saveShortcut} className="editor-form">
              <label>
                Nome
                <Input
                  autoFocus
                  required
                  maxLength={60}
                  value={shortcut.label}
                  onChange={(event) =>
                    setShortcut({ ...shortcut, label: event.target.value })
                  }
                />
              </label>
              <label>
                URL
                <Input
                  required
                  type="url"
                  placeholder="https://"
                  value={shortcut.url}
                  onChange={(event) =>
                    setShortcut({ ...shortcut, url: event.target.value })
                  }
                />
              </label>
              <div className="form-row">
                <label>
                  Contexto
                  <select
                    value={shortcut.context}
                    onChange={(event) =>
                      setShortcut({
                        ...shortcut,
                        context: event.target.value as Shortcut["context"],
                      })
                    }
                  >
                    <option value="global">Global</option>
                    {contexts.map((context) => (
                      <option key={context} value={context}>
                        {contextNames[context]}
                      </option>
                    ))}
                  </select>
                </label>
                <IconPicker
                  value={shortcut.icon}
                  label={shortcut.label}
                  url={shortcut.url}
                  onChange={(icon) => setShortcut({ ...shortcut, icon })}
                />
              </div>
              <label>
                Palavras-chave{" "}
                <span className="field-note">separadas por vírgula</span>
                <Input
                  value={shortcut.keywords}
                  onChange={(event) =>
                    setShortcut({ ...shortcut, keywords: event.target.value })
                  }
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={shortcut.favorite}
                  onChange={(event) =>
                    setShortcut({ ...shortcut, favorite: event.target.checked })
                  }
                />{" "}
                Mostrar em favoritos globais
              </label>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  className="secondary-button"
                  onClick={() => edit({ kind: "settings" })}
                >
                  Voltar
                </Button>
                <Button type="submit" className="primary-button">
                  Salvar atalho
                </Button>
              </div>
            </form>
          ) : screen.kind === "focus" ? (
            <form onSubmit={saveFocus} className="editor-form">
              <label>
                Título
                <Input
                  autoFocus
                  required
                  maxLength={70}
                  value={focus.title}
                  onChange={(event) =>
                    setFocus({ ...focus, title: event.target.value })
                  }
                />
              </label>
              <label>
                Descrição
                <Input
                  maxLength={180}
                  value={focus.description}
                  onChange={(event) =>
                    setFocus({ ...focus, description: event.target.value })
                  }
                />
              </label>
              <label>
                URL de destino <span className="field-note">opcional</span>
                <Input
                  type="url"
                  placeholder="https://"
                  value={focus.url}
                  onChange={(event) =>
                    setFocus({ ...focus, url: event.target.value })
                  }
                />
              </label>
              <label>
                Contexto
                <select
                  value={focus.context}
                  onChange={(event) =>
                    setFocus({
                      ...focus,
                      context: event.target.value as ContextId,
                    })
                  }
                >
                  {contexts.map((context) => (
                    <option key={context} value={context}>
                      {contextNames[context]}
                    </option>
                  ))}
                </select>
              </label>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  className="secondary-button"
                  onClick={() => edit({ kind: "settings" })}
                >
                  Voltar
                </Button>
                <Button type="submit" className="primary-button">
                  Salvar foco
                </Button>
              </div>
            </form>
          ) : (
            <div className="settings-sections">
              <section className="settings-section">
                <h3 className="settings-caption">Geral</h3>
                <div className="settings-card">
                  <label className="settings-row">
                    <span className="settings-row-text">
                      <span className="settings-row-title">Mostrar relógio</span>
                      <span className="settings-row-note">
                        A hora aparece ao lado da data no cabeçalho.
                      </span>
                    </span>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={settings.showClock}
                        onChange={(event) =>
                          update((previous) => ({
                            ...previous,
                            showClock: event.target.checked,
                          }))
                        }
                      />
                      <span className="switch-track" aria-hidden="true" />
                    </span>
                  </label>
                  <label className="settings-row">
                    <span className="settings-row-text">
                      <span className="settings-row-title">Pesquisa na web</span>
                      <span className="settings-row-note">
                        Usada quando o texto não é um atalho nem um endereço.
                      </span>
                    </span>
                    <select
                      className="settings-select"
                      value={settings.searchProvider}
                      onChange={(event) =>
                        update((previous) => ({
                          ...previous,
                          searchProvider: event.target
                            .value as Settings["searchProvider"],
                        }))
                      }
                    >
                      <option value="google">Google</option>
                      <option value="duckduckgo">DuckDuckGo</option>
                    </select>
                  </label>
                </div>
              </section>

              <AppearanceSection appearance={appearance} onChange={onAppearance} />

              <section className="settings-section">
                <h3 className="settings-caption">Seções da página</h3>
                <p className="settings-help">
                  Mostre só o que você usa. Fica salvo neste navegador.
                </p>
                <div className="settings-card">
                  {sections.map((section) => (
                    <label className="settings-row" key={section.id}>
                      <span className="settings-row-text">
                        <span className="settings-row-title">{section.name}</span>
                        <span className="settings-row-note">{section.note}</span>
                      </span>
                      <span className="switch">
                        <input
                          type="checkbox"
                          checked={!hiddenSections.includes(section.id)}
                          onChange={() => onToggleSection(section.id)}
                        />
                        <span className="switch-track" aria-hidden="true" />
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="settings-section">
                <div className="settings-caption-row">
                  <h3 className="settings-caption">
                    Atalhos <span>{settings.shortcuts.length}</span>
                  </h3>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => edit({ kind: "shortcut" })}
                  >
                    <Plus size={14} aria-hidden="true" /> Adicionar
                  </button>
                </div>
                <p className="settings-help">
                  Para mudar a ordem, arraste os itens na página inicial (ou use
                  Alt + setas).
                </p>
                <div className="settings-stack">
                  {shortcutGroups.map((group) => {
                    const list = settings.shortcuts
                      .filter((item) => item.context === group)
                      .sort((a, b) => a.order - b.order);
                    if (!list.length) return null;
                    return (
                      <details className="settings-card settings-fold" key={group}>
                        <summary className="settings-row settings-fold-summary">
                          <span className="settings-row-title">{groupName(group)}</span>
                          <span className="settings-fold-count">{list.length}</span>
                          <ChevronRight
                            className="settings-fold-chevron"
                            size={16}
                            aria-hidden="true"
                          />
                        </summary>
                        <div className="settings-fold-body">
                          {list.map((item) => (
                            <div className="settings-row" key={item.id}>
                              <span className="mini-icon">
                                <ShortcutIcon icon={item.icon} label={item.label} url={item.url} />
                              </span>
                              <button
                                type="button"
                                className="list-name"
                                onClick={() => edit({ kind: "shortcut", item })}
                              >
                                {item.label}
                                {item.favorite && <small>Favorito</small>}
                              </button>
                              <button
                                type="button"
                                className="tiny-button danger"
                                aria-label={`Remover ${item.label}`}
                                onClick={() => {
                                  if (window.confirm(`Remover ${item.label}?`))
                                    update((previous) => ({
                                      ...previous,
                                      shortcuts: previous.shortcuts.filter(
                                        (old) => old.id !== item.id,
                                      ),
                                    }));
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>

              <section className="settings-section">
                <div className="settings-caption-row">
                  <h3 className="settings-caption">
                    Em foco <span>{settings.focusItems.length}</span>
                  </h3>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => edit({ kind: "focus" })}
                  >
                    <Plus size={14} aria-hidden="true" /> Adicionar
                  </button>
                </div>
                <p className="settings-help">Até três prioridades por contexto.</p>
                {settings.focusItems.length > 0 && (
                  <div className="settings-card">
                    {settings.focusItems.map((item) => (
                      <div className="settings-row" key={item.id}>
                        <span className="mini-icon">
                          <Target size={16} aria-hidden="true" />
                        </span>
                        <button
                          type="button"
                          className="list-name"
                          onClick={() => edit({ kind: "focus", item })}
                        >
                          {item.title}
                          <small>{contextNames[item.context]}</small>
                        </button>
                        <button
                          type="button"
                          className="tiny-button danger"
                          aria-label={`Remover ${item.title}`}
                          onClick={() => {
                            if (window.confirm(`Remover ${item.title}?`))
                              update((previous) => ({
                                ...previous,
                                focusItems: previous.focusItems.filter(
                                  (old) => old.id !== item.id,
                                ),
                              }));
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <DataSection />

              <section className="settings-section">
                <h3 className="settings-caption">Padrões</h3>
                <div className="settings-card">
                  <button
                    type="button"
                    className="settings-row settings-action is-danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Restaurar os padrões? Todos os atalhos e itens de foco personalizados serão perdidos.",
                        )
                      )
                        update(() => structuredClone(defaultSettings));
                    }}
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    <span className="settings-row-title">Restaurar padrões</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
