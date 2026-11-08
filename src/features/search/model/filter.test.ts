import { describe, expect, it } from "vitest";
import { defaultSettings } from "@shared/model/defaults";
import { filterItems, typedUrl } from "./filter";

const labels = (query: string) =>
  filterItems(defaultSettings.shortcuts, [], query).map((item) => item.label);

describe("busca local", () => {
  it("encontra nome, categoria e palavras-chave sem distinguir acentos", () => {
    expect(labels("git")[0]).toBe("GitHub");
    expect(labels("repositorio")).toContain("GitHub");
    expect(labels("acadêmico")).toContain("Q-Acadêmico");
    expect(labels("academico")).toContain("Q-Acadêmico");
  });

  it("acha atalhos pelo domínio", () => {
    expect(labels("classroom.google")).toContain("Classroom");
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

  it("acrescenta frequentes sem repetir o domínio de um atalho", () => {
    const frequent = [
      { url: "https://github.com/", title: "GitHub", host: "github.com" },
      { url: "https://gitlab.com/", title: "GitLab", host: "gitlab.com" },
    ];
    const results = filterItems(defaultSettings.shortcuts, [], "git", frequent);
    expect(results.filter((item) => item.host === "github.com")).toHaveLength(
      results.filter((item) => item.host === "github.com" && item.type === "shortcut").length,
    );
    expect(results.some((item) => item.type === "frequent" && item.host === "gitlab.com")).toBe(true);
  });
});

describe("endereço digitado", () => {
  it("reconhece domínios, caminhos, localhost e IPs", () => {
    expect(typedUrl("github.com/mariolucass")).toBe("https://github.com/mariolucass");
    expect(typedUrl("localhost:3000")).toBe("http://localhost:3000");
    expect(typedUrl("192.168.0.10:8080/admin")).toBe("http://192.168.0.10:8080/admin");
    expect(typedUrl("https://example.com")).toBe("https://example.com");
  });

  it("não trata texto comum como endereço", () => {
    expect(typedUrl("como fazer bolo")).toBeNull();
    expect(typedUrl("gemini")).toBeNull();
    expect(typedUrl("javascript:alert(1)")).toBeNull();
  });
});
