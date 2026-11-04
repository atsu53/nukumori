// JSON schema for Claude's diagnosis (structured outputs).
// Field names are English; the text values are Japanese.

const CAUSE_IDS = [
  "window_heat_loss",
  "window_draft",
  "floor_cold",
  "wall_ceiling_insulation",
  "bathroom_cold",
  "unheated_rooms",
  "heating_mismatch",
  "moisture",
  "other",
];

const PROPOSAL_IDS = [
  "inner_window",
  "window_replace",
  "floor_insulation",
  "bath_heater",
  "bathroom_renovation",
  "wall_ceiling_insulation",
  "aircon_heating",
  "ventilation",
  "other",
];

const obj = (properties) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

// Questions Claude may pick in the "ask" step (the fixed ones q0, q1, q9 are asked by the page).
const QUESTION_IDS = ["q2", "q3", "q4", "q5", "q6", "q7", "q8", "q10"];

// A point on a photo: x, y in 0-1000 (fraction of the image width / height as sent).
const point = (extra) => obj({ ...extra, x: { type: "integer" }, y: { type: "integer" } });

export const ASK_SCHEMA = obj({
  first_look: { type: "string" },
  // One sentence per photo: what can be seen, and what cannot.
  photo_notes: {
    type: "array",
    items: obj({ photo: { type: "integer" }, note: { type: "string" } }),
  },
  // Read from the floor-plan photo, if there is one. photo = 0 when there is none.
  floor_plan: obj({
    photo: { type: "integer" },
    rooms: { type: "array", items: point({ name: { type: "string" } }) },
    warm_room: { type: "string" },
    cold_route: { type: "array", items: point({}) },
    cold_points: { type: "array", items: point({ name: { type: "string" }, why: { type: "string" } }) },
    note: { type: "string" },
  }),
  questions: {
    type: "array",
    items: obj({
      id: { type: "string", enum: QUESTION_IDS },
      why: { type: "string" },
    }),
  },
  inferred: {
    type: "array",
    items: obj({
      id: { type: "string", enum: QUESTION_IDS },
      value: { type: "string" },
      basis: { type: "string" },
    }),
  },
});

export const DIAGNOSIS_SCHEMA = obj({
  place: { type: "string" },
  causes: {
    type: "array",
    items: obj({
      rank: { type: "integer" },
      id: { type: "string", enum: CAUSE_IDS },
      name: { type: "string" },
      reason: { type: "string" },
      confidence: { type: "string", enum: ["almost_certain", "likely", "needs_check"] },
    }),
  },
  photo_findings: {
    type: "array",
    items: obj({
      photo: { type: "integer" },
      note: { type: "string" },
    }),
  },
  checks: { type: "array", items: { type: "string" } },
  proposals: {
    type: "array",
    items: obj({
      rank: { type: "integer" },
      id: { type: "string", enum: PROPOSAL_IDS },
      name: { type: "string" },
      description: { type: "string" },
      expected_change: { type: "string" },
      work_size: { type: "string", enum: ["small", "medium", "large"] },
      subsidy: { type: "string", enum: ["possible", "none", "check"] },
      why_this_rank: { type: "string" },
      first_choice: { type: "boolean" },
    }),
  },
  rule_overrides: {
    type: "array",
    items: obj({
      what: { type: "string" },
      why: { type: "string" },
    }),
  },
  // Things the family can try today without any construction work (1-3 items).
  today_actions: {
    type: "array",
    items: obj({
      name: { type: "string" },
      description: { type: "string" },
    }),
  },
  message_to_parent: { type: "string" },
  // Re-diagnosis only (previous + confirmed were sent): what changed and why. Empty on a first diagnosis.
  changes: {
    type: "array",
    items: obj({
      what: { type: "string" },
      before: { type: "string" },
      after: { type: "string" },
      why: { type: "string" },
    }),
  },
});
