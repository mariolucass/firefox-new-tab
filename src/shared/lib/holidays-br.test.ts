import { describe, expect, it } from "vitest";
import { easter, holidayOn } from "./holidays-br";

describe("feriados brasileiros", () => {
  it("calcula a Páscoa", () => {
    expect(easter(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
    expect(easter(2025).toDateString()).toBe(new Date(2025, 3, 20).toDateString());
  });
  it("reconhece os fixos", () => {
    expect(holidayOn(new Date(2026, 10, 20))).toBe("Consciência Negra");
    expect(holidayOn(new Date(2026, 8, 7))).toBe("Independência do Brasil");
    expect(holidayOn(new Date(2026, 11, 25))).toBe("Natal");
  });
  it("reconhece os móveis de 2026", () => {
    expect(holidayOn(new Date(2026, 3, 3))).toBe("Sexta-feira Santa");
    expect(holidayOn(new Date(2026, 1, 16))).toMatch(/Carnaval/);
    expect(holidayOn(new Date(2026, 1, 17))).toMatch(/Carnaval/);
    expect(holidayOn(new Date(2026, 5, 4))).toMatch(/Corpus Christi/);
  });
  it("dia comum é null", () => {
    expect(holidayOn(new Date(2026, 10, 19))).toBeNull();
  });
});
