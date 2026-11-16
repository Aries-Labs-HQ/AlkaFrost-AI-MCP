---
title: FAQ and Limits
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/faq
---

# FAQ and Limits

> Short answers about SUBFROSTPOOL, with every operator and private-flow limit in one place.

## Limits at a glance

| | Limit |
|---|---|
| Stratum | `stratum.subfrost.io`, port 3333 plain and 443 TLS. 4096 concurrent connections and 50 new connections per second per source IP, raised for a partner's proxy addresses on request. |
| Pool API keys per account | 10 active |
| `/rpc` rate | 120 calls/min per key by default, with a burst of the same size. Each call in a batch counts. |
| `/rpc` batch size | 10 calls |
| `/rpc` concurrent longpolls | 4 per key |
| `/rpc` longpoll duration | Up to 20 minutes |
| `/rpc` body | 8 MiB for `submitblock`, 64 KiB otherwise |
| Private-flow batch | 50 calls, private-flow methods only |
| Private transaction window | Default tip+25 blocks, max tip+144 |
| Bundle size | 25 transactions |
| Sign-in sessions | 7 days, or 24 hours idle |
| Verification and reset emails | 3 per address per hour. Links last 24 hours (verify) and 1 hour (reset). |

## Do I have to change my pool software?

No. Change the RPC URL and credentials. See [Connecting pool software](./connecting-pool-software.md).

## Is Stratum available?

Yes. Point any Stratum V1 miner or proxy at `stratum+tcp://stratum.subfrost.io:3333`, or at `stratum+ssl://stratum.subfrost.io:443` for TLS. The username is the BTC address to be paid, optionally followed by `.worker`, and the password is `x`, or `d=<difficulty>` to pin a difficulty. No account is needed. See [For large pools](./large-pools.md) and [How it works](./how-it-works.md#mining-with-the-pool) for how payouts work. Pools that run their own stratum can keep it and take our templates over the RPC instead.

## When are miners paid?

Right after each block the pool finds, the keeper builds one payout transaction that claims each miner's amount from the payout contract and unwraps it to BTC at the miner's address. Every block's distribution and share log are published. Any miner can also submit their own claim with a proof, so a payout never depends on our keeper running.

## Can SUBFROSTPOOL make my blocks worse?

It never removes upstream transactions. Everything it adds is checked against the upstream node first and pays real BTC fees. If anything on the SUBFROST side fails, you get the plain upstream template.

## What happens to the coinbase?

Nothing, unless you opt in. Plain `getblocktemplate` software builds its own coinbase, as it always has. The optional dxBTC outputs are described in [The dxBTC coinbase outputs](./connecting-pool-software.md#the-dxbtc-coinbase-outputs-optional).

## Pool key or SUBFROST API key?

- **Pool key** (`sfp_…`, from pool.subfrost.io): only for `pool.subfrost.io/rpc`.
- **SUBFROST API key** (from [api.subfrost.io](https://api.subfrost.io/)): for the [private flow API](./private-flow-api.md) at `mainnet.subfrost.io/v4/<key>`.

## I lost my key

Keys are stored only as a hash, so they can't be shown again. Revoke the old key and create a new one under **Account → API keys**.

## I lost my authenticator

Sign in with one of your recovery codes. Each recovery code works once.

## Can I pay for inclusion in DIESEL today?

Not on mainnet yet. Requests that carry a payment return `-32501`. Transactions that pay their own BTC fee can already be sent privately.

## Why did my bundle land in a different order, or only partly?

Bundle ordering and all-or-nothing hold only in blocks built from SUBFROSTPOOL templates. A pool that never received the bundle, but saw its transactions some other way, treats them as ordinary transactions.

## Who can see my private transaction?

Searchers see only the fields you list in `hints`, and nothing by default. Raw hex is never streamed. Status queries need your key or a BIP-322 signature, and public stats are aggregate only.
