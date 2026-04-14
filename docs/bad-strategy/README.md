# bad-strategy archive

`config/backtest/strategy-presets.json` には、直近の main 系バックテストで継続採用する 15 戦略だけを残す。

それ以外の retired preset は `docs/bad-strategy/retired-strategy-presets.json` に退避し、なぜ外したか・いつ外したかをこの配下で追跡する。

今回の再編では、最新世代 `next-long-run-finetune-complete_20260413` と直前世代 `next-long-run-market-matched-200_20260409` を基準に deep-pullback 系の keep-set を確定した。

## Single source of truth

`config/backtest/strategy-catalog.json` が全戦略のライフサイクルメタデータを統合する single source of truth である。live / retired の 2 つの JSON ファイルは catalog からの射影ビューとして維持されるが、カタログが正とする。
