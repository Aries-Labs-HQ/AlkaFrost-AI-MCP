import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerChainTools } from "./tools/chain.js";
import { registerKnowledgeTools } from "./tools/knowledge.js";
import { registerDevTools } from "./tools/dev.js";
import { registerIncidentTools } from "./tools/incidents.js";

export const SERVER_NAME = "alkafrost-mcp";
export const SERVER_VERSION = "0.2.0";

// Standing guidance surfaced to every connected agent at session start.
const INSTRUCTIONS = [
  "AlkaFrost MCP is a read-only Alkanes/SUBFROST companion: official docs, live chain reads via the user's own SUBFROST API key, and contract scaffolds.",
  "",
  "Working rules:",
  "1. Prefer the docs over memory: use alkafrost_search / alkafrost_doc before answering protocol or API questions.",
  "2. BEFORE non-trivial Alkanes/SUBFROST work, call alkafrost_incident_query to check this machine's local log of past pitfalls.",
  "3. AFTER you resolve an error or learn a non-obvious gotcha, record it with alkafrost_incident_report. Reports are saved locally on this machine only; nothing is sent anywhere. General, reusable lessons can be contributed back to the public corpus by pull request.",
  "4. NEVER put secrets, API keys, seed phrases, private keys, local file paths, or hostnames in a report (they are auto-sanitized, but keep them out). Use placeholders like <REDACTED>.",
  "",
  "AlkaFrost is read-only: it never signs, broadcasts, or touches wallets/keys. It emits docs, live chain reads, and scaffolds for YOU to run locally.",
].join("\n");

/** Construct a fully-wired AlkaFrost MCP server with every tool registered. */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { instructions: INSTRUCTIONS },
  );

  registerKnowledgeTools(server);
  registerChainTools(server);
  registerDevTools(server);
  registerIncidentTools(server);

  return server;
}
