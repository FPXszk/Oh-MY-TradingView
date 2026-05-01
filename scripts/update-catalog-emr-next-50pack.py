#!/usr/bin/env python3
"""
Append 46 new emr-next-50pack-us40 entries to strategy-catalog.json and strategy-presets.json.
"""

import json
import os

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..")
CATALOG_PATH = os.path.join(REPO_ROOT, "config/backtest/strategy-catalog.json")
PRESETS_PATH = os.path.join(REPO_ROOT, "config/backtest/strategy-presets.json")

PINE_DIR = "../../docs/references/pine/emr-next-50pack-us40"
IMPL_STAGE = "emr-next-50pack-us40"
PHASE = "phase-17"
BASE_PRIORITY = 600
TAGS_BASE = ["ema", "macd", "rsi", "breakout", "winrate", "stopout", "emr-next-50pack-us40"]


def make_entry(strategy_id, name, theme_axis, theme_notes, parameters, stop_loss_type, stop_loss_value, priority):
    return {
        "id": strategy_id,
        "name": name,
        "category": "breakout",
        "builder": "raw_source",
        "parameters": parameters,
        "stop_loss": {"type": stop_loss_type, "value": stop_loss_value},
        "theme_axis": theme_axis,
        "theme_notes": theme_notes,
        "recommended_timeframes": ["D"],
        "recommended_regime": "trending",
        "mag7_notes": "EMA breakout next-gen 50-pack targeting ~35% win rate.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": priority,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "moderate",
        "tags": TAGS_BASE + [theme_axis],
        "source_path": f"{PINE_DIR}/{strategy_id}.pine",
        "lifecycle": {"status": "live"},
    }


def make_preset(strategy_id, name, theme_axis, parameters):
    return {
        "id": strategy_id,
        "name": name,
        "category": "breakout",
        "builder": "raw_source",
        "parameters": parameters,
        "stop_loss": {"type": "hard_percent", "value": 8},
        "theme_axis": theme_axis,
        "theme_notes": "emr-next-50pack-us40 strategy.",
        "recommended_timeframes": ["D"],
        "recommended_regime": "trending",
        "mag7_notes": "EMA breakout next-gen 50-pack targeting ~35% win rate.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": 500,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "moderate",
        "tags": TAGS_BASE + [theme_axis],
        "source_path": f"{PINE_DIR}/{strategy_id}.pine",
    }


