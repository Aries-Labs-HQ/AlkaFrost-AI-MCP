import assert from "node:assert/strict";
import test from "node:test";
import { fullDoc } from "../dist/search/index.js";

test("fullDoc reads files inside the corpus", () => {
  assert.match(fullDoc("reference/constants.md"), /frBTC/);
});

test("fullDoc rejects paths outside the corpus", () => {
  assert.match(fullDoc("../.env.example"), /^No corpus doc at/);
  assert.match(fullDoc("../../package.json"), /^No corpus doc at/);
});
