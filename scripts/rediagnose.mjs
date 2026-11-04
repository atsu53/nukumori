// Re-diagnosis test: send the previous result plus what the family checked, without photos.
//   node scripts/rediagnose.mjs <two_step result json> [answers json]
// The result json is what scripts/two_step.mjs wrote. The answers json is an array of strings,
// one per check (in order); "" means not checked yet. Without it, the checks are listed.

import { readFileSync, writeFileSync } from "node:fs";

const prev = JSON.parse(readFileSync(process.argv[2], "utf8"));
const answersFile = process.argv[3];
const base = process.env.NUKUMORI_API || "http://127.0.0.1:8791";
const origin = process.env.NUKUMORI_ORIGIN || "http://localhost:8000";
const r = prev.result;

if (!answersFile) {
  r.checks.forEach((c, i) => console.log(i + 1, c));
  process.exit(0);
}
const given = JSON.parse(readFileSync(answersFile, "utf8"));
const confirmed = r.checks.map((check, i) => ({ check, answer: (given[i] || "").trim() || "まだ" }));
const previous = {
  causes: r.causes.map((c) => ({ rank: c.rank, id: c.id, name: c.name, confidence: c.confidence })),
  proposals: r.proposals.map((p) => ({ rank: p.rank, id: p.id, name: p.name, first_choice: p.first_choice })),
  checks: r.checks,
  photo_findings: r.photo_findings,
  today_actions: (r.today_actions || []).map((a) => a.name),
};
const a = prev.answers;
const body = {
  parent_words: prev.parent_words || "お風呂場がさむいんだよぉ。脱衣所で着替えるときが一番つらい",
  place: prev.place || "浴室・脱衣所",
  time_of_day: prev.time_of_day || "入浴時",
  fixed: { q0: a.q0 || "", q1: a.q1 || "", q9: a.q9 || "" },
  photos: [],
  answers: a,
  inferred_from_photos: prev.inferredIds || [],
  ask: prev.ask ? { first_look: prev.ask.first_look, questions: prev.ask.questions, inferred: prev.ask.inferred } : null,
  rule_result: prev.rule_result,
  previous,
  confirmed,
};
const t = Date.now();
const res = await fetch(base + "/diagnose", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
const json = await res.json();
console.log(`/diagnose (again): ${res.status} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
if (!json.ok) { console.log(JSON.stringify(json)); process.exit(1); }
const x = json.result;
(x.changes || []).forEach((c) => console.log("CHANGE", c.what, "|", c.before, "→", c.after, "|", c.why));
console.log("causes:", x.causes.map((c) => `${c.rank} ${c.id} ${c.confidence}`).join(" / "));
x.proposals.forEach((p) => console.log("P", p.rank, p.id, p.first_choice ? "FIRST" : "", "|", p.why_this_rank));
console.log("checks:", x.checks.join(" / "));
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify({ confirmed, result: x }, null, 2));
