import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { search, doc, fullDoc, catalog } from "../search/index.js";

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });

export function registerKnowledgeTools(server: McpServer): void {
  server.registerTool(
    "alkafrost_search",
    {
      description:
        "Search the Alkanes + SUBFROST documentation corpus: the official SUBFROST docs (protocol, tokens, build guides, JSON-RPC/REST/CLI API reference, platform limits), the alkanes-rs README and reference contracts, plus constants and scaffolds. Returns path + heading + preview for each hit. Call alkafrost_doc next to read a section.",
      inputSchema: {
        query: z.string(),
        limit: z.number().int().optional(),
      },
    },
    async ({ query, limit }) => text(JSON.stringify(search(query, limit ?? 8), null, 2)),
  );

  server.registerTool(
    "alkafrost_doc",
    {
      description:
        "Read a corpus doc token-efficiently. Without `section`, returns the doc's heading list (TOC). With `section`, returns just that section's body. Use the `path` values from alkafrost_search / alkafrost_catalog.",
      inputSchema: {
        path: z.string().describe('Corpus path, e.g. "subfrost/api-reference/json-rpc/alkanes.md"'),
        section: z.string().optional(),
      },
    },
    async ({ path, section }) => text(doc(path, section)),
  );

  server.registerTool(
    "alkafrost_full_doc",
    {
      description:
        "Return the complete, untruncated markdown of a corpus doc by path. Use when you need the whole file in one shot.",
      inputSchema: { path: z.string() },
    },
    async ({ path }) => text(fullDoc(path)),
  );

  server.registerTool(
    "alkafrost_catalog",
    {
      description:
        "List every doc in the corpus grouped by section (e.g. subfrost/build, subfrost/api-reference/json-rpc, alkanes-rs, reference).",
      inputSchema: {},
    },
    async () => text(JSON.stringify(catalog(), null, 2)),
  );
}
