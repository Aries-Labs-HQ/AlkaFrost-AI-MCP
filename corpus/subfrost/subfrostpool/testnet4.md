---
title: SUBFROSTPOOL on testnet4
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/testnet4
---

# SUBFROSTPOOL on testnet4

> Point an ASIC at the SUBFROSTPOOL testnet4 stratum, the full mainnet stack run on testnet4, and see what each block does.

:::info[Coming Soon]
The testnet4 pool is being brought up now. The status table at the bottom says which parts are running. Testnet4 coins have no value.
:::

The testnet4 pool is SUBFROSTPOOL as it will run on mainnet: the same template provider, private mempool, stratum, payout contract and frBTC unwrap, all on testnet4 instead of Bitcoin. The backend is [testnet4.subfrost.io](https://testnet4.subfrost.io), which runs its own Bitcoin Core node, alkanes indexer and explorer. Every block the pool finds goes through the same steps a mainnet block will, so anything that breaks here gets fixed before it can cost real BTC.

An ASIC does not know which network it is mining. It hashes the work it is given, so the same machine and firmware that mines on mainnet can mine on testnet4 with only the pool settings changed.

## Point a miner at it

Use these settings in the miner's pool configuration (most ASIC web interfaces have three fields per pool):

| Field | Value |
|---|---|
| URL | `stratum+tcp://stratum-testnet4.subfrost.io:3333` |
| Username | Your **testnet4** address, optionally with a worker name: `tb1q….rig1` |
| Password | `x` (anything works) |

The username has to be a testnet4 address, starting with `tb1`. A mainnet `bc1` address is refused, because the payout would be made on testnet4. Any wallet that supports testnet4 can give you one, for example Bitcoin Core started with `-testnet4`, Sparrow in testnet mode, or the SUBFROST wallet with **Settings → Network → Testnet4**.

There is no account and no signup. The pool fee is 0%.

If the miner supports a second pool, leave your normal pool there as a fallback so the machine keeps working if the testnet4 stratum is restarted.

## Check that it is working

1. In the miner's status page the pool should show as alive, with accepted shares going up within a minute or two.
2. Rejected shares should stay close to zero. A steady stream of rejects usually means the miner is pointed at the wrong port or is using an address the pool does not accept.
3. Blocks the pool finds show up in the [testnet4 explorer](https://testnet4.subfrost.io/explorer). Our coinbase pays the frBTC signer and carries the payout contract's deposit, so it is easy to tell apart from other testnet4 blocks.

Testnet4 lets anyone mine a block at difficulty 1 when the previous block is more than 20 minutes old, and some miners push timestamps ahead to abuse that. Real hashrate on our stratum mines normal-difficulty blocks with our templates in between, which is also what makes our private-mempool transactions confirm.

## What happens when the pool finds a block

The flow is the one described in [How it works](./how-it-works.md#mining-with-the-pool), on testnet4:

1. The coinbase pays the reward to the testnet4 frBTC signer, wraps it to frBTC and deposits it into the payout contract, together with the Merkle root of that block's payout list.
2. The pool builds a payout transaction that claims each miner's amount and unwraps it to testnet4 BTC at the miner's address, and mines it in its next blocks.
3. The testnet4 frBTC signing group pays the BTC.

The testnet4 frBTC signer is its own 6-of-9 group with its own keys. Nothing on testnet4 uses a mainnet key.

## For pool operators

Pools that run their own stratum can use the testnet4 template provider the same way as on mainnet, following [Connecting pool software](./connecting-pool-software.md) with the testnet4 endpoint. Ask SUBFROST for a testnet4 operator key.

## Status

| Part | Status |
|---|---|
| Testnet4 node, indexer, explorer | Running |
| Template provider (subfrost-tp) | Running |
| Public stratum at `stratum-testnet4.subfrost.io:3333` | Running, served by the SUBFROSTPOOL stratum |
| Payouts | Not yet. Until the payout contract is switched on, each block's reward goes to the pool's own testnet4 address. Shares are still counted and every block's distribution is recorded. |
| Private mempool | Running on `testnet4.subfrost.io/v4/<key>` with a SUBFROST API key, the same as mainnet. See [Private flow API](./private-flow-api.md). |
| frBTC signer on testnet4 | Signing group created; being set as the signer of frBTC on testnet4 |

This page is updated as each part comes up.
