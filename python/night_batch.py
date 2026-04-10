#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shlex
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def resolve_results_dir() -> Path:
    raw = os.environ.get('NIGHT_BATCH_RESULTS_DIR')
    if not raw:
        return PROJECT_ROOT / 'results' / 'night-batch'
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
DEFAULT_US_CAMPAIGN = 'next-long-run-us-finetune-100x10'
DEFAULT_JP_CAMPAIGN = 'next-long-run-jp-finetune-100x10'
DEFAULT_SMOKE_CLI = 'backtest preset ema-cross-9-21 --symbol NVDA --date-from 2024-01-01 --date-to 2024-12-31'
DEFAULT_PRODUCTION_CLI = 'backtest preset ema-cross-9-21 --symbol NVDA --date-from 2000-01-01 --date-to 2099-12-31'
DEFAULT_DETACHED_STATE_FILE = 'results/night-batch/detached-production-state.json'
EXIT_PREFLIGHT_FAILED = 1
EXIT_STEP_FAILED = 2
ROUND_MANIFEST_FILE = 'round-manifest.json'


def utc_run_id() -> str:
    return datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')


def ensure_results_dir() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def ensure_output_dir(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)


def find_existing_rounds() -> list[int]:
    if not RESULTS_DIR.exists():
        return []
    rounds = []
    for entry in RESULTS_DIR.iterdir():
        if entry.is_dir() and entry.name.startswith('round'):
            try:
                rounds.append(int(entry.name[5:]))
            except ValueError:
                pass
    return sorted(rounds)


def resolve_round_dir(mode: str) -> tuple[Path, int]:
    rounds = find_existing_rounds()
    if mode == 'advance-next-round':
        next_num = (max(rounds) + 1) if rounds else 1
        round_dir = RESULTS_DIR / f'round{next_num}'
        round_dir.mkdir(parents=True, exist_ok=True)
        return round_dir, next_num
    if mode == 'resume-current-round':
        if not rounds:
            raise RuntimeError(
                'No existing round found under results/night-batch/. '
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
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
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


def relative_path(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


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
    bundle_us_campaign = bundle.get('us_campaign')
    bundle_jp_campaign = bundle.get('jp_campaign')
    bundle_smoke_phases = bundle.get('smoke_phases') or 'smoke'
    bundle_production_phases = bundle.get('production_phases') or 'full'
    smoke_mode = 'cli'
    production_mode = 'cli'
    if bundle_us_campaign and bundle_jp_campaign and not smoke.get('cli') and not option_was_provided(raw_args, '--smoke-cli'):
        smoke_mode = 'bundle'
    if bundle_us_campaign and bundle_jp_campaign and not production.get('cli') and not option_was_provided(raw_args, '--production-cli'):
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
) -> dict:
    if dry_run:
        logger.info('[dry-run] %s', shlex.join(command))
        return {
            'success': True,
            'exit_code': 0,
            'timed_out': False,
            'latest_checkpoint': relative_path(find_latest_checkpoint(checkpoint_roots)) if checkpoint_roots else None,
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

        time.sleep(2)

    process.wait()
    stdout_thread.join(timeout=1)
    stderr_thread.join(timeout=1)

    latest_checkpoint = find_latest_checkpoint(checkpoint_roots)
    return {
        'success': process.returncode == 0 and not timed_out,
        'exit_code': process.returncode,
        'timed_out': timed_out,
        'latest_checkpoint': relative_path(latest_checkpoint) if latest_checkpoint else None,
        'captured_lines': captured_lines,
        'command': command,
        'skipped': False,
    }


def default_report_paths(args) -> tuple[str, str, str]:
    us_path = args.report_us or f'results/campaigns/{args.us_campaign}/full/recovered-results.json'
    jp_path = args.report_jp or f'results/campaigns/{args.jp_campaign}/full/recovered-results.json'
    output_dir = resolve_project_path(getattr(args, 'output_dir', None)) or RESULTS_DIR
    report_out = args.report_out or str(output_dir / f'{utc_run_id()}-rich-report.md')
    return us_path, jp_path, report_out


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
            '--us-campaign',
            args.us_campaign,
            '--jp-campaign',
            args.jp_campaign,
        ]
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
                PROJECT_ROOT / 'results' / 'campaigns' / args.us_campaign,
                PROJECT_ROOT / 'results' / 'campaigns' / args.jp_campaign,
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
            'checkpoint_roots': [PROJECT_ROOT / 'results' / 'campaigns' / args.campaign_id / args.phase],
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
            'checkpoint_roots': [PROJECT_ROOT / 'results' / 'campaigns' / args.campaign_id / args.phase],
        }]

    if args.command == 'report':
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
        ]
        if args.ranking_out:
            command.extend(['--ranking-out', args.ranking_out])
        if args.title:
            command.extend(['--title', args.title])
        return [{
            'name': 'report',
            'command': command,
            'checkpoint_roots': [],
        }]

    us_path, jp_path, report_out = default_report_paths(args)
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
        ranking_out=args.ranking_out,
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


