// nukumori: drawings for the screens, drawn the way an architect draws. The house section (断面図) fills the
// cut roof, walls, floor and footings and draws everything seen beyond in thin lines. Answer and proposal
// pictures are thin ink line drawings. Orange is warmth (the heated room) and blue is cold, and both appear
// only inside the section and the floor plan. Plain SVG strings, no libraries.
(() => {
  const INK = "#1c1a18", MID = "#8f8981", TONE = "#ebe8e2", PAPER = "#ffffff", COLD = "#4f84b3";
  const svg = (inner, vb = "0 0 64 64", cls = "pic") =>
    `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  // ---------- the house section ----------
  // Where each cause sits (viewBox 0 0 360 228): the numbered callout and the cold sign drawn with it.
  const SPOT = {
    window_heat_loss: { x: 30, y: 116, cold: "window" },
    window_draft: { x: 28, y: 194, cold: "draft" },
    floor_cold: { x: 182, y: 204, cold: "floor" },
    wall_ceiling_insulation: { x: 182, y: 76, cold: "ceiling" },
    bathroom_cold: { x: 277, y: 148, cold: "bath" },
    unheated_rooms: { x: 233, y: 148, cold: "room" },
    heating_mismatch: { x: 93, y: 158, cold: "" },
    moisture: { x: 82, y: 142, cold: "drops" },
  };
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 5.5;
    return `M${x1} ${y1} L${x2} ${y2} M${x2 - h * Math.cos(a - 0.5)} ${y2 - h * Math.sin(a - 0.5)} L${x2} ${y2} L${x2 - h * Math.cos(a + 0.5)} ${y2 - h * Math.sin(a + 0.5)}`;
  };
  const flake = (x, y, r) => `M${x} ${y - r} V${y + r} M${x - r * 0.87} ${y - r / 2} L${x + r * 0.87} ${y + r / 2} M${x - r * 0.87} ${y + r / 2} L${x + r * 0.87} ${y - r / 2}`;
  // Cold comes in pairs of thin arrows, so it reads as a draught rather than a pointer.
  const COLD_SIGN = {
    window: arrow(8, 138, 48, 138) + arrow(8, 148, 48, 148),
    draft: `M8 170 H46 M8 178 H46`,
    floor: arrow(136, 212, 136, 197) + arrow(146, 212, 146, 197) + arrow(218, 212, 218, 197) + arrow(228, 212, 228, 197),
    ceiling: arrow(116, 76, 116, 100) + arrow(126, 76, 126, 100) + arrow(236, 76, 236, 100) + arrow(246, 76, 246, 100),
    bath: arrow(352, 126, 310, 126) + arrow(352, 134, 310, 134),
    room: flake(233, 172, 7),
    drops: "",
  };
  const coldPath = (k, j) => k === "drops"
    ? `<g class="cold" style="--i:${j}" fill="${COLD}"><circle cx="60" cy="132" r="1.8"/><circle cx="60" cy="143" r="1.8"/><circle cx="60" cy="154" r="1.8"/></g>`
    : `<path class="cold" style="--i:${j}" d="${COLD_SIGN[k]}" stroke="${COLD}" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"${k === "draft" ? ` stroke-dasharray="3 3"` : ""}/>`;

  function house({ mode = "cover", marks = [] } = {}) {
    let i = 0;
    const ln = (d, w = 1) => `<path class="ln" pathLength="1" style="--i:${i++}" d="${d}" stroke="${INK}" stroke-width="${w}" fill="none"/>`;
    const cut = (tag, attrs) => `<${tag} class="cut" style="--i:${i++}" fill="${INK}" ${attrs}/>`;
    const hatch = Array.from({ length: 29 }, (_, k) => `M${12 + k * 12} 216 l-6 7`).join(" ");
    const parts = [
      ln("M64 104 H296"), // ceiling
      ln("M56 122 H64 M56 164 H64 M60 122 V164"), // window in the left wall
      ln("M296 120 H304 M296 140 H304 M300 120 V140"), // bath window
      ln("M262 162 h30 v20 a6 6 0 0 1 -6 6 h-18 a6 6 0 0 1 -6 -6 Z"), // bathtub, seen beyond
      ln("M84 172 h18 v16 h-18 Z"), // heater
      ln("M6 214 H354", 1.6), // ground
      `<path class="ln" pathLength="1" style="--i:${i++}" d="${hatch}" stroke="${INK}" stroke-opacity=".5" stroke-width=".8" fill="none"/>`,
      cut("polygon", `points="22,100 180,26 338,100 326,106 180,38 34,106"`), // roof
      cut("rect", `x="56" y="104" width="8" height="18"`), cut("rect", `x="56" y="164" width="8" height="24"`), // left wall
      cut("rect", `x="296" y="104" width="8" height="16"`), cut("rect", `x="296" y="140" width="8" height="48"`), // right wall
      cut("rect", `x="212" y="104" width="4" height="36"`), cut("rect", `x="250" y="104" width="4" height="44"`), // partitions
      cut("rect", `x="52" y="188" width="256" height="6"`), // floor
      cut("rect", `x="50" y="194" width="18" height="20"`), cut("rect", `x="292" y="194" width="18" height="20"`), // footings
    ].join("");
    // The heated room is clearly orange, strongest at the heater; the rest of the house stays white.
    const warm = `<rect class="warm" x="64" y="104" width="148" height="84" fill="url(#nk-warm)"/>`;
    const defs = `<defs><radialGradient id="nk-warm" cx="93" cy="182" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e8782a" stop-opacity=".95"/><stop offset=".45" stop-color="#ef9a52" stop-opacity=".78"/><stop offset="1" stop-color="#f6c08c" stop-opacity=".6"/></radialGradient></defs>`;
    const labels = `<g class="rooms" font-size="8.5" letter-spacing="1.4" fill="#57524c" stroke="none"><text x="74" y="118">居間</text><text x="219" y="118" letter-spacing=".5">脱衣所</text><text x="262" y="134">浴室</text></g>`;
    let cold = "", callouts = "";
    if (mode === "cover") {
      cold = ["window", "floor", "room", "bath"].map((k, j) => coldPath(k, j)).join("");
    } else if (mode === "result") {
      const seen = new Set();
      marks.filter((m) => SPOT[m.id] && !seen.has(m.id) && seen.add(m.id)).forEach((m, j) => {
        const s = SPOT[m.id];
        if (s.cold) cold += coldPath(s.cold, j);
        callouts += `<g><circle cx="${s.x}" cy="${s.y}" r="10" fill="${INK}" stroke="#fff" stroke-width="2"/><text x="${s.x}" y="${s.y + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="11.5" font-weight="700" fill="#fff" stroke="none">${m.rank}</text></g>`;
      });
    }
    return `<svg class="house ${mode === "cover" ? "draw" : "static"}" viewBox="0 0 360 228" role="img" aria-label="家の断面図" stroke-linecap="square">${defs}${warm}${parts}${labels}${cold}${callouts}</svg>`;
  }

  // ---------- pictures for the answers (thin ink lines) ----------
  // A sliding window (引き違い窓). Resin or wooden frames are drawn deep, aluminium ones thin; a second
  // line inside each pane is the second sheet of glass.
  const win = ({ deep = false, double = false, inner = false, drops = "" } = {}) => {
    const pane = (x) => `<rect x="${x}" y="17" width="19" height="31" fill="${TONE}" stroke-width="1.3"/>` + (double ? `<rect x="${x + 3}" y="20" width="13" height="25" stroke-width="1"/>` : "");
    const back = `<rect x="10" y="13" width="44" height="39" fill="${PAPER}" stroke-width="${deep ? 4 : 1.6}"/>${pane(14)}${pane(31)}`;
    const front = inner ? `<rect x="5" y="22" width="40" height="36" fill="${PAPER}" fill-opacity=".75" stroke-width="3"/><path d="M25 22 V58" stroke-width="1.3"/>` : "";
    return svg(back + front + drops);
  };
  const dots = (pts) => `<g fill="${INK}" stroke="none">${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.5"/>`).join("")}</g>`;
  const house0 = (extra = "") => svg(`<path d="M10 30 L32 12 L54 30 V54 H10 Z" fill="${PAPER}"/><path d="M27 54 V39 H37 V54"/>${extra}`);
  const tileBath = (extra = "") => svg(`<path d="M8 8 H56 V38 H8 Z M16 8 V38 M24 8 V38 M32 8 V38 M40 8 V38 M48 8 V38 M8 16 H56 M8 24 H56 M8 32 H56" stroke="${MID}" stroke-width="1"/><path d="M6 38 H58 V46 a8 8 0 0 1 -8 8 H14 a8 8 0 0 1 -8 -8 Z" fill="${PAPER}"/><path d="M11 43 H53" stroke-dasharray="2 3" stroke-width="1.2"/>${extra}`);
  const unitBath = (extra = "") => svg(`<rect x="8" y="8" width="48" height="48" rx="9" fill="${PAPER}"/><rect x="25" y="12" width="14" height="7" stroke-width="1.3"/><path d="M14 36 H50 V43 a7 7 0 0 1 -7 7 H21 a7 7 0 0 1 -7 -7 Z" fill="${TONE}"/>${extra}`);
  const check = (x = 46, y = 46) => `<circle cx="${x}" cy="${y}" r="9" fill="${INK}" stroke="#fff" stroke-width="2"/><path d="M${x - 4.5} ${y} l3 3 l5.5 -6.5" stroke="#fff" stroke-width="2"/>`;
  const waves = (xs, y) => `<path d="${xs.map((x) => `M${x} ${y} q3 -4 0 -8 q-3 -4 0 -8`).join(" ")}" stroke-width="1.4"/>`;

  const PIC = {
    q0: {
      "一戸建て（持ち家）": () => house0(),
      "マンション・アパート（分譲）": () => svg(`<rect x="16" y="6" width="32" height="52" fill="${PAPER}"/>${[12, 22, 32, 42].map((y) => [21, 29, 37].map((x) => `<rect x="${x}" y="${y}" width="5" height="6" stroke-width="1.1" fill="${TONE}"/>`).join("")).join("")}<path d="M28 58 V51 H36 V58"/>`),
      "借りている家": () => house0(`<circle cx="47" cy="47" r="4.5" fill="${PAPER}"/><path d="M51.5 47 H60 M57 47 V50.5"/>`),
    },
    q8: {
      "窓を交換した・内窓をつけた": () => win({ deep: true, double: true, drops: check() }),
      "お風呂を直した（ユニットバス化など）": () => unitBath(check()),
      "どちらも直していない": () => svg(`<rect x="6" y="12" width="24" height="22" fill="${TONE}"/><path d="M18 12 V34" stroke-width="1.3"/><path d="M32 36 H60 V42 a6 6 0 0 1 -6 6 H38 a6 6 0 0 1 -6 -6 Z" fill="${PAPER}"/><path d="M8 55 H58" stroke="${MID}" stroke-dasharray="2 4"/>`),
    },
    q2: {
      "アルミ枠で1枚ガラス": () => win({}),
      "アルミ枠で2枚ガラス（複層）": () => win({ double: true }),
      "樹脂や木の枠で2枚ガラス": () => win({ deep: true, double: true }),
      "内窓がついている": () => win({ inner: true }),
    },
    q3: {
      "タイル張りの昔ながらの浴室": () => tileBath(),
      "ユニットバス（古い）": () => unitBath(),
      "ユニットバス（比較的新しい）": () => unitBath(`<path d="M51 3 V13 M46 8 H56" stroke-width="1.4"/>`),
    },
    q4: {
      "ない": () => svg(`<path d="M10 54 H54 M10 54 V12" stroke="${MID}"/><path d="${flake(34, 32, 12)}" stroke-width="1.6"/>`),
      "持ち運びのヒーターを使う": () => svg(`<rect x="18" y="26" width="28" height="26" rx="2" fill="${PAPER}"/><path d="M24 34 H40 M24 40 H40 M24 46 H40" stroke-width="1.2"/><path d="M21 52 V57 M43 52 V57"/>${waves([25, 32, 39], 22)}`),
      "浴室暖房乾燥機がある": () => svg(`<path d="M4 10 H60" stroke="${MID}"/><rect x="14" y="10" width="36" height="11" fill="${PAPER}"/><path d="M19 16 H45" stroke-width="1.2"/><path d="M22 30 q-3 4 0 8 q3 4 0 8 M32 30 q-3 4 0 8 q3 4 0 8 M42 30 q-3 4 0 8 q3 4 0 8" stroke-width="1.4"/>`),
    },
    q5: {
      "靴下でも足が冷たい": () => svg(`<path d="M18 8 H32 V34 L46 40 a6 6 0 0 1 -2 12 H24 a6 6 0 0 1 -6 -6 Z" fill="${PAPER}"/><path d="M18 14 H32" stroke-width="1.2"/><path d="${flake(51, 17, 6)}" stroke-width="1.4"/><path d="M6 58 H58" stroke="${MID}"/>`),
      "スリッパなら平気": () => svg(`<path d="M8 46 q0 -9 18 -9 h14 q16 0 16 7 q0 6 -12 6 H16 q-8 0 -8 -4 Z" fill="${PAPER}"/><path d="M24 38 q6 -10 18 -6"/><path d="M6 58 H58" stroke="${MID}"/>`),
      "気にならない": () => svg(`<path d="M18 8 H32 V34 L46 40 a6 6 0 0 1 -2 12 H24 a6 6 0 0 1 -6 -6 Z" fill="${PAPER}"/><path d="M18 14 H32" stroke-width="1.2"/>${waves([48, 55], 24)}<path d="M6 58 H58" stroke="${MID}"/>`),
    },
    q6: {
      "窓がびっしょり": () => win({ drops: dots([[19, 22], [26, 30], [20, 38], [27, 44], [36, 24], [44, 32], [37, 40], [45, 45], [23, 27], [41, 21]]) }),
      "窓の下のほうだけ": () => win({ drops: dots([[18, 44], [24, 45], [30, 43], [36, 45], [42, 44], [48, 45]]) }),
      "壁や押入れにも": () => svg(`<path d="M8 8 V56 H56" stroke="${MID}"/><rect x="14" y="8" width="38" height="44" fill="${PAPER}" stroke-width="1.3"/>${dots([[20, 16], [30, 22], [44, 18], [24, 34], [40, 30], [34, 44]])}<g fill="${MID}" stroke="none"><circle cx="18" cy="46" r="1.4"/><circle cx="22" cy="49" r="1.4"/><circle cx="16" cy="50" r="1.4"/><circle cx="46" cy="47" r="1.4"/><circle cx="49" cy="44" r="1.4"/></g>`),
      "ほとんどしない": () => win({}),
    },
    q7: {
      "エアコン": () => svg(`<rect x="8" y="12" width="48" height="17" rx="4" fill="${PAPER}"/><path d="M14 23 H50" stroke-width="1.2"/><path d="M18 35 q4 6 0 12 M32 35 q4 6 0 12 M46 35 q4 6 0 12" stroke-width="1.4"/>`),
      "石油ファンヒーターや開放型ストーブ（排気筒なし）": () => svg(`<rect x="14" y="22" width="36" height="32" rx="2" fill="${PAPER}"/><rect x="20" y="34" width="24" height="14" stroke-width="1.2" fill="${TONE}"/><path d="M32 46 c-4 -3 -4 -7 0 -10 c4 3 4 7 0 10 Z" stroke-width="1.2"/>${waves([25, 39], 18)}`),
      "FF式・煙突つきのストーブ": () => svg(`<path d="M52 4 V60" stroke="${MID}"/><rect x="8" y="28" width="30" height="26" rx="2" fill="${PAPER}"/><rect x="13" y="37" width="20" height="11" stroke-width="1.2" fill="${TONE}"/><path d="M23 28 V14 H58" stroke-width="3"/>`),
      "こたつ・電気ストーブ": () => svg(`<rect x="8" y="22" width="48" height="5" fill="${PAPER}"/><path d="M11 27 q-3 14 5 25 H48 q8 -11 5 -25" fill="${TONE}"/>${waves([25, 39], 17)}`),
      "床暖房": () => svg(`<path d="M6 34 H58" stroke-width="2.4"/><path d="M8 44 q5 -5 10 0 t10 0 t10 0 t10 0 t10 0" stroke-width="1.4"/><path d="M20 28 V17 M32 28 V17 M44 28 V17 M16.5 20.5 L20 17 L23.5 20.5 M28.5 20.5 L32 17 L35.5 20.5 M40.5 20.5 L44 17 L47.5 20.5" stroke-width="1.3"/>`),
    },
  };
  // The building era as a timeline, and the size of the work as a meter, drawn beside the answer.
  const yx = (y) => 6 + (y - 1950) * (108 / 76);
  const timeline = (from, to) => svg(`<path d="M6 12 H114" stroke="${MID}" stroke-width="1.2"/>${[1980, 2000, 2016].map((y) => `<path d="M${yx(y)} 8 V16" stroke="${MID}" stroke-width="1"/><text x="${yx(y)}" y="24.5" font-size="7" text-anchor="middle" fill="#6b655e" stroke="none">${y}</text>`).join("")}<path d="M${yx(from)} 12 H${yx(to)}" stroke-width="4" stroke-linecap="butt"/>`, "0 0 120 26", "strip");
  const meter = (n, cls = "strip") => svg([0, 1, 2].map((k) => `<rect x="${6 + k * 37}" y="7" width="32" height="12" ${k < n ? `fill="${INK}"` : `stroke="${MID}"`} stroke-width="1.2"/>`).join(""), "0 0 120 26", cls);
  const STRIP = {
    q1: { "1980年以前": () => timeline(1950, 1980), "1981〜1999年": () => timeline(1981, 1999), "2000〜2015年": () => timeline(2000, 2015), "2016年以降": () => timeline(2016, 2026) },
    q9: { "工事はしない（暮らし方の工夫だけ）": () => meter(0), "1日で終わる工事まで": () => meter(1), "数日かかる工事も考える": () => meter(2), "大きく直してもよい": () => meter(3) },
  };
  const layout = (qid) => (PIC[qid] ? "tiles" : STRIP[qid] ? "rows" : "list");
  const pic = (qid, option) => {
    const f = (PIC[qid] && PIC[qid][option]) || (STRIP[qid] && STRIP[qid][option]);
    return f ? f() : "";
  };

  // ---------- photo slots and proposals ----------
  const SLOT = {
    1: () => win({}),
    2: () => svg(`<path d="M8 8 L22 20 H42 L56 8 M22 20 V44 H42 V20 M22 44 L8 56 M42 44 L56 56"/><rect x="26" y="25" width="12" height="10" stroke-width="1.2" fill="${TONE}"/>`),
    3: () => tileBath(),
    4: () => house0(),
    5: () => svg(`<rect x="8" y="10" width="48" height="44" fill="${PAPER}"/><path d="M8 30 H28 V54 M28 30 V10 M28 38 H56" stroke-width="1.3"/><path d="M28 46 a8 8 0 0 1 8 -8" stroke-width="1"/>`),
  };
  const zigzag = (x, y, n) => `M${x} ${y} ${Array.from({ length: n }, (_, k) => `l4 ${k % 2 ? 6 : -6}`).join(" ")}`;
  const PROP = {
    inner_window: () => PIC.q2["内窓がついている"](),
    window_replace: () => PIC.q2["樹脂や木の枠で2枚ガラス"](),
    floor_insulation: () => svg(`<path d="M4 22 H60" stroke-width="2.4"/><rect x="8" y="26" width="48" height="11" fill="${PAPER}" stroke-width="1.2"/><path d="${zigzag(10, 34, 11)}" stroke-width="1.1"/><path d="M12 37 V58 M52 37 V58" stroke="${MID}"/><path d="M4 58 H60" stroke="${MID}"/>`),
    bath_heater: () => PIC.q4["浴室暖房乾燥機がある"](),
    bathroom_renovation: () => unitBath(),
    wall_ceiling_insulation: () => house0(`<path d="${zigzag(14, 33, 9)}" stroke-width="1.1"/>`),
    aircon_heating: () => PIC.q7["エアコン"](),
    ventilation: () => svg(`<circle cx="32" cy="32" r="22" fill="${PAPER}"/><circle cx="32" cy="32" r="3.5"/><path d="M32 28.5 q-2 -12 8 -14 q2 10 -8 14 M35 34 q12 0 14 9 q-10 3 -14 -9 M29 34 q-6 10 -15 6 q2 -10 15 -6" fill="${TONE}" stroke-width="1.3"/>`),
  };
  const SIZE_N = { small: 1, medium: 2, large: 3 };

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
      <p class="scan-cap"><span class="lbl">${kind === "ask" ? "見ているところ" : "いまの作業"}</span><b>${caps[0]}</b></p></div>`;
  }
  // Turns through the photos and the caption; stops by itself once the screen is replaced.
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

  window.NUKUMORI_ART = {
    house, pic, layout, scan, startScan,
    slot: (k) => (SLOT[k] ? SLOT[k]() : ""),
    proposal: (id) => (PROP[id] ? PROP[id]().replace('class="pic"', 'class="pic prop"') : ""),
    size: (s) => (SIZE_N[s] ? meter(SIZE_N[s], "mini") : ""),
  };
})();
