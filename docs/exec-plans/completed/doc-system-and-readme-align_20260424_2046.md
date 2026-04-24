# DOCUMENTATION_SYSTEM.md と README.md のリポジトリ構造整合

## 背景

現在のリポジトリ構造と、`docs/DOCUMENTATION_SYSTEM.md` および `README.md` に記載されているパスが乖離している。
現在のリポジトリ構造を正として両ドキュメントを修正する。

## 現在のリポジトリ構造（正）

```
docs/
  DOCUMENTATION_SYSTEM.md
  exec-plans/ (active, completed)
  references/
    design-ref-llms.md
    pine/
  reports/ (archive)
  research/
    archive/ (retired/)
    artifacts-backtest-scoreboards.md
    manifest.json
    night-batch-self-hosted-run64_20260424.md
  sessions/ (archive)
  strategy/
    current-strategy-reference.md
    current-symbol-reference.md
    theme-momentum-definition.md
artifacts/
  campaigns/
logs/
  tradingview-recovery.log
config/
  backtest/
    strategy-presets.json
    strategy-catalog.json
    campaigns/archive
    universes/archive
```

## 旧パス → 現パスの対応

| 旧パス（ドキュメント記載） | 現パス（実際） |
|---|---|
| `docs/research/current/` | 廃止。`docs/research/` 直下に manifest.json 管理 |
| `docs/research/strategy/` | `docs/strategy/` |
| `docs/research/strategy/retired/` | `docs/research/archive/retired/` |
| `references/backtests/` | 廃止 |
| `references/pine/` | `docs/references/pine/` |
| `references/external/` | `docs/references/design-ref-llms.md` |
| `logs/sessions/` | `docs/sessions/` |
| `plans/exec/` | `docs/exec-plans/` |
| `config/backtest/campaigns/current/` | 廃止（campaigns/archive のみ） |
| `config/backtest/universes/current/` | 廃止（universes/archive のみ） |

## 修正ファイル

- [ ] `docs/DOCUMENTATION_SYSTEM.md`
- [ ] `README.md`

## 実装ステップ

### docs/DOCUMENTATION_SYSTEM.md

- [ ] 基本原則を修正（`references/` → `docs/references/`、`logs/` の説明修正、`plans/` → `docs/exec-plans/`）
- [ ] 主な配置テーブルを現在のパスに更新
- [ ] 更新ルールを現在のパスに修正
- [ ] 読み分けセクションを現在のパスに修正

### README.md

- [ ] 先頭リンク集から存在しないパスを修正（docs/research/current/ 関連、logs/sessions/、references/* 関連）
- [ ] 「迷ったらこの順番」セクションのパスを修正
- [ ] Phase 1 experiment 説明内のパス参照を修正

## 影響範囲

- ドキュメントのみ。ソースコードへの変更なし
- 関連テスト（tests/repo-layout.test.js）が参照するパスを確認し、必要なら調整