def wait_for_visible_session(host: str, port: int, timeout_sec: int, logger: logging.Logger) -> dict:
    deadline = time.monotonic() + timeout_sec
    last_error: RuntimeError | None = None
    while time.monotonic() <= deadline:
        try:
            return preflight_visible_session(host, port, logger)
        except RuntimeError as error:
            last_error = error
            time.sleep(2)
    raise RuntimeError(
        f'Preflight failed for CDP session {host}:{port} after waiting {timeout_sec}s: {last_error}'
    ) from last_error


def write_detached_state(state_path: Path, payload: dict) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(f'{json.dumps(payload, indent=2, ensure_ascii=False)}\n', encoding='utf-8')


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
        '--detached-state-file',
        str(settings['detached_state_file']),
        '--run-id',
        child_run_id,
        '--output-dir',
        str(output_dir),
    ]
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


def execute_smoke_prod(settings: dict, logger: logging.Logger, run_id: str, output_dir: Path = RESULTS_DIR) -> tuple[int, list[dict]]:
    steps: list[dict] = []
    startup_url = f'http://{settings["startup_check_host"]}:{settings["startup_check_port"]}/json/list'
    preflight_url = f'http://{settings["host"]}:{settings["port"]}/json/list'
    resume_smoke = settings.get('resume_smoke', False)
    resume_production = settings.get('resume_production', False)

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
        return 0, steps

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
            return EXIT_STEP_FAILED, steps

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
        )
        steps.append({**launch_result, 'name': 'launch'})
        if not launch_result['success']:
            return EXIT_STEP_FAILED, steps

    try:
        wait_for_visible_session(settings['host'], settings['port'], settings['launch_wait_sec'], logger)
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=True))
    except RuntimeError as error:
        logger.error('%s', error)
        steps.append(make_step_result('preflight', ['GET', preflight_url], success=False, exit_code=1))
        return EXIT_PREFLIGHT_FAILED, steps

    smoke_step = build_runtime_step(settings, 'smoke')
    if resume_smoke:
        logger.info('Smoke already completed in this round — skipping')
        steps.append(make_step_result('smoke', smoke_step['command'], success=True, skipped=True))
    else:
        smoke_result = run_process(
            smoke_step['command'],
            smoke_step['checkpoint_roots'],
            settings['smoke_timeout_sec'],
            False,
            logger,
            env_overrides=smoke_step['env_overrides'],
        )
        steps.append({**smoke_result, 'name': 'smoke'})
        if not smoke_result['success']:
            return EXIT_STEP_FAILED, steps

    production_step = build_runtime_step(settings, 'production')
    if settings['detach_after_smoke']:
        if resume_production:
            logger.info('Production already completed in this round — skipping detached launch')
            steps.append(make_step_result('detach-production', build_production_child_command(settings, f'{run_id}_production', production_step, output_dir=output_dir), success=True, skipped=True))
            return 0, steps
        detach_result, _ = start_detached_production(settings, run_id, production_step, logger, output_dir=output_dir)
        steps.append(detach_result)
        return (0 if detach_result['success'] else EXIT_STEP_FAILED), steps

    if resume_production:
        logger.info('Production already completed in this round — skipping')
        steps.append(make_step_result('production', production_step['command'], success=True, skipped=True))
        return 0, steps

    production_result = run_process(
        production_step['command'],
        production_step['checkpoint_roots'],
        settings['production_timeout_sec'],
        False,
        logger,
        env_overrides=production_step['env_overrides'],
    )
    steps.append({**production_result, 'name': 'production'})
    return 0 if production_result['success'] else EXIT_STEP_FAILED, steps


