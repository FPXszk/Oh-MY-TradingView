# Windows Native Workspace Migration Session Log 20260620_1027

## Summary

WSL 側 `/home/fpxszk/code/Oh-MY-TradingView` から Windows native 側 `C:\00_mycode\Oh-MY-TradingView` へ、`.git` を含めてリポジトリを同期した。WSL 側は削除せずバックアップとして残した。

## Source State

- `git status -sb`: `## main...origin/main`
- `git log --oneline -1`: `5364da0 docs: windows-native-workspace-migration_20260620_1027`
- `git remote -v`:
  - `origin git@github.com:FPXszk/Oh-MY-TradingView.git (fetch)`
  - `origin git@github.com:FPXszk/Oh-MY-TradingView.git (push)`
- `git rev-list --left-right --count main...origin/main`: `0 0`

## Sync

- Destination: `C:\00_mycode\Oh-MY-TradingView`
- WSL path: `/mnt/c/00_mycode/Oh-MY-TradingView`
- Command shape: `rsync -a --delete`
- Included: `.git`
- Excluded:
  - `node_modules`
  - `.next`
  - `dist`
  - `coverage`
  - `.cache`
- Post-copy `.git`: exists
- Excluded directories after sync: absent before `npm install`

## Windows Process Verification

Direct Windows process execution from this WSL session was blocked:

- `powershell.exe -NoProfile -Command ...`: `cannot execute binary file: Exec format error`
- `cmd.exe /c ver`: `cannot execute binary file: Exec format error`

Because of this, the exact Windows PowerShell checks requested by the migration task could not be completed from this Codex session:

- `node -p "process.platform"` as Windows native `win32`
- `node -p "process.cwd()"` from Windows PowerShell
- Windows-native `npm install`
- Windows-native `npm run test:unit`
- Windows-native `npm run test:night-batch`

Fallback verification was performed from WSL against the Windows filesystem path.

## Fallback Verification On Windows Filesystem Path

- Working directory: `/mnt/c/00_mycode/Oh-MY-TradingView`
- `node -p "process.platform"`: `linux`
- `node -p "process.cwd()"`: `/mnt/c/00_mycode/Oh-MY-TradingView`
- `git status -sb`: `## main...origin/main`
- `git log --oneline -1`: `5364da0 docs: windows-native-workspace-migration_20260620_1027`
- `git remote -v`:
  - `origin git@github.com:FPXszk/Oh-MY-TradingView.git (fetch)`
  - `origin git@github.com:FPXszk/Oh-MY-TradingView.git (push)`
- `git diff --stat`: no output
- `git diff --check`: no output

## Dependency And Test Results

- `npm install`: passed
  - Added 95 packages.
  - Audit reported 7 existing vulnerabilities: 4 moderate, 3 high.
- `npm run test:unit`: passed
  - Tests: 992
  - Failures: 0
- `npm run test:night-batch`: passed
  - Tests: 129
  - Failures: 0

## Notes For Next Session

- 今後 Codex App で開くべきパスは `C:\00_mycode\Oh-MY-TradingView`。
- このセッションの制限により Windows PowerShell からの native 実行確認は未完了。Windows 側で開き直した次セッションでは、最初に `node -p "process.platform"` が `win32` になることを確認する。
- `origin` は移行元の設定どおり SSH remote の `git@github.com:FPXszk/Oh-MY-TradingView.git` を保持している。
- `/mnt/c` 上で WSL Git を使うと file mode 差分が出たため、移行先ローカル設定として `core.filemode=false` を設定済み。
