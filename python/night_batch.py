#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shlex
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESEARCH_DOCS_DIR = PROJECT_ROOT / 'docs' / 'research'
ARTIFACTS_DIR = PROJECT_ROOT / 'artifacts'
RESEARCH_RESULTS_DIR = ARTIFACTS_DIR
CAMPAIGN_RESULTS_DIR = ARTIFACTS_DIR / 'campaigns'
LATEST_RESEARCH_DIR = RESEARCH_DOCS_DIR / 'current'
DEFAULT_LATEST_SUMMARY_PATH = LATEST_RESEARCH_DIR / 'main-backtest-current-summary.md'
BACKTEST_REFERENCES_DIR = PROJECT_ROOT / 'references' / 'backtests'
DEFAULT_LATEST_RANKING_ARTIFACT_PATH = BACKTEST_REFERENCES_DIR / 'main-backtest-current-combined-ranking.json'
STRATEGY_RESEARCH_DIR = RESEARCH_DOCS_DIR / 'strategy'
DEFAULT_STRATEGY_REFERENCE_PATH = STRATEGY_RESEARCH_DIR / 'current-strategy-reference.md'
DEFAULT_SYMBOL_REFERENCE_PATH = STRATEGY_RESEARCH_DIR / 'current-symbol-reference.md'


def resolve_results_dir() -> Path:
    raw = os.environ.get('NIGHT_BATCH_RESULTS_DIR')
    if not raw:
        return ARTIFACTS_DIR / 'night-batch'
    normalized = raw.replace('\\', '/') if '\\' in raw and ':' not in raw else raw
    path = Path(normalized)
    return path if path.is_absolute() else PROJECT_ROOT / path


RESULTS_DIR = resolve_results_dir()
DEFAULT_HOST = '172.31.144.1'
DEFAULT_PORT = 9223
DEFAULT_STARTUP_CHECK_HOST = '127.0.0.1'
DEFAULT_STARTUP_CHECK_PORT = 9222
DEFAULT_SHORTCUT_PATH = r'C:\TradingView\TradingView.exe - ショートカット.lnk'
DEFAULT_LAUNCH_WAIT_SEC = 20
DEFAULT_PHASES = 'smoke,full'
DEFAULT_TIMEOUT = 4 * 60 * 60
DEFAULT_US_CAMPAIGN = 'next-long-run-us-12x10'
DEFAULT_JP_CAMPAIGN = 'next-long-run-jp-12x10'
DEFAULT_SMOKE_CLI = 'backtest preset ema-cross-9-21 --symbol NVDA --date-from 2024-01-01 --date-to 2024-12-31'
DEFAULT_PRODUCTION_CLI = 'backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31'
DEFAULT_DETACHED_STATE_FILE = 'artifacts/night-batch/detached-production-state.json'
DEFAULT_RECOVERY_SCRIPT = 'scripts/backtest/ensure-tradingview-recovery.sh'
DEFAULT_RECOVERY_STEP_RETRIES = 2
DEFAULT_RECOVERY_TIMEOUT_SEC = 90
EXIT_PREFLIGHT_FAILED = 1
EXIT_STEP_FAILED = 2
ROUND_MANIFEST_FILE = 'round-manifest.json'
ARCHIVE_DIR_NAME = 'archive'
ROUND_DIR_PATTERN = re.compile(r'^round(\d+)$')
RECOVERABLE_RUNTIME_FAILURE = re.compile(
    r'EPIPE|broken pipe|process.*(not found|missing|gone|exited|crashed)'
    r'|TradingView Desktop Critical Error|No requested worker port passed status preflight'
    r'|Preflight failed for CDP session|chart API is unavailable|api_available.?false'
    r'|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|socket hang up'
    r'|connection reset by peer|remote end closed connection without response'
    r'|cdp.*unreachable|port.*9222.*closed|mcp.*(unhealthy|unavailable|not responding)',
    re.IGNORECASE,
)


def utc_run_id() -> str:
    return datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_results_dir() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def ensure_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)


def parse_round_number(name: str) -> int | None:
    match = ROUND_DIR_PATTERN.match(name)
    if not match:
        return None
    return int(match.group(1))


def list_round_dirs(results_dir: Path, include_archive: bool = False) -> list[Path]:
    round_dirs: list[Path] = []
    if results_dir.exists():
        for entry in results_dir.iterdir():
            if entry.is_dir() and parse_round_number(entry.name) is not None:
                round_dirs.append(entry)
    if include_archive:
        archive_dir = results_dir / ARCHIVE_DIR_NAME
        if archive_dir.exists():
            for entry in archive_dir.iterdir():
                if entry.is_dir() and parse_round_number(entry.name) is not None:
                    round_dirs.append(entry)
    return sorted(round_dirs, key=lambda path: parse_round_number(path.name) or 0)


def find_existing_rounds(include_archive: bool = False) -> list[int]:
    rounds = []
    for entry in list_round_dirs(RESULTS_DIR, include_archive=include_archive):
        round_number = parse_round_number(entry.name)
        if round_number is not None:
            rounds.append(round_number)
    return sorted(set(rounds))


def resolve_round_dir(mode: str) -> tuple[Path, int]:
    if mode == 'advance-next-round':
        rounds = find_existing_rounds(include_archive=True)
        next_num = (max(rounds) + 1) if rounds else 1
        round_dir = RESULTS_DIR / f'round{next_num}'
        round_dir.mkdir(parents=True, exist_ok=True)
        return round_dir, next_num
    if mode == 'resume-current-round':
        rounds = find_existing_rounds()
        if not rounds:
            raise RuntimeError(
                'No existing round found under artifacts/night-batch/. '
                'Use --round-mode advance-next-round to create a new round.'
            )
        current_num = max(rounds)
        round_dir = RESULTS_DIR / f'round{current_num}'
        return round_dir, current_num
    raise ValueError(f'Unknown round mode: {mode}')


def write_round_manifest(
    output_dir: Path,
    round_number: int,
    run_id: str,
    mode: str,
    command: str,
    fingerprint: str | None = None,
) -> Path:
    manifest_path = output_dir / ROUND_MANIFEST_FILE
    manifest: dict = {}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, OSError):
            manifest = {}
    if 'round' not in manifest:
        manifest['round'] = round_number
        manifest['created_at'] = datetime.now(timezone.utc).isoformat()
    manifest['mode'] = mode
    if fingerprint:
        manifest['strategy_set_fingerprint'] = fingerprint
    manifest['updated_at'] = datetime.now(timezone.utc).isoformat()
    runs = manifest.setdefault('runs', [])
    runs.append({
        'run_id': run_id,
        'command': command,
        'started_at': datetime.now(timezone.utc).isoformat(),
    })
    manifest_path.write_text(
        f'{json.dumps(manifest, indent=2, ensure_ascii=False)}\n', encoding='utf-8',
    )
    return manifest_path


def read_round_manifest(output_dir: Path) -> dict | None:
    manifest_path = output_dir / ROUND_MANIFEST_FILE
    if not manifest_path.exists():
        return None
    return read_json_file(manifest_path)


def build_round_fingerprint(payload: dict) -> str:
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()


def build_smoke_prod_fingerprint(settings: dict) -> str:
    payload = {
        'bundle_jp_campaign': settings.get('bundle_jp_campaign'),
        'bundle_production_phases': settings.get('bundle_production_phases'),
        'bundle_smoke_phases': settings.get('bundle_smoke_phases'),
        'bundle_us_campaign': settings.get('bundle_us_campaign'),
        'production_cli': settings.get('production_cli'),
        'production_mode': settings.get('production_mode'),
        'smoke_cli': settings.get('smoke_cli'),
        'smoke_mode': settings.get('smoke_mode'),
    }
    return build_round_fingerprint(payload)


def build_args_fingerprint(args) -> str:
    payload = {
        'command': args.command,
        'phases': getattr(args, 'phases', None),
        'campaign_id': getattr(args, 'campaign_id', None),
        'phase': getattr(args, 'phase', None),
        'us_campaign': getattr(args, 'us_campaign', None),
        'jp_campaign': getattr(args, 'jp_campaign', None),
    }
    return build_round_fingerprint(payload)


def ensure_round_manifest_matches(output_dir: Path, expected_fingerprint: str) -> None:
    manifest = read_round_manifest(output_dir)
    if not manifest:
        raise RuntimeError(
            f'Latest round is missing {ROUND_MANIFEST_FILE}: {relative_path(output_dir)}'
        )
    actual_fingerprint = manifest.get('strategy_set_fingerprint')
    if actual_fingerprint != expected_fingerprint:
        raise RuntimeError(
            'Latest round fingerprint does not match the current strategy set. '
            'Use --round-mode advance-next-round to start a new round.'
        )


def resolve_round_scoped_path(output_dir: Path, path_value: Path | None, default_name: str) -> Path:
    if path_value is None:
        return output_dir / default_name
    if path_value.parent == RESULTS_DIR:
        return output_dir / path_value.name
    return path_value


def find_completed_step_in_round(output_dir: Path, step_name: str) -> bool:
    if not output_dir.exists():
        return False
    for summary_file in sorted(output_dir.glob('*-summary.json')):
        try:
            data = json.loads(summary_file.read_text(encoding='utf-8'))
            for step in data.get('steps', []):
                if (step.get('name') == step_name
                        and step.get('success')
                        and not step.get('skipped')):
                    return True
        except (json.JSONDecodeError, KeyError, OSError):
            pass
    return False


def resolve_project_path(path_value: str | None) -> Path | None:
    if path_value is None:
        return None
    normalized = path_value
    if '\\' in normalized and ':' not in normalized:
        normalized = normalized.replace('\\', '/')
    path = Path(normalized)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def canonical_repo_path(path_value: str | Path | None) -> str | None:
    if path_value is None:
        return None
    resolved = resolve_project_path(str(path_value))
    if resolved is None:
        return None
    return relative_path(resolved)


def configure_console_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    logger.propagate = False

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s %(message)s'))
    logger.addHandler(handler)

    return logger


