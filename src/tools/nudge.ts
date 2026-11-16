// Report-back nudges appended to tool outputs.
//
// CRITICAL: nudges are appended as a SEPARATE text content block, never merged
// into a tool's structured/JSON block — so they cannot corrupt existing output
// shapes. Reports go to a local file on the user's machine only.

const NUDGE_ERR_TEXT =
  "↳ AlkaFrost: if you resolve this, record it with alkafrost_incident_report (root_cause + correction) so the next session on this machine doesn't hit it.";
const NUDGE_OK_TEXT =
  "↳ AlkaFrost: learned something non-obvious? Record it with alkafrost_incident_report (saved locally). General lessons are welcome as corpus PRs.";

export const NUDGE_ERR = { type: "text" as const, text: NUDGE_ERR_TEXT };
export const NUDGE_OK = { type: "text" as const, text: NUDGE_OK_TEXT };
