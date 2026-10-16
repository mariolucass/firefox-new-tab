import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { defaultSettings } from "@shared/model/defaults";
import { Button } from "@shared/ui/button";
import { ShortcutIcon } from "@shared/ui/shortcut-icon";
import { Input } from "@shared/ui/input";
import { exportSettings, importSettings } from "@shared/lib/storage";
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
  | { kind: "shortcut"; item?: Shortcut }
  | { kind: "focus"; item?: FocusItem };
type Props = {
  target: EditorTarget;
  settings: Settings;
  update: (change: (previous: Settings) => Settings) => void;
  onClose: () => void;
  onError: (error: string | null) => void;
};

function shortcutDraft(item?: Shortcut) {
  return {
    label: item?.label ?? "",
    url: item?.url ?? "",
    context: item?.context ?? "development",
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

export function SettingsPanel({
  target,
  settings,
  update,
  onClose,
  onError,
}: Props) {
  const [screen, setScreen] = useState<EditorTarget>(target);
  const [shortcut, setShortcut] = useState(() =>
    shortcutDraft(target.kind === "shortcut" ? target.item : undefined),
  );
  const [focus, setFocus] = useState(() =>
    focusDraft(
      target.kind === "focus" ? target.item : undefined,
      settings.activeContext,
    ),
  );
  const [formError, setFormError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
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
      shortcutDraft(next.kind === "shortcut" ? next.item : undefined),
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

  function move(id: string, direction: -1 | 1) {
    update((previous) => {
      const sorted = [...previous.shortcuts].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const other = sorted[index + direction];
      if (!other) return previous;
      [sorted[index], sorted[index + direction]] = [
        sorted[index + direction],
        sorted[index],
      ];
      return {
        ...previous,
        shortcuts: sorted.map((item, order) => ({ ...item, order })),
      };
    });
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 512_000) {
      onError("Arquivo muito grande para configurações.");
      return;
    }
    try {
      const imported = importSettings(await file.text());
      update(() => imported);
      onError(null);
      edit({ kind: "settings" });
    } catch {
      onError(
        "Arquivo inválido ou de versão incompatível. As configurações atuais foram mantidas.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  function download() {
    const blob = new Blob([exportSettings(settings)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "personal-os-settings.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          <div>
            <span className="eyebrow">PERSONAL OS</span>
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
                <label>
                  Ícone (até 2 letras)
                  <Input
                    maxLength={2}
                    value={shortcut.icon}
                    onChange={(event) =>
                      setShortcut({ ...shortcut, icon: event.target.value })
                    }
                  />
                </label>
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
            <>
              <div className="settings-group">
                <div className="settings-group-title">
                  <h3>
                    Atalhos <span>{settings.shortcuts.length}</span>
                  </h3>
                  <button
                    className="text-button"
                    onClick={() => edit({ kind: "shortcut" })}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
                <p>
                  Edite URLs, favoritos e ordem. Use as setas para reorganizar.
                </p>
                <div className="settings-list">
                  {[...settings.shortcuts]
                    .sort((a, b) => a.order - b.order)
                    .map((item, index) => (
                      <div className="settings-list-row" key={item.id}>
                        <span className="mini-icon">
                          <ShortcutIcon icon={item.icon} label={item.label} />
                        </span>
                        <button
                          className="list-name"
                          onClick={() => edit({ kind: "shortcut", item })}
                        >
                          {item.label}
                          <small>
                            {item.favorite ? "Favorito · " : ""}
                            {item.context === "global"
                              ? "Global"
                              : contextNames[item.context]}
                          </small>
                        </button>
                        <button
                          className="tiny-button"
                          disabled={index === 0}
                          aria-label={`Mover ${item.label} para cima`}
                          onClick={() => move(item.id, -1)}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          className="tiny-button"
                          disabled={index === settings.shortcuts.length - 1}
                          aria-label={`Mover ${item.label} para baixo`}
                          onClick={() => move(item.id, 1)}
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
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
              </div>
              <div className="settings-group">
                <div className="settings-group-title">
                  <h3>
                    Itens de foco <span>{settings.focusItems.length}</span>
                  </h3>
                  <button
                    className="text-button"
                    onClick={() => edit({ kind: "focus" })}
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
                <p>Até três prioridades por contexto.</p>
                <div className="settings-list">
                  {settings.focusItems.map((item) => (
                    <div className="settings-list-row" key={item.id}>
                      <span className="mini-icon">◎</span>
                      <button
                        className="list-name"
                        onClick={() => edit({ kind: "focus", item })}
                      >
                        {item.title}
                        <small>{contextNames[item.context]}</small>
                      </button>
                      <button
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
              </div>
              <div className="settings-group">
                <h3>Preferências</h3>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={settings.showClock}
                    onChange={(event) =>
                      update((previous) => ({
                        ...previous,
                        showClock: event.target.checked,
                      }))
                    }
                  />{" "}
                  Mostrar relógio
                </label>
                <label className="select-row">
                  Pesquisa na web
                  <select
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
              <div className="settings-group">
                <h3>Dados locais</h3>
                <p>
                  Configurações permanecem neste navegador. O JSON exportado
                  contém seus links e prioridades.
                </p>
                <div className="data-actions">
                  <button className="secondary-button" onClick={download}>
                    <Download size={16} /> Exportar JSON
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload size={16} /> Importar JSON
                  </button>
                  <input
                    ref={fileInput}
                    className="sr-only"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) =>
                      void importFile(event.target.files?.[0])
                    }
                  />
                  <button
                    className="secondary-button danger"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Restaurar os padrões? Todos os atalhos e itens de foco personalizados serão perdidos.",
                        )
                      )
                        update(() => structuredClone(defaultSettings));
                    }}
                  >
                    Restaurar padrões
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