def configure_logger(run_id: str, output_dir: Path = RESULTS_DIR) -> tuple[logging.Logger, Path]:
    ensure_output_dir(output_dir)
    log_path = output_dir / f'{run_id}.log'
    logger = logging.getLogger(f'night_batch.{run_id}')
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    logger.propagate = False

    formatter = logging.Formatter('%(asctime)s %(levelname)s %(message)s')

    file_handler = logging.FileHandler(log_path, encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    return logger, log_path


def build_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument('--node-bin', default=os.environ.get('NODE_BIN', 'node'))
    common.add_argument('--host', default=DEFAULT_HOST)
    common.add_argument('--port', type=int, default=DEFAULT_PORT)
    common.add_argument('--timeout', type=int, default=DEFAULT_TIMEOUT)
    common.add_argument('--dry-run', action='store_true')
    common.add_argument('--run-id', default=None, help=argparse.SUPPRESS)
    common.add_argument(
        '--round-mode',
        choices=['advance-next-round', 'resume-current-round'],
        default=None,
        help='Round selection mode: advance-next-round creates a new round dir; resume-current-round reuses the latest.',
    )
    common.add_argument('--recovery-script', default=os.environ.get('NIGHT_BATCH_RECOVERY_SCRIPT', DEFAULT_RECOVERY_SCRIPT))
    common.add_argument('--recovery-step-retries', type=int, default=DEFAULT_RECOVERY_STEP_RETRIES)
    common.add_argument('--recovery-timeout-sec', type=int, default=DEFAULT_RECOVERY_TIMEOUT_SEC)

    parser = argparse.ArgumentParser(
        description='WSL-first orchestrator for TradingView backtest night runs.',
    )
    subparsers = parser.add_subparsers(dest='command', required=True)

    bundle = subparsers.add_parser('bundle', help='Run the existing finetune bundle via Node', parents=[common])
    bundle.add_argument('--phases', default=DEFAULT_PHASES)
    bundle.add_argument('--us-campaign', default=DEFAULT_US_CAMPAIGN)
    bundle.add_argument('--jp-campaign', default=DEFAULT_JP_CAMPAIGN)
    bundle.add_argument('--us-resume', default=None, help='Checkpoint path to resume the US campaign from')
    bundle.add_argument('--jp-resume', default=None, help='Checkpoint path to resume the JP campaign from')

    campaign = subparsers.add_parser('campaign', help='Run a single long campaign via Node', parents=[common])
    campaign.add_argument('campaign_id')
    campaign.add_argument('--phase', default='full')
    campaign.add_argument('--resume')

    recover = subparsers.add_parser('recover', help='Recover the latest checkpoint for a campaign', parents=[common])
    recover.add_argument('campaign_id')
    recover.add_argument('--phase', default='full')

    report = subparsers.add_parser('report', help='Generate a rich report via Node', parents=[common])
    report.add_argument('--us', required=True)
    report.add_argument('--jp', required=True)
    report.add_argument('--out', required=True)
    report.add_argument('--ranking-out')
    report.add_argument('--diff-out')
    report.add_argument('--catalog-path')
    report.add_argument('--catalog-out')
    report.add_argument('--date-from', default='2000-01-01')
    report.add_argument('--date-to', default='latest')
    report.add_argument('--title')

    nightly = subparsers.add_parser('nightly', help='Run bundle first, then generate a rich report', parents=[common])
    nightly.add_argument('--phases', default=DEFAULT_PHASES)
    nightly.add_argument('--us-campaign', default=DEFAULT_US_CAMPAIGN)
    nightly.add_argument('--jp-campaign', default=DEFAULT_JP_CAMPAIGN)
    nightly.add_argument('--report-us')
    nightly.add_argument('--report-jp')
    nightly.add_argument('--report-out')
    nightly.add_argument('--ranking-out')
    nightly.add_argument('--diff-out')
    nightly.add_argument('--catalog-path')
    nightly.add_argument('--catalog-out')
    nightly.add_argument('--date-from', default='2000-01-01')
    nightly.add_argument('--date-to', default='latest')
    nightly.add_argument('--title')

    smoke_prod = subparsers.add_parser(
        'smoke-prod',
        help='Check startup state, launch TradingView if needed, then run smoke and production backtests',
        parents=[common],
    )
    smoke_prod.add_argument('--startup-check-host', default=DEFAULT_STARTUP_CHECK_HOST)
    smoke_prod.add_argument('--startup-check-port', type=int, default=DEFAULT_STARTUP_CHECK_PORT)
    smoke_prod.add_argument('--shortcut-path', default=DEFAULT_SHORTCUT_PATH)
    smoke_prod.add_argument('--launch-command')
    smoke_prod.add_argument('--launch-wait-sec', type=int, default=DEFAULT_LAUNCH_WAIT_SEC)
    smoke_prod.add_argument('--smoke-cli', default=DEFAULT_SMOKE_CLI)
    smoke_prod.add_argument('--production-cli', default=DEFAULT_PRODUCTION_CLI)
    smoke_prod.add_argument('--config')
    smoke_prod.add_argument('--detach-after-smoke', action='store_true')
    smoke_prod.add_argument('--detached-state-file', default=DEFAULT_DETACHED_STATE_FILE)
    smoke_prod.add_argument('--smoke-timeout-sec', type=int)
    smoke_prod.add_argument('--production-timeout-sec', type=int)
    smoke_prod.add_argument('--us-resume', default=None, help='Checkpoint path to resume the US campaign from')
    smoke_prod.add_argument('--jp-resume', default=None, help='Checkpoint path to resume the JP campaign from')

    production_child = subparsers.add_parser(
        'production-child',
        help=argparse.SUPPRESS,
        parents=[common],
    )
    production_child.add_argument('--production-timeout-sec', type=int, default=0)
    production_child.add_argument('--launch-wait-sec', type=int, default=DEFAULT_LAUNCH_WAIT_SEC)
    production_child.add_argument('--detached-state-file', default=DEFAULT_DETACHED_STATE_FILE)
    production_child.add_argument('--production-command-json', required=True)
    production_child.add_argument('--production-env-json', default='{}')
    production_child.add_argument('--production-checkpoint-roots-json', default='[]')
    production_child.add_argument('--output-dir', default=str(RESULTS_DIR))
    production_child.add_argument('--bundle-us-campaign')
    production_child.add_argument('--bundle-jp-campaign')
    production_child.add_argument('--bundle-production-phases', default='full')

    archive_rounds = subparsers.add_parser(
        'archive-rounds',
        help='Move completed round directories under artifacts/night-batch/archive',
    )
    archive_rounds.add_argument('--dry-run', action='store_true')

    return parser


def requires_cdp_preflight(command: str) -> bool:
    return command in {'bundle', 'campaign', 'recover', 'nightly'}


def has_tradingview_chart_target(payload: list[dict]) -> bool:
    for target in payload:
        if not isinstance(target, dict):
            continue
        if target.get('type') != 'page':
            continue
        url = str(target.get('url') or '')
        if 'tradingview' in url.lower() and '/chart' in url.lower():
            return True
    return False


def preflight_visible_session(host: str, port: int, logger: logging.Logger) -> dict:
    url = f'http://{host}:{port}/json/list'
    try:
        with urllib.request.urlopen(url, timeout=3) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, TimeoutError, ValueError, OSError) as error:
        raise RuntimeError(
            f'Preflight failed for CDP session {host}:{port}: {error}'
        ) from error

    if not isinstance(payload, list):
        raise RuntimeError(
            f'Preflight failed for CDP session {host}:{port}: unexpected non-list /json/list payload'
        )
    if not has_tradingview_chart_target(payload):
        raise RuntimeError(
            f'Preflight failed for CDP session {host}:{port}: no TradingView chart target found'
        )

    logger.info('Preflight OK for CDP session %s:%s (%s targets)', host, port, len(payload))
    return {'url': url, 'targets': len(payload)}


def readiness_check(host: str, port: int, node_bin: str, logger: logging.Logger) -> dict:
    """Run ``tv status`` via Node CLI and verify api_available===true.

    Returns a dict with 'success', 'api_available', and raw 'payload'.
    Raises RuntimeError when the readiness contract is not met.
    """
    cli_path = str(PROJECT_ROOT / 'src' / 'cli' / 'index.js')
    cmd = [node_bin, cli_path, 'status']
    env = {
        **os.environ,
        'TV_CDP_HOST': host,
        'TV_CDP_PORT': str(port),
    }
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
            env=env,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeError(
            f'Readiness check failed for {host}:{port}: {error}'
        ) from error

    stdout = proc.stdout.strip()
    stderr = proc.stderr.strip()
    payload: dict = {}
    for source in (stdout, stderr):
        if source:
            try:
                payload = json.loads(source)
                break
            except (json.JSONDecodeError, ValueError):
                continue

    def summarize_output(text: str, label: str) -> str | None:
        collapsed = ' '.join(text.split())
        if not collapsed:
            return None
        if len(collapsed) > 240:
            collapsed = f'{collapsed[:237]}...'
        return f'{label}={collapsed}'

    success = payload.get('success') is True and payload.get('api_available') is True
    if not success:
        details = [f'api_available={payload.get("api_available")}']
        api_error = payload.get('apiError') or payload.get('error')
        if api_error:
            details.append(f'error={api_error}')
        else:
            details.append(f'cli_exit={proc.returncode}')
            stderr_summary = summarize_output(stderr, 'stderr')
            stdout_summary = summarize_output(stdout, 'stdout')
            if stderr_summary:
                details.append(stderr_summary)
            elif stdout_summary:
                details.append(stdout_summary)
            else:
                details.append('error=unknown')
        raise RuntimeError(
            f'Readiness check failed for {host}:{port}: '
            f'{", ".join(details)}'
        )

    logger.info(
        'Readiness OK for %s:%s (api_available=%s, symbol=%s)',
        host, port, payload.get('api_available'), payload.get('chart_symbol', '?'),
    )
    return {'success': True, 'api_available': True, 'payload': payload}


def relative_path(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def resolve_latest_summary_path() -> Path:
    raw = os.environ.get('NIGHT_BATCH_CURRENT_SUMMARY_PATH') or os.environ.get('NIGHT_BATCH_LATEST_SUMMARY_PATH')
    if raw:
        return resolve_project_path(raw) or (PROJECT_ROOT / raw)
    return DEFAULT_LATEST_SUMMARY_PATH


def resolve_latest_ranking_artifact_path() -> Path:
    raw = os.environ.get('NIGHT_BATCH_CURRENT_RANKING_PATH') or os.environ.get('NIGHT_BATCH_LATEST_RANKING_PATH')
    if raw:
        return resolve_project_path(raw) or (PROJECT_ROOT / raw)
    return DEFAULT_LATEST_RANKING_ARTIFACT_PATH


def resolve_strategy_reference_path() -> Path:
    raw = os.environ.get('NIGHT_BATCH_STRATEGY_REFERENCE_PATH')
    if raw:
        return resolve_project_path(raw) or (PROJECT_ROOT / raw)
    summary_override = os.environ.get('NIGHT_BATCH_CURRENT_SUMMARY_PATH') or os.environ.get('NIGHT_BATCH_LATEST_SUMMARY_PATH')
    if summary_override:
        summary_path = resolve_project_path(summary_override) or (PROJECT_ROOT / summary_override)
        return summary_path.with_name('current-strategy-reference.md')
    return DEFAULT_STRATEGY_REFERENCE_PATH


def resolve_symbol_reference_path() -> Path:
    raw = os.environ.get('NIGHT_BATCH_SYMBOL_REFERENCE_PATH')
    if raw:
        return resolve_project_path(raw) or (PROJECT_ROOT / raw)
    summary_override = os.environ.get('NIGHT_BATCH_CURRENT_SUMMARY_PATH') or os.environ.get('NIGHT_BATCH_LATEST_SUMMARY_PATH')
    if summary_override:
        summary_path = resolve_project_path(summary_override) or (PROJECT_ROOT / summary_override)
        return summary_path.with_name('current-symbol-reference.md')
    return DEFAULT_SYMBOL_REFERENCE_PATH


def option_was_provided(raw_args: list[str], option_name: str) -> bool:
    prefix = f'{option_name}='
    return option_name in raw_args or any(arg.startswith(prefix) for arg in raw_args)


def read_json_file(path: Path) -> dict:
    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError as error:
        raise ValueError(f'Config file not found: {path}') from error
    except json.JSONDecodeError as error:
        raise ValueError(f'Config file is not valid JSON: {path}: {error}') from error
    if not isinstance(payload, dict):
        raise ValueError(f'Config file must contain a top-level object: {path}')
    return payload


def read_detached_state(state_path: Path) -> dict | None:
    if not state_path.exists():
        return None
    return read_json_file(state_path)


def next_archive_backup_target(target_dir: Path) -> Path:
    suffix = '.previous'
    candidate = target_dir.with_name(f'{target_dir.name}{suffix}')
    index = 1
    while candidate.exists():
        candidate = target_dir.with_name(f'{target_dir.name}{suffix}-{index}')
        index += 1
    return candidate


def process_is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def assert_no_active_detached_run(state_path: Path) -> None:
    state = read_detached_state(state_path)
    if not state or state.get('status') != 'running':
        return
    pid = state.get('pid')
    if not isinstance(pid, int):
        raise RuntimeError(f'Detached state file has invalid pid: {state_path}')
    if process_is_running(pid):
        raise RuntimeError(
            f'Detached production already running with pid {pid}: {state_path}'
        )


def read_config_section(config: dict, key: str) -> dict:
    value = config.get(key)
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f'Config section "{key}" must be an object')
    return value


def round_dir_has_summary(round_dir: Path) -> bool:
    return any(round_dir.glob('*-summary.json'))


def archive_completed_rounds(
    results_dir: Path = RESULTS_DIR,
    logger: logging.Logger | None = None,
    dry_run: bool = False,
) -> list[tuple[Path, Path]]:
    archived: list[tuple[Path, Path]] = []
    if not results_dir.exists():
        return archived

    archive_root = results_dir / ARCHIVE_DIR_NAME
    for round_dir in list_round_dirs(results_dir):
        if not round_dir_has_summary(round_dir):
            continue
        target_dir = archive_root / round_dir.name
        if logger:
            logger.info(
                '%s completed round %s -> %s',
                '[dry-run] Archive' if dry_run else 'Archive',
                relative_path(round_dir),
                relative_path(target_dir),
            )
        if dry_run:
            archived.append((round_dir, target_dir))
            continue
        archive_root.mkdir(parents=True, exist_ok=True)
        if target_dir.exists():
            previous_target = next_archive_backup_target(target_dir)
            if logger:
                logger.info(
                    'Move existing archive target %s -> %s',
                    relative_path(target_dir),
                    relative_path(previous_target),
                )
            shutil.move(str(target_dir), str(previous_target))
        shutil.move(str(round_dir), str(target_dir))
        archived.append((round_dir, target_dir))

    return archived


def resolve_option(
    raw_args: list[str],
    option_name: str,
    parsed_value,
    config_value,
    default_value,
):
    if option_was_provided(raw_args, option_name):
        return parsed_value
    if config_value is not None:
        return config_value
    return default_value


def resolve_bool_option(
    raw_args: list[str],
    option_name: str,
    parsed_value: bool,
    config_value,
    default_value: bool,
) -> bool:
    if option_was_provided(raw_args, option_name):
        return parsed_value
    if config_value is None:
        return default_value
    if not isinstance(config_value, bool):
        raise ValueError(f'Config value for "{option_name}" must be a boolean')
    return config_value


def resolve_int_option(
    raw_args: list[str],
    option_name: str,
    parsed_value,
    config_value,
    default_value: int,
) -> int:
    value = resolve_option(raw_args, option_name, parsed_value, config_value, default_value)
    try:
        return int(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f'Config value for "{option_name}" must be an integer') from error


