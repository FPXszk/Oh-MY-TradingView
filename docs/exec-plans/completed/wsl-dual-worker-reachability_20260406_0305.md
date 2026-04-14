# Exec Plan: WSL dual-worker reachability - proxy layer切り分けと最小復旧

## Problem

### 確認済み事実

- active plan は `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- session log は `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- 両 TradingView worker は最終的に Windows localhost の `9222` / `9224` で `json/version` 成功
- `9223` / `9225` の portproxy 経由は Windows / WSL の両方で `connection reset`
- `src/connection.js` は `TV_CDP_HOST` / `TV_CDP_PORT` の単一 endpoint を参照するだけで、proxy 障害の直接原因ではなさそう
- `docs/command.md` には worker2 起動・portproxy 確認手順がある

### これから検証する仮説

- `netsh interface portproxy` の rule 自体は存在していても、Windows の listen 側が正常に受けていない
- IP Helper (`iphlpsvc`) の状態不整合で forwarding が機能していない
- `0.0.0.0:9223` / `0.0.0.0:9225` の bind / listen 実体が壊れている
- localhost 宛ての `connectaddress=127.0.0.1` への転送で portproxy 固有の問題が起きている
- portproxy 固有問題が解けない場合、WSL から使う forwarding 手段を別方式に切り替える方が早い

## Approach

既存 active plan をこの次段階の plan として更新し、焦点を TradingView 起動確認から **Windows portproxy / listen / service state の切り分け**へ移します。

進め方は以下です。

1. まず proxy 層の観測事実を増やす
   - portproxy rule
   - listening state
   - IP Helper 状態
   - Windows localhost 経由と WSL 経由の差分
2. 次に最小回復アクションを小さく試す
   - rule 再作成
   - IP Helper 再起動相当の確認
   - listen / connect address の見直し
3. それでも portproxy 固有問題が残る場合は、WSL から利用できる代替 forwarding 手段を比較し、最小運用案を決める
4. 変更が必要な場合のみ `docs/command.md` や関連 docs を最小更新する

## Relationship to existing active plans

- 本 plan は `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md` を上書き更新する次段階 plan であり、別 active plan を新設しない
- 既存 plan の「worker1 / worker2 が生きているか」の確認フェーズは完了し、今回からは proxy 層が主対象
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md` の観測結果を引き継ぐ
- 既存 active plan との競合は避け、同一テーマの継続として扱う

## Files / assets touched

### 必ず参照するもの

- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/command.md`

### 条件付きで更新候補

- `docs/command.md`
- `README.md`
- `docs/working-memory/session-logs/wsl-dual-worker-reachability_20260406_0305.md`

### 参照のみ

- `src/connection.js`

### 環境資産

- Windows TradingView worker1: `127.0.0.1:9222`
- Windows TradingView worker2: `127.0.0.1:9224`
- Windows portproxy listen ports: `9223` / `9225`
- WSL から見える Windows host IP

## In scope

- Windows portproxy / IP Helper / listen 側状態の切り分け
- `9223` / `9225` の reset 発生条件の再現と観測
- 最小回復アクションの検討と実施
- portproxy が解けない場合の代替 forwarding 手段の比較
- 必要最小限の `docs/command.md` / `README.md` 更新案作成

## Out of scope

- TradingView 本体の新規起動方式の大幅変更
- `src/connection.js` の multi-endpoint 対応
- worker orchestration 実装
- 並列 backtest 本体の実装
- proxy 問題と無関係な repo 全体の整理
- 無関係な docs の全面改稿

## Test strategy

このタスクは環境調査中心のため、運用上の RED -> GREEN -> REFACTOR で進めます。

### RED

- Windows localhost `9222` / `9224` は成功する一方で、`9223` / `9225` は Windows / WSL の両方で reset する状態を再確認する
- 失敗を proxy 層の問題として固定し、TradingView 起動問題と切り分ける

### GREEN

