# 実行計画: Round7 Theme Trend Research (20260405_0815)

- ステータス: COMPLETED
- 既存 active plan: なし
- ユーザー意図:
  - **トレンドフォロー型のテーマ投資**を主軸に深掘りする
  - round6 までの強かった戦略を改善し続ける
  - `docs/research` と session log / exec-plan の文脈を引き継ぐ
  - `stock-themes.com` の見方を round6 より一段深く proxy 化する
- ガードレール:
  - **long-only 固定**
  - **公開 CLI / MCP (`nvda-ma`) は変更しない**
  - 変更範囲は research runner / preset / docs を優先

## 1. round6 までの文脈整理

### 直近で何をしていたか

- round6 では `stock-themes.com` の公開情報を調べ、テーマ投資 proxy 戦略を約 10 本追加検証した
- round6 の robust winner は **`donchian-55-20-rsp-filter-rsi14-regime-50`**
- round6 の次点は **`donchian-55-20-spy-filter-rsi14-regime-55`**
- alt universe でも **55/20 + breadth / persistence** が主役で、20/10 acceleration 系は補完枠に留まった
- RSI long-only は `GOOGL` のような breakout が鈍い銘柄では意味があったが、主役ではなく **dip reclaim の補完戦略** だった

### round6 から次に活かすべき知見

1. **breadth を伴う persistence が本線**
   - `RSP > 200SMA` を使う 55/20 系が最も robust
2. **leader 主導の quality 改善も有効**
   - `SPY > 200SMA` を使う 55/20 系は PF / DD が良い
3. **20/10 は初動・再加速の補完枠**
   - 速いテーマには効くが、主役化はしにくい
4. **押し目は浅いものと深いものを分けるべき**
   - round6 の RSI 補完は粒度が粗く、dip の深さ / 回復窓を分離していない
5. **テーマ投資の proxy は “どの局面を模しているか” をもっと明示すべき**
   - breadth / concentration / shallow dip / deep dip / acceleration を分離したい

## 2. `stock-themes.com` 深掘りの解釈

> 内部仕様の断定ではなく、公開画面・FAQ・公開 API から読める外形的な判断軸として扱う。

### round7 で重視する追加観点

1. **equal-weight breadth**
   - FAQ ではテーマ騰落率が「構成銘柄の日次騰落率の単純平均」と明記されている
   - つまり大型 1 銘柄より **テーマ全体に広がっているか** が重要
2. **leader concentration**
   - ranking API は constituent performance を持つため、単独 leader 依存かテーマ全体かを読み分けていそう
3. **month-end persistence**
   - rank-history は月末スナップショットで、短期急騰より **継続テーマ** を見ている
4. **dip depth × recovery window**
   - dip alert は押し目深さと経過 window を分けており、浅い押しと深い押しを同列に扱っていない
5. **curated theme bias**
   - 注目テーマは「今盛り上がっている / 今後のトレンド形成が期待される分野」を主観込みで選定している
   - よって round7 でも ranking の絶対値ではなく **判断軸だけ借りる**

## 3. round7 の問題設定

round6 で本線は見えたが、次に必要なのは **トレンドフォロー型テーマ投資のどの局面が一番 robust かを、さらに細かく切り分けること** である。

round7 では次を見極める。

1. breadth を伴う継続テーマの本命を、さらに改善できるか
2. leader 主導テーマに stricter quality を入れると改善するか
3. 20/10 を初動ではなく **再加速テーマ** に寄せると良くなるか
4. dip reclaim を **浅い押し / 深い押し** に分けると意味が出るか
5. round6 winner を超えられなくても、局面別の補完戦略として採用価値があるか

## 4. スコープ

### スコープ内

- round6 exec-plan / session log / research docs の再読
- `stock-themes.com` 公開情報の深掘り整理
- round7 用 strategy shortlist 約 10 本の設計
- 必要な preset / metadata / validation の追加
- Mag7 実行と alt rerun
- raw snapshot / summary / research docs / session log の更新
- 既存テストコマンドによる検証

### スコープ外

- `stock-themes.com` のスクレイピング拡張や内部仕様の断定
- 公開 CLI / MCP の theme 対応
- short 戦略
- intraday / multi-timeframe 化
- 新規外部データ vendor 導入
- backtest engine の全面再設計

## 5. 変更・作成・参照するファイル

### 参照

- `docs/exec-plans/completed/round6-theme-trend-research_20260405_0603.md`
- `docs/working-memory/session-logs/round6-theme-trend_20260405_0603.md`
- `docs/research/theme-signal-observation-round6_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round6_2015_2025.md`
- `docs/research/theme-backtest-results-round6_2015_2025.md`
- `docs/research/theme-backtest-results-round6-alt_2015_2025.md`
- `config/backtest/strategy-presets.json`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `package.json`
- `docs/DOCUMENTATION_SYSTEM.md`

### 更新予定