def execute_production_child(args, logger: logging.Logger, output_dir: Path = RESULTS_DIR) -> tuple[int, list[dict]]:
    steps: list[dict] = []
    preflight_url = f'http://{args.host}:{args.port}/json/list'
    try:
        wait_for_visible_session(args.host, args.port, args.launch_wait_sec, logger)
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
    production_result = run_process(
        production_command,
        [Path(item) for item in checkpoint_roots_raw],
        args.production_timeout_sec,
        args.dry_run,
        logger,
        env_overrides=production_env,
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

    summary_json_path.write_text(f'{json.dumps(summary, indent=2, ensure_ascii=False)}\n', encoding='utf-8')

    lines = [
        f'# Night batch summary {run_id}',
        '',
        f'- status: {"SUCCESS" if summary["success"] else "FAILED"}',
        f'- command: {summary["command"]}',
        f'- host: {summary["host"]}',
        f'- port: {summary["port"]}',
        f'- preflight_required: {summary["preflight_required"]}',
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

    summary_md_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    logger.info('Summary written: %s', relative_path(summary_md_path))
    return summary_json_path, summary_md_path


def main() -> int:
    parser = build_parser()
    raw_args = sys.argv[1:]
    args = parser.parse_args(raw_args)
    run_id = args.run_id or utc_run_id()

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
        except (RuntimeError, ValueError) as error:
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
                        PROJECT_ROOT / 'results' / 'campaigns' / settings['bundle_us_campaign'] / smoke_phase,
                    ])
                    if cp:
                        settings['smoke_us_resume'] = str(cp)
                if not settings.get('smoke_jp_resume'):
                    cp = find_latest_checkpoint([
                        PROJECT_ROOT / 'results' / 'campaigns' / settings['bundle_jp_campaign'] / smoke_phase,
                    ])
                    if cp:
                        settings['smoke_jp_resume'] = str(cp)
            if round_mode == 'resume-current-round' and settings.get('production_mode') == 'bundle':
                production_phase = settings['bundle_production_phases'].split(',')[0].strip()
                if not settings.get('production_us_resume'):
                    cp = find_latest_checkpoint([
                        PROJECT_ROOT / 'results' / 'campaigns' / settings['bundle_us_campaign'] / production_phase,
                    ])
                    if cp:
                        settings['production_us_resume'] = str(cp)
                if not settings.get('production_jp_resume'):
                    cp = find_latest_checkpoint([
                        PROJECT_ROOT / 'results' / 'campaigns' / settings['bundle_jp_campaign'] / production_phase,
                    ])
                    if cp:
                        settings['production_jp_resume'] = str(cp)
            exit_code, steps = execute_smoke_prod(settings, logger, run_id, output_dir=output_dir)
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
        write_summary(run_id, summary, logger, output_dir=output_dir)
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
        write_summary(run_id, summary, logger, output_dir=child_output_dir)
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
    return 0 if overall_success else EXIT_STEP_FAILED


if __name__ == '__main__':
    sys.exit(main())
