---
title: Orbitals — Alkanes NFTs (standard, reading, and porting)
source_url: https://github.com/kungfuflex/alkanes-rs/tree/master/crates/alkanes-std-orbital
---

# Orbitals — Alkanes NFTs

"Orbitals" are the community NFT standard on Alkanes. An Orbital is **not an
inscription** — it's a normal Alkanes contract (a `Token`) whose total supply is
**1**, plus a view opcode that returns the media bytes. The NFT logic (rendering,
traits, swaps) lives in the WASM contract. Canonical reference:
`alkanes-std-orbital` in alkanes-rs (`alkanes-rs/std-orbital.md`).

## The standard opcode interface (verified from alkanes-std-orbital)

The reference Orbital dispatches an `OrbitalMessage` enum:

| Opcode | Method | Returns | Notes |
|---|---|---|---|
| 0 | Initialize | — | one-time; sets total_supply = 1 and mints 1 unit of itself |
| 99 | GetName | String | token name |
| 100 | GetSymbol | String | token symbol |
| 101 | GetTotalSupply | u128 (LE) | 1 for a single Orbital |
| 1000 | GetData | bytes | the media — reference returns a 1×1 PNG; "NFT data can be anything" (PNG/SVG/…) |

So an Orbital = "a Token (99/100/101) + GetData (1000)". This mirrors the
fungible-token convention (cf. frBTC: 99/100 name/symbol) — an NFT is just supply-1.

## Reading an Orbital (read-only)

Given an Orbital's alkane id `{block, tx}`:

- name → `alkafrost_oracle_read { block, tx, opcode: 99, decode: "utf8" }`
- symbol → `alkafrost_oracle_read { block, tx, opcode: 100, decode: "utf8" }`
- supply → `alkafrost_oracle_read { block, tx, opcode: 101, decode: "u128" }`
- **media** → `alkafrost_oracle_read { block, tx, opcode: 1000, decode: "raw" }` (hex
  bytes; PNG/SVG) — or `alkafrost_simulate` with `inputs:[1000]`.

No dedicated tool is needed: the simulate / oracle-read path reads Orbitals.

## Reference source

- **alkanes-std-orbital** — canonical minimal Orbital → `alkanes-rs/std-orbital.md`

## Build & deploy

Build the contract to WASM, then deploy and inspect it with `alkanes-cli`:

```bash
cargo build --target wasm32-unknown-unknown --release
```

For deploying, tracing and simulating, follow the official SUBFROST guides in
the corpus: `subfrost/build/quickstart.md`, `subfrost/build/interacting-via-cli.md`
and `subfrost/api-reference/cli-sdk/alkanes.md`. Contracts are deployed in a
witness envelope (gzipped WASM) and indexed by Metashrew. Alkanes mainnet
genesis block is 880000.

## Porting NFTs from another runtime

- **Not 1:1.** Rewrite contracts in **Rust → `wasm32-unknown-unknown`**, implement
  the `Token` trait + `GetData` (opcode 1000) for NFT media.
- **State:** use the runtime's `StoragePointer` / `KeyValuePointer` (see
  std-orbital).
- **Collection vs single:** a collection contract can mint child NFT alkanes, or
  use one supply-1 Orbital per token for simpler cases.
- **Media:** render on-chain (e.g. generated SVG) or embed bytes in `GetData`. The
  1×1 PNG in the reference is just a placeholder.
- **Test path:** regtest → signet → mainnet.
- Start from `alkafrost_scaffold orbital`.
