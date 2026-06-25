# TradingView米国株 sector / industry snapshot

取得日時: 2026-06-26 00:57 JST  
取得元: `POST https://scanner.tradingview.com/america/scan`

## 条件

- market: `america`
- type: `stock`
- market cap: 10億ドル超
- exchange: NASDAQ / NYSE
- scanner全体: 4,030件
- 対象株: 2,661件
- sector: 20
- industry: 126

機械可読な全件は
`config/screener/tradingview-sector-industry-snapshot-us.json`
に保存した。

## sector別industry

| Sector | Stocks | Industries |
|---|---:|---|
| Commercial Services | 81 | Advertising/Marketing Services; Commercial Printing/Forms; Financial Publishing/Services; Miscellaneous Commercial Services; Personnel Services |
| Communications | 31 | Major Telecommunications; Specialty Telecommunications; Wireless Telecommunications |
| Consumer Durables | 56 | Automotive Aftermarket; Electronics/Appliances; Home Furnishings; Homebuilding; Motor Vehicles; Recreational Products; Tools & Hardware |
| Consumer Non-Durables | 88 | Apparel/Footwear; Beverages: Alcoholic; Beverages: Non-Alcoholic; Consumer Sundries; Food: Major Diversified; Food: Meat/Fish/Dairy; Food: Specialty/Candy; Household/Personal Care; Tobacco |
| Consumer Services | 110 | Broadcasting; Cable/Satellite TV; Casinos/Gaming; Hotels/Resorts/Cruise lines; Media Conglomerates; Movies/Entertainment; Other Consumer Services; Publishing: Books/Magazines; Publishing: Newspapers; Restaurants |
| Distribution Services | 41 | Electronics Distributors; Food Distributors; Medical Distributors; Wholesale Distributors |
| Electronic Technology | 192 | Aerospace & Defense; Computer Communications; Computer Peripherals; Computer Processing Hardware; Electronic Components; Electronic Equipment/Instruments; Electronic Production Equipment; Semiconductors; Telecommunications Equipment |
| Energy Minerals | 58 | Coal; Integrated Oil; Oil & Gas Production; Oil Refining/Marketing |
| Finance | 748 | Finance/Rental/Leasing; Financial Conglomerates; Insurance Brokers/Services; Investment Banks/Brokers; Investment Managers; Life/Health Insurance; Major Banks; Multi-Line Insurance; Property/Casualty Insurance; Real Estate Development; Real Estate Investment Trusts; Regional Banks; Savings Banks; Specialty Insurance |
| Health Services | 47 | Hospital/Nursing Management; Managed Health Care; Medical/Nursing Services; Services to the Health Industry |
| Health Technology | 268 | Biotechnology; Medical Specialties; Pharmaceuticals: Major; Pharmaceuticals: Other |
| Industrial Services | 93 | Contract Drilling; Engineering & Construction; Environmental Services; Oil & Gas Pipelines; Oilfield Services/Equipment |
| Miscellaneous | 21 | Investment Trusts/Mutual Funds; Miscellaneous |
| Non-Energy Minerals | 78 | Aluminum; Construction Materials; Forest Products; Other Metals/Minerals; Precious Metals; Steel |
| Process Industries | 82 | Agricultural Commodities/Milling; Chemicals: Agricultural; Chemicals: Major Diversified; Chemicals: Specialty; Containers/Packaging; Industrial Specialties; Pulp & Paper; Textiles |
| Producer Manufacturing | 155 | Auto Parts: OEM; Building Products; Electrical Products; Industrial Conglomerates; Industrial Machinery; Metal Fabrication; Miscellaneous Manufacturing; Office Equipment/Supplies; Trucks/Construction/Farm Machinery |
| Retail Trade | 83 | Apparel/Footwear Retail; Department Stores; Discount Stores; Drugstore Chains; Electronics/Appliance Stores; Food Retail; Home Improvement Chains; Internet Retail; Specialty Stores |
| Technology Services | 269 | Data Processing Services; Information Technology Services; Internet Software/Services; Packaged Software |
| Transportation | 81 | Air Freight/Couriers; Airlines; Marine Shipping; Other Transportation; Railroads; Trucking |
| Utilities | 79 | Alternative Power Generation; Electric Utilities; Gas Distributors; Water Utilities |

## 注意

これは取得時点のscanner snapshotであり、TradingViewが公開保証する固定マスターではない。
銘柄の上場、分類変更、時価総額変動により件数は変わる。分類名の比較やrepoルールの
根拠確認には利用できるが、定期更新時は同条件で再取得する。
