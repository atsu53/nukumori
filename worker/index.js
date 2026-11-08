// nukumori API relay (Cloudflare Workers).
// The browser sends answers, the device-side rule result and resized photos.
// This Worker checks them, adds the system prompt and calls the Claude API.
// The API key lives only in the Workers secret ANTHROPIC_API_KEY.
// Photos and answers are never stored or logged.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt.js";
import { ASK_SCHEMA, DIAGNOSIS_SCHEMA } from "./schema.js";
import { ARCHITECT_CASES } from "./cases.js";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 8; // five from the start, and up to three taken while checking (2026-11-08)
const MAX_PHOTO_B64 = 1_500_000; // about 1.1 MB per resized photo
const MAX_TEXT_JSON = 24_000; // answers, rule result, ask, and on a re-diagnosis the previous result
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Best-effort burst limit per isolate. Generous on purpose: judges will use it too.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 6;
const hits = new Map();

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const list = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function json(body, status, origin) {
  const headers = { "Content-Type": "application/json; charset=utf-8" };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function fail(code, status, origin, retry = false) {
  return json({ ok: false, error: code, retry }, status, origin);
}

function rateLimited(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_MAX;
}

// The platform rate limiter (binding RL in wrangler.jsonc) counts across isolates; the in-memory map is
// only the fallback when the binding is missing (local dev without it).
async function rateLimitedBy(request, env) {
  if (env.RL) {
    try {
      const ip = request.headers.get("CF-Connecting-IP") || "local";
      const { success } = await env.RL.limit({ key: ip });
      if (!success) return true;
    } catch {}
  }
  return rateLimited(request);
}

// Returns { input } or { error }.
function validate(body) {
  if (!body || typeof body !== "object") return { error: "bad_request" };
  const { who = "family", parent_words = "", place = "", time_of_day = "", fixed = {}, answers = {}, inferred_from_photos = [], ask = null, rule_result = {}, previous = null, confirmed = [], photos = [] } = body;
  if (who !== "family" && who !== "self") return { error: "bad_who" };
  if (typeof parent_words !== "string" || !parent_words.trim() || parent_words.length > 300) return { error: "bad_parent_words" };
  if (typeof place !== "string" || place.length > 50) return { error: "bad_place" };
  if (typeof time_of_day !== "string" || time_of_day.length > 50) return { error: "bad_time_of_day" };
  if (typeof fixed !== "object" || typeof answers !== "object" || typeof rule_result !== "object" || typeof ask !== "object") return { error: "bad_answers" };
  if (!Array.isArray(inferred_from_photos) || !Array.isArray(confirmed) || typeof previous !== "object") return { error: "bad_answers" };
  if (JSON.stringify({ fixed, answers, inferred_from_photos, ask, rule_result, previous, confirmed }).length > MAX_TEXT_JSON) return { error: "too_long" };
  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) return { error: "too_many_photos" };
  for (const p of photos) {
    if (!p || typeof p.data !== "string" || typeof p.label !== "string") return { error: "bad_photo" };
    if (!IMAGE_TYPES.includes(p.media_type)) return { error: "bad_photo_type" };
    if (p.data.length > MAX_PHOTO_B64 || p.label.length > 40) return { error: "photo_too_large" };
  }
  return { input: { who, parent_words, place, time_of_day, fixed, answers, inferred_from_photos, ask, rule_result, previous, confirmed, photos } };
}

// The photos and the fixed answers come first and are byte-identical in the ask and the
// diagnose call, so the second call can read them from the prompt cache.
function buildContent(input, step) {
  const content = [];
  input.photos.forEach((p, i) => {
    content.push({ type: "text", text: `写真${i + 1}：${p.label}` });
    content.push({ type: "image", source: { type: "base64", media_type: p.media_type, data: p.data } });
  });
  const { who, parent_words, place, time_of_day, fixed } = input;
  content.push({ type: "text", text: JSON.stringify({ who, parent_words, place, time_of_day, fixed, photo_count: input.photos.length }), cache_control: { type: "ephemeral" } });
  if (step === "ask") {
    content.push({ type: "text", text: JSON.stringify({ step }) });
  } else {
    const { answers, inferred_from_photos, ask, rule_result, previous, confirmed } = input;
    const extra = previous ? { previous, confirmed } : {};
    content.push({ type: "text", text: JSON.stringify({ step, ask, answers, inferred_from_photos, rule_result, architect_cases: ARCHITECT_CASES, ...extra }) });
  }
  return content;
}

