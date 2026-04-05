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

const VALID_MA_TYPES = ['sma', 'ema'];
const VALID_REGIME_ACTIONS = ['no_new_entry', 'exit_all'];

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
