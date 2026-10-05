import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
const errors = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const bannedKeys = new Set([
  "founder",
  "employee",
  "numberOfEmployees",
  "telephone",
  "email",
  "offers",
  "price",
  "priceRange",
  "priceSpecification",
]);

function walkJson(node, file) {
  if (Array.isArray(node)) {
    node.forEach((item) => walkJson(item, file));
    return;
  }
  if (!node || typeof node !== "object") return;
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes("Person")) errors.push(`${file}: JSON-LD contains Person`);
  for (const [key, value] of Object.entries(node)) {
    if (bannedKeys.has(key)) errors.push(`${file}: JSON-LD contains ${key}`);
    walkJson(value, file);
  }
}

function pagePath(file) {
  const rel = path.relative(dist, file).replaceAll("\\", "/");
  if (rel === "index.html") return "/";
  if (rel === "404.html") return "/404";
  return `/${rel.replace(/\/index\.html$/, "").replace(/\.html$/, "")}`;
}

function expectsNoindex(urlPath) {
  if (urlPath === "/404") return true;
  if (urlPath === "/we-are/ceo" || urlPath === "/en/we-are/ceo") return true;
  if (urlPath === "/contact/thanks" || urlPath === "/en/contact/thanks") return true;
  if (urlPath.includes("/trends/tag/") || urlPath.endsWith("/trends/tag")) return true;
  if (/^\/en\/trends\/[^/]+$/.test(urlPath)) return true;
  return false;
}

const files = await walk(dist);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const urlPath = pagePath(file);
  const h1 = html.match(/<h1[\s>]/g) ?? [];
  if (h1.length !== 1) errors.push(`${urlPath}: expected 1 h1, found ${h1.length}`);

  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const noindex = expectsNoindex(urlPath);
  if (noindex) {
    if (!html.includes('name="robots" content="noindex, follow"')) errors.push(`${urlPath}: missing noindex`);
    if (scripts.length) errors.push(`${urlPath}: noindex page has JSON-LD`);
  } else if (!scripts.length) {
    errors.push(`${urlPath}: missing JSON-LD`);
  } else if (!html.includes("https://neolev.jp/#organization")) {
    errors.push(`${urlPath}: JSON-LD missing #organization`);
  }

  for (const match of scripts) {
    try {
      walkJson(JSON.parse(match[1]), urlPath);
    } catch (error) {
      errors.push(`${urlPath}: JSON-LD parse failed (${error.message})`);
    }
  }

  const visible = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  if (visible.includes("1290001111832")) errors.push(`${urlPath}: corporate number outside JSON-LD`);
  if (html.includes("T1290001111832")) errors.push(`${urlPath}: invoice number present`);
  if (html.includes("ネオレバレッジ株式会社")) errors.push(`${urlPath}: incorrect company name`);
  if (/mailto:|tel:/i.test(html)) errors.push(`${urlPath}: mailto or tel link`);
  if (html.includes("contract@") || html.includes("@neolev.jp")) errors.push(`${urlPath}: email address present`);
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
for (const blocked of ["/we-are/ceo", "/contact/thanks", "/trends/tag/", "/404"]) {
  if (sitemap.includes(blocked)) errors.push(`sitemap contains ${blocked}`);
}
if (!sitemap.includes("<lastmod>") || !sitemap.includes("hreflang")) errors.push("sitemap missing lastmod or hreflang");

const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://neolev.jp/sitemap.xml")) errors.push("robots missing sitemap");
if (!robots.includes("User-agent: GPTBot") || !robots.includes("Allow: /")) errors.push("robots missing AI crawler policy");

const llms = await readFile(path.join(dist, "llms.txt"), "utf8");
const llmsFull = await readFile(path.join(dist, "llms-full.txt"), "utf8");
for (const [name, text] of [["llms.txt", llms], ["llms-full.txt", llmsFull]]) {
  if (text.includes("1290001111832") || text.includes("contract@") || text.includes("/we-are/ceo")) {
    errors.push(`${name} contains a forbidden value`);
  }
}

const logo = await stat(path.join(dist, "logo.png"));
if (logo.size < 1000) errors.push("logo.png looks empty");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`check-output: ${htmlFiles.length} html files ok`);
