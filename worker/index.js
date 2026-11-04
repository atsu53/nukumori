// nukumori API relay (Cloudflare Workers).
// The browser sends answers, the device-side rule result and resized photos.
// This Worker checks them, adds the system prompt and calls the Claude API.
// The API key lives only in the Workers secret ANTHROPIC_API_KEY.
// Photos and answers are never stored or logged.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt.js";
import { ASK_SCHEMA, DIAGNOSIS_SCHEMA } from "./schema.js";

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS = 5;
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

// Returns { input } or { error }.
function validate(body) {
  if (!body || typeof body !== "object") return { error: "bad_request" };
  const { parent_words = "", place = "", time_of_day = "", fixed = {}, answers = {}, inferred_from_photos = [], ask = null, rule_result = {}, previous = null, confirmed = [], photos = [] } = body;
  if (typeof parent_words !== "string" || parent_words.length > 300) return { error: "bad_parent_words" };
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
  return { input: { parent_words, place, time_of_day, fixed, answers, inferred_from_photos, ask, rule_result, previous, confirmed, photos } };
}

// The photos and the fixed answers come first and are byte-identical in the ask and the
// diagnose call, so the second call can read them from the prompt cache.
function buildContent(input, step) {
  const content = [];
  input.photos.forEach((p, i) => {
    content.push({ type: "text", text: `写真${i + 1}：${p.label}` });
    content.push({ type: "image", source: { type: "base64", media_type: p.media_type, data: p.data } });
  });
  const { parent_words, place, time_of_day, fixed } = input;
  content.push({ type: "text", text: JSON.stringify({ parent_words, place, time_of_day, fixed, photo_count: input.photos.length }), cache_control: { type: "ephemeral" } });
  if (step === "ask") {
    content.push({ type: "text", text: JSON.stringify({ step }) });
  } else {
    const { answers, inferred_from_photos, ask, rule_result, previous, confirmed } = input;
    const extra = previous ? { previous, confirmed } : {};
    content.push({ type: "text", text: JSON.stringify({ step, ask, answers, inferred_from_photos, rule_result, ...extra }) });
  }
  return content;
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
    if (rateLimited(request)) return fail("rate_limited", 429, origin, true);

    const size = Number(request.headers.get("Content-Length") || 0);
    if (size > MAX_BODY_BYTES) return fail("too_large", 413, origin);

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
    return json({ ok: true, model: response.model, result }, 200, origin);
  },
};
