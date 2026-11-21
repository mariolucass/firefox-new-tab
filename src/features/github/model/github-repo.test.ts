import { describe, expect, it } from "vitest";
import { parseRepo } from "./github-repo";

describe("parseRepo", () => {
  it("aceita owner/nome e links", () => {
    expect(parseRepo("mariolucass/echoes")).toBe("mariolucass/echoes");
    expect(parseRepo("https://github.com/mariolucass/iron-ledger")).toBe("mariolucass/iron-ledger");
    expect(parseRepo("https://github.com/mariolucass/iron-ledger.git")).toBe("mariolucass/iron-ledger");
    expect(parseRepo("github.com/mariolucass/iron-ledger/pull/13")).toBe("mariolucass/iron-ledger");
    expect(parseRepo("https://github.com/mariolucass/a.b?tab=readme")).toBe("mariolucass/a.b");
  });
  it("recusa o que não é repositório", () => {
    expect(parseRepo("")).toBeNull();
    expect(parseRepo("https://vercel.com/x/y")).toBeNull();
    expect(parseRepo("so-uma-palavra")).toBeNull();
    expect(parseRepo(undefined)).toBeNull();
  });
});
