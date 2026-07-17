# Screener repo .env load

作成: 2026-07-17 18:42 JST

## 目的

日本株スクリーニング実行時に、リポジトリ直下の `.env` に書いた `EDINET_API_KEY` を自動で読み込み、GitHub Actions 相当のスクリーニング条件で EDINET API が `active` になることを確認する。

## 変更ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 依存追加なしでリポジトリ直下 `.env` を起動時に読む最小ローダーを追加する。既存の OS / Actions 環境変数は上書きしない。 |
| `tests/daily-screener-report.test.js` | MODIFY | `.env` ローダーが未設定の環境変数だけを補完し、既存値を上書きしないことをテストする。 |
| `docs/exec-plans/active/screener-repo-env-load_20260717_1842.md` | CREATE then MOVE | 実装完了後に `docs/exec-plans/completed/` へ移動する。 |

## 影響範囲

- 対象は `scripts/screener/run-fundamental-screening.mjs` を直接起動するスクリーニング実行のみ。
- GitHub Actions では secrets 由来の `EDINET_API_KEY` が既にある場合、それを優先し `.env` では上書きしない。
- `.env` が存在しない場合は何もせず、従来通り環境変数だけを見る。
- `.env` の値や API キー本体はログ出力しない。

## 実装ステップ

- [x] 既存の `process.env` 読み取り前に動く repo 直下 `.env` ローダーを追加する。
- [x] `.env` パーサーは `KEY=value`、空行、コメント、単純な引用符だけに対応する。
- [x] 既に `process.env.KEY` が設定済みの場合は `.env` の値で上書きしない。
- [x] 既存テストに `.env` 補完 / 上書き禁止の契約テストを追加する。
- [x] GitHub Actions 相当の日本株スクリーニング env で実行し、EDINET が `active` になることを確認する。
- [x] 計画ファイルを `docs/exec-plans/completed/` に移動する。

## 検証

```powershell
node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js tests/daily-screener-contract.test.js
```

```powershell
$env:SCREENER_WORKFLOW_LABEL = "daily-screener-japan"
$env:SCREENER_REPORT_PATH = "artifacts/edinet-env-test/daily-ranking-jp-repo-env-autoload.md"
$env:SCREENER_RESULT_LIMIT = "90"
$env:SCREENER_MARKET = "japan"
$env:SCREENER_EXCHANGES = "TSE"
$env:SCREENER_SYMBOL_ALLOWLIST_KEY = "jpx-prime"
$env:SCREENER_SELECTED_SECTOR_COUNT = "5"
$env:SCREENER_GROSS_MARGIN_MIN_PCT = "30"
$env:SCREENER_SCOPE_LABEL = "JPX Prime domestic stocks snapshot (2026-03-31)"
$env:SCREENER_CURRENCY_SYMBOL = "¥"
Remove-Item Env:EDINET_API_KEY -ErrorAction SilentlyContinue
node scripts/screener/run-fundamental-screening.mjs
```

期待結果:

- ログに `edinet enabled=true reason=active` が出る。
- レポートに `EDINET: active / ... / 指標補完 ...銘柄` が出る。

## リスク・注意点

- `.env` はリポジトリ直下のみを対象にする。`C:\Users\szk\.codex\.env` は Codex 全体設定なのでスクリーニング本体の自動ロード対象にしない。
- 複雑な dotenv 仕様展開は行わない。今回必要な `EDINET_API_KEY=...` を安全に読む最小範囲に限定する。
- 検証で生成する `artifacts/edinet-env-test/` はコミット対象外にする。

## スコープ外

- GitHub Actions secrets の値や登録方式の変更。
- LINE 通知の secrets / 送信フロー変更。
- `AGENTS.md` の変更。
