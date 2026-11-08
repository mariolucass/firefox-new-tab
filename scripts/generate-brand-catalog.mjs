import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as simpleIcons from "simple-icons";

const output = join(process.cwd(), "public", "icon-data");
await mkdir(output, { recursive: true });
await Promise.all((await readdir(output)).filter((file) => file.endsWith(".json")).map((file) => unlink(join(output, file))));

const groups = new Map();
const index = [];
function bucket(slug) {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i++) hash = Math.imul(hash ^ slug.charCodeAt(i), 16777619);
  return (hash >>> 0 & 63).toString(16).padStart(2, "0");
}
for (const value of Object.values(simpleIcons)) {
  if (!value || typeof value !== "object" || !value.slug || !value.path) continue;
  const icon = { title: value.title, hex: value.hex, path: value.path };
  const group = bucket(value.slug);
  if (!groups.has(group)) groups.set(group, {});
  groups.get(group)[value.slug] = icon;
  index.push([value.slug, value.title]);
}

await Promise.all([
  writeFile(join(output, "index.json"), JSON.stringify(index)),
  ...[...groups].map(([letter, icons]) =>
    writeFile(join(output, `${letter}.json`), JSON.stringify(icons)),
  ),
]);
