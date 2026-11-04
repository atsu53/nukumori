// Run a list of answer-only cases (no photos) through /diagnose and print a summary per case.
//   node scripts/cases.mjs cases.json out_dir
// Each case: { id, parent_words, answers }. Photos are not used, so /ask is skipped and the
// device rules run here the way the page does. Flags a few phrases the app must never use.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
globalThis.window = {};
require(new URL("../web/rules.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const R = globalThis.window.NUKUMORI_RULES;

const cases = JSON.parse(readFileSync(process.argv[2], "utf8"));
const outDir = process.argv[3];
mkdirSync(outDir, { recursive: true });
const base = process.env.NUKUMORI_API || "http://127.0.0.1:8791";
const headers = { "Content-Type": "application/json", Origin: process.env.NUKUMORI_ORIGIN || "http://localhost:8000" };
const FORBIDDEN = ["円", "暖かくなります", "DIY", "危険です", "自分で敷", "°C", "℃"];

for (const c of cases) {
  const d = R.detect(c.parent_words);
  const rule_result = R.run(c.answers, d.placeId, []);
  const fixed = { q0: c.answers.q0 || "", q1: c.answers.q1 || "", q9: c.answers.q9 || "" };
  const body = { parent_words: c.parent_words, place: d.place, time_of_day: d.time, fixed, photos: [], answers: c.answers, inferred_from_photos: [], ask: null, rule_result };
  const t = Date.now();
  const res = await fetch(base + "/diagnose", { method: "POST", headers, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
  const sec = ((Date.now() - t) / 1000).toFixed(0);
  if (!json.ok) { console.log(`#${c.id} FAILED ${res.status} ${json.error}`); continue; }
  const x = json.result;
  writeFileSync(`${outDir}/${c.id}.json`, JSON.stringify({ case: c, rule_result, result: x }, null, 2));
  const text = JSON.stringify(x);
  const flags = FORBIDDEN.filter((w) => text.includes(w));
  const first = x.proposals.find((p) => p.first_choice);
  console.log(`#${c.id} ${sec}s | ${c.parent_words}`);
  console.log(`  causes: ${x.causes.map((k) => `${k.rank} ${k.name}（${k.confidence}）`).join(" / ")}`);
  console.log(`  first: ${first ? first.name : "(none)"} | others: ${x.proposals.filter((p) => !p.first_choice).map((p) => p.name).join("、")}`);
  console.log(`  today: ${(x.today_actions || []).map((a) => a.name).join("、")}`);
  console.log(`  checks: ${x.checks.length} | overrides: ${(x.rule_overrides || []).length} | flags: ${flags.length ? flags.join(",") : "none"}`);
}
