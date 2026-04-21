// ---------------------------------------------------------------------------
// Strategy preset validation (pure — unit testable)
// ---------------------------------------------------------------------------

const VALID_EXIT_OVERLAY_TYPES = [
  'atr_trailing_stop',
  'chandelier_exit',
  'bollinger_2sigma_exit',
  'bollinger_upper_exit',
];

const VALID_STOP_LOSS_TYPES = [
  'hard_percent',
  'atr_stop',
];

const VALID_REGIME_FILTER_TYPES = [
  'spy_above_sma200',
  'rsp_above_sma200',
];
const VALID_ENTRY_CONFIRMATION_TYPES = ['market_follow_through'];

const VALID_MA_TYPES = ['sma', 'ema'];
const VALID_REGIME_ACTIONS = ['no_new_entry', 'exit_all'];
const VALID_RSI_REGIME_DIRECTIONS = ['above'];

function isNonEmptyTrimmedString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const BUILDER_PARAMETER_RULES = {
  raw_source: [],
  price_vs_ma: [
    ['period', 'number'],
    ['ma_type', VALID_MA_TYPES],
  ],
  ma_cross: [
    ['fast_period', 'number'],
    ['slow_period', 'number'],
    ['ma_type', VALID_MA_TYPES],
  ],
  donchian_breakout: [
    ['entry_period', 'number'],
    ['exit_period', 'number'],
  ],
  keltner_breakout: [
    ['ema_period', 'number'],
    ['atr_period', 'number'],
    ['atr_mult', 'number'],
  ],
  connors_rsi_pullback: [
    ['price_rsi_period', 'number'],
    ['streak_rsi_period', 'number'],
    ['percent_rank_period', 'number'],
    ['entry_below', 'number'],
    ['exit_above', 'number'],
  ],
  rsi_mean_reversion: [
    ['rsi_period', 'number'],
    ['entry_below', 'number'],
    ['exit_above', 'number'],
  ],
};

