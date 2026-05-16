# SBI証券 ポートフォリオ取得 API 調査報告

調査日: 2026-05-17

## サマリー（3行以内）

SBI証券の総合口座について、国内株式・投信・外国株式などの保有ポートフォリオを個人が直接取得できる公式APIは公開情報では確認できなかった。
SBI証券公式で確認できるAPIは先物・オプションAPIが中心で、取引・注文・残高照会は対象だが、現物株・投信を含む総合口座ポートフォリオAPIとは別物。
現実的な取得方法は、低リスク順に「手動CSVエクスポート」「Moneytree / Money Forward 等の連携サービス経由」「自己責任のスクレイピング」で、推奨はCSV起点。

## 1. 公式API

### 結論

- 個人向けに、SBI証券総合口座の保有ポートフォリオ（銘柄・数量・評価額など）を直接取得する公開APIは確認できず。
- `https://developer.sbisec.co.jp/` は 2026-05-17 時点で DNS 解決できず、開発者ポータルの存在は確認できず。
- 公式に確認できたAPIは `SBI 先物・オプションAPI`。対象は先物・オプションであり、国内株式現物・投資信託・外国株式のポートフォリオ取得APIとしては使えない。

### 確認できた公式API

| 区分 | 提供有無 | 対象 | 提供条件 / 利用方法 | ポートフォリオ取得への適用 |
|---|---:|---|---|---|
| 個人向け 総合口座 API | 確認できず | 国内株式、投信、外国株式、債券等 | 公開された開発者サイトやAPI仕様を確認できず | 不可 |
| 個人向け 先物・オプションAPI | あり | 日経225先物、TOPIX先物、日経225オプション等 | 先物・オプション取引サイトの各種設定から外部ツール利用設定、APIキー発行 | 総合口座の保有株・投信取得には不適 |
| 法人向け / FinTech向け SBI証券 API | 確認できず | 不明 | 公開情報では確認できず | 不明 |

### 先物・オプションAPIの概要

SBI証券公式ページでは、先物・オプションAPIについて以下が確認できる。

- サードベンダーの取引ツールがSBI証券の取引環境へ接続できる。
- 対応銘柄はSBI証券が提供する先物・オプション銘柄。
- 取引だけでなく、注文・残高照会など取引に必要な情報取得が可能。
- 利用には、先物・オプション取引サイトの「各種設定」から外部ツール利用設定を行い、APIキーを発行する。
- 接続可能ツール例として `T plus plus`、`シグナルdeオーダー for KENSHIRO-225`、`メールdeオーダーwith TradingView` が掲載されている。

ただし、これは先物・オプション口座の外部ツール連携であり、総合口座の現物株・投信・外国株式の保有一覧を取得する汎用APIではない。

## 2. 連携サービス経由

### 結論

家計簿・金融データ連携サービス経由でSBI証券の残高・資産情報を取得できる可能性はある。ただし、個人が自由に使える「SBI証券API」ではなく、各サービスのアカウントアグリゲーション基盤を通す形になる。

| サービス | SBI証券対応 | 連携方式の確認状況 | 個人プログラムから利用できるか | 備考 |
|---|---:|---|---|---|
| マネーフォワード ME | あり | 公式ヘルプがSBI証券を「スクレイピング連携方式」の例として明記 | 直接利用は不可。Money Forward APIはクローズドで特定パートナー向け | SBI証券ログイン情報入力が必要な方式 |
| Moneytree / Moneytree LINK | あり | Moneytree対応金融機関一覧で `SBI Securities` が `Supported`。LINK APIはOAuth 2.0採用。ただしSBI証券個別の裏側がAPIか直接収集かは確認できず | LINK APIは法人・パートナー向け。client_id / secret はMoneytreeから提供 | サービス全体として証券口座15以上に対応 |
| Zaim | あり | SBI証券はユーザーネーム・パスワード認証に対応。電話番号認証時は定期更新不可などの制約あり | Zaimの個人向け外部APIでSBI証券資産を取れることは確認できず | 内部方式は公開情報だけでは断定不可だが、ID/PW入力型 |
| MoneyLook | 銀行API中心の公開情報は確認 | SBIビジネス・ソリューションズは銀行向けにAPI / スクレイピング契約一覧を公開 | SBI証券の証券口座連携APIとしては確認できず | SBI新生銀行など銀行連携とは別 |
| moomoo証券 | SBI証券連携は確認できず | moomoo自身のOpenAPIはあり、moomoo口座の口座・残高・保有銘柄取得は可能 | SBI証券口座の取得には使えない | moomoo証券口座へ移した資産ならOpenAPIで管理可能 |

