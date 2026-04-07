# Round9 テーマシグナル観察メモ (2015-2025)

## 目的

round9 では **round8 で cross-universe に残った strong 7 の改善だけ**を扱う。  
新 family の発見ではなく、**guard 幅 / strictness / entry 速度のどれが本質的に効いているか** を切り分ける。

## round8 から引き継ぐ観察

1. **breadth-earlier は robustness を維持したまま alt 首位だった**
2. **quality-strict-balanced は round8 最大の改善点だった**
3. **deep-pullback-tight は悪くないが、tight 化しすぎると本線性を失う可能性が残る**
4. **breadth-quality-strict と breadth-early-guarded は本線交代までは至らなかった**
5. **duplicate / alias は早めに pruning しないと round の意味が薄れる**

## round9 で重視する観察軸

### 1. breadth family は「最速 entry + 最小 guard」の形に収束するか

- `breadth-earlier`
- `breadth-earlier-guarded`
- `breadth-early-guarded`
- `breadth-early-guarded-wide`

を見ることで、breadth 本線が

- stop なしの速度優位なのか
- guard を少しだけ足した方が robust なのか
- 6% / 8% のどこが過剰防御の境目か

を切り分ける。

### 2. quality family は「strict 60」「balanced 55」「relaxed 45」のどこが cross-universe 最適か

- `quality-strict`
- `quality-strict-balanced`
- `quality-strict-relaxed`
- `quality-strict-balanced-guarded`
- `quality-strict-guarded`
- `quality-strict-guarded-wide`

の比較により、

- strictness を緩めること自体が効いているのか
- guard 追加が効いているのか
- stop 6% / 8% のどちらが quality family に合うのか

を見る。

### 3. deep-pullback は 55/8 が妥当か、60/8 strict へ進めるべきか

round8 では `deep-pullback-tight` が alt 3 位で残った。  
round9 では `deep-pullback-strict` を当てることで、改善方向が

- stop tightening
- strict entry

のどちらにあるかを判定する。

### 4. breadth-quality は strict 55 より balanced 50 + wide stop に戻すべきか

`breadth-quality-strict` が cross-universe で中位に残った一方、主力交代には至らなかった。  
そのため round9 では `breadth-quality-balanced-wide` を置き、

- quality 寄せが強すぎたのか
- それとも stop 6% が浅すぎたのか

を切り分ける。

## 実務上の扱い

- round9 でも **公開 CLI / MCP の固定経路は変えない**
- 実行は session artifact runner を使い、**shard parallel** を標準とする
- `unreadable 1回` 即 rollback の naive partial retry は使わない
- 同値 / duplicate に近い結果が出た枝は round10 候補から外す

## 仮説

1. breadth の最適形は `breadth-earlier` 単体か `breadth-earlier-guarded` に収束する
2. quality の最適形は `balanced` を中心に、guard の有無と stop 幅で微調整される
3. deep-pullback は `strict` に寄せるとやりすぎになり、`tight` が残る
4. breadth-quality は `strict` より `balanced-wide` の方が cross-universe で残りやすい

## round9 実結果

1. **quality family は依然として本線だが、運用上の最有力は `quality-strict-relaxed` になった**
   - Mag7 #2、alt #3
   - alt recovered で `20/20` readable
2. **`quality-strict` は raw false negative を回復して alt #1 まで戻った**
   - ただし `8/20` unreadable が残り、まだ確定 winner とまでは言い切れない
3. **deep-pullback は仮説どおり stable**
   - `deep-pullback-tight` と `deep-pullback-strict` が alt #4 / #5
   - 両方 `20/20` readable で benchmark として強い
4. **breadth-quality は `balanced-wide` が改善方向として当たった**
   - Mag7 #5、alt #2
   - 一方で pure breadth 側の `breadth-early-guarded-wide` は alt #8 まで下がった

## 実務上の結論

1. **結果の正規ソースは raw ではなく recovered summary**
   - round9 alt raw は `78 unreadable` で、recovered 後に `34 unreadable` まで改善した
2. **parallel 運用は今後も shard parallel + exact-pair rerun を標準にする**
   - full rerun ではなく unreadable pair だけを取り直す
3. **採用判断には readability を必ず併記する**
   - unreadable が 3〜4 割残る上位戦略は watchlist 扱いに留める
4. **round10 で優先して深掘る枝**
   - `quality-strict-relaxed`
   - `deep-pullback-tight`
   - `deep-pullback-strict`
   - `breadth-quality-balanced-wide`（ただし unreadable 改善が前提）
