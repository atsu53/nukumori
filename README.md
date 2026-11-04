# nukumori

Diagnose why your parent's faraway house is cold, with an architect's eye.

nukumori is a PWA for adult children whose parents live far away. Start from something your parent said ("the bathroom is freezing"), answer a few questions, optionally add photos, and get the top three likely causes of the cold plus renovation ideas in priority order.

Built for **Built with Claude: Japan 2026** (Nov 2–8, 2026). All code in this repository was written during the event.

> Status: under development. How to try it will be added here before submission.

## How it works

- Front end: plain HTML / JavaScript PWA on GitHub Pages
- API relay: Cloudflare Workers. The Claude API key lives only in the Workers secret, never in this repository or the browser
- Rules an architect can explain (e.g. single-pane windows → interior storm windows first) run on the device. Claude reads the photos and translates the results into everyday language
- Photos and answers are not stored

## Try it

(Coming soon: public URL and steps for judges.)

## Checked against the architect's own judgment

Ten cases (the developer's family home with photos and a hand-drawn floor plan, plus nine answer-only cases: windows already replaced, an unvented kerosene heater, "don't know" to everything, a condominium, a rental, a parent who wants no construction, a parent who may move soon, a leaking ceiling, a room that is cold in winter and hot in summer) were run through the app on 2026-11-05 and compared with the developer's judgment as a licensed first-class architect. In all 10, the top cause and the first proposal matched the architect's judgment. None of them produced a cost figure, a promise of warmth, a product name, or a DIY suggestion.

## Outside data

- Test photos are of the developer's own family home. They are kept outside this repository
- Numbers in the diagnosis come only from public sources (laws and government materials), cited in the app

## Not in this version

- No prediction of room temperature or heating cost figures (a schematic of how heat moves, at most)
- No quote comparison, long-term-care renovation grants, loans, summer heat, or sensor integration
- Built for detached owner-occupied houses; condominiums and rentals get a "talk to the building manager first" note

---

## 日本語

離れて暮らす親の家の寒さを、子ども世代が建築士の目で診るアプリです。親の一言から始めて、いくつかの質問と任意の写真で、寒さの原因トップ3と優先順位つきの改修案を出します。

Built with Claude: Japan 2026（2026年11月2日〜8日）の作品です。このリポジトリのコードはすべて期間中に書きました。

- 画面は素の HTML / JS の PWA（GitHub Pages）。API の中継は Cloudflare Workers で、Claude API キーは Workers のシークレットにだけ置きます
- 建築士として説明できる判断はルールにして端末で計算し、写真の読み取りと暮らしの言葉への翻訳を Claude に任せます
- 写真と回答は保存しません
- テスト用の写真は開発者の家族の家のもので、リポジトリの外に置いています。診断の数値は公開の法令・行政資料だけを使います
- 10の事例（実家の写真と手描きの間取り図1件と、答えだけの9件：窓を交換済み、排気筒のない石油ファンヒーター、全部「分からない」、分譲マンション、賃貸、工事を望まない親、近く施設に入る親、天井の雨漏り、夏も暑い2階）を 2026-11-05 にアプリで診断し、開発者（一級建築士）の判断と照らしました。10件とも原因1位と最初の案が一致しました。費用の金額、効果の約束、製品名、DIY の勧めは1件も出ませんでした
- 審査員向けの使い方は提出前にここへ書きます
- この版でやらないこと：室温や光熱費の数値の予測（仕組みの模式図まで）、見積書の比較、介護保険の住宅改修、融資、夏の暑さ、センサー連携。一戸建ての持ち家向けで、マンションや賃貸は「まず管理者に相談」の案内にとどめます
