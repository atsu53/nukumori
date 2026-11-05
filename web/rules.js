// Questions and the architect's rules that run on the device (docs/LOGIC.md ch.3).
// The rules only pick candidates and mark them (must_keep / keep_low / beyond_tolerance);
// Claude orders them after reading the whole house and says why (rule_overrides).

window.NUKUMORI_RULES = (() => {
  const UNKNOWN = "分からない";

  // ---------- places and time of day from the resident's words (SCREENS S1) ----------
  const PLACES = [
    { id: "bath", label: "浴室・脱衣所", words: ["風呂", "ふろ", "浴室", "脱衣", "洗面", "シャワー"] },
    { id: "bedroom", label: "寝室", words: ["寝室", "布団", "ふとん", "ベッド", "寝る", "寝て", "起き"] },
    { id: "kitchen", label: "台所", words: ["台所", "キッチン", "だいどころ", "流し"] },
    { id: "living", label: "居間", words: ["居間", "リビング", "茶の間", "こたつ", "炬燵", "テレビ"] },
    { id: "hall", label: "廊下・トイレ", words: ["廊下", "トイレ", "便所", "玄関"] },
    { id: "whole", label: "家全体", words: ["家じゅう", "家中", "どこも", "全部", "家全体", "どの部屋"] },
  ];
  const TIMES = [
    { label: "朝", words: ["朝", "起き", "目が覚め"] },
    { label: "夜", words: ["夜", "寝る", "寝て", "晩"] },
    { label: "入浴時", words: ["風呂", "ふろ", "入浴", "湯", "脱衣"] },
    { label: "一日中", words: ["一日中", "いつも", "ずっと", "日中"] },
  ];
  function detect(words) {
    const w = (words || "").trim();
    const place = PLACES.find((p) => p.words.some((k) => w.includes(k)));
    const time = TIMES.find((t) => t.words.some((k) => w.includes(k)));
    return { place: place ? place.label : "", placeId: place ? place.id : "", time: time ? time.label : "" };
  }

  // ---------- questions (docs/SPEC.md 4.2) ----------
  const QUESTIONS = {
    q0: { text: "その家は、どれに近いですか", note: "工事をどこまで決められるかが変わります", options: ["一戸建て（持ち家）", "マンション・アパート（分譲）", "借りている家", UNKNOWN] },
    q1: { text: "家は、いつごろ建ちましたか", note: "だいたいで大丈夫です", options: ["1980年以前", "1981〜1999年", "2000〜2015年", "2016年以降", UNKNOWN] },
    q9: { text: "工事は、どのくらいまで考えられますか", note: "かけられるお金の感覚で選んでください。金額は聞きません", options: ["工事はしない（暮らし方の工夫だけ）", "1日で終わる工事まで", "数日かかる工事も考える", "大きく直してもよい", "まだ分からない"] },
    q8: { text: "窓やお風呂を、直したことはありますか", note: "新築のときと今の状態を分けるための質問です", options: ["窓を交換した・内窓をつけた", "お風呂を直した（ユニットバス化など）", "どちらも直していない", UNKNOWN] },
    q3: { text: "お風呂は、どんなお風呂ですか", note: "", options: ["タイル張りの昔ながらの浴室", "ユニットバス（古い）", "ユニットバス（比較的新しい）", UNKNOWN] },
    q4: { text: "脱衣所やお風呂に、暖房はありますか", note: "", options: ["ない", "持ち運びのヒーターを使う", "浴室暖房乾燥機がある", UNKNOWN] },
    q2: { text: "寒い部屋の窓は、どれに近いですか", note: "分からなければ写真で判断します", options: ["アルミ枠で1枚ガラス", "アルミ枠で2枚ガラス（複層）", "樹脂や木の枠で2枚ガラス", "内窓がついている", UNKNOWN] },
    q5: { text: "冬、床の冷たさはどうですか", note: "", options: ["靴下でも足が冷たい", "スリッパなら平気", "気にならない", UNKNOWN] },
    q6: { text: "冬の朝、窓や壁に結露しますか", note: "", options: ["窓がびっしょり", "窓の下のほうだけ", "壁や押入れにも", "ほとんどしない", UNKNOWN] },
    q7: { text: "冬、主に使っている暖房はどれですか", note: "排気筒（煙突）のないストーブは、水蒸気が部屋に出ます", options: ["エアコン", "石油ファンヒーターや開放型ストーブ（排気筒なし）", "FF式・煙突つきのストーブ", "こたつ・電気ストーブ", "床暖房", UNKNOWN] },
    q10: { text: "寒さのほかに、直したいところはありますか", note: "一緒に直すと工事がまとまることがあります", options: ["雨漏りや外壁・屋根の傷み", "台所・トイレ・お風呂などの古さ", "段差や手すりなど暮らしやすさ", "特にない", UNKNOWN] },
  };
  // Asked of everyone. The rest are picked by Claude after it reads the photos (/ask).
  const FIXED = ["q0", "q1", "q9"];
  // Fallback when /ask fails: the fixed questions, then all the others in the old order.
  const ORDER_BATH = ["q0", "q1", "q9", "q8", "q3", "q4", "q2", "q5", "q6", "q7"];
  const ORDER_OTHER = ["q0", "q1", "q9", "q8", "q2", "q5", "q6", "q7"];
  function order(placeId) { return placeId === "bath" ? ORDER_BATH : ORDER_OTHER; }

  // ---------- candidate lists (docs/LOGIC.md 2.3) ----------
  const CAUSE_NAMES = {
    window_heat_loss: "窓から熱が逃げている",
    window_draft: "窓まわりの隙間風",
    floor_cold: "床下からの冷え",
    wall_ceiling_insulation: "壁・天井の断熱不足",
    bathroom_cold: "浴室そのものが冷える",
    unheated_rooms: "脱衣所・廊下・トイレが暖房されていない",
    heating_mismatch: "暖房の方式が部屋に合っていない",
    moisture: "換気や湿気の問題",
    other: "その他",
  };
  const PROPOSALS = {
    inner_window: { name: "今の窓の内側にもう1枚窓をつける（内窓）", work_size: "small", subsidy: "possible" },
    // Work sizes checked with a builder (survey, 2026-11-05): window replacement by the cover method is
    // done in a day; a unit bath takes a few days. Ceiling only (from the attic) would be a few days too.
    window_replace: { name: "窓の交換", work_size: "small", subsidy: "possible" },
    floor_insulation: { name: "床の断熱", work_size: "medium", subsidy: "check" },
    bath_heater: { name: "脱衣所・浴室の暖房", work_size: "small", subsidy: "check" },
    bathroom_renovation: { name: "浴室の断熱改修（ユニットバス化か窓の対策）", work_size: "medium", subsidy: "check" },
    wall_ceiling_insulation: { name: "壁・天井の断熱", work_size: "large", subsidy: "check" },
    aircon_heating: { name: "エアコン暖房の活用", work_size: "small", subsidy: "none" },
    ventilation: { name: "換気の見直し", work_size: "small", subsidy: "none" },
  };
  const WORK_LABEL = { small: "小（1日以内・住みながら）", medium: "中（数日）", large: "大（間取りや壁をさわる）" };
  const SUBSIDY_LABEL = { possible: "補助：あり得る", none: "補助：対象になりにくい", check: "補助：要確認" };
  const CONF_LABEL = { almost_certain: "ほぼ確実", likely: "可能性が高い", needs_check: "要確認" };

  // ---------- the rules (docs/LOGIC.md 3.1-3.6) ----------
  // inferred: question ids Claude read from the photos instead of the family answering.
  // A cause that rests on such an answer is never "almost certain".
  function run(answers, placeId, inferred = []) {
    const a = answers || {};
    const causes = {}; // id -> { confidence, why }
    const add = (id, confidence, why, q) => {
      if (q && inferred.includes(q) && confidence === "almost_certain") { confidence = "likely"; why += "（写真からの推定）"; }
      const rankC = { almost_certain: 3, likely: 2, needs_check: 1 };
      if (!causes[id] || rankC[confidence] > rankC[causes[id].confidence]) causes[id] = { confidence, why };
      else causes[id].why += "。" + why;
    };
    const proposals = {}; // id -> { direct: bool, notes: [] }
    const want = (id, direct, note) => {
      if (!proposals[id]) proposals[id] = { direct: false, notes: [] };
      if (direct) proposals[id].direct = true;
      if (note) proposals[id].notes.push(note);
    };
    const bathEntry = placeId === "bath";
    const old = a.q1 === "1980年以前" || a.q1 === "1981〜1999年";
    const windowDone = a.q8 === "窓を交換した・内窓をつけた";
    const bathDone = a.q8 === "お風呂を直した（ユニットバス化など）";
    const rented = a.q0 === "マンション・アパート（分譲）" || a.q0 === "借りている家";

    // 3.1 age
    if (a.q1 === "1980年以前") add("wall_ceiling_insulation", "likely", "1980年以前の家は無断熱の可能性が高い（3.1）");
    if (a.q1 === "1981〜1999年" && !windowDone) add("window_heat_loss", "likely", "昭和55年・平成4年基準のころの家は窓が単板ガラスの可能性が高い（3.1）");
    if (a.q1 === "2000〜2015年" && !windowDone) add("window_heat_loss", "needs_check", "複層でも枠がアルミなら窓から逃げる（3.1）");

    // 3.2 window
    if (!windowDone) {
      if (a.q2 === "アルミ枠で1枚ガラス") { add("window_heat_loss", "almost_certain", "アルミ枠の1枚ガラス（3.2）", "q2");want("inner_window", true, "単板ガラスなら内窓を1位に（3.2）"); }
      else if (a.q2 === "アルミ枠で2枚ガラス（複層）") { add("window_heat_loss", "likely", "アルミ枠からの冷えと結露（3.2）"); want("inner_window", true); want("window_replace", true); }
      else if (a.q2 === UNKNOWN || !a.q2) { if (causes.window_heat_loss) want("inner_window", false, "窓の種類は写真で判断（3.2）"); }
    } else {
      add("window_heat_loss", "needs_check", "窓は直してあるので上位にしない（Q8）");
    }

    // 3.3 bath
    if (bathEntry || a.q3 || a.q4) {
      if (a.q3 === "タイル張りの昔ながらの浴室" && !bathDone) { add("bathroom_cold", "likely", "タイルの在来浴室（3.3）"); want("bathroom_renovation", true, "在来浴室は断熱改修を上位に（3.3）"); }
      if (a.q4 === "ない" || a.q4 === "持ち運びのヒーターを使う") { add("unheated_rooms", a.q4 === "ない" ? "likely" : "needs_check", "脱衣所・浴室に固定の暖房がない（3.3）"); want("bath_heater", true, "入浴前に暖められるように（3.3）"); }
      if (a.q4 === "浴室暖房乾燥機がある") want("bath_heater", false, "使い方（入浴前に暖める）を声かけに（3.3）");
    }

    // 3.4 floor and condensation
    if (a.q5 === "靴下でも足が冷たい") { add("floor_cold", old ? "likely" : "needs_check", "靴下でも足が冷たい（3.4）"); want("floor_insulation", true, old ? "築1999年以前なので順位を上げる（3.4）" : ""); }
    if (a.q6 === "窓がびっしょり" || a.q6 === "窓の下のほうだけ") { if (!windowDone) add("window_heat_loss", causes.window_heat_loss ? causes.window_heat_loss.confidence : "likely", "結露は窓の性能の手がかり（3.4）"); }
    if (a.q6 === "壁や押入れにも") { add("moisture", "likely", "壁や押入れの結露は換気・湿気の問題（3.4）"); want("ventilation", true); }

    // 3.5 heating
    if (a.q7 === "こたつ・電気ストーブ") { add("heating_mismatch", "likely", "局所暖房だけ（3.5）"); want("aircon_heating", true); }
    if (a.q7 === "石油ファンヒーターや開放型ストーブ（排気筒なし）") { add("moisture", causes.moisture ? causes.moisture.confidence : "needs_check", "排気筒のない燃焼器具は水蒸気と空気の汚れが室内に出る（3.5）"); want("ventilation", false, "断熱の改修とセットで換気を見直す（3.5）"); }

    // entry place without specific answers
    if (bathEntry && !causes.bathroom_cold && !causes.unheated_rooms) add("unheated_rooms", "needs_check", "浴室・脱衣所が入口（一言）");
    if (placeId === "hall") add("unheated_rooms", "likely", "廊下・トイレが入口（一言）");

    // 3.6 candidates and marks (no scores since 2026-11-04; Claude orders them)
    const heatShock = bathEntry && (a.q4 === "ない" || a.q4 === "持ち運びのヒーターを使う" || a.q3 === "タイル張りの昔ながらの浴室");
    const sizeOrder = { small: 0, medium: 1, large: 2 };
    const tolerance = { "工事はしない（暮らし方の工夫だけ）": -1, "1日で終わる工事まで": 0, "数日かかる工事も考える": 1, "大きく直してもよい": 2 }[a.q9];
    let list = Object.keys(proposals).map((id) => {
      const p = PROPOSALS[id];
      const marks = [];
      const notes = proposals[id].notes.filter(Boolean);
      if (proposals[id].direct) notes.push("疑う原因に直接効く");
      if (heatShock && (id === "bath_heater" || id === "bathroom_renovation")) notes.push("ヒートショックの危険を下げる");
      if (id === "bath_heater" && bathEntry && (a.q4 === "ない" || a.q4 === "持ち運びのヒーターを使う")) { marks.push("must_keep"); notes.push("外さない案。first_choice の第一候補（3.3）"); }
      if ((windowDone && (id === "inner_window" || id === "window_replace")) || (bathDone && id === "bathroom_renovation")) { marks.push("keep_low"); notes.push("直した部位なので上げない（Q8）"); }
      if (tolerance !== undefined && sizeOrder[p.work_size] > tolerance) { marks.push("beyond_tolerance"); notes.push("工事の大きさの許容を超える。次に直すときに（Q9）"); }
      return { id, work_size: p.work_size, subsidy: p.subsidy, marks, notes };
    });
    if (rented) {
      list = list.filter((x) => ["bath_heater", "inner_window", "aircon_heating", "ventilation"].includes(x.id));
    }
    // candidate order only, not a ranking: must_keep first, beyond_tolerance last, then smaller work first
    const weight = (x) => (x.marks.includes("must_keep") ? 0 : 1) + (x.marks.includes("beyond_tolerance") ? 2 : 0) + (x.marks.includes("keep_low") ? 1 : 0);
    list.sort((x, y) => weight(x) - weight(y) || sizeOrder[x.work_size] - sizeOrder[y.work_size]);

    const confOrder = { almost_certain: 0, likely: 1, needs_check: 2 };
    const causeList = Object.keys(causes).map((id) => ({ id, ...causes[id] })).sort((x, y) => confOrder[x.confidence] - confOrder[y.confidence]);

    return {
      causes: causeList,
      proposals: list,
      heat_shock_level: heatShock ? "strong" : (bathEntry ? "normal" : "none"),
      home_type: a.q0 || "",
      work_tolerance: a.q9 || "",
      note: rented ? "分譲・賃貸：窓・外壁の工事は管理組合や大家の了解が要る。改修案は暖房・内窓・換気に絞った" : "",
    };
  }

  return { UNKNOWN, PLACES, QUESTIONS, FIXED, order, detect, run, CAUSE_NAMES, PROPOSALS, WORK_LABEL, SUBSIDY_LABEL, CONF_LABEL };
})();
