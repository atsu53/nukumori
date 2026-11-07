// Two-step test: /ask then /diagnose, the way the page does it. Photos stay outside the repo.
//   node scripts/two_step.mjs <case json> [result json]
// NUKUMORI_API picks the server (default: local wrangler dev on 8791). Place and time of day come from
// the case, or from the resident's words the way the page detects them.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = {};
require("C:/Users/atsus/Projects/nukumori/web/rules.js");
const R = globalThis.window.NUKUMORI_RULES;

const c = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out = process.argv[3];
const base = process.env.NUKUMORI_API || "http://127.0.0.1:8791";
const headers = { "Content-Type": "application/json", Origin: process.env.NUKUMORI_ORIGIN || "http://localhost:8000" };
const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const photos = (c.photos || []).map((p) => ({ label: p.label, media_type: p.media_type || types[extname(p.path).toLowerCase()], data: readFileSync(p.path).toString("base64") }));

// the family's answers to every question, from which the page only sends what was asked
const all = c.all_answers;
function needAnswers(ids) {
  const missing = ids.filter((q) => !(q in all));
  if (!missing.length) return;
  console.log("MISSING answers (add them to all_answers and run again):");
  missing.forEach((q) => console.log(`  ${q} ${R.QUESTIONS[q].text} | ${R.QUESTIONS[q].options.join(" / ")}`));
  process.exit(2);
}
needAnswers(R.FIXED); // the page asks these before /ask
const fixed =Object.fromEntries(R.FIXED.map((q) => [q, all[q] || ""]));
const det = R.detect(c.parent_words);
const place = c.place ?? det.place, time_of_day = c.time_of_day ?? det.time;
const baseBody = { parent_words: c.parent_words, place, time_of_day, fixed, photos };

async function post(path, body) {
  const t = Date.now();
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json();
  console.log(`${path}: ${res.status} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  if (!json.ok) { console.log(JSON.stringify(json)); process.exit(1); }
  return json.result;
}

// With "ask_file" in the case, the /ask result is kept there and reused, so a run that stopped for
// missing answers continues with the same questions instead of asking Claude again.
let ask;
if (c.ask_file && existsSync(c.ask_file)) { ask = JSON.parse(readFileSync(c.ask_file, "utf8")); console.log("/ask: reused", c.ask_file); }
else { ask = await post("/ask", baseBody); if (c.ask_file) writeFileSync(c.ask_file, JSON.stringify(ask, null, 2)); }
console.log("first_look:", ask.first_look);
ask.questions.forEach((q) => console.log("Q", q.id, "|", q.why));
ask.inferred.forEach((i) => console.log("INFERRED", i.id, "=", i.value, "|", i.basis));
(ask.photo_notes || []).forEach((n) => console.log("NOTE", n.photo, "|", n.seen ?? n.note, "| ?", n.unknown || ""));
console.log("floor_plan:", JSON.stringify(ask.floor_plan));

const seen = new Set();
const questions = ask.questions.filter((q) => R.QUESTIONS[q.id] && !R.FIXED.includes(q.id) && !seen.has(q.id) && seen.add(q.id)).slice(0, 3);
const inferred = {};
ask.inferred.forEach((i) => { if (R.QUESTIONS[i.id] && !seen.has(i.id) && R.QUESTIONS[i.id].options.includes(i.value) && i.value !== R.UNKNOWN) inferred[i.id] = i.value; });
const asked = [...R.FIXED, ...questions.map((q) => q.id)];
needAnswers(asked);
const answers = Object.fromEntries(asked.filter((q) => all[q]).map((q) => [q, all[q]]));
const inferredIds = Object.keys(inferred).filter((q) => !answers[q]);
inferredIds.forEach((q) => (answers[q] = inferred[q]));
const placeId = R.detect(c.parent_words).placeId;
const rule_result = R.run(answers, placeId, inferredIds);
console.log("answers sent:", JSON.stringify(answers));

const r = await post("/diagnose", { ...baseBody, answers, inferred_from_photos: inferredIds, ask: { first_look: ask.first_look, questions, inferred: inferredIds.map((id) => ({ id, value: inferred[id] })) }, rule_result });
console.log("causes:", r.causes.map((x) => `${x.rank} ${x.id} ${x.confidence}`).join(" / "));
r.proposals.forEach((p) => console.log("P", p.rank, p.id, p.work_size, p.first_choice ? "FIRST" : "", "|", p.why_this_rank));
r.today_actions.forEach((a) => console.log("T", a.name));
r.checks.forEach((c) => console.log("C", typeof c === "string" ? c : `${c.what} | ${c.how} | ${c.yes} / ${c.no}`));
r.photo_findings.forEach((f) => console.log("F", f.photo, "|", f.seen ?? f.note, "| ?", f.unknown || ""));
console.log("overrides:", JSON.stringify(r.rule_overrides));
if (out) writeFileSync(out, JSON.stringify({ parent_words: c.parent_words, place, time_of_day, photo_labels: photos.map((p) => p.label), photo_paths: (c.photos || []).map((p) => p.path), ask, answers, inferredIds, rule_result, result: r }, null, 2));
