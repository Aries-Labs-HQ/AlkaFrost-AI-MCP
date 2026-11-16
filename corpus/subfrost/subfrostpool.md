---
title: SUBFROSTPOOL
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool
---

# SUBFROSTPOOL

> SUBFROSTPOOL is SUBFROST's block-template provider, private mempool and operator site for Bitcoin mining pools.

SUBFROSTPOOL is a block-template layer for Bitcoin mining pools. Your pool software asks it for `getblocktemplate` and submits blocks back to it, exactly as it would with your own Bitcoin Core node, and the templates it serves can carry extra paid transactions on top of the public mempool.

It has four parts:

| Part | What it is | Where |
|---|---|---|
| **Stratum** | The pool for miners who only bring hashrate. The username is the BTC address to be paid, and each block's reward is paid out by an on-chain contract. | `stratum+tcp://stratum.subfrost.io:3333`, `stratum+ssl://stratum.subfrost.io:443` |
| **Template provider** | A byte-compatible `getblocktemplate` / `submitblock` / longpoll endpoint. It never removes upstream transactions, and if anything on the SUBFROST side fails it serves the plain upstream template. | `https://pool.subfrost.io/rpc` |
| **Private mempool** | A Flashbots-style private flow for Bitcoin: private transactions, bundles, inclusion quotes, acceleration, and a hint stream for searchers. | `https://mainnet.subfrost.io/v4/<key>` |
| **Operator site** | Accounts, API keys, per-key usage, public pool stats and downloads. | [pool.subfrost.io](https://pool.subfrost.io) |

## Who it is for

- **Miners and large pools** that want to point hashrate at our stratum. No account is needed. See [For large pools](./large-pools.md).
- **Pool operators** running ckpool, public-pool, a DATUM gateway, NOMP or any other `getblocktemplate`-based stack. The only change is the RPC URL and credentials. See [Connecting pool software](./connecting-pool-software.md).
- **Wallets, apps and searchers** that want a transaction mined without broadcasting it first, need several transactions to land together and in order, or need a stuck transaction prioritised. See [Private flow API](./private-flow-api.md).

## What it adds to a block

- **Paid inclusion.** Users can pay for inclusion in an alkanes asset (DIESEL first). The payment turns into a real BTC fee in the same block, paid by a sponsor child transaction, so `coinbasevalue` stays honest and your pool accounting does not change.
- **A pool for miners.** Miners can point ASICs at our stratum with a BTC address as the username. Each block's reward is held by an on-chain payout contract and paid out in BTC through an frBTC unwrap. See [How it works](./how-it-works.md).
- **dxBTC contributions (later).** Once dxBTC is live, a share of the reward on blocks whose coinbase cooperates is wrapped to frBTC inside the coinbase and deposited into the dxBTC vault. This is off at launch. Plain `getblocktemplate` pool software builds its own coinbase and is unaffected.

## Status

| Part | Mainnet |
|---|---|
| Stratum at `stratum.subfrost.io` (port 3333, and 443 with TLS) | Live |
| Payout contract (alkane `4:7030`) and payout keeper | Live |
| Template provider at `pool.subfrost.io/rpc` | Live, with a pool API key |
| Operator site at [pool.subfrost.io](https://pool.subfrost.io): accounts, two-factor, API keys, stats | Live |
| Private flow at `mainnet.subfrost.io/v4/<key>` | Live for transactions that pay their own BTC fee |
| Alkanes-paid inclusion | **Not yet enabled.** Requests that carry a payment return `-32501`. |
| dxBTC coinbase share | Off until dxBTC is live |

## Next steps

- [How it works](./how-it-works.md): templates, the private mempool, and how miners are paid.
- [Getting started for operators](./getting-started.md): account, two-factor, API key, Claude skill.
- [For large pools](./large-pools.md): point hashrate at our stratum, or take our templates.
- [Connecting pool software](./connecting-pool-software.md): URL, auth, limits and per-software config.
- [Private flow API](./private-flow-api.md): private transactions, bundles, quotes and the hint stream.
- [SUBFROSTPOOL on testnet4](./testnet4.md): point an ASIC at the testnet4 pool.
- [Downloads](./downloads.md): builds and checksum verification.
- [FAQ and limits](./faq.md).
