// nukumori, look B (soft; kept while the final look is chosen, 2026-11-05): drawings for the screens. A house section (断面図) for the cover, the wait and the results,
// small pictures for the answer choices, and the "looking at your photos" scan. Plain SVG strings, no
// libraries. Colours follow style.css and the video frames (ink, warm orange, cold blue).
(() => {
  const INK = "#2b2420", WARM = "#c8672b", COLD = "#4f84b3", MUTED = "#b9ab99", GLASS = "#dbe8f2";
  const PAPER = "#fffdf9", ALU = "#8f98a1", WOOD = "#c9a27a", OK = "#3f7d4e";
  const svg = (inner, vb = "0 0 64 64", cls = "pic") =>
    `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  // ---------- house section ----------
  // Where each cause sits on the drawing (viewBox 0 0 360 232): the numbered badge and the cold sign.
  const SPOT = {
    window_heat_loss: { bx: 36, by: 120, cold: "window" },
    window_draft: { bx: 36, by: 172, cold: "draft" },
    floor_cold: { bx: 182, by: 206, cold: "floor" },
    wall_ceiling_insulation: { bx: 182, by: 78, cold: "ceiling" },
    bathroom_cold: { bx: 277, by: 140, cold: "bath" },
    unheated_rooms: { bx: 233, by: 150, cold: "room" },
    heating_mismatch: { bx: 93, by: 152, cold: "" },
    moisture: { bx: 80, by: 118, cold: "drops" },
  };
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 7;
    const p1 = `${x2 - h * Math.cos(a - 0.5)},${y2 - h * Math.sin(a - 0.5)}`, p2 = `${x2 - h * Math.cos(a + 0.5)},${y2 - h * Math.sin(a + 0.5)}`;
    return `<path d="M${x1} ${y1} L${x2} ${y2} M${p1} L${x2} ${y2} L${p2}"/>`;
  };
  const flake = (x, y, r) => `<path d="M${x} ${y - r} V${y + r} M${x - r * 0.87} ${y - r / 2} L${x + r * 0.87} ${y + r / 2} M${x - r * 0.87} ${y + r / 2} L${x + r * 0.87} ${y - r / 2}"/>`;
  const COLD_SIGN = {
    window: arrow(10, 144, 46, 144) + `<path d="M12 132 q6 -4 12 0 t12 0 M12 156 q6 -4 12 0 t12 0" stroke-width="2"/>`,
    draft: `<path d="M8 168 q8 -6 16 0 t16 0 M8 178 q8 -6 16 0 t16 0" stroke-dasharray="3 4"/>` + arrow(34, 173, 52, 173),
    floor: arrow(140, 222, 140, 196) + arrow(220, 222, 220, 196),
    ceiling: arrow(120, 58, 120, 98) + arrow(240, 58, 240, 98),
    bath: arrow(350, 132, 312, 132),
    room: flake(233, 174, 7),
    drops: `<g fill="${COLD}" stroke="none"><circle cx="60" cy="132" r="2.2"/><circle cx="60" cy="144" r="2.2"/><circle cx="60" cy="156" r="2.2"/></g>`,
  };

  function house({ mode = "cover", marks = [] } = {}) {
    let i = 0;
    const d = (tag, attrs) => `<${tag} class="d" pathLength="1" style="--i:${i++}" ${attrs}/>`;
    const ground = Array.from({ length: 28 }, (_, k) => `M${16 + k * 12} 218 l-7 9`).join(" ");
    const structure = [
      d("polygon", `points="30,104 180,32 330,104 312,104 180,44 48,104" fill="${PAPER}"`), // roof
      d("line", `x1="56" y1="106" x2="304" y2="106"`), // ceiling
      d("polyline", `points="56,106 56,124"`), d("polyline", `points="64,106 64,124"`), // left wall above the window
      d("polyline", `points="56,166 56,192"`), d("polyline", `points="64,166 64,186"`), // below it
      d("rect", `x="56" y="124" width="8" height="42" fill="${GLASS}"`), d("line", `x1="60" y1="124" x2="60" y2="166"`), // window
      d("polyline", `points="296,106 296,122"`), d("polyline", `points="304,106 304,122"`), // right wall
      d("polyline", `points="296,142 296,186"`), d("polyline", `points="304,142 304,192"`),
      d("rect", `x="296" y="122" width="8" height="20" fill="${GLASS}"`), d("line", `x1="300" y1="122" x2="300" y2="142"`), // bath window
      d("line", `x1="64" y1="186" x2="296" y2="186"`), d("line", `x1="56" y1="192" x2="304" y2="192"`), // floor
      d("rect", `x="50" y="192" width="18" height="26" fill="#ece4d8"`), d("rect", `x="292" y="192" width="18" height="26" fill="#ece4d8"`), // footings
      d("line", `x1="8" y1="218" x2="352" y2="218"`), // ground
      d("polyline", `points="214,106 214,140"`), d("polyline", `points="252,106 252,148"`), // partitions (doors below)
      d("rect", `x="261" y="158" width="31" height="28" rx="5" fill="${PAPER}"`), // bathtub
      d("rect", `x="82" y="166" width="22" height="20" rx="2" fill="${PAPER}"`), // heater
      d("circle", `cx="150" cy="142" r="6"`), d("polyline", `points="150,148 150,168 143,186"`), d("polyline", `points="150,168 157,186"`), d("polyline", `points="141,160 150,154 159,160"`), // a person
    ].join("");
    const groundHatch = `<path class="d" pathLength="1" style="--i:${i++}" d="${ground}" stroke="${MUTED}" stroke-width="1.5"/>`;
    const water = `<path class="lbl" d="M265 168 H288" stroke="${COLD}" stroke-width="2"/>`;
    const flame = `<path class="lbl" d="M93 182 c-4 -2 -4 -7 0 -10 c4 3 4 8 0 10 Z" fill="${WARM}" stroke="none"/>`;
    const labels = `<g class="lbl" font-size="10" fill="#8a7d70" stroke="none" font-family="inherit"><text x="118" y="122">居間</text><text x="218" y="120">脱衣所</text><text x="224" y="132">廊下</text><text x="264" y="122">浴室</text><text x="8" y="16" font-size="9" letter-spacing="1">断面図（模式）</text></g>`;
    const glow = `<circle class="glow" cx="100" cy="166" r="62" fill="url(#nk-warm)" clip-path="url(#nk-living)" stroke="none"/>`;
    const defs = `<defs><radialGradient id="nk-warm"><stop offset="0" stop-color="#e3a25a" stop-opacity=".6"/><stop offset="1" stop-color="#e3a25a" stop-opacity="0"/></radialGradient><clipPath id="nk-living"><rect x="64" y="106" width="150" height="80"/></clipPath></defs>`;
    let signs = "", badges = "";
    if (mode === "cover") {
      signs = ["window", "floor", "room", "bath"].map((k, j) => `<g class="cold" style="--j:${j}" stroke="${COLD}">${COLD_SIGN[k]}</g>`).join("");
    } else if (mode === "result") {
      const seen = new Set();
      marks.filter((m) => SPOT[m.id] && !seen.has(m.id) && seen.add(m.id)).forEach((m, j) => {
        const s = SPOT[m.id];
        if (s.cold) signs += `<g class="cold" style="--j:${j}" stroke="${COLD}">${COLD_SIGN[s.cold]}</g>`;
        badges += `<g class="mark" style="--j:${j}"><circle cx="${s.bx}" cy="${s.by}" r="11" fill="${WARM}" stroke="#fff" stroke-width="2"/><text x="${s.bx}" y="${s.by + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="#fff" stroke="none">${m.rank}</text></g>`;
      });
    }
    const cls = `house ${mode === "cover" ? "draw" : "static"}`;
    return `<svg class="${cls}" viewBox="0 0 360 232" role="img" aria-label="家の断面図" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${defs}${glow}${structure}${groundHatch}${water}${flame}${labels}${signs}${badges}</svg>`;
  }

  // ---------- pictures for the answers ----------
  const win = ({ frame = ALU, double = false, drops = "", inner = false } = {}) => {
    const pane = (x) => `<rect x="${x}" y="17" width="19" height="31" fill="${GLASS}" stroke="${frame}" stroke-width="2"/>` +
      (double ? `<rect x="${x + 3}" y="20" width="13" height="25" stroke="#9cc0dd" stroke-width="1.6"/>` : "");
    const back = `<rect x="10" y="13" width="44" height="39" rx="1.5" stroke="${frame}" stroke-width="4" fill="${PAPER}"/>${pane(14)}${pane(31)}`;
    const front = inner ? `<rect x="5" y="22" width="40" height="36" rx="1.5" stroke="${WOOD}" stroke-width="3.5" fill="${GLASS}" fill-opacity=".55"/><path d="M25 22 V58" stroke="${WOOD}" stroke-width="2"/>` : "";
    return svg(back + front + drops);
  };
  const dropsAll = `<g fill="${COLD}" stroke="none">${[[19, 22], [26, 30], [20, 38], [27, 44], [36, 24], [44, 32], [37, 40], [45, 45], [23, 27], [41, 21]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join("")}</g>`;
  const dropsLow = `<g fill="${COLD}" stroke="none">${[[18, 44], [24, 45], [30, 43], [36, 45], [42, 44], [48, 45]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join("")}</g>`;
  const house0 = (extra = "") => svg(`<path d="M10 30 L32 12 L54 30 V54 H10 Z" fill="${PAPER}"/><rect x="27" y="38" width="10" height="16"/>${extra}`);
  const tileBath = (extra = "") => svg(`<rect x="8" y="8" width="48" height="30" fill="#eef3f7" stroke="${MUTED}" stroke-width="1.5"/><path d="M16 8 V38 M24 8 V38 M32 8 V38 M40 8 V38 M48 8 V38 M8 16 H56 M8 24 H56 M8 32 H56" stroke="${MUTED}" stroke-width="1"/><path d="M6 38 H58 V46 a8 8 0 0 1 -8 8 H14 a8 8 0 0 1 -8 -8 Z" fill="${PAPER}"/><path d="M11 43 H53" stroke="${COLD}" stroke-width="2"/>${extra}`);
  const unitBath = (extra = "") => svg(`<rect x="8" y="8" width="48" height="48" rx="10" fill="#f4f7fa"/><rect x="25" y="12" width="14" height="7" rx="1" stroke-width="2"/><path d="M14 36 H50 V43 a7 7 0 0 1 -7 7 H21 a7 7 0 0 1 -7 -7 Z" fill="${PAPER}"/><path d="M18 40 H46" stroke="${COLD}" stroke-width="2"/>${extra}`);
  const check = (x = 46, y = 46) => `<circle cx="${x}" cy="${y}" r="10" fill="${OK}" stroke="#fff" stroke-width="2"/><path d="M${x - 5} ${y} l3.5 3.5 l6 -7" stroke="#fff" stroke-width="2.5"/>`;
  const waves = (xs, y, color = WARM) => `<path d="${xs.map((x) => `M${x} ${y} q3 -4 0 -8 q-3 -4 0 -8`).join(" ")}" stroke="${color}" stroke-width="2.2"/>`;

  const PIC = {
    q0: {
      "一戸建て（持ち家）": () => house0(),
      "マンション・アパート（分譲）": () => svg(`<rect x="16" y="6" width="32" height="52" fill="${PAPER}"/>${[12, 22, 32, 42].map((y) => [21, 29, 37].map((x) => `<rect x="${x}" y="${y}" width="5" height="6" stroke-width="1.6" fill="${GLASS}"/>`).join("")).join("")}<path d="M28 58 V50 H36 V58"/>`),
      "借りている家": () => house0(`<circle cx="47" cy="47" r="5" fill="${PAPER}" stroke="${WARM}"/><path d="M52 47 H60 M57 47 V51" stroke="${WARM}"/>`),
    },
    q8: {
      "窓を交換した・内窓をつけた": () => win({ frame: WOOD, double: true, drops: check() }),
      "お風呂を直した（ユニットバス化など）": () => unitBath(check()),
      "どちらも直していない": () => svg(`<rect x="6" y="12" width="24" height="22" stroke="${ALU}" stroke-width="3" fill="${GLASS}"/><path d="M18 12 V34" stroke="${ALU}" stroke-width="2"/><path d="M32 36 H60 V42 a6 6 0 0 1 -6 6 H38 a6 6 0 0 1 -6 -6 Z" fill="${PAPER}"/><path d="M8 54 H58" stroke="${MUTED}" stroke-dasharray="3 5"/>`),
    },
    q2: {
      "アルミ枠で1枚ガラス": () => win({}),
      "アルミ枠で2枚ガラス（複層）": () => win({ double: true }),
      "樹脂や木の枠で2枚ガラス": () => win({ frame: WOOD, double: true }),
      "内窓がついている": () => win({ inner: true }),
    },
    q3: {
      "タイル張りの昔ながらの浴室": () => tileBath(),
      "ユニットバス（古い）": () => unitBath(),
      "ユニットバス（比較的新しい）": () => unitBath(`<path d="M52 4 V14 M47 9 H57" stroke="${WARM}" stroke-width="2.5"/>`),
    },
    q4: {
      "ない": () => svg(`<path d="M10 54 H54 M10 54 V12" stroke="${MUTED}"/><g stroke="${COLD}" stroke-width="3">${flake(34, 32, 13)}</g>`),
      "持ち運びのヒーターを使う": () => svg(`<rect x="18" y="26" width="28" height="26" rx="4" fill="${PAPER}"/><path d="M24 34 H40 M24 40 H40 M24 46 H40" stroke-width="2"/><path d="M21 52 V57 M43 52 V57"/>${waves([24, 32, 40], 22)}`),
      "浴室暖房乾燥機がある": () => svg(`<path d="M4 10 H60" stroke="${MUTED}"/><rect x="14" y="10" width="36" height="12" rx="2" fill="${PAPER}"/><path d="M19 16 H45" stroke-width="2"/><path d="M22 30 q-3 4 0 8 q3 4 0 8 M32 30 q-3 4 0 8 q3 4 0 8 M42 30 q-3 4 0 8 q3 4 0 8" stroke="${WARM}" stroke-width="2.2"/>`),
    },
    q5: {
      "靴下でも足が冷たい": () => svg(`<path d="M18 8 H32 V34 L46 40 a6 6 0 0 1 -2 12 H24 a6 6 0 0 1 -6 -6 Z" fill="${PAPER}"/><path d="M18 14 H32" stroke-width="2"/><g stroke="${COLD}" stroke-width="2.5">${flake(50, 18, 7)}</g><path d="M6 58 H58" stroke="${MUTED}"/>`),
      "スリッパなら平気": () => svg(`<path d="M8 46 q0 -9 18 -9 h14 q16 0 16 7 q0 6 -12 6 H16 q-8 0 -8 -4 Z" fill="${PAPER}"/><path d="M24 38 q6 -10 18 -6" stroke-width="2.5"/><path d="M6 58 H58" stroke="${MUTED}"/>`),
      "気にならない": () => svg(`<path d="M18 8 H32 V34 L46 40 a6 6 0 0 1 -2 12 H24 a6 6 0 0 1 -6 -6 Z" fill="${PAPER}"/><path d="M18 14 H32" stroke-width="2"/>${waves([48, 56], 22)}<path d="M6 58 H58" stroke="${MUTED}"/>`),
    },
    q6: {
      "窓がびっしょり": () => win({ drops: dropsAll }),
      "窓の下のほうだけ": () => win({ drops: dropsLow }),
      "壁や押入れにも": () => svg(`<path d="M8 8 V56 H56" stroke="${MUTED}"/><rect x="14" y="8" width="38" height="44" fill="${PAPER}" stroke="${MUTED}" stroke-width="1.5"/><g fill="${COLD}" stroke="none">${[[20, 16], [30, 22], [44, 18], [24, 34], [40, 30], [34, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.9"/>`).join("")}</g><g fill="#6e6a55" stroke="none">${[[18, 46], [22, 49], [16, 50], [46, 47], [49, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5"/>`).join("")}</g>`),
      "ほとんどしない": () => win({ frame: ALU }),
    },
    q7: {
      "エアコン": () => svg(`<rect x="8" y="12" width="48" height="18" rx="6" fill="${PAPER}"/><path d="M14 24 H50" stroke-width="2"/><path d="M18 36 q4 6 0 12 M32 36 q4 6 0 12 M46 36 q4 6 0 12" stroke="${WARM}" stroke-width="2.2"/>`),
      "石油ファンヒーターや開放型ストーブ（排気筒なし）": () => svg(`<rect x="14" y="22" width="36" height="32" rx="4" fill="${PAPER}"/><rect x="20" y="34" width="24" height="14" rx="2" fill="#f6dcc4" stroke-width="2"/><path d="M32 46 c-5 -3 -4 -8 0 -11 c4 3 5 8 0 11 Z" fill="${WARM}" stroke="none"/>${waves([24, 40], 18)}`),
      "FF式・煙突つきのストーブ": () => svg(`<path d="M52 4 V60" stroke="${MUTED}"/><rect x="8" y="28" width="30" height="26" rx="3" fill="${PAPER}"/><rect x="13" y="37" width="20" height="11" rx="2" fill="#f6dcc4" stroke-width="2"/><path d="M23 46 c-4 -2 -3 -6 0 -8 c3 2 4 6 0 8 Z" fill="${WARM}" stroke="none"/><path d="M23 28 V14 H58" stroke-width="4"/>`),
      "こたつ・電気ストーブ": () => svg(`<rect x="8" y="22" width="48" height="6" rx="2" fill="${WOOD}"/><path d="M11 28 q-3 14 5 24 H48 q8 -10 5 -24" fill="#f6dcc4"/>${waves([24, 40], 18)}`),
      "床暖房": () => svg(`<path d="M6 34 H58" stroke-width="3"/><path d="M8 44 q5 -5 10 0 t10 0 t10 0 t10 0 t10 0" stroke="${WARM}" stroke-width="2.2"/><path d="M20 28 V16 M32 28 V16 M44 28 V16 M16 20 L20 16 L24 20 M28 20 L32 16 L36 20 M40 20 L44 16 L48 20" stroke="${WARM}" stroke-width="2"/>`),
    },
  };
  // q1 and q9 read better as a strip beside the answer: a timeline of the building eras, and a size meter.
  const yx = (y) => 6 + (y - 1950) * (108 / 76);
  const timeline = (from, to) => svg(`<path d="M6 12 H114" stroke="${MUTED}" stroke-width="2"/>${[1980, 2000, 2016].map((y) => `<path d="M${yx(y)} 8 V16" stroke="${MUTED}" stroke-width="1.5"/><text x="${yx(y)}" y="24" font-size="7" text-anchor="middle" fill="#8a7d70" stroke="none">${y}</text>`).join("")}<path d="M${yx(from)} 12 H${yx(to)}" stroke="${WARM}" stroke-width="6"/>`, "0 0 120 26", "strip");
  const meter = (n) => svg([0, 1, 2].map((k) => `<rect x="${6 + k * 37}" y="6" width="32" height="14" rx="3" ${k < n ? `fill="${WARM}" stroke="${WARM}"` : `stroke="${MUTED}"`} stroke-width="2"/>`).join(""), "0 0 120 26", "strip");
  const STRIP = {
    q1: { "1980年以前": () => timeline(1950, 1980), "1981〜1999年": () => timeline(1981, 1999), "2000〜2015年": () => timeline(2000, 2015), "2016年以降": () => timeline(2016, 2026) },
    q9: { "工事はしない（暮らし方の工夫だけ）": () => meter(0), "1日で終わる工事まで": () => meter(1), "数日かかる工事も考える": () => meter(2), "大きく直してもよい": () => meter(3) },
  };
  const layout = (qid) => (PIC[qid] ? "tiles" : STRIP[qid] ? "rows" : "list");
  const pic = (qid, option) => {
    const f = (PIC[qid] && PIC[qid][option]) || (STRIP[qid] && STRIP[qid][option]);
    return f ? f() : "";
  };

  // ---------- small pictures elsewhere ----------
  const SLOT = {
    1: () => win({}),
    2: () => svg(`<path d="M8 8 L22 20 H42 L56 8 M22 20 V44 H42 V20 M22 44 L8 56 M42 44 L56 56"/><rect x="26" y="25" width="12" height="10" stroke-width="2" fill="${GLASS}"/>`),
    3: () => tileBath(),
    4: () => house0(),
    5: () => svg(`<rect x="8" y="10" width="48" height="44" fill="${PAPER}"/><path d="M8 30 H28 V54 M28 30 V10 M28 38 H56" stroke-width="2"/><path d="M28 46 a8 8 0 0 1 8 -8" stroke-width="1.5"/>`),
  };
  const STEP = {
    photo: () => svg(`<rect x="8" y="18" width="48" height="34" rx="6" fill="${PAPER}"/><circle cx="32" cy="35" r="10" fill="${GLASS}"/><path d="M22 18 l4 -6 h12 l4 6"/>`),
    words: () => svg(`<path d="M10 12 h44 a4 4 0 0 1 4 4 v20 a4 4 0 0 1 -4 4 H28 l-10 9 v-9 h-8 a4 4 0 0 1 -4 -4 V16 a4 4 0 0 1 4 -4 Z" fill="${PAPER}"/><path d="M18 22 h28 M18 30 h18" stroke-width="2"/>`),
    result: () => house0(`<circle cx="49" cy="17" r="9" fill="${WARM}" stroke="#fff" stroke-width="2"/><text x="49" y="17.5" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#fff" stroke="none">1</text>`),
  };
  // The proposals (rules.js PROPOSALS) with the same drawings, and the work size as a small meter.
  const PROP = {
    inner_window: () => PIC.q2["内窓がついている"](),
    window_replace: () => PIC.q2["樹脂や木の枠で2枚ガラス"](),
    floor_insulation: () => svg(`<path d="M4 22 H60" stroke-width="3"/><rect x="8" y="26" width="48" height="12" fill="#f6dcc4" stroke="${WARM}" stroke-width="2"/><path d="M10 32 l4 -4 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 8 l4 -8 l4 4" stroke="${WARM}" stroke-width="1.6"/><path d="M12 38 V58 M52 38 V58" stroke="${MUTED}"/><path d="M4 58 H60" stroke="${MUTED}"/>`),
    bath_heater: () => PIC.q4["浴室暖房乾燥機がある"](),
    bathroom_renovation: () => unitBath(),
    wall_ceiling_insulation: () => house0(`<path d="M16 31 l4 -4 l4 6 l4 -6 l4 6 l4 -6 l4 6 l4 -6 l4 4" stroke="${WARM}" stroke-width="2"/>`),
    aircon_heating: () => PIC.q7["エアコン"](),
    ventilation: () => svg(`<circle cx="32" cy="32" r="22" fill="${PAPER}"/><circle cx="32" cy="32" r="4"/><path d="M32 28 q-2 -12 8 -14 q2 10 -8 14 M35 34 q12 0 14 9 q-10 3 -14 -9 M29 34 q-6 10 -15 6 q2 -10 15 -6" fill="#eef3f7" stroke-width="2"/>`),
  };
  const SIZE_N = { small: 1, medium: 2, large: 3 };
  const size = (s) => (SIZE_N[s] ? meter(SIZE_N[s]).replace('class="strip"', 'class="mini"') : "");

  const logo = () => `<svg class="logo" viewBox="0 0 96 96" aria-hidden="true"><path d="M48 18 L18 46 H28 V76 H68 V46 H78 Z" fill="none" stroke="${WARM}" stroke-width="7" stroke-linejoin="round"/><path d="M40 72 C40 60 56 58 56 46 C56 40 52 36 48 34 C50 42 44 46 42 50 C38 56 38 62 40 72 Z" fill="${WARM}"/></svg>`;

  // ---------- the scan while Claude reads the photos ----------
  const CAPTIONS = {
    ask: ["サッシの材質とガラス", "浴室の種類", "暖房器具", "結露やカビの跡", "床・壁・天井の仕上げ", "間取りと、寒い場所までの道筋"],
    diagnose: ["原因を絞っています", "改修案を並べています", "暮らしの言葉に直しています"],
  };
  function scan(previews = [], kind = "ask") {
    const caps = CAPTIONS[kind] || CAPTIONS.ask;
    const inner = previews.length
      ? previews.map((src, k) => `<img src="${src}" alt="" class="${k === 0 ? "on" : ""}">`).join("")
      : `<div class="scan-house">${house({ mode: "plain" })}</div>`;
    return `<div class="scan" data-kind="${kind}"><div class="scan-frame ${previews.length ? "photo" : "paper"}">${inner}<div class="scan-grid"></div><div class="scan-line"></div><i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i></div>
      <p class="scan-cap"><span class="tag">${kind === "ask" ? "見ているところ" : "いまの作業"}</span><b>${caps[0]}</b></p></div>`;
  }
  // Rotates the photos and the caption; stops by itself once the screen is replaced.
  function startScan(root) {
    const el = root.querySelector(".scan");
    if (!el) return;
    const caps = CAPTIONS[el.dataset.kind] || CAPTIONS.ask;
    const imgs = [...el.querySelectorAll(".scan-frame img")];
    const cap = el.querySelector(".scan-cap b");
    let n = 0;
    const id = setInterval(() => {
      if (!document.body.contains(el)) return clearInterval(id);
      n++;
      if (imgs.length > 1) imgs.forEach((im, k) => im.classList.toggle("on", k === n % imgs.length));
      if (cap) cap.textContent = caps[n % caps.length];
    }, 2600);
  }

  const planColors = { route: "#d85a30", warm: "#e38a2a", cold: "#b4321e" };
  window.NUKUMORI_ART_B = { look: "b", planColors, house, pic, layout, slot: (k) => (SLOT[k] ? SLOT[k]() : ""), step: (k) => STEP[k](), proposal: (id) => (PROP[id] ? PROP[id]().replace('class="pic"', 'class="pic prop"') : ""), size, logo, scan, startScan };
})();
