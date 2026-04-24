export const EXPANSION_BASE_IDS = [
  'donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight',
  'donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight',
  'donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide',
  'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
  'donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early',
];

export const EXPANSION_BREADTH_QUALITY_IDS = [
  'donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide',
  'donchian-50-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-early',
  'donchian-60-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-entry-late',
  'donchian-55-18-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-tight',
  'donchian-55-22-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide-exit-wide',
];

const VARIANT_SUFFIXES = [
  'profit-protect-chandelier',
  'profit-protect-atr-trailing',
  'ftd-entry-early',
  'ftd-entry-late',
];

export const STRONGEST_PROFIT_PROTECT_10PACK_IDS = [
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67-risk1',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk2',
];

export function buildNextLongRunLiveIds() {
  return [
    ...EXPANSION_BASE_IDS,
    ...EXPANSION_BASE_IDS.flatMap((baseId) =>
      VARIANT_SUFFIXES.map((suffix) => `${baseId}-${suffix}`),
    ),
    ...EXPANSION_BREADTH_QUALITY_IDS,
  ];
}

export function buildExpansionLiveIds() {
  return [
    ...buildNextLongRunLiveIds(),
    ...STRONGEST_PROFIT_PROTECT_10PACK_IDS,
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
