import { describe, expect, it } from "vitest";
import { isDueToday, repeatsOn, type Task } from "./use-today";

const task = (extra: Partial<Task>): Task => ({ id: "1", text: "t", done: false, ...extra });

describe("tarefas recorrentes e com data", () => {
  it("diária vale todo dia; dias úteis pula o fim de semana", () => {
    expect(repeatsOn(task({ repeat: "daily" }), "2026-11-08", "2026-11-07")).toBe(true); // domingo
    expect(repeatsOn(task({ repeat: "weekdays" }), "2026-11-08", "2026-11-07")).toBe(false); // domingo
    expect(repeatsOn(task({ repeat: "weekdays" }), "2026-11-09", "2026-11-08")).toBe(true); // segunda
  });
  it("semanal repete no dia da semana da data (ou do cadastro)", () => {
    const weekly = task({ repeat: "weekly", due: "2026-11-02" }); // segunda
    expect(repeatsOn(weekly, "2026-11-09", "2026-11-08")).toBe(true);
    expect(repeatsOn(weekly, "2026-11-10", "2026-11-09")).toBe(false);
  });
  it("sem recorrência nunca volta", () => {
    expect(repeatsOn(task({}), "2026-11-09", "2026-11-08")).toBe(false);
  });
  it("data futura fica guardada; hoje e atrasada aparecem", () => {
    expect(isDueToday(task({ due: "2026-11-09" }), "2026-11-08")).toBe(false);
    expect(isDueToday(task({ due: "2026-11-08" }), "2026-11-08")).toBe(true);
    expect(isDueToday(task({ due: "2026-11-01" }), "2026-11-08")).toBe(true);
    expect(isDueToday(task({}), "2026-11-08")).toBe(true);
  });
});
