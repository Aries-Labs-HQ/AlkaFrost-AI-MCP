// The incident-log scrub. Best-effort by design; these are the classes it must catch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitize } from "../dist/incidents.js";

const cases = [
  ["API-key assignment", "SUBFROST_API_KEY=sk_live_abcdef123456", "sk_live_abcdef123456"], // public-check: test-vector
  ["key in JSON", '{"apiKey": "abcd1234efgh5678"}', "abcd1234efgh5678"], // public-check: test-vector
  ["header form", "x-subfrost-api-key: abcd1234efgh5678", "abcd1234efgh5678"], // public-check: test-vector
  ["bearer header", "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig", "eyJhbGciOiJIUzI1NiJ9"], // public-check: test-vector
  ["xprv", "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi", "xprv9s21ZrQH143K3QTDL4LX"], // public-check: test-vector
  ["zprv", "zprvAWgYBBk7JR8Gjrh4UJQ2uJdG1r3WNRRfURiABBE3RvMXYSrRJL62XuezvGdPvG6GFBZduosCC1M1t7z8B4Qk8bmsSjWuhRRu9DKJr5Hw2eD", "zprvAWgYBBk7JR8G"], // public-check: test-vector
  ["tprv", "tprv8ZgxMBicQKsPd9TeAdPADNnSyH9SSUUbTVeFszDE23Ki6TBB5nCefAdHkK8Fm3qMQR6sHwA56zqRmKmxnHk37JkiFzvncDqoKmPWubu7hDF", "tprv8ZgxMBicQKsPd9Te"], // public-check: test-vector
  ["WIF private key", "key is KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn ok", "KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn"], // public-check: test-vector
  ["PEM private key", "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg\n-----END PRIVATE KEY-----", "MIIEvQIBADANBg"], // public-check: test-vector
  ["Linux home path", "see /home/alice/project/src/a.ts", "alice"], // public-check: test-vector
  ["macOS home path", "see /Users/alice/project/a.ts", "alice"], // public-check: test-vector
  ["Windows home path", "see C:\\Users\\alice\\project\\a.ts", "alice"], // public-check: test-vector
  ["labelled seed phrase", "mnemonic: abandon ability able about above absent absorb abstract absurd abuse access accident", "absorb"], // public-check: test-vector
  ["IPv4 address", "node at 203.0.113.7:8332", "203.0.113.7"], // public-check: test-vector
];

for (const [name, input, secret] of cases) {
  test(`scrub removes: ${name}`, () => {
    const out = sanitize(input);
    assert.ok(!out.includes(secret), `${name}: "${secret}" survived in: ${out}`);
  });
}

test("scrub removes the server's own configured key wherever it appears", () => {
  const key = "planted-own-key-7f3a9c2e1b";
  const prev = process.env.SUBFROST_API_KEY;
  process.env.SUBFROST_API_KEY = key;
  try {
    const out = sanitize(`it failed with ${key} in the middle of a sentence`);
    assert.ok(!out.includes(key));
  } finally {
    if (prev === undefined) delete process.env.SUBFROST_API_KEY;
    else process.env.SUBFROST_API_KEY = prev;
  }
});

test("scrub leaves ordinary text alone", () => {
  const s = "Use inputs:[103] for get-signer on 32:0; opcode 77 wraps.";
  assert.equal(sanitize(s), s);
});
