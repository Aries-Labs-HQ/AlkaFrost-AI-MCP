---
title: SUBFROSTPOOL for Large Pools
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/large-pools
---

# SUBFROSTPOOL for Large Pools

> Two ways for a large pool or mining operator to work with SUBFROSTPOOL. Point hashrate at our stratum and be paid by an on-chain contract, or keep your own stratum and take our block templates.

There are two ways to bring a large operation to SUBFROSTPOOL. They can be combined, and both run on mainnet today.

| | Point hashrate at our stratum | Take our templates |
|---|---|---|
| What you change | The pool URL in your miners or your stratum proxy | The RPC URL your pool software uses for `getblocktemplate` |
| Who builds the coinbase | SUBFROSTPOOL | You, as today |
| How you are paid | In BTC, by the payout contract and an frBTC unwrap, to the address in the username | Your own coinbase, plus the real BTC fees of any private-flow transactions in your templates |
| Account needed | No | Yes, a pool API key from [pool.subfrost.io](https://pool.subfrost.io) |
| Fee | 0% pool fee, 0.1% frBTC wrap | Covered by the partner agreement |
| Docs | This page | [Connecting pool software](./connecting-pool-software.md) |

## Point hashrate at our stratum

| | |
|---|---|
| Stratum | `stratum+tcp://stratum.subfrost.io:3333` |
| Stratum over TLS | `stratum+ssl://stratum.subfrost.io:443` |
| Username | The BTC address to be paid, optionally followed by a worker name: `bc1q….site1` |
| Password | `x`, or `d=<difficulty>` to pin a fixed difficulty |
| Protocol | Stratum V1, with `mining.configure` version rolling (ASICBoost), `mining.suggest_difficulty` and `mining.extranonce.subscribe` |

The TLS port uses a publicly trusted certificate for `stratum.subfrost.io`, so a proxy can verify it with its normal CA store.

### Behind a stratum proxy

Most large operators run their own proxy in front of their farms and send one or a few aggregated connections upstream. That works as is:

- **Pin the difficulty.** A proxy at hundreds of PH/s should send a share every few seconds, not hundreds a second. Set the password to `d=<difficulty>`, or send `mining.suggest_difficulty`. A difficulty of about `hashrate × 10 / 2^32` gives one share every 10 seconds. For 500 PH/s that is about 1.2e9. Without a pin, the connection starts at 65,536 and vardiff raises it, and a burst of shares above the message budget moves the difficulty up at once instead of closing the connection.
- **Workers.** One connection can authorize many workers (`address.worker`), up to 1024 per connection. Each worker can use its own payout address, so sub-accounts are just different addresses or worker names.
- **Connection limits.** Each source IP can hold 4096 concurrent connections and open 50 new ones per second. Send us your proxy's egress addresses and we lift those limits for them.
- **Failover.** Keep your current pool as the proxy's backup upstream, so hashrate falls back automatically if our stratum restarts.

### How you are paid

Shares are counted over a sliding window of recent work, sized as a multiple of the network difficulty (TIDES). When the pool finds a block, every address with shares in the window gets its part of that block's reward.

The coinbase wraps the reward into frBTC and deposits it into the payout contract (alkane `4:7030`) together with the Merkle root of that block's payout list. Right after the block, our keeper claims each address's amount and unwraps it to BTC at that address, and we mine that payout transaction in our next blocks at no fee. The contract only pays a claim into an unwrap to the address on its leaf, so nobody, SUBFROST included, can redirect a payout. You can also submit your own claim with a proof at any time. The full flow is in [How it works](./how-it-works.md#mining-with-the-pool).

Each payout transaction carries a few claims, so fewer payout addresses means fewer payout transactions. If your accounting allows it, use one payout address per settlement account and split it internally.

Every block's distribution and share log are published, so you can recompute what each address was owed. Blocks the pool has found are listed at [pool.subfrost.io/blocks](https://pool.subfrost.io/blocks).

### Try it first

The same stack runs on testnet4 at `stratum+tcp://stratum-testnet4.subfrost.io:3333` with a `tb1` address. Point one machine or one proxy there to check your setup end to end before moving mainnet hashrate. See [SUBFROSTPOOL on testnet4](./testnet4.md).

## Take our templates

If you run your own stratum and want to keep your coinbase, point your pool software's template requests at SUBFROSTPOOL instead of your node. Templates keep every upstream transaction and only add checked transactions that pay real BTC fees, and if anything on our side is unavailable you get the plain upstream template. Accounts, keys, limits and configuration for ckpool, public-pool, DATUM and NOMP are in [Getting started](./getting-started.md) and [Connecting pool software](./connecting-pool-software.md).

## Talk to us first

Before you point a large share of your hashrate at the pool, contact SUBFROST. We lift the connection limits for your proxy addresses, agree a partner agreement for template access, and stay in touch during the switch.
