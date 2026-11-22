# Changelog

## Unreleased

### Safety
- The `alkafrost_rpc` passthrough is stricter. It accepts only method names
  shaped like the documented read methods, so case, whitespace, separator and
  look-alike variants of a blocked method no longer get through. It also refuses
  Bitcoin Core wallet calls, script and admin methods, and the `metashrew_view`
  simulate views that run a transaction or block you supply.
- Your API key can no longer follow a redirect to another host: gateway
  redirects are refused. The key is also removed from any error text the
  gateway sends back.
- The incident-log scrub catches more: JSON-style key fields, Authorization and
  Bearer tokens, every extended-key prefix (yprv, zprv, …), WIF keys, PEM
  private keys, and whole labelled seed phrases. Each stored field is capped in
  length.

### Fixes
- `alkafrost_frbtc_status`, `alkafrost_diesel_status` and `alkafrost_token`
  report an error when the gateway gives no answer, instead of empty fields and
  a supply of 0.
- Without an API key, chain tools say that `SUBFROST_API_KEY` is not set.

### Docs
- A new README with a banner and a how-it-works diagram. Every statement in it
  was checked against the code. It now says the server reads its settings from
  the environment and does not load a `.env` file.
- New `SECURITY.md`, `CODE_OF_CONDUCT.md` and `.github/CODEOWNERS`.
  `CONTRIBUTING.md` and the issue and pull-request templates are up to date.

### Development
- `npm test` builds the server and runs the tests with Node's built-in test
  runner. They need no network and no API key. They also check that the
  README's tool list and counts match the server.
- `npm run check:public` scans the repository for credentials, IP addresses and
  home-directory paths.
- CI runs the build, the tests and the public check on Node 20 and 22 for every
  pull request. A single check named `ci` sums up the result.
