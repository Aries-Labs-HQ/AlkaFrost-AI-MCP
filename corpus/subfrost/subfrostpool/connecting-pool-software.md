---
title: Connecting Pool Software
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/connecting-pool-software
---

# Connecting Pool Software

> Point ckpool, public-pool, a DATUM gateway or any bitcoind RPC client at pool.subfrost.io. URL, auth, allowed methods, limits and longpoll.

SUBFROSTPOOL's template provider behaves like a Bitcoin Core RPC endpoint. For your pool software, the only change is the RPC URL and credentials.

## Connection details

| | |
|---|---|
| **URL** | `https://pool.subfrost.io` (HTTPS, port 443). `https://pool.subfrost.io/rpc` is an equivalent alias. |
| **Protocol** | JSON-RPC 1.0 or 2.0, with Bitcoin Core semantics and error codes |
| **Auth** | Your pool API key (`sfp_…`), as either HTTP Basic with **any username** and the key as the **password**, or `Authorization: Bearer <key>` |
| **Stratum** | This page is for pools that run their own stratum. To point hashrate at ours instead (`stratum.subfrost.io`), see [For large pools](./large-pools.md). |

Get a key first: [Getting started for operators](./getting-started.md).

```bash
export SUBFROST_POOL_KEY='sfp_…'

# Basic auth: any username, key as password
curl -sS -u "pool:$SUBFROST_POOL_KEY" -H 'content-type: application/json' \
  -d '{"jsonrpc":"1.0","id":"t","method":"getblockcount","params":[]}' \
  https://pool.subfrost.io

# Bearer: a template (segwit rules are required, as with Core)
curl -sS -H "Authorization: Bearer $SUBFROST_POOL_KEY" -H 'content-type: application/json' \
  -d '{"jsonrpc":"1.0","id":"t","method":"getblocktemplate","params":[{"rules":["segwit"]}]}' \
  https://pool.subfrost.io \
  | jq '.result | {height, previousblockhash, coinbasevalue, txs: (.transactions|length), longpollid}'
```

## Allowed methods

| Method | Notes |
|---|---|
| `getblocktemplate` | Includes BIP22 longpoll. See below. |
| `submitblock` | Sent on to SUBFROST's own nodes as well as the upstream node, so a found block propagates even if one node is slow. |
| `getbestblockhash`, `getblock`, `getblockchaininfo`, `getblockcount`, `getblockhash`, `getblockheader` | Read-only chain queries |
| `getdifficulty`, `getmininginfo`, `getnetworkhashps`, `getmempoolinfo` | Read-only |
| `estimatesmartfee`, `validateaddress` | Read-only |

Any other method returns `-32601 Method not found`. `getnetworkinfo`, `getconnectioncount` and `uptime` are deliberately excluded. If your pool software insists on one of them at startup, check its log for the method name.

`submitblock` results follow Core. `null` means the block was accepted, `"duplicate"` means it is already known, and any other string is the rejection reason (for example `"high-hash"` or `"bad-txnmrklroot"`).

## Limits

| Limit | Value |
|---|---|
| Rate | Per key. Default **120 calls per minute**, with a burst of the same size. Every call in a batch counts. |
| Concurrent longpolls | **4** per key |
| Batch size | **10** calls |
| Request body | **8 MiB** for `submitblock`, **64 KiB** for everything else |
| Longpoll duration | Up to **20 minutes** |

Your account's per-key rate is on the **Account** page.

## Longpoll

Use longpoll instead of tight polling. Send the `longpollid` from the previous template, and the call returns when the template changes:

```json
{"jsonrpc":"1.0","id":"lp","method":"getblocktemplate",
 "params":[{"rules":["segwit"],"longpollid":"<longpollid from the last template>"}]}
```

Give your HTTP client a read timeout of at least 21 minutes for longpoll calls. Don't loop `getblocktemplate` faster than once every few seconds.

## Errors

| Reply | Meaning | What to do |
|---|---|---|
| HTTP 401 + `WWW-Authenticate: Basic realm="subfrostpool"` | Missing, unknown or revoked key, or the account is suspended | Check the key, and mint a new one if needed |
| HTTP 429 + `Retry-After` | Rate limit or longpoll cap reached | Wait `Retry-After` seconds, poll less, use longpoll |
| HTTP 413 | Body too large | Only `submitblock` may exceed 64 KiB |
| HTTP 503 + `Retry-After` | The key service is briefly unavailable | Retry |
| `-32601` | Method not on the allowlist | Use the methods above |
| `-28` | The template provider or its node is warming up or unreachable | Retry with backoff. Pool software already does this. |
| `-10` | The upstream node is in initial block download | Wait |

