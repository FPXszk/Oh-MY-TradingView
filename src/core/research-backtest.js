const REFERENCE_SYMBOL_MAP = {
  SPY: 'BATS:SPY',
  RSP: 'BATS:RSP',
  VIX: 'TVC:VIX',
};

function escapePineString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isoDateParts(isoDate) {
  const [year, month, day] = String(isoDate).split('-').map((value) => Number(value));
  return { year, month, day };
}

function buildHeader(title, defaults) {
  const initialCapital = defaults.initial_capital ?? 10000;
  const commission = defaults.commission ?? 0;
  const slippage = defaults.slippage ?? 0;
  const from = defaults.date_range?.from ?? '2015-01-01';
  const to = defaults.date_range?.to ?? '2025-12-31';
  const start = isoDateParts(from);
  const end = isoDateParts(to);

  return [
    '//@version=6',
    `strategy("${escapePineString(title)}", overlay=true, pyramiding=0, initial_capital=${initialCapital}, default_qty_type=strategy.percent_of_equity, default_qty_value=100, commission_type=strategy.commission.percent, commission_value=${commission}, slippage=${slippage})`,
    `startDate = timestamp(${start.year}, ${start.month}, ${start.day}, 0, 0)`,
    `endDate = timestamp(${end.year}, ${end.month}, ${end.day}, 23, 59)`,
    'inDateRange = time >= startDate and time <= endDate',
  ];
}

function buildRegimeBlock(regimeFilter) {
  if (!regimeFilter) {
    return [
      'regimeOk = true',
      'regimeForceExit = false',
    ];
  }

  const refSymbol = REFERENCE_SYMBOL_MAP[regimeFilter.reference_symbol] || regimeFilter.reference_symbol;
  const maFunc = regimeFilter.reference_ma_type === 'ema' ? 'ta.ema' : 'ta.sma';

  return [
    `regimeRefClose = request.security("${refSymbol}", timeframe.period, close)`,
    `regimeRefMa = ${maFunc}(regimeRefClose, ${regimeFilter.reference_ma_period})`,
    'regimeOk = regimeRefClose > regimeRefMa',
    `regimeForceExit = ${regimeFilter.action_when_false === 'exit_all' ? 'true' : 'false'}`,
  ];
}

function buildBaseBlock(preset) {
  const params = preset.parameters ?? {};

  if (preset.builder === 'price_vs_ma') {
    const maFunc = params.ma_type === 'ema' ? 'ta.ema' : 'ta.sma';
    return [
      `baseMa = ${maFunc}(close, ${params.period})`,
      'plot(baseMa, "Base MA", color=color.orange)',
      'entrySignal = ta.crossover(close, baseMa)',
      'exitSignal = ta.crossunder(close, baseMa)',
    ];
  }

  if (preset.builder === 'ma_cross') {
    const maFunc = params.ma_type === 'ema' ? 'ta.ema' : 'ta.sma';
    return [
      `fastMa = ${maFunc}(close, ${params.fast_period})`,
      `slowMa = ${maFunc}(close, ${params.slow_period})`,
      'plot(fastMa, "Fast MA", color=color.blue)',
      'plot(slowMa, "Slow MA", color=color.orange)',
      'entrySignal = ta.crossover(fastMa, slowMa)',
      'exitSignal = ta.crossunder(fastMa, slowMa)',
    ];
  }

  if (preset.builder === 'donchian_breakout') {
    return [
      `donchianUpper = ta.highest(high, ${params.entry_period})[1]`,
      `donchianLower = ta.lowest(low, ${params.exit_period})[1]`,
      'plot(donchianUpper, "Donchian Upper", color=color.green)',
      'plot(donchianLower, "Donchian Lower", color=color.red)',
      'entrySignal = ta.crossover(close, donchianUpper)',
      'exitSignal = ta.crossunder(close, donchianLower)',
    ];
  }

  if (preset.builder === 'keltner_breakout') {
    return [
      `keltnerBasis = ta.ema(close, ${params.ema_period})`,
      `keltnerAtr = ta.atr(${params.atr_period})`,
      `keltnerUpper = keltnerBasis + (${params.atr_mult} * keltnerAtr)`,
      'plot(keltnerBasis, "Keltner Basis", color=color.orange)',
      'plot(keltnerUpper, "Keltner Upper", color=color.green)',
      'entrySignal = ta.crossover(close, keltnerUpper)',
      'exitSignal = ta.crossunder(close, keltnerBasis)',
    ];
  }

  if (preset.builder === 'connors_rsi_pullback') {
    return [
      'var float streak = 0.0',
      'streak := close > close[1] ? (nz(streak[1]) >= 0 ? nz(streak[1]) + 1 : 1) : close < close[1] ? (nz(streak[1]) <= 0 ? nz(streak[1]) - 1 : -1) : 0',
      `priceRsi = ta.rsi(close, ${params.price_rsi_period})`,
      `streakRsi = ta.rsi(streak, ${params.streak_rsi_period})`,
      `rankValue = ta.percentrank(ta.change(close), ${params.percent_rank_period})`,
      'connorsRsi = (priceRsi + streakRsi + rankValue) / 3.0',
      'plot(connorsRsi, "Connors RSI", color=color.aqua)',
      `entrySignal = connorsRsi < ${params.entry_below}`,
      `exitSignal = connorsRsi > ${params.exit_above}`,
    ];
  }

  throw new Error(`Unsupported builder: ${preset.builder}`);
}

