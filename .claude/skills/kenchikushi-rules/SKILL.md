---
name: kenchikushi-rules
description: nukumori の「建築士のルール」（web/rules.js）を足す・直す・質問の選択肢の文言を変えるときの手順。ルールの根拠（docs/LOGIC.md）を先に読み、端末のルールと Claude の指示文（worker/prompt.js）と絵（web/art.js）を同時に直し、9事例の回帰チェックを通してから公開する。「ルールを足して」「選択肢を変えて」「窓の判定を直して」のような依頼で使う。
---

# 建築士のルールを直す

nukumori の見立ては2段でできている。端末の `web/rules.js` が候補と印（must_keep／keep_low／beyond_tolerance）を出し、Claude が家全体を読んで順位をつけ、変えた理由を `rule_overrides` に書く。点数は使わない（2026-11-04 に廃止）。この分担を崩さない。

## 手順

1. 根拠を読む。`docs/LOGIC.md` の該当する節（3.1 築年／3.2 窓／3.3 浴室／3.4 床と結露／3.5 暖房／3.6 候補と印）。数値や法規の根拠がない変更は入れない。新しい数字は LOGIC.md 6章の出典に載っているものだけ
2. `web/rules.js` を直す。選択肢の文言を変えるときは、同じ文字列を使っている次の3か所を同時に直す
   - `worker/prompt.js`：質問と選択肢の一覧（Claude が写真から答えを推定するときに、この文字列をそのまま返す）
   - `web/art.js`：`PIC` のキー（選択肢の文字列で絵を引いている）
   - `docs/evidence/cases_*.json`：事例の答え
3. 回帰チェックを回す（Claude は呼ばない。1秒で終わる）
   ```
   node scripts/rules_check.mjs docs/evidence/cases_2026-11-08.json --baseline docs/evidence/rules_2026-11-08.json
   ```
   - ERROR が出たら直す：選択肢に無い答え（文言の変え忘れ）、建築士が期待する原因や最初の案が候補から消えた
   - CHANGED の事例を読み、変わってよい変化か判断する。変わってよいなら `--write` で基準を更新し、日付を変えて保存する
4. CHANGED の事例だけ、Claude まで通して見る（API キーと手元の Worker が要る）
   ```
   node scripts/cases.mjs <変わった事例だけの json> out/cases
   ```
   原因1位と最初の案が建築士の判断と合うかを見る。合わないときは、ルールでなく `worker/prompt.js` の順位のつけ方を疑う
5. 画面で1回通す（表紙の「例の家で試す」）。`web/sw.js` の CACHE 名を +1 してから `npx wrangler deploy`
6. 記録：`docs/evidence/README.md` に1行、設計資料の `docs/SCREENS.md` に日付つきで1行

## 守ること

- ルールは候補と印を出すだけ。順位は Claude がつける。ルールに点数や順位を戻さない
- 写真からの推定（inferred）に乗った原因は「ほぼ確実」にしない（`run` の add の中）
- 窓を直した家（q8）と、樹脂枠・内窓の家（q2）では、窓を上位にしない
- 分譲・賃貸は、管理組合や大家の了解が要る工事を候補から外す
- 画面に出す言葉：金額を出さない、効果を約束しない、製品名を出さない、医学的な判断をしない