### 実装可能性

- Moneytree LINK は、パートナー契約できる法人・サービスであれば最もAPIらしい形で使える可能性がある。
- Money Forward API も資産・口座情報取得APIのドキュメントは公開されているが、README上でクローズドAPI、特定パートナー企業向けと明記されている。
- いずれも個人がローカルスクリプトからSBI証券のポートフォリオを直接読む用途には向かない。

## 3. スクレイピング

### 既存OSS・実装例

| 実装 / 情報 | 内容 | 現状評価 |
|---|---|---|
| `neka-nat/SBIcomm` | Python + mechanize / lxml でSBI証券を操作する古いOSS。README上は株価取得・買い注文例あり | 2025-05-19にアーカイブ済み。現行ログイン・多要素認証への追随は期待しにくい |
| `SBI証券のポートフォリオ情報をPythonでスクレイピング` | SeleniumでSBI証券ポートフォリオをスクレイピングする個人記事 | かなり古い記事。現行画面・認証方式では再利用性は低い |
| OFXProxy | SBI証券から株式、投信、外貨建債券、現金残高などをOFX形式で出力する実装/サービス | 公式APIではなく、内部的にはログイン後取得系と考えられる。現行利用可否・保守状態は要確認 |

### 利用規約・運用リスク

スクレイピングは技術的には可能性があるが、推奨しない。

- SBI証券はセキュリティ上、ブラウザのオートコンプリート機能によるログインすら推奨していない。
- SBI証券の電子交付サービス利用規約には、通常の取引の合理的範囲を超える過大なアクセスを行っていると判断した場合の利用制限に関する記載が確認できる。
- 2025年以降、SBI証券はパスキー、電話番号認証、デバイス認証、FIDO認証などログイン周辺の制御を強めており、無人定期取得は壊れやすい。
- 家計簿サービスでも、SBI証券の電話番号認証を利用している場合は定期更新できない等の制約が発生している。

技術的に実装するなら Playwright / Selenium でログイン後の `保有証券一覧` や `ポートフォリオ` 画面を読む形になるが、認証・規約・過負荷・画面変更のリスクが高い。取引操作を含むスクレイピングは特に避けるべき。

## 4. CSV手動エクスポート

### 可能性

手動CSVエクスポートは確認できる範囲で最も現実的。

SBI証券公式ヘルプでは、ポートフォリオ画面について以下が確認できる。

- ポートフォリオは国内株式・投資信託等の金融資産全体を扱う画面。
- 国内株式はリアルタイム、米国株式は20分遅れ、投資信託は前営業日の基準価額が表示される。
- ポートフォリオ画面の表はCSVファイルに出力できる。

また、外貨建商品の `保有証券一覧` では以下の項目が確認できる。

- 参考単価 / 取得単価
- 保有数量
- 外貨建評価額
- 円換算評価額
- 外貨建評価損益
- 円換算評価損益
- 預り区分（一般預り・特定預り・NISA預り等）

取引履歴系でも、約定履歴などは照会結果をCSV形式でダウンロードできることが公式ヘルプで確認できる。

### 想定される運用

1. SBI証券PCサイトまたはHYPER SBI 2から保有証券 / ポートフォリオCSVを手動ダウンロード。
2. ローカルの所定ディレクトリに配置。
3. 本リポジトリ側でCSVパーサーを実装し、保有銘柄・数量・評価額・損益を正規化。
4. 必要なら moomoo / TradingView の価格・テクニカル情報と結合して日次診断する。

### 注意点