function askLooksUnfinished(r) {
  if (!r.questions?.length) return true;
  const fp = r.floor_plan;
  if (!fp || !(fp.photo >= 1)) return false; // no floor plan was sent
  return !fp.cold_points?.length || fp.cold_points.some((p) => !p.x && !p.y) || (fp.note || "").trim().length < 2;
}

// ---- the floor plan is read three times (2026-11-08) ----
// Claude's reading of a hand-drawn plan is bimodal: on the sample house the dressing room came back either where
// it is or a whole room to the left, in about half the runs each, whatever the ruler or the wording. So the plan
// photo is read twice more in a small call of its own, in parallel with the main one, and each room takes the
// median of the three readings; the route and the cold points move with the room nearest to them.
const PLAN_SCHEMA = {
  type: "object",
  properties: { rooms: { type: "array", items: { type: "object", properties: { name: { type: "string" }, x: { type: "integer" }, y: { type: "integer" } }, required: ["name", "x", "y"], additionalProperties: false } } },
  required: ["rooms"],
  additionalProperties: false,
};
const PLAN_PROMPT = "手描きの間取り図の写真に、端末が青い目盛り（縦横とも 0〜1000。数字は線に沿って3か所に書いてある）を重ねてあります。目盛りは図の一部ではありません。寒さに関わる部屋（居間・茶の間・台所・DK・脱衣所・浴室・風呂・洗面所・寝室・廊下・玄関・トイレなど）を見つけ、部屋の名前の文字が書かれている場所を、その文字のすぐ近くにある目盛りの数字で読んで、部屋の中心の座標を返してください（左上が (0,0)、右下が (1000,1000) の整数）。隣の部屋の数字を使わないこと。読めた部屋だけ、8つまで。名前は図に書かれているとおりに書く。";
function planPhotoIndex(photos) { return photos.findIndex((p) => /間取り|平面図|図面/.test(p.label)); }
async function readPlanRooms(photo, env) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const r = await client.beta.messages.create({
    model: env.PLAN_MODEL || "claude-opus-5-5",
    max_tokens: 1500,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: PLAN_SCHEMA } },
    system: PLAN_PROMPT,
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: photo.media_type, data: photo.data } }, { type: "text", text: "部屋の位置を読んでください。" }] }],
  });
  return JSON.parse(r.content.find((b) => b.type === "text")?.text ?? "").rooms;
}
function roomKey(name) {
  const n = String(name || "");
  if (/浴|風呂|バス/.test(n)) return "浴室";
  if (/脱/.test(n)) return "脱衣所";
  if (/洗面/.test(n)) return "洗面所";
  if (/茶の間/.test(n)) return "茶の間";
  if (/DK|台所|キッチン|ダイニング/.test(n)) return "台所";
  if (/居間|リビング/.test(n)) return "居間";
  if (/寝室/.test(n)) return "寝室";
  if (/玄関/.test(n)) return "玄関";
  if (/廊下/.test(n)) return "廊下";
  if (/トイレ|便所/.test(n)) return "トイレ";
  return n.replace(/[\s（）()]/g, "");
}
const median3 = (a, b, c) => [a, b, c].sort((x, y) => x - y)[1];
const clamp = (v) => Math.max(0, Math.min(1000, Math.round(v)));
function mergePlan(fp, extra) {
  const shifts = [];
  for (const r of fp.rooms || []) {
    const k = roomKey(r.name);
    const m = extra.map((rooms) => rooms.find((q) => roomKey(q.name) === k)).filter(Boolean);
    if (m.length < 2) continue;
    const xs = [r.x, ...m.map((q) => q.x)].sort((a, b) => a - b), ys = [r.y, ...m.map((q) => q.y)].sort((a, b) => a - b);
    const nx = xs[Math.floor(xs.length / 2)], ny = ys[Math.floor(ys.length / 2)];
    shifts.push({ x0: r.x, y0: r.y, dx: nx - r.x, dy: ny - r.y });
    r.x = nx; r.y = ny;
  }
  if (!shifts.length) return 0;
  const nearest = (p) => { let best = null, bd = Infinity; for (const sh of shifts) { const d = Math.hypot(p.x - sh.x0, p.y - sh.y0); if (d < bd) { bd = d; best = sh; } } return bd < 220 ? best : null; };
  for (const pt of [...(fp.cold_route || []), ...(fp.cold_points || [])]) {
    const sh = nearest(pt);
    if (sh) { pt.x = clamp(pt.x + sh.dx); pt.y = clamp(pt.y + sh.dy); }
  }
  return shifts.length;
}

