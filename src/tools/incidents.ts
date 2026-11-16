import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { report, query } from "../incidents.js";

const ok = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});
const fail = (msg: string) => ({
  content: [{ type: "text" as const, text: `Error: ${msg}` }],
  isError: true,
});

const SEVERITY = ["critical", "high", "medium", "low", "info"] as const;
const CATEGORY = [
  "security",
  "bad_code",
  "rule_violation",
  "exploit",
  "misunderstanding",
  "performance",
  "data_loss",
] as const;

/** Register the local incident-log tools. */
export function registerIncidentTools(server: McpServer): void {
  server.registerTool(
    "alkafrost_incident_report",
    {
      description:
        "Record a mistake, bug, rule violation, or pitfall you hit while working with Alkanes/SUBFROST, so future sessions on this machine can avoid it. File one whenever you make an error worth not repeating, hit a surprising behaviour, or learn a non-obvious gotcha. Reports are saved to a LOCAL file on this machine only — nothing is sent anywhere — and are searchable immediately via alkafrost_incident_query. SECURITY: never include secrets, API keys, seed phrases, private keys, local file paths, or hostnames; use placeholders like <REDACTED>. (Inputs are also auto-sanitized on the way in.)",
      inputSchema: {
        severity: z.enum(SEVERITY),
        category: z.enum(CATEGORY),
        title: z.string().describe("Short title describing the incident"),
        description: z.string().describe("What happened"),
        root_cause: z.string().describe("WHY it happened — root-cause analysis"),
        correction: z.string().describe("What SHOULD have been done instead"),
        rules_violated: z.string().optional().describe("Comma-separated rules that were violated"),
        affected_files: z.string().optional().describe("Comma-separated file paths"),
        bad_code: z.string().optional().describe("Offending snippet (auto-sanitized before storage)"),
        tags: z.string().optional().describe('Comma-separated keywords for search, e.g. "simulate,opcode,decode"'),
        agent_id: z.string().optional().describe("Reporting agent identifier"),
      },
    },
    async (input) => {
      try {
        const inc = report(input);
        return ok({
          stored: inc.id,
          ts: inc.ts,
          note: "Saved to your local incident log. If this is a general Alkanes/SUBFROST lesson, consider contributing it to the public corpus by pull request (see CONTRIBUTING.md).",
        });
      } catch (e) {
        return fail(String(e));
      }
    },
  );

  server.registerTool(
    "alkafrost_incident_query",
    {
      description:
        "Query this machine's local incident log to avoid repeating known mistakes — call this BEFORE non-trivial Alkanes/SUBFROST work. actions: recent (newest first, default), search (free-text + filters), stats (aggregate counts), get (by incident id).",
      inputSchema: {
        action: z.enum(["recent", "search", "stats", "get"]).optional(),
        search_text: z.string().optional().describe("Free-text across title/description/root_cause/correction"),
        tags: z.string().optional().describe("Comma-separated tags to match"),
        category: z.enum(CATEGORY).optional(),
        severity: z.enum(SEVERITY).optional().describe("Minimum severity threshold"),
        incident_id: z.string().optional().describe("For action=get (e.g. INC-...)"),
        affected_files: z.string().optional().describe("Comma-separated file paths to match"),
        limit: z.number().int().optional().describe("Max results (default 10, max 50)"),
      },
    },
    async (opts) => {
      try {
        return ok(query(opts));
      } catch (e) {
        return fail(String(e));
      }
    },
  );
}
