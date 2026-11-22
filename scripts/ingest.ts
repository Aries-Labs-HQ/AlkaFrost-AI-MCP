/**
 * Corpus ingest — rebuilds the docs corpus from PUBLIC, official sources only.
 *
 *   npm run ingest
 *
 * Two kinds of source:
 *
 *  1. The official SUBFROST docs (docs.subfrost.io). Pages are discovered from
 *     the site's llms.txt index + sitemap.xml, and each page's markdown twin
 *     (`<page>.md`) is taken verbatim. Pages without a markdown twin fall back to
 *     HTML -> markdown (turndown + jsdom). Written to corpus/subfrost/<url-path>.md.
 *
 *  2. A short list of raw files (STATIC_SOURCES) — e.g. the alkanes-rs README
 *     and reference contracts from GitHub. `.md` is taken verbatim; code is
 *     fenced under an H1.
 *
 * Generated directories (MANAGED_DIRS) are wiped before writing so pages that
 * were removed upstream don't linger. Hand-written docs under corpus/reference/
 * are never touched by this script.
 *
 * Every written file carries frontmatter with a `source_url` — a corpus doc
 * without a public source URL does not belong in this repo.
 *
 * The search index rebuilds from corpus/ at the next server start.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = join(ROOT, "corpus");
const UA =
  "Mozilla/5.0 (compatible; AlkaFrostMCP-ingest/1.0; +https://github.com/Aries-Labs-HQ/AlkaFrost-AI-MCP)";
const MIN_CHARS = 200; // skip near-empty extractions (e.g. JS-rendered SPA shells)

const SUBFROST_DOCS = "https://docs.subfrost.io";

/** Corpus subdirectories this script owns (wiped + regenerated on every run). */
const MANAGED_DIRS = ["subfrost", "alkanes-rs"];

interface Source {
  source: string; // corpus subdir
  slug: string; // file path under the subdir (no ext)
  url: string;
}

// Raw files fetched as-is. Add official, public sources here.
const STATIC_SOURCES: Source[] = [
  { source: "alkanes-rs", slug: "readme", url: "https://raw.githubusercontent.com/kungfuflex/alkanes-rs/main/README.md" },
  // Orbitals — Alkanes NFTs (a Token with total supply 1 + opcode 1000 = media)
  { source: "alkanes-rs", slug: "std-orbital", url: "https://raw.githubusercontent.com/kungfuflex/alkanes-rs/main/crates/alkanes-std-orbital/src/lib.rs" },
];

const td = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
td.remove(["script", "style", "noscript", "nav", "footer", "form", "svg", "iframe"]);

// Non-content containers (by class/id token) stripped before conversion.
const JUNK =
  /(^|\s)(navbar|breadcrumbs|pagination-nav|theme-doc-footer|theme-doc-toc-mobile|table-of-contents|footer|sidebar|site-header|cookie|hash-link)(\s|$)/i;
// Preferred content containers; first non-trivial match wins.
const CONTENT = [".theme-doc-markdown", "article", "main", "#content", ".markdown-body"];

