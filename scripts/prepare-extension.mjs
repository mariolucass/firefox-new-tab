import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const output = join(import.meta.dirname, "..", "out");

for (const page of ["index.html", "404.html"]) {
  const path = join(output, page);
  let html = await readFile(path, "utf8");
  const inlineScripts = [];

  html = html.replace(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/g,
    (tag, attributes, source) => {
      if (/\bsrc\s*=/.test(attributes) || !source.trim()) return tag;
      const name = `inline-${page.replace(".html", "")}-${inlineScripts.length}.js`;
      inlineScripts.push({ name, source });
      return `<script${attributes} src="./_next/${name}"></script>`;
    },
  );

  for (const { name, source } of inlineScripts) {
    await writeFile(join(output, "_next", name), source);
  }
  await writeFile(path, html);

  if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(html)) {
    throw new Error(`Inline script remains in ${page}`);
  }
}

// Com assetPrefix ".", o CSS referencia fontes como url(_next/static/media/...),
// relativo ao próprio arquivo em _next/static/css/. Reaponta para ../media/.
const cssDir = join(output, "_next", "static", "css");
for (const file of await readdir(cssDir)) {
  if (!file.endsWith(".css")) continue;
  const path = join(cssDir, file);
  const css = await readFile(path, "utf8");
  await writeFile(path, css.replaceAll("url(_next/static/media/", "url(../media/"));
}