export function validatePreset(preset) {
  const errors = [];
  if (!preset || typeof preset !== 'object') {
    return { valid: false, errors: ['preset must be a non-null object'] };
  }

  if (!preset.id || typeof preset.id !== 'string') {
    errors.push('id is required and must be a string');
  }
  if (!preset.name || typeof preset.name !== 'string') {
    errors.push('name is required and must be a string');
  }
  if (!preset.category || typeof preset.category !== 'string') {
    errors.push('category is required and must be a string');
  }
  if (!preset.builder || typeof preset.builder !== 'string') {
    errors.push('builder is required and must be a string');
  }
  if (!preset.parameters || typeof preset.parameters !== 'object') {
    errors.push('parameters is required and must be an object');
  }

  if (preset.builder === 'raw_source') {
    if (!isNonEmptyTrimmedString(preset.source)) {
      errors.push('source is required and must be a non-empty string for raw_source presets');
    }
  }

  const parameterRules = BUILDER_PARAMETER_RULES[preset.builder];
  if (parameterRules && preset.parameters && typeof preset.parameters === 'object') {
    for (const [key, rule] of parameterRules) {
      const value = preset.parameters[key];
      if (rule === 'number') {
        if (typeof value !== 'number') {
          errors.push(`parameters.${key} is required for ${preset.builder} and must be a number`);
        }
        continue;
      }

      if (!rule.includes(value)) {
        errors.push(`parameters.${key} must be one of: ${rule.join(', ')}`);
      }
    }
  }

  if (preset.exit_overlay) {
    if (!preset.exit_overlay.type) {
      errors.push('exit_overlay.type is required when exit_overlay is present');
    } else if (!VALID_EXIT_OVERLAY_TYPES.includes(preset.exit_overlay.type)) {
      errors.push(
        `exit_overlay.type must be one of: ${VALID_EXIT_OVERLAY_TYPES.join(', ')}`,
      );
    } else if (
      preset.exit_overlay.type === 'atr_trailing_stop' ||
      preset.exit_overlay.type === 'chandelier_exit'
    ) {
      if (typeof preset.exit_overlay.atr_period !== 'number') {
        errors.push('exit_overlay.atr_period is required for ATR-based exits and must be a number');
      }
      if (typeof preset.exit_overlay.atr_multiplier !== 'number') {
        errors.push('exit_overlay.atr_multiplier is required for ATR-based exits and must be a number');
      }
    } else if (
      preset.exit_overlay.type === 'bollinger_2sigma_exit' ||
      preset.exit_overlay.type === 'bollinger_upper_exit'
    ) {
      const length = preset.exit_overlay.length ?? preset.exit_overlay.bb_length;
      const stddev = preset.exit_overlay.stddev ?? preset.exit_overlay.bb_stddev;
      if (typeof length !== 'number') {
        errors.push('exit_overlay length is required for Bollinger exits and must be a number');
      }
      if (typeof stddev !== 'number') {
        errors.push('exit_overlay stddev is required for Bollinger exits and must be a number');
      }
    }
  }

  if (preset.stop_loss) {
    if (!preset.stop_loss.type) {
      errors.push('stop_loss.type is required when stop_loss is present');
    } else if (!VALID_STOP_LOSS_TYPES.includes(preset.stop_loss.type)) {
      errors.push(
        `stop_loss.type must be one of: ${VALID_STOP_LOSS_TYPES.join(', ')}`,
      );
    } else if (preset.stop_loss.type === 'hard_percent') {
      if (typeof preset.stop_loss.value !== 'number') {
        errors.push('stop_loss.value is required for hard_percent and must be a number');
      }
    } else if (preset.stop_loss.type === 'atr_stop') {
      if (typeof preset.stop_loss.atr_period !== 'number') {
        errors.push('stop_loss.atr_period is required for atr_stop and must be a number');
      }
      if (typeof preset.stop_loss.atr_multiplier !== 'number') {
        errors.push('stop_loss.atr_multiplier is required for atr_stop and must be a number');
      }
    }
  }

  if (preset.regime_filter) {
    if (!preset.regime_filter.type) {
      errors.push('regime_filter.type is required when regime_filter is present');
    } else if (!VALID_REGIME_FILTER_TYPES.includes(preset.regime_filter.type)) {
      errors.push(
        `regime_filter.type must be one of: ${VALID_REGIME_FILTER_TYPES.join(', ')}`,
      );
    }
    if (typeof preset.regime_filter.reference_symbol !== 'string') {
      errors.push('regime_filter.reference_symbol is required and must be a string');
    }
    if (!VALID_MA_TYPES.includes(preset.regime_filter.reference_ma_type)) {
      errors.push(`regime_filter.reference_ma_type must be one of: ${VALID_MA_TYPES.join(', ')}`);
    }
    if (typeof preset.regime_filter.reference_ma_period !== 'number') {
      errors.push('regime_filter.reference_ma_period is required and must be a number');
    }
    if (!VALID_REGIME_ACTIONS.includes(preset.regime_filter.action_when_false)) {
      errors.push(
        `regime_filter.action_when_false must be one of: ${VALID_REGIME_ACTIONS.join(', ')}`,
      );
    }
  }

  if (preset.rsi_regime_filter) {
    if (typeof preset.rsi_regime_filter.rsi_period !== 'number') {
      errors.push('rsi_regime_filter.rsi_period is required and must be a number');
    }
    if (typeof preset.rsi_regime_filter.threshold !== 'number') {
      errors.push('rsi_regime_filter.threshold is required and must be a number');
    } else if (
      preset.rsi_regime_filter.threshold < 0 ||
      preset.rsi_regime_filter.threshold > 100
    ) {
      errors.push('rsi_regime_filter.threshold must be between 0 and 100');
    }
    if (!VALID_RSI_REGIME_DIRECTIONS.includes(preset.rsi_regime_filter.direction)) {
      errors.push(
        `rsi_regime_filter.direction must be one of: ${VALID_RSI_REGIME_DIRECTIONS.join(', ')}`,
      );
    }
  }

  if (preset.entry_confirmation_filter) {
    if (!preset.entry_confirmation_filter.type) {
      errors.push('entry_confirmation_filter.type is required when entry_confirmation_filter is present');
    } else if (!VALID_ENTRY_CONFIRMATION_TYPES.includes(preset.entry_confirmation_filter.type)) {
      errors.push(
        `entry_confirmation_filter.type must be one of: ${VALID_ENTRY_CONFIRMATION_TYPES.join(', ')}`,
      );
    }
    if (!Array.isArray(preset.entry_confirmation_filter.symbols) || preset.entry_confirmation_filter.symbols.length === 0) {
      errors.push('entry_confirmation_filter.symbols is required and must be a non-empty array');
    } else if (preset.entry_confirmation_filter.symbols.some((symbol) => !isNonEmptyTrimmedString(symbol))) {
      errors.push('entry_confirmation_filter.symbols must contain only non-empty strings');
    } else {
      const normalizedSymbols = preset.entry_confirmation_filter.symbols.map((symbol) => symbol.trim());
      if (new Set(normalizedSymbols).size !== normalizedSymbols.length) {
        errors.push('entry_confirmation_filter.symbols must not contain duplicates');
      }
    }
    if (!VALID_MA_TYPES.includes(preset.entry_confirmation_filter.price_ma_type)) {
      errors.push(
        `entry_confirmation_filter.price_ma_type must be one of: ${VALID_MA_TYPES.join(', ')}`,
      );
    }
    if (typeof preset.entry_confirmation_filter.price_ma_period !== 'number') {
      errors.push('entry_confirmation_filter.price_ma_period is required and must be a number');
    }
    if (!isNonEmptyTrimmedString(preset.entry_confirmation_filter.vix_symbol)) {
      errors.push('entry_confirmation_filter.vix_symbol is required and must be a non-empty string');
    } else if (
      Array.isArray(preset.entry_confirmation_filter.symbols) &&
      preset.entry_confirmation_filter.symbols.some((symbol) => isNonEmptyTrimmedString(symbol) && symbol.trim() === preset.entry_confirmation_filter.vix_symbol.trim())
    ) {
      errors.push('entry_confirmation_filter.vix_symbol must not duplicate a tracked symbol');
    }
    if (!VALID_MA_TYPES.includes(preset.entry_confirmation_filter.vix_ma_type)) {
      errors.push(
        `entry_confirmation_filter.vix_ma_type must be one of: ${VALID_MA_TYPES.join(', ')}`,
      );
    }
    if (typeof preset.entry_confirmation_filter.vix_ma_period !== 'number') {
      errors.push('entry_confirmation_filter.vix_ma_period is required and must be a number');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validatePresetIds(presets) {
  const seen = new Set();
  const duplicates = [];
  for (const p of presets) {
    if (seen.has(p.id)) {
      duplicates.push(p.id);
    }
    seen.add(p.id);
  }
  return { valid: duplicates.length === 0, duplicates };
}

export function filterPresetsByRound(presets, round) {
  return presets.filter((p) => p.implementation_stage === round);
}
