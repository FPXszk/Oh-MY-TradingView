# SBI Portfolio Capture Summary

- generated_at: 2026-05-21T03:24:16.030Z
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
- target_count: 7

## Capture

- current_page_saved: true
- every_asset_attempted: true
- every_asset_captured: true
- account_assets_captured: true
- csv_download_success: true

## Downloaded Files

- downloads\DISTRIBUTION_20260521122654.csv
- downloads\ALLTYPE_20260521122640.csv
- downloads\SaveFile.csv

## Route Captures

### 米国株式

- attempted: true
- clicked: true
- captured: true
- csv_download_success: false
- page_url: https://site.sbisec.co.jp/account/foreign/summary
- snapshot: us-stocks-page
- form_controls: 3
- csv_candidates: 0
- note: Attempt 1: base navigation: {"url":"https://site.sbisec.co.jp/account/assets","readyState":"complete","title":"My資産トップ｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) My資産 My資産とは 資産残高 資産推移 実現損益 資産残高 預り金を除外 更新 2026/5/21 12:24 5,405,57","textLength":1561,"clickableCount":53,"formControlCount":6}
- note: Attempt 1: click result: {"clicked":true,"matched":true,"text":"米国株式","href":"https://www.sbisec.co.jp/ETGate?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&getFlg=on&OutSide=on&sw_param1=account&sw_param2=foreign&sw_param3=summary","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":806,"y":625,"width":84,"height":21,"centerX":848,"centerY":636,"candidateCount":1,"candidates":[{"text":"米国株式","score":100,"href":"https://www.sbisec.co.jp/ETGate?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&getFlg=on&OutSide=on&sw_param1=account&sw_param2=foreign&sw_param3=summary","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- note: Attempt 1: post-navigation settle wait: 1500ms
- note: Attempt 1: CSV diagnostics: {"candidateCount":0,"candidates":[]}
- note: Fallback action 外国株式トップ: {"clicked":true,"matched":true,"text":"外国株式トップ","href":"https://www.sbisec.co.jp/ETGate/?OutSide=on&_ControlID=WPLETsmR001Control&_DataStoreID=DSWPLETsmR001Control&sw_page=Foreign&cat1=home&cat2=none&sw_param1=GB&getFlg=on","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":1530,"y":628,"width":87,"height":15,"centerX":1574,"centerY":636,"candidateCount":1,"candidates":[{"text":"外国株式トップ","score":100,"href":"https://www.sbisec.co.jp/ETGate/?OutSide=on&_ControlID=WPLETsmR001Control&_DataStoreID=DSWPLETsmR001Control&sw_page=Foreign&cat1=home&cat2=none&sw_param1=GB&getFlg=on","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- note: Fallback snapshot foreign-top-page: https://member.c.sbisec.co.jp/foreign/home
- note: Fallback action 保有銘柄: {"clicked":true,"matched":true,"text":"保有銘柄","href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl23&_ActionID=NoActionID&_DataStoreID=DSWPLETsmR001Control&OutSide=on&getFlg=on&path=foreign%2Faccount%2Fassets&_scpr=intpr=hn_i_fs_acc_trade","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":1034,"y":136,"width":80,"height":30,"centerX":1074,"centerY":151,"candidateCount":1,"candidates":[{"text":"保有銘柄","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl23&_ActionID=NoActionID&_DataStoreID=DSWPLETsmR001Control&OutSide=on&getFlg=on&path=foreign%2Faccount%2Fassets&_scpr=intpr=hn_i_fs_acc_trade","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- note: Fallback snapshot foreign-holdings-page: https://member.c.sbisec.co.jp/foreign/account/assets
- note: Fallback action 保有資産評価: {"clicked":false,"candidates":[]}
- note: Fallback action 資産損益: {"clicked":false,"candidates":[]}

### 実現損益詳細

- attempted: true
- clicked: true
- captured: true
- csv_download_success: true
- page_url: https://site.sbisec.co.jp/account/assets/profits?baseDateType=CONTRACT&baseDateFrom=2022%2F01%2F01&baseDateTo=2026%2F05%2F21&product=ALL
- snapshot: realized-detail-page
- form_controls: 5
- csv_candidates: 1
- csv_candidate_tag: button
- csv_candidate_name: n/a
- csv_candidate_form_action: https://site.sbisec.co.jp/account/assets/profits?baseDateType=CONTRACT&baseDateFrom=2022%2F01%2F01&baseDateTo=2026%2F05%2F21&product=ALL
- csv_candidate_form_method: n/a
- downloaded_files: downloads\ALLTYPE_20260521122640.csv, downloads\SaveFile.csv
- note: Attempt 1: base navigation: {"url":"https://site.sbisec.co.jp/account/assets","readyState":"complete","title":"My資産トップ｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) My資産 My資産とは 資産残高 資産推移 実現損益 資産残高 預り金を除外 更新 2026/5/21 12:26 5,405,57","textLength":1561,"clickableCount":53,"formControlCount":6}
- note: Attempt 1: click result: {"clicked":true,"matched":true,"text":"実現損益詳細","href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&OutSide=on&getFlg=on&sw_param1=account&sw_param2=assets&sw_param3=profits&_scpr=intpr=hn_i_my_profits","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":774,"y":136,"width":108,"height":30,"centerX":828,"centerY":151,"candidateCount":1,"candidates":[{"text":"実現損益詳細","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&OutSide=on&getFlg=on&sw_param1=account&sw_param2=assets&sw_param3=profits&_scpr=intpr=hn_i_my_profits","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- note: Attempt 1: post-navigation settle wait: 1500ms
- note: Attempt 1: start-date fill result: {"updated":true,"candidateCount":2,"label":"","type":"text","value":"2022/01/01"}
- note: Attempt 1: submit result: {"clicked":true,"matched":true,"text":"照会","href":null,"tag":"button","type":"button","id":null,"name":null,"onclick":null,"formAction":"https://site.sbisec.co.jp/account/assets/profits","x":1192,"y":518,"width":160,"height":32,"centerX":1272,"centerY":534,"candidateCount":1,"candidates":[{"text":"照会","score":100,"href":null,"tag":"button","type":"button","id":null,"name":null,"onclick":null,"formAction":"https://site.sbisec.co.jp/account/assets/profits"}],"settle":{"url":"https://site.sbisec.co.jp/account/assets/profits?baseDateType=CONTRACT&baseDateFrom=2026/05/01&baseDateTo=2026/05/21&product=ALL","readyState":"complete","title":"実現損益詳細｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) 実現損益詳細 実現損益詳細とは My資産トップ ／ 実現損益詳細 すべて 照会条件 すべて、 期間：約定日 2026/5/1～202","textLength":963,"clickableCount":45,"formControlCount":5}}
- note: Attempt 1: range URL candidate: https://site.sbisec.co.jp/account/assets/profits?baseDateType=CONTRACT&baseDateFrom=2022%2F01%2F01&baseDateTo=2026%2F05%2F21&product=ALL
- note: Attempt 1: forced range navigation: {"url":"https://site.sbisec.co.jp/account/assets/profits?baseDateType=CONTRACT&baseDateFrom=2022%2F01%2F01&baseDateTo=2026%2F05%2F21&product=ALL","readyState":"complete","title":"実現損益詳細｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) 実現損益詳細 実現損益詳細とは My資産トップ ／ 実現損益詳細 すべて 照会条件 すべて、 期間：約定日 2022/1/1～202","textLength":1023,"clickableCount":46,"formControlCount":5}
- note: Attempt 1: post-range-navigation settle wait: 1500ms
- note: Attempt 1: CSV diagnostics: {"candidateCount":1,"candidates":[{"text":"CSVダウンロード","tag":"button","type":"button","id":null,"name":null,"value":null,"href":null,"onclick":null,"formAction":"https://site.sbisec.co.jp/account/assets/profits?baseDateType=CONTRACT&baseDateFrom=2022%2F01%2F01&baseDateTo=2026%2F05%2F21&product=ALL","outerHtml":"<button type=\"button\" class=\"text-xs link-light\"><span class=\"i-download\"></span>CSVダウンロード</button>","matchedKeywords":[["CSV"],["CSVダウンロード"]],"form":null}]}

### 配当金・分配金履歴

- attempted: true
- clicked: true
- captured: true
- csv_download_success: true
- page_url: https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2022%2F01%2F01&dispositionDateTo=2026%2F05%2F21
- snapshot: dividend-history-page
- form_controls: 5
- csv_candidates: 1
- csv_candidate_tag: button
- csv_candidate_name: n/a
- csv_candidate_form_action: https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2022%2F01%2F01&dispositionDateTo=2026%2F05%2F21
- csv_candidate_form_method: n/a
- downloaded_files: downloads\DISTRIBUTION_20260521122654.csv, downloads\ALLTYPE_20260521122640.csv, downloads\SaveFile.csv
- note: Attempt 1: base navigation: {"url":"https://site.sbisec.co.jp/account/assets","readyState":"complete","title":"My資産トップ｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) My資産 My資産とは 資産残高 資産推移 実現損益 資産残高 預り金を除外 更新 2026/5/21 12:26 5,405,57","textLength":1561,"clickableCount":53,"formControlCount":6}
- note: Attempt 1: click result: {"clicked":true,"matched":true,"text":"配当金・分配金履歴","href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&OutSide=on&getFlg=on&sw_param1=account&sw_param2=assets&sw_param3=dividends&_scpr=intpr=hn_i_my_dividends","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":886,"y":136,"width":150,"height":30,"centerX":961,"centerY":151,"candidateCount":2,"candidates":[{"text":"配当金・分配金履歴","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETsmR001Control&_PageID=WPLETsmR001Sdtl18&_ActionID=NoActionID&OutSide=on&getFlg=on&sw_param1=account&sw_param2=assets&sw_param3=dividends&_scpr=intpr=hn_i_my_dividends","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null},{"text":"配当金・分配金履歴はこちら","score":40,"href":"https://site.sbisec.co.jp/account/assets/dividends","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- note: Attempt 1: post-navigation settle wait: 1500ms
- note: Attempt 1: start-date fill result: {"updated":true,"candidateCount":2,"label":"","type":"text","value":"2022/01/01"}
- note: Attempt 1: submit result: {"clicked":true,"matched":true,"text":"照会","href":null,"tag":"button","type":"button","id":null,"name":null,"onclick":null,"formAction":"https://site.sbisec.co.jp/account/assets/dividends","x":1192,"y":534,"width":160,"height":32,"centerX":1272,"centerY":550,"candidateCount":1,"candidates":[{"text":"照会","score":100,"href":null,"tag":"button","type":"button","id":null,"name":null,"onclick":null,"formAction":"https://site.sbisec.co.jp/account/assets/dividends"}],"settle":{"url":"https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2026/05/01&dispositionDateTo=2026/05/21","readyState":"complete","title":"配当金・分配金履歴｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) 配当金・分配金履歴 配当金・分配金履歴とは My資産トップ ／ 配当金・分配金履歴 照会条件 期間：2026/5/1～2026/5/","textLength":736,"clickableCount":41,"formControlCount":5}}
- note: Attempt 1: range URL candidate: https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2022%2F01%2F01&dispositionDateTo=2026%2F05%2F21
- note: Attempt 1: forced range navigation: {"url":"https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2022%2F01%2F01&dispositionDateTo=2026%2F05%2F21","readyState":"complete","title":"配当金・分配金履歴｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) 配当金・分配金履歴 配当金・分配金履歴とは My資産トップ ／ 配当金・分配金履歴 照会条件 期間：2022/1/1～2026/5/","textLength":2362,"clickableCount":69,"formControlCount":5}
- note: Attempt 1: post-range-navigation settle wait: 1500ms
- note: Attempt 1: CSV diagnostics: {"candidateCount":1,"candidates":[{"text":"CSVダウンロード","tag":"button","type":"button","id":null,"name":null,"value":null,"href":null,"onclick":null,"formAction":"https://site.sbisec.co.jp/account/assets/dividends?dispositionDateFrom=2022%2F01%2F01&dispositionDateTo=2026%2F05%2F21","outerHtml":"<button type=\"button\" class=\"text-xs link-light\"><span class=\"i-download\"></span>CSVダウンロード</button>","matchedKeywords":[["CSV"],["CSVダウンロード"]],"form":null}]}

## Notes

- Every-asset navigation click result: {"clicked":true,"matched":true,"text":"ポートフォリオ","href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETpfR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_trade","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null,"x":1246,"y":38,"width":92,"height":44,"centerX":1292,"centerY":60,"candidateCount":2,"candidates":[{"text":"ポートフォリオ","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETpfR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETpfR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_trade","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null},{"text":"口座管理","score":100,"href":"https://www.sbisec.co.jp/ETGate/?_ControlID=WPLETacR001Control&_PageID=DefaultPID&_ActionID=DefaultAID&_DataStoreID=DSWPLETacR001Control&OutSide=on&getFlg=on&_scpr=intpr=hn_acc","tag":"a","type":null,"id":null,"name":null,"onclick":null,"formAction":null}]}
- Account-assets navigation result: {"url":"https://site.sbisec.co.jp/account/assets","readyState":"complete","title":"My資産トップ｜SBI証券","textSample":"銘柄 検索 国内株式 外国株式 投資信託 サイト 内検索 銀行 保険 ポートフォリオ 口座管理 取引 入出金 お知らせ My設定 サービス サポート ログアウト ホーム マーケット NISA 国内株式 外国株式 投資信託 債券 FX PICK UP おまかせ投資 その他の商品 My資産トップ 実現損益詳細 配当金・分配金履歴 診断(ポトフォる) My資産 My資産とは 資産残高 資産推移 実現損益 資産残高 預り金を除外 更新 2026/5/21 12:24 5,405,57","textLength":1561,"clickableCount":53,"formControlCount":6}
