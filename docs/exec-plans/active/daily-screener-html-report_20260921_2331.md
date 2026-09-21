# Daily Screener HTML レポート自動生成

## 目的

米国株・日本株の fundamental screener が Markdown レポートを生成した直後に、同じ内容を読みやすい単体 HTML ファイルへ変換する。GitHub Actions の artifact と main へのレポート公開にも HTML を含め、ユーザーがブラウザで表を確認できるようにする。

## 前提と採用方針

- 出力先は米国株 `docs/reports/screener/daily-ranking.html`、日本株 `docs/reports/screener/daily-ranking-jp.html` とする。
- Markdown レポートの生成ロジックやランキング内容は変更しない。
- GFM テーブルを確実に変換するため、既存 Node.js 実行環境に `marked` を追加し、共通の変換スクリプトから利用する。
- HTML は外部 CSS や JavaScript を必要としない単体ファイルとし、広い表は横スクロールできるようにする。
- 現在作業ツリーにある screener レポート差分と既存の未追跡 handoff は、本実装コミットに含めない。

## 変更・作成対象

- 変更: `package.json`
  - Markdown 変換用の `marked` 依存関係を追加する。
- 変更: `package-lock.json`
  - 追加依存関係を固定する。
- 作成: `scripts/screener/render-markdown-report.mjs`
  - `--input` と `--output` を受け取り、UTF-8 Markdown をスタイル付き HTML に変換する。
- 変更: `.github/workflows/daily-screener.yml`
  - 米国株 Markdown 生成後に HTML を作成・検証し、artifact と公開対象に含める。
- 変更: `.github/workflows/daily-screener-japan.yml`
  - 日本株 Markdown 生成後に HTML を作成・検証し、artifact と公開対象に含める。
- 変更: `scripts/windows/github-actions/sync-daily-screener-report-to-main.ps1`
  - HTML パスを受け取り、既存のレポート関連ファイルと一緒に限定的に stage する。
- 作成: `tests/screener-html-report.test.js`
  - 見出し・強調・日本語・GFM テーブル・横スクロール用ラッパーを含む HTML 出力を検証する。
- 変更: `tests/daily-screener-contract.test.js`
  - 両 workflow の HTML 生成・artifact・公開、および PowerShell 公開スクリプトの HTML 対応を契約テストに追加する。
- 変更: `package.json` の test script
  - 新しい HTML 変換テストを `test:unit` に含める。
- 移動: 本計画ファイル
  - 実装完了後に `docs/exec-plans/completed/daily-screener-html-report_20260921_2331.md` へ移す。

## 影響範囲

- 対象は daily screener のレポート出力・artifact・main 公開だけ。
- LINE 通知、ランキング算出、監査 JSON、metadata の内容は変更しない。
- workflow 実行時に HTML が生成できなければ fail-fast し、不完全なレポートを公開しない。

## 実装手順と検証

- [ ] `marked` を追加し、共通 Markdown-to-HTML 変換スクリプトを実装する。
- [ ] HTML に UTF-8、読みやすい余白・配色、sticky header、横スクロール可能な表スタイルを付ける。
- [ ] 米国株・日本株 workflow に市場別 HTML パス、変換ステップ、存在検証を追加する。
- [ ] artifact upload と main 公開処理へ HTML を追加する。
- [ ] 変換単体テストと workflow／公開スクリプトの契約テストを追加する。
- [ ] `node --test tests/screener-html-report.test.js tests/daily-screener-contract.test.js` を実行する。
- [ ] `npm run test:unit` を実行する。
- [ ] 現在の米国株・日本株 Markdown を一時出力先へ変換し、主要見出しと表が HTML に存在することを確認する。
- [ ] diff をレビューし、変更が本計画の対象だけであることを確認する。
- [ ] 本計画を `docs/exec-plans/completed/` へ移し、Conventional Commit で実装をコミットして main へ push する。

## リスク

- 表の列数が多いため画面幅には収まらない。セルを潰さず、表コンテナの横スクロールで対応する。
- Markdown 内の HTML をそのまま許可すると意図しない要素が入る可能性があるが、入力は同一リポジトリが生成する screener レポートに限定する。
- `marked` の追加で `npm ci` の取得対象が1依存増える。

## 対象外

- レポートのランキング、列、指標、Markdown 本文の変更。
- HTML 上の検索、並び替え、フィルターなどの JavaScript UI。
- 既存レポート差分、監査データ、handoff 文書の整理やコミット。
- LINE メッセージへの HTML 添付や外部 Web ホスティング。
