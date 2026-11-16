---
title: How SUBFROSTPOOL Works
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/how-it-works
---

# How SUBFROSTPOOL Works

> How SUBFROSTPOOL builds block templates, adds checked transactions, and pays miners through an on-chain payout contract and an frBTC unwrap.

Parts that are switched off at launch are marked as such.

Every Bitcoin mining pool runs the same loop. Pool software asks a node for a block template with `getblocktemplate`, hands miners work built from that template, and sends a solved block back with `submitblock`. SUBFROSTPOOL sits inside that loop. It serves the templates, it can add transactions to them that the public mempool never saw, and it can run the pool itself for miners who only bring hashrate.

There are two ways to use it. A pool that already runs its own stratum keeps everything it has and points its template requests at SUBFROSTPOOL instead of its node. A miner with an ASIC points it at our stratum and is paid in BTC by an on-chain contract.

## The parts

| Part | What it does |
|---|---|
| subfrost-tp | The template provider. It speaks the same `getblocktemplate`, `submitblock` and longpoll protocol as Bitcoin Core, so pool software talks to it as if it were a node. |
| Private mempool | Takes transactions and bundles that should be mined without being broadcast first, and offers them to subfrost-tp. See [Private flow API](./private-flow-api.md). |
| Stratum | The pool for individual miners. It hands out work built from subfrost-tp templates and counts shares. |
| Payout contract | An alkane that holds each block's reward as frBTC and pays it out to the miners on that block's payout list. |
| pool.subfrost.io | Operator accounts and API keys, live pool and template stats, downloads. |

## Life of a template

When pool software calls `getblocktemplate`, subfrost-tp first fetches a template from the upstream node, which is a normal Bitcoin node. That template is the base. subfrost-tp never removes a transaction from it.

It then looks at what the private mempool is offering. Each candidate is checked against the upstream node with `testmempoolaccept` or `submitpackage` before it is placed in a template, so anything that would make the block invalid is dropped there. A candidate also has to pay its fee in real BTC. The fee lands in `coinbasevalue`, so the pool's own accounting works exactly as before.

If any SUBFROST-side piece is unavailable (the private mempool, the policy that orders candidates, the alkanes index), subfrost-tp serves the plain upstream template. A pool on SUBFROSTPOOL therefore never mines a worse block than its node alone would have given it.

When a block is solved, `submitblock` goes to the upstream node and to our own nodes, which relay it.

## Where the extra transactions come from

Some transactions should not be broadcast before they are mined: a trade that can be front-run, several transactions that have to land together and in order, or a transaction stuck at a low fee. The [Private flow API](./private-flow-api.md) accepts these on `mainnet.subfrost.io/v4/<key>` and holds them for the pools on SUBFROSTPOOL. Each entry has a window of block heights. If it is still unmined when the window ends, it is dropped, or broadcast publicly if the sender asked for that.

Inclusion can also be paid in an alkanes asset, DIESEL first. Bitcoin consensus only lets a coinbase claim the subsidy plus real BTC fees, so an alkanes payment is worth nothing to a pool until it becomes BTC in the same block. The payment is made atomic in two steps:

1. The user's transaction pays its price in the asset to the SUBFROST treasury and pays no BTC fee. It carries a small anchor output.
2. SUBFROST adds a child transaction that spends the anchor and pays the BTC fee for both. The child cannot confirm without its parent, so the pool sees one ordinary high-fee package and is paid in sats.

Paying in an alkanes asset is not enabled on mainnet yet. Until it is, such requests return `-32501`, and transactions that pay their own BTC fee can still be sent privately.

## Mining with the pool

A miner needs no account. Point the miner at `stratum+tcp://stratum.subfrost.io:3333`, or `stratum+ssl://stratum.subfrost.io:443` for TLS. The stratum username is the BTC address to be paid, optionally followed by a worker name (`bc1q….rig1`), and the password can be anything. The pool fee is 0% at launch. It will move to 1% later, and that change will be announced in advance.

Shares are counted over a sliding window of recent work, sized as a multiple of the network difficulty (the TIDES method that OCEAN uses). When the pool finds a block, each address is paid in proportion to its share of that window. The full distribution for every block, together with the share log behind it, is published so anyone can recompute it.

What happens next is where SUBFROSTPOOL differs from a normal pool. There is no pool wallet. The block reward goes into a contract, and each block's payout list is committed in the block itself.

1. Our coinbase pays the whole reward to the frBTC signer and, in the same transaction, wraps it into frBTC and deposits it into the payout contract. The deposit records the block height, the Merkle root of that block's payout list and the amount. The frBTC from block N can only ever pay the miners on block N's list.
2. Right after the block, the pool builds one payout transaction for it. For each miner the transaction claims that miner's amount from the contract with a Merkle proof, then unwraps the frBTC to BTC at the miner's own address. The contract checks the layout before it pays: the claim must flow into an frBTC unwrap whose destination is the address on the miner's leaf, so nobody, ourselves included, can send a miner's payout anywhere else.
3. We mine that payout transaction in our own next blocks at no fee. It is a normal transaction, so any other pool's block can include it as well.
4. The frBTC signer then pays each miner in BTC. A coinbase output cannot be spent for 100 blocks, but frBTC is fungible, so the BTC comes from coins the signer already holds that have matured. The new coinbase output joins those coins 100 blocks later.

A miner who prefers frBTC can be paid in frBTC instead, with no unwrap. Any miner can also submit their own claim at any time with a proof from the pool, so a payout never depends on our keeper running.

Instant payment needs the signer's mature coins to cover the rewards still maturing, about 100 blocks' worth of the blocks we find. If the pool grows past that, unwraps wait for coinbases to mature, which is the same 100-block timing as any other pool. They do not fail.

## What it costs

| | |
|---|---|
| Pool fee | 0% at launch, 1% later (announced in advance) |
| frBTC wrap | 0.1%, charged by frBTC when the reward is wrapped |
| Payout transaction fee | None. We include payout transactions in our own blocks. |
| Template provider for pools | Covered by the partner agreement |

The 0.1% wrap is the cost of not holding miners' money in a pool wallet.

## What you are trusting

| Who | What they trust |
|---|---|
| A pool using subfrost-tp | Nothing new. Every added transaction is checked by its own node first and pays real BTC. |
| A miner on our stratum | Our share accounting, as with any pool. It can be checked, because every block's distribution and share log are published and the payout root is in the block. |
| A miner, once the block is mined | Only the payout contract. Each block's frBTC can pay that block's list and nothing else. |
| A miner taking BTC | frBTC's signing group, which pays the unwrap. This is the same trust as holding frBTC. |

## The coinbase share for dxBTC (later)

Once dxBTC is live, a share of the reward on blocks whose coinbase we build can be wrapped to frBTC in the coinbase and deposited into the dxBTC vault, which raises the dxBTC share price without minting new shares. This is off at launch: templates run with no coinbase split. Plain `getblocktemplate` pool software always builds its own coinbase and is unaffected either way.

## What is live now

On mainnet, the stratum at `stratum.subfrost.io` (port 3333, and 443 with TLS), the payout contract at alkane `4:7030` and the keeper that builds each block's payout transaction are live. So are the template provider at `pool.subfrost.io/rpc`, the operator site at [pool.subfrost.io](https://pool.subfrost.io) and the private flow for transactions that pay their own BTC fee. Alkanes-paid inclusion and the dxBTC coinbase share are not switched on yet.

## Next

[For large pools](./large-pools.md) if you bring hashrate, [Getting started for operators](./getting-started.md) if you run your own stratum, or [Connecting pool software](./connecting-pool-software.md) if you already have a key.