def load_smoke_prod_settings(args, raw_args: list[str]) -> dict:
    config = {}
    raw_config_path = getattr(args, 'config', None)
    if isinstance(raw_config_path, str) and raw_config_path.strip() == '':
        raise ValueError('--config must not be empty')
    config_path = resolve_project_path(raw_config_path)
    if config_path:
        if config_path.is_dir():
            raise ValueError(
                f'--config path is a directory, not a file: {config_path}'
            )
        config = read_json_file(config_path)

    runtime = read_config_section(config, 'runtime')
    launch = read_config_section(config, 'launch')
    strategies = read_config_section(config, 'strategies')
    bundle = read_config_section(config, 'bundle')
    smoke = read_config_section(strategies, 'smoke')
    production = read_config_section(strategies, 'production')

    host = resolve_option(raw_args, '--host', args.host, runtime.get('host'), DEFAULT_HOST)
    port = resolve_int_option(raw_args, '--port', args.port, runtime.get('port'), DEFAULT_PORT)
    startup_check_host = resolve_option(
        raw_args,
        '--startup-check-host',
        args.startup_check_host,
        runtime.get('startup_check_host'),
        DEFAULT_STARTUP_CHECK_HOST,
    )
    startup_check_port = resolve_int_option(
        raw_args,
        '--startup-check-port',
        args.startup_check_port,
        runtime.get('startup_check_port'),
        DEFAULT_STARTUP_CHECK_PORT,
    )
    shortcut_path = resolve_option(
        raw_args,
        '--shortcut-path',
        args.shortcut_path,
        launch.get('shortcut_path'),
        DEFAULT_SHORTCUT_PATH,
    )
    launch_command = resolve_option(
        raw_args,
        '--launch-command',
        args.launch_command,
        launch.get('launch_command'),
        None,
    )
    launch_wait_sec = resolve_int_option(
        raw_args,
        '--launch-wait-sec',
        args.launch_wait_sec,
        runtime.get('launch_wait_sec'),
        DEFAULT_LAUNCH_WAIT_SEC,
    )
    smoke_cli = resolve_option(
        raw_args,
        '--smoke-cli',
        args.smoke_cli,
        smoke.get('cli'),
        DEFAULT_SMOKE_CLI,
    )
    production_cli = resolve_option(
        raw_args,
        '--production-cli',
        args.production_cli,
        production.get('cli'),
        DEFAULT_PRODUCTION_CLI,
    )
    node_bin = resolve_option(
        raw_args,
        '--node-bin',
        args.node_bin,
        runtime.get('node_bin'),
        os.environ.get('NODE_BIN', 'node'),
    )
    detach_after_smoke = resolve_bool_option(
        raw_args,
        '--detach-after-smoke',
        args.detach_after_smoke,
        runtime.get('detach_after_smoke'),
        False,
    )
    detached_state_file = resolve_project_path(
        resolve_option(
            raw_args,
            '--detached-state-file',
            args.detached_state_file,
            runtime.get('detached_state_file'),
            DEFAULT_DETACHED_STATE_FILE,
        )
    )
    smoke_timeout_sec = resolve_int_option(
        raw_args,
        '--smoke-timeout-sec',
        args.smoke_timeout_sec,
        runtime.get('smoke_timeout_sec'),
        args.timeout,
    )
    default_production_timeout = 0 if detach_after_smoke else args.timeout
    production_timeout_sec = resolve_int_option(
        raw_args,
        '--production-timeout-sec',
        args.production_timeout_sec,
        runtime.get('production_timeout_sec'),
        default_production_timeout,
    )
    recovery_script = resolve_option(
        raw_args,
        '--recovery-script',
        getattr(args, 'recovery_script', None),
        runtime.get('recovery_script'),
        DEFAULT_RECOVERY_SCRIPT,
    )
    recovery_step_retries = resolve_int_option(
        raw_args,
        '--recovery-step-retries',
        getattr(args, 'recovery_step_retries', None),
        runtime.get('recovery_step_retries'),
        DEFAULT_RECOVERY_STEP_RETRIES,
    )
    recovery_timeout_sec = resolve_int_option(
        raw_args,
        '--recovery-timeout-sec',
        getattr(args, 'recovery_timeout_sec', None),
        runtime.get('recovery_timeout_sec'),
        DEFAULT_RECOVERY_TIMEOUT_SEC,
    )
    bundle_us_campaign = bundle.get('us_campaign')
    bundle_jp_campaign = bundle.get('jp_campaign')
    bundle_smoke_phases = bundle.get('smoke_phases') or 'smoke'
    bundle_production_phases = bundle.get('production_phases') or 'full'
    smoke_mode = 'cli'
    production_mode = 'cli'
    if (bundle_us_campaign or bundle_jp_campaign) and not smoke.get('cli') and not option_was_provided(raw_args, '--smoke-cli'):
        smoke_mode = 'bundle'
    if (bundle_us_campaign or bundle_jp_campaign) and not production.get('cli') and not option_was_provided(raw_args, '--production-cli'):
        production_mode = 'bundle'

    us_resume = resolve_option(
        raw_args, '--us-resume', getattr(args, 'us_resume', None),
        bundle.get('us_resume'), None,
    )
    jp_resume = resolve_option(
        raw_args, '--jp-resume', getattr(args, 'jp_resume', None),
        bundle.get('jp_resume'), None,
    )

    return {
        'config_path': config_path,
        'node_bin': node_bin,
        'host': host,
        'port': port,
        'startup_check_host': startup_check_host,
        'startup_check_port': startup_check_port,
        'shortcut_path': shortcut_path,
        'launch_command': launch_command,
        'launch_wait_sec': launch_wait_sec,
        'smoke_cli': smoke_cli,
        'production_cli': production_cli,
        'detach_after_smoke': detach_after_smoke,
        'detached_state_file': detached_state_file,
        'smoke_timeout_sec': smoke_timeout_sec,
        'production_timeout_sec': production_timeout_sec,
        'recovery_script': resolve_project_path(recovery_script),
        'recovery_step_retries': max(0, recovery_step_retries),
        'recovery_timeout_sec': max(5, recovery_timeout_sec),
        'smoke_mode': smoke_mode,
        'production_mode': production_mode,
        'bundle_us_campaign': bundle_us_campaign,
        'bundle_jp_campaign': bundle_jp_campaign,
        'bundle_smoke_phases': bundle_smoke_phases,
        'bundle_production_phases': bundle_production_phases,
        'us_resume': us_resume,
        'jp_resume': jp_resume,
        'dry_run': args.dry_run,
        'timeout': args.timeout,
    }


def find_latest_checkpoint(paths: list[Path]) -> Path | None:
    latest: Path | None = None
    latest_mtime = -1.0
    for base in paths:
        if not base.exists():
            continue
        for checkpoint in base.rglob('checkpoint-*.json'):
            try:
                stat = checkpoint.stat()
            except FileNotFoundError:
                continue
            if stat.st_mtime > latest_mtime:
                latest = checkpoint
                latest_mtime = stat.st_mtime
    return latest


def stream_reader(stream, logger: logging.Logger, label: str, sink: list[dict]) -> None:
    try:
        for raw_line in iter(stream.readline, ''):
            line = raw_line.rstrip('\n')
            if line == '':
                continue
            sink.append({'stream': label, 'line': line})
            logger.info('[%s] %s', label, line)
    finally:
        stream.close()


def run_process(
    command: list[str],
    checkpoint_roots: list[Path],
    timeout_sec: int,
    dry_run: bool,
    logger: logging.Logger,
    env_overrides: dict[str, str] | None = None,
    progress_callback=None,
) -> dict:
    if dry_run:
        logger.info('[dry-run] %s', shlex.join(command))
        latest_checkpoint = find_latest_checkpoint(checkpoint_roots) if checkpoint_roots else None
        return {
            'success': True,
            'exit_code': 0,
            'timed_out': False,
            'latest_checkpoint': relative_path(latest_checkpoint) if latest_checkpoint else None,
            'captured_lines': [],
            'command': command,
            'skipped': False,
        }

    started = time.monotonic()
    captured_lines: list[dict] = []
    process_env = os.environ.copy()
    if env_overrides:
        process_env.update(env_overrides)
    process = subprocess.Popen(
        command,
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env=process_env,
    )

    stdout_thread = threading.Thread(
        target=stream_reader,
        args=(process.stdout, logger, 'stdout', captured_lines),
        daemon=True,
    )
    stderr_thread = threading.Thread(
        target=stream_reader,
        args=(process.stderr, logger, 'stderr', captured_lines),
        daemon=True,
    )
    stdout_thread.start()
    stderr_thread.start()

    latest_checkpoint = find_latest_checkpoint(checkpoint_roots)
    logged_checkpoint = relative_path(latest_checkpoint) if latest_checkpoint else None
    timed_out = False
    if progress_callback:
        progress_callback(logged_checkpoint, True)

    while process.poll() is None:
        if timeout_sec > 0 and time.monotonic() - started > timeout_sec:
            timed_out = True
            logger.error('Timeout exceeded (%ss). Terminating process.', timeout_sec)
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logger.error('Process did not exit after SIGTERM. Killing.')
                process.kill()
            break

        current_checkpoint = find_latest_checkpoint(checkpoint_roots)
        current_checkpoint_rel = relative_path(current_checkpoint) if current_checkpoint else None
        if current_checkpoint_rel and current_checkpoint_rel != logged_checkpoint:
            logger.info('Checkpoint updated: %s', current_checkpoint_rel)
            logged_checkpoint = current_checkpoint_rel
        if progress_callback:
            progress_callback(current_checkpoint_rel, False)

        time.sleep(2)

    process.wait()
    stdout_thread.join(timeout=1)
    stderr_thread.join(timeout=1)

    latest_checkpoint = find_latest_checkpoint(checkpoint_roots)
    latest_checkpoint_rel = relative_path(latest_checkpoint) if latest_checkpoint else None
    if progress_callback:
        progress_callback(latest_checkpoint_rel, True)
    return {
        'success': process.returncode == 0 and not timed_out,
        'exit_code': process.returncode,
        'timed_out': timed_out,
        'latest_checkpoint': latest_checkpoint_rel,
        'captured_lines': captured_lines,
        'command': command,
        'skipped': False,
    }


def default_report_paths(args) -> tuple[str, str, str]:
    us_path = getattr(args, 'report_us', None) or f'artifacts/campaigns/{args.us_campaign}/full/recovered-results.json'
    jp_path = getattr(args, 'report_jp', None) or f'artifacts/campaigns/{args.jp_campaign}/full/recovered-results.json'
    output_dir = resolve_project_path(getattr(args, 'output_dir', None)) or RESULTS_DIR
    report_out = getattr(args, 'report_out', None) or str(output_dir / f'{utc_run_id()}-rich-report.md')
    return us_path, jp_path, report_out


def default_ranking_out(args, output_dir: Path | None = None) -> str:
    explicit = getattr(args, 'ranking_out', None)
    if explicit:
        return explicit
    effective_dir = output_dir or resolve_project_path(getattr(args, 'output_dir', None)) or RESULTS_DIR
    return str(effective_dir / f'{utc_run_id()}-combined-ranking.json')


def default_diff_out(args, output_dir: Path | None = None) -> str:
    explicit = getattr(args, 'diff_out', None)
    if explicit:
        return explicit
    effective_dir = output_dir or resolve_project_path(getattr(args, 'output_dir', None)) or RESULTS_DIR
    return str(effective_dir / f'{utc_run_id()}-live-retired-diff.json')


def default_catalog_out(args, report_out: str | None = None, output_dir: Path | None = None) -> str:
    explicit = getattr(args, 'catalog_out', None)
    if explicit:
        return explicit
    if report_out:
        report_path = resolve_project_path(report_out)
        if report_path is not None:
            name = report_path.name
            if name.endswith('-rich-report.md'):
                snapshot_name = name.replace('-rich-report.md', '-strategy-catalog.snapshot.json')
            else:
                snapshot_name = f'{report_path.stem}-strategy-catalog.snapshot.json'
            return str(report_path.with_name(snapshot_name))
    effective_dir = output_dir or resolve_project_path(getattr(args, 'output_dir', None)) or RESULTS_DIR
    return str(effective_dir / f'{utc_run_id()}-strategy-catalog.snapshot.json')


def build_step_specs(args) -> list[dict]:
    node_bin = args.node_bin
    host = getattr(args, 'host', DEFAULT_HOST)
    port = str(getattr(args, 'port', DEFAULT_PORT))

    if args.command == 'bundle':
        command = [
            node_bin,
            str(PROJECT_ROOT / 'scripts' / 'backtest' / 'run-finetune-bundle.mjs'),
            '--host',
            host,
            '--ports',
            port,
            '--phases',
            args.phases,
        ]
        if getattr(args, 'us_campaign', None):
            command.extend(['--us-campaign', args.us_campaign])
        if getattr(args, 'jp_campaign', None):
            command.extend(['--jp-campaign', args.jp_campaign])
        if args.dry_run:
            command.append('--dry-run')
        us_resume = getattr(args, 'us_resume', None)
        jp_resume = getattr(args, 'jp_resume', None)
        if us_resume:
            command.extend(['--us-resume', us_resume])
        if jp_resume:
            command.extend(['--jp-resume', jp_resume])
        return [{
            'name': 'bundle',
            'command': command,
            'checkpoint_roots': [
                CAMPAIGN_RESULTS_DIR / campaign_id
                for campaign_id in [getattr(args, 'us_campaign', None), getattr(args, 'jp_campaign', None)]
                if campaign_id
            ],
        }]

    if args.command == 'campaign':
        command = [
            node_bin,
            str(PROJECT_ROOT / 'scripts' / 'backtest' / 'run-long-campaign.mjs'),
            args.campaign_id,
            '--phase',
            args.phase,
            '--host',
            host,
            '--ports',
            port,
        ]
        if args.resume:
            command.extend(['--resume', args.resume])
        if args.dry_run:
            command.append('--dry-run')
        return [{
            'name': 'campaign',
            'command': command,
            'checkpoint_roots': [CAMPAIGN_RESULTS_DIR / args.campaign_id / args.phase],
        }]

    if args.command == 'recover':
        command = [
            node_bin,
            str(PROJECT_ROOT / 'scripts' / 'backtest' / 'recover-campaign.mjs'),
            args.campaign_id,
            '--phase',
            args.phase,
            '--host',
            host,
            '--ports',
            port,
        ]
        return [{
            'name': 'recover',
            'command': command,
            'checkpoint_roots': [CAMPAIGN_RESULTS_DIR / args.campaign_id / args.phase],
        }]

    if args.command == 'report':
        ranking = default_ranking_out(args)
        args.ranking_out = ranking
        diff = default_diff_out(args)
        args.diff_out = diff
        catalog_out = default_catalog_out(args, args.out)
        args.catalog_out = catalog_out
        command = [
            node_bin,
            str(PROJECT_ROOT / 'scripts' / 'backtest' / 'generate-rich-report.mjs'),
            '--us',
            args.us,
            '--jp',
            args.jp,
            '--out',
            args.out,
            '--date-from',
            args.date_from,
            '--date-to',
            args.date_to,
            '--ranking-out',
            ranking,
            '--diff-out',
            diff,
            '--catalog-path',
            getattr(args, 'catalog_path', None) or str(PROJECT_ROOT / 'config' / 'backtest' / 'strategy-catalog.json'),
            '--catalog-out',
            catalog_out,
        ]
        if args.title:
            command.extend(['--title', args.title])
        return [{
            'name': 'report',
            'command': command,
            'checkpoint_roots': [],
        }]

    us_path, jp_path, report_out = default_report_paths(args)
    ranking = default_ranking_out(args)
    args.ranking_out = ranking
    diff = default_diff_out(args)
    args.diff_out = diff
    catalog_out = default_catalog_out(args, report_out)
    args.catalog_out = catalog_out
    bundle_args = argparse.Namespace(
        **{**vars(args), 'command': 'bundle', 'dry_run': args.dry_run},
    )
    report_args = argparse.Namespace(
        node_bin=args.node_bin,
        host=args.host,
        port=args.port,
        command='report',
        dry_run=args.dry_run,
        us=us_path,
        jp=jp_path,
        out=report_out,
        ranking_out=ranking,
        diff_out=diff,
        catalog_path=getattr(args, 'catalog_path', None),
        catalog_out=catalog_out,
        date_from=args.date_from,
        date_to=args.date_to,
        title=args.title,
    )
    return build_step_specs(bundle_args) + build_step_specs(report_args)


