#!/usr/bin/env python3
"""
Generate the focus-8 42-pack smoke subset for the entry-quality 200-pack.

This script:
1. Validates that the 42 selected IDs exist in the 200-pack campaign
2. Writes a subset campaign JSON
3. Writes a night_batch config that keeps both smoke and production legs on the smoke phase
4. Updates campaign.test.js with subset coverage
"""

from __future__ import annotations

import json
import textwrap
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_CAMPAIGN_PATH = REPO_ROOT / "config/backtest/campaigns/emr-entry-quality-focus8-200pack.json"
TARGET_CAMPAIGN_PATH = REPO_ROOT / "config/backtest/campaigns/emr-entry-quality-focus8-42pack-smoke.json"
NIGHT_BATCH_CONFIG_PATH = REPO_ROOT / "config/night_batch/emr-entry-quality-focus8-42pack-smoke-config.json"
CAMPAIGN_TEST_PATH = REPO_ROOT / "tests/campaign.test.js"

TARGET_CAMPAIGN_ID = "emr-entry-quality-focus8-42pack-smoke"
SELECTED_IDS = [
    "ema-macd-rsi-sl-baseline",
    "emr-entry-base-ema10-24",
    "emr-entry-base-macd8-21-5",
    "emr-entry-base-rsi55",
    "emr-entry-conf-score3-rsi55",
    "emr-entry-conf-score4-rsi55",
    "emr-entry-conf-score4hist-rsi55",
    "emr-entry-conf-score4closefast-rsi55",
    "emr-entry-conf-score5histclose-rsi55",
    "emr-entry-delay-1barhigh-rsi55",
    "emr-entry-delay-1barhighfast-rsi55",
    "emr-entry-delay-2barhigh-rsi55",
    "emr-entry-delay-2barfasthist-rsi55",
    "emr-entry-delay-3barfastslowhist-rsi55",
    "emr-entry-struct-close5-rsi55",
    "emr-entry-struct-close10-rsi55",
    "emr-entry-struct-intraday20-rsi55",
    "emr-entry-struct-swing20-rsi55",
    "emr-entry-struct-donchian55compress-rsi55",
    "emr-entry-trend-priceema200-firm",
    "emr-entry-trend-ema50over200-firm",
    "emr-entry-trend-ema200rising-firm",
    "emr-entry-trend-adxtrend-firm",
    "emr-entry-vol-sma-03",
    "emr-entry-vol-rel-03",
    "emr-entry-vol-spike-obv-03",
    "emr-entry-vol-cmf-mfi-03",
    "emr-entry-volq-atrband-03",
    "emr-entry-volq-bbwidth-03",
    "emr-entry-volq-squeeze-03",
    "emr-entry-volq-range-03",
    "emr-entry-momo-adx-dmi-03",
    "emr-entry-momo-stoch-cci-roc-03",
    "emr-entry-fake-wick-03",
    "emr-entry-fake-gap-03",
    "emr-entry-fake-runup-03",
    "emr-entry-fake-clv-03",
    "emr-entry-fake-failedbreak-03",
    "emr-entry-pull-fast-03",
    "emr-entry-pull-slow-03",
    "emr-entry-pull-retest-03",
    "emr-entry-pull-fast-hold-03",
]


def write_if_changed(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text() == content:
        return
    path.write_text(content)


def write_campaign() -> None:
    source_campaign = json.loads(SOURCE_CAMPAIGN_PATH.read_text())
    available_ids = set(source_campaign["strategy_ids"])
    missing_ids = [sid for sid in SELECTED_IDS if sid not in available_ids]
    if missing_ids:
        raise RuntimeError(f"Selected IDs missing from 200-pack: {missing_ids}")
    if len(SELECTED_IDS) != 42:
        raise RuntimeError(f"Expected 42 selected IDs, got {len(SELECTED_IDS)}")
    if len(set(SELECTED_IDS)) != len(SELECTED_IDS):
        raise RuntimeError("Selected IDs must be unique")

    campaign = {
        "id": TARGET_CAMPAIGN_ID,
        "name": "EMA + MACD + RSI Entry Quality Focus-8 42-Pack Smoke (phase-21)",
        "description": "Representative 42-pack subset from the focus-8 entry-quality 200-pack. One strategy is selected from each subgroup to validate wiring and smoke execution breadth before running the full pack.",
        "universe": "focus-8",
        "strategy_ids": SELECTED_IDS,
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
    write_if_changed(TARGET_CAMPAIGN_PATH, json.dumps(campaign, indent=2) + "\n")


def write_night_batch_config() -> None:
    config = {
        "runtime": {
            "host": "172.31.144.1",
            "port": 9223,
            "startup_check_host": "127.0.0.1",
            "startup_check_port": 9222,
            "launch_wait_sec": 25,
            "detach_after_smoke": False,
            "detached_state_file": "artifacts/night-batch/emr-entry-quality-focus8-42pack-smoke-state.json",
            "production_timeout_sec": 28800,
        },
        "launch": {
            "shortcut_path": "C:\\TradingView\\TradingView.exe - ショートカット.lnk",
        },
        "bundle": {
            "us_campaign": TARGET_CAMPAIGN_ID,
            "smoke_phases": "smoke",
            "production_phases": "smoke",
        },
    }
    write_if_changed(NIGHT_BATCH_CONFIG_PATH, json.dumps(config, indent=2) + "\n")


def update_campaign_test() -> None:
    text = CAMPAIGN_TEST_PATH.read_text()
    if TARGET_CAMPAIGN_ID in text:
        return

    insertion = textwrap.dedent(
        """

  it('loads emr-entry-quality-focus8-42pack-smoke config with an 8 x 42 matrix', async () => {
    const campaign = await loadCampaign('emr-entry-quality-focus8-42pack-smoke');

    assert.equal(campaign.config.id, 'emr-entry-quality-focus8-42pack-smoke');
    assert.equal(campaign.config.universe, 'focus-8');
    assert.equal(campaign.config.strategy_ids.length, 42);
    assert.equal(campaign.symbols.length, 8);
    assert.equal(campaign.strategies.length, 42);
    assert.equal(campaign.matrix.length, 336);
    assert.equal(campaign.totalRuns, 336);
    assert.equal(campaign.defaults.date_range.from, '2015-01-01');
    assert.equal(campaign.defaults.date_range.to, '2026-04-27');
    assert.equal(campaign.strategies[0].id, 'ema-macd-rsi-sl-baseline');
  });

  it('uses SPY-only smoke for emr-entry-quality-focus8-42pack-smoke so each strategy is checked once', async () => {
    const campaign = await loadCampaign('emr-entry-quality-focus8-42pack-smoke', { phase: 'smoke' });

    assert.deepEqual(campaign.config.phases.smoke.symbols, ['SPY']);
    assert.equal(campaign.symbols.length, 1);
    assert.equal(campaign.strategies.length, 42);
    assert.equal(campaign.matrix.length, 42);
    assert.equal(campaign.totalRuns, 42);
  });
"""
    )
    marker = "  it('loads ema-breakout-winrate-stopout-failed-us40-pack config with a 40 x 36 matrix', async () => {"
    if marker not in text:
        raise RuntimeError("campaign.test.js insertion marker not found")
    text = text.replace(marker, insertion + "\n" + marker, 1)
    write_if_changed(CAMPAIGN_TEST_PATH, text)


def main() -> None:
    write_campaign()
    write_night_batch_config()
    update_campaign_test()
    print(f"Wrote {TARGET_CAMPAIGN_ID} campaign, config, and campaign tests.")


if __name__ == "__main__":
    main()