## Pool software

### public-pool

In public-pool's `.env`:

```bash
BITCOIN_RPC_URL=https://pool.subfrost.io
BITCOIN_RPC_PORT=443
BITCOIN_RPC_USER=pool
BITCOIN_RPC_PASSWORD=sfp_…
BITCOIN_RPC_TIMEOUT=20000
```

Leave the ZMQ settings unset. public-pool then polls for new blocks.

### ckpool

ckpool speaks plain HTTP to its `btcd` entries, so put a local TLS forwarder in front of `pool.subfrost.io` and point ckpool at it:

```bash
socat TCP-LISTEN:8332,bind=127.0.0.1,fork,reuseaddr \
  OPENSSL:pool.subfrost.io:443
```

```json
"btcd": [{
  "url": "127.0.0.1:8332",
  "auth": "pool",
  "pass": "sfp_…",
  "notify": false
}]
```

With no ZMQ or `blocknotify`, ckpool falls back to polling and longpoll.

### DATUM gateway

In `datum_gateway_config.json`, point the `bitcoind` block at SUBFROSTPOOL:

```json
"bitcoind": {
  "rpcurl": "https://pool.subfrost.io",
  "rpcuser": "pool",
  "rpcpassword": "sfp_…",
  "work_update_seconds": 40,
  "notify_fallback": true
}
```

You can't run `blocknotify` against a remote node, so keep `notify_fallback` on. If your build accepts only `host:port`, use the local forwarder from the ckpool section and set `"rpcurl": "127.0.0.1:8332"`.

### NOMP and other getblocktemplate pools

Set the daemon host to `pool.subfrost.io`, port `443`, TLS on, any username, and the key as the password. If the software can't speak TLS, use the local forwarder above.

### Generic bitcoind-RPC clients

Any Bitcoin Core RPC client library works. Python:

```python
import os, requests

r = requests.post(
    "https://pool.subfrost.io",
    auth=("pool", os.environ["SUBFROST_POOL_KEY"]),
    json={"jsonrpc": "1.0", "id": "t", "method": "getblocktemplate",
          "params": [{"rules": ["segwit"]}]},
    timeout=1260,
)
tpl = r.json()["result"]
print(tpl["height"], tpl["coinbasevalue"], len(tpl["transactions"]))
```

`bitcoin-cli` has no TLS, so use it through the local forwarder:

```bash
bitcoin-cli -rpcconnect=127.0.0.1 -rpcport=8332 \
  -rpcuser=pool -rpcpassword="$SUBFROST_POOL_KEY" getblockcount
```

:::note Software that can only post to a fixed path

If your client can't use the root URL, `https://pool.subfrost.io/rpc` is an alias. If it can't add TLS or set a path, a local reverse proxy works, for example in nginx:

```nginx
server {
  listen 127.0.0.1:8332;
  location / {
    proxy_pass https://pool.subfrost.io/rpc;
    proxy_set_header Host pool.subfrost.io;
    proxy_ssl_server_name on;
    proxy_read_timeout 1300s;
  }
}
```

:::

## The dxBTC coinbase outputs (optional)

The dxBTC contribution is **off at launch**, since dxBTC is not live yet, and templates do not carry this field. Once it is turned on, templates carry an extra, non-standard field, `subfrost_coinbase_outputs`:

```json
"subfrost_coinbase_outputs": {
  "version": 1, "dx_bps": 500, "reward_sats": 312500000, "dx_sats": 15625000, "pool_value_sats": 296875000,
  "outputs": [
    {"role": "frbtc-signer", "value": 15625000, "script": "5120…"},
    {"role": "runestone",    "value": 0,        "script": "6a5d…"}
  ],
  "placement": "after the pool payout output(s), before any other OP_RETURN; the witness commitment stays last"
}
```

Plain `getblocktemplate` software ignores unknown fields and builds its own coinbase, which is fine, but then your blocks make no dxBTC contribution. To cooperate, add those outputs after your payout output(s) and before any other `OP_RETURN`, and keep the witness commitment last. The numbers above are illustrative.

## Safety guarantees

- SUBFROSTPOOL never removes upstream transactions from a template.
- Every transaction it adds is checked against the upstream node (`testmempoolaccept`) before it is served, and fees are real sats.
- If anything on the SUBFROST side is unavailable, you get the plain upstream template.
