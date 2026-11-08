import { describe, expect, it } from "vitest";
import { parseBang } from "./bangs";

describe("parseBang", () => {
  it("reconhece o prefixo e separa o texto", () => {
    const result = parseBang("gh react hooks");
    expect(result?.bang.name).toBe("GitHub");
    expect(result?.text).toBe("react hooks");
    expect(result?.bang.url("a b")).toBe("https://github.com/search?q=a%20b");
  });
  it("ignora prefixo sem texto ou desconhecido", () => {
    expect(parseBang("gh")).toBeNull();
    expect(parseBang("gh ")).toBeNull();
    expect(parseBang("zzz algo")).toBeNull();
  });
});
