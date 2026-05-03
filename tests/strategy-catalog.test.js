import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadCatalog,
  getLiveStrategies,
  getRetiredStrategies,
  findStrategyById,
  validateCatalogIntegrity,
} from '../src/core/strategy-catalog.js';

const PROJECT_ROOT = process.cwd();
const EXPECTED_LIVE_IDS = [
  'donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp22-25-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp27-25-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-20-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67',
  'donchian-60-20-rsp-rsi14-regime60-tp30-25-tp90-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-28-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-29-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-31-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-32-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-34-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-35-tp100-50',
  'donchian-60-20-rsp-rsi14-regime60-tp25-36-tp100-50',
  'rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-or-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-or-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-or-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-noconfirm-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-noconfirm-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-noconfirm-sma25-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi62',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma20-rsi65',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi60',
  'donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi60',
  'emr-breakout-baseline-ema9-20-macd12-26-9-rsi50-stop8',
  'emr-breakout-base-ema8-21-macd12-26-9-rsi50-stop8',
  'emr-breakout-base-ema10-24-macd12-26-9-rsi50-stop8',
  'emr-breakout-base-ema12-26-macd12-26-9-rsi52-stop8',
  'emr-breakout-base-ema9-20-macd8-21-5-rsi50-stop8',
  'emr-breakout-delay-1bar-close-above-signal-high',
  'emr-breakout-delay-2bar-close-above-signal-high',
  'emr-breakout-delay-3bar-close-above-signal-high',
  'emr-breakout-delay-2bar-close-above-ema-fast',
  'emr-breakout-delay-3bar-macd-hist-rising',
  'emr-breakout-confirm-close-above-5d-high',
  'emr-breakout-confirm-close-above-10d-high',
  'emr-breakout-confirm-intraday-above-20d-high',
  'emr-breakout-confirm-breakout-and-rsi55',
  'emr-breakout-confirm-breakout-and-macd-positive',
  'emr-breakout-trend-price-above-ema200',
  'emr-breakout-trend-ema50-above-ema200',
  'emr-breakout-trend-ema200-rising-20bars',
  'emr-breakout-trend-price-above-ema200-rsi55',
  'emr-breakout-trend-ema50-200-and-macd-positive',
  'emr-breakout-stop6-base-exit',
  'emr-breakout-stop7-base-exit',
  'emr-breakout-stop9-base-exit',
  'emr-breakout-stop10-base-exit',
  'emr-breakout-stop8-signal-low-buffer',
  'emr-breakout-breakeven-at-plus4',
  'emr-breakout-breakeven-at-plus6',
  'emr-breakout-breakeven-at-plus8',
  'emr-breakout-breakeven-plus1-after-plus6',
  'emr-breakout-breakeven-plus2-after-plus8',
  'emr-breakout-tp8-full-exit',
  'emr-breakout-tp10-full-exit',
  'emr-breakout-tp12-full-exit',
  'emr-breakout-tp8-half-then-trail-ema20',
  'emr-breakout-tp10-half-then-trail-ema20',
  'emr-breakout-trail-atr14x2',
  'emr-breakout-trail-atr14x25',
  'emr-breakout-trail-atr14x3',
  'emr-breakout-trail-chandelier-22x25',
  'emr-breakout-trail-chandelier-22x3',
  'emr-breakout-profit-protect-close-below-ema10',
  'emr-breakout-profit-protect-close-below-ema15',
  'emr-breakout-profit-protect-close-below-ema20',
  'emr-breakout-profit-protect-macd-bear-after-plus6',
  'emr-breakout-profit-protect-rsi-loss-55-after-plus8',
  'emr-breakout-strength-rsi55-and-rsi-over-rsiema',
  'emr-breakout-strength-rsi60-and-rsi-over-rsiema',
  'emr-breakout-strength-macd-hist-rising-3bars',
  'emr-breakout-strength-all-align-and-close-above-fast-ema',
  'emr-breakout-strength-all-align-and-breakout-5d-high',
  'emr-breakout-winrate-stopout-anchor-trend-price-above-ema200',
  'emr-breakout-winrate-stopout-anchor-confirm-close-above-10d-high',
  'emr-breakout-winrate-stopout-anchor-trend-ema50-above-ema200',
  'emr-breakout-winrate-stopout-anchor-confirm-close-above-5d-high',
  'emr-breakout-winrate-stopout-anchor-trend-price-above-ema200-rsi55',
  'emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high',
  'emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05',
  'emr-breakout-winrate-stopout-entry-confirm-volume20x10',
  'emr-breakout-winrate-stopout-entry-confirm-volume20x15',
  'emr-breakout-winrate-stopout-entry-rsi55-macd-positive',
  'emr-breakout-winrate-stopout-entry-rsi60-price-above-ema200',
  'emr-breakout-winrate-stopout-entry-delay-1bar-high-break',
  'emr-breakout-winrate-stopout-entry-delay-2bar-high-break',
  'emr-breakout-winrate-stopout-entry-confirm-10d-high-close-above-fast-ema',
  'emr-breakout-winrate-stopout-entry-confirm-20d-high-close-above-prev-high',
  'emr-breakout-winrate-stopout-stop-grace-3bar-fixed8',
  'emr-breakout-winrate-stopout-stop-grace-5bar-fixed8',
  'emr-breakout-winrate-stopout-stop-until-plus2pct',
  'emr-breakout-winrate-stopout-stop-until-breakout-high',
  'emr-breakout-winrate-stopout-stop-signal-low-only-grace3',
  'emr-breakout-winrate-stopout-stop-atr15-grace5',
  'emr-breakout-winrate-stopout-stop-atr20-grace5',
  'emr-breakout-winrate-stopout-stop-swinglow-atr05',
  'emr-breakout-winrate-stopout-stop-signal-low-atr10',
  'emr-breakout-winrate-stopout-stop-wider-fixed-signal-low-grace3',
  'emr-breakout-winrate-stopout-reentry-10d-high-10bar',
  'emr-breakout-winrate-stopout-reentry-20d-high-15bar',
  'emr-breakout-winrate-stopout-reentry-fast-ema-reclaim',
  'emr-breakout-winrate-stopout-reentry-macd-positive',
  'emr-breakout-winrate-stopout-reentry-rsi55',
  'emr-breakout-winrate-stopout-reentry-breakout-high-close',
  'emr-breakout-winrate-stopout-reentry-grace3-plus-10d-high',
  'emr-breakout-winrate-stopout-reentry-atr15-plus-breakout-high',
  'emr-breakout-winrate-stopout-reentry-signal-low-trend-only',
  'emr-breakout-winrate-stopout-reentry-breakout-high-halfsize',
  'emr-breakout-winrate-stopout-exit-breakeven-plus6',
  'emr-breakout-winrate-stopout-exit-minus2-after-plus4',
  'emr-breakout-winrate-stopout-exit-half-tp8-ema20',
  'emr-breakout-winrate-stopout-exit-half-tp10-ema20',
  'emr-breakout-winrate-stopout-exit-close-below-ema10',
  'emr-breakout-winrate-stopout-exit-close-below-ema15',
  'emr-breakout-winrate-stopout-exit-macd-bear-after-plus6',
  'emr-breakout-winrate-stopout-exit-rsi-loss55-after-plus8',
  'emr-breakout-winrate-stopout-exit-trail-atr25',
  'emr-breakout-winrate-stopout-exit-chandelier25-grace5',
  'emr-breakout-winrate-stopout-hybrid-ema200-10dhigh-grace3',
  'emr-breakout-winrate-stopout-hybrid-ema200-20dhigh-signal-low-atr',
  'emr-breakout-winrate-stopout-hybrid-10dhigh-stopout-breakout-reentry',
  'emr-breakout-winrate-stopout-hybrid-ema200-plus6-ema15',
  'emr-breakout-winrate-stopout-hybrid-ema200-volume15-grace5',
  // emr-next-50pack-us40 (phase-17)
  'emr-next-vol20x05',
  'emr-next-vol20x08',
  'emr-next-vol20x11',
  'emr-next-vol20x12',
  'emr-next-vol20x13',
  'emr-next-vol20x14',
  'emr-next-vol20x20',
  'emr-next-stop-until-plus1pct',
  'emr-next-stop-until-plus3pct',
  'emr-next-stop-until-plus4pct',
  'emr-next-stop-until-bkhigh-vol10',
  'emr-next-stop-until-plus2-vol10',
  'emr-next-stop-until-plus2-rsi60',
  'emr-next-stop-fixed10pct',
  'emr-next-stop-fixed12pct',
  'emr-next-stop-fixed15pct',
  'emr-next-stop-atr15x',
  'emr-next-stop-atr20x',
  'emr-next-stop-atr25x',
  'emr-next-stop-swinglow-2bar',
  'emr-next-stop-swinglow-5bar',
  'emr-next-entry-hist3-closefa',
  'emr-next-entry-ema50-200-vol10',
  'emr-next-entry-rsi55-vol12',
  'emr-next-entry-rsi55-prevhigh',
  'emr-next-entry-rsi60-vol12',
  'emr-next-entry-hist-rsi55-vol10',
  'emr-next-entry-delay1-prevhigh',
  'emr-next-entry-closeefa-vol12',
  'emr-next-entry-20dhigh-rsi55',
  'emr-next-entry-hist3-rsi55-vol10',
  'emr-next-exit-trail-atr15-from3',
  'emr-next-exit-trail-atr25-from5',
  'emr-next-exit-tp5-trail-atr15',
  'emr-next-exit-tp8-trail-atr25',
  'emr-next-exit-tp10-trail-ema20',
  'emr-next-exit-chandelier22-3atr',
  'emr-next-exit-ema20-after5',
  'emr-next-exit-rsi-loss-after8',
  'emr-next-combo-vol12-bkhigh',
  'emr-next-combo-vol12-plus2',
  'emr-next-combo-20dhigh-vol10-trail25',
  'emr-next-combo-ema50200-vol12-stop12',
  'emr-next-combo-rsi60-vol10-bkhigh',
  'emr-next-combo-rsi55-vol10-trail-ema20',
  'emr-next-combo-ultimate',
  'emr-ae-v11-tp5-atr15',
  'emr-ae-v11-tp8-atr25',
  'emr-ae-v11-tp10-ema20',
  'emr-ae-v12-tp5-atr15',
  'emr-ae-v12-tp8-atr25',
  'emr-ae-v12-tp10-ema20',
  'emr-ae-v12-tp12-ema20',
  'emr-ae-v12-tp15-ema20',
  'emr-ae-v13-tp5-atr15',
  'emr-ae-v13-tp8-atr25',
  'emr-ae-v13-tp10-ema20',
  'emr-ae-v13-tp10-atr25',
  'emr-ae-v13-tp12-ema20',
  'emr-ae-v13-tp15-ema20',
  'emr-ae-v13-tp10-qty25',
  'emr-ae-v14-tp5-atr15',
  'emr-ae-v14-tp8-atr25',
  'emr-ae-v14-tp10-ema20',
  'emr-ae-v14-tp12-ema20',
  'emr-ae-v14-tp15-ema20',
  'emr-ae-v15-tp5-atr15',
  'emr-ae-v15-tp8-atr25',
  'emr-ae-v15-tp10-ema20',
  'emr-ae-v15-tp12-ema20',
  'emr-ae-v15-tp15-ema20',
  'emr-ae-v20-tp5-atr15',
  'emr-ae-v20-tp8-atr25',
  'emr-ae-v20-tp10-ema20',
  'emr-ae-v20-tp12-ema20',
  'emr-ae-v20-tp15-ema20',
  'emr-ae-v13-tp6-q5-notrail',
  'emr-ae-v13-tp6-q10-notrail',
  'emr-ae-v13-tp6-q15-notrail',
  'emr-ae-v13-tp6-q20-notrail',
  'emr-ae-v13-tp6-q25-notrail',
  'emr-ae-v13-tp6-q30-notrail',
  'emr-ae-v13-tp6-q35-notrail',
  'emr-ae-v13-tp6-q40-notrail',
  'emr-ae-v13-tp6-q50-notrail',
  'emr-ae-v13-tp6-q60-notrail',
  'emr-ae-v13-tp8-q5-notrail',
  'emr-ae-v13-tp8-q10-notrail',
  'emr-ae-v13-tp8-q15-notrail',
  'emr-ae-v13-tp8-q20-notrail',
  'emr-ae-v13-tp8-q25-notrail',
  'emr-ae-v13-tp8-q30-notrail',
  'emr-ae-v13-tp8-q35-notrail',
  'emr-ae-v13-tp8-q40-notrail',
  'emr-ae-v13-tp8-q50-notrail',
  'emr-ae-v13-tp8-q60-notrail',
  'emr-ae-v13-tp10-q5-notrail',
  'emr-ae-v13-tp10-q10-notrail',
  'emr-ae-v13-tp10-q15-notrail',
  'emr-ae-v13-tp10-q20-notrail',
  'emr-ae-v13-tp10-q25-notrail',
  'emr-ae-v13-tp10-q30-notrail',
  'emr-ae-v13-tp10-q35-notrail',
  'emr-ae-v13-tp10-q40-notrail',
  'emr-ae-v13-tp10-q50-notrail',
  'emr-ae-v13-tp10-q60-notrail',
  'emr-ae-v13-tp12-q5-notrail',
  'emr-ae-v13-tp12-q10-notrail',
  'emr-ae-v13-tp12-q15-notrail',
  'emr-ae-v13-tp12-q20-notrail',
  'emr-ae-v13-tp12-q25-notrail',
  'emr-ae-v13-tp12-q30-notrail',
  'emr-ae-v13-tp12-q35-notrail',
  'emr-ae-v13-tp12-q40-notrail',
  'emr-ae-v13-tp12-q50-notrail',
  'emr-ae-v13-tp12-q60-notrail',
  'emr-ae-v13-tp15-q5-notrail',
  'emr-ae-v13-tp15-q10-notrail',
  'emr-ae-v13-tp15-q15-notrail',
  'emr-ae-v13-tp15-q20-notrail',
  'emr-ae-v13-tp15-q25-notrail',
  'emr-ae-v13-tp15-q30-notrail',
  'emr-ae-v13-tp15-q35-notrail',
  'emr-ae-v13-tp15-q40-notrail',
  'emr-ae-v13-tp15-q50-notrail',
  'emr-ae-v13-tp15-q60-notrail',
  'emr-ae-v13-tp18-q5-notrail',
  'emr-ae-v13-tp18-q10-notrail',
  'emr-ae-v13-tp18-q15-notrail',
  'emr-ae-v13-tp18-q20-notrail',
  'emr-ae-v13-tp18-q25-notrail',
  'emr-ae-v13-tp18-q30-notrail',
  'emr-ae-v13-tp18-q35-notrail',
  'emr-ae-v13-tp18-q40-notrail',
  'emr-ae-v13-tp18-q50-notrail',
  'emr-ae-v13-tp18-q60-notrail',
  'emr-ae-v13-tp20-q5-notrail',
  'emr-ae-v13-tp20-q10-notrail',
  'emr-ae-v13-tp20-q15-notrail',
  'emr-ae-v13-tp20-q20-notrail',
  'emr-ae-v13-tp20-q25-notrail',
  'emr-ae-v13-tp20-q30-notrail',
  'emr-ae-v13-tp20-q35-notrail',
  'emr-ae-v13-tp20-q40-notrail',
  'emr-ae-v13-tp20-q50-notrail',
  'emr-ae-v13-tp20-q60-notrail',
  'emr-ae-v13-tp25-q5-notrail',
  'emr-ae-v13-tp25-q10-notrail',
  'emr-ae-v13-tp25-q15-notrail',
  'emr-ae-v13-tp25-q20-notrail',
  'emr-ae-v13-tp25-q25-notrail',
  'emr-ae-v13-tp25-q30-notrail',
  'emr-ae-v13-tp25-q35-notrail',
  'emr-ae-v13-tp25-q40-notrail',
  'emr-ae-v13-tp25-q50-notrail',
  'emr-ae-v13-tp25-q60-notrail',
  'emr-ae-v13-tp30-q5-notrail',
  'emr-ae-v13-tp30-q10-notrail',
  'emr-ae-v13-tp30-q15-notrail',
  'emr-ae-v13-tp30-q20-notrail',
  'emr-ae-v13-tp30-q25-notrail',
  'emr-ae-v13-tp30-q30-notrail',
  'emr-ae-v13-tp30-q35-notrail',
  'emr-ae-v13-tp30-q40-notrail',
  'emr-ae-v13-tp30-q50-notrail',
  'emr-ae-v13-tp30-q60-notrail',
  'emr-ae-v13-tp35-q5-notrail',
  'emr-ae-v13-tp35-q10-notrail',
  'emr-ae-v13-tp35-q15-notrail',
  'emr-ae-v13-tp35-q20-notrail',
  'emr-ae-v13-tp35-q25-notrail',
  'emr-ae-v13-tp35-q30-notrail',
  'emr-ae-v13-tp35-q35-notrail',
  'emr-ae-v13-tp35-q40-notrail',
  'emr-ae-v13-tp35-q50-notrail',
  'emr-ae-v13-tp35-q60-notrail',
];

