// The passthrough guard (alkafrost_rpc). Every probe here is a way a caller
// might try to slip a write, broadcast or code-running method past it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAllowed } from "../dist/rpc.js";
import { recordingListener, startServer, offlineEnv } from "./helpers.mjs";

const allows = (m, p) => assert.doesNotThrow(() => assertAllowed(m, p), `expected ${JSON.stringify(m)} to be allowed`);
const blocks = (m, p) => assert.throws(() => assertAllowed(m, p), Error, `expected ${JSON.stringify(m)} to be blocked`);

// Documented read methods (corpus/subfrost/api-reference/json-rpc/*).
const READS = [
  "alkanes_protorunesbyaddress", "alkanes_getbytecode", "alkanes_simulate", "alkanes_meta",
  "alkanes_trace", "alkanes_traceblock",
  "esplora_address", "esplora_address::utxo", "esplora_address::txs", "esplora_tx", "esplora_tx::status",
  "esplora_tx::hex", "esplora_tx::outspends", "esplora_block", "esplora_block-height", "esplora_block::txids",
  "esplora_mempool", "esplora_mempool::recent", "esplora_fee-estimates", "esplora_addressutxo",
  "ord_blockcount", "ord_blockhash", "ord_blocktime", "ord_blockheight", "ord_inscription", "ord_inscriptions",
  "ord_inscriptions::block", "ord_rune", "ord_runes", "ord_sat", "ord_output", "ord_address", "ord_address::inscriptions",
  "metashrew_height", "metashrew_view",
  "btc_getblockcount", "btc_getblockhash", "btc_getbestblockhash", "btc_getblock", "btc_getblockheader",
  "btc_getblockchaininfo", "btc_getdifficulty", "btc_getrawtransaction", "btc_getmempoolinfo", "btc_getrawmempool",
  "btc_decoderawtransaction",
  "brc20_balance", "brc20_getTxReceiptByInscriptionId", "brc20_getInscriptionIdByTxHash",
];

test("documented read methods pass", () => {
  for (const m of READS) allows(m, m === "metashrew_view" ? ["protorunesbyaddress", {}, "latest"] : []);
  allows("metashrew_view", ["protorunesbyaddress", { address: "bc1q", protocolTag: "1" }, "latest"]);
  allows("metashrew_view", ["simulate", "0x00", "latest"]);
});

test("documented write, admin and code-running methods are blocked", () => {
  for (const m of [
    "btc_sendrawtransaction", "esplora_broadcast", "btc_send",
    "esplora_post-tx", "esplora_post_tx", "esplora_tx::post", "esplora_pushtx", "btc_submitpackage",
    "lua_evalscript", "lua_evalsaved", "lua_savescript", "sandshrew_evalscript",
    "subfrost_getpublic", "subfrost_reset", "subfrost_thieve", "admin_createApiKey",
  ]) blocks(m, []);
});

test("undocumented methods in allowed namespaces are blocked where they could write or run code", () => {
  // Bitcoin Core wallet calls that change wallet state but start with "get".
  for (const m of ["btc_getnewaddress", "btc_getrawchangeaddress", "btc_sendtoaddress", "btc_sendmany", "btc_signrawtransactionwithwallet"]) blocks(m, []);
  // metashrew's block-preview path runs a caller-supplied block.
  blocks("metashrew_preview", []);
});

test("variants of a denied name do not get through", () => {
  const variants = [];
  for (const base of ["btc_sendrawtransaction", "esplora_broadcast"]) {
    variants.push(
      base.toUpperCase(),
      base[0].toUpperCase() + base.slice(1),
      base.replace(/_(.)/, (_, c) => "_" + c.toUpperCase()),
      ` ${base}`, `${base} `, `${base}\n`, `\t${base}`,
      `${base}::`, `${base}_`, `${base}-`, `${base}::x`,
      `${base}\u200b`,
      base.replace("e", "\u0435"), // Cyrillic small ie looks like Latin e
      base.replace("s", "\u0455"), // Cyrillic dze looks like Latin s
    );
  }
  for (const v of variants) blocks(v, []);
});

test("empty and non-string method names are blocked with an Error", () => {
  for (const v of ["", " ", "_", "::", undefined, null, 123, {}, ["btc_getblockcount"], true]) blocks(v, []);
});

test("metashrew_view refuses the simulate views that run a caller-supplied transaction or block", () => {
  for (const view of [
    "simulateprotostones", "simulatetransaction", "simulateblock",
    "SimulateBlock", " simulateblock", "simulateblock ", "simulat\u0435block",
  ]) blocks("metashrew_view", [view, "0x00", "latest"]);
  blocks("metashrew_view", [123, "0x00"]);
});

test("a blocked method never reaches the gateway", async () => {
  const gw = await recordingListener((_r, res) => res.end("{}"));
  const env = await offlineEnv({
    SUBFROST_RPC: `http://127.0.0.1:${gw.port}/v4/jsonrpc`,
    SUBFROST_REST: `http://127.0.0.1:${gw.port}/v4/api`,
  });
  const s = await startServer(env);
  try {
    for (const method of ["btc_sendrawtransaction", "ESPLORA_BROADCAST", "esplora_broadcast ", "lua_evalscript", "btc_getnewaddress"]) {
      const r = await s.call("alkafrost_rpc", { method, params: ["00"] });
      assert.equal(r.isError, true, method);
    }
    const r = await s.call("alkafrost_rpc", { method: "metashrew_view", params: ["simulatetransaction", "0x00", "latest"] });
    assert.equal(r.isError, true);
    assert.equal(gw.requests.length, 0, "the gateway must not have been called");
  } finally {
    await s.stop();
    await gw.close();
  }
});
