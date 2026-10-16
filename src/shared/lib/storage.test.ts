import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultSettings } from "@shared/model/defaults";
import { loadSettings, saveSettings } from "./storage";

afterEach(() => vi.unstubAllGlobals());

describe("persistência local", () => {
  it("salva e restaura o contexto escolhido no modo web", async () => {
    const data = new Map<string, string>();
    vi.stubGlobal("chrome", undefined);
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    await saveSettings({ ...defaultSettings, activeContext: "academic" });
    expect((await loadSettings()).settings.activeContext).toBe("academic");
  });

  it("não sobrescreve dados corrompidos durante a leitura", async () => {
    let writes = 0;
    vi.stubGlobal("chrome", undefined);
    vi.stubGlobal("localStorage", {
      getItem: () => "{invalid",
      setItem: () => {
        writes += 1;
      },
    });
    const result = await loadSettings();
    expect(result.error).toBeTruthy();
    expect(result.settings.activeContext).toBe(defaultSettings.activeContext);
    expect(writes).toBe(0);
  });
});
