# Exec-plan: screener-line-official-account-push_20260611_1004

## 目的

`daily-screener` / `daily-screener-japan` の GitHub Actions 実行結果を、`LINE Official Account + Messaging API` で自分宛て push 通知できる状態にする。

成功条件:

- US / JP workflow の成功時に、各レポート要約を LINE push 用 payload に変換できる
- workflow 失敗時にも最低限の失敗通知を送れる
- 通知処理は GitHub Secrets 未設定時に明示的に skip でき、既存 report publish を壊さない
- ローカル test で workflow への通知組み込みと payload 生成を固定できる
- 手動で必要な LINE 側セットアップ手順を docs と最終報告で明示できる

## スコープ

### 変更・作成ファイル

| ファイル | 区分 | 内容 |
|---|---|---|
| `docs/exec-plans/active/screener-line-official-account-push_20260611_1004.md` | CREATE | 本計画 |
| `.github/workflows/daily-screener.yml` | MODIFY | US screener workflow に LINE 通知 step / env を追加 |
| `.github/workflows/daily-screener-japan.yml` | MODIFY | JP screener workflow に LINE 通知 step / env を追加 |
| `scripts/line/send-screener-line-message.mjs` | CREATE | metadata + markdown report から LINE Messaging API push payload を組み立てて送信 |
| `tests/daily-screener-report.test.js` | MODIFY | workflow に LINE 通知 step があることを固定 |
| `tests/line-screener-notify.test.js` | CREATE | 通知本文生成、skip 条件、market別要約を固定 |

### 影響範囲

- 日次スクリーニング workflow 2本
- Node 20 実行環境での追加 script 実行
- GitHub Secrets 運用 (`LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TO_USER_ID`)

### Out of scope

- Portfolio Health Check / SBI / moomoo workflow への通知追加
- LINE webhook 受信 bot、双方向会話、rich menu
- LINE notification messages の法人申請対応
- 複数 recipient や audience 配信

## 実装方針

- 通知本文は Markdown 全文送信ではなく、レポート冒頭と Phase1 / Phase4 の要点だけを抽出した短い text message にする
- 既存 workflow の report 生成と WSL publish は維持し、通知は publish 後に追加する
- Secrets 未設定時は fail にせず skip して、workflow 本体の価値を落とさない
- 失敗通知は report 非生成でも送れるよう、workflow 名 / run URL / branch / attempt を直接環境変数から渡す
- テストは payload builder を export して unit test する

## 実装ステップ

- [ ] Step 1: 通知 script の I/O と workflow 差し込み位置を確定する
  - 確認: `.github/workflows/daily-screener.yml`, `.github/workflows/daily-screener-japan.yml`, `tests/daily-screener-report.test.js`
- [ ] Step 2: LINE push script を追加し、US/JP report から短い通知本文を生成できるようにする
  - 確認: `scripts/line/send-screener-line-message.mjs` に成功通知 / 失敗通知 / skip 判定がある
- [ ] Step 3: workflow 2本へ success/failure 通知 step と必要 env を追加する
  - 確認: 成功時は report path と metadata path を渡し、失敗時は report なしでも script を呼べる
- [ ] Step 4: unit test を追加・更新して通知仕様を固定する
  - 確認: `tests/daily-screener-report.test.js`, `tests/line-screener-notify.test.js`
- [ ] Step 5: ローカル検証を実行し、手動セットアップ事項を整理する
  - 確認: 指定 test が pass し、必要 secrets / LINE Console 操作を列挙できる

## テスト戦略

- RED: 通知 script test と workflow test を先に追加し、未実装で失敗させる
- GREEN: script と workflow を最小実装して test を通す
- REFACTOR: 通知本文の抽出ロジックを整理しつつ既存 workflow 挙動を維持する

## 検証コマンド

- `node --test tests/daily-screener-report.test.js tests/line-screener-notify.test.js`

## リスク / 注意点

- LINE の `userId` 取得は repo から自動化しない。LINE Developers Console または webhook follow event が必要
- GitHub Actions の Secret 未設定時挙動を誤ると毎回失敗通知 step が落ちるので、skip 条件を明示する
- LINE text message の長さと可読性のため、送信内容は厳しく要約する
- 既存 active plan は screener architecture / JP theme 系であり、今回の workflow 通知追加とは直接競合しないが、同じ workflow ファイルを触るため差分競合には注意する
