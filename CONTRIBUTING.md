# Contributing to AlkaFrost MCP

Thanks for helping make AI assistants better at building on Alkanes and SUBFROST.
Issues and pull requests are both welcome.

## Ground rules

These keep the project trustworthy and easy to run. PRs that break them can't be
merged, however good the rest of the change is.

1. **Public sources only.** Every corpus doc must come from a public, linkable
   source and carry it as `source_url` in its frontmatter. No private notes,
   paywalled or licensed material, or anything you don't have the right to
   publish under MIT.
2. **Read-only, always.** No tool may sign, broadcast, spend, or handle wallet
   keys. New RPC methods go through the read-only allowlist in `src/rpc.ts`.
3. **Bring-your-own-key works, standalone.** A fresh clone plus the user's own
   SUBFROST API key must be all it takes. No hosted services, accounts, or
   telemetry.
4. **stderr-only logging.** stdout is the MCP protocol channel; never
   `console.log` from the server.
5. **No secrets.** Never commit keys, `.env` files, local paths, or incident
   logs (`data/` is gitignored for a reason).

## Ways to contribute

### Docs and corpus

- **Official SUBFROST docs** are generated — don't hand-edit files under
  `corpus/subfrost/` or `corpus/alkanes-rs/`. Run `npm run ingest` to refresh
  them. If a page is wrong upstream, report it to SUBFROST.
- **New public sources:** add them to `STATIC_SOURCES` in `scripts/ingest.ts`,
  run `npm run ingest`, and commit the script change together with the generated
  files.
- **Hand-written references** live in `corpus/reference/`. Keep them short,
  factual, and backed by a public source. Frontmatter:

  ```markdown
  ---
  title: A clear, searchable title
  source: reference
  source_url: https://link-to-the-public-source
  ---
  ```

### Lessons from your incident log

`alkafrost_incident_report` saves gotchas to your local `data/incidents.jsonl`.
When one is a **general** Alkanes/SUBFROST lesson (not specific to your project):

1. `npm run incidents` to list them, then `npm run incidents -- show <id>`.
2. Check the output for anything private (project names, addresses, paths).
3. Turn it into a short note in `corpus/reference/`, citing the public doc,
   source code, or transaction that confirms it, and open a PR.

### Code and tools

- Bug fixes, new **read-only** chain tools, and better scaffolds are welcome.
- Tool names use the `alkafrost_` prefix. Keep tool descriptions precise —
  they're what the model reads to decide when to call a tool.
- Keep the dependency footprint small.

### Bug reports

Use the [issue templates](https://github.com/Aries-Labs-HQ/alkanes-subfrost-public-mcp/issues/new/choose).
Include your MCP client, Node version, the tool call, and the error. **Never
paste your API key.**

## Development

```bash
npm install
npm run build        # compile to dist/
npm run dev          # run from source with tsx
npm run ingest       # refresh the corpus from official sources
```

Before opening a PR, make sure `npm run build` passes and the server starts
(`SUBFROST_API_KEY=... node dist/index.js` should log `ready (stdio)` to stderr).

## Pull requests

- One focused change per PR, with a short description of what and why.
- Conventional commit style: `type(scope): summary`, lowercase type, e.g.
  `fix(chain): handle empty pool list` or `docs(corpus): add orbital media note`.
- Maintainers review every PR; please be patient.

By contributing, you agree that your contribution is licensed under the MIT
license of this project.
