// Smoke test for the Worker: sends one diagnosis request to a local `wrangler dev`
// (http://localhost:8787) with answers, a rule result and up to 5 photos.
// Photos stay outside the repository; pass a JSON case file:
//   node scripts/smoke.mjs path/to/case.json
// The case file lists { label, path, media_type } for each photo (see README of the
// test photo folder). Nothing from the photos is printed.

import { readFileSync } from "node:fs";
import { extname } from "node:path";

const caseFile = process.argv[2];
if (!caseFile) {
  console.error("usage: node scripts/smoke.mjs case.json");
  process.exit(1);
}
const c = JSON.parse(readFileSync(caseFile, "utf8"));
const url = c.url || "http://localhost:8787/diagnose";
const origin = c.origin || "http://localhost:8000";

const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const photos = (c.photos || []).map((p) => {
  const data = readFileSync(p.path).toString("base64");
  return { label: p.label, media_type: p.media_type || types[extname(p.path).toLowerCase()], data };
});

const body = {
  parent_words: c.parent_words,
  place: c.place || "",
  time_of_day: c.time_of_day || "",
  answers: c.answers || {},
  rule_result: c.rule_result || {},
  photos,
};

console.log(`photos: ${photos.length}, body ${(JSON.stringify(body).length / 1024 / 1024).toFixed(2)} MB`);
const started = Date.now();
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log(`status ${res.status} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
try {
  const json = JSON.parse(text);
  console.log(JSON.stringify(json, null, 2));
} catch {
  console.log(text.slice(0, 2000));
}