function buildExitOverlayBlock(exitOverlay) {
  if (!exitOverlay) {
    return [];
  }

  if (exitOverlay.type === 'atr_trailing_stop') {
    return [
      `overlayAtr = ta.atr(${exitOverlay.atr_period})`,
      'var float overlayHighest = na',
      'if strategy.position_size > 0',
      '    overlayHighest := na(overlayHighest) ? high : math.max(overlayHighest, high)',
      'else',
      '    overlayHighest := na',
      `overlayStop = overlayHighest - (${exitOverlay.atr_multiplier} * overlayAtr)`,
      'if strategy.position_size > 0 and not na(overlayStop)',
      '    strategy.exit("Overlay Exit", "Long", stop=overlayStop)',
    ];
  }

  if (exitOverlay.type === 'chandelier_exit') {
    return [
      `overlayAtr = ta.atr(${exitOverlay.atr_period})`,
      `overlayStop = ta.highest(high, ${exitOverlay.atr_period}) - (${exitOverlay.atr_multiplier} * overlayAtr)`,
      'if strategy.position_size > 0 and not na(overlayStop)',
      '    strategy.exit("Overlay Exit", "Long", stop=overlayStop)',
    ];
  }

  if (exitOverlay.type === 'bollinger_upper_exit' || exitOverlay.type === 'bollinger_2sigma_exit') {
    const length = exitOverlay.length ?? exitOverlay.bb_length;
    const stddev = exitOverlay.stddev ?? exitOverlay.bb_stddev;
    return [
      ` [overlayBasis, overlayUpper, overlayLower] = ta.bb(close, ${length}, ${stddev})`.trimStart(),
      'if strategy.position_size > 0 and close >= overlayUpper',
      '    strategy.close("Long", comment="2sigma exit")',
    ];
  }

  throw new Error(`Unsupported exit overlay: ${exitOverlay.type}`);
}

function buildStopLossBlock(stopLoss) {
  if (!stopLoss) {
    return [];
  }

  if (stopLoss.type === 'hard_percent') {
    const stopFraction = Number(stopLoss.value) / 100;
    return [
      `stopLossPrice = strategy.position_avg_price * (1 - ${stopFraction})`,
      'if strategy.position_size > 0 and not na(stopLossPrice)',
      '    strategy.exit("Stop Loss", "Long", stop=stopLossPrice)',
    ];
  }

  if (stopLoss.type === 'atr_stop') {
    return [
      `stopAtr = ta.atr(${stopLoss.atr_period})`,
      `stopLossPrice = strategy.position_avg_price - (${stopLoss.atr_multiplier} * stopAtr)`,
      'if strategy.position_size > 0 and not na(stopLossPrice)',
      '    strategy.exit("Stop Loss", "Long", stop=stopLossPrice)',
    ];
  }

  throw new Error(`Unsupported stop loss: ${stopLoss.type}`);
}

export function buildResearchStrategySource(preset, defaults = {}) {
  const title = preset.name || preset.id;
  const lines = [
    ...buildHeader(title, defaults),
    ...buildRegimeBlock(preset.regime_filter),
    ...buildBaseBlock(preset),
    'allowEntry = inDateRange and regimeOk',
    'if entrySignal and allowEntry and strategy.position_size <= 0',
    '    strategy.entry("Long", strategy.long)',
    'if exitSignal and strategy.position_size > 0',
    '    strategy.close("Long", comment="Base exit")',
    'if regimeForceExit and not regimeOk and strategy.position_size > 0',
    '    strategy.close("Long", comment="Regime exit")',
    'if not inDateRange and strategy.position_size > 0',
    '    strategy.close("Long", comment="Date exit")',
    ...buildStopLossBlock(preset.stop_loss),
    ...buildExitOverlayBlock(preset.exit_overlay),
  ];

  return `${lines.join('\n')}\n`;
}
