#!/usr/bin/env python3
"""
Generate the EMA + MACD + RSI entry-quality focus-8 200-pack.

This script:
1. Writes 199 raw_source Pine variants under docs/references/pine/emr-entry-quality-focus8-200pack/
2. Appends the missing live entries to strategy-presets.json and strategy-catalog.json
3. Writes a new focus-8 campaign that includes the existing baseline plus the 199 variants
4. Updates campaign / strategy-catalog / repo-layout tests
"""

from __future__ import annotations

import json
import re
import textwrap
from copy import deepcopy
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PINE_OUTPUT_DIR = REPO_ROOT / "docs/references/pine/emr-entry-quality-focus8-200pack"
PRESETS_PATH = REPO_ROOT / "config/backtest/strategy-presets.json"
CATALOG_PATH = REPO_ROOT / "config/backtest/strategy-catalog.json"
CAMPAIGN_PATH = REPO_ROOT / "config/backtest/campaigns/emr-entry-quality-focus8-200pack.json"
REPO_LAYOUT_TEST_PATH = REPO_ROOT / "tests/repo-layout.test.js"
STRATEGY_CATALOG_TEST_PATH = REPO_ROOT / "tests/strategy-catalog.test.js"
CAMPAIGN_TEST_PATH = REPO_ROOT / "tests/campaign.test.js"

PINE_DIR = "../../docs/references/pine/emr-entry-quality-focus8-200pack"
BASELINE_ID = "ema-macd-rsi-sl-baseline"
BASELINE_SOURCE_PATH = (
    "../../docs/references/pine/EMA + MACD + RSI Strategy + SL/"
    "EMA + MACD + RSI Strategy + SL.pine"
)
CAMPAIGN_ID = "emr-entry-quality-focus8-200pack"
PHASE = "phase-21"
IMPL_STAGE = "emr-entry-quality-focus8-200pack"
ENTRY_TAGS = ["ema", "macd", "rsi", "entry-quality", "focus-8", "raw-source"]

PARAM_ORDER = [
    "emaFastLen",
    "emaSlowLen",
    "macdFast",
    "macdSlow",
    "macdSignal",
    "rsiLen",
    "rsiEmaLen",
    "rsiLevel",
    "stopPct",
    "minBullScore",
    "strengthRsiMin",
    "strengthHistPositive",
    "strengthHist3",
    "strengthCloseAboveFastEma",
    "strengthCloseAboveSlowEma",
    "delayBars",
    "delayRequireSignalHigh",
    "delayRequireFastEma",
    "delayRequireSlowEma",
    "delayRequireHistRising",
    "breakoutCloseLen",
    "breakoutIntradayLen",
    "swingHighLookback",
    "requireCloseAbovePrevHigh",
    "compressionLookback",
    "compressionMaxRangePct",
    "trendMode",
    "volumeSmaLen",
    "volumeRatioMin",
    "volumeSpikeMult",
    "obvRisingBars",
    "mfiLen",
    "mfiMin",
    "cmfLen",
    "cmfMin",
    "atrLen",
    "atrPctMin",
    "atrPctMax",
    "bbLen",
    "bbMult",
    "bbWidthMin",
    "bbWidthMax",
    "requireSqueezeRelease",
    "barBodyAtrMin",
    "rangeExpLookback",
    "rangeExpRatioMin",
    "dmiLen",
    "adxSmooth",
    "adxMin",
    "requirePlusDiOverMinusDi",
    "stochRsiLen",
    "stochRsiMin",
    "cciLen",
    "cciMin",
    "rocLen",
    "rocMin",
    "maxUpperWickBodyRatio",
    "maxGapPct",
    "recentRunupLookback",
    "maxRecentRunupPct",
    "minClv",
    "failedBreakoutLookback",
    "pullbackMode",
    "pullbackLookback",
    "pullbackRequireRsiHold",
    "pullbackRequireMacdHold",
    "pullbackRequireBullClose",
]


def base_params() -> dict:
    return {
        "emaFastLen": 9,
        "emaSlowLen": 20,
        "macdFast": 12,
        "macdSlow": 26,
        "macdSignal": 9,
        "rsiLen": 14,
        "rsiEmaLen": 14,
        "rsiLevel": 50,
        "stopPct": 8,
        "minBullScore": 0,
        "strengthRsiMin": 0,
        "strengthHistPositive": False,
        "strengthHist3": False,
        "strengthCloseAboveFastEma": False,
        "strengthCloseAboveSlowEma": False,
        "delayBars": 0,
        "delayRequireSignalHigh": False,
        "delayRequireFastEma": False,
        "delayRequireSlowEma": False,
        "delayRequireHistRising": False,
        "breakoutCloseLen": 0,
        "breakoutIntradayLen": 0,
        "swingHighLookback": 0,
        "requireCloseAbovePrevHigh": False,
        "compressionLookback": 0,
        "compressionMaxRangePct": 0.0,
        "trendMode": "none",
        "volumeSmaLen": 20,
        "volumeRatioMin": 0.0,
        "volumeSpikeMult": 0.0,
        "obvRisingBars": 0,
        "mfiLen": 14,
        "mfiMin": 0.0,
        "cmfLen": 20,
        "cmfMin": 0.0,
        "atrLen": 14,
        "atrPctMin": 0.0,
        "atrPctMax": 0.0,
        "bbLen": 20,
        "bbMult": 2.0,
        "bbWidthMin": 0.0,
        "bbWidthMax": 0.0,
        "requireSqueezeRelease": False,
        "barBodyAtrMin": 0.0,
        "rangeExpLookback": 0,
        "rangeExpRatioMin": 0.0,
        "dmiLen": 14,
        "adxSmooth": 14,
        "adxMin": 0.0,
        "requirePlusDiOverMinusDi": False,
        "stochRsiLen": 14,
        "stochRsiMin": 0.0,
        "cciLen": 20,
        "cciMin": 0.0,
        "rocLen": 10,
        "rocMin": 0.0,
        "maxUpperWickBodyRatio": 0.0,
        "maxGapPct": 0.0,
        "recentRunupLookback": 0,
        "maxRecentRunupPct": 0.0,
        "minClv": -2.0,
        "failedBreakoutLookback": 0,
        "pullbackMode": "none",
        "pullbackLookback": 0,
        "pullbackRequireRsiHold": False,
        "pullbackRequireMacdHold": False,
        "pullbackRequireBullClose": False,
    }