async function callClaude(input, step, env) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client.beta.messages.create({
    model: env.MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: env.EFFORT || "medium",
      format: { type: "json_schema", schema: step === "ask" ? ASK_SCHEMA : DIAGNOSIS_SCHEMA },
    },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildContent(input, step) }],
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      });
    }
    const step = { "/ask": "ask", "/diagnose": "diagnose" }[url.pathname];
    if (!step) return fail("not_found", 404, origin);
    if (request.method !== "POST") return fail("method_not_allowed", 405, origin);
    if (!origin) return fail("origin_not_allowed", 403, null);
    if (await rateLimitedBy(request, env)) return fail("rate_limited", 429, origin, true);

    // The length must be declared (a browser fetch with a string body always declares it), so the body is
    // never read into memory before it is checked.
    const len = request.headers.get("Content-Length");
    if (len === null || !/^\d+$/.test(len)) return fail("length_required", 411, origin);
    if (Number(len) > MAX_BODY_BYTES) return fail("too_large", 413, origin);

    let body;
    try {
      const text = await request.text();
      if (text.length > MAX_BODY_BYTES) return fail("too_large", 413, origin);
      body = JSON.parse(text);
    } catch {
      return fail("bad_json", 400, origin);
    }
    const { input, error } = validate(body);
    if (error) return fail(error, 400, origin);
    if (!env.ANTHROPIC_API_KEY) return fail("not_configured", 500, origin);

    const started = Date.now();
    // Two extra readings of the floor plan start together with the main call (ask step only).
    const planIdx = step === "ask" ? planPhotoIndex(input.photos) : -1;
    const PLAN_EXTRA = Number(env.PLAN_EXTRA || 4); // extra readings of the plan; with the main one, an odd number for the median
    const planReads = planIdx >= 0 ? Promise.allSettled(Array.from({ length: PLAN_EXTRA }, () => readPlanRooms(input.photos[planIdx], env))) : null;
    let response;
    try {
      response = await callClaude(input, step, env);
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? e.status : 0;
      console.log(JSON.stringify({ at: new Date().toISOString(), ok: false, upstream_status: status }));
      const retry = status === 429 || status === 529 || status >= 500 || status === 0;
      return fail("upstream_error", 502, origin, retry);
    }

    // Log only time, outcome and token counts. Never photos or answers.
    console.log(JSON.stringify({
      at: new Date().toISOString(),
      step,
      ms: Date.now() - started,
      model: response.model,
      stop_reason: response.stop_reason,
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens,
        cache_write: response.usage.cache_creation_input_tokens,
      },
    }));

    if (response.stop_reason === "refusal") return fail("refusal", 422, origin, true);
    if (response.stop_reason === "max_tokens") return fail("too_long_output", 502, origin, true);

    const textBlock = response.content.find((b) => b.type === "text");
    let result;
    try {
      result = JSON.parse(textBlock?.text ?? "");
    } catch {
      return fail("bad_output", 502, origin, true);
    }
    // /ask sometimes comes back half filled in: nothing to ask, or one cold point at (0,0) with an empty plan
    // note (3 of about 20 runs, 2026-11-05). Try once more and keep the first answer if that is no better.
    if (step === "ask" && askLooksUnfinished(result)) {
      try {
        const again = await callClaude(input, step, env);
        const parsed = JSON.parse(again.content.find((b) => b.type === "text")?.text ?? "");
        if (!askLooksUnfinished(parsed)) result = parsed;
      } catch { /* keep the first answer */ }
    }
    if (planReads && result.floor_plan && result.floor_plan.photo === planIdx + 1) {
      const extra = (await planReads).filter((r) => r.status === "fulfilled" && Array.isArray(r.value)).map((r) => r.value);
      if (extra.length >= 2) {
        const n = mergePlan(result.floor_plan, extra);
        result.floor_plan.reads = extra.length + 1;
        console.log(JSON.stringify({ at: new Date().toISOString(), step: "plan3", merged_rooms: n, ms: Date.now() - started }));
      }
    }
    return json({ ok: true, model: response.model, result }, 200, origin);
  },
};
