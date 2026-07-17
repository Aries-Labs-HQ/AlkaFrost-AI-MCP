# CLAUDE.md — alkanes-aries (repo-local; the global CLAUDE.md governs)

**PUBLIC repo.** Everything here ships to strangers — code, docs, commit messages, issue text.

This is the BYO stdio distro + the frozen baseline corpus, and nothing else. The deployed hosted container does NOT build from here (that's `aries-cloud`).

**Hard lines:**
- No live-corpus material, ever. The baseline updates only via the reviewed one-way export from `aries-cloud` — never by hand-copying entries across.
- No attribution or key data, no internal hostnames/IPs/paths, no ops details, no hosted-only knowledge — in code, corpus files, docs, or commit messages.
- stderr-only logging (stdio transport — stdout is the protocol).
- BYO stays first-class: a fresh clone + the user's own Subfrost key must work with zero hosted dependencies. Anything that quietly requires hosted Aries is a bug.

Conventional commits, lowercase `type(scope):`. Branch → PR; Bragi merges.
