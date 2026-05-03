#!/usr/bin/env python3
"""
Generate the focused EMR A+E TP/QTY 54-pack plus one non-EMR baseline.

This script:
1. Writes only the missing Pine variants (q0 / q33 / q100) under
   docs/references/pine/emr-ae-tpqty-54pack-focus8/
2. Appends the missing live entries to strategy-presets.json and strategy-catalog.json
3. Writes a new focus-8 campaign and night-batch config for the 55-strategy comparison
4. Updates test count expectations and expected live ID fixtures
"""

from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = REPO_ROOT / "docs/references/pine/emr-ae-30pack/emr-ae-v13-tp10-qty25.pine"
PINE_OUTPUT_DIR = REPO_ROOT / "docs/references/pine/emr-ae-tpqty-54pack-focus8"
PRESETS_PATH = REPO_ROOT / "config/backtest/strategy-presets.json"
CATALOG_PATH = REPO_ROOT / "config/backtest/strategy-catalog.json"
CAMPAIGN_PATH = REPO_ROOT / "config/backtest/campaigns/emr-ae-tpqty-54pack-plus-baseline-focus8.json"
NIGHT_BATCH_CONFIG_PATH = REPO_ROOT / "config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json"
REPO_LAYOUT_TEST_PATH = REPO_ROOT / "tests/repo-layout.test.js"
STRATEGY_CATALOG_TEST_PATH = REPO_ROOT / "tests/strategy-catalog.test.js"

PINE_DIR = "../../docs/references/pine/emr-ae-tpqty-54pack-focus8"
BASELINE_SOURCE_PATH = (
    "../../docs/references/pine/EMA + MACD + RSI Strategy + SL/"
    "EMA + MACD + RSI Strategy + SL.pine"
)
PHASE = "phase-20"
IMPL_STAGE = "emr-ae-tpqty-54pack-plus-baseline-focus8"
EMR_TAGS_PRESET = [
    "ema", "macd", "rsi", "breakout", "winrate", "stopout",
    "emr-ae-tpqty-54pack", "volume", "exit", "tp", "notrail"
]
EMR_TAGS_CATALOG = ["emr-ae-tpqty-54pack", "volume", "exit", "tp", "combo", "notrail"]
BASELINE_TAGS = ["ema", "macd", "rsi", "baseline", "hard-stop", "tp-compare"]

TPS = [8, 10, 12, 15, 18, 25]
QTYS = [0, 5, 10, 15, 20, 25, 33, 50, 100]
EXISTING_QTYS = {5, 10, 15, 20, 25, 50}

BASELINE_ID = "ema-macd-rsi-sl-baseline"
BASELINE_NAME = "EMA + MACD + RSI Strategy + SL"


def strategy_id(tp: int, qty: int) -> str:
    return f"emr-ae-v13-tp{tp}-q{qty}-notrail"


def strategy_name(tp: int, qty: int) -> str:
    return f"EMR A+E V13-TP{tp}-Q{qty}-NOTRAIL"


def strategy_note(tp: int, qty: int) -> str:
    if qty == 0:
        return f"A+E TP/QTY focused sweep: vol=1.3x, TP{tp}% metadata row, no partial exit, no trail."
    if qty == 100:
        return f"A+E TP/QTY focused sweep: vol=1.3x, TP{tp}% full exit, no trail."
    return f"A+E TP/QTY focused sweep: vol=1.3x, TP{tp}% ({qty}% qty), no trail."


def build_full_matrix() -> list[tuple[int, int]]:
    return [(tp, qty) for tp in TPS for qty in QTYS]


def build_missing_matrix() -> list[tuple[int, int]]:
    return [(tp, qty) for tp, qty in build_full_matrix() if qty not in EXISTING_QTYS]