function extract(html: string, url: string): { title: string; markdown: string } {
  const { document } = new JSDOM(html, { url }).window;
  document
    .querySelectorAll("script,style,noscript,nav,footer,svg,form,iframe")
    .forEach((el) => el.remove());
  document.querySelectorAll("[class],[id]").forEach((el) => {
    const token = `${el.getAttribute("class") || ""} ${el.getAttribute("id") || ""}`;
    if (JUNK.test(token)) el.remove();
  });
  let node: Element | null = null;
  for (const sel of CONTENT) {
    const n = document.querySelector(sel);
    if (n && (n.textContent || "").trim().length > MIN_CHARS) {
      node = n;
      break;
    }
  }
  const root = node ?? document.body;
  const title = (
    root.querySelector("h1")?.textContent ||
    document.querySelector("title")?.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
  const markdown = td.turndown(root.innerHTML).replace(/\n{3,}/g, "\n\n").trim();
  return { title, markdown };
}

function firstMdHeading(md: string): string {
  return (md.match(/^#\s+(.+)$/m)?.[1] ?? "").trim();
}

const CODE_LANG: Record<string, string> = {
  rs: "rust",
  toml: "toml",
  ts: "typescript",
  js: "javascript",
  json: "json",
};

/** Wrap a raw file as markdown: .md verbatim; code/text fenced under an H1 so it
 *  indexes as a clean, titled chunk. */
function rawDoc(url: string, slug: string, raw: string): { title: string; body: string } {
  const ext = (url.split("?")[0].split(".").pop() ?? "").toLowerCase();
  if (ext === "md") {
    const body = raw.trim();
    return { title: firstMdHeading(body) || slug, body };
  }
  const lang = CODE_LANG[ext] ?? "";
  const fenced = raw.replace(/```/g, "ʼʼʼ").trimEnd();
  return { title: slug, body: `# ${slug}\n\n\`\`\`${lang}\n${fenced}\n\`\`\`\n` };
}

async function get(url: string): Promise<Response> {
  return fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
}

/** All doc pages on docs.subfrost.io: llms.txt index ∪ sitemap.xml. */
async function discoverSubfrostPages(): Promise<string[]> {
  const pages = new Set<string>();
  const llms = await get(`${SUBFROST_DOCS}/llms.txt`);
  if (llms.ok) {
    for (const m of (await llms.text()).matchAll(/\((https:\/\/docs\.subfrost\.io\/[^)\s]+)\)/g)) {
      pages.add(m[1].replace(/\.md$/, ""));
    }
  } else {
    console.error(`warn  llms.txt: HTTP ${llms.status}`);
  }
  const sm = await get(`${SUBFROST_DOCS}/sitemap.xml`);
  if (sm.ok) {
    for (const m of (await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)) {
      pages.add(m[1].trim().replace(/\/$/, ""));
    }
  } else {
    console.error(`warn  sitemap.xml: HTTP ${sm.status}`);
  }
  return [...pages].filter((u) => u.startsWith(`${SUBFROST_DOCS}/`)).sort();
}

/** Fetch one docs.subfrost.io page: prefer its markdown twin, else extract HTML. */
async function fetchSubfrostPage(url: string): Promise<{ title: string; body: string } | null> {
  const md = await get(`${url}.md`);
  const type = md.headers.get("content-type") ?? "";
  if (md.ok && !type.includes("text/html")) {
    const body = (await md.text()).trim();
    return { title: firstMdHeading(body), body };
  }
  const html = await get(url);
  if (!html.ok) return null;
  const ex = extract(await html.text(), url);
  return { title: ex.title, body: ex.markdown };
}

function write(source: string, slug: string, url: string, title: string, body: string): void {
  const file = join(CORPUS, source, `${slug}.md`);
  mkdirSync(dirname(file), { recursive: true });
  const safeTitle = (title || slug).replace(/\n/g, " ");
  const fm = `---\ntitle: ${safeTitle}\nsource: ${source}\nsource_url: ${url}\n---\n\n`;
  writeFileSync(file, fm + body + "\n", "utf8");
}

async function run(): Promise<void> {
  let wrote = 0;
  let skipped = 0;

  const pages = await discoverSubfrostPages();
  if (pages.length === 0) {
    console.error("ingest: no docs.subfrost.io pages discovered — aborting without touching corpus/.");
    process.exit(1);
  }
  for (const dir of MANAGED_DIRS) rmSync(join(CORPUS, dir), { recursive: true, force: true });

  for (const url of pages) {
    const slug = url.slice(SUBFROST_DOCS.length + 1);
    try {
      const page = await fetchSubfrostPage(url);
      if (!page || page.body.length < MIN_CHARS) {
        console.error(`skip  subfrost/${slug}: ${page ? `thin (${page.body.length} chars)` : "not found"}`);
        skipped++;
        continue;
      }
      write("subfrost", slug, url, page.title, page.body);
      console.error(`wrote subfrost/${slug}.md  (${page.body.length} chars)`);
      wrote++;
    } catch (e) {
      console.error(`error subfrost/${slug}:`, String(e));
      skipped++;
    }
  }

  for (const s of STATIC_SOURCES) {
    try {
      const res = await get(s.url);
      if (!res.ok) {
        console.error(`skip  ${s.source}/${s.slug}: HTTP ${res.status}`);
        skipped++;
        continue;
      }
      const raw = await res.text();
      const r = /\.(md|rs|toml|txt|json)(\?|$)/i.test(s.url)
        ? rawDoc(s.url, s.slug, raw)
        : (() => {
            const ex = extract(raw, s.url);
            return { title: ex.title, body: ex.markdown };
          })();
      if (r.body.length < MIN_CHARS) {
        console.error(`skip  ${s.source}/${s.slug}: thin (${r.body.length} chars)`);
        skipped++;
        continue;
      }
      write(s.source, s.slug, s.url, r.title, r.body);
      console.error(`wrote ${s.source}/${s.slug}.md  (${r.body.length} chars)`);
      wrote++;
    } catch (e) {
      console.error(`error ${s.source}/${s.slug}:`, String(e));
      skipped++;
    }
  }

  console.error(`\ningest: ${wrote} written, ${skipped} skipped`);
}

run();
