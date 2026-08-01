<div align="center">

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/aries-wordmark.png" />
    <img alt="Aries" src="assets/aries-wordmark-ink.png" width="300" />
  </picture>
</p>

<p align="center">
  <img src="assets/aries-logo-tagline.png" alt="Aries — Alkanes + SUBFROST" width="270" />
</p>

### Make any AI assistant fluent in building on Alkanes&nbsp;+&nbsp;SUBFROST

[![License](https://img.shields.io/badge/License-MIT-111111.svg)](#license)
[![Model Context Protocol](https://img.shields.io/badge/Model_Context_Protocol-server-5B50E8.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)

**[Use the hosted Aries API &nbsp;·&nbsp; alkanes.build/aries](https://alkanes.build/aries)**

</div>

---

Aries is the AI-native front door for building on Alkanes and utilizing SUBFROST as a developer.

Concretely: a [Model Context Protocol](https://modelcontextprotocol.io) server
that gives any MCP-capable assistant — **Claude Code, Claude Desktop, Cursor** —
a knowledge and live-chain-data layer for the **Alkanes** metaprotocol and the
**SUBFROST** network. Point your assistant at Aries and it can read the protocol
docs, query the live chain, and scaffold contracts without leaving the editor.

**The tools are free. Trust is earned.**

There are two ways to use it: the **hosted API** (recommended) and a
**bring-your-own-key local install**.

## About this repo

This repo is the open baseline Aries began from — the bring-your-own-key distro
and the frozen baseline corpus. The hosted instance has evolved server-side and
is the living edition; what you find here is the starting point, not a mirror of
it. External pull requests are not the contribution path for this repo. Bug
reports via Issues are genuinely welcome, and knowledge contributions flow
through the hosted incident loop and the Telegram group, where they are reviewed
before they enter the living corpus. We would rather have your findings than
your patches.

---

## The hosted API — the living Aries

> ### [Connect to hosted Aries &nbsp;·&nbsp; alkanes.build/aries](https://alkanes.build/aries)

Hosted Aries is **free for all developers**. Nothing here is for sale.

It is a **continuously-learning instance**: on top of the baseline docs it
carries an **ever-growing corpus of real-world lessons** — reviewed incident
knowledge contributed by every connected agent — that a fresh local clone does
not have. Connect one URL and your assistant inherits the whole shared brain,
which gets smarter as the corpus grows.

### Getting a key

1. Join the Telegram group: **[t.me/+DLc96-DPNJRlZTgx](https://t.me/+DLc96-DPNJRlZTgx)**
2. DM the key bot: **[@AriesKeyBot](https://t.me/AriesKeyBot?start=claim)**
3. Press **Start**.
4. Your key arrives in DMs.

Keys are rate-limited while Aries is in beta — currently **10 requests per
minute** and **1,000 per day**. Those are the beta numbers, not a commitment to
any particular limit later.

Prefer to run everything yourself? The open, bring-your-own-key edition in this
repo is below.

## Hosted vs. local

Both editions ship the same **21 tools** and the same **75-doc baseline**. The
difference is the **living corpus** — and who manages the keys.

| | Hosted &nbsp;·&nbsp; [alkanes.build/aries](https://alkanes.build/aries) | Local &nbsp;·&nbsp; this repo |
| --- | --- | --- |
| All 21 tools | Yes | Yes |
| 75-doc baseline knowledge | Yes | Yes |
| Live SUBFROST chain data | Yes — managed | Yes — your own key |
| **Living corpus of real-world lessons** | **Yes — ever-growing** | No |
| Accumulated incident learning | Yes | No (local store only) |
| Setup | Connect a URL | Clone, install, build |
| SUBFROST key | Managed for you | You provide |
| Cost | Free | Free |

Local gives you a complete, self-contained companion on the **static** baseline.
Hosted adds the **continuously-learning brain** on top. Start local if you like;
move to [hosted](https://alkanes.build/aries) when you want the living corpus.

---

## Run it locally (bring your own key)

Clone this repo and run Aries on your own machine with your **own SUBFROST API
key**. You get the full toolset and the complete **75-doc static baseline
knowledge** — without the hosted instance's accumulated learning.

### Get a SUBFROST API key

Aries talks to the SUBFROST gateway with your key.

> **[Sign up for a SUBFROST API key](https://api.subfrost.io/auth/signup?ref=82D1DE7C)** —
> sign up with our SUBFROST referral link and get **50% off your first month**.

That is a referral link: signing up through it supports Aries Labs at no extra
cost to you.

### Quickstart

**Requirements:** [Node.js](https://nodejs.org) >= 20 and a
[SUBFROST API key](https://api.subfrost.io/auth/signup?ref=82D1DE7C) (sign up with
our referral link for **50% off your first month**).

```bash
git clone https://github.com/Aries-Labs-HQ/alkanes-aries.git
cd alkanes-aries
npm install
cp .env.example .env        # then set SUBFROST_API_KEY (see below)
npm run build
```

Set your key in `.env`:

```bash
SUBFROST_API_KEY=your-key-here
# optional override:
# SUBFROST_RPC=https://mainnet.subfrost.io/v4/jsonrpc
```

The key is sent as the `x-subfrost-api-key` header (never in a URL) and never
leaves your machine except as that outbound header. `.env` is gitignored.

### Connect your MCP client

**Claude Code**

```bash
claude mcp add --scope local --transport stdio aries \
  -e SUBFROST_API_KEY=YOUR_KEY \
  -- node /absolute/path/to/alkanes-aries/dist/index.js
```

Verify with `claude mcp list`, then `/mcp` in a session. (`--` separates Claude's
flags from the launch command; keep `-e KEY=value` right before `--` — it is
variadic and will otherwise swallow the server name.)

**Cursor / Claude Desktop** — any client that takes a JSON server config:

```json
{
  "mcpServers": {
    "aries": {
      "command": "node",
      "args": ["/absolute/path/to/alkanes-aries/dist/index.js"],
      "env": { "SUBFROST_API_KEY": "your-key-here" }
    }
  }
}
```

Your assistant now has all 21 Aries tools.

---

## What's inside — 21 tools, four layers

| Layer | Tools |
| --- | --- |
| **Knowledge** — a searchable corpus of **75 curated docs**: the Alkanes metaprotocol, the SUBFROST JSON-RPC/REST reference, alkanes-rs, tutorials, oracle docs, reference contracts | `aries_search`, `aries_doc`, `aries_full_doc`, `aries_catalog`, `aries_tutorials` |
| **Chain data** — live, read-only queries against the SUBFROST gateway: holdings, contract metadata, bytecode, simulate, frBTC peg + DIESEL status, oracle reads, AMM pools, guarded RPC | `aries_tokens_by_address`, `aries_token`, `aries_contract_meta`, `aries_bytecode`, `aries_simulate`, `aries_frbtc_status`, `aries_diesel_status`, `aries_oracle_read`, `aries_oracle_price`, `aries_pools`, `aries_pool_info`, `aries_rpc` |
| **Dev** — protocol constants and contract scaffolds, including `orbital` NFTs | `aries_constants`, `aries_scaffold` |
| **Learning** — a local incident loop that records gotchas to your own machine as you work | `aries_incident_report`, `aries_incident_query` |

### Ask your assistant things like

> *"Is the frBTC peg live, who's the signer, and how much frBTC exists?"*
>
> *"What Alkanes tokens does `bc1p…` hold?"*
>
> *"Show the AMM pools and a pool's reserves."*
>
> *"How do I build a token / oracle / stablecoin / AMM / Orbital?"*
>
> *"Scaffold an Orbital NFT contract."*

---

## Safety — read-only by design

Aries is **analytics only**. It never signs, broadcasts, or touches wallets or
keys:

- The `aries_rpc` passthrough is **allowlisted to read methods** and explicitly
  blocks broadcast / spend / admin calls.
- Scaffolds and constants are emitted for **you** to run in your own `alkanes`
  CLI, where you hold the keys.
- The local incident loop writes only to your machine and sanitizes secrets,
  keys, and paths out of any report.

Your keys stay yours. Aries only reads and advises.

---

## Configuration

| Variable | Purpose |
| --- | --- |
| `SUBFROST_API_KEY` | **Required** — auth for the live chain-data tools. |
| `SUBFROST_RPC` / `SUBFROST_REST` | Optional gateway overrides (default to mainnet JSON-RPC / REST). |
| `ARIES_INCIDENTS_PATH` | Optional path for your local incident store (default `data/incidents.jsonl`, gitignored). |

Logs go to **stderr** only — stdout is the MCP protocol channel. The doc index
is built from `corpus/` at startup.

## Good to know

- Alkane ids are `{block, tx}` / `block:tx`. frBTC = `32:0`, DIESEL (genesis) =
  `2:0`. Protocol tag is always `1`.
- Read contract state with `aries_simulate`: the opcode goes in `inputs`
  (e.g. `[103]`), not `data`.
- **Orbitals** (Alkanes NFTs) are a `Token` with total supply 1 + opcode `1000`
  for media; read them with `aries_oracle_read`, scaffold one with
  `aries_scaffold orbital`.
- Extend the corpus by editing `corpus/` or adding URLs to `scripts/ingest.ts`
  (HTML cleaned via turndown + jsdom; raw `.md`/`.rs` taken verbatim).

## Links

| | |
| --- | --- |
| Hosted, continuously-learning Aries | **[alkanes.build/aries](https://alkanes.build/aries)** |
| Aries Telegram group | **[t.me/+DLc96-DPNJRlZTgx](https://t.me/+DLc96-DPNJRlZTgx)** |
| Aries key bot | **[@AriesKeyBot](https://t.me/AriesKeyBot?start=claim)** |
| SUBFROST API keys (referral, 50% off first month) | **[api.subfrost.io](https://api.subfrost.io/auth/signup?ref=82D1DE7C)** |
| Model Context Protocol | **[modelcontextprotocol.io](https://modelcontextprotocol.io)** |

## License

MIT