# (id, name, theme_axis, theme_notes, catalog_params, stop_loss_type, stop_loss_val, preset_params)
STRATEGIES = [
    # Group A: Volume sensitivity
    ("emr-next-vol20x05", "EMR Next Volume 0.5x", "volume", "Volume ratio sensitivity 0.5x sweep.", {"breakoutVolumeRatio": 0.5}, "hard_percent", 8, {"breakoutVolumeRatio": 0.5}),
    ("emr-next-vol20x08", "EMR Next Volume 0.8x", "volume", "Volume ratio sensitivity 0.8x sweep.", {"breakoutVolumeRatio": 0.8}, "hard_percent", 8, {"breakoutVolumeRatio": 0.8}),
    ("emr-next-vol20x11", "EMR Next Volume 1.1x", "volume", "Volume ratio sensitivity 1.1x sweep.", {"breakoutVolumeRatio": 1.1}, "hard_percent", 8, {"breakoutVolumeRatio": 1.1}),
    ("emr-next-vol20x12", "EMR Next Volume 1.2x", "volume", "Volume ratio sensitivity 1.2x sweep.", {"breakoutVolumeRatio": 1.2}, "hard_percent", 8, {"breakoutVolumeRatio": 1.2}),
    ("emr-next-vol20x13", "EMR Next Volume 1.3x", "volume", "Volume ratio sensitivity 1.3x sweep.", {"breakoutVolumeRatio": 1.3}, "hard_percent", 8, {"breakoutVolumeRatio": 1.3}),
    ("emr-next-vol20x14", "EMR Next Volume 1.4x", "volume", "Volume ratio sensitivity 1.4x sweep.", {"breakoutVolumeRatio": 1.4}, "hard_percent", 8, {"breakoutVolumeRatio": 1.4}),
    ("emr-next-vol20x20", "EMR Next Volume 2.0x", "volume", "Volume ratio sensitivity 2.0x sweep.", {"breakoutVolumeRatio": 2.0}, "hard_percent", 8, {"breakoutVolumeRatio": 2.0}),
    # Group B: Stop-until
    ("emr-next-stop-until-plus1pct", "EMR Next Stop Until +1%", "stop-until", "Stop activates after +1% profit.", {"stopActivationProfitPct": 1}, "custom", 8, {"stopActivationProfitPct": 1}),
    ("emr-next-stop-until-plus3pct", "EMR Next Stop Until +3%", "stop-until", "Stop activates after +3% profit.", {"stopActivationProfitPct": 3}, "custom", 8, {"stopActivationProfitPct": 3}),
    ("emr-next-stop-until-plus4pct", "EMR Next Stop Until +4%", "stop-until", "Stop activates after +4% profit.", {"stopActivationProfitPct": 4}, "custom", 8, {"stopActivationProfitPct": 4}),
    ("emr-next-stop-until-bkhigh-vol10", "EMR Next Stop Until Breakout High + Vol 1.0x", "stop-until", "Stop after breakout high + volume filter.", {"stopActivationUntilBreakoutHigh": True, "breakoutVolumeRatio": 1.0}, "custom", 8, {"stopActivationUntilBreakoutHigh": True, "breakoutVolumeRatio": 1.0}),
    ("emr-next-stop-until-plus2-vol10", "EMR Next Stop Until +2% + Vol 1.0x", "stop-until", "Stop after +2% + volume filter.", {"stopActivationProfitPct": 2, "breakoutVolumeRatio": 1.0}, "custom", 8, {"stopActivationProfitPct": 2, "breakoutVolumeRatio": 1.0}),
    ("emr-next-stop-until-plus2-rsi60", "EMR Next Stop Until +2% + RSI 60", "stop-until", "Stop after +2% + RSI>=60 entry filter.", {"stopActivationProfitPct": 2, "strengthRsiMin": 60}, "custom", 8, {"stopActivationProfitPct": 2, "strengthRsiMin": 60}),
    # Group C: Stop expansion exclusion
    ("emr-next-stop-fixed10pct", "EMR Next Stop Fixed 10%", "stop-expansion", "Wider fixed stop at 10%.", {"stopPct": 10}, "hard_percent", 10, {"stopPct": 10}),
    ("emr-next-stop-fixed12pct", "EMR Next Stop Fixed 12%", "stop-expansion", "Wider fixed stop at 12%.", {"stopPct": 12}, "hard_percent", 12, {"stopPct": 12}),
    ("emr-next-stop-fixed15pct", "EMR Next Stop Fixed 15%", "stop-expansion", "Wider fixed stop at 15%.", {"stopPct": 15}, "hard_percent", 15, {"stopPct": 15}),
    ("emr-next-stop-atr15x", "EMR Next Stop ATR 1.5x", "stop-expansion", "ATR-from-entry stop at 1.5x.", {"initialStopMode": "atr_from_entry", "initialStopAtrMult": 1.5}, "custom", 8, {"initialStopMode": "atr_from_entry", "initialStopAtrMult": 1.5}),
    ("emr-next-stop-atr20x", "EMR Next Stop ATR 2.0x", "stop-expansion", "ATR-from-entry stop at 2.0x.", {"initialStopMode": "atr_from_entry", "initialStopAtrMult": 2.0}, "custom", 8, {"initialStopMode": "atr_from_entry", "initialStopAtrMult": 2.0}),
    ("emr-next-stop-atr25x", "EMR Next Stop ATR 2.5x", "stop-expansion", "ATR-from-entry stop at 2.5x.", {"initialStopMode": "atr_from_entry", "initialStopAtrMult": 2.5}, "custom", 8, {"initialStopMode": "atr_from_entry", "initialStopAtrMult": 2.5}),
    ("emr-next-stop-swinglow-2bar", "EMR Next Stop Swing Low 2bar", "stop-expansion", "Swing-low stop 2-bar lookback.", {"initialStopMode": "swing_low_atr", "initialStopLookback": 2}, "custom", 8, {"initialStopMode": "swing_low_atr", "initialStopLookback": 2}),
    ("emr-next-stop-swinglow-5bar", "EMR Next Stop Swing Low 5bar", "stop-expansion", "Swing-low stop 5-bar lookback.", {"initialStopMode": "swing_low_atr"}, "custom", 8, {"initialStopMode": "swing_low_atr"}),
    # Group D: Entry quality
    ("emr-next-entry-hist3-closefa", "EMR Next Entry Hist3 Close FastEMA", "entry", "MACD hist rising 3 bars + close above fast EMA.", {"strengthHist3": True, "strengthCloseAboveFastEma": True}, "hard_percent", 8, {"strengthHist3": True, "strengthCloseAboveFastEma": True}),
    ("emr-next-entry-ema50-200-vol10", "EMR Next Entry EMA50-200 Vol 1.0x", "entry", "EMA50>EMA200 trend + volume 1.0x.", {"trendMode": "ema50_above_ema200", "breakoutVolumeRatio": 1.0}, "hard_percent", 8, {"trendMode": "ema50_above_ema200", "breakoutVolumeRatio": 1.0}),
    ("emr-next-entry-rsi55-vol12", "EMR Next Entry RSI55 Vol 1.2x", "entry", "RSI>=55 + volume 1.2x.", {"strengthRsiMin": 55, "breakoutVolumeRatio": 1.2}, "hard_percent", 8, {"strengthRsiMin": 55, "breakoutVolumeRatio": 1.2}),
    ("emr-next-entry-rsi55-prevhigh", "EMR Next Entry RSI55 Prev High", "entry", "RSI>=55 + prev high break.", {"strengthRsiMin": 55, "requirePrevHighBreak": True}, "hard_percent", 8, {"strengthRsiMin": 55, "requirePrevHighBreak": True}),
    ("emr-next-entry-rsi60-vol12", "EMR Next Entry RSI60 Vol 1.2x", "entry", "RSI>=60 + volume 1.2x.", {"strengthRsiMin": 60, "breakoutVolumeRatio": 1.2}, "hard_percent", 8, {"strengthRsiMin": 60, "breakoutVolumeRatio": 1.2}),
    ("emr-next-entry-hist-rsi55-vol10", "EMR Next Entry Hist Positive RSI55 Vol 1.0x", "entry", "MACD positive + RSI>=55 + vol 1.0x.", {"strengthHistPositive": True, "strengthRsiMin": 55, "breakoutVolumeRatio": 1.0}, "hard_percent", 8, {"strengthHistPositive": True, "strengthRsiMin": 55, "breakoutVolumeRatio": 1.0}),
    ("emr-next-entry-delay1-prevhigh", "EMR Next Entry Delay 1 Prev High", "entry", "1-bar delay + confirm above signal high.", {"delayBars": 1, "requirePrevHighBreak": True, "delayRequireSignalHigh": True}, "hard_percent", 8, {"delayBars": 1, "requirePrevHighBreak": True, "delayRequireSignalHigh": True}),
    ("emr-next-entry-closeefa-vol12", "EMR Next Entry Close FastEMA Vol 1.2x", "entry", "Close above fast EMA + vol 1.2x.", {"strengthCloseAboveFastEma": True, "breakoutVolumeRatio": 1.2}, "hard_percent", 8, {"strengthCloseAboveFastEma": True, "breakoutVolumeRatio": 1.2}),
    ("emr-next-entry-20dhigh-rsi55", "EMR Next Entry 20D High RSI55", "entry", "20-day breakout high + RSI>=55.", {"breakoutCloseLen": 20, "strengthRsiMin": 55}, "hard_percent", 8, {"breakoutCloseLen": 20, "strengthRsiMin": 55}),
    ("emr-next-entry-hist3-rsi55-vol10", "EMR Next Entry Hist3 RSI55 Vol 1.0x", "entry", "MACD hist 3 bars + RSI>=55 + vol 1.0x.", {"strengthHist3": True, "strengthRsiMin": 55, "breakoutVolumeRatio": 1.0}, "hard_percent", 8, {"strengthHist3": True, "strengthRsiMin": 55, "breakoutVolumeRatio": 1.0}),
    # Group E: Exit optimization
    ("emr-next-exit-trail-atr15-from3", "EMR Next Exit Trail ATR 1.5x From 3%", "exit", "ATR trail 1.5x from +3%.", {"trailMode": "atr", "trailAtrMult": 1.5, "trailActivationPct": 3}, "custom", 8, {"trailMode": "atr", "trailAtrMult": 1.5, "trailActivationPct": 3}),
    ("emr-next-exit-trail-atr25-from5", "EMR Next Exit Trail ATR 2.5x From 5%", "exit", "ATR trail 2.5x from +5%.", {"trailMode": "atr", "trailAtrMult": 2.5, "trailActivationPct": 5}, "custom", 8, {"trailMode": "atr", "trailAtrMult": 2.5, "trailActivationPct": 5}),
    ("emr-next-exit-tp5-trail-atr15", "EMR Next Exit TP5 Trail ATR 1.5x", "exit", "TP1 +5% 50% then ATR 1.5x trail.", {"tp1Pct": 5, "tp1Qty": 50, "trailMode": "atr", "trailAtrMult": 1.5, "trailActivationPct": 5}, "custom", 8, {"tp1Pct": 5, "tp1Qty": 50, "trailMode": "atr", "trailAtrMult": 1.5, "trailActivationPct": 5}),
    ("emr-next-exit-tp8-trail-atr25", "EMR Next Exit TP8 Trail ATR 2.5x", "exit", "TP1 +8% 50% then ATR 2.5x trail.", {"tp1Pct": 8, "tp1Qty": 50, "trailMode": "atr", "trailAtrMult": 2.5, "trailActivationPct": 8}, "custom", 8, {"tp1Pct": 8, "tp1Qty": 50, "trailMode": "atr", "trailAtrMult": 2.5, "trailActivationPct": 8}),
    ("emr-next-exit-tp10-trail-ema20", "EMR Next Exit TP10 Trail EMA20", "exit", "TP1 +10% 50% then EMA20 trail.", {"tp1Pct": 10, "tp1Qty": 50, "trailMode": "ema20", "trailActivationPct": 10}, "custom", 8, {"tp1Pct": 10, "tp1Qty": 50, "trailMode": "ema20", "trailActivationPct": 10}),
    ("emr-next-exit-chandelier22-3atr", "EMR Next Exit Chandelier 22 3ATR", "exit", "Chandelier 22-bar 3x ATR.", {"trailMode": "chandelier", "trailChandelierMult": 3.0}, "custom", 8, {"trailMode": "chandelier", "trailChandelierMult": 3.0}),
    ("emr-next-exit-ema20-after5", "EMR Next Exit EMA20 After 5%", "exit", "EMA20 profit-protect from +5%.", {"profitProtectMode": "ema20", "profitProtectTriggerPct": 5}, "custom", 8, {"profitProtectMode": "ema20", "profitProtectTriggerPct": 5}),
    ("emr-next-exit-rsi-loss-after8", "EMR Next Exit RSI Loss After 8%", "exit", "RSI-loss protect from +8%.", {"profitProtectMode": "rsi_loss", "profitProtectTriggerPct": 8}, "custom", 8, {"profitProtectMode": "rsi_loss", "profitProtectTriggerPct": 8}),
    # Group F: Combinations
    ("emr-next-combo-vol12-bkhigh", "EMR Next Combo Vol 1.2x Breakout High", "combo", "Vol 1.2x + stop-until breakout high.", {"breakoutVolumeRatio": 1.2, "stopActivationUntilBreakoutHigh": True}, "custom", 8, {"breakoutVolumeRatio": 1.2, "stopActivationUntilBreakoutHigh": True}),
    ("emr-next-combo-vol12-plus2", "EMR Next Combo Vol 1.2x Plus 2%", "combo", "Vol 1.2x + stop-until +2%.", {"breakoutVolumeRatio": 1.2, "stopActivationProfitPct": 2}, "custom", 8, {"breakoutVolumeRatio": 1.2, "stopActivationProfitPct": 2}),
    ("emr-next-combo-20dhigh-vol10-trail25", "EMR Next Combo 20D High Vol Trail 2.5x", "combo", "20D breakout + vol 1.0x + ATR 2.5x trail.", {"breakoutCloseLen": 20, "breakoutVolumeRatio": 1.0, "trailMode": "atr", "trailAtrMult": 2.5, "trailActivationPct": 5}, "custom", 8, {"breakoutCloseLen": 20, "breakoutVolumeRatio": 1.0, "trailMode": "atr", "trailAtrMult": 2.5, "trailActivationPct": 5}),
    ("emr-next-combo-ema50200-vol12-stop12", "EMR Next Combo EMA50-200 Vol 1.2x Stop 12%", "combo", "EMA50>200 + vol 1.2x + 12% stop.", {"trendMode": "ema50_above_ema200", "breakoutVolumeRatio": 1.2, "stopPct": 12}, "hard_percent", 12, {"trendMode": "ema50_above_ema200", "breakoutVolumeRatio": 1.2, "stopPct": 12}),
    ("emr-next-combo-rsi60-vol10-bkhigh", "EMR Next Combo RSI60 Vol 1.0x Breakout High", "combo", "RSI>=60 + vol 1.0x + stop-until breakout high.", {"strengthRsiMin": 60, "breakoutVolumeRatio": 1.0, "stopActivationUntilBreakoutHigh": True}, "custom", 8, {"strengthRsiMin": 60, "breakoutVolumeRatio": 1.0, "stopActivationUntilBreakoutHigh": True}),
    ("emr-next-combo-rsi55-vol10-trail-ema20", "EMR Next Combo RSI55 Vol EMA20 Trail", "combo", "RSI>=55 + vol 1.0x + EMA20 trail+protect.", {"strengthRsiMin": 55, "breakoutVolumeRatio": 1.0, "trailMode": "ema20", "profitProtectMode": "ema20", "profitProtectTriggerPct": 5}, "custom", 8, {"strengthRsiMin": 55, "breakoutVolumeRatio": 1.0, "trailMode": "ema20", "profitProtectMode": "ema20", "profitProtectTriggerPct": 5}),
    ("emr-next-combo-ultimate", "EMR Next Combo Ultimate", "combo", "20D high + vol 1.2x + RSI>=60 + stop-until +2%.", {"breakoutCloseLen": 20, "breakoutVolumeRatio": 1.2, "strengthRsiMin": 60, "stopActivationProfitPct": 2}, "custom", 8, {"breakoutCloseLen": 20, "breakoutVolumeRatio": 1.2, "strengthRsiMin": 60, "stopActivationProfitPct": 2}),
]


