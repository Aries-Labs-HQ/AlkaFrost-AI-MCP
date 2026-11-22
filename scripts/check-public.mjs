#!/usr/bin/env node
// npm run check:public — a pre-publish scan of this public repository.
//
// Fails on anything shaped like a credential, anywhere. Outside corpus/ it also
// fails on IPv4 addresses (other than 127.0.0.1 and the documentation ranges)
// and on home-directory paths. corpus/ is upstream text, so only credentials
// are checked there.
//
// A line that is a deliberate test vector can carry the marker
// "public-check: test-vector"; that line is skipped. Use it for nothing else.
//
// Usage: node scripts/check-public.mjs [file ...]   (default: every git-tracked
// or new, non-ignored file). No dependencies.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const MARKER = "public-check: test-vector";

const files = process.argv.length > 2
  ? process.argv.slice(2).map((f) => relative(ROOT, resolve(f)))
  : execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: ROOT })
      .toString().split("\0").filter(Boolean);

const BASE58 = "1-9A-HJ-NP-Za-km-z";
const PLACEHOLDERS = /^(?:replace-me|your[-_]?key(?:[-_]here)?|your[-_]api[-_]key|<[^>]*>|\$\{?[A-Z_]+\}?|x+|\.\.\.|…)$/i;

// A reference to a value in code (process.env.X, this.apiKey, API_KEY), not a value.
const CODE_REF = /^(?:[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+|[A-Z][A-Z0-9_]*|[a-z][A-Za-z]*)$/;
const isValue = (v) => !PLACEHOLDERS.test(v) && !CODE_REF.test(v);

function entropy(s) {
  const counts = {};
  for (const c of s) counts[c] = (counts[c] ?? 0) + 1;
  return Object.values(counts).reduce((h, n) => h - (n / s.length) * Math.log2(n / s.length), 0);
}

const CREDENTIAL_RULES = [
  ["private key block", (l) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(l)],
  ["extended private key", (l) => new RegExp(`\\b[xyzuvtXYZUV]prv[${BASE58}]{100,}`).test(l)],
  ["WIF private key", (l) => new RegExp(`(?:^|[^${BASE58}])[5KLc9][${BASE58}]{50,51}(?![${BASE58}])`).test(l)],
  ["secret-like assignment", (l) => {
    const re = /(api[_-]?key|secret|token|passw(?:or)?d|private[_-]?key|auth)["']?\s*[:=]\s*["']?([A-Za-z0-9_\-+/=.]{20,})/gi;
    for (const m of l.matchAll(re)) if (entropy(m[2]) >= 3.5 && isValue(m[2])) return true;
    return false;
  }],
  ["SUBFROST key", (l) => {
    for (const m of l.matchAll(/(?:SUBFROST_API_KEY|x-subfrost-api-key)["']?\s*[:=]\s*["'`]?([^\s"'`,;)}]+)/gi)) {
      if (isValue(m[1])) return true;
    }
    for (const m of l.matchAll(/subfrost\.io\/v4\/([A-Za-z0-9_-]{20,})/g)) {
      if (entropy(m[1]) >= 3.5 && isValue(m[1])) return true;
    }
    return false;
  }],
];

const DOC_RANGES = [/^192\.0\.2\./, /^198\.51\.100\./, /^203\.0\.113\./];
const PRIVATE_RULES = [
  ["IPv4 address", (l) => {
    for (const m of l.matchAll(/(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d]|\.\d)/g)) {
      const ip = m.slice(1, 5).join(".");
      if (m.slice(1, 5).some((o) => Number(o) > 255)) continue;
      if (ip === "127.0.0.1" || DOC_RANGES.some((r) => r.test(ip))) continue;
      return true;
    }
    return false;
  }],
  ["home-directory path", (l) => /(?:\/home\/|\/Users\/|\/root\/|[A-Za-z]:\\{1,2}Users\\{1,2}|[A-Za-z]:\/Users\/)[A-Za-z0-9_][\w.-]*/.test(l)],
];

const hits = [];
for (const file of files) {
  let buf;
  try {
    buf = readFileSync(resolve(ROOT, file));
  } catch {
    continue; // deleted in the working tree
  }
  if (buf.includes(0)) continue; // binary
  const inCorpus = file.startsWith("corpus/");
  const rules = inCorpus ? CREDENTIAL_RULES : [...CREDENTIAL_RULES, ...PRIVATE_RULES];
  buf.toString("utf8").split("\n").forEach((line, i) => {
    if (line.includes(MARKER)) return;
    for (const [name, test] of rules) if (test(line)) hits.push(`${file}:${i + 1}: ${name}`);
  });
}

if (hits.length) {
  console.error(`check:public: ${hits.length} finding(s)\n` + hits.map((h) => `  ${h}`).join("\n"));
  process.exit(1);
}
console.log(`check:public: ${files.length} files clean`);
