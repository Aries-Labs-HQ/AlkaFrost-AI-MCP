---
title: Downloads
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/downloads
---

# Downloads

> Where to download SUBFROSTPOOL builds and how to verify their SHA-256 checksums.

Builds are listed at **[pool.subfrost.io/downloads](https://pool.subfrost.io/downloads)**, grouped by product and platform. The page is generated from the release manifest on cdn.subfrost.io, so it always matches what is actually published.

| Platform | Architectures |
|---|---|
| Linux | x86_64, arm64 |
| macOS | arm64 (Apple silicon), x86_64 (Intel) |
| Windows | x86_64 |

:::info Node and pool builds are coming

Builds of the node with the mining RPCs (qubitcoind) and of the template provider to run next to your own node (subfrost-tp) are **not published yet**. Until they are, connect your pool software to the hosted endpoint: [Connecting pool software](./connecting-pool-software.md).

:::

## Verify before you run

Every artifact on the downloads page has a SHA-256 next to it. Compare it with the hash of the file you downloaded, and don't run anything that doesn't match.

**Linux**

```bash
sha256sum <downloaded-file>
# or check against the published value in one step (two spaces between hash and name):
echo "<sha256-from-the-page>  <downloaded-file>" | sha256sum -c -
```

**macOS**

```bash
shasum -a 256 <downloaded-file>
# or:
echo "<sha256-from-the-page>  <downloaded-file>" | shasum -a 256 -c -
```

**Windows** (PowerShell)

```powershell
(Get-FileHash .\<downloaded-file> -Algorithm SHA256).Hash.ToLower()
# compare the output with the value on the page
```

The `-c` form prints `OK` on a match and fails loudly on a mismatch. A mismatch means a corrupted or tampered download. Delete it and download again from pool.subfrost.io/downloads.

## Script it

The same data is available as JSON at `https://cdn.subfrost.io/releases/manifest.json`. Each product lists releases, and each release lists artifacts with `platform`, `url`, `sha256` and `size`:

```bash
curl -s https://cdn.subfrost.io/releases/manifest.json \
  | jq '.products[] | {id, name, latest: .releases[0].version}'
```
