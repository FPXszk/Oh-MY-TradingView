# moomoo OpenAPI 環境確認

## 現在の結論

- **`moomoo-api` は WSL 側へ導入済み**
- **Windows 側 OpenD の導入とログインは完了**
- **Windows 側 OpenD は `127.0.0.1:11111` で listen している**
- **WSL 側からは Windows portproxy 経由の `172.31.144.1:11112` で到達できる**

OpenD の導入・起動・ログイン自体は完了した。OpenD は `127.0.0.1:11111` 固定で待ち受けており、`OpenD.xml` の `<ip>` を `0.0.0.0` にしても実 listen は変わらなかった。そのため Windows 側で `0.0.0.0:11112 -> 127.0.0.1:11111` の portproxy を構成し、WSL 側 Python からは `172.31.144.1:11112` を使う構成で live 検証を再開した。

## 環境構成

| 項目 | 値 |
| --- | --- |
| OS | Linux (WSL) |
| Python | 3.10.12 |
| `moomoo-api` | 10.05.6508 |
| OpenD 接続候補 1 | `127.0.0.1:11111` |
| OpenD 接続候補 2 | `host.docker.internal:11111` |
| OpenD dashboard 表示 | ログイン成功、可視化確認済み |
| OpenD listen 実測 | Windows 側 `127.0.0.1:11111` |
| WSL→Windows 接続方法 | Windows portproxy 経由 `172.31.144.1:11112` |

## 実行ログ

### 1. パッケージ導入確認

実行コマンド:

```bash
python3 --version
pip show moomoo-api
pip install moomoo-api
```

結果:

- `Python 3.10.12`
- `pip show moomoo-api` は **not found**
- `pip install moomoo-api` は **成功**

導入時に確認できた依存:

- `PyCryptodome`
- `simplejson`
- 既存 `pandas`, `protobuf`, `numpy`

### 2. OpenD 接続確認

実行方針:

1. TCP レベルで疎通確認
2. 到達できた候補に対して `ft.OpenQuoteContext(...)` + `get_global_state()` を実行

実行結果:

| host:port | TCP 結果 | OpenQuoteContext 実査 | 補足 |
| --- | --- | --- | --- |
| `127.0.0.1:11111` | `ConnectionRefusedError: [Errno 111] Connection refused` | 未到達のため未実施 | ローカル Windows/WSL 側で待受なし |
| `host.docker.internal:11111` | `TimeoutError: timed out` | 未到達のため未実施 | WSL から Windows 側へ到達できず |

### 3. OpenD 導入・ログイン完了後の再確認

確認済み事実:

- Windows 側 `moomoo_OpenD.exe` はインストール済み
- ユーザーは OpenD へログイン成功し、ダッシュボード表示も確認済み
- 規制対応の questionnaire / agreement はログイン導線上で完了済みとみなせる状態
- OpenD dashboard の表示では `API Port = 11111`
- 権限表示の例として `US Market: Stocks LV3`, `Crypto: LV1` を確認

Windows 側実測:

```text
LocalAddress LocalPort OwningProcess State
127.0.0.1    11111     <moomoo_OpenD PID> Listen
```

WSL 側再試験結果:

| host:port | TCP 結果 | OpenQuoteContext 実査 | 補足 |
| --- | --- | --- | --- |
| `127.0.0.1:11111` | `ConnectionRefusedError: [Errno 111] Connection refused` | 接続失敗 | Windows 側 loopback bind のため WSL から見えない |
| `host.docker.internal:11111` | `TimeoutError: timed out` | 未到達 | 今回の環境では Windows 側 OpenD へ届かない |
| `172.31.144.1:11112` | 接続成功 | `get_global_state()` 成功 | Windows portproxy (`11112 -> 127.0.0.1:11111`) |

導入前に確認していたユーザー状況:

- Windows 側では **OpenD 未導入**
- moomoo アカウントも **未ログイン**

## エラー記録

### `127.0.0.1:11111`

```text
ConnectionRefusedError: [Errno 111] Connection refused
```

### `host.docker.internal:11111`

```text
TimeoutError: timed out
```

## ここまでで分かったこと

- WSL 側の Python SDK 準備は完了した
- OpenD の Windows 側セットアップとログイン自体は完了した
- OpenD は GUI の Listening Address / `OpenD.xml` を変えても実際には `127.0.0.1:11111` で listen した
- 現状の安定経路は Windows portproxy を使う方法で、WSL 側からは `172.31.144.1:11112` を使う
- `OpenQuoteContext(...).get_global_state()` はこの経路で成功し、`trd_logined=True`, `qot_logined=True`, `program_status_type='READY'` を確認した

## 再開時に必要な確認

1. ペーパートレード (`SIMULATE`) 口座が有効か確認する
2. 検証対象市場 (US / HK / A / 先物 / 仮想通貨) とリアルタイム権限 (LV1 / LV2) を確定する
3. quote / trade sample は `MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112` で実行する
