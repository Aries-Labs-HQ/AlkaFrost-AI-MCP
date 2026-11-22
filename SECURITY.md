# Security

AlkaFrost is a local, read-only MCP server. This page says what it can and
cannot reach, what we treat as a vulnerability, and how to tell us about one.

## What the server can reach

- **The SUBFROST gateway**, over HTTPS, and only from the chain-data tools. The
  address comes from `SUBFROST_RPC` / `SUBFROST_REST` (mainnet by default).
  Your API key goes in the `x-subfrost-api-key` header of those requests and
  nowhere else: not in a URL, not in a request body, not in logs. Redirects are
  never followed, so the key cannot be carried to another host, and the key is
  removed from any error text the gateway sends back.
- **`corpus/` in this repository**, read-only. Document paths are confined to
  `.md` files inside `corpus/`.
- **One local file**, the incident log (`ALKAFROST_INCIDENTS_PATH`, default
  `data/incidents.jsonl`). The learning tools append to it and read it back. It
  is never sent anywhere. A best-effort scrub removes common key and secret
  shapes, home-directory paths and IPv4 addresses before a report is saved, and
  each field is capped in length. The scrub cannot recognise everything: an
  unlabelled seed phrase, a bare hex private key, a hostname or an IPv6 address
  gets through, so read a report before you share it.

## What it cannot do

- Sign anything, hold or ask for a private key, seed or mnemonic, or build a
  transaction for you to broadcast. No tool takes such a parameter.
- Broadcast. `alkafrost_rpc`, the one tool where the caller picks the gateway
  method, accepts only names shaped like the documented read methods, on an
  allowlist; it refuses write, broadcast, wallet, script and admin methods
  (including case, whitespace, separator and look-alike variants) and the
  `metashrew_view` simulate views that run a caller-supplied transaction or
  block. Every other chain tool calls a fixed read method.
- Write anywhere except the incident log.

## What counts as a vulnerability

Anything that makes AlkaFrost sign, broadcast, or write somewhere other than
the incident log; anything that leaks your SUBFROST API key (to the model, to
another host, or into a file); and anything that sends the incident log
anywhere. A way past the `alkafrost_rpc` guard to a method that is not a plain
read counts too.

Flaws in the SUBFROST gateway itself belong with SUBFROST, not here.

## How to report

Please do **not** open a public issue. Use either:

- GitHub's private **Report a vulnerability** form, on the **Security** tab of
  this repository, or
- email **security@arieslabs.org**.

Include what you did, what happened, and what you expected. Never include a
real API key.

## Supported version

The latest `main`.
