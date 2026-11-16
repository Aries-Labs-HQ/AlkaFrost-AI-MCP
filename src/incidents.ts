// Local incident log — the user's own record of pitfalls and gotchas.
//
// Reports are appended to ONE local JSONL file on the user's machine and are
// queryable immediately. Nothing is sent anywhere. Every write is sanitized of
// obvious secrets/keys/paths so a report is safe to paste into a public issue or
// pull request if the user chooses to contribute it.
//
// Store: $ALKAFROST_INCIDENTS_PATH, default <repo>/data/incidents.jsonl (gitignored).
// Older versions of this repo wrote data/incidents-pending.jsonl and
// data/incidents-trusted.jsonl; those are still read (never written) so existing
// local reports keep showing up.
import { appendFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// dist/incidents.js -> repo root is one level up
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");

const STORE = process.env.ALKAFROST_INCIDENTS_PATH ?? join(DATA_DIR, "incidents.jsonl");
const LEGACY = [join(DATA_DIR, "incidents-trusted.jsonl"), join(DATA_DIR, "incidents-pending.jsonl")];

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Category =
  | "security"
  | "bad_code"
  | "rule_violation"
  | "exploit"
  | "misunderstanding"
  | "performance"
  | "data_loss";

export interface IncidentInput {
  severity: Severity;
  category: Category;
  title: string;
  description: string;
  root_cause: string;
  correction: string;
  rules_violated?: string;
  affected_files?: string;
  bad_code?: string;
  tags?: string;
  agent_id?: string;
}

export interface Incident extends IncidentInput {
  id: string;
  ts: number; // unix ms
}

const SECRET_KV =
  /\b([A-Za-z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|SEED|MNEMONIC|PRIV(?:ATE)?[_-]?KEY)[A-Za-z0-9_]*)\s*[:=]\s*["']?[^\s"',]+["']?/gi;
const USER_PATH = /([A-Za-z]:\\Users\\|\/Users\/|\/home\/|\/root\/)[^\s"':,;)]+/g;

/** Best-effort scrub of credentials / local paths before storage. */
export function sanitize(text: string): string {
  let t = text;
  const key = process.env.SUBFROST_API_KEY;
  if (key && key.length >= 8) t = t.split(key).join("<SUBFROST_API_KEY>");
  t = t.replace(SECRET_KV, "$1=<REDACTED>");
  t = t.replace(/(x-subfrost-api-key\s*:\s*)\S+/gi, "$1<REDACTED>");
  t = t.replace(/\b(?:xprv|xpub|tprv|tpub)[A-Za-z0-9]{20,}\b/g, "<KEY_REDACTED>");
  t = t.replace(USER_PATH, "$1<USER_PATH>");
  t = t.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "<IP>");
  return t;
}

function sanitizeOpt(text?: string): string | undefined {
  return text === undefined || text === "" ? text : sanitize(text);
}

function loadFile(path: string): Incident[] {
  if (!existsSync(path)) return [];
  const out: Incident[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      out.push(JSON.parse(s) as Incident);
    } catch {
      /* skip a corrupt line rather than fail the whole store */
    }
  }
  return out;
}

/** Every local incident (current store + any legacy files), de-duplicated by id. */
export function loadAll(): Incident[] {
  const seen = new Set<string>();
  const out: Incident[] = [];
  for (const path of [STORE, ...LEGACY]) {
    for (const inc of loadFile(path)) {
      if (seen.has(inc.id)) continue;
      seen.add(inc.id);
      out.push(inc);
    }
  }
  return out;
}

export function incidentCount(): number {
  return loadAll().length;
}

export function storePath(): string {
  return STORE;
}

/** Record a new incident in the local store. Sanitized on the way in. */
export function report(input: IncidentInput): Incident {
  const ts = Date.now();
  const incident: Incident = {
    id: `INC-${ts.toString(36)}-${(incidentCount() + 1).toString(36)}`,
    ts,
    severity: input.severity,
    category: input.category,
    title: sanitize(input.title),
    description: sanitize(input.description),
    root_cause: sanitize(input.root_cause),
    correction: sanitize(input.correction),
    rules_violated: sanitizeOpt(input.rules_violated),
    affected_files: sanitizeOpt(input.affected_files),
    bad_code: sanitizeOpt(input.bad_code),
    tags: input.tags,
    agent_id: input.agent_id,
  };
  mkdirSync(dirname(STORE), { recursive: true });
  appendFileSync(STORE, JSON.stringify(incident) + "\n", "utf8");
  return incident;
}

export interface QueryOpts {
  action?: "recent" | "search" | "stats" | "get";
  search_text?: string;
  tags?: string;
  category?: Category;
  severity?: Severity;
  incident_id?: string;
  affected_files?: string;
  limit?: number;
}

const SEV_RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

/** Query the local incident log. */
export function query(opts: QueryOpts): unknown {
  const all = loadAll();
  const action = opts.action ?? "recent";

  if (action === "get") {
    return all.find((i) => i.id === opts.incident_id) ?? { error: `No incident ${opts.incident_id ?? ""}` };
  }
  if (action === "stats") {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const i of all) {
      byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
      bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
    }
    return { total: all.length, byCategory, bySeverity };
  }

  let results = all;
  if (opts.category) results = results.filter((i) => i.category === opts.category);
  if (opts.severity) {
    const min = SEV_RANK[opts.severity];
    results = results.filter((i) => SEV_RANK[i.severity] >= min);
  }
  if (opts.tags) {
    const want = opts.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    results = results.filter((i) => want.some((w) => (i.tags ?? "").toLowerCase().includes(w)));
  }
  if (opts.affected_files) {
    const want = opts.affected_files.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    results = results.filter((i) => want.some((w) => (i.affected_files ?? "").toLowerCase().includes(w)));
  }
  if (action === "search" && opts.search_text) {
    const q = opts.search_text.toLowerCase();
    results = results.filter((i) =>
      `${i.title} ${i.description} ${i.root_cause} ${i.correction} ${i.tags ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }
  const limit = Math.min(opts.limit ?? 10, 50);
  results = results.slice().sort((a, b) => b.ts - a.ts).slice(0, limit);
  return { count: results.length, total: all.length, incidents: results };
}
