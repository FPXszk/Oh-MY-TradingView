import {
  getSemiconductorPfcfMax,
  isSemiconductorLike,
} from './semiconductor-business-models.js';

const COMMON_LIMITS = {
  marketCapMinUsd: 1_000_000_000,
  epsMin: 0,
  pricePctOf52wHighMin: 75,
  priceAboveSma50: true,
  priceAboveSma200: true,
};

function profileSummary(profile) {
  return {
    id: profile.id,
    label: profile.label,
    phase1_labels: [...profile.phase1Labels],
    scope_labels: profile.requestScopes.map((scope) => scope.sector),
    thresholds: {
      market_cap_min_usd: profile.thresholds.marketCapMinUsd,
      eps_min: profile.thresholds.epsMin,
      rsi14_min: profile.thresholds.rsiMin,
      perf_3m_min_pct: profile.thresholds.perf3mMinPct,
      relative_volume_min: profile.thresholds.relativeVolumeMin,
      gross_margin_min_pct: profile.thresholds.grossMarginMinPct,
      fcf_margin_min_pct: profile.thresholds.fcfMarginMinPct,
      roe_min_pct: profile.thresholds.roeMinPct,
      revenue_growth_min_pct: profile.thresholds.revenueGrowthMinPct,
      p_fcf_max: profile.pFcfMaxLabel ?? profile.thresholds.pFcfMax,
      price_pct_of_52wk_high_min: profile.thresholds.pricePctOf52wHighMin,
      price_above_sma50: profile.thresholds.priceAboveSma50,
      price_above_sma200: profile.thresholds.priceAboveSma200,
    },
  };
}

const US_PHASE2_EXCLUDED = new Set();
const JP_PHASE2_EXCLUDED = new Set(['Finance', 'Utilities']);

function usSectorProfile(id, sector, thresholds, extra = {}) {
  return {
    id: `us-${id}`,
    label: extra.label ?? sector,
    phase1Labels: [sector],
    requestScopes: [
      { sector },
    ],
    thresholds: {
      ...COMMON_LIMITS,
      ...thresholds,
    },
    ...extra,
  };
}

const US_TECH_THRESHOLDS = {
  rsiMin: 60,
  relativeVolumeMin: 1.0,
  grossMarginMinPct: 40,
  fcfMarginMinPct: 15,
  roeMinPct: 20,
  perf3mMinPct: 10,
  revenueGrowthMinPct: 10,
  pFcfMax: 50,
};

const US_SEMICONDUCTOR_THRESHOLDS = {
  rsiMin: 60,
  relativeVolumeMin: 0.9,
  grossMarginMinPct: 30,
  fcfMarginMinPct: 5,
  roeMinPct: 15,
  perf3mMinPct: 10,
  revenueGrowthMinPct: 15,
  pFcfMax: 50,
};

const US_CYCLICAL_THRESHOLDS = {
  rsiMin: 60,
  relativeVolumeMin: 1.0,
  grossMarginMinPct: 25,
  fcfMarginMinPct: 8,
  roeMinPct: 12,
  perf3mMinPct: 15,
  revenueGrowthMinPct: 8,
  pFcfMax: 50,
};

const US_INDUSTRIAL_THRESHOLDS = {
  rsiMin: 60,
  relativeVolumeMin: 0.9,
  grossMarginMinPct: 25,
  fcfMarginMinPct: 5,
  roeMinPct: 12,
  perf3mMinPct: 10,
  revenueGrowthMinPct: 8,
  pFcfMax: 50,
};

const US_MATERIALS_THRESHOLDS = {
  rsiMin: 60,
  relativeVolumeMin: 1.0,
  grossMarginMinPct: 20,
  fcfMarginMinPct: 5,
  roeMinPct: 12,
  perf3mMinPct: 15,
  revenueGrowthMinPct: 5,
  pFcfMax: 20,
};

