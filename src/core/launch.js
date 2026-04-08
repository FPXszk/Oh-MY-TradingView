import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { access, constants } from 'node:fs/promises';
import { platform } from 'node:os';
import { join } from 'node:path';

const DEFAULT_PORT = 9222;

const KNOWN_PATHS = {
  win32: [
    '%LOCALAPPDATA%\\TradingView\\TradingView.exe',
  ],
  linux: [
    '/opt/TradingView/tradingview',
    '/usr/bin/tradingview',
  ],
  darwin: [
    '/Applications/TradingView.app/Contents/MacOS/TradingView',
  ],
};

function expandEnvVars(str) {
  return str.replace(/%([^%]+)%/g, (_, key) => process.env[key] || `%${key}%`);
}

function collectWslWindowsPaths(baseDir) {
  try {
    return readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(baseDir, entry.name, 'AppData', 'Local', 'TradingView', 'TradingView.exe'));
  } catch {
    return [];
  }
}

function resolvePlatformPaths(os, { env = process.env, wslUserBaseDir = '/mnt/c/Users' } = {}) {
  const paths = KNOWN_PATHS[os] || [];
  const resolved = paths.map((p) => expandEnvVars(p));
  if (os === 'linux' && env.WSL_DISTRO_NAME) {
    return [...collectWslWindowsPaths(wslUserBaseDir), ...resolved];
  }
  return resolved;
}

/**
 * Build the command line for launching TradingView Desktop with CDP debug port.
 * Returns { command, args, port } or throws if no executable path is available.
 */
export function buildLaunchCommand({ port, executablePath, os, env, wslUserBaseDir } = {}) {
  const effectivePort = port ?? DEFAULT_PORT;
  if (!Number.isFinite(effectivePort) || effectivePort < 1 || effectivePort > 65535) {
    throw new Error(`Invalid port: ${effectivePort}. Must be 1–65535.`);
  }

  const effectiveOs = os ?? platform();
  const candidatePaths = executablePath
    ? [expandEnvVars(executablePath)]
    : resolvePlatformPaths(effectiveOs, { env, wslUserBaseDir });
  if (candidatePaths.length === 0) {
    throw new Error(
      `No TradingView Desktop path known for platform "${effectiveOs}". ` +
      'Provide executablePath explicitly.',
    );
  }

  const args = [
    `--remote-debugging-port=${effectivePort}`,
  ];

  return {
    command: candidatePaths[0],
    candidatePaths,
    args,
    port: effectivePort,
    os: effectiveOs,
  };
}

/**
 * Attempt to verify that the executable exists on disk.
 * Returns { exists, path } — does not throw.
 */
export async function verifyExecutable(executablePath) {
  try {
    await access(executablePath, constants.F_OK);
    return { exists: true, path: executablePath };
  } catch {
    return { exists: false, path: executablePath };
  }
}

export async function pickFirstExistingPath(candidatePaths) {
  for (const candidatePath of candidatePaths) {
    const verify = await verifyExecutable(candidatePath);
    if (verify.exists) {
      return verify.path;
    }
  }
  return null;
}

/**
 * Launch TradingView Desktop with debug port support.
 * Returns launch info but does NOT wait for the process — it runs detached.
 */
export async function launchDesktop({ port, executablePath, dryRun } = {}) {
  const cmd = buildLaunchCommand({ port, executablePath });
  const launchCommand = dryRun
    ? cmd.command
    : await pickFirstExistingPath(cmd.candidatePaths);

  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      command: launchCommand,
      args: cmd.args,
      port: cmd.port,
    };
  }

  if (!launchCommand) {
    throw new Error(
      `TradingView executable not found in known paths: ${cmd.candidatePaths.join(', ')}. ` +
      'Ensure TradingView Desktop is installed or provide the correct executablePath.',
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(launchCommand, cmd.args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.unref();
    let settled = false;

    const timeout = setTimeout(() => {
      settled = true;
      resolve({
        success: true,
        command: launchCommand,
        args: cmd.args,
        port: cmd.port,
        pid: child.pid ?? null,
        hint: `TradingView Desktop launched with --remote-debugging-port=${cmd.port}. ` +
              'Connect via tv_health_check to verify.',
      });
    }, 1500);

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Failed to launch TradingView Desktop: ${err.message}`));
    });

    child.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          signal
            ? `TradingView Desktop exited immediately with signal ${signal}`
            : `TradingView Desktop exited immediately with code ${code ?? 'unknown'}`,
        ),
      );
    });
  });
}
