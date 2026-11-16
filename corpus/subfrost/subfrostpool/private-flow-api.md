---
title: Private Flow API
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/private-flow-api
---

# Private Flow API

> SUBFROSTPOOL's private mempool over JSON-RPC. Private transactions, bundles, simulation, inclusion quotes, acceleration, stats, searcher programs and the /streamhints SSE feed.

The private flow is a Flashbots-style private mempool, translated to Bitcoin. You hand a transaction or an ordered bundle to SUBFROSTPOOL instead of broadcasting it. It goes into SUBFROSTPOOL's templates (and those of partner pools) and is never relayed on the P2P network unless you ask for a fallback broadcast.

```
POST https://mainnet.subfrost.io/v4/YOUR_API_KEY
```

JSON-RPC 2.0 (1.0 also works). `params` may be positional or named.

:::warning Status (October 2026)

Paid inclusion is **not yet enabled on mainnet**. A `sendprivatetransaction` that carries a `payment` returns `-32501` ("alkanes-paid inclusion unavailable"), and `getinclusionfees` lists no priced assets. Asset prices come from a stub table until the live AMM price source is connected. Private transactions and bundles that pay their own BTC fee are not affected.

:::

## Authentication

Use a regular **SUBFROST API key** from [api.subfrost.io](https://api.subfrost.io/), the same key as for the rest of the [SUBFROST API](../api-reference/getting-started/authentication.md). Pool keys (`sfp_…`) don't work here.

- **In the path:** `https://mainnet.subfrost.io/v4/YOUR_API_KEY`
- **In a header:** `https://mainnet.subfrost.io/v4/jsonrpc` with `X-Subfrost-Api-Key: YOUR_API_KEY`

| Who | Can call |
|---|---|
| Anyone, no key | `getpoolstats`, `getprivatemempoolinfo`, `getinclusionfees` |
| Any API key (`user`) | Send, cancel, simulate and query your own entries, `quoteinclusion`, `accelerate`, `getprepaidbalance`, your own stats |
| Searcher keys (`searcher`) | Also backrun bundles, `/streamhints` and searcher programs. Granted by arrangement with SUBFROST. |

Batches of up to 50 calls are accepted, but only if every call in the batch is a private-flow method. Mixing them with other methods returns `-32600`.

```bash
curl -s https://mainnet.subfrost.io/v4/jsonrpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getinclusionfees","params":[]}'
```

```json
{"jsonrpc":"2.0","id":1,"result":{
  "min_feerate_sat_vb":1.0,
  "feerate_sat_vb_by_blocks":{"1":1.069,"3":1.069,"6":1.003},
  "pool":"subfrostpool","partner_pools":[],"partner_hashrate_share":0.0,
  "priced_assets":[],"price_source":"price table (stub)"}}
```

## How Bitcoin changes the model

- **No account nonce.** You can cancel only while an entry is still private. After it's broadcast, your only recourse is RBF.
- **Atomicity is ours, not consensus.** Bundles are ordered, contiguous and all-or-nothing **only in blocks built from SUBFROSTPOOL templates**. Mined elsewhere, a transaction is just a transaction.
- **Ownership.** You prove an entry is yours with the API key that submitted it, or with a BIP-322 signature from a key that controls one of its inputs.
- **Public transactions are never demoted.** Nothing here can evict, reorder or delay public mempool transactions. `accelerate` only adds priority.

## Send and cancel

### `sendprivatetransaction(tx_hex, opts?)`

| Option | Meaning |
|---|---|
| `blockHeight` | Exact height |
| `minBlockHeight` | Earliest eligible height |
| `maxBlockHeight` | Latest eligible height. Default tip+25, max tip+144. |
| `fallback` | `"drop"` (default) or `"broadcast"` after `maxBlockHeight` |
| `hints` | What searchers may see: any of `"txid"`, `"outputs"`, `"inputs"`, `"alkanes_calls"`, `"fee"`. Default: nothing. |
| `payment` | `{"ticket": …}` from `quoteinclusion`, for alkanes-paid inclusion (not yet enabled on mainnet) |

The transaction is validated with `testmempoolaccept` and must pay its own fee.

```json
→ {"jsonrpc":"2.0","id":1,"method":"sendprivatetransaction",
   "params":["0200…",{"maxBlockHeight":971300,"fallback":"broadcast","hints":["txid","fee"]}]}
← {"jsonrpc":"2.0","id":1,"result":{"id":"ptx-…","txids":["…"],"status":{"status":"pending"},
   "min_block_height":971251,"max_block_height":971300,"hint_id":"h-…"}}
```

### `sendbundle(opts)`

| Option | Meaning |
|---|---|
| `txs` | 1 to 25 raw transactions, parents first |
| `blockHeight` / `minBlockHeight` / `maxBlockHeight` | Eligibility window, as above |
| `replacementUuid` | Replaces your pending bundle with the same UUID |
| `revertingTxids` | Transactions whose **alkanes** execution may revert without dropping the bundle. BTC validity is never optional. |
| `backrun` | A hint id. The bundle is placed right after that entry. Searcher role only. |
| `fallback`, `hints` | As above |

```json
→ {"jsonrpc":"2.0","id":2,"method":"sendbundle",
   "params":[{"txs":["0200…","0200…"],"maxBlockHeight":971275}]}
← {"jsonrpc":"2.0","id":2,"result":{"id":"bdl-…","txids":["…","…"],"status":{"status":"pending"},
   "min_block_height":971251,"max_block_height":971275,"hint_id":null}}
```

`payment` on `sendbundle` is not supported yet (`-32501`).

### `cancelprivatetransaction(id|txid, auth?)` / `cancelbundle(id|replacementUuid, auth?)`

These work only while the entry is pending or templated. If you're not calling with the key that submitted it, pass `auth: {"address": "<address controlling one of its inputs>", "signature": "<BIP-322 simple, base64>"}`, signed over the message `subfrost-mempool:cancel:<record id>`.

## Status

### `getprivatetransactionstatus(id|txid, auth?)` / `getbundlestatus(id|txid, auth?)`

These need the same ownership as cancel, with BIP-322 message `subfrost-mempool:status:<id>`. The reply is the record without raw hex, and its `status` is one of the following.

| `status` | Meaning |
|---|---|
| `pending` | Accepted, waiting for its window |
| `templated` | In a current template (`height`, `pools`) |
| `mined` | In a block (`height`, `blockhash`) |
| `expired` | Window passed, dropped |
| `broadcast-fallback` | Window passed, broadcast publicly |
| `cancelled` | Cancelled by you |
| `rejected` | Refused (`reason`) |

## Simulate

### `callbundle(txs[], opts?)`

This dry-runs a sequence against the tip. The BTC side runs `testmempoolaccept` over the sequence. The indexer side runs the bundle as a hypothetical next block through the alkanes indexer. The reply has per-transaction fees and vsize, alkanes traces, balance deltas and revert reasons. It is fuel-, size- and rate-limited, and results are cached until the next block.

| Option | Meaning |
|---|---|
| `indexer` | Default `"alkanes"` |
| `views` | `[{"indexer","view","input_hex"}]` to read after the simulation |
| `program` | A searcher program id |

```json
← {"result":{"btc":{"accepted":true,"fee_sats":2000,"vsize":110,"reason":null},
   "simulation":{"backend":"…","txs":[…],"views":[…],"total_fuel_used":…},
   "cached":false,"height":971251,"tip":"…"}}
```

If the reply says `"state": "tip"`, the views read the confirmed tip and not the post-simulation state.

## Inclusion pricing and acceleration

### `getinclusionfees()`

Public. Returns the minimum feerate, feerates for 1, 3 and 6 blocks, partner pools and their hashrate share, and the priced assets.

### `quoteinclusion(txs[] | vsize, {asset?, blocks?})`

`asset` is an alkane id such as `"2:0"` (DIESEL), or leave it out to get a price in sats. `blocks` defaults to 3. The reply has `outlay_sats` (what the sponsor child pays), `required_sats`, the asset `amount`, `expiry_height` and, when signing is enabled, a signed `ticket`.

```json
{"jsonrpc":"2.0","id":3,"method":"quoteinclusion","params":[150,{"blocks":3}]}
```

Paying in alkanes works like this once it is enabled on mainnet:

1. Call `quoteinclusion([parent_hex], {"asset":"2:0"})` to get an `amount` and a `ticket`.
2. Build the parent as a **version 3** transaction with **0 BTC fee** and a **P2A anchor** output (`51024e73`). Give it a protostone that pays at least `amount` into the treasury call named in the ticket.
3. Send it with `sendprivatetransaction(parent_hex, {"payment": {"ticket": …}})`.
4. SUBFROSTPOOL simulates the parent, checks the payment, marks the ticket used and attaches a sponsor child that spends the anchor and pays the BTC fee. The entry becomes the `[parent, child]` package.

An underpayment does not use up the ticket.

### `accelerate(txid, {feeDeltaSats, payment: {"type":"prepaid"}, blocks?})`

Use this for a transaction that is already public and stuck in the mempool. The fee delta reorders SUBFROSTPOOL's templates only. It never changes `coinbasevalue` or the node's mempool, and it is debited from your prepaid balance. `getprepaidbalance()` shows the balance. Prepaid balances are credited by arrangement with SUBFROST.

## Stats

| Method | Who | Returns |
|---|---|---|
| `getpoolstats()` | Public | Pool name, partner pools and hashrate share, tip height, active and recently mined private entries |
| `getprivatemempoolinfo()` | Public | Count, vsize and a feerate histogram. Aggregate only. |
| `getuserstats()` | Own key | Entries, status breakdown, inclusion rate, average blocks to inclusion, rejections by reason, prepaid balance |
| `getbundlestats(id)` | Own entries | The record plus blocks-to-first-template and blocks-to-inclusion |

```json
{"jsonrpc":"2.0","id":1,"result":{"pool":"subfrostpool","partner_pools":[],"partner_hashrate_share":0.0,
 "tip_height":971250,"private_entries_active":0,"private_entries_mined_recent":0,"template":null}}
```

## Hint stream: `GET /v4/<key>/streamhints`

Server-Sent Events for searcher keys. The stream opens with the current hints, then sends live events:

```
event: hint
data: {"type":"hint","hint":{"hint_id":"h-…","kind":"…","max_block_height":971300,"txs":[{"txid":"…"}],"fee":…}}

event: removed
data: {"type":"removed","hint_id":"h-…"}
```

A hint carries only the fields its sender chose in `hints`. Raw transaction hex is never sent. To backrun an entry, send a bundle with `backrun: "<hint_id>"`.

```bash
curl -N -H 'Accept: text/event-stream' https://mainnet.subfrost.io/v4/YOUR_API_KEY/streamhints
```

## Searcher programs

Searchers can register their own indexer (wasm, metashrew ABI), which runs over confirmed blocks and over simulations, reading only the indexers its key is allowed to track. Registration is by arrangement with SUBFROST.

| Method | |
|---|---|
| `registersearcherprogram({name, kind, code_hex, sha256?, reads[], backfill_from?, fuel_per_block?})` | `kind` is `"wasm"` or `"wasm-transform"`. `"bpf"` returns `-32501`. Indexing starts at tip+1 unless you give `backfill_from`. |
| `unregistersearcherprogram(name)` | |
| `listsearcherprograms()` | |
| `getsearcherprogramstatus(name)` | |
| `searcherview(name, view, input_hex, height?)` | |
| `getsearcherusage(from?, to?)` | Metered fuel, storage and view calls. There is no billing yet. |

Programs are addressed by name within your account.

## Errors

| Code | Meaning |
|---|---|
| `-32001` | API key required |
| `-32003` | Forbidden: not yours, missing role, or an indexer your key may not read |
| `-32005` | Quota exceeded |
| `-32501` | Not implemented yet (paid inclusion on mainnet, `payment` on `sendbundle`, BPF programs) |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32600` | Invalid request, including mixed batches |
| `-26` | Rejected: mempool policy, invalid, or wrong state |
| `-28` | Upstream unavailable, retry |
| `-5` | Not found |

At the HTTP level, an invalid key in the path returns `401 INVALID_API_KEY`.
