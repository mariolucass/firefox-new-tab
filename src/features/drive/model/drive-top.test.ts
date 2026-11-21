import { describe, expect, it } from "vitest";
import { cleanTitle, parseDriveUrl, rankDriveFiles } from "./drive-top";

describe("parseDriveUrl", () => {
  it("reconhece documentos, planilhas, apresentações e formulários", () => {
    expect(parseDriveUrl("https://docs.google.com/document/d/1AbCdEfGhIjK/edit")).toEqual({ kind: "doc", id: "1AbCdEfGhIjK" });
    expect(parseDriveUrl("https://docs.google.com/spreadsheets/u/1/d/1SheetIdXYZ12/edit#gid=0")).toEqual({ kind: "sheet", id: "1SheetIdXYZ12" });
    expect(parseDriveUrl("https://docs.google.com/presentation/d/1SlidesId_123/present")).toEqual({ kind: "slides", id: "1SlidesId_123" });
    expect(parseDriveUrl("https://docs.google.com/forms/d/e/1FAIpQLSformid/viewform")).toEqual({ kind: "form", id: "1FAIpQLSformid" });
  });
  it("reconhece pastas e arquivos do Drive", () => {
    expect(parseDriveUrl("https://drive.google.com/drive/u/0/folders/1FolderId_abc")).toEqual({ kind: "folder", id: "1FolderId_abc" });
    expect(parseDriveUrl("https://drive.google.com/file/d/1FileId-xyz9/view")).toEqual({ kind: "file", id: "1FileId-xyz9" });
  });
  it("ignora o que não é arquivo", () => {
    expect(parseDriveUrl("https://drive.google.com/drive/recent")).toBeNull();
    expect(parseDriveUrl("https://docs.google.com/")).toBeNull();
    expect(parseDriveUrl("https://example.com/document/d/123456789012")).toBeNull();
    expect(parseDriveUrl("não é url")).toBeNull();
  });
});

describe("cleanTitle", () => {
  it("tira o sufixo do produto", () => {
    expect(cleanTitle("Relatório final - Documentos Google")).toBe("Relatório final");
    expect(cleanTitle("Orçamento – Google Sheets")).toBe("Orçamento");
    expect(cleanTitle("Aulas - Google Drive")).toBe("Aulas");
  });
});

describe("rankDriveFiles", () => {
  it("junta variantes do mesmo arquivo e ordena por visitas", () => {
    const ranked = rankDriveFiles([
      { url: "https://docs.google.com/document/d/1DocA0000000/edit", title: "A - Google Docs", visitCount: 3 },
      { url: "https://docs.google.com/document/d/1DocA0000000/preview", title: "A - Google Docs", visitCount: 4 },
      { url: "https://docs.google.com/spreadsheets/d/1SheetB00000/edit", title: "B - Google Sheets", visitCount: 5 },
      { url: "https://drive.google.com/drive/recent", title: "Recentes", visitCount: 50 },
    ]);
    expect(ranked.map((file) => [file.title, file.visits])).toEqual([
      ["A", 7],
      ["B", 5],
    ]);
    expect(ranked[0].url).toBe("https://docs.google.com/document/d/1DocA0000000/edit");
  });
});