// ---------------------------------------------------------------------------
// loadCatalog
// ---------------------------------------------------------------------------
describe('loadCatalog', () => {
  it('loads catalog successfully', async () => {
    const catalog = await loadCatalog();
    assert.ok(catalog);
    assert.ok(Array.isArray(catalog.strategies));
    assert.equal(catalog.$schema_version, '1.0.0');
  });
});

// ---------------------------------------------------------------------------
// validateCatalogIntegrity
// ---------------------------------------------------------------------------
describe('validateCatalogIntegrity', () => {
  it('validates the real catalog without errors', async () => {
    const catalog = await loadCatalog();
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, true, `Catalog errors: ${result.errors.join('; ')}`);
  });

  it('rejects catalog with duplicate ids', () => {
    const catalog = {
      strategies: [
        { id: 'dup', lifecycle: { status: 'live' } },
        { id: 'dup', lifecycle: { status: 'live' } },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /duplicate/.test(e)));
  });

  it('rejects invalid lifecycle status', () => {
    const catalog = {
      strategies: [
        { id: 'bad', lifecycle: { status: 'archived' } },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /invalid lifecycle\.status/.test(e)));
  });

  it('rejects retired entry missing retire_reason', () => {
    const catalog = {
      strategies: [
        {
          id: 'missing-reason',
          lifecycle: {
            status: 'retired',
            last_strong_generation: null,
            replacement_family: null,
          },
        },
      ],
    };
    const result = validateCatalogIntegrity(catalog);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /retire_reason/.test(e)));
  });
});

