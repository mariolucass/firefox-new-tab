import { describe, expect, it } from "vitest";
import {
  frequentNotSaved,
  isNoiseHost,
  siteName,
  type TopSite,
} from "./top-sites";

const site = (host: string, title = host): TopSite => ({
  url: `https://${host}/`,
  title,
  host,
});

describe("frequentes", () => {
  it("ignora localhost, IPs, logins e o que já é atalho", () => {
    const sites = [
      site("localhost:3030"),
      site("127.0.0.1:8080"),
      site("192.168.0.2"),
      site("accounts.google.com"),
      site("github.com"),
      site("electricitymaps.com"),
    ];
    const saved = [
      {
        id: "a",
        label: "GitHub",
        url: "https://github.com",
        context: "global" as const,
        keywords: [],
        order: 0,
        favorite: true,
      },
    ];
    expect(frequentNotSaved(sites, saved).map((item) => item.host)).toEqual([
      "electricitymaps.com",
    ]);
  });

  it("dá nomes curtos que cabem no bloco", () => {
    expect(
      siteName(
        site("jobs.quickin.io", "Vagas abertas em empresas de tecnologia"),
      ),
    ).toBe("Quickin");
    expect(
      siteName(
        site("biblioteca.ifce.edu.br", "Sistema Pergamum - Biblioteca IFCE"),
      ),
    ).toBe("Biblioteca");
    expect(
      siteName(site("www.reddit.com", "Reddit - Dive into anything")),
    ).toBe("Reddit");
    expect(siteName(site("electricitymaps.com", "electricitymaps.com"))).toBe(
      "Electricitymaps",
    );
  });
});

describe("isNoiseHost", () => {
  it("marca localhost, IPs, .local e logins; deixa sites normais", () => {
    for (const host of [
      "localhost:3001",
      "127.0.0.1:80",
      "192.168.0.2",
      "app.local",
      "accounts.google.com",
    ])
      expect(isNoiseHost(host)).toBe(true);
    for (const host of ["github.com", "docs.google.com"])
      expect(isNoiseHost(host)).toBe(false);
  });
});
