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
  message_to_parent: { type: "string" },
});
