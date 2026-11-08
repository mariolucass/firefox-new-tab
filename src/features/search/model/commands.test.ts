import { describe, expect, it } from "vitest";
import { parseCommands } from "./commands";

describe("parseCommands", () => {
  it("reconhece tarefa por + e t", () => {
    expect(parseCommands("+ comprar café")).toEqual([{ type: "task", text: "comprar café" }]);
    expect(parseCommands("t ligar pro banco")).toEqual([{ type: "task", text: "ligar pro banco" }]);
  });
  it("reconhece foco com e sem minutos", () => {
    expect(parseCommands("foco")).toEqual([{ type: "focus", minutes: 25 }]);
    expect(parseCommands("foco 45")).toEqual([{ type: "focus", minutes: 45 }]);
    expect(parseCommands("foco 999")).toEqual([]);
  });
  it("troca de contexto por @ e ir, com prefixo e sem acento", () => {
    expect(parseCommands("@")).toHaveLength(4);
    expect(parseCommands("@dev")).toEqual([{ type: "context", context: "development" }]);
    expect(parseCommands("@acad")).toEqual([{ type: "context", context: "academic" }]);
    expect(parseCommands("ir carreira")).toEqual([{ type: "context", context: "career" }]);
    expect(parseCommands("@zzz")).toEqual([]);
  });
  it("deixa o resto como busca", () => {
    expect(parseCommands("github")).toEqual([]);
    expect(parseCommands("t")).toEqual([]);
    expect(parseCommands("dev")).toEqual([]);
  });
});
