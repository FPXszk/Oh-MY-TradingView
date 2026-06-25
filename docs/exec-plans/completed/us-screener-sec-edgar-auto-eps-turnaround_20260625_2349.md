# Exec-plan: us-screener-sec-edgar-auto-eps-turnaround_20260625_2349

## Goal

米国 daily screener で EPS YoY が欠損している銘柄について、SEC EDGAR Company Facts を自動取得し、前年同期間が赤字・直近期が黒字なら `黒字転換` と表示・採点できるようにする。

## Assumptions

- SEC EDGAR API は登録・APIキー不要で利用し、`SEC_USER_AGENT` に `Oh-MY-TradingView szk23b0702@gmail.com` を設定する。
- SEC API は全銘柄ではなく、既存データソース適用後も EPS YoY が欠損している米国銘柄だけに問い合わせる。
- SEC障害、CIK未解決、同期間比較不能の場合は既存処理を継続し、N/Aを維持する。
- 既存の `config/screener/us-fundamental-supplements.json` は例外上書き・フォールバックとして残す。
- SECのFair Accessに従い、同一実行内キャッシュと逐次取得で10 requests/secondを十分下回る。

## Scope

### In scope

- tickerからCIKを解決するSECクライアント。
- Company Factsから希薄化後EPSを抽出し、同じ会計区分・期間長の前年値と比較する処理。
- EPS YoY欠損銘柄だけへの自動補完。
- GitHub Actionsへの `SEC_USER_AGENT` Secret連携。
- 単体テストと既存スクリーナーテストによる回帰確認。

### Out of scope

- SECデータによる全財務指標の置換。
- Japan screenerへの適用。
- SEC提出書類HTML/PDFの保存。
- 比較不能な決算期間を推測で補完すること。

## Files

| File | Action | Purpose |
|---|---|---|
| `src/core/sec-edgar.js` | CREATE | ticker/CIK解決、Company Facts取得、EPS同期間比較 |
| `src/core/fundamental-screener.js` | MODIFY | EPS YoY欠損行へSEC自動補完を接続 |
| `.github/workflows/daily-screener.yml` | MODIFY | `SEC_USER_AGENT` Secretを実行環境へ渡す |
| `tests/sec-edgar.test.js` | CREATE | CIK解決、期間比較、失敗時フォールバックを検証 |
| `tests/fundamental-screener.test.js` | MODIFY | SEC自動補完が黒字転換表示・採点へ反映されることを検証 |
| `package.json` | MODIFY | 新規単体テストを `test:unit` に追加 |
| `docs/exec-plans/active/us-screener-sec-edgar-auto-eps-turnaround_20260625_2349.md` | CREATE | 本計画 |
| `docs/exec-plans/completed/us-screener-sec-edgar-auto-eps-turnaround_20260625_2349.md` | MOVE | 完了時に移動 |

## Implementation Steps

- [x] Step 1: SEC EDGARクライアントを追加する。
  - 確認: User-Agent必須、CIK 10桁化、同一実行内キャッシュ、失敗時null。
- [x] Step 2: EPS factsの同期間比較ロジックを実装する。
  - 確認: quarterly同士またはannual同士だけを比較し、前年EPS <= 0かつ現在EPS > 0だけ黒字転換にする。
- [x] Step 3: US missing metric supplementへ接続する。
  - 確認: 既存ソースでEPS YoYが欠損した銘柄だけSECを照会し、静的補完との互換性を保つ。
- [x] Step 4: GitHub ActionsへSecretを接続する。
  - 確認: メールアドレスをworkflowファイルへ直書きしない。
- [x] Step 5: focused testsを追加して実行する。
  - 確認: `node --test tests/sec-edgar.test.js tests/fundamental-screener.test.js`
- [x] Step 6: 全unit testsとレビューを実施する。
  - 確認: `npm run test:unit`
- [x] Step 7: 計画をcompletedへ移動し、実装をコミット・プッシュする。

## Risks

- XBRLタグはUS GAAPとIFRSで異なるため、対応タグを限定し、未知タグは判定不能にする。
- Company Factsには訂正・重複factがあるため、提出日が新しい有効値を優先する。
- fiscal year表記だけでは比較を誤る可能性があるため、frame、form、FP、期間長を使って同期間性を確認する。
- SEC側の一時制限や障害をスクリーナー全体の失敗にしない。

## Validation Commands

```powershell
node --test tests/sec-edgar.test.js tests/fundamental-screener.test.js
npm run test:unit
```

## Implementation Summary

- `src/core/sec-edgar.js` を追加し、SEC ticker mapとCompany Factsを同一実行内でキャッシュするようにした。
- 既存ソース適用後もEPS YoYが欠損する米国銘柄だけを逐次取得し、125ms間隔でSEC Fair Access上限を下回るようにした。
- 希薄化後EPSについて、最新期間と前年の同じFP・期間種別・期間長だけを比較し、前年EPS <= 0かつ現在EPS > 0の場合だけ黒字転換を付与するようにした。
- SEC取得失敗、CIK未解決、期間比較不能はN/Aのまま継続し、スクリーナー本体を失敗させない。
- `.github/workflows/daily-screener.yml` に `SEC_USER_AGENT` Secretを接続し、GitHub repository secretへ指定値を登録した。

## Validation Result

- focused tests: 22 passed
- `npm run test:unit`: 1001 passed
- live SEC probe: NBISを `黒字転換 (SEC -2.28 -> 0.33)` と判定し、MRVL/COHRは黒字転換対象外
- `git diff --check`: passed
