import { describe, expect, it } from "vitest";
import { defaultSettings } from "./defaults";
import { parseSettings, validUrl } from "./settings";
import { importSettings } from "@shared/lib/storage";

describe("configurações", () => {
  it("aceita os padrões e mantém os 12 favoritos", () => {
    expect(
      parseSettings(defaultSettings).shortcuts.filter((item) => item.favorite),
    ).toHaveLength(12);
  });

  it("rejeita esquemas perigosos em atalhos e foco", () => {
    expect(validUrl("javascript:alert(1)")).toBeNull();
    expect(validUrl("data:text/html,hello")).toBeNull();
    expect(() =>
      parseSettings({
        ...defaultSettings,
        shortcuts: [
          { ...defaultSettings.shortcuts[0], url: "javascript:alert(1)" },
        ],
      }),
    ).toThrow();
  });

  it("rejeita importação inválida ou versão incompatível sem alterar o objeto atual", () => {
    const original = structuredClone(defaultSettings);
    expect(() =>
      importSettings(JSON.stringify({ ...original, version: 2 })),
    ).toThrow();
    expect(() => importSettings("{")).toThrow();
    expect(defaultSettings).toEqual(original);
  });

  it("rejeita IDs repetidos e mais de três focos por contexto", () => {
    expect(() =>
      parseSettings({
        ...defaultSettings,
        shortcuts: [defaultSettings.shortcuts[0], defaultSettings.shortcuts[0]],
      }),
    ).toThrow();
    const item = defaultSettings.focusItems[0];
    expect(() =>
      parseSettings({
        ...defaultSettings,
        focusItems: [
          item,
          ...Array.from({ length: 3 }, (_, index) => ({
            ...item,
            id: `extra-${index}`,
          })),
        ],
      }),
    ).toThrow();
  });
});
