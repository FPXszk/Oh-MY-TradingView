#!/usr/bin/env python3
"""
Generator for emr-next-50pack-us40 Pine scripts.
Reads the volume20x10 template, substitutes per-strategy parameters,
and writes 46 new Pine files to docs/references/pine/emr-next-50pack-us40/.
"""

import os
import re

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..")
TEMPLATE_PATH = os.path.join(
    REPO_ROOT,
    "docs/references/pine/ema-breakout-winrate-stopout-us40-50pack",
    "emr-breakout-winrate-stopout-entry-confirm-volume20x10.pine",
)
OUTPUT_DIR = os.path.join(REPO_ROOT, "docs/references/pine/emr-next-50pack-us40")


def pine_value(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return f'"{v}"'
    if isinstance(v, float):
        return str(v)
    return str(v)


def generate(strategy_id, variant_note, overrides):
    with open(TEMPLATE_PATH, "r") as f:
        src = f.read()

    # Replace variantId
    src = re.sub(
        r'variantId\s*=\s*"[^"]*"',
        f'variantId   = "{strategy_id}"',
        src,
    )
    # Replace variantNote
    src = re.sub(
        r'variantNote\s*=\s*"[^"]*"',
        f'variantNote = "{variant_note}"',
        src,
    )

    # Default parameter values in template (volume20x10 baseline)
    defaults = {
        "stopPct": 8,
        "breakoutVolumeRatio": 1,
        "requirePrevHighBreak": False,
        "delayBars": 0,
        "delayRequireSignalHigh": False,
        "delayRequireFastEma": False,
        "delayRequireHistRising": False,
        "breakoutCloseLen": 10,
        "trendMode": "price_above_ema200",
        "stopActivationBars": 0,
        "stopActivationProfitPct": 0,
        "stopActivationUntilBreakoutHigh": False,
        "initialStopMode": "fixed_pct",
        "initialStopAtrMult": 0,
        "initialStopLookback": 5,
        "tp1Pct": 0,
        "tp1Qty": 0,
        "trailMode": "none",
        "trailActivationPct": 0,
        "trailAtrMult": 0,
        "trailChandelierLen": 22,
        "trailChandelierMult": 0,
        "profitProtectMode": "none",
        "profitProtectTriggerPct": 0,
        "profitProtectRsiThreshold": 55,
        "strengthRsiMin": 0,
        "strengthHistPositive": False,
        "strengthHist3": False,
        "strengthCloseAboveFastEma": False,
    }

    for param, new_val in overrides.items():
        old_val = defaults[param]
        old_str = pine_value(old_val)
        new_str = pine_value(new_val)
        # Build pattern: param = old_val (with optional spaces and comment)
        pattern = rf"({re.escape(param)}\s*=\s*){re.escape(old_str)}(\s*(?://[^\n]*)?\n)"
        replacement = rf"\g<1>{new_str}\2"
        new_src, count = re.subn(pattern, replacement, src)
        if count == 0:
            raise ValueError(f"Could not replace {param}={old_str} in {strategy_id}")
        src = new_src

    out_path = os.path.join(OUTPUT_DIR, f"{strategy_id}.pine")
    with open(out_path, "w") as f:
        f.write(src)
    print(f"  {strategy_id}")


STRATEGIES = [
    # ─────────────────────────────────────────────────────────────
    # Group A: Volume threshold sensitivity (7 new)
    # ─────────────────────────────────────────────────────────────
    (
        "emr-next-vol20x05",
        "Volume ratio 0.5x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 0.5},
    ),
    (
        "emr-next-vol20x08",
        "Volume ratio 0.8x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 0.8},
    ),
    (
        "emr-next-vol20x11",
        "Volume ratio 1.1x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 1.1},
    ),
    (
        "emr-next-vol20x12",
        "Volume ratio 1.2x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 1.2},
    ),
    (
        "emr-next-vol20x13",
        "Volume ratio 1.3x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 1.3},
    ),
    (
        "emr-next-vol20x14",
        "Volume ratio 1.4x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 1.4},
    ),
    (
        "emr-next-vol20x20",
        "Volume ratio 2.0x 20-day average sensitivity sweep.",
        {"breakoutVolumeRatio": 2.0},
    ),
    # ─────────────────────────────────────────────────────────────
    # Group B: Stop-until deep dive (6 new)
    # ─────────────────────────────────────────────────────────────
    (
        "emr-next-stop-until-plus1pct",
        "Stop activates only after +1% profit reached.",
        {"stopActivationProfitPct": 1},
    ),
    (
        "emr-next-stop-until-plus3pct",
        "Stop activates only after +3% profit reached.",
        {"stopActivationProfitPct": 3},
    ),
    (
        "emr-next-stop-until-plus4pct",
        "Stop activates only after +4% profit reached.",
        {"stopActivationProfitPct": 4},
    ),
    (
        "emr-next-stop-until-bkhigh-vol10",
        "Stop activates after price exceeds breakout high; volume filter 1.0x.",
        {
            "stopActivationUntilBreakoutHigh": True,
            "breakoutVolumeRatio": 1.0,
        },
    ),
    (
        "emr-next-stop-until-plus2-vol10",
        "Stop activates after +2% profit; volume filter 1.0x.",
        {
            "stopActivationProfitPct": 2,
            "breakoutVolumeRatio": 1.0,
        },
    ),
    (
        "emr-next-stop-until-plus2-rsi60",
        "Stop activates after +2% profit; RSI >= 60 entry filter.",
        {
            "stopActivationProfitPct": 2,
            "strengthRsiMin": 60,
        },
    ),
    # ─────────────────────────────────────────────────────────────
    # Group C: Stop expansion exclusion validation (8 new)
    # ─────────────────────────────────────────────────────────────
    (
        "emr-next-stop-fixed10pct",
        "Wider fixed stop at 10%.",
        {"stopPct": 10},
    ),
    (
        "emr-next-stop-fixed12pct",
        "Wider fixed stop at 12%.",
        {"stopPct": 12},
    ),
    (
        "emr-next-stop-fixed15pct",
        "Wider fixed stop at 15%.",
        {"stopPct": 15},
    ),
    (
        "emr-next-stop-atr15x",
        "ATR-from-entry stop at 1.5x ATR.",
        {
            "initialStopMode": "atr_from_entry",
            "initialStopAtrMult": 1.5,
        },
    ),
    (
        "emr-next-stop-atr20x",
        "ATR-from-entry stop at 2.0x ATR.",
        {
            "initialStopMode": "atr_from_entry",
            "initialStopAtrMult": 2.0,
        },
    ),
    (
        "emr-next-stop-atr25x",
        "ATR-from-entry stop at 2.5x ATR.",
        {
            "initialStopMode": "atr_from_entry",
            "initialStopAtrMult": 2.5,
        },
    ),
    (
        "emr-next-stop-swinglow-2bar",
        "Swing-low stop using 2-bar lookback (tight).",
        {
            "initialStopMode": "swing_low_atr",
            "initialStopLookback": 2,
        },
    ),
    (
        "emr-next-stop-swinglow-5bar",
        "Swing-low stop using 5-bar lookback (default).",
        {"initialStopMode": "swing_low_atr"},
    ),
    # ─────────────────────────────────────────────────────────────
    # Group D: Entry quality improvement (10 new)
    # ─────────────────────────────────────────────────────────────
    (
        "emr-next-entry-hist3-closefa",
        "MACD histogram rising 3 bars + close above fast EMA entry filter.",
        {
            "strengthHist3": True,
            "strengthCloseAboveFastEma": True,
        },
    ),
    (
        "emr-next-entry-ema50-200-vol10",
        "EMA50>EMA200 trend filter + volume 1.0x.",
        {
            "trendMode": "ema50_above_ema200",
            "breakoutVolumeRatio": 1.0,
        },
    ),
    (
        "emr-next-entry-rsi55-vol12",
        "RSI >= 55 at entry + volume 1.2x.",
        {
            "strengthRsiMin": 55,
            "breakoutVolumeRatio": 1.2,
        },
    ),
    (
        "emr-next-entry-rsi55-prevhigh",
        "RSI >= 55 at entry + close must exceed previous day's high.",
        {
            "strengthRsiMin": 55,
            "requirePrevHighBreak": True,
        },
    ),
    (
        "emr-next-entry-rsi60-vol12",
        "RSI >= 60 at entry + volume 1.2x (stricter combo).",
        {
            "strengthRsiMin": 60,
            "breakoutVolumeRatio": 1.2,
        },
    ),
    (
        "emr-next-entry-hist-rsi55-vol10",
        "MACD histogram positive + RSI >= 55 + volume 1.0x.",
        {
            "strengthHistPositive": True,
            "strengthRsiMin": 55,
            "breakoutVolumeRatio": 1.0,
        },
    ),
    (
        "emr-next-entry-delay1-prevhigh",
        "1-bar delayed entry; confirm by exceeding signal high.",
        {
            "delayBars": 1,
            "requirePrevHighBreak": True,
            "delayRequireSignalHigh": True,
        },
    ),
    (
        "emr-next-entry-closeefa-vol12",
        "Close above fast EMA at entry + volume 1.2x.",
        {
            "strengthCloseAboveFastEma": True,
            "breakoutVolumeRatio": 1.2,
        },
    ),
    (
        "emr-next-entry-20dhigh-rsi55",
        "Breakout close above 20-day high + RSI >= 55.",
        {
            "breakoutCloseLen": 20,
            "strengthRsiMin": 55,
        },
    ),
    (
        "emr-next-entry-hist3-rsi55-vol10",
        "MACD hist rising 3 bars + RSI >= 55 + volume 1.0x.",
        {
            "strengthHist3": True,
            "strengthRsiMin": 55,
            "breakoutVolumeRatio": 1.0,
        },
    ),
    # ─────────────────────────────────────────────────────────────
    # Group E: Exit optimization (8 new)
    # ─────────────────────────────────────────────────────────────
    (
        "emr-next-exit-trail-atr15-from3",
        "ATR trailing stop 1.5x, activates after +3%.",
        {
            "trailMode": "atr",
            "trailAtrMult": 1.5,
            "trailActivationPct": 3,
        },
    ),
    (
        "emr-next-exit-trail-atr25-from5",
        "ATR trailing stop 2.5x, activates after +5%.",
        {
            "trailMode": "atr",
            "trailAtrMult": 2.5,
            "trailActivationPct": 5,
        },
    ),
    (
        "emr-next-exit-tp5-trail-atr15",
        "TP1 at +5% (50% size) then ATR 1.5x trail activates.",
        {
            "tp1Pct": 5,
            "tp1Qty": 50,
            "trailMode": "atr",
            "trailAtrMult": 1.5,
            "trailActivationPct": 5,
        },
    ),
    (
        "emr-next-exit-tp8-trail-atr25",
        "TP1 at +8% (50% size) then ATR 2.5x trail activates.",
        {
            "tp1Pct": 8,
            "tp1Qty": 50,
            "trailMode": "atr",
            "trailAtrMult": 2.5,
            "trailActivationPct": 8,
        },
    ),
    (
        "emr-next-exit-tp10-trail-ema20",
        "TP1 at +10% (50% size) then EMA20 trail activates.",
        {
            "tp1Pct": 10,
            "tp1Qty": 50,
            "trailMode": "ema20",
            "trailActivationPct": 10,
        },
    ),
    (
        "emr-next-exit-chandelier22-3atr",
        "Chandelier exit: 22-bar high minus 3x ATR.",
        {
            "trailMode": "chandelier",
            "trailChandelierMult": 3.0,
        },
    ),
    (
        "emr-next-exit-ema20-after5",
        "EMA20 profit-protect activates after +5% reached.",
        {
            "profitProtectMode": "ema20",
            "profitProtectTriggerPct": 5,
        },
    ),
    (
        "emr-next-exit-rsi-loss-after8",
        "RSI-loss profit-protect (RSI<55) activates after +8% reached.",
        {
            "profitProtectMode": "rsi_loss",
            "profitProtectTriggerPct": 8,
        },
    ),
    # ─────────────────────────────────────────────────────────────
    # Group F: Combinations (7 new)
    # ─────────────────────────────────────────────────────────────
    (
        "emr-next-combo-vol12-bkhigh",
        "Volume 1.2x + stop-until breakout high combination.",
        {
            "breakoutVolumeRatio": 1.2,
            "stopActivationUntilBreakoutHigh": True,
        },
    ),
    (
        "emr-next-combo-vol12-plus2",
        "Volume 1.2x + stop-until +2% combination.",
        {
            "breakoutVolumeRatio": 1.2,
            "stopActivationProfitPct": 2,
        },
    ),
    (
        "emr-next-combo-20dhigh-vol10-trail25",
        "20-day breakout high + vol 1.0x + ATR 2.5x trail from +5%.",
        {
            "breakoutCloseLen": 20,
            "breakoutVolumeRatio": 1.0,
            "trailMode": "atr",
            "trailAtrMult": 2.5,
            "trailActivationPct": 5,
        },
    ),
    (
        "emr-next-combo-ema50200-vol12-stop12",
        "EMA50>EMA200 trend + vol 1.2x + wider 12% stop.",
        {
            "trendMode": "ema50_above_ema200",
            "breakoutVolumeRatio": 1.2,
            "stopPct": 12,
        },
    ),
    (
        "emr-next-combo-rsi60-vol10-bkhigh",
        "RSI>=60 + vol 1.0x + stop-until breakout high.",
        {
            "strengthRsiMin": 60,
            "breakoutVolumeRatio": 1.0,
            "stopActivationUntilBreakoutHigh": True,
        },
    ),
    (
        "emr-next-combo-rsi55-vol10-trail-ema20",
        "RSI>=55 + vol 1.0x + EMA20 trail+protect after +5%.",
        {
            "strengthRsiMin": 55,
            "breakoutVolumeRatio": 1.0,
            "trailMode": "ema20",
            "profitProtectMode": "ema20",
            "profitProtectTriggerPct": 5,
        },
    ),
    (
        "emr-next-combo-ultimate",
        "20-day high breakout + vol 1.2x + RSI>=60 + stop-until +2%.",
        {
            "breakoutCloseLen": 20,
            "breakoutVolumeRatio": 1.2,
            "strengthRsiMin": 60,
            "stopActivationProfitPct": 2,
        },
    ),
]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating {len(STRATEGIES)} Pine files -> {OUTPUT_DIR}")
    for strategy_id, note, overrides in STRATEGIES:
        generate(strategy_id, note, overrides)
    print(f"Done: {len(STRATEGIES)} files generated.")


if __name__ == "__main__":
    main()
