// Gera o build estático e sincroniza só o necessário para a extensão do Firefox
// na pasta de destino (espelho: arquivos obsoletos são removidos).
//
// Uso: pnpm deploy:ext [destino] [--skip-build]
// Destino: argumento > NEWTAB_DEST > padrão abaixo (convertido para /mnt/<letra> no WSL).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

const root = join(import.meta.dirname, "..");
const out = join(root, "out");
const DEFAULT_DEST = String.raw`G:\My Drive\08-Workstation\Aplicativos\Firefox Developer Edition\new-tab`;
const GECKO_ID = "nexo-new-tab@local";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
let dest = args.find((arg) => !arg.startsWith("--")) ?? process.env.NEWTAB_DEST ?? DEFAULT_DEST;

const drive = /^([a-z]):[\\/]/i.exec(dest);
if (drive && process.platform !== "win32") {
  dest = `/mnt/${drive[1].toLowerCase()}/${dest.slice(3).replaceAll("\\", "/")}`;
}

if (drive && process.platform !== "win32" && (await readdir(`/mnt/${drive[1].toLowerCase()}`).catch(() => [])).length === 0) {
  console.error(
    `A unidade ${drive[1].toUpperCase()}: não está montada no WSL.\n` +
      `Monte com: sudo mount -t drvfs ${drive[1].toUpperCase()}: /mnt/${drive[1].toLowerCase()}\n` +
      `ou rode o script pelo Windows (node scripts/deploy-extension.mjs), ou passe outro destino.`,
  );
  process.exit(1);
}

if (!skipBuild) {
  // .next/dev guarda tipos antigos que quebram o typecheck.
  await rm(join(root, ".next"), { recursive: true, force: true });
  const build = spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

// Arquivos que a extensão nunca usa: payloads RSC (.txt), 404 e _not-found.
// De public/brand a extensão só precisa do que a página e a aba usam.
const brandKept = new Set(["mark.svg", "wordmark.svg", "favicon.svg", "favicon.ico"]);
const skip = (path) =>
  (path.startsWith("brand/") && !brandKept.has(path.slice(6))) ||
  path.endsWith(".txt") || path.startsWith("_not-found") || path === "404.html" || path.startsWith("_next/inline-404") || path.endsWith(".map");

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const hash = (buffer) => createHash("sha1").update(buffer).digest("hex");

// Origem em memória: relpath -> Buffer.
const files = new Map();
for (const file of await walk(out)) {
  const rel = relative(out, file).split(sep).join("/");
  if (skip(rel)) continue;
  let data = await readFile(file);
  if (rel === "manifest.json") {
    const manifest = JSON.parse(data.toString("utf8"));
    manifest.browser_specific_settings = {
      gecko: { id: GECKO_ID, strict_min_version: "115.0" },
    };
    // Botão Home e janelas novas abrem o Nexo. Só no Firefox: ele resolve
    // "index.html" relativo à extensão (FORMATS.relativeUrl no Schemas.sys.mjs);
    // o Chromium exige URL absoluta aqui, por isso fica fora de public/manifest.json.
    // Na primeira vez, o Firefox pergunta se mantém a mudança; escolha manter.
    manifest.chrome_settings_overrides = { homepage: "index.html" };
    data = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  }
  files.set(rel, data);
}
if (!files.has("index.html") || !files.has("manifest.json")) {
  throw new Error("Build incompleto: index.html ou manifest.json ausente em out/.");
}

await mkdir(dest, { recursive: true });

// Ordem: assets com hash primeiro, index.html e manifest por último, para que
// uma aba aberta durante a cópia nunca aponte para arquivo inexistente.
const last = new Set(["index.html", "manifest.json"]);
const ordered = [...files.keys()].sort((a, b) => Number(last.has(a)) - Number(last.has(b)));

let written = 0;
for (const rel of ordered) {
  const target = join(dest, ...rel.split("/"));
  const data = files.get(rel);
  if (existsSync(target) && hash(await readFile(target)) === hash(data)) continue;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  written++;
}

// Remove o que não existe mais no build.
let removed = 0;
for (const file of await walk(dest)) {
  const rel = relative(dest, file).split(sep).join("/");
  if (files.has(rel)) continue;
  await rm(file);
  removed++;
}
// Diretórios vazios.
async function prune(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sub = join(dir, entry.name);
    await prune(sub);
    if ((await readdir(sub)).length === 0) await rm(sub, { recursive: true });
  }
}
await prune(dest);

const size = [...files.values()].reduce((sum, data) => sum + data.length, 0);
console.log(
  `Extensão em ${dest}\n${files.size} arquivos, ${(size / 1024).toFixed(0)} KiB — ${written} gravados, ${removed} removidos.`,
);
