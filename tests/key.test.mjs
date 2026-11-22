// The API key travels only as the x-subfrost-api-key header to the configured gateway.
import { test } from "node:test";
import assert from "node:assert/strict";
import { firstText, offlineEnv, recordingListener, startServer } from "./helpers.mjs";

const KEY = "planted-test-key-3c9e7a51f0b24d68";

async function serverAgainst(gw) {
  return startServer(
    await offlineEnv({
      SUBFROST_API_KEY: KEY,
      SUBFROST_RPC: `http://127.0.0.1:${gw.port}/v4/jsonrpc`,
      SUBFROST_REST: `http://127.0.0.1:${gw.port}/v4/api`,
    }),
  );
}

test("the key is sent only in the x-subfrost-api-key header (JSON-RPC and REST)", async () => {
  const gw = await recordingListener((req, res) => {
    res.setHeader("content-type", "application/json");
    const id = req.url.includes("jsonrpc") ? JSON.parse(req.body).id : 1;
    res.end(JSON.stringify({ jsonrpc: "2.0", id, result: { bytecode: "00" }, data: { pools: [] } }));
  });
  const s = await serverAgainst(gw);
  try {
    assert.notEqual((await s.call("alkafrost_bytecode", { block: 2, tx: 0 })).isError, true);
    assert.notEqual((await s.call("alkafrost_pools", {})).isError, true);
    assert.deepEqual(gw.requests.map((r) => r.url).sort(), ["/v4/api/get-all-pools-details", "/v4/jsonrpc"]);
    for (const r of gw.requests) {
      assert.equal(r.headers["x-subfrost-api-key"], KEY);
      assert.ok(!r.url.includes(KEY), "key in URL");
      assert.ok(!r.body.includes(KEY), "key in body");
      const others = Object.entries(r.headers).filter(([k, v]) => k !== "x-subfrost-api-key" && String(v).includes(KEY));
      assert.deepEqual(others, [], "key in another header");
    }
    assert.ok(!s.stdoutLines.join("\n").includes(KEY), "key on stdout");
    assert.ok(!s.stderr.includes(KEY), "key on stderr");
  } finally {
    await s.stop();
    await gw.close();
  }
});

test("a redirect from the gateway is not followed, so the key never reaches another origin", async () => {
  const elsewhere = await recordingListener((_r, res) => res.end("{}"));
  const gw = await recordingListener((_r, res) => {
    res.statusCode = 307;
    res.setHeader("location", `http://localhost:${elsewhere.port}/collect`);
    res.end();
  });
  const s = await serverAgainst(gw);
  try {
    assert.equal((await s.call("alkafrost_bytecode", { block: 2, tx: 0 })).isError, true);
    assert.equal((await s.call("alkafrost_pools", {})).isError, true);
    assert.equal(gw.requests.length, 2);
    assert.equal(elsewhere.requests.length, 0, "the redirect was followed");
  } finally {
    await s.stop();
    await gw.close();
    await elsewhere.close();
  }
});

test("an upstream error that echoes the key does not hand it to the model", async () => {
  const gw = await recordingListener((req, res) => {
    res.statusCode = 500;
    res.end(`bad request, header was ${req.headers["x-subfrost-api-key"]}`);
  });
  const s = await serverAgainst(gw);
  try {
    for (const name of ["alkafrost_bytecode", "alkafrost_pools"]) {
      const r = await s.call(name, name === "alkafrost_bytecode" ? { block: 2, tx: 0 } : {});
      assert.equal(r.isError, true);
      assert.ok(!firstText(r).includes(KEY), `${name} echoed the key: ${firstText(r)}`);
    }
    assert.ok(!s.stderr.includes(KEY), "key on stderr");
  } finally {
    await s.stop();
    await gw.close();
  }
});