const US_ENERGY_THRESHOLDS = {
  rsiMin: 60,
  relativeVolumeMin: 1.0,
  grossMarginMinPct: 20,
  fcfMarginMinPct: 5,
  roeMinPct: 12,
  perf3mMinPct: 15,
  revenueGrowthMinPct: 5,
  pFcfMax: 20,
};

const US_DEFENSIVE_THRESHOLDS = {
  rsiMin: 55,
  relativeVolumeMin: 0.9,
  grossMarginMinPct: 30,
  fcfMarginMinPct: 8,
  roeMinPct: 12,
  perf3mMinPct: 5,
  revenueGrowthMinPct: 3,
  pFcfMax: 30,
};

const US_BROAD_THRESHOLDS = {
  rsiMin: 55,
  relativeVolumeMin: 0.9,
  grossMarginMinPct: 20,
  fcfMarginMinPct: 5,
  roeMinPct: 10,
  perf3mMinPct: 5,
  revenueGrowthMinPct: 3,
  pFcfMax: 50,
};

const US_PROFILES = [
  usSectorProfile('technology-services', 'Technology Services', US_TECH_THRESHOLDS),
  usSectorProfile('electronic-technology', 'Electronic Technology', US_TECH_THRESHOLDS, {
    excludeRow: (row) => isSemiconductorLike(row),
  }),
  usSectorProfile('electronic-technology-semiconductors', 'Electronic Technology', US_SEMICONDUCTOR_THRESHOLDS, {
    label: 'Electronic Technology / Semiconductors',
    pFcfMaxLabel: '50 (fabless), 120 (IDM/foundry)',
    includeRow: (row) => isSemiconductorLike(row),
    getPfcfMax: (row) => getSemiconductorPfcfMax(row.symbol),
  }),
  usSectorProfile('communications', 'Communications', US_TECH_THRESHOLDS),
  usSectorProfile('consumer-durables', 'Consumer Durables', US_CYCLICAL_THRESHOLDS),
  usSectorProfile('consumer-services', 'Consumer Services', US_CYCLICAL_THRESHOLDS),
  usSectorProfile('retail-trade', 'Retail Trade', US_CYCLICAL_THRESHOLDS),
  usSectorProfile('distribution-services', 'Distribution Services', US_CYCLICAL_THRESHOLDS),
  usSectorProfile('producer-manufacturing', 'Producer Manufacturing', US_INDUSTRIAL_THRESHOLDS),
  usSectorProfile('industrial-services', 'Industrial Services', US_INDUSTRIAL_THRESHOLDS),
  usSectorProfile('transportation', 'Transportation', US_INDUSTRIAL_THRESHOLDS),
  usSectorProfile('commercial-services', 'Commercial Services', US_INDUSTRIAL_THRESHOLDS),
  usSectorProfile('process-industries', 'Process Industries', US_MATERIALS_THRESHOLDS),
  usSectorProfile('non-energy-minerals', 'Non-Energy Minerals', US_MATERIALS_THRESHOLDS),
  usSectorProfile('energy-minerals', 'Energy Minerals', US_ENERGY_THRESHOLDS),
  usSectorProfile('health-technology', 'Health Technology', US_DEFENSIVE_THRESHOLDS),
  usSectorProfile('health-services', 'Health Services', US_DEFENSIVE_THRESHOLDS),
  usSectorProfile('consumer-non-durables', 'Consumer Non-Durables', US_DEFENSIVE_THRESHOLDS),
  usSectorProfile('utilities', 'Utilities', US_DEFENSIVE_THRESHOLDS),
  usSectorProfile('finance', 'Finance', US_BROAD_THRESHOLDS),
  usSectorProfile('miscellaneous', 'Miscellaneous', US_BROAD_THRESHOLDS),
];

