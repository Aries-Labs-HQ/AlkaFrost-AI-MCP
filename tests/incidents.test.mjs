// The local incident log: where it writes, and that a report cannot grow it without bound.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "alkafrost-inc-"));
process.env.ALKAFROST_INCIDENTS_PATH = join(dir, "incidents.jsonl");
const { report, query, storePath, MAX_FIELD_CHARS } = await import("../dist/incidents.js");

test("reports go to the configured local file and nowhere else", () => {
  assert.equal(storePath(), join(dir, "incidents.jsonl"));
  const inc = report({
    severity: "low", category: "misunderstanding", title: "t", description: "d",
    root_cause: "r", correction: "c",
  });
  assert.deepEqual(readdirSync(dir), ["incidents.jsonl"]);
  const lines = readFileSync(storePath(), "utf8").trim().split("\n");
  assert.equal(JSON.parse(lines.at(-1)).id, inc.id);
  assert.equal(query({ action: "get", incident_id: inc.id }).id, inc.id);
});

test("an oversized field is truncated before it is stored", () => {
  const huge = "x".repeat(MAX_FIELD_CHARS * 5);
  const inc = report({
    severity: "info", category: "performance", title: huge, description: huge,
    root_cause: huge, correction: huge, bad_code: huge, tags: huge,
  });
  for (const f of ["title", "description", "root_cause", "correction", "bad_code", "tags"]) {
    assert.ok(inc[f].length <= MAX_FIELD_CHARS + 20, `${f} is ${inc[f].length} chars`);
  }
});
