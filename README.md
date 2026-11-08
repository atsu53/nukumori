# nukumori（ぬくもり）

建築士が家を見る順番を、そのままスマホに入れた。
「お風呂場が寒い」の一言と写真から、Claude が家の寒さの原因と、まず工務店に相談したい直し方を見立て、「家のカルテ」として残すアプリです。

- 使う場所：https://nukumori-api.chaprec-transcribe.workers.dev （スマホのブラウザで開けます。インストール不要）
- 作品：Built with Claude: Japan 2026（2026年11月2日〜8日）。このリポジトリのコードはすべて期間中に、Claude Code で書きました
- 作者：福井市の一級建築士（注文住宅・店舗の設計施工）。出発点は、離れて暮らす母の「お風呂場がさむいんだべさ」の一言
- デモ動画（3分）：https://www.youtube.com/watch?v=27m_gILlyHQ

Claude がしていること：
- 写真と間取り図から分かること（窓の種類・暖房・浴室のつくり・冷えの道筋）を先に読み、分からないことだけを3問に絞って聞く
- 建築士のルールが出した原因の候補を、写真と答えに照らして順位づけし、暮らしの言葉で「まず直すなら1つ」「今日できること」に訳す
- 家で確かめてきた答えを受けて見立てを更新し、何が変わったかを示す

## 1分で試す（審査員の方へ）

1. 上の URL を開き、表紙の「例の家で試す（築50年ほどの実家の写真5枚で）」を押す。作者の実家の写真5枚（家族の了解を得て掲載。場所が分かるものは外してあります）が入ります
2. 写真の画面で「次へ」。一言はもう入っているので、もう一度「次へ」で、はじめの3問（住まいの種類・築年・工事の大きさの許容）に答える
3. 約20秒で「見えたこと」が出ます。Claude が写真を読んだ結果（見えた・分からない）、手描きの間取り図に重ねた寒さの道筋、写真から分かったので聞かずに済ませたこと。そのあと Claude が選んだ2〜3問に答える
4. 約30秒で結果。断面図に原因の番号、そのあと「今日できる（工事なし）→ 工務店に相談・まずこれ → 次に家を見るとき確かめる → 家族への一言」の順。＋で原因の理由・間取り図・写真ごとの所見・出典が開きます
5. 下の帯の「家で確かめて、見立てを更新」で、確かめてきたことを押して答えると、見立てが更新されます（何が変わったかが先頭に出ます）
6. 「家のカルテへ」で、残る1枚。断面図と間取り図、寒さの原因3つ、工務店に相談、今日できること、工務店に聞くこと3つ。「このカルテをコピー」で工務店に送れる文面になります

自分の家の写真でも試せます（写真は保存しません。端末で縮小して位置情報を落としてから送ります）。写真なしでも進めます。

## 誰の、どんな場面か

- 寒いと思った夜に、聞ける相手がいない家族のため。国の推計では、今の断熱の基準を満たす家は約18％、無断熱の家は約24％です（令和4年度時点。出典は下）
- 3か月後に開く場面：帰省した子どもが前回の結果を開いて家で確かめ、更新する／工務店に行った帰りに、カルテと照らす／住んでいる本人が寒い夜に「自分の家を診る」から開く
- 売らない・紹介しない。金額を出さない。医学的な判断をしない

## 順番（アプリの骨格）

建築士が家を見るときの順番を、そのまま画面にしました。6つの場面は別々の機能でなく、1本の順番です。

1. 見る：写真と一言から、家を透かして見る（見えたこと・間取り図の寒さの道筋）
2. 聞く：見てから、答えで並びが変わる2〜3問だけ聞く
3. 絞る：原因を3つに絞り、手をつける順番を決める。工事なしでできることはその一段目
4. 渡す：工務店と同じ目線で話せる形（聞くこと3つ・見立ての要点）にする
5. 家族で動く：責めない一言と、確かめてきてほしいこと
6. 確かめて育てる：確かめた事実で見立てが更新され、家のカルテとして残る。確かめるとき、その場で撮った写真を添えると、Claude がその写真も読む（床下点検口の中、窓の縁、結露の跡）

汎用の AI チャットは写真を見せれば答えを1つ返します。nukumori は答えを返す前に、建築士の順番で進みます。リフォーム会社の無料診断とは、売らない・紹介しないことで違います。断熱の啓発ページとは、その家の写真と一言から始まることで違います。

