const BUSINESS_MODEL_BY_SYMBOL = new Map([
  ['NVDA', 'fabless'],
  ['AMD', 'fabless'],
  ['QCOM', 'fabless'],
  ['AVGO', 'fabless'],
  ['MRVL', 'fabless'],
  ['MU', 'idm'],
  ['INTC', 'idm'],
  ['SNDK', 'idm'],
  ['TSM', 'foundry'],
]);

export function getSemiconductorBusinessModel(symbol) {
  if (!symbol) return null;
  return BUSINESS_MODEL_BY_SYMBOL.get(String(symbol).trim().toUpperCase()) ?? null;
}

export function isSemiconductorLike(rowOrSymbol) {
  const symbol = typeof rowOrSymbol === 'string'
    ? rowOrSymbol
    : rowOrSymbol?.symbol;
  const industry = typeof rowOrSymbol === 'object'
    ? rowOrSymbol?.industry ?? ''
    : '';

  return /Semiconductors/i.test(industry) || getSemiconductorBusinessModel(symbol) !== null;
}

export function getSemiconductorPfcfMax(symbol) {
  const model = getSemiconductorBusinessModel(symbol);
  if (model === 'idm' || model === 'foundry') return 120;
  return 50;
}
