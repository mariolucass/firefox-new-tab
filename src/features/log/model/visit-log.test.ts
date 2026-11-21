import { describe, expect, it } from "vitest";
import { hostStats, markdownSummary, queryStats, suggestions, type Visit } from "./visit-log";

const v = (host: string, source: Visit["source"], query?: string, at = 1000): Visit => ({
  at,
  url: `https://${host}/x`,
  host,
  label: host,
  source,
  context: "Desenvolvimento",
  query,
});

describe("registro de acessos", () => {
  const log: Visit[] = [
    ...Array.from({ length: 5 }, () => v("ilovepdf.com", "busca", "juntar pdf")),
    v("ilovepdf.com", "favorito"),
    v("github.com", "favorito"),
    v("github.com", "favorito"),
  ];
  it("conta por domínio e origem", () => {
    const [top] = hostStats(log);
    expect(top.host).toBe("ilovepdf.com");
    expect(top.count).toBe(6);
    expect(top.bySource).toEqual({ busca: 5, favorito: 1 });
  });
  it("agrupa termos de busca", () => {
    expect(queryStats(log)[0]).toEqual({ query: "juntar pdf", count: 5 });
  });
  it("sugere atalho para o que é aberto pela busca e não tem atalho", () => {
    const ideas = suggestions(log, new Set(["github.com"]));
    expect(ideas[0]).toMatchObject({ kind: "shortcut", url: "https://ilovepdf.com/x" });
    expect(ideas.some((idea) => idea.kind === "search")).toBe(true);
    expect(ideas.some((idea) => idea.title.includes("github.com"))).toBe(false);
  });
  it("sugere favoritar o atalho que existe mas é aberto pela busca", () => {
    const ideas = suggestions(log, new Set(["github.com", "ilovepdf.com"]), 0, new Set(["github.com"]));
    expect(ideas[0]).toMatchObject({ kind: "favorite", host: "ilovepdf.com" });
  });
  it("gera o resumo em Markdown", () => {
    const md = markdownSummary(log, 0, "tudo");
    expect(md).toContain("| ilovepdf.com | 6 |");
    expect(md).toContain('"juntar pdf" — 5×');
  });
});