def update_line(text: str, pattern: str, replacement: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise RuntimeError(f"Pattern not found or duplicated: {pattern}")
    return updated


def render_pine(template: str, tp: int, qty: int) -> str:
    sid = strategy_id(tp, qty)
    text = template
    text = update_line(text, r'^variantId\s+=\s+".*"$', f'variantId   = "{sid}"')
    text = update_line(text, r'^variantNote\s+=\s+".*"$', f'variantNote = "{strategy_note(tp, qty)}"')
    text = update_line(text, r'^tp1Pct\s+=\s+\d+$', f"tp1Pct                       = {tp}")
    text = update_line(text, r'^tp1Qty\s+=\s+\d+$', f"tp1Qty                       = {qty}")
    text = update_line(text, r'^trailMode\s+=\s+".*"$', 'trailMode                    = "none"')
    text = update_line(text, r'^trailActivationPct\s+=\s+\d+$', "trailActivationPct           = 0")
    return text


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


def make_emr_preset_entry(tp: int, qty: int) -> dict:
    sid = strategy_id(tp, qty)
    return {
        "id": sid,
        "name": strategy_name(tp, qty),
        "category": "breakout",
        "builder": "raw_source",
        "parameters": {
            "breakoutVolumeRatio": 1.3,
            "tp1Pct": tp,
            "tp1Qty": qty,
            "trailMode": "none",
            "trailActivationPct": 0,
            "trailAtrMult": 0,
        },
        "stop_loss": {"type": "hard_percent", "value": 8},
        "theme_axis": "combo",
        "theme_notes": f"A+E TP/QTY focused sweep vol=1.3x, TP{tp}, qty{qty}, no trail",
        "recommended_timeframes": ["D"],
        "recommended_regime": "trending",
        "mag7_notes": "EMR A+E TP/QTY focused 54-pack: focus-8 sweep without EMA20 trail.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": 500,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "moderate",
        "tags": EMR_TAGS_PRESET,
        "source_path": f"{PINE_DIR}/{sid}.pine",
    }


def make_emr_catalog_entry(tp: int, qty: int, priority: int) -> dict:
    sid = strategy_id(tp, qty)
    return {
        "id": sid,
        "name": strategy_name(tp, qty),
        "category": "breakout",
        "status": "ready",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "tags": EMR_TAGS_CATALOG,
        "builder": "raw_source",
        "lifecycle": {"status": "live"},
        "source_path": f"{PINE_DIR}/{sid}.pine",
        "parameters": {
            "breakoutVolumeRatio": 1.3,
            "tp1Pct": tp,
            "tp1Qty": qty,
            "trailMode": "none",
            "trailActivationPct": 0,
            "trailAtrMult": 0,
        },
        "priority": priority,
    }


def make_baseline_preset_entry() -> dict:
    return {
        "id": BASELINE_ID,
        "name": BASELINE_NAME,
        "category": "breakout",
        "builder": "raw_source",
        "parameters": {
            "ema_fast": 9,
            "ema_slow": 20,
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            "rsi_level": 50,
            "stop_pct": 8,
        },
        "stop_loss": {"type": "hard_percent", "value": 8},
        "theme_axis": "baseline",
        "theme_notes": "Original EMA + MACD + RSI Strategy + SL file used as comparison baseline for the TP/QTY 54-pack.",
        "recommended_timeframes": ["D"],
        "recommended_regime": "mixed",
        "mag7_notes": "Standalone baseline added to the focus-8 TP/QTY comparison pack.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": 300,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "simple",
        "tags": BASELINE_TAGS,
        "source_path": BASELINE_SOURCE_PATH,
    }


def make_baseline_catalog_entry(priority: int) -> dict:
    return {
        "id": BASELINE_ID,
        "name": BASELINE_NAME,
        "category": "breakout",
        "builder": "raw_source",
        "parameters": {
            "ema_fast": 9,
            "ema_slow": 20,
            "macd_fast": 12,
            "macd_slow": 26,
            "macd_signal": 9,
            "rsi_level": 50,
            "stop_pct": 8,
        },
        "stop_loss": {"type": "hard_percent", "value": 8},
        "theme_axis": "baseline",
        "theme_notes": "Original EMA + MACD + RSI Strategy + SL file used as comparison baseline for the TP/QTY 54-pack.",
        "recommended_timeframes": ["D"],
        "recommended_regime": "mixed",
        "mag7_notes": "Standalone baseline added to the focus-8 TP/QTY comparison pack.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": priority,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "simple",
        "tags": BASELINE_TAGS,
        "source_path": BASELINE_SOURCE_PATH,
        "lifecycle": {"status": "live"},
    }


def write_campaign(strategy_ids: list[str]) -> None:
    campaign = {
        "id": "emr-ae-tpqty-54pack-plus-baseline-focus8",
        "name": "EMR A+E TP/QTY 54-Pack Plus Baseline Focus-8 (phase-20)",
        "description": "Focused TP/QTY sweep on focus-8 using tp1Pct 8/10/12/15/18/25 and tp1Qty 0/5/10/15/20/25/33/50/100, plus the original EMA + MACD + RSI Strategy + SL baseline.",
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


def write_night_batch_config() -> None:
    config = {
        "runtime": {
            "host": "172.31.144.1",
            "port": 9223,
            "startup_check_host": "127.0.0.1",
            "startup_check_port": 9222,
            "launch_wait_sec": 25,
            "detach_after_smoke": False,
            "detached_state_file": "artifacts/night-batch/emr-ae-tpqty-54pack-plus-baseline-focus8-state.json",
            "production_timeout_sec": 28800,
        },
        "launch": {
            "shortcut_path": "C:\\TradingView\\TradingView.exe - ショートカット.lnk",
        },
        "bundle": {
            "us_campaign": "emr-ae-tpqty-54pack-plus-baseline-focus8",
            "smoke_phases": "smoke",
            "production_phases": "full",
        },
    }
    NIGHT_BATCH_CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n")


def update_repo_layout_test() -> None:
    text = REPO_LAYOUT_TEST_PATH.read_text()
    text = re.sub(r"const expectedLiveStrategies = \d+;", "const expectedLiveStrategies = 369;", text)
    text = text.replace(
        "it('prunes strategy-presets.json to 124 live strategies and records retired strategies', () => {",
        "it('prunes strategy-presets.json to 369 live strategies and records retired strategies', () => {",
    )
    text = text.replace(
        "it('strategy-catalog.json exists and has 252 strategies', () => {",
        "it('strategy-catalog.json exists and has 371 strategies', () => {",
    )
    text = re.sub(
        r"assert\.equal\(catalog\.strategies\.length, \d+, `expected \d+ strategies in catalog, got \$\{catalog\.strategies\.length\}`\);",
        "assert.equal(catalog.strategies.length, 371, `expected 371 strategies in catalog, got ${catalog.strategies.length}`);",
        text,
    )
    REPO_LAYOUT_TEST_PATH.write_text(text)


def update_strategy_catalog_test(new_ids: list[str]) -> None:
    text = STRATEGY_CATALOG_TEST_PATH.read_text()
    text = text.replace("it('live count is 350', async () => {", "it('live count is 369', async () => {")
    text = text.replace("assert.equal(live.length, 350);", "assert.equal(live.length, 369);")

    block_end = text.index("];\n\n// ---------------------------------------------------------------------------\n// loadCatalog")
    block = text[:block_end]
    missing = [sid for sid in new_ids if f"  '{sid}',\n" not in block]
    if missing:
        insertion = "".join(f"  '{sid}',\n" for sid in missing)
        text = text[:block_end] + insertion + text[block_end:]

    STRATEGY_CATALOG_TEST_PATH.write_text(text)


def main() -> None:
    template = TEMPLATE_PATH.read_text()
    missing_matrix = build_missing_matrix()
    all_ids = [strategy_id(tp, qty) for tp, qty in build_full_matrix()] + [BASELINE_ID]
    new_ids = [strategy_id(tp, qty) for tp, qty in missing_matrix] + [BASELINE_ID]

    PINE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for tp, qty in missing_matrix:
        sid = strategy_id(tp, qty)
        write_if_changed(PINE_OUTPUT_DIR / f"{sid}.pine", render_pine(template, tp, qty))

    preset_entries = [make_emr_preset_entry(tp, qty) for tp, qty in missing_matrix]
    preset_entries.append(make_baseline_preset_entry())
    catalog_entries = [
        make_emr_catalog_entry(tp, qty, 900 + idx)
        for idx, (tp, qty) in enumerate(missing_matrix)
    ]
    catalog_entries.append(make_baseline_catalog_entry(900 + len(missing_matrix)))

    update_json_array(PRESETS_PATH, preset_entries)
    update_json_array(CATALOG_PATH, catalog_entries)
    write_campaign(all_ids)
    write_night_batch_config()
    update_repo_layout_test()
    update_strategy_catalog_test(new_ids)

    print(f"Ensured {len(new_ids)} new strategies and wrote campaign/config.")


if __name__ == "__main__":
    main()