- 最小回復アクション後に、Windows から `9223` / `9225` の `json/version` が成功する
- その後 WSL から `9223` / `9225` の `json/version` が成功する
- 可能なら `TV_CDP_HOST` / `TV_CDP_PORT` を使った CLI `status` でも両系成功する
- もし portproxy 修復が不能なら、代替 forwarding 手段で同等の到達性を確保する

### REFACTOR

- 再発防止のため、必要最小限の確認順序を `docs/command.md` に整理する
- 恒久運用案が portproxy 以外になる場合、その採用理由と実行手順を最小限で文書化する

## Validation commands

### Windows: TradingView の直接到達確認

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version -TimeoutSec 3
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9224/json/version -TimeoutSec 3
```

### Windows: portproxy rule 確認

```powershell
netsh interface portproxy show all
```

### Windows: listen / service 状態確認

```powershell
Get-Service iphlpsvc
netstat -ano | findstr :9223
netstat -ano | findstr :9225
```

### Windows: proxy 経由の到達確認

```powershell
curl.exe http://127.0.0.1:9223/json/version
curl.exe http://127.0.0.1:9225/json/version
```

### WSL: proxy 経由の到達確認

```bash
curl -sS http://<windows-host-ip>:9223/json/version
curl -sS http://<windows-host-ip>:9225/json/version
```

### WSL: CLI 確認

```bash
TV_CDP_HOST=<windows-host-ip> TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=<windows-host-ip> TV_CDP_PORT=9225 node src/cli/index.js status
```

### 代替 forwarding 候補の検証用

```powershell
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=9223 connectaddress=127.0.0.1 connectport=9222
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=9225 connectaddress=127.0.0.1 connectport=9224
```

## Risks

- `iphlpsvc` 再起動や rule 再作成で一時的に他の forwarding へ影響する可能性がある
- `netstat` 上で listen が見えても HTTP forwarding が失敗する可能性がある
- WSL 側の Windows host IP が変動し、再確認が必要になる可能性がある
- portproxy の不具合が OS 側要因の場合、repo 内修正では解決できない
- 代替 forwarding 手段は恒久運用性・手順簡潔性・再起動耐性の比較が必要

## Steps

- [ ] 既存 active plan を本 proxy 切り分けフェーズ向けに更新する
- [ ] session log の確認済み事実を「再確認不要な前提」と「今回検証する仮説」に分離する
- [ ] Windows localhost `9222` / `9224` が引き続き成功することを確認する
- [ ] `netsh interface portproxy show all` で `9223` / `9225` の rule を確認する
- [ ] `Get-Service iphlpsvc` で IP Helper の状態を確認する
- [ ] `netstat -ano | findstr :9223` / `:9225` で listen 側状態を確認する
- [ ] Windows から `127.0.0.1:9223` / `127.0.0.1:9225` を叩き、reset を再確認する
- [ ] WSL から `<windows-host-ip>:9223` / `:9225` を叩き、Windows 側との差分有無を確認する
- [ ] 観測結果から原因候補を以下のどれかに絞る
  - [ ] rule 不整合
  - [ ] IP Helper 状態不整合
  - [ ] listen 側異常
  - [ ] localhost 宛て forwarding の portproxy 固有問題
  - [ ] その他 OS 側要因
- [ ] 最小回復アクションを 1 つずつ実施し、各アクション後に Windows / WSL 両方で再検証する
- [ ] `9223` / `9225` が復旧した場合、CLI `status` で実利用可能性まで確認する
- [ ] portproxy 固有問題が解けない場合、WSL から使える代替 forwarding 手段を比較する
- [ ] 代替案を「導入コスト」「再起動耐性」「手順の短さ」「repo 運用との相性」で比較する
- [ ] 最小運用案を 1 つに絞る
- [ ] 必要な場合のみ `docs/command.md` または `README.md` を最小更新する
- [ ] 実施結果と採用理由を session log に追記する