def make_step_result(
    name: str,
    command: list[str],
    *,
    success: bool,
    exit_code: int = 0,
    timed_out: bool = False,
    latest_checkpoint: str | None = None,
    skipped: bool = False,
) -> dict:
    return {
        'name': name,
        'command': command,
        'success': success,
        'exit_code': exit_code,
        'timed_out': timed_out,
        'latest_checkpoint': latest_checkpoint,
        'skipped': skipped,
    }


def build_shortcut_launch_command(args) -> list[str]:
    if args['launch_command']:
        return shlex.split(args['launch_command'])
    escaped_shortcut_path = args['shortcut_path'].replace("'", "''")
    return [
        'powershell.exe',
        '-NoProfile',
        '-Command',
        f"Start-Process -FilePath '{escaped_shortcut_path}'",
    ]


def build_cli_command(node_bin: str, cli_string: str) -> list[str]:
    tokens = shlex.split(cli_string)
    if not tokens or tokens[0] != 'backtest':
        raise ValueError(
            'smoke-prod expects --smoke-cli and --production-cli to start with "backtest"'
        )
    return [node_bin, str(PROJECT_ROOT / 'src' / 'cli' / 'index.js'), *tokens]


def build_bundle_phase_step(settings: dict, phases: str, us_resume: str | None = None, jp_resume: str | None = None) -> dict:
    bundle_args = argparse.Namespace(
        command='bundle',
        node_bin=settings['node_bin'],
        host=settings['host'],
        port=settings['port'],
        phases=phases,
        us_campaign=settings['bundle_us_campaign'],
        jp_campaign=settings['bundle_jp_campaign'],
        us_resume=us_resume,
        jp_resume=jp_resume,
        dry_run=False,
    )
    return build_step_specs(bundle_args)[0]


def build_runtime_step(settings: dict, phase_name: str) -> dict:
    if settings[f'{phase_name}_mode'] == 'bundle':
        phases = settings[f'bundle_{phase_name}_phases']
        us_resume = settings.get(f'{phase_name}_us_resume') or settings.get('us_resume')
        jp_resume = settings.get(f'{phase_name}_jp_resume') or settings.get('jp_resume')
        step_spec = build_bundle_phase_step(settings, phases, us_resume=us_resume, jp_resume=jp_resume)
        return {
            'name': phase_name,
            'command': step_spec['command'],
            'checkpoint_roots': step_spec['checkpoint_roots'],
            'env_overrides': None,
        }
    return {
        'name': phase_name,
        'command': build_cli_command(settings['node_bin'], settings[f'{phase_name}_cli']),
        'checkpoint_roots': [],
        'env_overrides': {'TV_CDP_HOST': settings['host'], 'TV_CDP_PORT': str(settings['port'])},
    }


def summarize_recovery_text(text: str, limit: int = 320) -> str | None:
    collapsed = ' '.join(str(text or '').split())
    if not collapsed:
        return None
    if len(collapsed) > limit:
        return f'{collapsed[:limit - 3]}...'
    return collapsed


def summarize_captured_lines(captured_lines: list[dict], limit: int = 8) -> str:
    lines = [
        str(entry.get('line') or '').strip()
        for entry in captured_lines[-limit:]
        if str(entry.get('line') or '').strip()
    ]
    return ' | '.join(lines)


def should_attempt_recovery(message: str) -> bool:
    return bool(RECOVERABLE_RUNTIME_FAILURE.search(message or ''))


def build_step_failure_message(result: dict) -> str:
    details: list[str] = []
    if result.get('timed_out'):
        details.append('timed_out=true')
    exit_code = result.get('exit_code')
    if exit_code not in (None, 0):
        details.append(f'exit_code={exit_code}')
    captured = summarize_captured_lines(result.get('captured_lines') or [])
    if captured:
        details.append(captured)
    return ', '.join(details) if details else 'step failed without output'


def update_bundle_resume_targets(settings: dict, phase_name: str, logger: logging.Logger) -> None:
    if settings.get(f'{phase_name}_mode') != 'bundle':
        return
    phase_value = settings.get(f'bundle_{phase_name}_phases') or phase_name
    bundle_phase = phase_value.split(',')[0].strip() or phase_name
    for market_key, campaign_key in (('us', 'bundle_us_campaign'), ('jp', 'bundle_jp_campaign')):
        campaign_id = settings.get(campaign_key)
        if not campaign_id:
            continue
        checkpoint = find_latest_checkpoint([CAMPAIGN_RESULTS_DIR / campaign_id / bundle_phase])
        resume_key = f'{phase_name}_{market_key}_resume'
        settings[resume_key] = relative_path(checkpoint) if checkpoint else None
        if checkpoint:
            logger.info(
                'Recovery picked %s resume checkpoint for %s: %s',
                market_key.upper(),
                phase_name,
                settings[resume_key],
            )