- 商品カテゴリごとにCSV形式が異なる可能性がある。
- 文字コードはShift_JIS / CP932の可能性が高いが、公式ヘルプだけでは全CSVの文字コードは確認できず。
- 画面表示内容がCSVに反映される場合、折りたたみ・表示形式・商品別テーブルに注意が必要。
- 完全自動ではないが、認証情報を保存しないため安全性と保守性が高い。

## 5. 他社比較

| 証券会社 | 公式API / API類似機能 | 対象 | 個人口座の保有ポートフォリオ取得 | 備考 |
|---|---|---|---|---|
| SBI証券 | 先物・オプションAPI | 先物・オプション | 総合口座は確認できず | APIキー発行あり。現物株・投信の汎用APIではない |
| SBIネオトレード証券 | ネオトレAPI for Excel | 国内株取引、注文、照会等 | 同社口座なら可能性あり | SBI証券本体とは別会社 |
| 三菱UFJ eスマート証券（旧 auカブコム証券） | kabuステーション API | 個人向けREST API、発注・情報取得 | 同社口座ならAPIで可能性あり | 個人向けAPIとして明確に提供 |
| マネックス証券 | マネックス証券API | FinTech事業者向け残高参照API | 個人が直接使うAPIではなく連携サービス向け | OAuth2.0、マネーフォワードMEが接続先第一弾 |
| 松井証券 | FX API | FX | 株式・投信ポートフォリオAPIは確認できず | QUOREA FX接続の公式発表あり |
| 楽天証券 | MARKETSPEED II RSS等 | Excel関数経由の情報取得・自動売買 | 一般的なREST APIは確認できず | 楽天ウェブサービスAPIは楽天市場等で、楽天証券口座APIではない |
| Interactive Brokers | IBKR API | 取引・口座・ポジション等 | 可能 | 日本のネット証券というよりグローバル証券API |
| サクソバンク証券 | OpenAPI / FIX | 価格、注文、約定、口座情報 | 可能性あり | APIソリューションを公式提供 |
| moomoo証券 | moomoo OpenAPI | moomoo口座、残高、保有銘柄、注文等 | moomoo口座なら可能 | SBI証券口座の連携ではない |

### 日本の個人向け証券APIの現状

- 銀行APIに比べ、証券口座の残高・保有一覧を個人が直接取得できる公開APIは少ない。
- 個人向けAPIとして明確なのは三菱UFJ eスマート証券のkabuステーションAPI、moomoo OpenAPI、IBKR、サクソバンク等。
- 大手ネット証券では、APIが存在しても商品限定（SBI証券の先物・オプション、松井証券のFX等）またはFinTech事業者向け（マネックス証券API）に分かれる。
- 家計簿系サービスは対応金融機関数が多いが、個人開発者が自由に使えるAPIではなく、パートナー契約・OAuth・アグリゲーション基盤経由になる。

## 6. 推奨アプローチ

### 推奨順位

1. **手動CSVエクスポート + ローカル正規化**
   - 実現可能性: 高
   - リスク: 低
   - 実装コスト: 低〜中
   - 理由: 認証情報を保存しない。SBI証券側の画面変更・多要素認証の影響を受けにくい。まずは保有銘柄・数量・評価額・損益の取り込みには十分。

2. **Moneytree LINK 等の法人向け金融データAPI**
   - 実現可能性: 個人利用では低、法人/サービス化なら中
   - リスク: 中
   - 実装コスト: 中〜高
   - 理由: OAuth 2.0ベースのAPI基盤として使えるが、契約・審査・client_id発行が必要。SBI証券個別の取得方式がAPIか直接収集かは確認できない。

3. **マネーフォワード API**
   - 実現可能性: 個人利用では低
   - リスク: 中
   - 実装コスト: 中〜高
   - 理由: API自体は資産・口座情報を扱えるが、クローズドAPIで特定パートナー向け。SBI証券連携は公式ヘルプ上スクレイピング方式。

4. **Playwright / Selenium スクレイピング**
   - 実現可能性: 技術的には中
   - リスク: 高
   - 実装コスト: 中〜高
   - 理由: ログイン・多要素認証・電話番号認証・画面変更に弱い。規約・セキュリティ・口座ロックの懸念があるため、常用運用は推奨しない。