def pine_literal(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return f'"{value}"'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        text = f"{value:.6f}".rstrip("0").rstrip(".")
        return text if text else "0"
    raise TypeError(f"Unsupported Pine literal: {value!r}")


def make_variant(strategy_id: str, name: str, note: str, family: str, tags: list[str], overrides: dict) -> dict:
    params = base_params()
    params.update(overrides)
    return {
        "id": strategy_id,
        "name": name,
        "note": note,
        "family": family,
        "tags": tags,
        "params": params,
    }


def add_variant(variants: list[dict], strategy_id: str, name: str, note: str, family: str, tags: list[str], overrides: dict) -> None:
    variants.append(make_variant(strategy_id, name, note, family, tags, overrides))


def build_variants() -> list[dict]:
    variants: list[dict] = []

    # Family A: 9 new variants + existing baseline = 10 strategies in the family
    family = "baseline"
    tags = ENTRY_TAGS + ["baseline"]
    add_variant(
        variants,
        "emr-entry-base-ema8-21",
        "EMR Entry Base EMA 8 21",
        "Speed up the EMA pair to react earlier than the baseline.",
        family,
        tags,
        {"emaFastLen": 8, "emaSlowLen": 21},
    )
    add_variant(
        variants,
        "emr-entry-base-ema10-24",
        "EMR Entry Base EMA 10 24",
        "Slightly slow the EMA pair to trim noisy early flips.",
        family,
        tags,
        {"emaFastLen": 10, "emaSlowLen": 24},
    )
    add_variant(
        variants,
        "emr-entry-base-ema12-26",
        "EMR Entry Base EMA 12 26",
        "Use a slower EMA pair so only broader turns trigger entries.",
        family,
        tags,
        {"emaFastLen": 12, "emaSlowLen": 26},
    )
    add_variant(
        variants,
        "emr-entry-base-macd8-21-5",
        "EMR Entry Base MACD 8 21 5",
        "Make MACD faster so momentum turns must appear quickly.",
        family,
        tags,
        {"macdFast": 8, "macdSlow": 21, "macdSignal": 5},
    )
    add_variant(
        variants,
        "emr-entry-base-macd15-30-10",
        "EMR Entry Base MACD 15 30 10",
        "Slow MACD down so only more persistent trend turns trigger.",
        family,
        tags,
        {"macdFast": 15, "macdSlow": 30, "macdSignal": 10},
    )
    add_variant(
        variants,
        "emr-entry-base-rsi52",
        "EMR Entry Base RSI 52",
        "Raise the RSI level to 52 so weak alignment does not qualify.",
        family,
        tags,
        {"rsiLevel": 52},
    )
    add_variant(
        variants,
        "emr-entry-base-rsi55",
        "EMR Entry Base RSI 55",
        "Raise the RSI level to 55 to admit only stronger trend entries.",
        family,
        tags,
        {"rsiLevel": 55},
    )
    add_variant(
        variants,
        "emr-entry-base-rsi60",
        "EMR Entry Base RSI 60",
        "Raise the RSI level to 60 to aggressively cut marginal entries.",
        family,
        tags,
        {"rsiLevel": 60},
    )
    add_variant(
        variants,
        "emr-entry-base-rsiema10",
        "EMR Entry Base RSI EMA 10",
        "Shorten the RSI EMA so RSI trend flips must happen faster.",
        family,
        tags,
        {"rsiEmaLen": 10},
    )

    strength_levels = [
        ("rsi50", 50),
        ("rsi52", 52),
        ("rsi55", 55),
        ("rsi58", 58),
        ("rsi60", 60),
    ]

    # Family B: 25 confluence variants
    family = "confluence"
    tags = ENTRY_TAGS + ["confluence"]
    b_profiles = [
        ("score3", "Require a minimum bull score of 3.", {"minBullScore": 3}),
        ("score4", "Require a minimum bull score of 4.", {"minBullScore": 4}),
        ("score4hist", "Require bull score 4 and MACD histogram positive.", {"minBullScore": 4, "strengthHistPositive": True}),
        ("score4closefast", "Require bull score 4 and close above the fast EMA.", {"minBullScore": 4, "strengthCloseAboveFastEma": True}),
        (
            "score5histclose",
            "Require bull score 5 plus histogram and close-above-fast confirmation.",
            {"minBullScore": 5, "strengthHistPositive": True, "strengthCloseAboveFastEma": True},
        ),
    ]
    for profile_label, profile_note, profile_overrides in b_profiles:
        for rsi_label, rsi_min in strength_levels:
            add_variant(
                variants,
                f"emr-entry-conf-{profile_label}-{rsi_label}",
                f"EMR Entry Confluence {profile_label.upper()} {rsi_label.upper()}",
                f"{profile_note} Also require RSI >= {rsi_min}.",
                family,
                tags,
                {**profile_overrides, "strengthRsiMin": rsi_min},
            )

    # Family C: 25 delay / follow-through variants
    family = "delay"
    tags = ENTRY_TAGS + ["delay"]
    c_profiles = [
        ("1barhigh", "Wait one bar and require a close above the signal high.", {"delayBars": 1, "delayRequireSignalHigh": True}),
        (
            "1barhighfast",
            "Wait one bar, require signal-high confirmation, and keep the close above the fast EMA.",
            {"delayBars": 1, "delayRequireSignalHigh": True, "delayRequireFastEma": True},
        ),
        ("2barhigh", "Wait up to two bars and require a close above the signal high.", {"delayBars": 2, "delayRequireSignalHigh": True}),
        (
            "2barfasthist",
            "Wait up to two bars and require signal-high, fast-EMA, and histogram improvement confirmation.",
            {"delayBars": 2, "delayRequireSignalHigh": True, "delayRequireFastEma": True, "delayRequireHistRising": True},
        ),
        (
            "3barfastslowhist",
            "Wait up to three bars and require signal-high, fast-EMA, slow-EMA, and histogram confirmation.",
            {
                "delayBars": 3,
                "delayRequireSignalHigh": True,
                "delayRequireFastEma": True,
                "delayRequireSlowEma": True,
                "delayRequireHistRising": True,
            },
        ),
    ]
    for profile_label, profile_note, profile_overrides in c_profiles:
        for rsi_label, rsi_min in strength_levels:
            add_variant(
                variants,
                f"emr-entry-delay-{profile_label}-{rsi_label}",
                f"EMR Entry Delay {profile_label.upper()} {rsi_label.upper()}",
                f"{profile_note} Also require RSI >= {rsi_min} at entry.",
                family,
                tags,
                {**profile_overrides, "strengthRsiMin": rsi_min},
            )

    # Family D: 25 breakout structure variants
    family = "structure"
    tags = ENTRY_TAGS + ["structure"]
    d_profiles = [
        ("close5", "Require a close above the prior 5-day high.", {"breakoutCloseLen": 5}),
        ("close10", "Require a close above the prior 10-day high.", {"breakoutCloseLen": 10}),
        ("intraday20", "Require an intraday break above the prior 20-day high.", {"breakoutIntradayLen": 20}),
        ("swing20", "Require a close above the prior 20-bar swing high.", {"swingHighLookback": 20}),
        (
            "donchian55compress",
            "Require a 55-day breakout after a compressed 10-bar base.",
            {"breakoutCloseLen": 55, "compressionLookback": 10, "compressionMaxRangePct": 12.0},
        ),
    ]
    for profile_label, profile_note, profile_overrides in d_profiles:
        for rsi_label, rsi_min in strength_levels:
            add_variant(
                variants,
                f"emr-entry-struct-{profile_label}-{rsi_label}",
                f"EMR Entry Structure {profile_label.upper()} {rsi_label.upper()}",
                f"{profile_note} Also require RSI >= {rsi_min}.",
                family,
                tags,
                {**profile_overrides, "strengthRsiMin": rsi_min},
            )

    # Family E: 20 trend / regime variants
    family = "trend"
    tags = ENTRY_TAGS + ["trend"]
    trend_levels = [
        ("soft", {"strengthRsiMin": 50}),
        ("mid", {"strengthRsiMin": 52}),
        ("firm", {"strengthRsiMin": 55}),
        ("score4", {"minBullScore": 4, "strengthHistPositive": True}),
        ("score5", {"minBullScore": 5, "strengthHistPositive": True}),
    ]
    e_profiles = [
        ("priceema200", "Only allow entries when price is above EMA200.", {"trendMode": "price_above_ema200"}),
        ("ema50over200", "Only allow entries when EMA50 is above EMA200.", {"trendMode": "ema50_above_ema200"}),
        ("ema200rising", "Only allow entries when EMA200 is rising over 20 bars.", {"trendMode": "ema200_rising_20"}),
        (
            "adxtrend",
            "Only allow entries when ADX trend strength and directional bias are positive.",
            {"trendMode": "adx_trend", "requirePlusDiOverMinusDi": True},
        ),
    ]
    for profile_label, profile_note, profile_overrides in e_profiles:
        for idx, (level_label, level_overrides) in enumerate(trend_levels):
            extra = {}
            if profile_label == "adxtrend":
                extra["adxMin"] = [18, 20, 22, 25, 30][idx]
            add_variant(
                variants,
                f"emr-entry-trend-{profile_label}-{level_label}",
                f"EMR Entry Trend {profile_label.upper()} {level_label.upper()}",
                profile_note,
                family,
                tags,
                {**profile_overrides, **level_overrides, **extra},
            )

    # Family F: 20 volume variants
    family = "volume"
    tags = ENTRY_TAGS + ["volume"]
    rel_volume_levels = [1.05, 1.10, 1.20, 1.35, 1.50]
    rel_volume_hard = [1.10, 1.20, 1.30, 1.50, 2.00]
    spike_levels = [1.05, 1.10, 1.20, 1.35, 1.50]
    cmf_mfi_levels = [(50, 0.00), (55, 0.02), (60, 0.05), (65, 0.08), (70, 0.10)]
    for idx, threshold in enumerate(rel_volume_levels):
        add_variant(
            variants,
            f"emr-entry-vol-sma-{idx+1:02d}",
            f"EMR Entry Volume SMA {idx+1:02d}",
            f"Require volume to be at least {threshold:.2f}x its 20-bar average.",
            family,
            tags,
            {"volumeRatioMin": threshold},
        )
    for idx, threshold in enumerate(rel_volume_hard):
        add_variant(
            variants,
            f"emr-entry-vol-rel-{idx+1:02d}",
            f"EMR Entry Relative Volume {idx+1:02d}",
            f"Require relative volume of at least {threshold:.2f}.",
            family,
            tags,
            {"volumeRatioMin": threshold, "strengthHistPositive": True},
        )
    for idx, threshold in enumerate(spike_levels):
        add_variant(
            variants,
            f"emr-entry-vol-spike-obv-{idx+1:02d}",
            f"EMR Entry Volume Spike OBV {idx+1:02d}",
            f"Require a {threshold:.2f}x day-over-day volume spike and rising OBV.",
            family,
            tags,
            {"volumeSpikeMult": threshold, "obvRisingBars": 2},
        )
    for idx, (mfi_min, cmf_min) in enumerate(cmf_mfi_levels):
        add_variant(
            variants,
            f"emr-entry-vol-cmf-mfi-{idx+1:02d}",
            f"EMR Entry CMF MFI {idx+1:02d}",
            f"Require MFI >= {mfi_min} and CMF >= {cmf_min:.2f}.",
            family,
            tags,
            {"mfiMin": float(mfi_min), "cmfMin": float(cmf_min)},
        )

    # Family G: 20 volatility-quality variants
    family = "volatility"
    tags = ENTRY_TAGS + ["volatility"]
    atr_bands = [(1.0, 8.0), (1.5, 8.0), (2.0, 10.0), (2.5, 10.0), (3.0, 12.0)]
    bb_widths = [4.0, 6.0, 8.0, 10.0, 12.0]
    squeeze_body = [(True, 0.20), (True, 0.25), (True, 0.30), (True, 0.35), (True, 0.40)]
    range_expansion = [(5, 1.10), (5, 1.20), (10, 1.20), (10, 1.35), (15, 1.50)]
    for idx, (atr_min, atr_max) in enumerate(atr_bands):
        add_variant(
            variants,
            f"emr-entry-volq-atrband-{idx+1:02d}",
            f"EMR Entry ATR Band {idx+1:02d}",
            f"Only allow entries when ATR percent is between {atr_min} and {atr_max}.",
            family,
            tags,
            {"atrPctMin": atr_min, "atrPctMax": atr_max},
        )
    for idx, bb_min in enumerate(bb_widths):
        add_variant(
            variants,
            f"emr-entry-volq-bbwidth-{idx+1:02d}",
            f"EMR Entry BB Width {idx+1:02d}",
            f"Require Bollinger width >= {bb_min}.",
            family,
            tags,
            {"bbWidthMin": bb_min},
        )
    for idx, (_, body_min) in enumerate(squeeze_body):
        add_variant(
            variants,
            f"emr-entry-volq-squeeze-{idx+1:02d}",
            f"EMR Entry Squeeze {idx+1:02d}",
            f"Require squeeze release and bar body >= {body_min} ATR.",
            family,
            tags,
            {"requireSqueezeRelease": True, "barBodyAtrMin": body_min},
        )
    for idx, (lookback, ratio_min) in enumerate(range_expansion):
        add_variant(
            variants,
            f"emr-entry-volq-range-{idx+1:02d}",
            f"EMR Entry Range Expansion {idx+1:02d}",
            f"Require current range to be at least {ratio_min:.2f}x the {lookback}-bar average.",
            family,
            tags,
            {"rangeExpLookback": lookback, "rangeExpRatioMin": ratio_min},
        )

    # Family H: 10 additional momentum variants
    family = "momentum"
    tags = ENTRY_TAGS + ["momentum"]
    adx_levels = [18, 20, 22, 25, 30]
    combo_levels = [
        (60, 50, 2),
        (65, 75, 3),
        (70, 100, 4),
        (75, 125, 5),
        (80, 150, 6),
    ]
    for idx, adx_min in enumerate(adx_levels):
        add_variant(
            variants,
            f"emr-entry-momo-adx-dmi-{idx+1:02d}",
            f"EMR Entry ADX DMI {idx+1:02d}",
            f"Require ADX >= {adx_min} with +DI above -DI.",
            family,
            tags,
            {"adxMin": adx_min, "requirePlusDiOverMinusDi": True},
        )
    for idx, (stoch_min, cci_min, roc_min) in enumerate(combo_levels):
        add_variant(
            variants,
            f"emr-entry-momo-stoch-cci-roc-{idx+1:02d}",
            f"EMR Entry Stoch CCI ROC {idx+1:02d}",
            f"Require Stoch RSI >= {stoch_min}, CCI >= {cci_min}, and ROC >= {roc_min}.",
            family,
            tags,
            {"stochRsiMin": float(stoch_min), "cciMin": float(cci_min), "rocMin": float(roc_min)},
        )

    # Family I: 25 fakeout guard variants
    family = "fakeout"
    tags = ENTRY_TAGS + ["fakeout"]
    wick_levels = [1.00, 0.75, 0.50, 0.33, 0.25]
    gap_levels = [10.0, 8.0, 6.0, 4.0, 2.0]
    runup_levels = [(5, 10.0), (5, 15.0), (10, 15.0), (10, 20.0), (15, 25.0)]
    clv_levels = [0.00, 0.10, 0.20, 0.30, 0.40]
    fail_break_levels = [5, 10, 15, 20, 25]
    for idx, ratio in enumerate(wick_levels):
        add_variant(
            variants,
            f"emr-entry-fake-wick-{idx+1:02d}",
            f"EMR Entry Wick Guard {idx+1:02d}",
            f"Reject entries when the upper wick exceeds {ratio:.2f}x the candle body.",
            family,
            tags,
            {"maxUpperWickBodyRatio": ratio},
        )
    for idx, gap_max in enumerate(gap_levels):
        add_variant(
            variants,
            f"emr-entry-fake-gap-{idx+1:02d}",
            f"EMR Entry Gap Guard {idx+1:02d}",
            f"Reject entries when the opening gap exceeds {gap_max:.1f}%.",
            family,
            tags,
            {"maxGapPct": gap_max},
        )
    for idx, (lookback, runup_max) in enumerate(runup_levels):
        add_variant(
            variants,
            f"emr-entry-fake-runup-{idx+1:02d}",
            f"EMR Entry Runup Guard {idx+1:02d}",
            f"Reject entries after a {lookback}-bar runup greater than {runup_max:.1f}%.",
            family,
            tags,
            {"recentRunupLookback": lookback, "maxRecentRunupPct": runup_max},
        )
    for idx, clv_min in enumerate(clv_levels):
        add_variant(
            variants,
            f"emr-entry-fake-clv-{idx+1:02d}",
            f"EMR Entry CLV Guard {idx+1:02d}",
            f"Reject entries unless CLV is at least {clv_min:.2f}.",
            family,
            tags,
            {"minClv": clv_min},
        )
    for idx, lookback in enumerate(fail_break_levels):
        add_variant(
            variants,
            f"emr-entry-fake-failedbreak-{idx+1:02d}",
            f"EMR Entry Failed Breakout Guard {idx+1:02d}",
            f"Reject entries if a failed breakout occurred within the last {lookback} bars.",
            family,
            tags,
            {"failedBreakoutLookback": lookback},
        )

    # Family J: 20 pullback-resume variants
    family = "pullback"
    tags = ENTRY_TAGS + ["pullback"]
    pullback_levels = [3, 5, 7, 10, 15]
    for idx, lookback in enumerate(pullback_levels):
        add_variant(
            variants,
            f"emr-entry-pull-fast-{idx+1:02d}",
            f"EMR Entry Pullback Fast EMA {idx+1:02d}",
            f"After a recent buy signal, wait up to {lookback} bars for a fast-EMA pullback and rebound.",
            family,
            tags,
            {"pullbackMode": "fast_ema", "pullbackLookback": lookback, "pullbackRequireBullClose": True},
        )
    for idx, lookback in enumerate(pullback_levels):
        add_variant(
            variants,
            f"emr-entry-pull-slow-{idx+1:02d}",
            f"EMR Entry Pullback Slow EMA {idx+1:02d}",
            f"After a recent buy signal, wait up to {lookback} bars for a slow-EMA pullback and rebound.",
            family,
            tags,
            {"pullbackMode": "slow_ema", "pullbackLookback": lookback, "pullbackRequireBullClose": True},
        )
    for idx, lookback in enumerate(pullback_levels):
        add_variant(
            variants,
            f"emr-entry-pull-retest-{idx+1:02d}",
            f"EMR Entry Breakout Retest {idx+1:02d}",
            f"After a recent buy signal, wait up to {lookback} bars for a breakout retest and recovery close.",
            family,
            tags,
            {"pullbackMode": "breakout_retest", "pullbackLookback": lookback, "pullbackRequireBullClose": True},
        )
    for idx, lookback in enumerate(pullback_levels):
        add_variant(
            variants,
            f"emr-entry-pull-fast-hold-{idx+1:02d}",
            f"EMR Entry Pullback Fast Hold {idx+1:02d}",
            f"Fast-EMA pullback entry that also requires RSI and MACD to stay constructive across {lookback} bars.",
            family,
            tags,
            {
                "pullbackMode": "fast_ema",
                "pullbackLookback": lookback,
                "pullbackRequireBullClose": True,
                "pullbackRequireRsiHold": True,
                "pullbackRequireMacdHold": True,
            },
        )

    ids = [v["id"] for v in variants]
    if len(ids) != 199:
        raise RuntimeError(f"Expected 199 new variants, got {len(ids)}")
    if len(set(ids)) != len(ids):
        raise RuntimeError("Variant IDs must be unique")

    return variants


def render_param_lines(params: dict) -> str:
    return "\n".join(f"{key:<28} = {pine_literal(params[key])}" for key in PARAM_ORDER)


PINE_TEMPLATE = textwrap.dedent(
    """\
    //@version=5
    strategy(
         title             = "{title}",
         overlay           = true,
         initial_capital   = 10000,
         currency          = currency.USD,
         default_qty_type  = strategy.percent_of_equity,
         default_qty_value = 100,
         commission_type   = strategy.commission.percent,
         commission_value  = 0.1
     )

    // Fixed backtest range
    startDate = timestamp(2015, 1, 1, 0, 0)
    endDate   = timestamp(2026, 4, 27, 0, 0)
    inRange   = time >= startDate and time <= endDate

    // Variant metadata
    variantId   = "{variant_id}"
    variantNote = "{variant_note}"

    // Fixed parameters for this variant
    {param_lines}

    // Core calculations
    emaFast = ta.ema(close, emaFastLen)
    emaSlow = ta.ema(close, emaSlowLen)
    ema50   = ta.ema(close, 50)
    ema200  = ta.ema(close, 200)
    [macdLine, signalLine, histLine] = ta.macd(close, macdFast, macdSlow, macdSignal)
    rsi    = ta.rsi(close, rsiLen)
    rsiEma = ta.ema(rsi, rsiEmaLen)
    atr    = ta.atr(atrLen)
    [plusDi, minusDi, adx] = ta.dmi(dmiLen, adxSmooth)
    cci = ta.cci(hlc3, cciLen)
    roc = ta.roc(close, rocLen)

    bbBasis = ta.sma(close, bbLen)
    bbDev = ta.stdev(close, bbLen) * bbMult
    bbUpper = bbBasis + bbDev
    bbLower = bbBasis - bbDev
    bbWidthPct = bbBasis != 0 ? (bbUpper - bbLower) / bbBasis * 100 : 0

    kcBasis = ta.ema(close, bbLen)
    kcRange = ta.atr(bbLen) * 1.5
    kcUpper = kcBasis + kcRange
    kcLower = kcBasis - kcRange
    squeezeOn = bbUpper < kcUpper and bbLower > kcLower
    squeezeRelease = squeezeOn[1] and not squeezeOn and close > bbBasis

    volumeSma = ta.sma(volume, volumeSmaLen)
    relVolume = volumeSma > 0 ? volume / volumeSma : 0

    var float obv = na
    obv := na(obv[1]) ? volume : close > close[1] ? obv[1] + volume : close < close[1] ? obv[1] - volume : obv[1]

    typicalPrice = hlc3
    rawMoneyFlow = typicalPrice * volume
    positiveFlow = typicalPrice > typicalPrice[1] ? rawMoneyFlow : 0.0
    negativeFlow = typicalPrice < typicalPrice[1] ? rawMoneyFlow : 0.0
    positiveMoney = ta.sum(positiveFlow, mfiLen)
    negativeMoney = ta.sum(negativeFlow, mfiLen)
    moneyRatio = negativeMoney == 0 ? 1000000.0 : positiveMoney / negativeMoney
    mfi = 100 - (100 / (1 + moneyRatio))

    mfMultiplier = high != low ? ((close - low) - (high - close)) / (high - low) : 0.0
    cmf = ta.sum(mfMultiplier * volume, cmfLen) / math.max(ta.sum(volume, cmfLen), 1.0)

    rsiLowest = ta.lowest(rsi, stochRsiLen)
    rsiHighest = ta.highest(rsi, stochRsiLen)
    stochRsi = (rsiHighest - rsiLowest) == 0 ? 0.0 : (rsi - rsiLowest) / (rsiHighest - rsiLowest) * 100

    emaBullCross = ta.crossover(emaFast, emaSlow)
    emaBearCross = ta.crossunder(emaFast, emaSlow)
    emaAlignBull = emaFast > emaSlow
    emaAlignBear = emaFast < emaSlow

    macdBullCross = ta.crossover(macdLine, signalLine)
    macdBearCross = ta.crossunder(macdLine, signalLine)
    macdAlignBull = macdLine > signalLine
    macdAlignBear = macdLine < signalLine

    rsiBullCross = ta.crossover(rsi, rsiEma)
    rsiBearCross = ta.crossunder(rsi, rsiEma)
    rsiAlignBull = rsi > rsiEma
    rsiAlignBear = rsi < rsiEma

    buyRaw = (
        (emaBullCross  and macdAlignBull and rsiAlignBull) or
        (macdBullCross and emaAlignBull  and rsiAlignBull) or
        (rsiBullCross  and emaAlignBull  and macdAlignBull)
    )

    sellRaw = (
        (emaBearCross  and macdAlignBear and rsiAlignBear) or
        (macdBearCross and emaAlignBear  and rsiAlignBear) or
        (rsiBearCross  and emaAlignBear  and macdAlignBear)
    )

    bullScore = (
        (emaAlignBull ? 1 : 0) + (macdAlignBull ? 1 : 0) + (rsiAlignBull ? 1 : 0) +
        (rsi > rsiLevel ? 1 : 0) + (histLine > 0 ? 1 : 0) + (close > emaFast ? 1 : 0) +
        (close > emaSlow ? 1 : 0)
    )
    bearScore = (
        (emaAlignBear ? 1 : 0) + (macdAlignBear ? 1 : 0) + (rsiAlignBear ? 1 : 0) +
        (rsi < rsiLevel ? 1 : 0) + (histLine < 0 ? 1 : 0) + (close < emaFast ? 1 : 0) +
        (close < emaSlow ? 1 : 0)
    )

    breakoutCloseOk = breakoutCloseLen <= 0 or close > ta.highest(high, breakoutCloseLen)[1]
    breakoutIntradayOk = breakoutIntradayLen <= 0 or high > ta.highest(high, breakoutIntradayLen)[1]
    swingHighOk = swingHighLookback <= 0 or close > ta.highest(high, swingHighLookback)[1]
    prevHighOk = not requireCloseAbovePrevHigh or close > high[1]
    compressionRangePct = compressionLookback > 0 ? (ta.highest(high, compressionLookback) - ta.lowest(low, compressionLookback)) / close * 100 : na
    compressionOk = compressionLookback <= 0 or (not na(compressionRangePct) and compressionRangePct <= compressionMaxRangePct)

    bullScoreOk = minBullScore <= 0 or bullScore >= minBullScore
    strengthRsiOk = strengthRsiMin <= 0 or (rsi >= strengthRsiMin and rsi > rsiEma)
    strengthHistPositiveOk = not strengthHistPositive or histLine > 0
    strengthHist3Ok = not strengthHist3 or (histLine > histLine[1] and histLine[1] > histLine[2])
    strengthCloseFastOk = not strengthCloseAboveFastEma or close > emaFast
    strengthCloseSlowOk = not strengthCloseAboveSlowEma or close > emaSlow
    confluenceOk = bullScoreOk and strengthRsiOk and strengthHistPositiveOk and strengthHist3Ok and strengthCloseFastOk and strengthCloseSlowOk

    trendOk = switch trendMode
        "price_above_ema200" => close > ema200
        "ema50_above_ema200" => ema50 > ema200
        "ema200_rising_20"   => ema200 > ema200[20]
        "emaSlow_rising_10"  => emaSlow > emaSlow[10]
        "adx_trend"          => adx >= math.max(adxMin, 20) and plusDi > minusDi
        => true

    volumeRatioOk = volumeRatioMin <= 0 or relVolume >= volumeRatioMin
    volumeSpikeOk = volumeSpikeMult <= 0 or (not na(volume[1]) and volume >= volume[1] * volumeSpikeMult)
    obvOk = obvRisingBars <= 0 or (not na(obv[obvRisingBars]) and obv > obv[obvRisingBars])
    mfiOk = mfiMin <= 0 or mfi >= mfiMin
    cmfOk = cmfMin <= 0 or cmf >= cmfMin
    volumeOk = volumeRatioOk and volumeSpikeOk and obvOk and mfiOk and cmfOk

    atrPct = close != 0 ? atr / close * 100 : 0
    atrMinOk = atrPctMin <= 0 or atrPct >= atrPctMin
    atrMaxOk = atrPctMax <= 0 or atrPct <= atrPctMax
    bbWidthMinOk = bbWidthMin <= 0 or bbWidthPct >= bbWidthMin
    bbWidthMaxOk = bbWidthMax <= 0 or bbWidthPct <= bbWidthMax
    bodyAtrOk = barBodyAtrMin <= 0 or (math.abs(close - open) / math.max(atr, syminfo.mintick)) >= barBodyAtrMin
    avgRange = rangeExpLookback > 0 ? ta.sma(high - low, rangeExpLookback) : na
    rangeExpRatio = rangeExpLookback > 0 and not na(avgRange) and avgRange != 0 ? (high - low) / avgRange : na
    rangeExpOk = rangeExpLookback <= 0 or (not na(rangeExpRatio) and rangeExpRatio >= rangeExpRatioMin)
    squeezeOk = not requireSqueezeRelease or squeezeRelease
    volatilityOk = atrMinOk and atrMaxOk and bbWidthMinOk and bbWidthMaxOk and bodyAtrOk and rangeExpOk and squeezeOk

    adxOk = adxMin <= 0 or adx >= adxMin
    plusDiOk = not requirePlusDiOverMinusDi or plusDi > minusDi
    stochOk = stochRsiMin <= 0 or stochRsi >= stochRsiMin
    cciOk = cciMin <= 0 or cci >= cciMin
    rocOk = rocMin <= 0 or roc >= rocMin
    momentumOk = adxOk and plusDiOk and stochOk and cciOk and rocOk

    bodySize = math.abs(close - open)
    upperWick = high - math.max(open, close)
    upperWickRatio = bodySize == 0 ? (upperWick > 0 ? 999.0 : 0.0) : upperWick / bodySize
    wickOk = maxUpperWickBodyRatio <= 0 or upperWickRatio <= maxUpperWickBodyRatio
    gapPct = close[1] != 0 ? math.max(open - close[1], 0) / close[1] * 100 : 0
    gapOk = maxGapPct <= 0 or gapPct <= maxGapPct
    recentLow = recentRunupLookback > 0 ? ta.lowest(low, recentRunupLookback)[1] : na
    recentRunupPct = recentRunupLookback <= 0 or na(recentLow) or recentLow <= 0 ? 0 : (close / recentLow - 1) * 100
    runupOk = maxRecentRunupPct <= 0 or recentRunupPct <= maxRecentRunupPct
    clv = high != low ? ((close - low) - (high - close)) / (high - low) : 0
    clvOk = minClv <= -1 or clv >= minClv
    failedRef = failedBreakoutLookback > 0 ? ta.highest(high, failedBreakoutLookback)[1] : na
    failedBreakoutBar = failedBreakoutLookback > 0 and not na(failedRef) and high > failedRef and close < failedRef
    failedBreakoutRecent = failedBreakoutLookback > 0 and not na(ta.barssince(failedBreakoutBar)) and ta.barssince(failedBreakoutBar) < failedBreakoutLookback
    failedBreakoutOk = failedBreakoutLookback <= 0 or not failedBreakoutRecent
    fakeoutOk = wickOk and gapOk and runupOk and clvOk and failedBreakoutOk

    barsSinceBuyRaw = ta.barssince(buyRaw)
    recentBuyContext = pullbackLookback > 0 and not na(barsSinceBuyRaw) and barsSinceBuyRaw > 0 and barsSinceBuyRaw <= pullbackLookback
    retestLevel = pullbackLookback > 0 ? ta.highest(high, pullbackLookback)[1] : na
    pullbackFastOk = pullbackMode == "fast_ema" and recentBuyContext and low <= emaFast and close > emaFast
    pullbackSlowOk = pullbackMode == "slow_ema" and recentBuyContext and low <= emaSlow and close > emaFast
    pullbackBreakoutOk = pullbackMode == "breakout_retest" and recentBuyContext and not na(retestLevel) and low <= retestLevel and close > retestLevel
    pullbackMomentumOk = (not pullbackRequireRsiHold or rsi >= 50) and (not pullbackRequireMacdHold or (macdAlignBull and histLine > 0)) and (not pullbackRequireBullClose or close > open)
    pullbackEntryRaw = pullbackMode != "none" and pullbackMomentumOk and (pullbackFastOk or pullbackSlowOk or pullbackBreakoutOk)
    entrySeed = pullbackMode == "none" ? buyRaw : pullbackEntryRaw

    entryFiltersOk = confluenceOk and breakoutCloseOk and breakoutIntradayOk and swingHighOk and prevHighOk and compressionOk and trendOk and volumeOk and volatilityOk and momentumOk and fakeoutOk

    var int posState = 0
    var bool pendingLong = false
    var float pendingSignalHigh = na
    var float pendingSignalLow = na
    var int pendingSignalBar = na

    newSignal = inRange and barstate.isconfirmed and entrySeed and entryFiltersOk and strategy.position_size <= 0 and not pendingLong and posState != 1
    if newSignal
        if delayBars == 0
            strategy.entry("Long", strategy.long)
            posState := 1
        else
            pendingLong := true
            pendingSignalHigh := high
            pendingSignalLow := low
            pendingSignalBar := bar_index

    barsSincePending = pendingLong and not na(pendingSignalBar) ? bar_index - pendingSignalBar : na
    pendingWindowOk = pendingLong and not na(barsSincePending) and barsSincePending > 0 and barsSincePending <= delayBars
    pendingConfirmOk = (
        entryFiltersOk and emaAlignBull and macdAlignBull and rsiAlignBull and
        (not delayRequireSignalHigh or close > pendingSignalHigh) and
        (not delayRequireFastEma or close > emaFast) and
        (not delayRequireSlowEma or close > emaSlow) and
        (not delayRequireHistRising or histLine > histLine[1])
    )

    if pendingWindowOk and pendingConfirmOk and inRange and barstate.isconfirmed and strategy.position_size <= 0 and posState != 1
        strategy.entry("Long", strategy.long)
        posState := 1
        pendingLong := false
        pendingSignalHigh := na
        pendingSignalLow := na
        pendingSignalBar := na

    if pendingLong and (sellRaw or (not na(barsSincePending) and barsSincePending > delayBars))
        pendingLong := false
        pendingSignalHigh := na
        pendingSignalLow := na
        pendingSignalBar := na

    if inRange and sellRaw and barstate.isconfirmed
        pendingLong := false
        pendingSignalHigh := na
        pendingSignalLow := na
        pendingSignalBar := na
        posState := -1
        if strategy.position_size > 0
            strategy.close("Long", comment="SELL")

    stopLossPrice = strategy.position_avg_price * (1 - stopPct / 100)
    if strategy.position_size > 0
        strategy.exit("StopLoss", from_entry="Long", stop=stopLossPrice)

    bullTrans = bullScore >= 6 ? 12 : bullScore >= 5 ? 26 : bullScore >= 4 ? 42 : 82
    bearTrans = bearScore >= 6 ? 12 : bearScore >= 5 ? 26 : bearScore >= 4 ? 42 : 82
    ribbonColor = bullScore > bearScore ? color.new(color.lime, bullTrans) : bearScore > bullScore ? color.new(color.red, bearTrans) : color.new(color.gray, 92)

    p1 = plot(emaFast, "Fast EMA", color=color.new(color.aqua, 0), linewidth=1)
    p2 = plot(emaSlow, "Slow EMA", color=color.new(color.orange, 0), linewidth=1)
    plot(ema200, "EMA 200", color=color.new(color.gray, 45), linewidth=1)
    fill(p1, p2, color=ribbonColor, title="Confluence Ribbon")

    plotshape(inRange and newSignal and delayBars == 0 and barstate.isconfirmed, title="BUY", style=shape.labelup, location=location.belowbar, color=color.new(color.lime, 10), textcolor=color.black, text="BUY", size=size.tiny)
    plotshape(inRange and pendingWindowOk and pendingConfirmOk and barstate.isconfirmed, title="BUY Delay", style=shape.labelup, location=location.belowbar, color=color.new(color.green, 10), textcolor=color.black, text="BUY", size=size.tiny)
    plotshape(inRange and sellRaw and barstate.isconfirmed, title="SELL", style=shape.labeldown, location=location.abovebar, color=color.new(color.red, 10), textcolor=color.white, text="SELL", size=size.tiny)
    """
)


def escape_pine_string(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


def render_pine(variant: dict) -> str:
    return PINE_TEMPLATE.format(
        title=escape_pine_string(variant["name"]),
        variant_id=escape_pine_string(variant["id"]),
        variant_note=escape_pine_string(variant["note"]),
        param_lines=render_param_lines(variant["params"]),
    )


def write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text() == content:
        return
    path.write_text(content)


def update_json_array(path: Path, entries: list[dict]) -> None:
    doc = json.loads(path.read_text())
    existing_ids = {item["id"] for item in doc["strategies"]}
    for entry in entries:
        if entry["id"] not in existing_ids:
            doc["strategies"].append(entry)
    path.write_text(json.dumps(doc, indent=2) + "\n")


def make_preset_entry(variant: dict, priority: int) -> dict:
    return {
        "id": variant["id"],
        "name": variant["name"],
        "category": "breakout",
        "builder": "raw_source",
        "parameters": deepcopy(variant["params"]),
        "stop_loss": {"type": "hard_percent", "value": 8},
        "theme_axis": variant["family"],
        "theme_notes": variant["note"],
        "recommended_timeframes": ["D"],
        "recommended_regime": "mixed",
        "mag7_notes": "Entry-quality focus-8 pack derived from EMA + MACD + RSI baseline without TP experiments.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": priority,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "moderate",
        "tags": variant["tags"],
        "source_path": f"{PINE_DIR}/{variant['id']}.pine",
    }


def make_catalog_entry(variant: dict, priority: int) -> dict:
    return {
        "id": variant["id"],
        "name": variant["name"],
        "category": "breakout",
        "status": "ready",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "tags": variant["tags"],
        "builder": "raw_source",
        "lifecycle": {"status": "live"},
        "source_path": f"{PINE_DIR}/{variant['id']}.pine",
        "parameters": deepcopy(variant["params"]),
        "priority": priority,
    }


def write_campaign(strategy_ids: list[str]) -> None:
    campaign = {
        "id": CAMPAIGN_ID,
        "name": "EMA + MACD + RSI Entry Quality Focus-8 200-Pack (phase-21)",
        "description": "Focus-8 comparison pack for reducing fakeouts and overtrading from the EMA/MACD/RSI baseline using entry-only refinements. Includes the original baseline plus 199 new variants.",
        "universe": "focus-8",
        "strategy_ids": strategy_ids,
        "date_override": {
            "from": "2015-01-01",
            "to": "2026-04-27",
        },
        "phases": {
            "smoke": {"symbols": ["SPY"]},
            "full": {"symbol_count": 8},
        },
        "execution": {
            "worker_ports": [9223],
            "checkpoint_every": 10,
            "cooldown_ms": 1000,
            "max_consecutive_failures": 5,
            "max_rerun_passes": 2,
        },
    }
    CAMPAIGN_PATH.write_text(json.dumps(campaign, indent=2) + "\n")


def update_repo_layout_test() -> None:
    text = REPO_LAYOUT_TEST_PATH.read_text()
    text = re.sub(r"const expectedLiveStrategies = \d+;", "const expectedLiveStrategies = 568;", text)
    text = re.sub(
        r"it\('prunes strategy-presets\.json to \d+ live strategies and records retired strategies', \(\) => \{",
        "it('prunes strategy-presets.json to 568 live strategies and records retired strategies', () => {",
        text,
    )
    text = re.sub(
        r"it\('strategy-catalog\.json exists and has \d+ strategies', \(\) => \{",
        "it('strategy-catalog.json exists and has 570 strategies', () => {",
        text,
    )
    text = re.sub(
        r"assert\.equal\(catalog\.strategies\.length, \d+, `expected \d+ strategies in catalog, got \$\{catalog\.strategies\.length\}`\);",
        "assert.equal(catalog.strategies.length, 570, `expected 570 strategies in catalog, got ${catalog.strategies.length}`);",
        text,
    )
    REPO_LAYOUT_TEST_PATH.write_text(text)


def update_strategy_catalog_test(new_ids: list[str]) -> None:
    text = STRATEGY_CATALOG_TEST_PATH.read_text()
    text = re.sub(r"it\('live count is \d+', async \(\) => \{", "it('live count is 568', async () => {", text)
    text = re.sub(r"assert\.equal\(live\.length, \d+\);", "assert.equal(live.length, 568);", text, count=1)

    block_end = text.index("];\n\n// ---------------------------------------------------------------------------\n// loadCatalog")
    block = text[:block_end]
    missing = [sid for sid in new_ids if f"  '{sid}',\n" not in block]
    if missing:
        insertion = "".join(f"  '{sid}',\n" for sid in missing)
        text = text[:block_end] + insertion + text[block_end:]

    STRATEGY_CATALOG_TEST_PATH.write_text(text)


def update_campaign_test() -> None:
    text = CAMPAIGN_TEST_PATH.read_text()
    if CAMPAIGN_ID in text:
        return

    insertion = textwrap.dedent(
        """

  it('loads emr-entry-quality-focus8-200pack config with an 8 x 200 matrix', async () => {
    const campaign = await loadCampaign('emr-entry-quality-focus8-200pack');

    assert.equal(campaign.config.id, 'emr-entry-quality-focus8-200pack');
    assert.equal(campaign.config.universe, 'focus-8');
    assert.equal(campaign.config.strategy_ids.length, 200);
    assert.equal(campaign.symbols.length, 8);
    assert.equal(campaign.strategies.length, 200);
    assert.equal(campaign.matrix.length, 1600);
    assert.equal(campaign.totalRuns, 1600);
    assert.equal(campaign.defaults.date_range.from, '2015-01-01');
    assert.equal(campaign.defaults.date_range.to, '2026-04-27');
    assert.equal(campaign.strategies[0].id, 'ema-macd-rsi-sl-baseline');
  });

  it('uses SPY-only smoke for emr-entry-quality-focus8-200pack so each strategy is checked once', async () => {
    const campaign = await loadCampaign('emr-entry-quality-focus8-200pack', { phase: 'smoke' });

    assert.deepEqual(campaign.config.phases.smoke.symbols, ['SPY']);
    assert.equal(campaign.symbols.length, 1);
    assert.equal(campaign.strategies.length, 200);
    assert.equal(campaign.matrix.length, 200);
    assert.equal(campaign.totalRuns, 200);
  });
"""
    )
    marker = "  it('loads ema-breakout-winrate-stopout-failed-us40-pack config with a 40 x 36 matrix', async () => {"
    if marker not in text:
        raise RuntimeError("campaign.test.js insertion marker not found")
    text = text.replace(marker, insertion + "\n" + marker, 1)
    CAMPAIGN_TEST_PATH.write_text(text)


def main() -> None:
    variants = build_variants()
    variant_ids = [variant["id"] for variant in variants]
    strategy_ids = [BASELINE_ID] + variant_ids

    PINE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for variant in variants:
        write_if_changed(PINE_OUTPUT_DIR / f"{variant['id']}.pine", render_pine(variant))

    preset_entries = [make_preset_entry(variant, 1200 + idx) for idx, variant in enumerate(variants)]
    catalog_entries = [make_catalog_entry(variant, 1200 + idx) for idx, variant in enumerate(variants)]

    update_json_array(PRESETS_PATH, preset_entries)
    update_json_array(CATALOG_PATH, catalog_entries)
    write_campaign(strategy_ids)
    update_repo_layout_test()
    update_strategy_catalog_test(variant_ids)
    update_campaign_test()

    print(f"Generated {len(variants)} new variants and wrote {CAMPAIGN_ID}.")


if __name__ == "__main__":
    main()