## Claude の使い方

- 2回呼びます。`/ask`：写真・間取り図・一言・はじめの3問を読み、見えたことと、次に聞く2〜3問を選ぶ（写真で分かることは聞かない。分からないことは推定せず聞く）。`/diagnose`：答えと写真を合わせて、原因・改修案・今日できること・確かめてほしいこと・家族への一言を返す。再診断では前回の要点と確かめた事実を渡し、何が変わったかも返す。確かめるときに撮った写真（「確認：…」の見出しで、確認項目の番号つき）は、家族が見た事実として最初の写真より強く扱わせる。写っていないことは無いことと決めず、分からないまま残す
- 建築士のルール（築年・窓・浴室・床・暖房から、疑う原因と改修案の候補と印を出す）は端末側の `web/rules.js` で先に計算し、Claude に出発点として渡します。Claude はそれを写真と答えで上書きでき、変えたときは理由を返します（画面の「この家に合わせて、ふつうの判断を変えたところ」）
- 見立てのたびに、建築士が判断を付けた9つの事例（`worker/cases.js`。その家の条件と、建築士がどう判断したか）を Claude に渡し、この家に近い事例と「建築士のその判断がこの家にどう効くか」、頼りにしたルールの節を返させます。結果の「原因の見立てと、なぜそう見たか」の中に「Claude が照らしたもの」として出ます。見立ての根拠が、Claude の内側でなく、建築士の判断の記録にあることを見せるためです（2026-11-08）
- 間取り図は 0〜1000 の座標で部屋・暖かい部屋・寒い場所までの経路・寒い点を返させ、端末で写真の上に描きます。手描きの図の縮尺の手がかりに、端末で目盛りを重ねてから送ります。それでも、例の家の脱衣所を読むと「合う（誤差 1000 分の 5〜30）」と「部屋1つ左（90〜120）」の2通りに揺れ、半分ほどが左に出ました（2026-11-08 に実測。目盛りの線の位置を返させる指示や、線を太くする手では変わらず）。目盛りの数字を線に沿って3か所ずつ書いても揺れは残ったので、Worker が間取り図だけを読む小さな呼び出しを4つ、本体と並行して走らせ、部屋ごとに5つの読みの中央値を取るようにしました（経路と印は、いちばん近い部屋と同じ分だけ動かす）。待ち時間は変わりません（約11秒）。これで例の家の脱衣所は、3回読みで4回とも（誤差 1000 分の 11〜74）、5回読みで4回とも（11〜25）右端の区画に入りました。それでも確率を上げる手当てで、保証ではありません。読みが揺れること自体を画面に書いています（「印の位置はおおよそ」）。例の家だけ、作者（建築士）が描いた経路を青い線で並べ、凡例にそう書いています
- モデルは Claude Opus 5.5。構造化出力（JSON schema）で画面の項目をそのまま受け取ります。effort は low（Opus medium・Sonnet 5.5 と同じ入力で比べ、分量を絞った指示文なら low で足りた）。システムプロンプトはプロンプトキャッシュの対象にし、2回の呼び出しで写真を同じ順で送ります。混雑時は Claude 側の自動切替で別のモデルが答えることがあります（応答の model を端末に記録しています）
- 言わせないこと：金額、効果の約束、製品名、DIY の勧め、医学的な判断。数字は公開の一次資料にあるものだけ（出典は `docs/LOGIC.md` 6章と、画面の「数字と判断の出典」）
- 使っていないもの：MCP サーバー、フック。正直に書きます

## Claude Code でどう作ったか