def run_recovery_helper(settings: dict, logger: logging.Logger, reason: str) -> bool:
    recovery_script = settings.get('recovery_script')
    if recovery_script is None:
        logger.error('Recovery script is not configured; cannot recover %s', reason)
        return False
    command = [
        str(recovery_script),
        '--host',
        settings['host'],
        '--port',
        str(settings['port']),
        '--desktop-port',
        str(settings['startup_check_port']),
        '--max-retries',
        str(max(1, settings.get('recovery_step_retries', 1))),
        '--readiness-timeout',
        str(max(settings.get('launch_wait_sec', DEFAULT_LAUNCH_WAIT_SEC), settings.get('recovery_timeout_sec', DEFAULT_RECOVERY_TIMEOUT_SEC))),
    ]
    env = os.environ.copy()
    env.update({
        'TV_CDP_HOST': settings['host'],
        'TV_CDP_PORT': str(settings['port']),
        'TV_DESKTOP_PORT': str(settings['startup_check_port']),
    })
    logger.warning('Invoking TradingView recovery helper for %s: %s', reason, shlex.join(command))
    try:
        proc = subprocess.run(
            command,
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=max(settings.get('recovery_timeout_sec', DEFAULT_RECOVERY_TIMEOUT_SEC), settings.get('launch_wait_sec', DEFAULT_LAUNCH_WAIT_SEC)) + 30,
            env=env,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        logger.error('Recovery helper failed for %s: %s', reason, error)
        return False
    stdout_summary = summarize_recovery_text(proc.stdout)
    stderr_summary = summarize_recovery_text(proc.stderr)
    if stdout_summary:
        logger.info('Recovery helper stdout: %s', stdout_summary)
    if stderr_summary:
        logger.warning('Recovery helper stderr: %s', stderr_summary)
    if proc.returncode != 0:
        logger.error('Recovery helper exited with code %s for %s', proc.returncode, reason)
        return False
    return True


def wait_for_visible_session_with_recovery(settings: dict, logger: logging.Logger) -> dict:
    max_retries = max(0, settings.get('recovery_step_retries', 0))
    for attempt in range(max_retries + 1):
        try:
            return wait_for_visible_session(
                settings['host'],
                settings['port'],
                settings['launch_wait_sec'],
                logger,
                node_bin=settings.get('node_bin'),
            )
        except RuntimeError as error:
            message = str(error)
            if attempt >= max_retries or not should_attempt_recovery(message):
                raise
            logger.warning(
                'Preflight failed with recoverable TradingView error (%s/%s): %s',
                attempt + 1,
                max_retries,
                message,
            )
            if not run_recovery_helper(settings, logger, 'preflight'):
                raise
    raise RuntimeError('Preflight recovery exhausted unexpectedly')


def execute_step_with_recovery(
    settings: dict,
    step_name: str,
    step_builder,
    timeout_sec: int,
    logger: logging.Logger,
    *,
    progress_callback=None,
) -> dict:
    max_retries = max(0, settings.get('recovery_step_retries', 0))
    for attempt in range(max_retries + 1):
        step = step_builder()
        result = run_process(
            step['command'],
            step.get('checkpoint_roots', []),
            timeout_sec,
            False,
            logger,
            env_overrides=step.get('env_overrides'),
            progress_callback=progress_callback,
        )
        if result['success']:
            return result
        failure_message = build_step_failure_message(result)
        if attempt >= max_retries or not should_attempt_recovery(failure_message):
            return result
        logger.warning(
            '%s step failed with recoverable TradingView error (%s/%s): %s',
            step_name,
            attempt + 1,
            max_retries,
            failure_message,
        )
        if not run_recovery_helper(settings, logger, f'{step_name}-step'):
            return result
        update_bundle_resume_targets(settings, step_name, logger)
    raise RuntimeError(f'{step_name} recovery exhausted unexpectedly')


def wait_for_visible_session(
    host: str,
    port: int,
    timeout_sec: int,
    logger: logging.Logger,
    *,
    node_bin: str | None = None,
) -> dict:
    deadline = time.monotonic() + timeout_sec
    last_error: RuntimeError | None = None
    while time.monotonic() <= deadline:
        try:
            result = preflight_visible_session(host, port, logger)
            if node_bin:
                readiness_check(host, port, node_bin, logger)
            return result
        except RuntimeError as error:
            last_error = error
            time.sleep(2)
    raise RuntimeError(
        f'Preflight failed for CDP session {host}:{port} after waiting {timeout_sec}s: {last_error}'
    ) from last_error


def write_detached_state(state_path: Path, payload: dict) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(f'{json.dumps(payload, indent=2, ensure_ascii=False)}\n', encoding='utf-8')


def find_failed_step(steps: list[dict]) -> str | None:
    failed_step: str | None = None
    for step in steps:
        if not step.get('success') and not step.get('skipped', False):
            failed_step = step.get('name')
    return failed_step


def find_last_checkpoint_from_steps(steps: list[dict]) -> str | None:
    latest_checkpoint: str | None = None
    for step in steps:
        checkpoint = step.get('latest_checkpoint')
        if checkpoint:
            latest_checkpoint = checkpoint
    return latest_checkpoint


def build_termination_reason(success: bool, steps: list[dict], error: str | None = None) -> str:
    if success:
        return 'success'
    failed_step = find_failed_step(steps)
    if failed_step:
        failed_step_info = next(
            (step for step in reversed(steps) if step.get('name') == failed_step),
            None,
        )
        if failed_step_info and failed_step_info.get('timed_out'):
            return f'{failed_step}-timeout'
        if failed_step == 'active-detached-run-guard':
            return 'active-detached-run'
        if failed_step == 'live-checkout-guard':
            return 'live-checkout-blocked'
        return f'{failed_step}-failed'
    if error:
        if 'Preflight failed' in error:
            return 'preflight-failed'
        return 'config-error'
    return 'failed'


def enrich_summary(summary: dict) -> dict:
    normalized = {**summary}
    steps = normalized.get('steps', [])
    normalized['failed_step'] = find_failed_step(steps)
    normalized['last_checkpoint'] = find_last_checkpoint_from_steps(steps)
    normalized['termination_reason'] = build_termination_reason(
        bool(normalized.get('success')),
        steps,
        normalized.get('error'),
    )
    return normalized


def update_foreground_state(
    state_path: Path,
    run_id: str,
    *,
    status: str,
    current_step: str | None = None,
    latest_checkpoint: str | None = None,
    summary_path: str | None = None,
    termination_reason: str | None = None,
    failed_step: str | None = None,
    success: bool | None = None,
    started_at: str | None = None,
) -> None:
    existing = read_detached_state(state_path) or {}
    payload = {
        **existing,
        'status': status,
        'mode': 'foreground',
        'command': 'smoke-prod',
        'run_id': run_id,
        'updated_at': utc_now_iso(),
    }
    if status == 'running':
        payload.pop('finished_at', None)
        payload.pop('summary_path', None)
        payload.pop('termination_reason', None)
        payload.pop('failed_step', None)
        payload.pop('success', None)
        payload['latest_checkpoint'] = latest_checkpoint
    elif latest_checkpoint is not None or 'latest_checkpoint' not in payload:
        payload['latest_checkpoint'] = latest_checkpoint
    if started_at:
        payload['started_at'] = started_at
    if current_step is not None:
        payload['current_step'] = current_step
    if summary_path is not None:
        payload['summary_path'] = summary_path
    if termination_reason is not None:
        payload['termination_reason'] = termination_reason
    if failed_step is not None or status != 'running':
        payload['failed_step'] = failed_step
    if success is not None:
        payload['success'] = success
    if status != 'running':
        payload['finished_at'] = utc_now_iso()
    write_detached_state(state_path, payload)


def make_foreground_progress_callback(
    state_path: Path,
    run_id: str,
    started_at: str,
    step_name: str,
):
    last_write = 0.0

    def callback(latest_checkpoint: str | None, force: bool = False) -> None:
        nonlocal last_write
        now = time.monotonic()
        if not force and now - last_write < 15:
            return
        update_foreground_state(
            state_path,
            run_id,
            status='running',
            current_step=step_name,
            latest_checkpoint=latest_checkpoint,
            started_at=started_at,
        )
        last_write = now

    return callback


def build_production_child_command(settings: dict, child_run_id: str, production_step: dict, output_dir: Path = RESULTS_DIR) -> list[str]:
    cmd = [
        sys.executable,
        str(Path(__file__).resolve()),
        'production-child',
        '--host',
        settings['host'],
        '--port',
        str(settings['port']),
        '--node-bin',
        settings['node_bin'],
        '--production-command-json',
        json.dumps(production_step['command'], ensure_ascii=False),
        '--production-env-json',
        json.dumps(production_step.get('env_overrides') or {}, ensure_ascii=False),
        '--production-checkpoint-roots-json',
        json.dumps([str(path) for path in production_step.get('checkpoint_roots', [])], ensure_ascii=False),
        '--production-timeout-sec',
        str(settings['production_timeout_sec']),
        '--launch-wait-sec',
        str(settings['launch_wait_sec']),
        '--recovery-step-retries',
        str(settings['recovery_step_retries']),
        '--recovery-timeout-sec',
        str(settings['recovery_timeout_sec']),
        '--detached-state-file',
        str(settings['detached_state_file']),
        '--run-id',
        child_run_id,
        '--output-dir',
        str(output_dir),
    ]
    if settings.get('recovery_script'):
        cmd.extend(['--recovery-script', str(settings['recovery_script'])])
    if settings.get('production_mode') == 'bundle':
        if settings.get('bundle_us_campaign'):
            cmd.extend(['--bundle-us-campaign', settings['bundle_us_campaign']])
        if settings.get('bundle_jp_campaign'):
            cmd.extend(['--bundle-jp-campaign', settings['bundle_jp_campaign']])
        cmd.extend(['--bundle-production-phases', settings['bundle_production_phases']])
    return cmd


def start_detached_production(settings: dict, run_id: str, production_step: dict, logger: logging.Logger, output_dir: Path = RESULTS_DIR) -> tuple[dict, dict]:
    child_run_id = f'{run_id}_production'
    child_log_path = output_dir / f'{child_run_id}.log'
    child_summary_path = output_dir / f'{child_run_id}-summary.json'
    child_command = build_production_child_command(settings, child_run_id, production_step, output_dir=output_dir)
    child_env = os.environ.copy()
    child_env['TV_CDP_HOST'] = settings['host']
    child_env['TV_CDP_PORT'] = str(settings['port'])
    with child_log_path.open('a', encoding='utf-8') as child_log:
        process = subprocess.Popen(
            child_command,
            cwd=PROJECT_ROOT,
            stdout=child_log,
            stderr=subprocess.STDOUT,
            stdin=subprocess.DEVNULL,
            env=child_env,
            start_new_session=True,
            text=True,
        )
    time.sleep(1)
    if process.poll() is not None:
        return (
            make_step_result(
                'detach-production',
                child_command,
                success=False,
                exit_code=process.returncode or 1,
            ),
            {},
        )

    state = {
        'status': 'running',
        'parent_run_id': run_id,
        'child_run_id': child_run_id,
        'pid': process.pid,
        'log_path': relative_path(child_log_path),
        'summary_path': relative_path(child_summary_path),
        'production_command': production_step['command'],
        'started_at': datetime.now(timezone.utc).isoformat(),
    }
    write_detached_state(settings['detached_state_file'], state)
    logger.info('Detached production child started: pid=%s state=%s', process.pid, relative_path(settings['detached_state_file']))
    return make_step_result('detach-production', child_command, success=True), state


def resolve_live_checkout_protection_targets(settings: dict) -> list[dict]:
    config_path = settings.get('config_path')
    if not config_path:
        return []
    resolved_config_path = resolve_project_path(str(config_path))
    if resolved_config_path is None:
        return []
    config = read_json_file(resolved_config_path)
    bundle = read_config_section(config, 'bundle')
    us_campaign = bundle.get('us_campaign')
    jp_campaign = bundle.get('jp_campaign')

    targets = [
        {'path': canonical_repo_path(resolved_config_path), 'role': 'bundle_config'},
        {'path': canonical_repo_path(PROJECT_ROOT / 'config' / 'backtest' / 'strategy-presets.json'), 'role': 'strategy_presets'},
        {'path': canonical_repo_path(PROJECT_ROOT / 'config' / 'backtest' / 'strategy-catalog.json'), 'role': 'strategy_catalog'},
    ]
    if us_campaign:
        targets.append({
            'path': canonical_repo_path(PROJECT_ROOT / 'config' / 'backtest' / 'campaigns' / 'current' / f'{us_campaign}.json'),
            'role': 'campaign_current',
        })
    if jp_campaign:
        targets.append({
            'path': canonical_repo_path(PROJECT_ROOT / 'config' / 'backtest' / 'campaigns' / 'current' / f'{jp_campaign}.json'),
            'role': 'campaign_current',
        })
    return targets


def hash_file_sha256(path: str) -> str | None:
    try:
        resolved_path = resolve_project_path(path)
        if resolved_path is None:
            return None
        return hashlib.sha256(resolved_path.read_bytes()).hexdigest()
    except (OSError, FileNotFoundError):
        return None


def hash_live_checkout_targets(targets: list[dict]) -> list[dict]:
    result = []
    for target in targets:
        sha256 = hash_file_sha256(target['path'])
        result.append({**target, 'sha256': sha256})
    return result


def compute_aggregate_fingerprint(hashed_targets: list[dict]) -> str:
    parts = []
    for t in sorted(hashed_targets, key=lambda x: x['path']):
        parts.append(t.get('sha256') or 'missing')
    return hashlib.sha256(':'.join(parts).encode('utf-8')).hexdigest()


def load_live_checkout_baseline(baseline_path: str | None) -> dict | None:
    if not baseline_path:
        return None
    path = resolve_project_path(baseline_path)
    if path is None:
        return None
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(data, dict):
            return None
        normalized_files = []
        for entry in data.get('files', []):
            if not isinstance(entry, dict):
                continue
            normalized_path = canonical_repo_path(entry.get('path'))
            if not normalized_path:
                continue
            normalized_files.append({**entry, 'path': normalized_path})
        data['files'] = normalized_files
        return data
    except (json.JSONDecodeError, OSError):
        return None


def evaluate_live_checkout_protection(baseline: dict, current_hashes: list[dict]) -> dict:
    baseline_files = {f['path']: f for f in baseline.get('files', [])}
    blocked_files = []
    warning_files = []

    for current in current_hashes:
        path = current['path']
        role = current.get('role', '')
        baseline_entry = baseline_files.get(path)

        if not baseline_entry:
            if role == 'bundle_config':
                blocked_files.append({'path': path, 'role': role, 'reason': 'not_in_baseline'})
            else:
                warning_files.append({'path': path, 'role': role, 'reason': 'not_in_baseline'})
            continue

        if current.get('sha256') is None:
            if role == 'bundle_config':
                blocked_files.append({'path': path, 'role': role, 'reason': 'file_unreadable'})
            else:
                warning_files.append({'path': path, 'role': role, 'reason': 'file_unreadable'})
            continue

        if baseline_entry.get('sha256') != current.get('sha256'):
            if role == 'bundle_config':
                blocked_files.append({
                    'path': path,
                    'role': role,
                    'reason': 'hash_mismatch',
                    'baseline_sha256': baseline_entry.get('sha256'),
                    'current_sha256': current.get('sha256'),
                })
            else:
                warning_files.append({
                    'path': path,
                    'role': role,
                    'reason': 'hash_mismatch',
                    'baseline_sha256': baseline_entry.get('sha256'),
                    'current_sha256': current.get('sha256'),
                })

    if blocked_files:
        status = 'blocked'
    elif warning_files:
        status = 'warning'
    else:
        status = 'passed'

    return {
        'status': status,
        'baseline_path': None,
        'report_path': None,
        'aggregate_fingerprint_before': baseline.get('aggregate_fingerprint'),
        'aggregate_fingerprint_current': compute_aggregate_fingerprint(current_hashes),
        'blocked_files': blocked_files,
        'warning_files': warning_files,
    }


def write_live_checkout_protection_report(output_dir: Path, run_id: str, report: dict) -> Path:
    ensure_output_dir(output_dir)
    report_path = output_dir / f'{run_id}-live-checkout-protection.json'
    report_path.write_text(
        f'{json.dumps(report, indent=2, ensure_ascii=False)}\n', encoding='utf-8',
    )
    return report_path


def execute_smoke_prod(settings: dict, logger: logging.Logger, run_id: str, output_dir: Path = RESULTS_DIR) -> tuple[int, list[dict], dict | None]:
    steps: list[dict] = []
    startup_url = f'http://{settings["startup_check_host"]}:{settings["startup_check_port"]}/json/list'
    preflight_url = f'http://{settings["host"]}:{settings["port"]}/json/list'
    resume_smoke = settings.get('resume_smoke', False)
    resume_production = settings.get('resume_production', False)
    state_path = settings['detached_state_file']
    foreground_started_at = utc_now_iso()

    def make_progress(step_name: str):
        if settings['detach_after_smoke']:
            return None
        callback = make_foreground_progress_callback(
            state_path,
            run_id,
            foreground_started_at,
            step_name,
        )
        callback(None, True)
        return callback

    if settings['dry_run']:
        if settings['detach_after_smoke']:
            steps.append(
                make_step_result(
                    'active-detached-run-guard',
                    ['STATE', relative_path(settings['detached_state_file'])],
                    success=True,
                    skipped=True,
                )
            )
        steps.append(make_step_result('startup-check', ['GET', startup_url], success=True, skipped=True))
        steps.append(make_step_result('launch', build_shortcut_launch_command(settings), success=True, skipped=True))
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=True, skipped=True))
        smoke_step = build_runtime_step(settings, 'smoke')
        if resume_smoke:
            steps.append(make_step_result('smoke', smoke_step['command'], success=True, skipped=True))
        else:
            smoke_result = run_process(
                smoke_step['command'],
                smoke_step['checkpoint_roots'],
                settings['smoke_timeout_sec'],
                True,
                logger,
                env_overrides=smoke_step['env_overrides'],
            )
            steps.append({**smoke_result, 'name': 'smoke'})
        if settings['detach_after_smoke']:
            production_step = build_runtime_step(settings, 'production')
            if resume_production:
                steps.append(make_step_result('detach-production', build_production_child_command(settings, f'{run_id}_production', production_step, output_dir=output_dir), success=True, skipped=True))
            else:
                steps.append(make_step_result('detach-production', build_production_child_command(settings, f'{run_id}_production', production_step, output_dir=output_dir), success=True, skipped=True))
        else:
            production_step = build_runtime_step(settings, 'production')
            if resume_production:
                steps.append(make_step_result('production', production_step['command'], success=True, skipped=True))
            else:
                production_result = run_process(
                    production_step['command'],
                    production_step['checkpoint_roots'],
                    settings['production_timeout_sec'],
                    True,
                    logger,
                    env_overrides=production_step['env_overrides'],
                )
                steps.append({**production_result, 'name': 'production'})
        return 0, steps, None

    if settings['detach_after_smoke']:
        try:
            assert_no_active_detached_run(settings['detached_state_file'])
            steps.append(
                make_step_result(
                    'active-detached-run-guard',
                    ['STATE', relative_path(settings['detached_state_file'])],
                    success=True,
                )
            )
        except RuntimeError as error:
            logger.error('%s', error)
            steps.append(
                make_step_result(
                    'active-detached-run-guard',
                    ['STATE', relative_path(settings['detached_state_file'])],
                    success=False,
                    exit_code=1,
                )
            )
            return EXIT_STEP_FAILED, steps, None

    if not settings['detach_after_smoke']:
        update_foreground_state(
            state_path,
            run_id,
            status='running',
            current_step='startup-check',
            started_at=foreground_started_at,
        )

    try:
        preflight_visible_session(settings['startup_check_host'], settings['startup_check_port'], logger)
        steps.append(make_step_result('startup-check', ['GET', startup_url], success=True))
        steps.append(
            make_step_result(
                'launch',
                build_shortcut_launch_command(settings),
                success=True,
                skipped=True,
            )
        )
    except RuntimeError as startup_error:
        logger.warning('Startup check did not detect a running TradingView instance: %s', startup_error)
        steps.append(make_step_result('startup-check', ['GET', startup_url], success=False, exit_code=1))
        launch_result = run_process(
            build_shortcut_launch_command(settings),
            [],
            min(settings['timeout'], settings['launch_wait_sec']),
            False,
            logger,
            progress_callback=make_progress('launch'),
        )
        steps.append({**launch_result, 'name': 'launch'})
        if not launch_result['success']:
            return EXIT_STEP_FAILED, steps, None

    if not settings['detach_after_smoke']:
        update_foreground_state(
            state_path,
            run_id,
            status='running',
            current_step='preflight',
            started_at=foreground_started_at,
        )

    try:
        wait_for_visible_session_with_recovery(settings, logger)
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=True))
    except RuntimeError as error:
        logger.error('%s', error)
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=False, exit_code=1))
        return EXIT_PREFLIGHT_FAILED, steps, None

    smoke_step = build_runtime_step(settings, 'smoke')
    if resume_smoke:
        logger.info('Smoke already completed in this round — skipping')
        steps.append(make_step_result('smoke', smoke_step['command'], success=True, skipped=True))
    else:
        smoke_result = execute_step_with_recovery(
            settings,
            'smoke',
            lambda: build_runtime_step(settings, 'smoke'),
            settings['smoke_timeout_sec'],
            logger,
            progress_callback=make_progress('smoke'),
        )
        steps.append({**smoke_result, 'name': 'smoke'})
        if not smoke_result['success']:
            return EXIT_STEP_FAILED, steps, None

    # --- live-checkout-guard: check for mid-run protected file changes ---
    baseline_env_path = os.environ.get('NIGHT_BATCH_LIVE_CHECKOUT_BASELINE_PATH')
    baseline = load_live_checkout_baseline(baseline_env_path)
    live_checkout_protection = None
    if baseline is not None:
        targets = resolve_live_checkout_protection_targets(settings)
        current_hashes = hash_live_checkout_targets(targets)
        protection_report = evaluate_live_checkout_protection(baseline, current_hashes)
        protection_report['baseline_path'] = baseline_env_path
        report_path = write_live_checkout_protection_report(output_dir, run_id, protection_report)
        protection_report['report_path'] = relative_path(report_path)
        live_checkout_protection = protection_report

        baseline_source = Path(baseline_env_path)
        if not baseline_source.is_absolute():
            baseline_source = PROJECT_ROOT / baseline_env_path
        if baseline_source.exists():
            baseline_dest = output_dir / f'{run_id}-live-checkout-baseline.json'
            shutil.copy2(str(baseline_source), str(baseline_dest))

        if protection_report['status'] == 'blocked':
            logger.error('Live checkout guard BLOCKED: %s', json.dumps(protection_report['blocked_files'], ensure_ascii=False))
            steps.append(make_step_result(
                'live-checkout-guard',
                ['GUARD', baseline_env_path or ''],
                success=False,
                exit_code=1,
            ))
            return EXIT_STEP_FAILED, steps, live_checkout_protection

        if protection_report['status'] == 'warning':
            logger.warning('Live checkout guard WARNING: %s', json.dumps(protection_report['warning_files'], ensure_ascii=False))

        steps.append(make_step_result(
            'live-checkout-guard',
            ['GUARD', baseline_env_path or ''],
            success=True,
        ))
        logger.info('Live checkout guard passed (status=%s)', protection_report['status'])
    elif baseline_env_path is not None:
        logger.error('Live checkout guard BLOCKED: baseline not found or corrupted at %s', baseline_env_path)
        steps.append(make_step_result(
            'live-checkout-guard',
            ['GUARD', baseline_env_path],
            success=False,
            exit_code=1,
        ))
        return EXIT_STEP_FAILED, steps, None

    production_step = build_runtime_step(settings, 'production')
    if settings['detach_after_smoke']:
        if resume_production:
            logger.info('Production already completed in this round — skipping detached launch')
            steps.append(make_step_result('detach-production', build_production_child_command(settings, f'{run_id}_production', production_step, output_dir=output_dir), success=True, skipped=True))
            return 0, steps, live_checkout_protection
        detach_result, _ = start_detached_production(settings, run_id, production_step, logger, output_dir=output_dir)
        steps.append(detach_result)
        return (0 if detach_result['success'] else EXIT_STEP_FAILED), steps, live_checkout_protection

    if resume_production:
        logger.info('Production already completed in this round — skipping')
        steps.append(make_step_result('production', production_step['command'], success=True, skipped=True))
        return 0, steps, live_checkout_protection

    production_result = execute_step_with_recovery(
        settings,
        'production',
        lambda: build_runtime_step(settings, 'production'),
        settings['production_timeout_sec'],
        logger,
        progress_callback=make_progress('production'),
    )
    steps.append({**production_result, 'name': 'production'})
    return 0 if production_result['success'] else EXIT_STEP_FAILED, steps, live_checkout_protection


