// README ⇄ code: the README cannot drift from the server silently.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT, firstText, offlineEnv, startServer } from "./helpers.mjs";

const README = readFileSync(join(ROOT, "README.md"), "utf8");
const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty", "Twenty-one", "Twenty-two", "Twenty-three", "Twenty-four", "Twenty-five"];

/** Tool names in the first column of the tables under "## Tools". */
export function readmeToolNames(text) {
  const section = text.split(/^## Tools$/m)[1]?.split(/^## /m)[0] ?? "";
  return [...section.matchAll(/^\|\s*`(alkafrost_[a-z_]+)`\s*\|/gm)].map((m) => m[1]);
}

function corpusFiles(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? corpusFiles(p) : [p];
  });
}

test("README tool tables, tool counts and corpus count match the running server", async () => {
  const s = await startServer(await offlineEnv());
  try {
    const served = (await s.listTools()).map((t) => t.name).sort();
    const listed = readmeToolNames(README);
    assert.equal(new Set(listed).size, listed.length, "a tool is listed twice");
    assert.deepEqual([...listed].sort(), served);
    const n = served.length;
    assert.ok(README.includes(`<b>${n} tools</b>`), `README table cell should say ${n} tools`);
    assert.ok(README.includes(`${NUMBER_WORDS[n]} tools in four layers`), `README should say "${NUMBER_WORDS[n]} tools in four layers"`);

    const catalog = JSON.parse(firstText(await s.call("alkafrost_catalog", {})));
    const docs = Object.values(catalog).flat().length;
    assert.equal(docs, corpusFiles(join(ROOT, "corpus")).length, "catalog vs files on disk");
    assert.ok(README.includes(`<b>${docs}-doc corpus</b>`), `README should say ${docs}-doc corpus`);
  } finally {
    await s.stop();
  }
});

test("every corpus file cites its source in frontmatter", () => {
  const missing = corpusFiles(join(ROOT, "corpus")).filter((p) => {
    const fm = readFileSync(p, "utf8").match(/^---\n([\s\S]*?)\n---\n/);
    return !fm || !/^source_url:\s*https:\/\/\S+/m.test(fm[1]);
  });
  assert.deepEqual(missing, []);
});