- 仕様4本（SPEC・LOGIC・ARCHITECTURE・SCREENS）を先に書き、Worker と画面を Claude Code で実装。設計の文書は `docs/` にあります（開発用リポジトリから写したもの。変更の経緯は SCREENS.md の日付つきの節）
- 母の実家の写真で同じ入力を4回流し、原因1位と最初の案が毎回同じか（同じでした。2位・3位は入れ替わることがある）を確かめた
- 作者自身がスマホで画面収録を2回して、迷った所を直した（結果の先頭、押して答える確かめ、最後の画面をカルテに）
- サブエージェントを使った所：文脈を持たない別の Claude に、一般の人として画面の文章を点検させた（15項目の指摘から文言を直した）／他のアプリの操作性の画面収録から余白の入れ方を読み取らせた／窓の分類と性能値を一次資料で調べさせた（出典つきの調査メモは `docs/research/`）／提出前に35体のサブエージェント（5つの観点 × 6件の指摘、それぞれに反証役を1体）で総点検し、21件を直した（古い応答が画面を乗っ取る、写真から推定した答えが工務店への質問に反映されない、Worker が空の送信を受け付ける、など）
- Skill にした所：建築士のルールを足す・直す手順を `.claude/skills/kenchikushi-rules/SKILL.md` にまとめた。ルールの文字列は端末のルール・Claude の指示文・絵・事例の4か所で同じものを使うので、1か所だけ直す事故が起きる。Skill は4か所を同時に直させ、Claude を呼ばない回帰チェック `scripts/rules_check.mjs`（9事例を1秒で流し、選択肢に無い答えと、建築士が期待する原因・最初の案が候補から消えたことを検出する）を通してから公開させる。このチェックを初めて回したとき、11/4 の事例ファイルが 11/7 の文言の変更に追従していなかったこと（9件中8件が選択肢に無い答え）が見つかり、`docs/evidence/cases_2026-11-08.json` に直した
- 作業の引き継ぎ：Claude Code の利用上限に当たる前に、守ること・場所・動かし方・残りの手順・判断の記録を1枚の引き継ぎノートに書き、別のアカウントの Claude Code が同じ所から続けた（11/7 深夜 → 11/8 朝）。引き継ぎノートは開発用の保管庫にある

## 深さの証拠

- 10事例と建築士の判断の照合（2026-11-04。実家の1件は写真と間取り図つき、9件は答えだけ：窓を交換済み／排気筒のない石油ファンヒーター／全部「分からない」／分譲マンション／賃貸／工事を望まない親／近く施設に入る親／天井の雨漏り／夏も暑い2階）。原因1位と最初の案は10件とも作者（一級建築士）の判断と一致。金額・効果の約束・製品名・DIY は1件も出なかった。実行ごとに揺れる所もある：事例10（2階）は原因1位が窓と天井の間で入れ替わる（どちらも「可能性が高い」）。入力と実行結果の要約は `docs/evidence/` に置いた
- 現場の実務者の目も入れた：工務店の社長への22問のアンケートの答えを6事例の見立てと照らし、工事の大きさの区分（窓の交換は小、浴室の断熱改修は中）を直した
- できないことを画面で言う：断熱材の有無は写真では分からない（確かめ方を返す）、ガラスの枚数は写真で決めない（聞く）、方位は図に印がなければ書かない
- ルールの回帰チェック（2026-11-08）：9事例について、建築士が期待する原因と最初の案が端末のルールの候補に残っているかを `scripts/rules_check.mjs` で確かめ、基準を `docs/evidence/rules_2026-11-08.json` に残した。このチェックで見つかった穴：「壁・天井の断熱不足」は原因の候補になるのに、ルールはその改修案（壁・天井の断熱）を候補に出していなかった（Claude が家全体を読んで補っていた。事例02・08・09）。同日に 3.1 の築年のルールに足し、基準を更新した

- 直した回数について：この1週間で、公開したあとの直しが多い（コミット履歴のとおり）。仕様書を先に書いても、写真で読める・読めない、間取り図の位置の揺れ、スマホでの見え方は、作って動かしてから分かった。直すたびに、何が起きて・何を測って・なぜそうしたかを、コミットの説明文とこの README と `docs/SCREENS.md` に書いた。動画も、録画と組み直しを重ねている（開発用の保管庫にあり、写真を含むので公開していない）。作者は建築士で、ソフトウェアの作り方は手探りである。隠さずに残す

## 写真と個人情報

- 写真は端末で縮小して JPEG に再圧縮し（EXIF と位置情報は落ちる）、Claude に送るだけで、サーバーにも端末にも保存しません。前回の結果を開くために、一言・回答・写真の所見・見立てだけが端末の localStorage に残ります（写真は残りません）
- 「例の家」の写真5枚は作者の実家で、家族の了解を得て載せています。場所が分かるもの（表札・周辺）は含めていません
- API キーは Cloudflare Workers のシークレット（`ANTHROPIC_API_KEY`）にだけ置きます

## この版でやらないこと

- 室温や光熱費の数値の予測、見積書の比較、介護保険の住宅改修、融資、夏の暑さ、センサー連携
- 一戸建ての持ち家向け。マンションや賃貸は「まず管理組合・大家に相談」の案内にとどめる

