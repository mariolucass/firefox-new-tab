import { describe, expect, it } from "vitest";
import { defaultSettings } from "@shared/model/defaults";
import { parseBackup } from "./backup";

const valid = {
  format: "nexo-backup",
  version: 1,
  exportedAt: "2026-01-01T00:00:00.000Z",
  settings: defaultSettings,
  data: { "nt-notes": "[]", "chave-estranha": "x" },
};

describe("backup", () => {
  it("aceita um backup válido e descarta chaves fora da lista", () => {
    const backup = parseBackup(JSON.stringify(valid));
    expect(backup.data).toEqual({ "nt-notes": "[]" });
  });
  it("recusa arquivos que não são do Nexo", () => {
    expect(() => parseBackup(JSON.stringify({ ...valid, format: "outro" }))).toThrow();
  });
  it("recusa configurações inválidas", () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...valid, settings: { version: 2 } })),
    ).toThrow();
  });
  it("recusa dados que não são JSON", () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...valid, data: { "nt-notes": "{quebrado" } })),
    ).toThrow();
  });
});
