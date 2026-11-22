import { log } from "./log.js";

const ENDPOINT =
  process.env.SUBFROST_RPC ?? "https://mainnet.subfrost.io/v4/jsonrpc";
const REST_ENDPOINT =
  process.env.SUBFROST_REST ?? ENDPOINT.replace(/\/jsonrpc\/?$/, "/api");
const API_KEY = process.env.SUBFROST_API_KEY;

let counter = 0;

/** Remove the configured key from any text that came back from upstream. */
export function redactKey(text: string): string {
  return API_KEY ? text.split(API_KEY).join("<SUBFROST_API_KEY>") : text;
}

const NO_KEY_HINT = " (SUBFROST_API_KEY is not set: the chain-data tools need your own key.)";

class UpstreamError extends Error {}

/** Normalise an upstream failure: key redacted, and a hint when no key is set. */
function upstreamError(message: string): UpstreamError {
  return new UpstreamError(redactKey(message) + (API_KEY ? "" : NO_KEY_HINT));
}

/** Wrap anything else (network errors, bad JSON) the same way, keeping the cause. */
function asUpstreamError(err: unknown): UpstreamError {
  if (err instanceof UpstreamError) return err;
  const cause = err instanceof Error && err.cause instanceof Error ? ` (${err.cause.message})` : "";
  return upstreamError(String(err) + cause);
}

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * Single JSON-RPC 2.0 call against the Subfrost gateway.
 * Auth is the x-subfrost-api-key HEADER — never the /v4/<key> path form,
 * which would leak the key into URLs, logs, and referrers.
 */
export async function rpc<T = unknown>(
  method: string,
  params: unknown[] = [],
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(API_KEY ? { "x-subfrost-api-key": API_KEY } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: ++counter }),
      signal: controller.signal,
      // Never follow a redirect: fetch would re-send the key header to the new origin.
      redirect: "error",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw upstreamError(`Subfrost RPC HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
    const json = (await res.json()) as {
      result?: T;
      error?: RpcError;
    };
    if (json.error) {
      throw upstreamError(`Subfrost RPC error ${json.error.code}: ${json.error.message}`);
    }
    return json.result as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw upstreamError(`Subfrost RPC timeout after ${timeoutMs}ms (${method})`);
    }
    const e = asUpstreamError(err);
    log("rpc failed", method, e.message);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * POST to the Subfrost REST API (https://…/v4/api). Used by the read-only AMM
 * pool tools. Returns the unwrapped `data` field. Header auth, like rpc().
 */
export async function restPost<T = unknown>(
  path: string,
  body: unknown,
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${REST_ENDPOINT}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(API_KEY ? { "x-subfrost-api-key": API_KEY } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      // Never follow a redirect: fetch would re-send the key header to the new origin.
      redirect: "error",
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw upstreamError(`Subfrost REST HTTP ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { data?: T };
    return (json.data ?? json) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw upstreamError(`Subfrost REST timeout after ${timeoutMs}ms (${path})`);
    }
    const e = asUpstreamError(err);
    log("rest failed", path, e.message);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function hasApiKey(): boolean {
  return Boolean(API_KEY);
}

/**
 * Passthrough guard for alkafrost_rpc, the only tool that lets the caller pick
 * the gateway method. This is a read-only server: no caller-chosen name may
 * reach a write, broadcast, wallet, admin or code-running method.
 *
 * Checks, in order:
 *  1. the name has the shape the documented methods use: a lowercase
 *     namespace, `_`, then ASCII letters/digits joined by single `_`, `-` or
 *     `::` (so no whitespace, no trailing separator, no look-alike letters);
 *  2. a denylist, compared case-insensitively;
 *  3. an allowlist of namespaces and exact methods
 *     (corpus/subfrost/api-reference/json-rpc/*);
 *  4. for metashrew_view, the view name gets the same treatment, and the
 *     simulate views that run a caller-supplied transaction or block are refused.
 */
const METHOD_SHAPE = /^[a-z][a-z0-9]*_[A-Za-z0-9]+(?:(?:_|-|::)[A-Za-z0-9]+)*$/;
const VIEW_SHAPE = /^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/;

const ALLOWED_PREFIXES = ["esplora_", "ord_", "alkanes_", "brc20_", "btc_decode"];

const ALLOWED_EXACT = new Set([
  "metashrew_height",
  "metashrew_view",
  // Documented read-only Bitcoin Core getters. Not a "btc_get" prefix: Bitcoin
  // Core has wallet calls that start with "get" and change wallet state.
  "btc_getblockcount",
  "btc_getblockhash",
  "btc_getbestblockhash",
  "btc_getblock",
  "btc_getblockheader",
  "btc_getblockchaininfo",
  "btc_getdifficulty",
  "btc_getrawtransaction",
  "btc_getmempoolinfo",
  "btc_getrawmempool",
]);

// Explicit denylist beats everything — keep spend/relay/control off-limits.
const DENIED = new Set(["btc_sendrawtransaction", "btc_send", "esplora_broadcast"]);
const DENIED_WORDS = /send|broadcast|post|push|submit|relay|sign|wallet|import|dump|private|key/i;

// metashrew_view views that run a caller-supplied transaction or block.
const DENIED_VIEWS = /^simulate.+/i;

export function assertAllowed(method: unknown, params: unknown[] = []): void {
  if (typeof method !== "string" || !METHOD_SHAPE.test(method)) {
    throw new Error(
      `Method ${JSON.stringify(method)} is not a valid gateway method name.`,
    );
  }
  if (DENIED.has(method.toLowerCase()) || DENIED_WORDS.test(method)) {
    throw new Error(`Method "${method}" is blocked (write/broadcast/key).`);
  }
  if (!ALLOWED_EXACT.has(method) && !ALLOWED_PREFIXES.some((p) => method.startsWith(p))) {
    throw new Error(
      `Method "${method}" is not on the read-only allowlist. ` +
        `Allowed: ${ALLOWED_PREFIXES.map((p) => p + "*").join(", ")}, ` +
        `metashrew_height, metashrew_view, and the documented btc_get* reads.`,
    );
  }
  if (method === "metashrew_view") {
    const view = Array.isArray(params) ? params[0] : undefined;
    if (typeof view !== "string" || !VIEW_SHAPE.test(view)) {
      throw new Error(`metashrew_view needs a valid view name as its first parameter.`);
    }
    if (DENIED_VIEWS.test(view)) {
      throw new Error(
        `View "${view}" runs a caller-supplied transaction or block and is blocked; ` +
          `use alkafrost_simulate for read-only view calls.`,
      );
    }
  }
}
