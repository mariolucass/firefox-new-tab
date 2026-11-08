import { describe, expect, it } from "vitest";
import { defaultSettings } from "@shared/model/defaults";
import type { Settings, Shortcut } from "@shared/model/settings";
import { migrateSettings } from "./storage";

/** Dados salvos como a versão 0.1 os gravava: só atalhos de fábrica. */
function legacySettings(): Settings {
  const old: Array<[string, string]> = [
    ["GitHub", "https://github.com"],
    ["Gupy", "https://www.gupy.io"],
    ["Q-Acadêmico", "https://novo.qacademico.ifce.edu.br/"],
  ];
  const shortcuts: Shortcut[] = old.map(([label, url], order) => ({
    id: `default-${order}`,
    label,
    url,
    context: "development",
    keywords: [],
    order,
    favorite: order === 0,
  }));
  return {
    ...structuredClone(defaultSettings),
    activeContext: "academic",
    showClock: false,
    shortcuts,
  };
}

describe("migração do catálogo de fábrica", () => {
  it("troca atalhos de fábrica intocados e preserva as preferências", () => {
    const { settings, migrated } = migrateSettings(legacySettings());
    expect(migrated).toBe(true);
    expect(settings.shortcuts).toEqual(defaultSettings.shortcuts);
    expect(settings.activeContext).toBe("academic");
    expect(settings.showClock).toBe(false);
  });

  it("não mexe em nada se houver um atalho próprio", () => {
    const custom = legacySettings();
    custom.shortcuts.push({
      id: "meu",
      label: "Meu site",
      url: "https://example.com",
      context: "personal",
      keywords: [],
      order: 9,
      favorite: false,
    });
    const { settings, migrated } = migrateSettings(custom);
    expect(migrated).toBe(false);
    expect(settings).toBe(custom);
  });

  it("não mexe em nada se um atalho de fábrica foi editado", () => {
    const edited = legacySettings();
    edited.shortcuts[1] = {
      ...edited.shortcuts[1],
      url: "https://www.gupy.io/vagas",
    };
    expect(migrateSettings(edited).migrated).toBe(false);
  });

  it("não migra de novo quem já está no catálogo atual", () => {
    expect(migrateSettings(structuredClone(defaultSettings)).migrated).toBe(
      false,
    );
  });
});