## 中身

- `web/`：画面（素の HTML / JS / CSS、PWA）。`app.js` 画面の流れ、`rules.js` 建築士のルール、`art.js` 絵、`sample/` 例の家の写真
- `worker/`：Cloudflare Worker。`index.js` 中継、`prompt.js` 指示文、`schema.js` 出力の形
- `scripts/`：`two_step.mjs`（写真つきの1件を /ask → /diagnose で流す）、`rediagnose.mjs`（再診断）、`cases.mjs`（10事例を Claude まで通す）、`rules_check.mjs`（9事例を端末のルールだけで流す回帰チェック。Claude を呼ばない）、`smoke.mjs`
- `.claude/skills/`：Claude Code の Skill（`kenchikushi-rules`：建築士のルールを直すときの手順）
- 手元で動かす：`.dev.vars.example` を `.dev.vars` にコピーして自分の API キーを入れ（このファイルは Git に入りません）、`npx wrangler dev --port 8791` と `python -m http.server 8000 --directory web` を起動し、http://127.0.0.1:8000 を開く

## 主な出典

- 国土交通省住宅局「最近の省エネ施策について」（令和6年度）：住宅ストックのうち省エネ基準に適合 約18％、無断熱 約24％（令和4年度時点） https://www.j-reform.com/web-seminars/pdf/2024sym-1.pdf
- 消費者庁「みんなで知ろう、防ごう、高齢者の事故」（入浴中の事故の項） https://www.caa.go.jp/policies/policy/consumer_safety/caution/caution_009/
- 「CASBEE すまい改修チェックリスト」（2015年7月29日発行）ヒートショックの項目 https://www.jsbc.or.jp/research-study/casbee/tools/files/kaishu/CASBEE_Sumai_Checklist.pdf
- 国土交通省「断熱改修等による居住者の健康への影響調査 中間報告（第3回）」（2019年1月） https://www.mlit.go.jp/report/press/house07_hh_000198.html
- 日本サッシ協会「建具とガラスの組み合わせによる開口部の熱貫流率」（2025年7月改訂） https://www.jsma.or.jp/Portals/0/images/useful/technology/25-0701.pdf
- 補助制度は年度で変わるため、アプリは金額を出さず、窓口で最新を確かめるよう案内します

---

## English

**nukumori** puts the order in which an architect looks at a house onto a phone. From one sentence someone in the house said ("the bathroom is freezing") and a few photos, Claude works out why the house is cold, what to try tonight, and which renovation to ask a builder about first, then leaves a one-page "house record" (家のカルテ) that grows each time the family checks something at the house.

- Try it: https://nukumori-api.chaprec-transcribe.workers.dev — tap "例の家で試す" on the cover to load five photos of the author's parents' house (shared with the family's consent, nothing that shows where it is) and reach the end in about a minute. Your own photos work too; they are shrunk on the device, stripped of location data, sent to Claude once, and never stored
- Built for **Built with Claude: Japan 2026** (Nov 2–8, 2026) by a licensed first-class architect in Fukui. All code was written during the event with Claude Code

How Claude is used: two calls. `/ask` reads the photos, the hand-drawn floor plan and the first three answers, says what it saw and what it could not, draws the cold route on the plan (coordinates 0–1000), and picks the two or three questions whose answers change the order. `/diagnose` returns the top three causes, the proposals in order, what to do today without construction, what to check at the house, and one gentle sentence for the family. A re-diagnosis takes the previous summary plus what the family confirmed and returns what changed. Rules an architect can explain run on the device first (`web/rules.js`) and are handed to Claude as the starting point; Claude may override them and must say why. Model: Claude Opus 5.5, structured outputs (JSON schema), effort low, system prompt under prompt caching. Not used: MCP servers, hooks.

Depth: ten cases compared with the architect's own judgment on 2026-11-04 (top cause and first proposal matched in all ten; no cost figures, promises, product names or DIY advice appeared; one case flips its top cause between two "likely" candidates from run to run). A builder's 22-question survey was compared with six cases and changed the work-size labels. Four runs on the same photos gave the same top cause and first proposal each time. The app says what it cannot know from photos (insulation, number of panes, orientation) and returns how to check instead.

Not in this version: room-temperature or cost predictions, quote comparison, long-term-care grants, loans, summer heat, sensors. Built for detached owner-occupied houses; condominiums and rentals get a "talk to the manager first" note.
