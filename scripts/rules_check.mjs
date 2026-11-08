// Regression check for the architect's rules (web/rules.js), without calling Claude.
//   node scripts/rules_check.mjs [cases.json] [--baseline rules.json] [--write rules.json]
// For each case it runs the device rules the way the page does and prints the candidates.
// It fails (exit 1) when an answer no longer matches a question's options (the wording was
// changed in rules.js but not in the cases), or when the architect's expected cause or first
// proposal is missing from the candidates. With --baseline it also prints what changed.

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = {};
require(new URL("../web/rules.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const R = globalThis.window.NUKUMORI_RULES;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const casesPath = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--baseline" && args[args.indexOf(a) - 1] !== "--write") || "docs/evidence/cases_2026-11-08.json";
const baselinePath = opt("--baseline");
const writePath = opt("--write");

const cases = JSON.parse(readFileSync(casesPath, "utf8"));
const baseline = baselinePath ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;
let errors = 0;
const out = {};

for (const c of cases) {
  const problems = [];
  for (const [q, v] of Object.entries(c.answers)) {
    const def = R.QUESTIONS[q];
    if (!def) problems.push(`${q}: no such question`);
    else if (!def.options.includes(v)) problems.push(`${q}: 「${v}」 is not one of the options`);
  }
  const d = R.detect(c.parent_words);
  const inferred = c.inferred || [];
  const r = R.run(c.answers, d.placeId, inferred);
  const causes = r.causes.map((k) => `${k.id}:${k.confidence}`);
  const proposals = r.proposals.map((p) => p.id + (p.marks.length ? `[${p.marks.join(",")}]` : ""));
  const e = c.expected || {};
  if (e.cause && !r.causes.some((k) => k.id === e.cause)) problems.push(`expected cause ${e.cause} is not a candidate`);
  if (e.first) {
    const p = r.proposals.find((x) => x.id === e.first);
    if (!p) problems.push(`expected first proposal ${e.first} is not a candidate`);
    else if (p.marks.includes("keep_low")) problems.push(`expected first proposal ${e.first} is marked keep_low`);
  }
  out[c.id] = { place: d.placeId || "(none)", time: d.time || "", causes, proposals, heat_shock: r.heat_shock_level, note: r.note };
  console.log(`#${c.id} | ${c.parent_words} | place=${out[c.id].place}${d.time ? " time=" + d.time : ""}`);
  console.log(`  causes:    ${causes.join("  ") || "(none: Claude decides)"}`);
  console.log(`  proposals: ${proposals.join("  ") || "(none)"}`);
  if (r.heat_shock_level !== "none" || r.note) console.log(`  heat_shock=${r.heat_shock_level}${r.note ? "  note=" + r.note : ""}`);
  if (e.cause || e.first || e.note) console.log(`  expected:  cause=${e.cause || "-"} first=${e.first || "-"}${e.note ? "  (" + e.note + ")" : ""}`);
  if (baseline && baseline[c.id]) {
    const b = baseline[c.id];
    const diff = [];
    if (JSON.stringify(b.causes) !== JSON.stringify(causes)) diff.push(`causes ${b.causes.join(" ")} -> ${causes.join(" ")}`);
    if (JSON.stringify(b.proposals) !== JSON.stringify(proposals)) diff.push(`proposals ${b.proposals.join(" ")} -> ${proposals.join(" ")}`);
    if (diff.length) console.log(`  CHANGED:   ${diff.join(" / ")}`);
  } else if (baseline) console.log("  NEW (not in baseline)");
  for (const p of problems) { console.log(`  ERROR:     ${p}`); errors++; }
}

if (writePath) { writeFileSync(writePath, JSON.stringify(out, null, 2)); console.log(`\nwrote ${writePath}`); }
console.log(errors ? `\n${errors} problem(s)` : "\nok: every answer matches an option, and every expected cause and first proposal is a candidate");
process.exit(errors ? 1 : 0);
