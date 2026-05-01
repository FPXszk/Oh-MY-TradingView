# fix: codex --full-auto フラグ削除対応

**作成日時**: 2026-05-01 17:24  
**対象ブランチ**: main

## 問題

codex アップデート後、`--full-auto` フラグが廃止され起動エラーが発生する。

```
error: unexpected argument '--full-auto' found
```

## 原因

`devinit.sh` line 163 のコマンドに `--full-auto` が含まれているが、新バージョンの codex では削除された。  
`--ask-for-approval never` が既に同じコマンドに存在しており、等価な動作を提供する。

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `devinit.sh` | line 163 から `--full-auto` を除去 |

## 変更前後

**変更前 (line 163):**
```bash
agent_cmd="cd $(escape "${ROOT_DIR}") && codex --full-auto --sandbox workspace-write --ask-for-approval never --cd $(escape "${ROOT_DIR}") --add-dir $(escape "${ROOT_DIR}")"
```

**変更後 (line 163):**
```bash
agent_cmd="cd $(escape "${ROOT_DIR}") && codex --sandbox workspace-write --ask-for-approval never --cd $(escape "${ROOT_DIR}") --add-dir $(escape "${ROOT_DIR}")"
```

## 実装ステップ

- [ ] `devinit.sh` line 163 から `--full-auto ` を除去
- [ ] `codex --help` で残フラグが有効であること確認
- [ ] 変更をコミット & プッシュ

## 影響範囲

- `devinit.sh` のみ（1行・1箇所）
- `just dev` の動作が復旧する
