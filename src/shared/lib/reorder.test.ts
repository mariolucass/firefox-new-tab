import { describe, expect, it } from "vitest";
import { reorderByIds } from "./reorder";

describe("reorderByIds", () => {
  it("redistribui as posições só entre os ids dados", () => {
    const items = [
      { id: "a", order: 0 },
      { id: "x", order: 1 },
      { id: "b", order: 2 },
      { id: "c", order: 3 },
    ];
    const result = reorderByIds(items, ["c", "a", "b"]);
    expect(Object.fromEntries(result.map((i) => [i.id, i.order]))).toEqual({
      c: 0,
      a: 2,
      b: 3,
      x: 1,
    });
  });
});