def execute_production_child(args, logger: logging.Logger, output_dir: Path = RESULTS_DIR) -> tuple[int, list[dict]]:
    steps: list[dict] = []
    preflight_url = f'http://{args.host}:{args.port}/json/list'
    recovery_settings = {
        'host': args.host,
        'port': args.port,
        'startup_check_port': DEFAULT_STARTUP_CHECK_PORT,
        'launch_wait_sec': args.launch_wait_sec,
        'node_bin': args.node_bin,
        'recovery_script': resolve_project_path(args.recovery_script) if getattr(args, 'recovery_script', None) else None,
        'recovery_step_retries': max(0, getattr(args, 'recovery_step_retries', DEFAULT_RECOVERY_STEP_RETRIES)),
        'recovery_timeout_sec': max(5, getattr(args, 'recovery_timeout_sec', DEFAULT_RECOVERY_TIMEOUT_SEC)),
        'production_mode': 'bundle' if getattr(args, 'bundle_us_campaign', None) or getattr(args, 'bundle_jp_campaign', None) else 'cli',
        'bundle_us_campaign': getattr(args, 'bundle_us_campaign', None),
        'bundle_jp_campaign': getattr(args, 'bundle_jp_campaign', None),
        'bundle_production_phases': getattr(args, 'bundle_production_phases', 'full'),
    }
    try:
        wait_for_visible_session_with_recovery(recovery_settings, logger)
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=True))
    except RuntimeError as error:
        logger.error('%s', error)
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=False, exit_code=1))
        write_detached_state(
            resolve_project_path(args.detached_state_file) or (PROJECT_ROOT / DEFAULT_DETACHED_STATE_FILE),
            {
                'status': 'failed',
                'child_run_id': args.run_id,
                'pid': os.getpid(),
                'error': str(error),
            },
        )
        return EXIT_PREFLIGHT_FAILED, steps

    production_command = json.loads(args.production_command_json)
    if not isinstance(production_command, list) or not all(isinstance(item, str) for item in production_command):
        raise ValueError('production-child requires --production-command-json to decode to a string array')
    production_env = json.loads(args.production_env_json)
    if not isinstance(production_env, dict):
        raise ValueError('production-child requires --production-env-json to decode to an object')
    checkpoint_roots_raw = json.loads(args.production_checkpoint_roots_json)
    if not isinstance(checkpoint_roots_raw, list) or not all(isinstance(item, str) for item in checkpoint_roots_raw):
        raise ValueError('production-child requires --production-checkpoint-roots-json to decode to a string array')

    def build_child_step() -> dict:
        if recovery_settings['production_mode'] == 'bundle':
            production_step = build_runtime_step(recovery_settings, 'production')
            return {
                'command': production_step['command'],
                'checkpoint_roots': production_step['checkpoint_roots'],
                'env_overrides': production_env,
            }
        return {
            'command': production_command,
            'checkpoint_roots': [Path(item) for item in checkpoint_roots_raw],
            'env_overrides': production_env,
        }

    if args.dry_run:
        step = build_child_step()
        production_result = run_process(
            step['command'],
            step['checkpoint_roots'],
            args.production_timeout_sec,
            True,
            logger,
            env_overrides=step['env_overrides'],
        )
    else:
        production_result = execute_step_with_recovery(
            recovery_settings,
            'production',
            build_child_step,
            args.production_timeout_sec,
            logger,
        )
    steps.append({**production_result, 'name': 'production'})
    state_path = resolve_project_path(args.detached_state_file) or (PROJECT_ROOT / DEFAULT_DETACHED_STATE_FILE)
    write_detached_state(
        state_path,
        {
            'status': 'completed' if production_result['success'] else 'failed',
            'child_run_id': args.run_id,
            'pid': os.getpid(),
            'summary_path': relative_path(output_dir / f'{args.run_id}-summary.json'),
            'success': production_result['success'],
            'finished_at': datetime.now(timezone.utc).isoformat(),
        },
    )
    return (0 if production_result['success'] else EXIT_STEP_FAILED), steps


def write_summary(run_id: str, summary: dict, logger: logging.Logger, output_dir: Path = RESULTS_DIR) -> tuple[Path, Path]:
    ensure_output_dir(output_dir)
    summary_json_path = output_dir / f'{run_id}-summary.json'
    summary_md_path = output_dir / f'{run_id}-summary.md'
    summary = enrich_summary(summary)

    summary_json_path.write_text(f'{json.dumps(summary, indent=2, ensure_ascii=False)}\n', encoding='utf-8')

    lines = [
        f'# Night batch summary {run_id}',
        '',
        f'- status: {"SUCCESS" if summary["success"] else "FAILED"}',
        f'- command: {summary["command"]}',
        f'- host: {summary["host"]}',
        f'- port: {summary["port"]}',
        f'- preflight_required: {summary["preflight_required"]}',
        f'- termination_reason: {summary["termination_reason"]}',
        f'- failed_step: {summary["failed_step"] or "—"}',
        f'- last_checkpoint: {summary["last_checkpoint"] or "—"}',
        '',
        '## Steps',
        '',
        '| step | success | skipped | exit_code | timed_out | latest_checkpoint |',
        '| --- | --- | --- | ---: | --- | --- |',
    ]

    for step in summary['steps']:
        lines.append(
            f'| {step["name"]} | {step["success"]} | {step.get("skipped", False)} | {step["exit_code"]} | {step["timed_out"]} | {step["latest_checkpoint"] or "—"} |'
        )

    lines.extend([
        '',
        '## Commands',
        '',
    ])

    for step in summary['steps']:
        lines.append(f'### {step["name"]}')
        lines.append('')
        lines.append(f'`{shlex.join(step["command"])}`')
        lines.append('')

    protection = summary.get('live_checkout_protection')
    if protection:
        lines.extend([
            '',
            '## Live checkout protection',
            '',
            f'- status: {protection["status"]}',
            f'- baseline_path: {protection.get("baseline_path") or "—"}',
            f'- report_path: {protection.get("report_path") or "—"}',
            f'- aggregate_fingerprint_before: {protection.get("aggregate_fingerprint_before") or "—"}',
            f'- aggregate_fingerprint_current: {protection.get("aggregate_fingerprint_current") or "—"}',
        ])
        if protection.get('blocked_files'):
            lines.append(f'- blocked_files: {len(protection["blocked_files"])}')
            for bf in protection['blocked_files']:
                lines.append(f'  - {bf["path"]} ({bf["role"]}): {bf["reason"]}')
        if protection.get('warning_files'):
            lines.append(f'- warning_files: {len(protection["warning_files"])}')
            for wf in protection['warning_files']:
                lines.append(f'  - {wf["path"]} ({wf["role"]}): {wf["reason"]}')

    summary_md_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    logger.info('Summary written: %s', relative_path(summary_md_path))
    return summary_json_path, summary_md_path


def resolve_existing_json_path(raw_path: str | None) -> Path | None:
    if not raw_path:
        return None
    path = Path(raw_path)
    if not path.is_absolute():
        path = PROJECT_ROOT / raw_path
    return path if path.exists() else None


def mean_or_none(values: list[float]) -> float | None:
    return (sum(values) / len(values)) if values else None


def round_metric(value: float | None, digits: int = 2) -> float | None:
    return round(value, digits) if value is not None else None


def format_metric(value: float | None, digits: int = 2) -> str:
    if value is None:
        return '—'
    return f'{value:.{digits}f}'


def format_rank_rows(rows: list[dict], limit: int = 5) -> list[str]:
    lines = [
        '| rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate |',
        '| ---: | --- | ---: | ---: | ---: | ---: |',
    ]
    for index, row in enumerate(rows[:limit], start=1):
        lines.append(
            f'| {index} | `{row["presetId"]}` | {format_metric(row.get("avg_net_profit"))} | '
            f'{format_metric(row.get("avg_profit_factor"), 3)} | {format_metric(row.get("avg_max_drawdown"))} | '
            f'{format_metric(row.get("avg_win_rate"))} |'
        )
    return lines


def format_symbol_rows(rows: list[dict]) -> list[str]:
    lines = [
        '| symbol | label | market | net_profit | profit_factor | max_drawdown | win_rate | closed_trades |',
        '| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
    ]
    if not rows:
        lines.append('| — | — | — | — | — | — | — | — |')
        return lines
    for row in rows:
        lines.append(
            f'| `{row.get("symbol") or "—"}` | {row.get("label") or row.get("symbol") or "—"} | '
            f'{row.get("market") or "—"} | {format_metric(row.get("net_profit"))} | '
            f'{format_metric(row.get("profit_factor"), 3)} | {format_metric(row.get("max_drawdown"))} | '
            f'{format_metric(row.get("percent_profitable"))} | {format_metric(row.get("closed_trades"))} |'
        )
    return lines


