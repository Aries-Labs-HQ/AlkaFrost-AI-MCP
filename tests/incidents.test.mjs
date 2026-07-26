import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("report sanitizes tags and agent_id before return and persistence", async (t) => {
  const dataDir = mkdtempSync(join(tmpdir(), "aries-incidents-"));
  t.after(() => rmSync(dataDir, { recursive: true, force: true }));
  process.env.ARIES_DATA_DIR = dataDir;

  const { report } = await import(`../dist/incidents.js?test=${Date.now()}`);
  const incident = report({
    severity: "low",
    category: "misunderstanding",
    title: "sanitization regression proof",
    description: "dummy report",
    root_cause: "dummy root cause",
    correction: "dummy correction",
    tags: "TOKEN=dummy-sensitive-value,rollback",
    agent_id: "/Users/alice/private-agent",
  });

  assert.equal(incident.tags, "TOKEN=<REDACTED>,rollback");
  assert.equal(incident.agent_id, "/Users/<USER_PATH>");

  const pendingPath = join(dataDir, "incidents-pending.jsonl");
  const persisted = JSON.parse(readFileSync(pendingPath, "utf8").trim());
  assert.equal(persisted.tags, "TOKEN=<REDACTED>,rollback");
  assert.equal(persisted.agent_id, "/Users/<USER_PATH>");
});
