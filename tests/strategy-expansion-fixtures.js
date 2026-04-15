export const EXPANSION_BASE_IDS = [
  'donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight',
  'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
  'donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide',
  'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
  'donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early',
];

const VARIANT_SUFFIXES = [
  'profit-protect-chandelier',
  'profit-protect-atr-trailing',
  'ftd-entry-early',
  'ftd-entry-late',
];

export function buildExpansionLiveIds() {
  return [
    ...EXPANSION_BASE_IDS,
    ...EXPANSION_BASE_IDS.flatMap((baseId) =>
      VARIANT_SUFFIXES.map((suffix) => `${baseId}-${suffix}`),
    ),
  ];
}

export function buildMarketFollowThroughFilter() {
  return {
    type: 'market_follow_through',
    symbols: ['SPY', 'QQQ', 'DIA'],
    price_ma_type: 'sma',
    price_ma_period: 20,
    vix_symbol: 'VIX',
    vix_ma_type: 'sma',
    vix_ma_period: 20,
  };
}
