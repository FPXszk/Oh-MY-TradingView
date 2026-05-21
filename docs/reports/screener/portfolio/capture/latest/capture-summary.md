# SBI Portfolio Capture Summary

- generated_at: 2026-05-21T10:54:23.931Z
- cdp_endpoint: 127.0.0.1:9222
- target_title: 配当金・分配金履歴｜SBI証券
- target_url: https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2022%2F01%2F01&dispositionDateTo=2026%2F05%2F21
- dry_run: false

## Endpoint Probe

- endpoint_reachable: true
- version_ok: true
- list_ok: true
- browser: Chrome/148.0.7778.178
- protocol_version: 1.3
- target_count: 10

## Capture

- current_page_saved: true
- every_asset_attempted: true
- every_asset_captured: true
- account_assets_captured: true
- csv_download_success: false

## Route Captures

### 米国株式

- attempted: true
- clicked: false
- captured: false
- csv_download_success: false
- page_url: n/a
- snapshot: us-stocks-page
- note: Attempt 1: base navigation: {"url":"https://login.sbisec.co.jp/login/entry?_ReturnPageInfo=WPLETsmR001Control%2FWPLETsmR001Sdtl18%2FNoActionID%2FDSWPLETsmR001Control&_ALLPARAM_JSON=%7B%22getFlg%22%3A%22on%22%2C%22OutSide%22%3A%22on%22%7D&eventCode=&channel=main-site-user","readyState":"complete","title":"ログイン｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 My設定 サービス サポート ログイン 口座開設 ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 ログイン パスキー認証でログイン パスキー認証でログイン パスキー認証について または パスワードでログイン ユーザーネーム ログインパスワード セキュリティキーボード ログイン ログインにお困りの方 電","textLength":569,"clickableCount":38,"formControlCount":5}
- note: Attempt 1: click result: {"clicked":false,"candidates":[]}

### 実現損益詳細

- attempted: true
- clicked: false
- captured: false
- csv_download_success: false
- page_url: n/a
- snapshot: realized-detail-page
- note: Attempt 1: base navigation: {"url":"https://login.sbisec.co.jp/login/entry?_ReturnPageInfo=WPLETsmR001Control%2FWPLETsmR001Sdtl18%2FNoActionID%2FDSWPLETsmR001Control&_ALLPARAM_JSON=%7B%22getFlg%22%3A%22on%22%2C%22OutSide%22%3A%22on%22%7D&eventCode=&channel=main-site-user","readyState":"complete","title":"ログイン｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 My設定 サービス サポート ログイン 口座開設 ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 ログイン パスキー認証でログイン パスキー認証でログイン パスキー認証について または パスワードでログイン ユーザーネーム ログインパスワード セキュリティキーボード ログイン ログインにお困りの方 電","textLength":569,"clickableCount":38,"formControlCount":5}
- note: Attempt 1: click result: {"clicked":false,"candidates":[]}

### 配当金・分配金履歴

- attempted: true
- clicked: false
- captured: false
- csv_download_success: false
- page_url: n/a
- snapshot: dividend-history-page
- note: Attempt 1: base navigation: {"url":"https://login.sbisec.co.jp/login/entry?_ReturnPageInfo=WPLETsmR001Control%2FWPLETsmR001Sdtl18%2FNoActionID%2FDSWPLETsmR001Control&_ALLPARAM_JSON=%7B%22getFlg%22%3A%22on%22%2C%22OutSide%22%3A%22on%22%7D&eventCode=&channel=main-site-user","readyState":"complete","title":"ログイン｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 My設定 サービス サポート ログイン 口座開設 ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 ログイン パスキー認証でログイン パスキー認証でログイン パスキー認証について または パスワードでログイン ユーザーネーム ログインパスワード セキュリティキーボード ログイン ログインにお困りの方 電","textLength":569,"clickableCount":38,"formControlCount":5}
- note: Attempt 1: click result: {"clicked":false,"candidates":[]}

## Notes

- Every-asset navigation click result: {"clicked":true,"matched":true,"text":"ポートフォリオ","href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETpfR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_trade","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":926,"y":38,"width":92,"height":44,"centerX":972,"centerY":60,"candidateCount":2,"candidates":[{"text":"ポートフォリオ","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETpfR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_trade","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null},{"text":"口座管理","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETacR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETacR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_acc","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- Account-assets navigation result: {"url":"https://login.sbisec.co.jp/login/entry?_ReturnPageInfo=WPLETsmR001Control%2FWPLETsmR001Sdtl18%2FNoActionID%2FDSWPLETsmR001Control&_ALLPARAM_JSON=%7B%22getFlg%22%3A%22on%22%2C%22OutSide%22%3A%22on%22%7D&eventCode=&channel=main-site-user","readyState":"complete","title":"ログイン｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 My設定 サービス サポート ログイン 口座開設 ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 ログイン パスキー認証でログイン パスキー認証でログイン パスキー認証について または パスワードでログイン ユーザーネーム ログインパスワード セキュリティキーボード ログイン ログインにお困りの方 電","textLength":569,"clickableCount":38,"formControlCount":5}
