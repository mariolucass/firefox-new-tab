import { describe, expect, it } from "vitest";
import { normalizeVoice } from "./voice";

describe("normalizeVoice", () => {
  it("vira comando", () => {
    expect(normalizeVoice("Adicionar tarefa comprar café.")).toBe(
      "+ comprar café",
    );
    expect(normalizeVoice("anotar ideia de projeto")).toBe(
      "nota ideia de projeto",
    );
    expect(normalizeVoice("iniciar foco de 45 minutos")).toBe("foco 45");
    expect(normalizeVoice("foco")).toBe("foco");
    expect(normalizeVoice("ir para acadêmico")).toBe("ir acadêmico");
  });
  it("direciona para a IA falada", () => {
    expect(normalizeVoice("Pergunte ao Claude como funciona um closure")).toBe(
      "cl como funciona um closure",
    );
    expect(
      normalizeVoice("pergunte ao chat gpt qual a capital da Suíça?"),
    ).toBe("gpt qual a capital da Suíça");
    expect(normalizeVoice("gemini, resuma este texto")).toBe(
      "gem resuma este texto",
    );
    expect(normalizeVoice("pergunte à IA o que é rag")).toBe("ia o que é rag");
  });
  it("busca comum fica como dita", () => {
    expect(normalizeVoice("pesquisar react hooks")).toBe("react hooks");
    expect(normalizeVoice("abrir github")).toBe("abrir github");
    expect(normalizeVoice("receita de bolo")).toBe("receita de bolo");
  });
});
