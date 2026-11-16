<div align="center">

# AlkaFrost MCP

### Make any AI assistant fluent in building on Alkanes&nbsp;+&nbsp;SUBFROST

[![License](https://img.shields.io/badge/License-MIT-111111.svg)](LICENSE)
[![Model Context Protocol](https://img.shields.io/badge/Model_Context_Protocol-server-5B50E8.svg)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-2ea44f.svg)](CONTRIBUTING.md)

**[Get a SUBFROST API key — 50% off your first month](https://api.subfrost.io/auth/signup?ref=82D1DE7C)**

</div>

---

AlkaFrost MCP is an open-source [Model Context Protocol](https://modelcontextprotocol.io)
server that gives any MCP-capable assistant — **Claude Code, Claude Desktop,
Cursor**, and others — a knowledge and live-chain-data layer for the **Alkanes**
metaprotocol and the **SUBFROST** network.

Point your assistant at it and it can read the official docs, query the live
chain, and scaffold contracts without leaving your editor. It runs entirely on
your machine with **your own SUBFROST API key** — no accounts, no middleman, no
hosted dependency.

- **20 tools** across docs, chain data, dev scaffolds, and a local learning log
- **119-doc corpus** built from the official, public SUBFROST docs and alkanes-rs
- **Read-only by design** — it never signs, broadcasts, or touches your keys

---

## Quickstart

### 1. Get a SUBFROST API key

AlkaFrost talks to the SUBFROST gateway with your own key.

> **[Sign up for a SUBFROST API key](https://api.subfrost.io/auth/signup?ref=82D1DE7C)** —
> sign up through our referral link and get **50% off your first month**.

It's a referral link: signing up through it also supports this project at no
extra cost to you.

### 2. Install

**Requirements:** [Node.js](https://nodejs.org) >= 20.

```bash
git clone https://github.com/Aries-Labs-HQ/alkanes-subfrost-public-mcp.git
cd alkanes-subfrost-public-mcp
npm install
npm run build
```

### 3. Connect your MCP client

**Claude Code**

```bash
claude mcp add --scope local --transport stdio alkafrost \
  -e SUBFROST_API_KEY=YOUR_KEY \
  -- node /absolute/path/to/alkanes-subfrost-public-mcp/dist/index.js
```

Verify with `claude mcp list`, then `/mcp` in a session. (`--` separates Claude's
flags from the launch command; keep `-e KEY=value` right before `--` — it is
variadic and will otherwise swallow the server name.)

**Cursor / Claude Desktop** — any client that takes a JSON server config:

```json
{
  "mcpServers": {
    "alkafrost": {
      "command": "node",
      "args": ["/absolute/path/to/alkanes-subfrost-public-mcp/dist/index.js"],
      "env": { "SUBFROST_API_KEY": "your-key-here" }
    }
  }
}
```

Your key is sent only as the `x-subfrost-api-key` header to the SUBFROST
gateway — never in a URL, never anywhere else. You can also put it in a local
`.env` (copy `.env.example`); `.env` is gitignored.

> **Upgrading from the Aries-branded version?** Tools are now prefixed
> `alkafrost_` instead of `aries_`, and the tutorials tool was removed with the
> third-party tutorial docs. Pull, `npm install && npm run build`, and re-add the
> server under its new name.

---

## What's inside — 20 tools, four layers

| Layer | Tools |
| --- | --- |
| **Knowledge** — a searchable corpus of the official SUBFROST docs (protocol, tokens, build guides, JSON-RPC / REST / CLI reference, platform limits), the alkanes-rs README and Orbital reference contract, plus constants and scaffolds | `alkafrost_search`, `alkafrost_doc`, `alkafrost_full_doc`, `alkafrost_catalog` |
| **Chain data** — live, read-only queries against the SUBFROST gateway with your key: holdings, contract metadata, bytecode, simulate, frBTC peg + DIESEL status, oracle reads, AMM pools, guarded RPC | `alkafrost_tokens_by_address`, `alkafrost_token`, `alkafrost_contract_meta`, `alkafrost_bytecode`, `alkafrost_simulate`, `alkafrost_frbtc_status`, `alkafrost_diesel_status`, `alkafrost_oracle_read`, `alkafrost_oracle_price`, `alkafrost_pools`, `alkafrost_pool_info`, `alkafrost_rpc` |
| **Dev** — protocol constants and contract scaffolds (`wrap`, `unwrap`, `contract`, `orbital`) | `alkafrost_constants`, `alkafrost_scaffold` |
| **Learning** — a local incident log: your assistant records gotchas as it works and checks them before the next task. Stored on your machine only. | `alkafrost_incident_report`, `alkafrost_incident_query` |

### Ask your assistant things like

> *"Is the frBTC peg live, who's the signer, and how much frBTC exists?"*
>
> *"What Alkanes tokens does `bc1p…` hold?"*
>
> *"Show the AMM pools and a pool's reserves."*
>
> *"Which JSON-RPC method gets an alkane's bytecode, and what are the rate limits on my plan?"*
>
> *"Scaffold an Orbital NFT contract."*

---

## Safety — read-only by design

AlkaFrost is **analytics only**. It never signs, broadcasts, or touches wallets
or keys:

- The `alkafrost_rpc` passthrough is **allowlisted to read methods** and
  explicitly blocks broadcast / spend / admin calls.
- Scaffolds and constants are emitted for **you** to run in your own
  `alkanes-cli`, where you hold the keys.
- The incident log writes only to your machine and sanitizes secrets, keys, and
  paths out of every report.

---

## Configuration

| Variable | Purpose |
| --- | --- |
| `SUBFROST_API_KEY` | **Required** for the chain-data tools. Docs and dev tools work without it. |
| `SUBFROST_RPC` / `SUBFROST_REST` | Optional gateway overrides (default: mainnet JSON-RPC; REST is derived from it). |
| `ALKAFROST_INCIDENTS_PATH` | Optional path for your local incident log (default `data/incidents.jsonl`, gitignored). |

Logs go to **stderr** only — stdout is the MCP protocol channel. The doc index
is built from `corpus/` at startup.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run ingest` | Re-pull the corpus from the official sources (see [Keeping the docs current](#keeping-the-docs-current)). |
| `npm run incidents` | List your local incident log. `npm run incidents -- show <id>` prints one as markdown, ready to turn into an issue or corpus PR. |

---

## Keeping the docs current

The corpus is generated from **public, official sources only**:

- **[docs.subfrost.io](https://docs.subfrost.io)** — every page listed in the
  site's `llms.txt` and sitemap, taken from its published markdown.
- **[alkanes-rs](https://github.com/kungfuflex/alkanes-rs)** — the README and the
  `alkanes-std-orbital` reference contract.
- **`corpus/reference/`** — short hand-written references (constants, Orbitals,
  transaction context, scaffolds), each citing a public source.

Run `npm run ingest` to refresh, then restart your MCP client. Every corpus file
carries a `source_url` in its frontmatter so you can always check the original.

## Good to know

- Alkane ids are `{block, tx}` / `block:tx`. frBTC = `32:0`, DIESEL (genesis) =
  `2:0`. Protocol tag is always `1`.
- Read contract state with `alkafrost_simulate`: the opcode goes in `inputs`
  (e.g. `[103]`), not `data`.
- **Orbitals** (Alkanes NFTs) are a `Token` with total supply 1 + opcode `1000`
  for media; read them with `alkafrost_oracle_read`, scaffold one with
  `alkafrost_scaffold orbital`.

---

## Contributing

Contributions are welcome — this project gets better the more builders use it.

- **Docs** — fix or add corpus content from a public source.
- **Ingest sources** — point `scripts/ingest.ts` at more official, public docs.
- **Code & tools** — bug fixes, new read-only tools, better scaffolds.
- **Bug reports** — [open an issue](https://github.com/Aries-Labs-HQ/alkanes-subfrost-public-mcp/issues/new/choose).

Learned a general Alkanes/SUBFROST gotcha with your local incident log? That's
a great PR. See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the ground rules.

## Support the project

AlkaFrost MCP is free and MIT-licensed. If it saves you time, you can support
its upkeep:

- **Sign up for SUBFROST through [our referral link](https://api.subfrost.io/auth/signup?ref=82D1DE7C)**
  (you get 50% off your first month).
- **Donate BTC:**

  ```
  bc1qlq5mccc25823m0yk840l7rtd9srgr0mlc7l6xa
  ```

Thank you.

## Community

Questions, ideas, or show-and-tell: join the
**[Telegram group](https://t.me/+DLc96-DPNJRlZTgx)**, or open a
[GitHub issue](https://github.com/Aries-Labs-HQ/alkanes-subfrost-public-mcp/issues).

## Links

| | |
| --- | --- |
| SUBFROST API keys (referral, 50% off first month) | **[api.subfrost.io](https://api.subfrost.io/auth/signup?ref=82D1DE7C)** |
| SUBFROST docs | **[docs.subfrost.io](https://docs.subfrost.io)** |
| alkanes-rs | **[github.com/kungfuflex/alkanes-rs](https://github.com/kungfuflex/alkanes-rs)** |
| Telegram group | **[t.me/+DLc96-DPNJRlZTgx](https://t.me/+DLc96-DPNJRlZTgx)** |
| Model Context Protocol | **[modelcontextprotocol.io](https://modelcontextprotocol.io)** |

## License

[MIT](LICENSE) © AlkaFrost MCP contributors