def summarize_recovered_results(results_path: Path) -> dict | None:
    try:
        payload = json.loads(results_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return None

    if not isinstance(payload, list):
        return None

    preset_map: dict[str, dict[str, list[float] | str]] = {}
    market = None

    for item in payload:
        if not isinstance(item, dict):
            continue
        preset_id = item.get('presetId')
        result = item.get('result')
        if not preset_id or not isinstance(result, dict):
            continue
        if not result.get('success') or not result.get('tester_available'):
            continue
        metrics = result.get('metrics')
        if not isinstance(metrics, dict):
            continue
        if market is None:
            market = item.get('market') or 'Unknown'

        record = preset_map.setdefault(preset_id, {
            'presetId': preset_id,
            'net_profit_values': [],
            'profit_factor_values': [],
            'max_drawdown_values': [],
            'win_rate_values': [],
            'closed_trades_values': [],
            'symbol_rows': [],
        })

        for key, bucket in (
            ('net_profit', 'net_profit_values'),
            ('profit_factor', 'profit_factor_values'),
            ('max_drawdown', 'max_drawdown_values'),
            ('percent_profitable', 'win_rate_values'),
            ('closed_trades', 'closed_trades_values'),
        ):
            value = metrics.get(key)
            if isinstance(value, (int, float)):
                record[bucket].append(float(value))
        symbol = item.get('symbol')
        if symbol:
            record['symbol_rows'].append({
                'symbol': symbol,
                'label': item.get('label') or symbol,
                'market': item.get('market') or market or 'Unknown',
                'net_profit': float(metrics.get('net_profit')) if isinstance(metrics.get('net_profit'), (int, float)) else None,
                'profit_factor': float(metrics.get('profit_factor')) if isinstance(metrics.get('profit_factor'), (int, float)) else None,
                'max_drawdown': float(metrics.get('max_drawdown')) if isinstance(metrics.get('max_drawdown'), (int, float)) else None,
                'percent_profitable': float(metrics.get('percent_profitable')) if isinstance(metrics.get('percent_profitable'), (int, float)) else None,
                'closed_trades': float(metrics.get('closed_trades')) if isinstance(metrics.get('closed_trades'), (int, float)) else None,
            })

    rows = []
    for record in preset_map.values():
        symbol_rows = sorted(
            record['symbol_rows'],
            key=lambda row: (
                -(row['net_profit'] if row['net_profit'] is not None else float('-inf')),
                str(row['symbol']),
            ),
        )
        rows.append({
            'presetId': record['presetId'],
            'avg_net_profit': round_metric(mean_or_none(record['net_profit_values'])),
            'avg_profit_factor': round_metric(mean_or_none(record['profit_factor_values']), 3),
            'avg_max_drawdown': round_metric(mean_or_none(record['max_drawdown_values'])),
            'avg_win_rate': round_metric(mean_or_none(record['win_rate_values'])),
            'avg_closed_trades': round_metric(mean_or_none(record['closed_trades_values'])),
            'run_count': len(record['net_profit_values']),
            'symbol_rows': symbol_rows,
        })

    rows.sort(
        key=lambda row: (
            -(row['avg_net_profit'] or float('-inf')),
            -(row['avg_profit_factor'] or float('-inf')),
            row['avg_max_drawdown'] or float('inf'),
            row['presetId'],
        )
    )
    return {
        'market': market or 'Unknown',
        'rows': rows,
        'source_path': results_path,
    }


def build_combined_market_ranking(market_summaries: list[dict]) -> list[dict]:
    combined: dict[str, dict] = {}

    for summary in market_summaries:
        rows = summary['rows']
        net_rank = {row['presetId']: index for index, row in enumerate(sorted(rows, key=lambda row: (-(row['avg_net_profit'] or float('-inf')), row['presetId'])), start=1)}
        pf_rank = {row['presetId']: index for index, row in enumerate(sorted(rows, key=lambda row: (-(row['avg_profit_factor'] or float('-inf')), row['presetId'])), start=1)}
        dd_rank = {row['presetId']: index for index, row in enumerate(sorted(rows, key=lambda row: ((row['avg_max_drawdown'] or float('inf')), row['presetId'])), start=1)}

        for row in rows:
            record = combined.setdefault(row['presetId'], {
                'presetId': row['presetId'],
                'avg_net_profit_values': [],
                'avg_profit_factor_values': [],
                'avg_max_drawdown_values': [],
                'avg_win_rate_values': [],
                'score': 0,
                'markets': [],
            })
            if row['avg_net_profit'] is not None:
                record['avg_net_profit_values'].append(row['avg_net_profit'])
            if row['avg_profit_factor'] is not None:
                record['avg_profit_factor_values'].append(row['avg_profit_factor'])
            if row['avg_max_drawdown'] is not None:
                record['avg_max_drawdown_values'].append(row['avg_max_drawdown'])
            if row['avg_win_rate'] is not None:
                record['avg_win_rate_values'].append(row['avg_win_rate'])
            record['score'] += net_rank[row['presetId']] + pf_rank[row['presetId']] + dd_rank[row['presetId']]
            record['markets'].append(summary['market'])

    ranked = []
    for record in combined.values():
        ranked.append({
            'presetId': record['presetId'],
            'composite_score': record['score'],
            'markets': ', '.join(record['markets']),
            'avg_net_profit': round_metric(mean_or_none(record['avg_net_profit_values'])),
            'avg_profit_factor': round_metric(mean_or_none(record['avg_profit_factor_values']), 3),
            'avg_max_drawdown': round_metric(mean_or_none(record['avg_max_drawdown_values'])),
            'avg_win_rate': round_metric(mean_or_none(record['avg_win_rate_values'])),
        })

    ranked.sort(
        key=lambda row: (
            row['composite_score'],
            -(row['avg_net_profit'] or float('-inf')),
            -(row['avg_profit_factor'] or float('-inf')),
            row['avg_max_drawdown'] or float('inf'),
            row['presetId'],
        )
    )
    return ranked


def build_combined_strategy_details(market_summaries: list[dict]) -> dict[str, dict]:
    combined: dict[str, dict] = {}

    for summary in market_summaries:
        for row in summary['rows']:
            record = combined.setdefault(row['presetId'], {
                'presetId': row['presetId'],
                'symbol_rows': {},
            })
            for symbol_row in row.get('symbol_rows', []):
                key = f'{symbol_row.get("market") or summary["market"]}::{symbol_row.get("symbol")}'
                record['symbol_rows'][key] = symbol_row

    for record in combined.values():
        record['symbol_rows'] = sorted(
            record['symbol_rows'].values(),
            key=lambda row: (
                -(row['net_profit'] if row['net_profit'] is not None else float('-inf')),
                str(row['symbol']),
            ),
        )
    return combined


def generate_strategy_reference_docs(
    *,
    node_bin: str,
    us_results_path: Path,
    jp_results_path: Path,
    catalog_snapshot_path: Path | None,
    logger: logging.Logger,
) -> tuple[Path | None, Path | None]:
    strategy_reference_path = resolve_strategy_reference_path()
    symbol_reference_path = resolve_symbol_reference_path()
    strategy_reference_path.parent.mkdir(parents=True, exist_ok=True)
    symbol_reference_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        node_bin,
        str(PROJECT_ROOT / 'scripts' / 'backtest' / 'generate-strategy-reference.mjs'),
        '--us',
        str(us_results_path),
        '--jp',
        str(jp_results_path),
        '--strategy-out',
        str(strategy_reference_path),
        '--symbol-out',
        str(symbol_reference_path),
    ]
    if catalog_snapshot_path and catalog_snapshot_path.exists():
        command.extend(['--catalog-path', str(catalog_snapshot_path)])

    result = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.stdout.strip():
        logger.info('[strategy-docs stdout] %s', result.stdout.strip())
    if result.stderr.strip():
        logger.info('[strategy-docs stderr] %s', result.stderr.strip())
    if result.returncode != 0:
        logger.error('Strategy reference generation failed with exit code %s', result.returncode)
        return None, None
    if not strategy_reference_path.exists() or not symbol_reference_path.exists():
        logger.error('Strategy reference generation succeeded but expected files were not written')
        return None, None
    return strategy_reference_path, symbol_reference_path


def write_latest_backtest_summary(
    *,
    run_id: str,
    summary: dict,
    logger: logging.Logger,
    us_results_path: Path | None,
    jp_results_path: Path | None,
    rich_report_path: Path | None = None,
    ranking_artifact_path: Path | None = None,
    catalog_snapshot_path: Path | None = None,
    strategy_reference_path: Path | None = None,
    symbol_reference_path: Path | None = None,
) -> None:
    if not us_results_path or not jp_results_path:
        return
    if not us_results_path.exists() or not jp_results_path.exists():
        return

    us_summary = summarize_recovered_results(us_results_path)
    jp_summary = summarize_recovered_results(jp_results_path)
    if not us_summary or not jp_summary:
        return

    latest_summary_path = resolve_latest_summary_path()
    latest_summary_path.parent.mkdir(parents=True, exist_ok=True)
    latest_ranking_artifact_path = resolve_latest_ranking_artifact_path()
    latest_ranking_artifact_path.parent.mkdir(parents=True, exist_ok=True)
    combined_rows = build_combined_market_ranking([us_summary, jp_summary])
    combined_details = build_combined_strategy_details([us_summary, jp_summary])
    latest_ranking_artifact_path.write_text(
        f'{json.dumps(combined_rows, indent=2, ensure_ascii=False)}\n',
        encoding='utf-8',
    )
    best_overall = combined_rows[0] if combined_rows else None
    best_us = us_summary['rows'][0] if us_summary['rows'] else None
    best_jp = jp_summary['rows'][0] if jp_summary['rows'] else None

    lines = [
        '# Current main backtest summary',
        '',
        'このファイルは `python/night_batch.py` が backtest 完了後に deterministic に再生成する current 要約です。',
        'ここでの current は「人間向けの現行入口」を意味し、利用可能な最新 artifact から都度再生成されます。',
        '',
        f'- run_id: `{run_id}`',
        f'- status: `{"SUCCESS" if summary["success"] else "FAILED"}`',
        f'- termination_reason: `{summary["termination_reason"]}`',
        f'- failed_step: `{summary["failed_step"] or "—"}`',
        f'- last_checkpoint: `{summary["last_checkpoint"] or "—"}`',
        f'- us_results: `{relative_path(us_results_path)}`',
        f'- jp_results: `{relative_path(jp_results_path)}`',
    ]
    if rich_report_path and rich_report_path.exists():
        lines.append(f'- rich_report: `{relative_path(rich_report_path)}`')
    lines.append(f'- ranking_artifact: `{relative_path(latest_ranking_artifact_path)}`')
    if catalog_snapshot_path and catalog_snapshot_path.exists():
        lines.append(f'- strategy_catalog_snapshot: `{relative_path(catalog_snapshot_path)}`')
    if strategy_reference_path and strategy_reference_path.exists():
        lines.append(f'- strategy_reference: `{relative_path(strategy_reference_path)}`')
    if symbol_reference_path and symbol_reference_path.exists():
        lines.append(f'- symbol_reference: `{relative_path(symbol_reference_path)}`')

    lines.extend([
        '',
        '## 結論',
        '',
        f'- **総合首位**: `{best_overall["presetId"]}` / composite_score `{best_overall["composite_score"]}` / avg_net_profit `{format_metric(best_overall["avg_net_profit"])}` / avg_profit_factor `{format_metric(best_overall["avg_profit_factor"], 3)}`' if best_overall else '- **総合首位**: `—`',
        f'- **US 本命**: `{best_us["presetId"]}` / avg_net_profit `{format_metric(best_us["avg_net_profit"])}` / avg_profit_factor `{format_metric(best_us["avg_profit_factor"], 3)}`' if best_us else '- **US 本命**: `—`',
        f'- **JP 本命**: `{best_jp["presetId"]}` / avg_net_profit `{format_metric(best_jp["avg_net_profit"])}` / avg_profit_factor `{format_metric(best_jp["avg_profit_factor"], 3)}`' if best_jp else '- **JP 本命**: `—`',
        '- **見方**: まず全戦略スコア一覧で composite score を見て、そのあと Top 5 戦略の銘柄別成績表で偏りを確認する。',
        '',
        '## 全戦略スコア一覧',
        '',
        '合成順位は **avg_net_profit 降順 / avg_profit_factor 降順 / avg_max_drawdown 昇順** の市場別順位を合算した deterministic score です。',
        '',
        '| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |',
        '| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |',
    ])

    for index, row in enumerate(combined_rows, start=1):
        lines.append(
            f'| {index} | `{row["presetId"]}` | {row["composite_score"]} | {format_metric(row["avg_net_profit"])} | '
            f'{format_metric(row["avg_profit_factor"], 3)} | {format_metric(row["avg_max_drawdown"])} | '
            f'{format_metric(row["avg_win_rate"])} | {row["markets"]} |'
        )

    lines.extend([
        '',
        '## Top 5 戦略の銘柄別成績',
        '',
    ])
    for row in combined_rows[:5]:
        lines.extend([
            f'### `{row["presetId"]}`',
            '',
            f'- composite_score: {row["composite_score"]}',
            f'- markets: {row["markets"]}',
            f'- avg_net_profit: {format_metric(row["avg_net_profit"])} / avg_profit_factor: {format_metric(row["avg_profit_factor"], 3)} / avg_max_drawdown: {format_metric(row["avg_max_drawdown"])}',
            '',
            *format_symbol_rows(combined_details.get(row['presetId'], {}).get('symbol_rows', [])),
            '',
        ])

    for market_summary in (us_summary, jp_summary):
        lines.extend([
            '',
            f'## {market_summary["market"]} top 5 by avg_net_profit',
            '',
            *format_rank_rows(market_summary['rows'], limit=5),
        ])

    catalog_path = (
        catalog_snapshot_path
        if catalog_snapshot_path and catalog_snapshot_path.exists()
        else PROJECT_ROOT / 'config' / 'backtest' / 'strategy-catalog.json'
    )
    try:
        catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
        strategies = catalog.get('strategies', [])
        live_count = sum(1 for s in strategies if s.get('lifecycle', {}).get('status') == 'live')
        retired_count = sum(1 for s in strategies if s.get('lifecycle', {}).get('status') == 'retired')
        lines.extend([
            '',
            '## Live / Retired diff',
            '',
            f'- live_count: {live_count}',
            f'- retired_count: {retired_count}',
            '',
        ])
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    top_five_ids = ', '.join(f'`{row["presetId"]}`' for row in combined_rows[:5]) or '—'
    lines.extend([
        '## 改善点と次回バックテスト確認事項',
        '',
        f'1. **Top 5 の確認**: {top_five_ids} の銘柄別表を見て、特定銘柄への依存が強すぎないか再確認する。',
        f'2. **US 側の掘り下げ**: `{best_us["presetId"]}` が勝っている要因が entry timing か stop 幅かを切り分ける。' if best_us else '2. **US 側の掘り下げ**: 最新 artifact が不足しているため、追加確認が必要。',
        f'3. **JP 側の掘り下げ**: `{best_jp["presetId"]}` が勝っている要因が exit の締め方か regime 閾値かを追加確認する。' if best_jp else '3. **JP 側の掘り下げ**: 最新 artifact が不足しているため、追加確認が必要。',
        '4. **次回テンプレ運用**: 次回 backtest でもこの summary を上書きし、全戦略スコア一覧と Top 5 戦略の銘柄別成績表を定点比較する。',
        '',
    ])

    latest_summary_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    logger.info('Current backtest summary written: %s', relative_path(latest_summary_path))


