// Local incident log helper.
//
//   npm run incidents               # list your local incidents (newest first)
//   npm run incidents -- show <id>  # print one incident as markdown, ready to
//                                   # adapt into a corpus PR or a GitHub issue
//
// Reads the same store as the MCP server ($ALKAFROST_INCIDENTS_PATH, default
// data/incidents.jsonl). Read-only; never modifies the log.
import { loadAll, storePath, type Incident } from "../src/incidents.js";

function die(msg: string): never {
  console.error(`incidents: ${msg}`);
  process.exit(1);
}

function line(i: Incident): string {
  const when = new Date(i.ts).toISOString().slice(0, 10);
  return `${i.id}  ${when}  [${i.severity}/${i.category}]  ${i.title}`;
}

function markdown(i: Incident): string {
  const parts = [
    `# ${i.title}`,
    "",
    `- severity: ${i.severity}`,
    `- category: ${i.category}`,
    i.tags ? `- tags: ${i.tags}` : "",
    "",
    "## What happened",
    i.description,
    "",
    "## Root cause",
    i.root_cause,
    "",
    "## Correction",
    i.correction,
  ];
  if (i.bad_code) parts.push("", "## Offending code", "```", i.bad_code, "```");
  return parts.filter((p, idx, a) => !(p === "" && a[idx - 1] === "")).join("\n");
}

const [cmd, arg] = process.argv.slice(2);
const all = loadAll().sort((a, b) => b.ts - a.ts);

if (!cmd || cmd === "list") {
  console.error(`${all.length} incident(s) in ${storePath()}`);
  for (const i of all) console.log(line(i));
} else if (cmd === "show") {
  if (!arg) die("usage: npm run incidents -- show <id>");
  const inc = all.find((i) => i.id === arg) ?? die(`no incident ${arg}`);
  console.log(markdown(inc));
} else {
  die(`unknown command "${cmd}" (use: list | show <id>)`);
}
