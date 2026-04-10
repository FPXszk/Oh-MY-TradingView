# Exec Plan: stabilize-self-hosted-night-batch-service-and-rerun_20260411_0043

## 1) 背景 / 目的

self-hosted runner `omtv-win-01` は `run.cmd` 実行中のみ online になり、常駐していないことが `queued` の直接要因だった。  
lockfile 修正後は workflow run `24250975165` の `Install dependencies in WSL workspace` まで通過したため、次のボトルネックは `Start smoke gate and detached production` に絞られる。  
現時点の最有力仮説は、`scripts/windows/run-night-batch-self-hosted.cmd` の WSL 呼び出しで bash 側 `$CONFIG_PATH` が空になり、結果として `python/night_batch.py` が repository root を config として扱って `IsADirectoryError` を起こしたこと、および runner 常駐化後に顕在化する Windows service / WSL 権限差分である。  
本計画の目的は、**(1) runner を安定常駐化する**, **(2) wrapper 起因の失敗を TDD で潰す**, **(3) workflow を再実行して他の失敗要因を洗い出し、通るまで小さく反復する** ための実装手順を定義すること。

## 2) 変更/作成/削除するファイル

### repo 内で変更するファイル
- 変更: `.github/workflows/night-batch-self-hosted.yml`
- 変更: `scripts/windows/run-night-batch-self-hosted.cmd`
- 変更: `python/night_batch.py`
- 変更: `tests/night-batch.test.js`
- 作成: `tests/windows-run-night-batch-self-hosted.test.js`（wrapper 回帰専用。必要なら helper 単位で分離）

### 状況次第で変更候補にするファイル
- 変更候補: `package.json`（既存 test 実行対象に新規 test file を追加する必要がある場合のみ）

### 削除予定
- なし

## 3) repo 内実装と Windows ホスト側手動作業の分離

### A. repo 内実装
1. `run-night-batch-self-hosted.cmd` の config 引き渡しを修正する  
   - bash 側の `$CONFIG_PATH` 参照をやめ、**cmd で確定した値を安全に WSL へ受け渡す** 形に変更する。  
   - backslash / space を含む path でも値欠落しないようにする。  
2. `python/night_batch.py` に fail-fast を追加する  
   - `--config` が空文字、directory、存在しない path のとき、`IsADirectoryError` 任せにせず原因が分かるエラーにする。  
3. wrapper 回帰テストを追加する  
   - 「Windows path が欠落せず WSL 側へ渡る」「空 config を拒否する」を RED で固定する。  
4. workflow を観測しやすくする  
   - `Start smoke gate and detached production` 失敗時に、config 値・WSL 側の実解決 path・summary/log の採取点が分かるよう最小限の診断を足す。  
5. rerun で新たに見つかった failure を小さく追加修正する  
   - 1 回で全部直す前提にせず、workflow の次の失敗点を 1 つずつ潰す。  

### B. Windows ホスト側で必要な手動作業
1. `omtv-win-01` runner を `run.cmd` 常駐ではなく **Windows service** 化する  
   - actions-runner ディレクトリで `svc` ベースの install / start / status 確認を行う。  
2. service のログオンアカウントを確認する  
   - `wsl.exe` と対象 distro / `/mnt/c/actions_runner/_work/...` にアクセスできる Windows ユーザーで動かす。  
   - LocalSystem で WSL が見えない場合は、runner service の実行アカウントを見直す。  
3. 自動復旧を設定する  
   - service 再起動ポリシー、OS 再起動後の自動起動、ネットワーク復旧後の再接続を確認する。  
4. ホスト上で事前疎通確認する  
   - service 状態が online で維持されること  
   - 同じアカウントで `wsl.exe bash -lc "pwd"` と repository/workspace 到達ができること  
5. repo 側修正を取り込んだ後、workflow_dispatch を再実行する。

## 4) 実装内容と影響範囲

### 影響範囲
- GitHub Actions: self-hosted Windows job の起動安定性と失敗時診断
- Windows wrapper: WSL への引数受け渡し
- Python nightly batch: config 読み込みエラーハンドリング
- Test suite: night batch / wrapper 回帰テスト

### Out of Scope
- TradingView 戦略ロジックそのものの改善
- self-hosted runner ホストの OS 再構築や WSL 再インストール
- GitHub Actions 以外の workflow の恒久最適化
- detached production の戦略成績改善
- Windows ホストをこの Linux セッションから直接操作すること

## 5) TDD 方針（RED → GREEN → REFACTOR）