def maybe_write_latest_backtest_summary_from_args(
    run_id: str,
    summary: dict,
    args,
    logger: logging.Logger,
) -> None:
    if not summary.get('success'):
        return
    us_path: Path | None = None
    jp_path: Path | None = None
    rich_report_path: Path | None = None
    ranking_artifact_path: Path | None = None
    catalog_snapshot_path: Path | None = None
    strategy_reference_path: Path | None = None
    symbol_reference_path: Path | None = None

    if args.command == 'report':
        us_path = resolve_existing_json_path(getattr(args, 'us', None))
        jp_path = resolve_existing_json_path(getattr(args, 'jp', None))
        rich_report_path = resolve_existing_json_path(getattr(args, 'out', None))
        ranking_artifact_path = resolve_existing_json_path(getattr(args, 'ranking_out', None))
        catalog_snapshot_path = resolve_existing_json_path(getattr(args, 'catalog_out', None))
    elif args.command in {'bundle', 'nightly'}:
        us_raw, jp_raw, report_raw = default_report_paths(args)
        us_path = resolve_existing_json_path(us_raw)
        jp_path = resolve_existing_json_path(jp_raw)
        rich_report_path = resolve_existing_json_path(report_raw)
        ranking_artifact_path = resolve_existing_json_path(getattr(args, 'ranking_out', None))
        catalog_snapshot_path = resolve_existing_json_path(getattr(args, 'catalog_out', None))

    if us_path and jp_path and us_path.exists() and jp_path.exists():
        strategy_reference_path, symbol_reference_path = generate_strategy_reference_docs(
            node_bin=getattr(args, 'node_bin', None)
            or os.environ.get('NIGHT_BATCH_STRATEGY_NODE_BIN')
            or os.environ.get('NODE_BIN')
            or 'node',
            us_results_path=us_path,
            jp_results_path=jp_path,
            catalog_snapshot_path=catalog_snapshot_path,
            logger=logger,
        )

    write_latest_backtest_summary(
        run_id=run_id,
        summary=summary,
        logger=logger,
        us_results_path=us_path,
        jp_results_path=jp_path,
        rich_report_path=rich_report_path,
        ranking_artifact_path=ranking_artifact_path,
        catalog_snapshot_path=catalog_snapshot_path,
        strategy_reference_path=strategy_reference_path,
        symbol_reference_path=symbol_reference_path,
    )


def maybe_write_latest_backtest_summary_from_settings(
    run_id: str,
    summary: dict,
    settings: dict,
    logger: logging.Logger,
) -> None:
    if not summary.get('success'):
        return
    if settings.get('detach_after_smoke'):
        return
    if settings.get('production_mode') != 'bundle':
        return

    phase = (settings.get('bundle_production_phases') or 'full').split(',')[0].strip() or 'full'
    us_path = CAMPAIGN_RESULTS_DIR / settings['bundle_us_campaign'] / phase / 'recovered-results.json' if settings.get('bundle_us_campaign') else None
    jp_path = CAMPAIGN_RESULTS_DIR / settings['bundle_jp_campaign'] / phase / 'recovered-results.json' if settings.get('bundle_jp_campaign') else None
    write_latest_backtest_summary(
        run_id=run_id,
        summary=summary,
        logger=logger,
        us_results_path=us_path,
        jp_results_path=jp_path,
    )


def maybe_write_latest_backtest_summary_from_child_args(
    run_id: str,
    summary: dict,
    args,
    logger: logging.Logger,
) -> None:
    if not summary.get('success'):
        return
    if not getattr(args, 'bundle_us_campaign', None) or not getattr(args, 'bundle_jp_campaign', None):
        return

    phase = (getattr(args, 'bundle_production_phases', 'full') or 'full').split(',')[0].strip() or 'full'
    us_path = CAMPAIGN_RESULTS_DIR / args.bundle_us_campaign / phase / 'recovered-results.json'
    jp_path = CAMPAIGN_RESULTS_DIR / args.bundle_jp_campaign / phase / 'recovered-results.json'
    write_latest_backtest_summary(
        run_id=run_id,
        summary=summary,
        logger=logger,
        us_results_path=us_path,
        jp_results_path=jp_path,
    )


def main() -> int:
    parser = build_parser()
    raw_args = sys.argv[1:]
    args = parser.parse_args(raw_args)
    run_id = getattr(args, 'run_id', None) or utc_run_id()

    if args.command == 'archive-rounds':
        logger = configure_console_logger('night_batch.archive')
        try:
            archived = archive_completed_rounds(RESULTS_DIR, logger=logger, dry_run=args.dry_run)
        except (RuntimeError, OSError) as error:
            logger.error('%s', error)
            return EXIT_STEP_FAILED
        if not archived:
            logger.info('No completed rounds to archive.')
        return 0

    round_mode = getattr(args, 'round_mode', None)
    output_dir = Path(getattr(args, 'output_dir', str(RESULTS_DIR))) if args.command == 'production-child' else RESULTS_DIR
    round_number = None
    round_fingerprint = None
    smoke_settings = None
    manifest_written = False
    if round_mode:
        try:
            if args.command == 'smoke-prod':
                smoke_settings = load_smoke_prod_settings(args, raw_args)
                round_fingerprint = build_smoke_prod_fingerprint(smoke_settings)
            elif args.command != 'report':
                round_fingerprint = build_args_fingerprint(args)

            output_dir, round_number = resolve_round_dir(round_mode)
            if round_mode == 'resume-current-round' and round_fingerprint:
                ensure_round_manifest_matches(output_dir, round_fingerprint)
        except (RuntimeError, ValueError, OSError) as error:
            logger_fallback, _ = configure_logger(run_id)
            logger_fallback.error('%s', error)
            summary = {
                'success': False,
                'command': args.command,
                'host': getattr(args, 'host', DEFAULT_HOST),
                'port': getattr(args, 'port', DEFAULT_PORT),
                'preflight_required': False,
                'error': str(error),
                'steps': [],
            }
            write_summary(run_id, summary, logger_fallback)
            return EXIT_STEP_FAILED

    logger, log_path = configure_logger(run_id, output_dir=output_dir)
    logger.info('Starting %s run (log: %s)', args.command, relative_path(log_path))
    setattr(args, 'output_dir', str(output_dir))

    if round_number is not None:
        logger.info('Round %d (%s) -> %s', round_number, round_mode, relative_path(output_dir))
        write_round_manifest(
            output_dir,
            round_number,
            run_id,
            round_mode,
            args.command,
            fingerprint=round_fingerprint,
        )
        manifest_written = True

    if args.command == 'smoke-prod':
        try:
            settings = smoke_settings or load_smoke_prod_settings(args, raw_args)
            settings['detached_state_file'] = resolve_round_scoped_path(
                output_dir,
                settings['detached_state_file'],
                Path(DEFAULT_DETACHED_STATE_FILE).name,
            )

            if round_mode == 'resume-current-round' and find_completed_step_in_round(output_dir, 'smoke'):
                settings['resume_smoke'] = True
            if round_mode == 'resume-current-round' and find_completed_step_in_round(output_dir, 'production'):
                settings['resume_production'] = True
            if round_mode == 'resume-current-round' and settings.get('smoke_mode') == 'bundle':
                smoke_phase = settings['bundle_smoke_phases'].split(',')[0].strip()
                if not settings.get('smoke_us_resume'):
                    cp = find_latest_checkpoint([
                        CAMPAIGN_RESULTS_DIR / settings['bundle_us_campaign'] / smoke_phase,
                    ])
                    if cp:
                        settings['smoke_us_resume'] = str(cp)
                if not settings.get('smoke_jp_resume') and settings.get('bundle_jp_campaign'):
                    cp = find_latest_checkpoint([
                        CAMPAIGN_RESULTS_DIR / settings['bundle_jp_campaign'] / smoke_phase,
                    ])
                    if cp:
                        settings['smoke_jp_resume'] = str(cp)
            if round_mode == 'resume-current-round' and settings.get('production_mode') == 'bundle':
                production_phase = settings['bundle_production_phases'].split(',')[0].strip()
                if not settings.get('production_us_resume'):
                    cp = find_latest_checkpoint([
                        CAMPAIGN_RESULTS_DIR / settings['bundle_us_campaign'] / production_phase,
                    ])
                    if cp:
                        settings['production_us_resume'] = str(cp)
                if not settings.get('production_jp_resume') and settings.get('bundle_jp_campaign'):
                    cp = find_latest_checkpoint([
                        CAMPAIGN_RESULTS_DIR / settings['bundle_jp_campaign'] / production_phase,
                    ])
                    if cp:
                        settings['production_jp_resume'] = str(cp)
            exit_code, steps, live_checkout_protection = execute_smoke_prod(settings, logger, run_id, output_dir=output_dir)
        except ValueError as error:
            logger.error('%s', error)
            summary = {
                'success': False,
                'command': args.command,
                'host': getattr(args, 'host', DEFAULT_HOST),
                'port': getattr(args, 'port', DEFAULT_PORT),
                'preflight_required': True,
                'error': str(error),
                'steps': [],
            }
            write_summary(run_id, summary, logger, output_dir=output_dir)
            return EXIT_STEP_FAILED

        summary = {
            'success': exit_code == 0,
            'command': args.command,
            'host': settings['host'],
            'port': settings['port'],
            'preflight_required': True,
            'steps': steps,
        }
        if round_number is not None:
            summary['round'] = round_number
            summary['round_mode'] = round_mode
        if live_checkout_protection is not None:
            summary['live_checkout_protection'] = live_checkout_protection
        summary = enrich_summary(summary)
        write_summary(run_id, summary, logger, output_dir=output_dir)
        maybe_write_latest_backtest_summary_from_settings(run_id, summary, settings, logger)
        if not settings['detach_after_smoke']:
            update_foreground_state(
                settings['detached_state_file'],
                run_id,
                status='completed' if summary['success'] else 'failed',
                current_step=summary['failed_step'] or 'production',
                latest_checkpoint=summary['last_checkpoint'],
                summary_path=relative_path(output_dir / f'{run_id}-summary.json'),
                termination_reason=summary['termination_reason'],
                failed_step=summary['failed_step'],
                success=summary['success'],
            )
        return exit_code

    if args.command == 'production-child':
        child_output_dir = Path(getattr(args, 'output_dir', str(RESULTS_DIR)))
        exit_code, steps = execute_production_child(args, logger, output_dir=child_output_dir)
        summary = {
            'success': exit_code == 0,
            'command': args.command,
            'host': args.host,
            'port': args.port,
            'preflight_required': True,
            'steps': steps,
        }
        summary = enrich_summary(summary)
        write_summary(run_id, summary, logger, output_dir=child_output_dir)
        maybe_write_latest_backtest_summary_from_child_args(run_id, summary, args, logger)
        return exit_code

    preflight_required = requires_cdp_preflight(args.command)
    if preflight_required:
        try:
            preflight_visible_session(args.host, args.port, logger)
        except RuntimeError as error:
            logger.error('%s', error)
            summary = {
                'success': False,
                'command': args.command,
                'host': args.host,
                'port': args.port,
                'preflight_required': True,
                'error': str(error),
                'steps': [],
            }
            write_summary(run_id, summary, logger, output_dir=output_dir)
            return EXIT_PREFLIGHT_FAILED

    steps = []
    overall_success = True
    for step_spec in build_step_specs(args):
        logger.info('Running step: %s', step_spec['name'])
        result = run_process(
            step_spec['command'],
            step_spec['checkpoint_roots'],
            args.timeout,
            args.dry_run,
            logger,
        )
        steps.append({
            'name': step_spec['name'],
            'command': step_spec['command'],
            'success': result['success'],
            'exit_code': result['exit_code'],
            'timed_out': result['timed_out'],
            'latest_checkpoint': result['latest_checkpoint'],
        })
        if not result['success']:
            overall_success = False
            break

    summary = {
        'success': overall_success,
        'command': args.command,
        'host': args.host,
        'port': args.port,
        'preflight_required': preflight_required,
        'steps': steps,
    }
    if round_number is not None:
        summary['round'] = round_number
        summary['round_mode'] = round_mode
    write_summary(run_id, summary, logger, output_dir=output_dir)
    maybe_write_latest_backtest_summary_from_args(run_id, enrich_summary(summary), args, logger)
    return 0 if overall_success else EXIT_STEP_FAILED


if __name__ == '__main__':
    sys.exit(main())
