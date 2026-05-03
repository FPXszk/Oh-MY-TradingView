#!/usr/bin/env python3
"""
Generate the EMR A+E TP/QTY 100-pack without EMA20 trail.

This script:
1. Writes 100 Pine variants under docs/references/pine/emr-ae-tpqty-100pack/
2. Appends live entries to strategy-presets.json and strategy-catalog.json
3. Writes the focus-8 campaign and night-batch config
4. Updates test count expectations and expected live ID fixtures
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = REPO_ROOT / "docs/references/pine/emr-ae-30pack/emr-ae-v13-tp10-qty25.pine"
PINE_OUTPUT_DIR = REPO_ROOT / "docs/references/pine/emr-ae-tpqty-100pack"
PRESETS_PATH = REPO_ROOT / "config/backtest/strategy-presets.json"
CATALOG_PATH = REPO_ROOT / "config/backtest/strategy-catalog.json"
CAMPAIGN_PATH = REPO_ROOT / "config/backtest/campaigns/emr-ae-tpqty-100pack-focus8.json"
NIGHT_BATCH_CONFIG_PATH = REPO_ROOT / "config/night_batch/emr-ae-tpqty-100pack-focus8-config.json"
REPO_LAYOUT_TEST_PATH = REPO_ROOT / "tests/repo-layout.test.js"
STRATEGY_CATALOG_TEST_PATH = REPO_ROOT / "tests/strategy-catalog.test.js"

PINE_DIR = "../../docs/references/pine/emr-ae-tpqty-100pack"
PHASE = "phase-19"
IMPL_STAGE = "emr-ae-tpqty-100pack-focus8"
TAGS_PRESET = ["ema", "macd", "rsi", "breakout", "winrate", "stopout", "emr-ae-tpqty-100pack", "volume", "exit", "tp", "notrail"]
TAGS_CATALOG = ["emr-ae-tpqty-100pack", "volume", "exit", "tp", "combo", "notrail"]
TPS = [6, 8, 10, 12, 15, 18, 20, 25, 30, 35]
QTYS = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60]


def strategy_id(tp: int, qty: int) -> str:
    return f"emr-ae-v13-tp{tp}-q{qty}-notrail"


def strategy_name(tp: int, qty: int) -> str:
    return f"EMR A+E V13-TP{tp}-Q{qty}-NOTRAIL"


def strategy_note(tp: int, qty: int) -> str:
    return f"A+E TP/QTY sweep: vol=1.3x, TP{tp}% ({qty}% qty), no trail."


def build_strategy_matrix():
    return [(tp, qty) for tp in TPS for qty in QTYS]


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


def make_preset_entry(tp: int, qty: int) -> dict:
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
        "theme_notes": f"A+E TP/QTY sweep vol=1.3x, TP{tp}, qty{qty}, no trail",
        "recommended_timeframes": ["D"],
        "recommended_regime": "trending",
        "mag7_notes": "EMR A+E TP/QTY 100-pack: focus-8 sweep without EMA20 trail.",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "priority": 500,
        "status": "ready",
        "implementation_difficulty": "medium",
        "pine_complexity": "moderate",
        "tags": TAGS_PRESET,
        "source_path": f"{PINE_DIR}/{sid}.pine",
    }


def make_catalog_entry(tp: int, qty: int, priority: int) -> dict:
    sid = strategy_id(tp, qty)
    return {
        "id": sid,
        "name": strategy_name(tp, qty),
        "category": "breakout",
        "status": "ready",
        "phase": PHASE,
        "implementation_stage": IMPL_STAGE,
        "tags": TAGS_CATALOG,
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


def write_campaign(strategy_ids: list[str]) -> None:
    campaign = {
        "id": "emr-ae-tpqty-100pack-focus8",
        "name": "EMR A+E TP/QTY 100-Pack Focus-8 (phase-19)",
        "description": "TP/QTY sweep from emr-ae-v13-tp10-qty25 with EMA20 trail removed. Fixed: vol1.3x, price above EMA200, stop8, close-above-10d-high. Tests which TP/partial-exit pair best preserves winner upside on focus-8.",
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
            "detached_state_file": "artifacts/night-batch/emr-ae-tpqty-100pack-focus8-state.json",
            "production_timeout_sec": 28800,
        },
        "launch": {
            "shortcut_path": "C:\\TradingView\\TradingView.exe - ショートカット.lnk",
        },
        "bundle": {
            "us_campaign": "emr-ae-tpqty-100pack-focus8",
            "smoke_phases": "smoke",
            "production_phases": "full",
        },
    }
    NIGHT_BATCH_CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n")


def update_repo_layout_test() -> None:
    text = REPO_LAYOUT_TEST_PATH.read_text()
    text = text.replace("const expectedLiveStrategies = 250;", "const expectedLiveStrategies = 350;")
    text = text.replace("assert.equal(catalog.strategies.length, 252, `expected 252 strategies in catalog, got ${catalog.strategies.length}`);",
                        "assert.equal(catalog.strategies.length, 352, `expected 352 strategies in catalog, got ${catalog.strategies.length}`);")
    REPO_LAYOUT_TEST_PATH.write_text(text)


def update_strategy_catalog_test(strategy_ids: list[str]) -> None:
    text = STRATEGY_CATALOG_TEST_PATH.read_text()
    text = text.replace("it('live count is 250', async () => {", "it('live count is 350', async () => {")
    text = text.replace("assert.equal(live.length, 250);", "assert.equal(live.length, 350);")

    block_end = text.index("];\n\n// ---------------------------------------------------------------------------\n// loadCatalog")
    block = text[:block_end]
    missing = [sid for sid in strategy_ids if f"  '{sid}',\n" not in block]
    if missing:
        insertion = "".join(f"  '{sid}',\n" for sid in missing)
        text = text[:block_end] + insertion + text[block_end:]

    STRATEGY_CATALOG_TEST_PATH.write_text(text)


def main() -> None:
    template = TEMPLATE_PATH.read_text()
    matrix = build_strategy_matrix()
    strategy_ids = [strategy_id(tp, qty) for tp, qty in matrix]

    PINE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for tp, qty in matrix:
        sid = strategy_id(tp, qty)
        write_if_changed(PINE_OUTPUT_DIR / f"{sid}.pine", render_pine(template, tp, qty))

    preset_entries = [make_preset_entry(tp, qty) for tp, qty in matrix]
    catalog_entries = [make_catalog_entry(tp, qty, 700 + idx) for idx, (tp, qty) in enumerate(matrix)]
    update_json_array(PRESETS_PATH, preset_entries)
    update_json_array(CATALOG_PATH, catalog_entries)
    write_campaign(strategy_ids)
    write_night_batch_config()
    update_repo_layout_test()
    update_strategy_catalog_test(strategy_ids)

    print(f"Generated {len(strategy_ids)} strategies.")


if __name__ == "__main__":
    main()
