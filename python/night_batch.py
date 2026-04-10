#!/usr/bin/env python3

from __future__ import annotations

import argparse
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
RESULTS_DIR = PROJECT_ROOT / 'results' / 'night-batch'
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


def utc_run_id() -> str:
    return datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')


def ensure_results_dir() -> None:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


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


def configure_logger(run_id: str) -> tuple[logging.Logger, Path]:
    ensure_results_dir()
    log_path = RESULTS_DIR / f'{run_id}.log'
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

    parser = argparse.ArgumentParser(
        description='WSL-first orchestrator for TradingView backtest night runs.',
    )
    subparsers = parser.add_subparsers(dest='command', required=True)

    bundle = subparsers.add_parser('bundle', help='Run the existing finetune bundle via Node', parents=[common])
    bundle.add_argument('--phases', default=DEFAULT_PHASES)
    bundle.add_argument('--us-campaign', default=DEFAULT_US_CAMPAIGN)
    bundle.add_argument('--jp-campaign', default=DEFAULT_JP_CAMPAIGN)

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

    production_child = subparsers.add_parser(
        'production-child',
        help=argparse.SUPPRESS,
        parents=[common],
    )
    production_child.add_argument('--production-cli', default=DEFAULT_PRODUCTION_CLI)
    production_child.add_argument('--production-timeout-sec', type=int, default=0)
    production_child.add_argument('--launch-wait-sec', type=int, default=DEFAULT_LAUNCH_WAIT_SEC)
    production_child.add_argument('--detached-state-file', default=DEFAULT_DETACHED_STATE_FILE)

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
    config_path = resolve_project_path(getattr(args, 'config', None))
    if config_path:
        config = read_json_file(config_path)

    runtime = read_config_section(config, 'runtime')
    launch = read_config_section(config, 'launch')
    strategies = read_config_section(config, 'strategies')
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
    report_out = args.report_out or f'results/night-batch/{utc_run_id()}-rich-report.md'
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


def build_production_child_command(settings: dict, child_run_id: str) -> list[str]:
    return [
        sys.executable,
        str(Path(__file__).resolve()),
        'production-child',
        '--host',
        settings['host'],
        '--port',
        str(settings['port']),
        '--node-bin',
        settings['node_bin'],
        '--production-cli',
        settings['production_cli'],
        '--production-timeout-sec',
        str(settings['production_timeout_sec']),
        '--launch-wait-sec',
        str(settings['launch_wait_sec']),
        '--detached-state-file',
        str(settings['detached_state_file']),
        '--run-id',
        child_run_id,
    ]


def start_detached_production(settings: dict, run_id: str, logger: logging.Logger) -> tuple[dict, dict]:
    child_run_id = f'{run_id}_production'
    child_log_path = RESULTS_DIR / f'{child_run_id}.log'
    child_summary_path = RESULTS_DIR / f'{child_run_id}-summary.json'
    child_command = build_production_child_command(settings, child_run_id)
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
        'production_command': child_command,
        'started_at': datetime.now(timezone.utc).isoformat(),
    }
    write_detached_state(settings['detached_state_file'], state)
    logger.info('Detached production child started: pid=%s state=%s', process.pid, relative_path(settings['detached_state_file']))
    return make_step_result('detach-production', child_command, success=True), state


