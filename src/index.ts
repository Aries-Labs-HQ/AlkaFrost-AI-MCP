#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { incidentCount, storePath } from "./incidents.js";
import { buildIndex } from "./search/index.js";
import { hasApiKey } from "./rpc.js";
import { log } from "./log.js";

async function main(): Promise<void> {
  buildIndex(); // load + index the corpus once at startup

  const server = createServer();
  log(`local incident log: ${incidentCount()} report(s) at ${storePath()}`);

  if (!hasApiKey()) {
    log(
      "WARNING: SUBFROST_API_KEY not set — chain-data tools will fail until it is. Docs/dev tools work offline.",
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("ready (stdio)");
}

main().catch((err) => {
  log("fatal", String(err));
  process.exit(1);
});
