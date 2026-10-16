import { describe, expect, it } from "vitest";
import { defaultSettings } from "@shared/model/defaults";
import { filterItems } from "./filter";

describe("busca local", () => {
  it("encontra nome, categoria e palavras-chave sem distinguir acentos", () => {
    expect(filterItems(defaultSettings.shortcuts, [], "git")[0].label).toBe(
      "GitHub",
    );
    expect(
      filterItems(defaultSettings.shortcuts, [], "repositorio")[0].label,
    ).toBe("GitHub");
    expect(
      filterItems(defaultSettings.shortcuts, [], "acadêmico").some(
        (item) => item.label === "Q-Acadêmico",
      ),
    ).toBe(true);
  });

  it("inclui projetos somente depois de configurar uma URL", () => {
    expect(filterItems([], defaultSettings.focusItems, "echoes")).toHaveLength(
      0,
    );
    const configured = [
      { ...defaultSettings.focusItems[0], url: "https://example.com" },
    ];
    expect(filterItems([], configured, "echoes")[0].type).toBe("project");
  });
});