def execute_smoke_prod(settings: dict, logger: logging.Logger, run_id: str) -> tuple[int, list[dict]]:
    steps: list[dict] = []
    startup_url = f'http://{settings["startup_check_host"]}:{settings["startup_check_port"]}/json/list'
    preflight_url = f'http://{settings["host"]}:{settings["port"]}/json/list'

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
        smoke_result = run_process(
            build_cli_command(settings['node_bin'], settings['smoke_cli']),
            [],
            settings['smoke_timeout_sec'],
            True,
            logger,
            env_overrides={'TV_CDP_HOST': settings['host'], 'TV_CDP_PORT': str(settings['port'])},
        )
        steps.append({**smoke_result, 'name': 'smoke'})
        if settings['detach_after_smoke']:
            steps.append(make_step_result('detach-production', build_production_child_command(settings, f'{run_id}_production'), success=True, skipped=True))
        else:
            production_result = run_process(
                build_cli_command(settings['node_bin'], settings['production_cli']),
                [],
                settings['production_timeout_sec'],
                True,
                logger,
                env_overrides={'TV_CDP_HOST': settings['host'], 'TV_CDP_PORT': str(settings['port'])},
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

    env_overrides = {'TV_CDP_HOST': settings['host'], 'TV_CDP_PORT': str(settings['port'])}
    smoke_result = run_process(
        build_cli_command(settings['node_bin'], settings['smoke_cli']),
        [],
        settings['smoke_timeout_sec'],
        False,
        logger,
        env_overrides=env_overrides,
    )
    steps.append({**smoke_result, 'name': 'smoke'})
    if not smoke_result['success']:
        return EXIT_STEP_FAILED, steps

    if settings['detach_after_smoke']:
        detach_result, _ = start_detached_production(settings, run_id, logger)
        steps.append(detach_result)
        return (0 if detach_result['success'] else EXIT_STEP_FAILED), steps

    production_result = run_process(
        build_cli_command(settings['node_bin'], settings['production_cli']),
        [],
        settings['production_timeout_sec'],
        False,
        logger,
        env_overrides=env_overrides,
    )
    steps.append({**production_result, 'name': 'production'})
    return 0 if production_result['success'] else EXIT_STEP_FAILED, steps


def execute_production_child(args, logger: logging.Logger) -> tuple[int, list[dict]]:
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

    env_overrides = {'TV_CDP_HOST': args.host, 'TV_CDP_PORT': str(args.port)}
    production_result = run_process(
        build_cli_command(args.node_bin, args.production_cli),
        [],
        args.production_timeout_sec,
        args.dry_run,
        logger,
        env_overrides=env_overrides,
    )
    steps.append({**production_result, 'name': 'production'})
    state_path = resolve_project_path(args.detached_state_file) or (PROJECT_ROOT / DEFAULT_DETACHED_STATE_FILE)
    write_detached_state(
        state_path,
        {
            'status': 'completed' if production_result['success'] else 'failed',
            'child_run_id': args.run_id,
            'pid': os.getpid(),
            'summary_path': relative_path(RESULTS_DIR / f'{args.run_id}-summary.json'),
            'success': production_result['success'],
            'finished_at': datetime.now(timezone.utc).isoformat(),
        },
    )
    return (0 if production_result['success'] else EXIT_STEP_FAILED), steps


def write_summary(run_id: str, summary: dict, logger: logging.Logger) -> tuple[Path, Path]:
    ensure_results_dir()
    summary_json_path = RESULTS_DIR / f'{run_id}-summary.json'
    summary_md_path = RESULTS_DIR / f'{run_id}-summary.md'

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
    logger, log_path = configure_logger(run_id)
    logger.info('Starting %s run (log: %s)', args.command, relative_path(log_path))

    if args.command == 'smoke-prod':
        try:
            settings = load_smoke_prod_settings(args, raw_args)
            exit_code, steps = execute_smoke_prod(settings, logger, run_id)
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
            write_summary(run_id, summary, logger)
            return EXIT_STEP_FAILED

        summary = {
            'success': exit_code == 0,
            'command': args.command,
            'host': settings['host'],
            'port': settings['port'],
            'preflight_required': True,
            'steps': steps,
        }
        write_summary(run_id, summary, logger)
        return exit_code

    if args.command == 'production-child':
        exit_code, steps = execute_production_child(args, logger)
        summary = {
            'success': exit_code == 0,
            'command': args.command,
            'host': args.host,
            'port': args.port,
            'preflight_required': True,
            'steps': steps,
        }
        write_summary(run_id, summary, logger)
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
            write_summary(run_id, summary, logger)
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
    write_summary(run_id, summary, logger)
    return 0 if overall_success else EXIT_STEP_FAILED


if __name__ == '__main__':
    sys.exit(main())
