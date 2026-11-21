import { describe, expect, it } from "vitest";
import { calculate, formatResult } from "./calc";

describe("calculate", () => {
  it("faz contas com precedência e parênteses", () => {
    expect(calculate("2+3*4")).toBe(14);
    expect(calculate("(2+3)*4")).toBe(20);
    expect(calculate("2^3^2")).toBe(512);
    expect(calculate("-5+2")).toBe(-3);
    expect(calculate("10 / 4")).toBe(2.5);
  });
  it("entende o jeito brasileiro de escrever", () => {
    expect(calculate("1250*0,15")).toBe(187.5);
    expect(calculate("2.500 / 2")).toBe(1250);
    expect(calculate("3 x 4")).toBe(12);
    expect(calculate("20% de 350")).toBe(70);
    expect(calculate("=12*3")).toBe(36);
  });
  it("não responde ao que não é conta", () => {
    expect(calculate("react hooks")).toBeNull();
    expect(calculate("42")).toBeNull();
    expect(calculate("-7")).toBeNull();
    expect(calculate("2025")).toBeNull();
    expect(calculate("1+")).toBeNull();
    expect(calculate("1/0")).toBeNull();
    expect(calculate("gh 2+2")).toBeNull();
  });
  it("formata em pt-BR", () => {
    expect(formatResult(187.5)).toBe("187,5");
  });
});
