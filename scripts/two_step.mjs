// Two-step test: /ask then /diagnose, the way the page does it. Photos stay outside the repo.
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = {};
require("C:/Users/atsus/Projects/nukumori/web/rules.js");
const R = globalThis.window.NUKUMORI_RULES;

const c = JSON.parse(readFileSync(process.argv[2], "utf8"));
const out = process.argv[3];
const base = "http://127.0.0.1:8791";
const headers = { "Content-Type": "application/json", Origin: "http://localhost:8000" };
const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const photos = (c.photos || []).map((p) => ({ label: p.label, media_type: p.media_type || types[extname(p.path).toLowerCase()], data: readFileSync(p.path).toString("base64") }));

// the family's answers to every question, from which the page only sends what was asked
const all = c.all_answers;
const fixed = Object.fromEntries(R.FIXED.map((q) => [q, all[q] || ""]));
const baseBody = { parent_words: c.parent_words, place: c.place || "", time_of_day: c.time_of_day || "", fixed, photos };

async function post(path, body) {
  const t = Date.now();
  const res = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json();
  console.log(`${path}: ${res.status} in ${((Date.now() - t) / 1000).toFixed(1)} s`);
  if (!json.ok) { console.log(JSON.stringify(json)); process.exit(1); }
  return json.result;
}

const ask = await post("/ask", baseBody);
console.log("first_look:", ask.first_look);
ask.questions.forEach((q) => console.log("Q", q.id, "|", q.why));
ask.inferred.forEach((i) => console.log("INFERRED", i.id, "=", i.value, "|", i.basis));

const seen = new Set();
const questions = ask.questions.filter((q) => R.QUESTIONS[q.id] && !R.FIXED.includes(q.id) && !seen.has(q.id) && seen.add(q.id)).slice(0, 3);
const inferred = {};
ask.inferred.forEach((i) => { if (R.QUESTIONS[i.id] && !seen.has(i.id) && R.QUESTIONS[i.id].options.includes(i.value) && i.value !== R.UNKNOWN) inferred[i.id] = i.value; });
const asked = [...R.FIXED, ...questions.map((q) => q.id)];
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
console.log("checks:", r.checks.join(" / "));
console.log("overrides:", JSON.stringify(r.rule_overrides));
if (out) writeFileSync(out, JSON.stringify({ ask, answers, inferredIds, rule_result, result: r }, null, 2));