5. **SBI証券公式APIの利用**
   - 実現可能性: 先物・オプション口座なら中、総合口座ポートフォリオでは低
   - リスク: 低
   - 実装コスト: 中
   - 理由: 公式APIは安全だが、今回目的の総合口座保有ポートフォリオ取得には対象外。

### このプロジェクトでの推奨案

まず `SBI CSV importer` を作るのが最も現実的。入力を手動CSVに限定し、以下の正規化を行う。

- 銘柄コード / ティッカー
- 銘柄名
- 商品区分
- 預り区分
- 数量
- 取得単価 / 参考単価
- 評価額
- 評価損益
- 通貨
- 取得日時またはCSVファイル日付

その上で、既存の `moomoo_portfolio` や market intelligence 系と同じレポート形式に寄せる。完全自動化は、Moneytree LINK 等の契約可能性を確認できてから検討する。

## 参照URL一覧

- SBI証券 先物・オプションAPI: https://www.sbisec.co.jp/ETGate/?OutSide=on&_ControlID=WPLETmgR001Control&burl=search_op&cat1=op&cat2=service&dir=service&file=op_service_05.html&getFlg=on
- SBI証券 先物・オプションAPI 外部ツール利用設定: https://search.sbisec.co.jp/v2/popwin/help/opfutures/setting_api.html
- SBI証券 ポートフォリオについて: https://search.sbisec.co.jp/v2/popwin/help/portfolio_02_01.html
- SBI証券 保有証券一覧（外貨建）: https://search.sbisec.co.jp/v2/popwin/help/manage_f_03_01.html
- SBI証券 約定履歴 CSV: https://search.sbisec.co.jp/v2/popwin/help/foreign/account_06.html
- マネーフォワード ME 金融関連サービス口座の登録方法: https://support.me.moneyforward.com/hc/ja/articles/13480029279897
- moneyforward/api-doc: https://github.com/moneyforward/api-doc
- Moneytree LINK API: https://docs.link.getmoneytree.com/docs/getting-started
- Moneytree LINK API サービス概要: https://getmoneytree.com/jp/link/link-api
- Moneytree SBI Securities supported institutions: https://institutions.moneytree.jp/en/institutions/sbi_securities
- Moneytree Help: Add new financial institutions with API / Corporate accounts: https://help.getmoneytree.com/en/articles/3829492-add-new-financial-institutions-with-api-corporate-accounts
- Zaim SBI証券の認証方式への対応状況: https://content.zaim.net/questions/show/1119
- MoneyLook API / scraping contract list: https://www.sbi-bs.co.jp/api/
- OFXProxy SBI証券: https://tid.jp/s/ofxproxy/?help=sbisec
- neka-nat/SBIcomm: https://github.com/neka-nat/SBIcomm
- SBI証券のポートフォリオ情報をPythonでスクレイピング: https://hato.yokohama/scraping_sbi_investment/
- 三菱UFJ eスマート証券 kabuステーション API: https://kabu.com/item/kabustation_api/default.html
- kabuステーション API 開発者ポータル: https://kabucom.github.io/kabusapi/ptal/
- マネックス証券 API プレスリリース: https://info.monex.co.jp/press/pdf/press2019_02_04_OpenAPI_pr.pdf
- 松井証券 FX API 公開: https://www.matsui.co.jp/company/press/2022/pr221222.html
- 楽天ウェブサービス API一覧: https://webservice.rakuten.co.jp/documentation
- 楽天証券 MARKETSPEED II RSS: https://prtimes.jp/main/html/rd/p/000000359.000011088.html
- Interactive Brokers Japan API: https://www.ibx-pm.co.jp/ib-api/
- サクソバンク証券 API: https://www.home.saxo/ja-jp/platforms/api
- moomoo API 概要: https://openapi.moomoo.com/moomoo-api-doc/jp/intro/intro.html
- moomoo 取引API一覧: https://openapi.moomoo.com/moomoo-api-doc/jp/trade/overview.html
