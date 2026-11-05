// nukumori: screen flow S0-S8 (docs/SCREENS.md). Plain JS, no build step.
(() => {
  const R = window.NUKUMORI_RULES;
  const CFG = window.NUKUMORI_CONFIG;
  // Two looks while the final one is chosen (2026-11-05): A (art.js, style.css) drawn like an architect's
  // sheet, B (art-b.js, style-b.css) soft. The switch at the bottom right changes it; ?look=a|b and
  // localStorage keep it. Questions, logic and words are shared; only the drawings and the styles differ.
  const LOOKS = { a: window.NUKUMORI_ART, b: window.NUKUMORI_ART_B };
  let look = "a";
  let A = LOOKS.a; // the drawings of the current look
  const $screen = document.getElementById("screen");
  const $bar = document.getElementById("bar");
  const $back = document.getElementById("back");
  const $progress = document.getElementById("progress");
  const $foot = document.getElementById("foot");
  const STORE = "nukumori:last";

  const state = {
    words: "", place: "", placeId: "", time: "",
    photos: {}, // slot -> { label, media_type, data (base64), preview }
    answers: {}, qIndex: 0,
    ask: null, askKey: "", askFailed: false, inferred: {}, // Claude's pick of questions (/ask)
    previous: null, confirmed: null, // re-diagnosis after the family checked things at the house
    result: null, model: "", ruleResult: null, error: null,
  };
  const FRESH = { words: "", place: "", placeId: "", time: "", photos: {}, answers: {}, qIndex: 0, ask: null, askKey: "", askFailed: false, inferred: {}, sent: null, previous: null, confirmed: null, result: null, error: null };
  let screen = "S0";
  let backTarget = null;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function render(html, { back = null, progress = "", foot = false, bar = null } = {}) {
    $screen.innerHTML = html;
    backTarget = back;
    $back.hidden = !back;
    $progress.textContent = progress;
    $progress.hidden = !progress;
    $foot.hidden = !foot;
    if ($bar) { $bar.hidden = bar === null; $bar.firstElementChild.style.width = `${Math.round((bar || 0) * 100)}%`; }
    $screen.classList.remove("enter"); void $screen.offsetWidth; $screen.classList.add("enter"); // B slides screens in; A has no rule for it
    window.scrollTo(0, 0);
  }
  const on = (sel, ev, fn) => $screen.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  $back.addEventListener("click", () => backTarget && backTarget());

  function setLook(k, redraw) {
    look = LOOKS[k] ? k : "a";
    A = LOOKS[look];
    document.getElementById("css-a").disabled = look !== "a";
    document.getElementById("css-b").disabled = look !== "b";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = look === "b" ? "#f6efe6" : "#f7f6f2";
    try { localStorage.setItem("nukumori:look", look); } catch {}
    document.querySelectorAll("#look button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.look === look)));
    // Redraw the screen in the new look, except while waiting for Claude or while typing what was checked.
    const again = { S0, S1, S2, S3, SLook, S5, S6, S7, S8 }[screen];
    if (redraw && again) again();
  }
  document.querySelectorAll("#look button").forEach((b) => b.addEventListener("click", () => setLook(b.dataset.look, true)));

  // Photos come first (2026-11-04), before the resident's words, so the slots do not depend on the place.
  function slots() {
    return [
      { key: 1, label: "窓を内側から", hint: "寒い部屋の窓。サッシとガラスが写るように" },
      { key: 2, label: "部屋全体", hint: "床・壁・天井が入るように" },
      { key: 3, label: "浴室の入口と脱衣所", hint: "お風呂が寒いなら。ほかの部屋なら、その床" },
      { key: 4, label: "外観", hint: "分かれば" },
      { key: 5, label: "間取り図", hint: "手描きでよい。なければ気になるところ（結露・隙間・古い暖房器具など）" },
    ];
  }

  // ---------- S0 ----------
  function S0() {
    screen = "S0";
    let last = null;
    try { last = JSON.parse(localStorage.getItem(STORE) || "null"); } catch {}
    const lead = "家の写真を撮って入れると、建築士の目で見た今の状態が分かります。住む人の一言といくつかの質問で、寒さの原因トップ3と、まず相談したい改修案を出します。自分の家にも、離れて暮らす家族の家にも使えます。";
    const steps = [["写真を撮る", "photo"], ["一言と質問", "words"], ["原因と改修案", "result"]];
    const notes = [
      "一戸建ての持ち家向けです。マンションや借りている家でも使えますが、窓や外壁の工事は管理組合や大家さんへの相談が先になります。",
      "目安であり、現地調査に代わるものではありません。写真と回答はサーバーに保存しません。",
      "10の事例を作者（一級建築士）の判断と照らし、10件とも原因と最初の案が一致しました。",
    ];
    const buttons = `<button class="btn" id="start">はじめる</button>
      ${last ? `<button class="btn secondary" id="last">前回の結果を見る（${esc(last.savedAt || "")}）</button>` : ""}`;
    render(look === "b" ? `
      <div class="hero">${A.house({ mode: "cover" })}</div>
      <h1 class="title">その一言から、家の寒さを建築士の目で診る</h1>
      <p class="lead">${lead}</p>
      <div class="steps">${steps.map(([s, k], i) => `<div>${A.step(k)}<span class="n">${i + 1}</span>${s}</div>`).join("")}</div>
      ${notes.map((n) => `<p class="small muted">${n}</p>`).join("")}
      ${buttons}
    ` : `
      <h1 class="title">その一言から、<br>家の寒さを<br>建築士の目で診る</h1>
      <div class="frame">${A.house({ mode: "cover" })}</div>
      <div class="caption"><span class="lbl">SECTION</span><span class="lbl">断面図・模式</span></div>
      <p class="lead">${lead}</p>
      <div class="steps">${steps.map(([s], i) => `<div><span class="num">0${i + 1}</span><span class="s">${s}</span></div>`).join("")}</div>
      ${buttons}
      <div class="notes">${notes.map((n) => `<p>${n}</p>`).join("")}</div>
    `);
    on("#start", "click", () => { Object.assign(state, FRESH, { photos: {}, answers: {}, inferred: {} }); S2(); });
    on("#last", "click", () => { Object.assign(state, last.state); state.result = last.result; state.model = last.model; S5(); });
  }

  // ---------- S1 ----------
  function S1() {
    screen = "S1";
    render(`
      <h1>この家に住む人は、なんて言っていますか</h1>
      <p class="small muted">あなた自身の言葉でも、家族から聞いた一言でも大丈夫です。写真は受け取りました。どこが寒いかを聞いてから、建築士の目で見ます。</p>
      <textarea id="words" placeholder="例：お風呂場がさむいんだよぉ">${esc(state.words)}</textarea>
      <p class="small muted">よくある一言（押すと入ります）</p>
      <div class="chips">
        ${["お風呂場が寒い", "脱衣所で着替えるのがつらい", "朝、台所が冷蔵庫みたい", "寝室が寒くて眠れない", "こたつから出られない", "廊下とトイレが寒い", "家じゅう寒い"].map((t) => `<button class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join("")}
      </div>
      <button class="btn" id="next" ${state.words.trim() ? "" : "disabled"}>次へ</button>
    `, { back: S2 });
    const $w = $screen.querySelector("#words");
    const $n = $screen.querySelector("#next");
    $w.addEventListener("input", () => { state.words = $w.value; $n.disabled = !state.words.trim(); });
    on(".chip", "click", (e) => { $w.value = (($w.value.trim() ? $w.value.trim() + "。" : "") + e.currentTarget.dataset.t); state.words = $w.value; $n.disabled = false; });
    $n.addEventListener("click", () => { Object.assign(state, R.detect(state.words)); state.qIndex = 0; S3(); });
  }

  // ---------- S2 ----------
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((ok, ng) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ng; i.src = url; });
      const max = CFG.photoMaxEdge;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/jpeg", CFG.photoQuality); // re-encoded: no EXIF, no location
      return { media_type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl, w, h };
    } finally { URL.revokeObjectURL(url); }
  }
  function S2() {
    screen = "S2";
    const list = slots();
    render(`
      <h1>まず、実家の写真を撮ってください</h1>
      <p class="muted">建築士が写真と間取り図を見てから、聞くことを決めます。なくても進めますが、あるほど原因が絞れます。</p>
      <div class="photo-slots">
        ${list.map((s) => {
          const p = state.photos[s.key];
          return `<div class="slot" data-k="${s.key}">
            ${p ? `<img src="${p.preview}" alt="">` : `<div class="empty">${A.slot(s.key)}</div>`}
            <div><b>${esc(s.label)}</b><div class="small muted">${esc(s.hint)}</div>${p ? `<button class="link small" data-del="${s.key}">外す</button>` : ""}</div>
            <label class="btn secondary">${p ? "撮り直す" : "撮る・選ぶ"}<input type="file" accept="image/*" data-k="${s.key}"></label>
          </div>`;
        }).join("")}
      </div>
      <div class="notice small">送る前に：顔・表札・書類・図面の住所が写っていませんか。写っていれば外すか撮り直してください。写真は端末で小さくしてから送り、位置情報は付けません。</div>
      <button class="btn" id="next">${Object.keys(state.photos).length ? "次へ" : "写真なしで進む"}</button>
    `, { back: S0 });
    on("input[type=file]", "change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const k = e.target.dataset.k;
      const label = list.find((s) => String(s.key) === k).label;
      try { state.photos[k] = { label, ...(await shrink(f)) }; } catch { alert("この写真は読み込めませんでした。別の写真を選んでください。"); }
      S2();
    });
    on("[data-del]", "click", (e) => { delete state.photos[e.currentTarget.dataset.del]; S2(); });
    on("#next", "click", S1);
  }

  // ---------- S3 questions: the fixed three, then the ones Claude picked ----------
  const nFixed = R.FIXED.length;
  function qList() {
    if (state.ask) return [...R.FIXED, ...state.ask.questions.map((q) => q.id)];
    return state.askFailed ? R.order(state.placeId) : R.FIXED;
  }
  function S3() {
    screen = "S3";
    const list = qList();
    if (state.qIndex >= list.length) return state.ask || state.askFailed ? S4() : SAsk();
    const qid = list[state.qIndex];
    const q = R.QUESTIONS[qid];
    const picked = state.ask && state.qIndex >= nFixed ? state.ask.questions[state.qIndex - nFixed] : null;
    const progress = state.qIndex < nFixed ? `はじめの質問 ${state.qIndex + 1} / ${nFixed}` : `${state.ask ? "写真を見ての質問" : "質問"} ${state.qIndex - nFixed + 1} / ${list.length - nFixed}`;
    const bar = state.qIndex < nFixed ? (state.qIndex + 1) / nFixed : (state.qIndex - nFixed + 1) / Math.max(1, list.length - nFixed);
    // Answers with a picture are tiles (or a strip beside the words); "分からない" stays a plain wide button.
    const lay = A.layout(qid);
    const choice = (o) => {
      const pic = lay === "list" ? "" : A.pic(qid, o);
      const kind = lay === "tiles" ? (pic ? "tile" : "tile wide") : lay === "rows" ? "row" : "";
      const lead = lay === "rows" ? pic || `<span class="sp"></span>` : pic;
      return `<button class="choice ${kind} ${state.answers[qid] === o ? "on" : ""}" data-o="${esc(o)}">${lead}<span>${esc(o)}</span></button>`;
    };
    render(`
      <h1>${esc(q.text)}</h1>
      ${picked ? `<p class="small"><span class="tag">建築士が聞く理由</span>${esc(picked.why)}</p>` : q.note ? `<p class="small muted">${esc(q.note)}</p>` : ""}
      <div class="choices ${lay}">${q.options.map(choice).join("")}</div>
    `, { back: () => { if (state.qIndex === 0) S1(); else if (state.ask && state.qIndex === nFixed) SLook(); else { state.qIndex--; S3(); } }, progress, bar });
    on(".choice", "click", (e) => { state.answers[qid] = e.currentTarget.dataset.o; state.qIndex++; S3(); });
  }

  // Photos in the order they are sent; both calls must send them identically (prompt cache).
  function sentPhotos() {
    state.sent = Object.keys(state.photos).sort(); // photo n in the result = slot state.sent[n-1]
    return state.sent.map((k) => ({ label: state.photos[k].label, media_type: state.photos[k].media_type, data: state.photos[k].data }));
  }
  function fixedAnswers() { return Object.fromEntries(R.FIXED.map((q) => [q, state.answers[q] || ""])); }
  function baseBody() { return { parent_words: state.words, place: state.place, time_of_day: state.time, fixed: fixedAnswers(), photos: sentPhotos() }; }

  // ---------- S3a Claude reads the photos and picks 2-3 questions (/ask) ----------
  async function SAsk() {
    screen = "SAsk";
    const key = JSON.stringify([state.words, fixedAnswers(), Object.keys(state.photos).sort(), Object.values(state.photos).map((p) => p.data.length)]);
    if (state.ask && state.askKey === key) return SLook();
    state.ask = null; state.inferred = {};
    render(`
      <h1>建築士が、写真と間取り図を見ています</h1>
      ${A.scan(previews(), "ask")}
      <p class="muted">見てから、あと2〜3問だけ聞きます。20秒ほどかかります。</p>
    `, { back: () => { state.qIndex = nFixed - 1; S3(); } });
    A.startScan($screen);
    try {
      const res = await fetch(CFG.apiBase + "/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(baseBody()) });
      const json = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
      if (!res.ok || !json.ok) throw new Error(json.error || res.status);
      const x = json.result;
      const seen = new Set();
      const questions = (x.questions || []).filter((q) => R.QUESTIONS[q.id] && !R.FIXED.includes(q.id) && !seen.has(q.id) && seen.add(q.id)).slice(0, 3);
      const inferred = {};
      (x.inferred || []).forEach((i) => { if (R.QUESTIONS[i.id] && !seen.has(i.id) && R.QUESTIONS[i.id].options.includes(i.value) && i.value !== R.UNKNOWN) inferred[i.id] = { value: i.value, basis: i.basis }; });
      const nPhotos = (state.sent || []).length;
      const photo_notes = (x.photo_notes || []).filter((n) => n.photo >= 1 && n.photo <= nPhotos);
      state.ask = { first_look: x.first_look || "", photo_notes, floor_plan: cleanPlan(x.floor_plan, nPhotos), questions, inferred: Object.entries(inferred).map(([id, v]) => ({ id, ...v })) };
      state.inferred = inferred; state.askKey = key; state.askFailed = false;
      SLook();
    } catch (e) {
      // Fall back to asking every question in the fixed order.
      state.askFailed = true; state.qIndex = nFixed; S3();
    }
  }

  // Keep only points that sit on the floor-plan photo (0-1000 on both axes).
  function cleanPlan(fp, nPhotos) {
    if (!fp || !(fp.photo >= 1 && fp.photo <= nPhotos)) return null;
    const ok = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 1000;
    const rooms = (fp.rooms || []).filter(ok).slice(0, 8);
    const cold_route = (fp.cold_route || []).filter(ok).slice(0, 6);
    const cold_points = (fp.cold_points || []).filter(ok).slice(0, 3);
    if (!rooms.length && !cold_route.length && !cold_points.length) return null;
    return { photo: fp.photo, rooms, warm_room: fp.warm_room || "", cold_route, cold_points, note: fp.note || "" };
  }

  // The floor-plan photo with rooms, the warm room, the route to the cold place and the cold spots drawn on it.
  function planHtml() {
    const fp = state.ask && state.ask.floor_plan;
    const p = fp && state.photos[(state.sent || [])[fp.photo - 1]];
    if (!fp || !p) return "";
    // Claude's points are 0-1000 on both axes; the viewBox keeps the photo's aspect ratio so text is not squashed.
    const H = p.w && p.h ? Math.round(1000 * p.h / p.w) : 1000;
    const k = H / 1000;
    const Y = (q) => Math.round(q.y * k);
    const pt = (q) => `${q.x},${Y(q)}`;
    // Room names are already on the drawing, so only the warm room is labelled; cold spots get numbered badges
    // and are listed below the plan (text on a small photo would collide).
    const route = fp.cold_route.length >= 2 ? `<polyline points="${fp.cold_route.map(pt).join(" ")}" fill="none" stroke="${A.planColors.route}" stroke-width="3" stroke-dasharray="10 7" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : "";
    const warm = fp.rooms.find((r) => r.name === fp.warm_room) || (fp.cold_route.length ? { ...fp.cold_route[0], name: fp.warm_room } : null);
    const warmMark = warm ? `<circle cx="${warm.x}" cy="${Y(warm)}" r="9" fill="${A.planColors.warm}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/><text class="warm" x="${warm.x}" y="${Y(warm) + 22}" text-anchor="middle" dominant-baseline="hanging">${esc(warm.name || "暖房")}</text>` : "";
    const cold = fp.cold_points.map((c, i) => `<circle cx="${c.x}" cy="${Y(c)}" r="16" fill="${A.planColors.cold}" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/><text class="num" x="${c.x}" y="${Y(c)}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`).join("");
    return `<div class="plan"><img src="${p.preview}" alt="間取り図"><svg viewBox="0 0 1000 ${H}">${route}${warmMark}${cold}</svg></div>
      <p class="legend"><span><i></i>${esc(fp.warm_room || "暖かい部屋")}から${esc(x_place())}までの経路</span></p>
      ${fp.cold_points.map((c, i) => `<p class="small"><span class="rank">${i + 1}</span><b>${esc(c.name)}</b>：${esc(c.why)}</p>`).join("")}
      ${fp.note ? `<p class="small muted">${esc(fp.note)}</p>` : ""}`;
  }
  function x_place() { return (state.result && state.result.place) || state.place || "寒い場所"; }

  function SLook() {
    screen = "SLook";
    const a = state.ask;
    const inf = a.inferred;
    const notes = a.photo_notes || [];
    render(`
      <h1>写真と答えから、見えたこと</h1>
      <div class="card"><p class="lead">${esc(a.first_look)}</p></div>
      ${planHtml() ? `<h3>間取り図に、寒さの道筋を重ねました</h3>${planHtml()}` : ""}
      ${notes.length ? `<h3>写真ごとに見たこと</h3>${notes.map((n) => `<div class="card">${photoThumb(n.photo)}<span class="tag">写真${n.photo}：${esc(photoLabel(n.photo))}</span><p class="small">${esc(n.note)}</p></div>`).join("")}` : ""}
      ${inf.length ? `<h3>写真から読み取ったこと（答えなくて大丈夫です）</h3>${inf.map((i) => `<div class="card small"><b>${esc(R.QUESTIONS[i.id].text)}</b>：${esc(i.value)}<p class="muted">${esc(i.basis)}</p></div>`).join("")}` : ""}
      <button class="btn" id="next">${a.questions.length ? `あと${a.questions.length}問、聞かせてください` : "診断する"}</button>
    `, { back: () => { state.qIndex = nFixed - 1; S3(); } });
    on("#next", "click", () => { state.qIndex = nFixed; S3(); });
  }

  // ---------- S4 ----------
  async function S4() {
    screen = "S4";
    render(`
      <h1>${state.previous ? "確かめてきたことで、見立てを更新しています" : "建築士の目で見ています"}</h1>
      ${A.scan(previews(), "diagnose")}
      <p class="muted">写真と答えを読んでいます。30秒ほどかかります。</p>
    `, { back: () => { state.qIndex = qList().length - 1; S3(); } });
    A.startScan($screen);
    const asked = qList();
    const answers = Object.fromEntries(asked.filter((q) => state.answers[q]).map((q) => [q, state.answers[q]]));
    const inferredIds = Object.keys(state.inferred).filter((q) => !answers[q]);
    inferredIds.forEach((q) => (answers[q] = state.inferred[q].value));
    state.ruleResult = R.run(answers, state.placeId, inferredIds);
    const body = { ...baseBody(), answers, inferred_from_photos: inferredIds, ask: state.ask, rule_result: state.ruleResult };
    if (state.previous && state.confirmed) { body.previous = state.previous; body.confirmed = state.confirmed; }
    try {
      const res = await fetch(CFG.apiBase + "/diagnose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
      if (!res.ok || !json.ok) throw new Error(json.error || res.status);
      state.result = json.result; state.model = json.model; state.error = null;
      save();
      S5();
    } catch (e) {
      state.error = String(e.message || e);
      render(`
        <h1>うまくいきませんでした</h1>
        <p class="muted">回答と写真はそのまま残っています。（${esc(state.error)}）</p>
        <button class="btn" id="retry">もう一度試す</button>
        <button class="btn secondary" id="edit">答えを見直す</button>
      `, { back: () => S3() });
      on("#retry", "click", S4);
      on("#edit", "click", () => { state.qIndex = 0; S3(); });
    }
  }

  // ---------- results ----------
  const r = () => state.result;
  function photoThumb(n) { const p = state.photos[(state.sent || [])[n - 1]]; return p ? `<img class="thumb" src="${p.preview}" alt="写真${n}">` : ""; }
  function photoLabel(n) { const p = state.photos[(state.sent || [])[n - 1]]; return p ? p.label : `写真${n}`; }
  const previews = () => Object.keys(state.photos).sort().map((k) => state.photos[k].preview);
  // The top causes as numbers on a house section, so "where the cold comes from" is seen before it is read.
  function causeHouse(x) {
    const marks = (x.causes || []).map((c) => ({ id: c.id, rank: c.rank }));
    return look === "b"
      ? `<div class="house-wrap">${A.house({ mode: "result", marks })}</div><p class="house-cap">番号は下の原因の順位です。家のどこから冷えるかを、断面の模式図に置きました。</p>`
      : `<div class="frame">${A.house({ mode: "result", marks })}</div><div class="caption"><span class="lbl">SECTION</span><span class="lbl">番号は下の原因の順位</span></div>`;
  }

  // A re-diagnosis lists what changed, and also an important point that stayed the same (before equals
  // after, worker/prompt.js). Changed points come first with 前回/今回; unchanged ones say 変わらず.
  const sameText = (a, b) => String(a || "").replace(/\s|。$/g, "") === String(b || "").replace(/\s|。$/g, "");
  function changesHtml(list) {
    const moved = list.filter((c) => !sameText(c.before, c.after)), kept = list.filter((c) => sameText(c.before, c.after));
    return `<h1>${moved.length ? "確かめてきたことで、ここが変わりました" : "確かめてきましたが、見立ては変わりませんでした"}</h1>
      ${moved.map((c) => `<div class="card first"><b>${esc(c.what)}</b><p class="small"><span class="tag">前回</span>${esc(c.before)}</p><p class="small"><span class="tag strong">今回</span>${esc(c.after)}</p><p class="small muted">${esc(c.why)}</p></div>`).join("")}
      ${kept.map((c) => `<div class="card"><b>${esc(c.what)}</b><p class="small"><span class="tag">変わらず</span>${esc(c.after)}</p><p class="small muted">${esc(c.why)}</p></div>`).join("")}`;
  }

  function S5() {
    screen = "S5";
    const x = r();
    render(`
      ${x.changes && x.changes.length ? `${changesHtml(x.changes)}
      <h2>${esc(x.place || state.place || "その場所")}が寒い、いちばんの原因は</h2>` : `<h1>${esc(x.place || state.place || "その場所")}が寒い、いちばんの原因は</h1>`}
      ${causeHouse(x)}
      ${x.causes.map((c) => `<div class="card"><span class="rank">${c.rank}</span><b>${esc(c.name)}</b> <span class="tag ${c.confidence === "almost_certain" ? "strong" : ""}">${esc(R.CONF_LABEL[c.confidence] || c.confidence)}</span><p>${esc(c.reason)}</p></div>`).join("")}
      ${planHtml() ? `<h2>間取り図で見ると</h2>${planHtml()}` : ""}
      ${x.photo_findings.length ? `<h2>写真で見つけたこと</h2>${x.photo_findings.map((f) => `<div class="card">${photoThumb(f.photo)}<span class="tag">写真${f.photo}：${esc(photoLabel(f.photo))}</span><p>${esc(f.note)}</p></div>`).join("")}` : ""}
      <div class="society">この家だけの話ではありません。国の推計では、今の断熱の基準を満たす家は約18％、無断熱の家は約24％です（住宅約5,400万戸。令和4年度時点の推計）。</div>
      <button class="btn" id="next">どう直す？</button>
    `, { back: S0, foot: true });
    on("#next", "click", S6);
  }

  // Heat-shock stages from the CASBEE home renovation checklist (2015-07-29, item 1-(7), p.7).
  // Decided on the device from the answers; Claude is not asked.
  function heatShockStages() {
    const a = state.answers, inf = state.inferred || {};
    const q4 = a.q4 || (inf.q4 && inf.q4.value) || "";
    const q8 = a.q8 || "";
    const l2 = q4 === "浴室暖房乾燥機がある" || q4 === "持ち運びのヒーターを使う" ? "done" : q4 === "ない" ? "now" : "check";
    const l3 = l2 === "done" ? (q8 === "お風呂を直した（ユニットバス化など）" ? "check" : "now") : "next";
    const l4 = l3 === "now" || l3 === "check" ? "next" : "later";
    const label = { done: "済んでいる", now: "今ここ", next: "そのあと", later: "さらに先", check: "要確認" };
    return [
      { n: 2, text: "脱衣所に暖房を置ける（置いてある、または置く場所とコンセントがある。浴室に暖房があるときも同じ）", s: l2 },
      { n: 3, text: "それに加えて、浴室と脱衣所の外に接する壁・床・天井を断熱する", s: l3 },
      { n: 4, text: "それに加えて、居間や寝室から浴室までの通り道とトイレも、断熱した区画の中に入れる", s: l4 },
    ].map((x) => ({ ...x, label: label[x.s] }));
  }

  function S6() {
    screen = "S6";
    const x = r();
    const bathStages = state.ruleResult && state.ruleResult.heat_shock_level !== "none" ? heatShockStages() : null;
    render(`
      <h1>まず相談するなら、これ</h1>
      ${x.today_actions && x.today_actions.length ? `<h3>今日からできること（工事なし）</h3>${x.today_actions.map((a) => `<div class="card"><b>${esc(a.name)}</b><p>${esc(a.description)}</p></div>`).join("")}` : ""}
      <h3>工務店に相談する改修案（優先順）</h3>
      ${x.proposals.map((p) => `<div class="card ${p.first_choice ? "first" : ""}">${A.proposal(p.id)}<span class="rank">${p.rank}</span><b>${esc(p.name)}</b>${p.first_choice ? ` <span class="tag strong">まず相談するならこれ</span>` : ""}
        <p>${esc(p.description)}</p>
        <p class="small"><b>期待できる変化：</b>${esc(p.expected_change)}</p>
        <p class="small"><span class="tag">${A.size(p.work_size)}工事の大きさ：${esc(R.WORK_LABEL[p.work_size] || p.work_size)}</span><span class="tag">${esc(R.SUBSIDY_LABEL[p.subsidy] || p.subsidy)}</span></p>
        <p class="small muted">なぜこの順位か：${esc(p.why_this_rank)}</p></div>`).join("")}
      ${bathStages ? `<h3>お風呂の寒さ対策は、この順で進みます</h3>
      ${bathStages.map((s) => `<div class="card ${s.s === "now" ? "first" : ""}"><span class="tag ${s.s === "now" ? "strong" : ""}">${esc(s.label)}</span><b>段階${s.n}</b><p class="small">${esc(s.text)}</p></div>`).join("")}
      <p class="small muted">段階は「CASBEE すまい改修チェックリスト」（2015年7月29日発行）のヒートショックの項目にもとづきます。「今ここ」はこの家の答えから当てはめたもので、断熱の有無は現地で確かめてください。</p>` : ""}
      <p class="small muted">補助制度は年度ごとに内容が変わります。最新は国の「住宅省エネ2026キャンペーン」の公式サイトと自治体の窓口で確認してください。費用の金額はここでは出しません。工務店の見積りで確かめてください。</p>
      ${x.rule_overrides && x.rule_overrides.length ? `<details class="small"><summary class="muted">建築士のルールから変えたところ</summary><ul>${x.rule_overrides.map((o) => `<li>${esc(o.what)} — ${esc(o.why)}</li>`).join("")}</ul></details>` : ""}
      <button class="btn" id="next">確認してほしいこと</button>
    `, { back: S5, foot: true });
    on("#next", "click", S7);
  }

  function S7() {
    screen = "S7";
    const x = r();
    const bath = state.placeId === "bath" || (state.ruleResult && state.ruleResult.heat_shock_level !== "none");
    render(`
      <h1>次に家を見るとき、確かめてほしいこと</h1>
      <ul>${x.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <h2>家族への一言</h2>
      <div class="card"><p class="lead">${esc(x.message_to_parent)}</p><button class="link small" id="copyMsg">この一言をコピー</button></div>
      ${bath ? `<div class="notice"><b>お風呂の寒さは、冬の事故につながります。</b><p class="small">消費者庁の注意喚起：入浴前に脱衣所や浴室を暖める。湯温は41度以下、湯につかるのは10分までを目安に。浴槽から急に立ち上がらない。入浴前に家族に声をかける。<a href="https://www.caa.go.jp/policies/policy/consumer_safety/caution/caution_009/" target="_blank" rel="noopener">消費者庁のページ</a></p><p class="small muted">気になる症状があれば医師に相談してください。</p></div>` : ""}
      <button class="btn secondary" id="confirm">確かめてきたので、診断し直す</button>
      <button class="btn" id="next">保存・共有</button>
    `, { back: S6, foot: true });
    on("#copyMsg", "click", () => copy(x.message_to_parent, "#copyMsg"));
    on("#confirm", "click", SConfirm);
    on("#next", "click", S8);
  }

  // ---------- S7b: the family checked things at the house; diagnose again ----------
  // The previous result is sent as a short summary so Claude updates it instead of starting over.
  function previousSummary() {
    const x = r();
    return {
      causes: x.causes.map((c) => ({ rank: c.rank, id: c.id, name: c.name, confidence: c.confidence })),
      proposals: x.proposals.map((p) => ({ rank: p.rank, id: p.id, name: p.name, first_choice: p.first_choice })),
      checks: x.checks,
      photo_findings: x.photo_findings,
      today_actions: (x.today_actions || []).map((a) => a.name),
    };
  }
  function SConfirm() {
    screen = "SConfirm";
    const x = r();
    render(`
      <h1>家で、確かめてきたこと</h1>
      <p class="muted">見てきたことを、ひとつずつ書いてください。まだのものは空のままで大丈夫です。建築士が見立てを更新します。</p>
      ${x.checks.map((c, i) => `<div class="card"><p class="small">${esc(c)}</p><textarea class="confirm" data-i="${i}" rows="2" placeholder="見たこと・分かったこと（例：断熱材は見えなかった）"></textarea></div>`).join("")}
      <button class="btn" id="go" disabled>この内容で診断し直す</button>
    `, { back: S7, foot: true });
    const $go = $screen.querySelector("#go");
    const answers = () => Array.from($screen.querySelectorAll(".confirm")).map((t) => ({ check: x.checks[t.dataset.i], answer: t.value.trim() || "まだ" }));
    on(".confirm", "input", () => { $go.disabled = !answers().some((a) => a.answer !== "まだ"); });
    $go.addEventListener("click", () => {
      state.previous = previousSummary();
      state.confirmed = answers();
      if (!state.ask) state.ask = null;
      S4();
    });
  }

  function sheetText() {
    const x = r();
    const a = state.answers;
    const lines = [];
    lines.push("工務店に見せる相談シート（nukumori で作成）", "家族が確かめたことと、AI の見立て（目安）を分けて書いています。見立ては現地調査に代わるものではなく、工事の内容と費用は現地を見たうえでの見積りで決めてください。", "");
    lines.push("■ 困っていること", `住む人の一言：「${state.words}」`, `場所・時間帯：${x.place || state.place || "未記入"}${state.time ? "・" + state.time : ""}`, "");
    lines.push("■ 家族が優先したいこと", `・工事の大きさ：${a.q9 || "未回答"}`);
    if (a.q10) lines.push(`・寒さのほかに直したいところ：${a.q10}`);
    lines.push("");
    lines.push("■ 家族が確認したこと（質問の答え）");
    qList().filter((q) => q !== "q9" && q !== "q10").forEach((q) => lines.push(`・${R.QUESTIONS[q].text}：${a[q] || "未回答"}`));
    Object.entries(state.inferred || {}).filter(([q]) => !a[q]).forEach(([q, v]) => lines.push(`・${R.QUESTIONS[q].text}：${v.value}（写真からの AI の推定。要確認）`));
    lines.push("", "■ AI の見立て（目安。写真と答えからの推測で、現地では違うことがあります）");
    lines.push("＜写真から読み取ったこと＞");
    x.photo_findings.forEach((f) => lines.push(`・写真${f.photo}：${f.note}`));
    if (!x.photo_findings.length) lines.push("・写真なし");
    lines.push("＜寒さの原因の見立て＞");
    x.causes.forEach((c) => lines.push(`${c.rank}. ${c.name}（${R.CONF_LABEL[c.confidence] || c.confidence}）：${c.reason}`));
    lines.push("＜相談したい候補（優先順）＞");
    x.proposals.forEach((p) => lines.push(`${p.rank}. ${p.name}${p.first_choice ? "【まず相談】" : ""}（工事の大きさの目安：${R.WORK_LABEL[p.work_size] || p.work_size}）`));
    if (state.ruleResult && state.ruleResult.heat_shock_level !== "none") {
      lines.push("＜お風呂の寒さ対策の段階（CASBEE すまい改修チェックリストのヒートショックの項目）＞");
      heatShockStages().forEach((s) => lines.push(`・段階${s.n}［${s.label}］${s.text}`));
    }
    if (state.confirmed && state.confirmed.some((c) => c.answer !== "まだ")) {
      lines.push("", "■ 家族が家で確かめたこと");
      state.confirmed.filter((c) => c.answer !== "まだ").forEach((c) => lines.push(`・${c.check} → ${c.answer}`));
    }
    lines.push("", "■ 現地で必ず確かめてほしいこと（見立ての前提になっている部分です）");
    x.checks.forEach((c) => lines.push(`・${c}`));
    lines.push("・（どの家でも）脱衣所や浴室に暖房をつけるときは、分電盤の空き回路と容量／内窓をつけるときは、今の窓枠の奥行で取り付けられるか");
    lines.push("", "■ 見積のときに分けてほしいこと", "・工事の範囲／製品と性能／撤去・復旧／調査費／追加工事になる条件／補助制度の扱い／浴室が使えない期間／保証");
    lines.push("", "■ 補助制度について", "・国の住宅省エネ2026キャンペーン（先進的窓リノベ2026事業など）と自治体の補助が使える可能性があります。対象・金額・期限は年度で変わるので、公式サイトと窓口で最新を確かめてください。このシートには金額を書いていません");
    return lines.join("\n");
  }

  function S8() {
    screen = "S8";
    render(`
      <h1>手元に残す・伝える</h1>
      <div class="card"><b>この端末に保存しました</b><p class="small muted">最初の画面の「前回の結果を見る」から戻れます。写真は保存しません。</p></div>
      <div class="card"><b>工務店に見せる相談シート</b><p class="small muted">家族が確かめたことと、AI の推測を分けた文面です。コピーして LINE やメールに貼れます。</p>
        <button class="btn secondary" id="copySheet">相談シートをコピー</button>
        <details class="small"><summary class="muted">文面を見る</summary><div class="sheet">${esc(sheetText())}</div></details></div>
      <button class="btn secondary" id="copyAll">結果の要約をコピー</button>
      <button class="btn" id="again">もう一度診る</button>
    `, { back: S7, foot: true });
    on("#copySheet", "click", () => copy(sheetText(), "#copySheet"));
    on("#copyAll", "click", () => copy(summaryText(), "#copyAll"));
    on("#again", "click", S0);
  }

  function summaryText() {
    const x = r();
    return [`「${state.words}」の寒さ診断（nukumori）`, "", "原因トップ3：", ...x.causes.map((c) => `${c.rank}. ${c.name}（${R.CONF_LABEL[c.confidence] || ""}）`), "", "まず相談するならこれ：", ...x.proposals.filter((p) => p.first_choice).map((p) => p.name), "", "今日からできること：", ...(x.today_actions || []).map((a) => `・${a.name}`), "", `家族への一言：${x.message_to_parent}`].join("\n");
  }

  async function copy(text, sel) {
    try { await navigator.clipboard.writeText(text); const b = $screen.querySelector(sel); if (b) b.textContent = "コピーしました"; }
    catch { alert("コピーできませんでした。文面を長押しして選択してください。"); }
  }

  function save() {
    try {
      const d = new Date();
      const savedAt = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      const { photos, ...rest } = state; // never store photos
      localStorage.setItem(STORE, JSON.stringify({ savedAt, state: { ...rest, result: null }, result: state.result, model: state.model }));
    } catch {}
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  let firstLook = new URLSearchParams(location.search).get("look");
  try { firstLook = firstLook || localStorage.getItem("nukumori:look"); } catch {}
  setLook(firstLook || "a", false);
  S0();
})();