// ---------------------------------------------------------------------------
// getLiveStrategies / getRetiredStrategies
// ---------------------------------------------------------------------------
describe('getLiveStrategies / getRetiredStrategies', () => {
  it('live count is 350', async () => {
    const catalog = await loadCatalog();
    const live = getLiveStrategies(catalog);
    assert.equal(live.length, 350);
  });

  it('retired count is 2', async () => {
    const catalog = await loadCatalog();
    const retired = getRetiredStrategies(catalog);
    assert.equal(retired.length, 2);
  });

  it('live IDs match expected list', async () => {
    const catalog = await loadCatalog();
    const live = getLiveStrategies(catalog);
    assert.deepEqual(live.map((s) => s.id), EXPECTED_LIVE_IDS);
  });

  it('live and retired do not overlap', async () => {
    const catalog = await loadCatalog();
    const liveIds = new Set(getLiveStrategies(catalog).map((s) => s.id));
    const retiredIds = getRetiredStrategies(catalog).map((s) => s.id);
    for (const id of retiredIds) {
      assert.equal(liveIds.has(id), false, `"${id}" in both live and retired`);
    }
  });

  it('all strategy IDs are unique across catalog', async () => {
    const catalog = await loadCatalog();
    const ids = catalog.strategies.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('live and retired projection files stay aligned with the catalog', async () => {
    const catalog = await loadCatalog();
    const liveIds = getLiveStrategies(catalog).map((s) => s.id);
    const retiredIds = getRetiredStrategies(catalog).map((s) => s.id);
    const liveFile = JSON.parse(readFileSync(join(PROJECT_ROOT, 'config', 'backtest', 'strategy-presets.json'), 'utf8'));
    const retiredFile = JSON.parse(readFileSync(join(PROJECT_ROOT, 'docs', 'research', 'archive', 'retired', 'retired-strategy-presets.json'), 'utf8'));
    assert.deepEqual(liveFile.strategies.map((s) => s.id), liveIds);
    const retiredFileIds = new Set(retiredFile.strategies.map((s) => s.id));
    for (const retiredId of retiredIds) {
      assert.equal(retiredFileIds.has(retiredId), true, `retired projection missing "${retiredId}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// findStrategyById
// ---------------------------------------------------------------------------
describe('findStrategyById', () => {
  it('finds a live strategy by id', async () => {
    const catalog = await loadCatalog();
    const result = findStrategyById(catalog, EXPECTED_LIVE_IDS[0]);
    assert.ok(result);
    assert.equal(result.id, EXPECTED_LIVE_IDS[0]);
    assert.equal(result.lifecycle.status, 'live');
  });

  it('returns null for unknown id', async () => {
    const catalog = await loadCatalog();
    const result = findStrategyById(catalog, 'nonexistent-strategy');
    assert.equal(result, null);
  });

  it('finds the early-entry variant as retired in catalog', async () => {
    const catalog = await loadCatalog();
    const result = findStrategyById(
      catalog,
      'donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early',
    );
    assert.ok(result);
    assert.equal(result.lifecycle.status, 'retired');
  });
});

// ---------------------------------------------------------------------------
// retired entries have required lifecycle fields
// ---------------------------------------------------------------------------
describe('retired lifecycle metadata', () => {
  it('every retired entry has retire_reason, last_strong_generation, replacement_family', async () => {
    const catalog = await loadCatalog();
    const retired = getRetiredStrategies(catalog);
    for (const strategy of retired) {
      const lc = strategy.lifecycle;
      assert.ok(lc.retire_reason, `"${strategy.id}" missing retire_reason`);
      assert.ok('last_strong_generation' in lc, `"${strategy.id}" missing last_strong_generation`);
      assert.ok('replacement_family' in lc, `"${strategy.id}" missing replacement_family`);
    }
  });

  it('retire_reason.code is one of the valid codes', async () => {
    const catalog = await loadCatalog();
    const validCodes = new Set(['fell_below_live_cutline', 'superseded_by_family', 'never_strong']);
    const retired = getRetiredStrategies(catalog);
    for (const strategy of retired) {
      assert.ok(
        validCodes.has(strategy.lifecycle.retire_reason.code),
        `"${strategy.id}" has invalid code: ${strategy.lifecycle.retire_reason.code}`,
      );
    }
  });
});
