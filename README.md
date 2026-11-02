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

## Outside data

- Test photos are of the developer's own family home. They are kept outside this repository
- Numbers in the diagnosis come only from public sources (laws and government materials), cited in the app

---

## 日本語

離れて暮らす親の家の寒さを、子ども世代が建築士の目で診るアプリです。親の一言から始めて、いくつかの質問と任意の写真で、寒さの原因トップ3と優先順位つきの改修案を出します。

Built with Claude: Japan 2026（2026年11月2日〜8日）の作品です。このリポジトリのコードはすべて期間中に書きました。

- 画面は素の HTML / JS の PWA（GitHub Pages）。API の中継は Cloudflare Workers で、Claude API キーは Workers のシークレットにだけ置きます
- 建築士として説明できる判断はルールにして端末で計算し、写真の読み取りと暮らしの言葉への翻訳を Claude に任せます
- 写真と回答は保存しません
- テスト用の写真は開発者の家族の家のもので、リポジトリの外に置いています。診断の数値は公開の法令・行政資料だけを使います
- 審査員向けの使い方は提出前にここへ書きます