- `config/backtest/strategy-presets.json`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`（導線更新が必要な場合のみ）
- `src/core/preset-validation.js`（preset metadata 拡張が必要な場合のみ）
- `src/core/research-backtest.js`（runner 出力ラベルの追加が必要な場合のみ）

### 新規作成予定

- `docs/research/theme-signal-observation-round7_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round7_2015_2025.md`
- `docs/research/theme-backtest-results-round7_2015_2025.md`
- `docs/research/theme-backtest-results-round7-alt_2015_2025.md`
- `docs/references/backtests/round7-theme-mag7_20260405.json`
- `docs/references/backtests/round7-theme-mag7_20260405.summary.json`
- `docs/references/backtests/round7-theme-alt_20260405.json`
- `docs/references/backtests/round7-theme-alt_20260405.summary.json`
- `docs/working-memory/session-logs/round7-theme-trend_20260405_0815.md`

### 削除

- なし

## 6. round7 で試す候補戦略（約 10 本）

> 既存 builder family の組み合わせを優先し、大きな実装追加は避ける。

### A. Breadth / Persistence 改良（5 本）

1. `donchian-55-20-rsp-filter-rsi14-regime-45-theme-breadth-early`
   - round6 本命の RSI 緩和版
2. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-6pct-theme-breadth-quality`
   - breadth persistence の品質改善版
3. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
   - leader 主導テーマの strict quality 版
4. `donchian-55-20-spy-filter-rsi14-regime-55-hard-stop-6pct-theme-quality-strict`
   - round6 次点の DD 改善版
5. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
   - breadth 継続テーマの深い押し許容版

### B. Acceleration / Re-acceleration 改良（3 本）

6. `donchian-20-10-spy-filter-rsi14-regime-45-hard-stop-10pct-theme-acceleration-reentry`
   - 再加速を取りにいく緩和版
7. `donchian-20-10-spy-filter-rsi14-regime-50-hard-stop-8pct-theme-acceleration-balanced`
   - 6% と 10% の中間 stop による均衡版
8. `donchian-20-10-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-acceleration`
   - breadth を伴う acceleration の修正版

### C. Dip Reclaim 深掘り（2 本）

9. `rsi2-buy-10-sell-70-rsp-filter-long-only-theme-shallow-dip`
   - 浅い押しからの reclaim
10. `rsi3-buy-20-sell-70-spy-filter-long-only-theme-deep-dip`
   - 深い押しからの遅め回復

## 7. 実装ステップ

- [x] Phase 0: round6 exec-plan / session log / research docs を再確認し、round6 winner / runner-up / 補完枠を整理する
- [x] Phase 1: `stock-themes.com` の equal-weight breadth / leader concentration / month-end persistence / dip depth-window を round7 観点として文章化する
- [x] Phase 2: round7 候補 10 本を shortlist 化し、各候補に theme axis と狙いを紐づける
- [x] Phase 3: `tests/preset-validation.test.js` に round7 preset 群の RED テストを追加する
- [x] Phase 4: `tests/backtest.test.js` に round7 source generation の RED テストを追加する
- [x] Phase 5: `config/backtest/strategy-presets.json` に round7 preset 群を追加し、必要最小限の実装で GREEN にする
- [x] Phase 6: 必要なら `src/core/preset-validation.js` / `src/core/research-backtest.js` を最小変更して theme metadata や出力整理を支える
- [x] Phase 7: Mag7 で round7 全候補を backtest する
- [x] Phase 8: 上位 5〜6 本を `sp500-top10-point-in-time` / `mega-cap-ex-nvda` で再検証する
- [x] Phase 9: round7 の observation / shortlist / Mag7 results / alt results / session log / raw summary を保存する
- [x] Phase 10: round6 winner と round7 challenger を cross-universe で比較し、主軸・補完枠・落選理由をまとめる

## 8. テスト戦略（RED → GREEN → REFACTOR）

### RED

- round7 preset 群の validation test を先に失敗させる
- round7 preset 群の source generation test を先に失敗させる
- 追加 metadata がある場合は命名 / theme_axis / notes の test も先に失敗させる

### GREEN

- preset schema / builder の既存組み合わせで通せるものを優先する
- 既存 round6 preset を壊さず、round7 preset 群だけを追加する
- runner 側は必要最小限の変更に留める

### REFACTOR

- round6 と round7 の naming / metadata の読み分けを整理する
- helper や validation の重複を減らす
- docs で各戦略の “テーマ局面ラベル” を分かりやすくする

### カバレッジ方針

- 新規変更箇所で **80% 以上** を目標にする
- utility / validation は unit test でカバーする
- backtest 実行と docs 更新は既存研究フローに合わせる

## 9. 検証コマンド

- targeted:
  - `node --test tests/backtest.test.js tests/preset-validation.test.js`
- unit:
  - `npm test`
- e2e:
  - `npm run test:e2e`
- full:
  - `npm run test:all`

## 10. リスク

1. **theme data 不在**
   - proxy が価格 breakout 比較に寄りすぎる可能性がある
2. **round6 winner への過学習**
   - 改良ばかりだと探索が弱くなる
3. **Mag7 偏重**
   - NVDA / META 主導の見かけ優位が再発しうる
4. **dip reclaim の proxy 限界**
   - 実際の theme ranking の dip alert を完全再現するわけではない
5. **候補増やしすぎ**
   - 10 本を大きく超えると比較がぼやける

## 11. 完了条件

- round7 preset 約 10 本が追加されている
- round7 の raw snapshot / summary / research docs / session log が揃っている
- Mag7 → alt の二段比較が完了している
- round6 winner と round7 challenger の比較ができる
- `npm test`
- `npm run test:e2e`
- `npm run test:all`
  が通る
