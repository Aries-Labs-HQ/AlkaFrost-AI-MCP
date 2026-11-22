// The running server: handshake, tool set, layers, stdout purity, behaviour without a key.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerKnowledgeTools } from "../dist/tools/knowledge.js";
import { registerChainTools } from "../dist/tools/chain.js";
import { registerDevTools } from "../dist/tools/dev.js";
import { registerIncidentTools } from "../dist/tools/incidents.js";
import { firstText, offlineEnv, startServer } from "./helpers.mjs";

export const EXPECTED_TOOLS = {
  knowledge: ["alkafrost_search", "alkafrost_doc", "alkafrost_full_doc", "alkafrost_catalog"],
  chain: [
    "alkafrost_tokens_by_address", "alkafrost_contract_meta", "alkafrost_bytecode", "alkafrost_simulate",
    "alkafrost_frbtc_status", "alkafrost_oracle_read", "alkafrost_oracle_price", "alkafrost_token",
    "alkafrost_diesel_status", "alkafrost_pools", "alkafrost_pool_info", "alkafrost_rpc",
  ],
  dev: ["alkafrost_constants", "alkafrost_scaffold"],
  learning: ["alkafrost_incident_report", "alkafrost_incident_query"],
};
const ALL = Object.values(EXPECTED_TOOLS).flat();

/** Names a register*Tools function registers, without starting a server. */
function namesFrom(register) {
  const names = [];
  register({ registerTool: (name) => names.push(name) });
  return names;
}

// The architecture image (.github/assets/architecture.svg) prints these counts
// as drawn outlines: "Knowledge 4 tools · Chain data 12 tools · Dev 2 tools ·
// Learning 2 tools" and "20 tools". If this test has to change, the image must
// be redrawn too.
test("each layer registers the tools the README and the architecture image show", () => {
  assert.deepEqual(namesFrom(registerKnowledgeTools).sort(), [...EXPECTED_TOOLS.knowledge].sort());
  assert.deepEqual(namesFrom(registerChainTools).sort(), [...EXPECTED_TOOLS.chain].sort());
  assert.deepEqual(namesFrom(registerDevTools).sort(), [...EXPECTED_TOOLS.dev].sort());
  assert.deepEqual(namesFrom(registerIncidentTools).sort(), [...EXPECTED_TOOLS.learning].sort());
  assert.deepEqual(
    Object.fromEntries(Object.entries(EXPECTED_TOOLS).map(([k, v]) => [k, v.length])),
    { knowledge: 4, chain: 12, dev: 2, learning: 2 },
  );
});

test("handshake: exactly the expected tools, each with a description and an input schema", async () => {
  const s = await startServer(await offlineEnv());
  try {
    assert.equal(s.init.result.serverInfo.name, "alkafrost-mcp");
    const tools = await s.listTools();
    assert.deepEqual(tools.map((t) => t.name).sort(), [...ALL].sort());
    for (const t of tools) {
      assert.ok(typeof t.description === "string" && t.description.length > 20, `${t.name} description`);
      assert.equal(t.inputSchema?.type, "object", `${t.name} inputSchema`);
    }
  } finally {
    await s.stop();
  }
});

test("without a key, every Knowledge and Dev tool answers; chain tools fail clearly; the server stays up; stdout carries only JSON-RPC", async () => {
  const s = await startServer(await offlineEnv());
  try {
    const okCalls = [
      ["alkafrost_search", { query: "frBTC signer" }],
      ["alkafrost_doc", { path: "reference/constants.md" }],
      ["alkafrost_doc", { path: "reference/constants.md", section: "Alkane identifiers" }],
      ["alkafrost_full_doc", { path: "reference/orbitals.md" }],
      ["alkafrost_catalog", {}],
      ["alkafrost_constants", {}],
      ["alkafrost_scaffold", { kind: "wrap" }],
      ["alkafrost_scaffold", { kind: "unwrap" }],
      ["alkafrost_scaffold", { kind: "contract" }],
      ["alkafrost_scaffold", { kind: "orbital" }],
    ];
    for (const [name, args] of okCalls) {
      const r = await s.call(name, args);
      assert.notEqual(r.isError, true, name);
      assert.ok(firstText(r).length > 50, `${name} returned too little`);
      assert.doesNotMatch(firstText(r), /^No corpus doc|^No section/, name);
    }
    for (const [name, args] of [
      ["alkafrost_bytecode", { block: 2, tx: 0 }],
      ["alkafrost_pools", {}],
      ["alkafrost_frbtc_status", {}],
      ["alkafrost_diesel_status", {}],
      ["alkafrost_token", { block: 2, tx: 0 }],
      ["alkafrost_rpc", { method: "metashrew_height" }],
    ]) {
      const r = await s.call(name, args);
      assert.equal(r.isError, true, `${name} should report an error, got: ${firstText(r).slice(0, 120)}`);
      assert.match(firstText(r), /SUBFROST_API_KEY is not set/, name);
    }
    assert.ok(s.alive, "server exited");
    // stdout is the protocol: every line is a JSON-RPC 2.0 frame, nothing else.
    assert.equal(s.trailingStdout, "");
    for (const line of s.stdoutLines) assert.equal(JSON.parse(line).jsonrpc, "2.0", line);
    assert.match(s.stderr, /ready \(stdio\)/);
  } finally {
    await s.stop();
  }
});
