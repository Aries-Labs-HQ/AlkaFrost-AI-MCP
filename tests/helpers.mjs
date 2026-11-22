// Shared test helpers: a minimal MCP stdio client and a local HTTP listener.
// Tests never touch the network beyond 127.0.0.1 and never need a real key.
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const ENTRY = join(ROOT, "dist", "index.js");

/** A port on 127.0.0.1 that nothing listens on (bound, then closed). */
export async function closedPort() {
  const s = createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
}

/** Environment for a server that cannot reach any real gateway. */
export async function offlineEnv(extra = {}) {
  const port = await closedPort();
  return {
    SUBFROST_RPC: `http://127.0.0.1:${port}/v4/jsonrpc`,
    SUBFROST_REST: `http://127.0.0.1:${port}/v4/api`,
    ALKAFROST_INCIDENTS_PATH: join(mkdtempSync(join(tmpdir(), "alkafrost-test-")), "incidents.jsonl"),
    ...extra,
  };
}

/**
 * Start the built server with exactly `env` (plus PATH) and speak MCP to it.
 * stdout and stderr are captured separately.
 */
export async function startServer(env) {
  const child = spawn(process.execPath, [ENTRY], {
    env: { PATH: process.env.PATH ?? "", ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const stdoutLines = [];
  let stderr = "";
  let buf = "";
  const pending = new Map();
  child.stdout.on("data", (d) => {
    buf += d;
    let n;
    while ((n = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, n);
      buf = buf.slice(n + 1);
      stdoutLines.push(line);
      try {
        const m = JSON.parse(line);
        if (m.id != null && pending.has(m.id)) {
          pending.get(m.id)(m);
          pending.delete(m.id);
        }
      } catch {
        /* a non-JSON line is recorded and asserted on by the stdout test */
      }
    }
  });
  child.stderr.on("data", (d) => (stderr += d));
  let exited = null;
  child.on("exit", (code, signal) => (exited = { code, signal }));
  let id = 0;
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const myId = ++id;
      const timer = setTimeout(() => {
        pending.delete(myId);
        reject(new Error(`timeout waiting for ${method}`));
      }, 30_000);
      pending.set(myId, (m) => {
        clearTimeout(timer);
        resolve(m);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: myId, method, params }) + "\n");
    });
  const init = await request("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "alkafrost-tests", version: "1" },
  });
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  return {
    init,
    request,
    async listTools() {
      return (await request("tools/list", {})).result.tools;
    },
    async call(name, args = {}) {
      const r = await request("tools/call", { name, arguments: args });
      return r.result;
    },
    get stdoutLines() {
      return stdoutLines;
    },
    get trailingStdout() {
      return buf;
    },
    get stderr() {
      return stderr;
    },
    get alive() {
      return exited === null;
    },
    async stop() {
      child.stdin.end();
      child.kill("SIGTERM");
      await new Promise((r) => (exited ? r() : child.once("exit", r)));
    },
  };
}

/** A local HTTP listener that records every request it receives. */
export async function recordingListener(handler) {
  const requests = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const rec = { method: req.method, url: req.url, headers: req.headers, rawHeaders: req.rawHeaders, body };
      requests.push(rec);
      handler(rec, res);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    requests,
    port: server.address().port,
    close: () => new Promise((r) => server.close(r)),
  };
}

/** Text of the first content block of a tool result. */
export const firstText = (result) => result?.content?.[0]?.text ?? "";