### RED
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` を追加し、wrapper の config 受け渡しバグを失敗で固定する  
  - ケース1: `config\\night_batch\\bundle-detached-reuse-config.json` が空にならず WSL 側コマンドへ渡ること  
  - ケース2: space を含む path でも壊れないこと  
  - ケース3: round-mode 自動判定時でも同じ config が使われること
- [ ] `tests/night-batch.test.js` に `--config` が空文字 / directory のとき明示エラーで落ちるテストを追加する
- [ ] 必要なら workflow step 失敗時の summary/log 出力不足を再現する最小テストまたは既存テスト拡張で固定する

### GREEN
- [ ] wrapper 実装を最小変更で修正し、RED の新規 test を通す
- [ ] `python/night_batch.py` に defensive validation を追加し、directory 読み込み事故を分かるエラーへ置き換える
- [ ] workflow の診断出力を最小限追加し、失敗時に次のボトルネックを追える状態にする

### REFACTOR
- [ ] wrapper 内の quoting / path normalize / round-mode 分岐を読みやすく整理する
- [ ] test fixture 重複が出たら helper 化する
- [ ] workflow rerun で新しい failure が見つかった場合も、同じ RED→GREEN→REFACTOR で 1 点ずつ追加する

## 6) チェックボックス形式の実装ステップ

- [ ] 既存 active plan 2 本の重複を整理し、この plan を主計画として扱う前提を明示する
- [ ] `.github/workflows/night-batch-self-hosted.yml` / `scripts/windows/run-night-batch-self-hosted.cmd` / `python/night_batch.py` / 既存 tests を再確認し、修正境界を確定する
- [ ] wrapper バグ回帰 test を先に追加して RED を作る
- [ ] config 空文字 / directory 誤読に対する Python 側 test を追加して RED を作る
- [ ] wrapper の config 受け渡しを修正して GREEN にする
- [ ] Python 側の fail-fast を実装して GREEN にする
- [ ] workflow 失敗時の観測性を最小限強化する
- [ ] Linux 側で既存 test コマンドを実行し、night batch 回帰がないことを確認する
- [ ] Windows ホスト側で runner service 化と WSL アクセス確認を実施してもらう
- [ ] `gh workflow run .github/workflows/night-batch-self-hosted.yml` で再実行する
- [ ] 新しい失敗点が出たら、その failure を証拠化して RED に落とし込み、小さく修正する
- [ ] workflow が最後まで通るか、repo 側では直せない host 制約だけが残るまで反復する

## 7) 既存コマンドによる検証方針

### repo 内
- `npm test`
- `node --test tests/night-batch.test.js tests/windows-run-night-batch-self-hosted.test.js`
- 必要に応じて `npm run test:all`

### workflow / GitHub
- `gh workflow run .github/workflows/night-batch-self-hosted.yml -f config_path=config/night_batch/bundle-detached-reuse-config.json`
- `gh run watch <run-id>`
- `gh run view <run-id> --log-failed`

### Windows ホスト手動確認
- runner service の install / start / status 確認
- service 実行アカウントでの `wsl.exe bash -lc "pwd"`
- service 化後に GitHub Actions UI 上で `omtv-win-01` が継続 online になること

> カバレッジ 80% 目標は、今回追加する wrapper / night-batch 周辺 test の充実で担保する。repo に専用 coverage script が無い場合は、既存 test コマンドを優先しつつ、実装時に必要最小限の補助確認を判断する。

## 8) リスク

- runner を service 化すると、`run.cmd` 時と異なる Windows アカウントで動き、**WSL が見えなくなる** 可能性がある
- wrapper 修正だけでなく、service 環境では path / permission / current directory の差で別の不具合が連鎖する可能性がある
- Linux では `.cmd` を直接実行できないため、wrapper 回帰 test は testable seam を切る設計が必要になる
- workflow rerun のたびに別 failure が表面化し、想定より反復回数が増える可能性がある
- Windows ホスト作業はこのセッションから代行できないため、最後の詰めは手動作業の品質に依存する

## 9) 既存 active plan との衝突観点

- `docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md` とは、runner 未常駐による queued 調査が重複する  
- `docs/exec-plans/active/run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md` とは、workflow rerun と失敗観測の目的が重複する  
- 本 plan は **「queued 原因の確定」+「rerun 観測」+「repo 側修正」+「Windows service 常駐化前提」** を一体で扱うため、実装着手前に主従関係を整理しないと active plan が競合する  
- 推奨整理: この plan を主計画にし、既存 2 plan は参照用に統合または完了扱いへ寄せる