const JP_PROFILES = [
  {
    id: 'jp-manufacturing',
    label: 'Japan Manufacturing',
    phase1Labels: ['Producer Manufacturing', 'Electronic Technology'],
    requestScopes: [
      { sector: 'Producer Manufacturing' },
      { sector: 'Electronic Technology' },
    ],
    thresholds: {
      ...COMMON_LIMITS,
      rsiMin: 55,
      relativeVolumeMin: 0.8,
      grossMarginMinPct: 25,
      fcfMarginMinPct: 5,
      roeMinPct: 12,
      perf3mMinPct: 8,
      revenueGrowthMinPct: 5,
      pFcfMax: 80,
    },
  },
  {
    id: 'jp-materials-trading',
    label: 'Japan Materials & Trading',
    phase1Labels: ['Process Industries', 'Distribution Services', 'Non-Energy Minerals'],
    requestScopes: [
      { sector: 'Process Industries' },
      { sector: 'Distribution Services' },
      { sector: 'Non-Energy Minerals' },
    ],
    thresholds: {
      ...COMMON_LIMITS,
      rsiMin: 55,
      relativeVolumeMin: 0.8,
      grossMarginMinPct: 15,
      fcfMarginMinPct: 4,
      roeMinPct: 10,
      perf3mMinPct: 5,
      revenueGrowthMinPct: 3,
      pFcfMax: 40,
    },
  },
  {
    id: 'jp-consumer-cyclicals',
    label: 'Japan Consumer Cyclicals',
    phase1Labels: ['Consumer Durables', 'Consumer Services', 'Retail Trade', 'Transportation'],
    requestScopes: [
      { sector: 'Consumer Durables' },
      { sector: 'Consumer Services' },
      { sector: 'Retail Trade' },
      { sector: 'Transportation' },
    ],
    thresholds: {
      ...COMMON_LIMITS,
      rsiMin: 55,
      relativeVolumeMin: 0.8,
      grossMarginMinPct: 15,
      fcfMarginMinPct: 3,
      roeMinPct: 10,
      perf3mMinPct: 8,
      revenueGrowthMinPct: 3,
      pFcfMax: 60,
    },
  },
  {
    id: 'jp-communications',
    label: 'Japan Communications',
    phase1Labels: ['Communications', 'Technology Services'],
    requestScopes: [
      { sector: 'Communications' },
      { sector: 'Technology Services' },
    ],
    thresholds: {
      ...COMMON_LIMITS,
      rsiMin: 55,
      relativeVolumeMin: 0.8,
      grossMarginMinPct: 35,
      fcfMarginMinPct: 5,
      roeMinPct: 12,
      perf3mMinPct: 8,
      revenueGrowthMinPct: 3,
      pFcfMax: 50,
    },
  },
  {
    id: 'jp-defensive',
    label: 'Japan Defensive',
    phase1Labels: ['Health Technology', 'Health Services', 'Consumer Non-Durables'],
    requestScopes: [
      { sector: 'Health Technology' },
      { sector: 'Health Services' },
      { sector: 'Consumer Non-Durables' },
    ],
    thresholds: {
      ...COMMON_LIMITS,
      rsiMin: 50,
      relativeVolumeMin: 0.8,
      grossMarginMinPct: 25,
      fcfMarginMinPct: 5,
      roeMinPct: 10,
      perf3mMinPct: 5,
      revenueGrowthMinPct: 2,
      pFcfMax: 30,
    },
  },
];

export function getProfilesForMarket(market) {
  return market === 'japan' ? JP_PROFILES : US_PROFILES;
}

function getExcludedSetForMarket(market) {
  return market === 'japan' ? JP_PHASE2_EXCLUDED : US_PHASE2_EXCLUDED;
}

export function getSectorScreeningPlan({ market = 'america', selectedSectors = [] } = {}) {
  const selected = new Set((selectedSectors ?? []).map((label) => String(label)));
  const excludedSet = getExcludedSetForMarket(market);
  const activeProfiles = getProfilesForMarket(market)
    .filter((profile) => profile.phase1Labels.some((label) => selected.has(label)));

  return {
    activeProfiles,
    excludedSelectedSectors: [...selected].filter((label) => excludedSet.has(label)),
    profileSummaries: activeProfiles.map(profileSummary),
  };
}