def main():
    # Load catalog
    with open(CATALOG_PATH) as f:
        catalog = json.load(f)

    existing_ids = {s["id"] for s in catalog["strategies"]}
    added_catalog = 0
    catalog_new_entries = []

    for i, (sid, name, theme, notes, cat_params, sl_type, sl_val, _preset_params) in enumerate(STRATEGIES):
        if sid in existing_ids:
            print(f"  SKIP catalog (exists): {sid}")
            continue
        entry = make_entry(sid, name, theme, notes, cat_params, sl_type, sl_val, BASE_PRIORITY + i)
        catalog["strategies"].append(entry)
        catalog_new_entries.append(sid)
        added_catalog += 1

    with open(CATALOG_PATH, "w") as f:
        json.dump(catalog, f, indent=2)
        f.write("\n")
    print(f"Catalog: +{added_catalog} entries (total {len(catalog['strategies'])})")

    # Load presets
    with open(PRESETS_PATH) as f:
        presets = json.load(f)

    existing_preset_ids = {s["id"] for s in presets["strategies"]}
    added_presets = 0

    for sid, name, theme, notes, _cat_params, _sl_type, _sl_val, preset_params in STRATEGIES:
        if sid in existing_preset_ids:
            print(f"  SKIP preset (exists): {sid}")
            continue
        entry = make_preset(sid, name, theme, preset_params)
        presets["strategies"].append(entry)
        added_presets += 1

    with open(PRESETS_PATH, "w") as f:
        json.dump(presets, f, indent=2)
        f.write("\n")
    print(f"Presets: +{added_presets} entries (total {len(presets['strategies'])})")

    print("\nNew IDs (for EXPECTED_LIVE_IDS):")
    for sid in catalog_new_entries:
        print(f"  '{sid}',")


if __name__ == "__main__":
    main()
