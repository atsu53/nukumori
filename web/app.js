// nukumori: screen flow S0-S8 (docs/SCREENS.md). Plain JS, no build step.
(() => {
  const R = window.NUKUMORI_RULES;
  const CFG = window.NUKUMORI_CONFIG;
  const $screen = document.getElementById("screen");
  const $back = document.getElementById("back");
  const $progress = document.getElementById("progress");
  const $foot = document.getElementById("foot");
  const STORE = "nukumori:last";

  const state = {
    words: "", place: "", placeId: "", time: "",
    photos: {}, // slot -> { label, media_type, data (base64), preview }
    answers: {}, qIndex: 0,
    ask: null, askKey: "", askFailed: false, inferred: {}, // Claude's pick of questions (/ask)
    result: null, model: "", ruleResult: null, error: null,
  };
  const FRESH = { words: "", place: "", placeId: "", time: "", photos: {}, answers: {}, qIndex: 0, ask: null, askKey: "", askFailed: false, inferred: {}, sent: null, result: null, error: null };
  let screen = "S0";
  let backTarget = null;

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function render(html, { back = null, progress = "", foot = false } = {}) {
    $screen.innerHTML = html;
    backTarget = back;
    $back.hidden = !back;
    $progress.textContent = progress;
    $progress.hidden = !progress;
    $foot.hidden = !foot;
    window.scrollTo(0, 0);
  }
  const on = (sel, ev, fn) => $screen.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  $back.addEventListener("click", () => backTarget && backTarget());

  function slots() {
    const bath = state.placeId === "bath";
    return [
      { key: 1, label: "窓を内側から", hint: "寒い部屋の窓。サッシとガラスが写るように" },
      { key: 2, label: "部屋全体", hint: "床・壁・天井が入るように" },
      bath ? { key: 3, label: "浴室の入口と脱衣所", hint: "脱衣所から浴室のほうを" } : { key: 3, label: "寒い部屋の床", hint: "床の仕上げが分かるように" },
      { key: 4, label: "外観", hint: "分かれば" },
      { key: 5, label: "間取り図", hint: "手描きでよい。なければ気になるところ（結露・隙間・古い暖房器具など）" },
    ];
  }

  // ---------- S0 ----------
  function S0() {
    screen = "S0";
    let last = null;
    try { last = JSON.parse(localStorage.getItem(STORE) || "null"); } catch {}
    render(`
      <h1>離れて暮らす親の家の寒さを、建築士の目で診る</h1>
      <p class="lead">親の一言から始めて、いくつかの質問と写真（なくても大丈夫）で、寒さの原因トップ3と、まず相談したい改修案を出します。</p>
      <div class="steps"><div><b>1</b>親の一言</div><div><b>2</b>写真と質問</div><div><b>3</b>原因と改修案</div></div>
      <p class="small muted">一戸建ての持ち家向けです。マンションや借りている家でも使えますが、窓や外壁の工事は管理組合や大家さんへの相談が先になります。</p>
      <p class="small muted">目安であり、現地調査に代わるものではありません。写真と回答はサーバーに保存しません。</p>
      <button class="btn" id="start">はじめる</button>
      ${last ? `<button class="btn secondary" id="last">前回の結果を見る（${esc(last.savedAt || "")}）</button>` : ""}
    `);
    on("#start", "click", () => { Object.assign(state, FRESH, { photos: {}, answers: {}, inferred: {} }); S1(); });
    on("#last", "click", () => { Object.assign(state, last.state); state.result = last.result; state.model = last.model; S5(); });
  }

  // ---------- S1 ----------
  function S1() {
    screen = "S1";
    render(`
      <h1>親御さんは、なんて言っていましたか</h1>
      <textarea id="words" placeholder="例：お風呂場がさむいんだよぉ">${esc(state.words)}</textarea>
      <p class="small muted">よくある一言（押すと入ります）</p>
      <div class="chips">
        ${["お風呂場が寒い", "脱衣所で着替えるのがつらい", "朝、台所が冷蔵庫みたい", "寝室が寒くて眠れない", "こたつから出られない", "廊下とトイレが寒い", "家じゅう寒い"].map((t) => `<button class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join("")}
      </div>
      <button class="btn" id="next" ${state.words.trim() ? "" : "disabled"}>次へ</button>
    `, { back: S0 });
    const $w = $screen.querySelector("#words");
    const $n = $screen.querySelector("#next");
    $w.addEventListener("input", () => { state.words = $w.value; $n.disabled = !state.words.trim(); });
    on(".chip", "click", (e) => { $w.value = (($w.value.trim() ? $w.value.trim() + "。" : "") + e.currentTarget.dataset.t); state.words = $w.value; $n.disabled = false; });
    $n.addEventListener("click", () => { Object.assign(state, R.detect(state.words)); S2(); });
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
      return { media_type: "image/jpeg", data: dataUrl.split(",")[1], preview: dataUrl };
    } finally { URL.revokeObjectURL(url); }
  }
  function S2() {
    screen = "S2";
    const list = slots();
    render(`
      <h1>写真があると、原因が絞りやすくなります</h1>
      <p class="muted">なくても進めます。撮れるものだけで大丈夫です。</p>
      <div class="photo-slots">
        ${list.map((s) => {
          const p = state.photos[s.key];
          return `<div class="slot" data-k="${s.key}">
            ${p ? `<img src="${p.preview}" alt="">` : `<div class="empty">${s.key}</div>`}
            <div><b>${esc(s.label)}</b><div class="small muted">${esc(s.hint)}</div>${p ? `<button class="link small" data-del="${s.key}">外す</button>` : ""}</div>
            <label class="btn secondary">${p ? "撮り直す" : "撮る・選ぶ"}<input type="file" accept="image/*" data-k="${s.key}"></label>
          </div>`;
        }).join("")}
      </div>
      <div class="notice small">送る前に：顔・表札・書類・図面の住所が写っていませんか。写っていれば外すか撮り直してください。写真は端末で小さくしてから送り、位置情報は付けません。</div>
      <button class="btn" id="next">${Object.keys(state.photos).length ? "次へ" : "写真なしで進む"}</button>
    `, { back: S1 });
    on("input[type=file]", "change", async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const k = e.target.dataset.k;
      const label = list.find((s) => String(s.key) === k).label;
      try { state.photos[k] = { label, ...(await shrink(f)) }; } catch { alert("この写真は読み込めませんでした。別の写真を選んでください。"); }
      S2();
    });
    on("[data-del]", "click", (e) => { delete state.photos[e.currentTarget.dataset.del]; S2(); });
    on("#next", "click", () => { state.qIndex = 0; S3(); });
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
    render(`
      <h1>${esc(q.text)}</h1>
      ${picked ? `<p class="small"><span class="tag">建築士が聞く理由</span>${esc(picked.why)}</p>` : q.note ? `<p class="small muted">${esc(q.note)}</p>` : ""}
      ${q.options.map((o) => `<button class="choice ${state.answers[qid] === o ? "on" : ""}" data-o="${esc(o)}">${esc(o)}</button>`).join("")}
    `, { back: () => { if (state.qIndex === 0) S2(); else if (state.ask && state.qIndex === nFixed) SLook(); else { state.qIndex--; S3(); } }, progress });
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
      <div class="spinner"></div>
      <p class="muted">見てから、あと2〜3問だけ聞きます。20秒ほどかかります。</p>
    `, { back: () => { state.qIndex = nFixed - 1; S3(); } });
    try {
      const res = await fetch(CFG.apiBase + "/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(baseBody()) });
      const json = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
      if (!res.ok || !json.ok) throw new Error(json.error || res.status);
      const x = json.result;
      const seen = new Set();
      const questions = (x.questions || []).filter((q) => R.QUESTIONS[q.id] && !R.FIXED.includes(q.id) && !seen.has(q.id) && seen.add(q.id)).slice(0, 3);
      const inferred = {};
      (x.inferred || []).forEach((i) => { if (R.QUESTIONS[i.id] && !seen.has(i.id) && R.QUESTIONS[i.id].options.includes(i.value) && i.value !== R.UNKNOWN) inferred[i.id] = { value: i.value, basis: i.basis }; });
      state.ask = { first_look: x.first_look || "", questions, inferred: Object.entries(inferred).map(([id, v]) => ({ id, ...v })) };
      state.inferred = inferred; state.askKey = key; state.askFailed = false;
      SLook();
    } catch (e) {
      // Fall back to asking every question in the fixed order.
      state.askFailed = true; state.qIndex = nFixed; S3();
    }
  }

  function SLook() {
    screen = "SLook";
    const a = state.ask;
    const inf = a.inferred;
    render(`
      <h1>写真と答えから、見えたこと</h1>
      <div class="card"><p class="lead">${esc(a.first_look)}</p></div>
      ${inf.length ? `<h3>写真から読み取ったこと（答えなくて大丈夫です）</h3>${inf.map((i) => `<div class="card small"><b>${esc(R.QUESTIONS[i.id].text)}</b>：${esc(i.value)}<p class="muted">${esc(i.basis)}</p></div>`).join("")}` : ""}
      <button class="btn" id="next">${a.questions.length ? `あと${a.questions.length}問、聞かせてください` : "診断する"}</button>
    `, { back: () => { state.qIndex = nFixed - 1; S3(); } });
    on("#next", "click", () => { state.qIndex = nFixed; S3(); });
  }

  // ---------- S4 ----------
  async function S4() {
    screen = "S4";
    render(`
      <h1>建築士の目で見ています</h1>
      <div class="spinner"></div>
      <p class="muted" id="msg">写真と答えを読んでいます。30秒ほどかかります。</p>
    `, { back: () => { state.qIndex = qList().length - 1; S3(); } });
    const asked = qList();
    const answers = Object.fromEntries(asked.filter((q) => state.answers[q]).map((q) => [q, state.answers[q]]));
    const inferredIds = Object.keys(state.inferred).filter((q) => !answers[q]);
    inferredIds.forEach((q) => (answers[q] = state.inferred[q].value));
    state.ruleResult = R.run(answers, state.placeId, inferredIds);
    const body = { ...baseBody(), answers, inferred_from_photos: inferredIds, ask: state.ask, rule_result: state.ruleResult };
    const t = setInterval(() => { const m = $screen.querySelector("#msg"); if (m) m.textContent = ["写真と答えを読んでいます…", "原因を絞っています…", "暮らしの言葉に直しています…"][Math.floor(Date.now() / 8000) % 3]; }, 2000);
    try {
      const res = await fetch(CFG.apiBase + "/diagnose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({ ok: false, error: "bad_json" }));
      clearInterval(t);
      if (!res.ok || !json.ok) throw new Error(json.error || res.status);
      state.result = json.result; state.model = json.model; state.error = null;
      save();
      S5();
    } catch (e) {
      clearInterval(t);
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

  function S5() {
    screen = "S5";
    const x = r();
    render(`
      <h1>${esc(x.place || state.place || "その場所")}が寒い、いちばんの原因は</h1>
      ${x.causes.map((c) => `<div class="card"><span class="rank">${c.rank}</span><b>${esc(c.name)}</b> <span class="tag ${c.confidence === "almost_certain" ? "strong" : ""}">${esc(R.CONF_LABEL[c.confidence] || c.confidence)}</span><p>${esc(c.reason)}</p></div>`).join("")}
      ${x.photo_findings.length ? `<h2>写真で見つけたこと</h2>${x.photo_findings.map((f) => `<div class="card">${photoThumb(f.photo)}<span class="tag">写真${f.photo}：${esc(photoLabel(f.photo))}</span><p>${esc(f.note)}</p></div>`).join("")}` : ""}
      <div class="society">この家だけの話ではありません。国の推計では、今の断熱の基準を満たす家は約13％、無断熱の家は約29％です（既存住宅約5,000万戸。令和元年度時点の推計）。</div>
      <button class="btn" id="next">どう直す？</button>
    `, { back: S0, foot: true });
    on("#next", "click", S6);
  }

  function S6() {
    screen = "S6";
    const x = r();
    render(`
      <h1>まず相談するなら、これ</h1>
      ${x.today_actions && x.today_actions.length ? `<h3>今日からできること（工事なし）</h3>${x.today_actions.map((a) => `<div class="card"><b>${esc(a.name)}</b><p>${esc(a.description)}</p></div>`).join("")}` : ""}
      <h3>工務店に相談する改修案（優先順）</h3>
      ${x.proposals.map((p) => `<div class="card ${p.first_choice ? "first" : ""}"><span class="rank">${p.rank}</span><b>${esc(p.name)}</b>${p.first_choice ? ` <span class="tag strong">まず相談するならこれ</span>` : ""}
        <p>${esc(p.description)}</p>
        <p class="small"><b>期待できる変化：</b>${esc(p.expected_change)}</p>
        <p class="small"><span class="tag">工事の大きさ：${esc(R.WORK_LABEL[p.work_size] || p.work_size)}</span><span class="tag">${esc(R.SUBSIDY_LABEL[p.subsidy] || p.subsidy)}</span></p>
        <p class="small muted">なぜこの順位か：${esc(p.why_this_rank)}</p></div>`).join("")}
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
      <h1>次の帰省で、見てほしいこと</h1>
      <ul>${x.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
      <h2>親御さんへの一言</h2>
      <div class="card"><p class="lead">${esc(x.message_to_parent)}</p><button class="link small" id="copyMsg">この一言をコピー</button></div>
      ${bath ? `<div class="notice"><b>お風呂の寒さは、冬の事故につながります。</b><p class="small">消費者庁の注意喚起：入浴前に脱衣所や浴室を暖める。湯温は41度以下、湯につかるのは10分までを目安に。浴槽から急に立ち上がらない。入浴前に家族に声をかける。<a href="https://www.caa.go.jp/policies/policy/consumer_safety/caution/caution_009/" target="_blank" rel="noopener">消費者庁のページ</a></p><p class="small muted">気になる症状があれば医師に相談してください。</p></div>` : ""}
      <button class="btn" id="next">保存・共有</button>
    `, { back: S6, foot: true });
    on("#copyMsg", "click", () => copy(x.message_to_parent, "#copyMsg"));
    on("#next", "click", S8);
  }

  function sheetText() {
    const x = r();
    const a = state.answers;
    const lines = [];
    lines.push("工務店に見せる相談シート（nukumori で作成。目安であり現地調査に代わりません）", "");
    lines.push("■ 困っていること", `親の一言：「${state.words}」`, `場所・時間帯：${x.place || state.place || "未記入"}${state.time ? "・" + state.time : ""}`, "");
    lines.push("■ 家族が優先したいこと", `・工事の大きさ：${a.q9 || "未回答"}`);
    if (a.q10) lines.push(`・寒さのほかに直したいところ：${a.q10}`);
    lines.push("");
    lines.push("■ 家族が確認したこと（質問の答え）");
    qList().filter((q) => q !== "q9" && q !== "q10").forEach((q) => lines.push(`・${R.QUESTIONS[q].text}：${a[q] || "未回答"}`));
    Object.entries(state.inferred || {}).filter(([q]) => !a[q]).forEach(([q, v]) => lines.push(`・${R.QUESTIONS[q].text}：${v.value}（写真からの AI の推定。要確認）`));
    lines.push("", "■ 写真から AI が読み取ったこと（推測を含む）");
    x.photo_findings.forEach((f) => lines.push(`・写真${f.photo}：${f.note}`));
    if (!x.photo_findings.length) lines.push("・写真なし");
    lines.push("", "■ 原因の見立て");
    x.causes.forEach((c) => lines.push(`${c.rank}. ${c.name}（${R.CONF_LABEL[c.confidence] || c.confidence}）：${c.reason}`));
    lines.push("", "■ 相談したい候補（優先順）");
    x.proposals.forEach((p) => lines.push(`${p.rank}. ${p.name}${p.first_choice ? "【まず相談】" : ""}（工事の大きさ：${R.WORK_LABEL[p.work_size] || p.work_size}）`));
    lines.push("", "■ 現地で確認してほしいこと");
    x.checks.forEach((c) => lines.push(`・${c}`));
    lines.push("", "■ 見積のときに分けてほしいこと", "・工事の範囲／製品と性能／撤去・復旧／調査費／追加工事になる条件／補助制度の扱い／浴室が使えない期間／保証");
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
    return [`「${state.words}」の寒さ診断（nukumori）`, "", "原因トップ3：", ...x.causes.map((c) => `${c.rank}. ${c.name}（${R.CONF_LABEL[c.confidence] || ""}）`), "", "まず相談するならこれ：", ...x.proposals.filter((p) => p.first_choice).map((p) => p.name), "", "今日からできること：", ...(x.today_actions || []).map((a) => `・${a.name}`), "", `親への一言：${x.message_to_parent}`].join("\n");
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
  S0();
})();
