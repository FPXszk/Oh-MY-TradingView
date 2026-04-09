import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { platform } from 'node:os';
import { setSessionPort } from '../connection.js';
import {
  verifyExecutable,
  pickFirstExistingPath,
  expandEnvVars,
  collectWslWindowsAppPaths,
} from './launch.js';

export const DEFAULT_PORT = 9222;
export const DEFAULT_CHART_URL = 'https://www.tradingview.com/chart/';

export const BROWSER_CANDIDATES = {
  linux: [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge-stable',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
    '%PROGRAMFILES%\\Google\\Chrome\\Application\\chrome.exe',
    '%PROGRAMFILES(X86)%\\Google\\Chrome\\Application\\chrome.exe',
    '%PROGRAMFILES(X86)%\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
};

const WSL_BROWSER_RELATIVE_PATHS = [
  ['AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'],
  ['AppData', 'Local', 'Chromium', 'Application', 'chrome.exe'],
  ['AppData', 'Local', 'Microsoft', 'Edge', 'Application', 'msedge.exe'],
];
const WSL_MACHINE_BROWSER_CANDIDATES = [
  '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

function resolvePreferredWslWindowsUser(env = process.env) {
  const preferredUser = env.TV_WINDOWS_USER || env.USER;
  return typeof preferredUser === 'string' && preferredUser.trim() !== ''
    ? preferredUser.trim()
    : null;
}

function collectInstalledWslBrowserCandidates(baseDir, preferredUser = null) {
  const installed = WSL_BROWSER_RELATIVE_PATHS.flatMap((segments) =>
    collectWslWindowsAppPaths(baseDir, segments)
  );
  const filtered = preferredUser
    ? installed.filter((path) => !path.includes(`/${preferredUser}/`))
    : installed;
  return [...new Set(filtered)];
}

function isWindowsMachineWideBrowserPath(commandPath) {
  return /^[A-Za-z]:\\Program Files(?: \(x86\))?\\/i.test(String(commandPath));
}

function isWslMachineWideBrowserPath(commandPath) {
  return /^\/mnt\/[a-z]\/Program Files(?: \(x86\))?\//i.test(String(commandPath));
}

function pickWslWindowsLocalAppDataBase(baseDir, env = process.env) {
  const preferredUser = resolvePreferredWslWindowsUser(env);
  if (!preferredUser) {
    return null;
  }

  return `${String(baseDir).replace(/\\/g, '/')}/${preferredUser}/AppData/Local`;
}

function windowsLocalAppDataFromWslPath(path) {
  const match = String(path).match(/^\/mnt\/([a-z])\/Users\/([^/]+)\/AppData\/Local(?:\/|$)/i);
  if (!match) {
    return null;
  }
  return `${match[1].toUpperCase()}:\\Users\\${match[2]}\\AppData\\Local`;
}

function isTradingViewChartUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      /(^|\.)tradingview\.com$/i.test(parsed.hostname) &&
      /^\/chart(?:\/|$)/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function deriveWindowsLocalAppData(commandPath, env = process.env, { wslUserBaseDir = '/mnt/c/Users' } = {}) {
  const windowsMatch = String(commandPath).match(/^([A-Za-z]:\\Users\\[^\\]+\\AppData\\Local)(?:\\|$)/i);
  if (windowsMatch) {
    return windowsMatch[1];
  }

  const wslLocalAppData = windowsLocalAppDataFromWslPath(commandPath);
  if (wslLocalAppData) {
    return wslLocalAppData;
  }

  if (isWslMachineWideBrowserPath(commandPath)) {
    const inferredWslLocalAppData = pickWslWindowsLocalAppDataBase(wslUserBaseDir, env);
    if (inferredWslLocalAppData) {
      return windowsLocalAppDataFromWslPath(inferredWslLocalAppData);
    }
  }

  if (typeof env.LOCALAPPDATA === 'string' && env.LOCALAPPDATA !== '' && env.LOCALAPPDATA !== 'undefined') {
    return env.LOCALAPPDATA;
  }

  return null;
}

export function buildBrowserUserDataDir({
  commandPath,
  port,
  env = process.env,
  cwd = process.cwd(),
  wslUserBaseDir = '/mnt/c/Users',
  strictWindowsLocalProfile = false,
}) {
  const windowsLocalAppData = deriveWindowsLocalAppData(commandPath, env, { wslUserBaseDir });
  if (windowsLocalAppData) {
    return `${windowsLocalAppData}\\OhMyTradingView\\BrowserFallback\\port-${port}`;
  }

  if (strictWindowsLocalProfile && (isWindowsMachineWideBrowserPath(commandPath) || isWslMachineWideBrowserPath(commandPath))) {
    throw new Error('Unable to derive a Windows-local browser profile directory for the resolved browser executable');
  }

  return resolve(cwd, 'results', 'browser-fallback-profile', `port-${port}`);
}

function buildBrowserLaunchArgs({ port, userDataDir, url }) {
  return [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    url,
  ];
}

function resolveCandidates(os, { env = process.env, wslUserBaseDir = '/mnt/c/Users' } = {}) {
  const paths = BROWSER_CANDIDATES[os] || [];
  const resolved = paths.map((p) => expandEnvVars(p, env));
  if (os === 'linux' && env.WSL_DISTRO_NAME) {
    const preferredUser = resolvePreferredWslWindowsUser(env);
    const wslUserCandidates = preferredUser
      ? WSL_BROWSER_RELATIVE_PATHS.map((segments) =>
          `${String(wslUserBaseDir).replace(/\\/g, '/')}/${preferredUser}/${segments.join('/')}`
        )
      : [];
    const fallbackUserCandidates = collectInstalledWslBrowserCandidates(wslUserBaseDir, preferredUser);
    return [...wslUserCandidates, ...fallbackUserCandidates, ...WSL_MACHINE_BROWSER_CANDIDATES, ...resolved];
  }
  return resolved;
}

/**
 * Build the command line for launching a Chromium-based browser
 * with remote debugging and a TradingView chart URL.
 */
export function buildBrowserLaunchCommand({ port, executablePath, url, os, env, wslUserBaseDir } = {}) {
  const effectivePort = port ?? DEFAULT_PORT;
  if (!Number.isFinite(effectivePort) || effectivePort < 1 || effectivePort > 65535) {
    throw new Error(`Invalid port: ${effectivePort}. Must be 1–65535.`);
  }

  const effectiveUrl = url ?? DEFAULT_CHART_URL;
  if (!isTradingViewChartUrl(effectiveUrl)) {
    throw new Error('url must be a TradingView chart URL');
  }
  const effectiveOs = os ?? platform();

  const candidatePaths = executablePath
    ? [expandEnvVars(executablePath, env)]
    : resolveCandidates(effectiveOs, { env, wslUserBaseDir });

  if (candidatePaths.length === 0) {
    throw new Error(
      `No browser candidate known for platform "${effectiveOs}". ` +
      'Provide executablePath explicitly.',
    );
  }

  const userDataDir = buildBrowserUserDataDir({
    commandPath: candidatePaths[0],
    port: effectivePort,
    env,
    wslUserBaseDir,
  });

  const args = buildBrowserLaunchArgs({
    port: effectivePort,
    userDataDir,
    url: effectiveUrl,
  });

  return {
    command: candidatePaths[0],
    candidatePaths,
    args,
    port: effectivePort,
    url: effectiveUrl,
    userDataDir,
    os: effectiveOs,
  };
}

export function finalizeBrowserLaunchCommand(
  commandContract,
  launchCommand,
  { env = process.env, wslUserBaseDir = '/mnt/c/Users' } = {},
) {
  const command = launchCommand || commandContract.command;
  const userDataDir = buildBrowserUserDataDir({
    commandPath: command,
    port: commandContract.port,
    env,
    wslUserBaseDir,
    strictWindowsLocalProfile: true,
  });

  return {
    ...commandContract,
    command,
    userDataDir,
    args: buildBrowserLaunchArgs({
      port: commandContract.port,
      userDataDir,
      url: commandContract.url,
    }),
  };
}

/**
 * Launch a Chromium-based browser as a fallback surface for TradingView web/chart.
 * Runs detached, consistent with the desktop launcher pattern.
 * This is bounded observation/recovery support — not a desktop replacement.
 */
export async function launchBrowserFallback(
  { port, executablePath, url, dryRun, os, env, wslUserBaseDir } = {},
  _deps = {},
) {
  const cmd = buildBrowserLaunchCommand({ port, executablePath, url, os, env, wslUserBaseDir });
  const pickExistingPath = _deps.pickFirstExistingPath || pickFirstExistingPath;

  if (dryRun) {
    const previewLaunchCommand = executablePath
      ? cmd.command
      : await pickExistingPath(cmd.candidatePaths) || cmd.command;
    const preview = finalizeBrowserLaunchCommand(cmd, previewLaunchCommand, { env, wslUserBaseDir });
    return {
      success: true,
      dry_run: true,
      browser: true,
      command: preview.command,
      args: preview.args,
      port: preview.port,
      url: preview.url,
      user_data_dir: preview.userDataDir,
      hint: `Browser fallback launch command built for port ${preview.port}. ` +
              'Use without --dry-run to execute.',
    };
  }

  const launchCommand = await pickExistingPath(cmd.candidatePaths);
  if (!launchCommand) {
    throw new Error(
      `Browser executable not found in candidates: ${cmd.candidatePaths.join(', ')}. ` +
      'Provide executablePath explicitly.',
    );
  }

  const launchContract = finalizeBrowserLaunchCommand(cmd, launchCommand, { env, wslUserBaseDir });

  return new Promise((resolve, reject) => {
    const child = spawn(launchContract.command, launchContract.args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.unref();
    let settled = false;

    const timeout = setTimeout(() => {
      settled = true;
      setSessionPort(launchContract.port);
      resolve({
        success: true,
        browser: true,
        command: launchContract.command,
        args: launchContract.args,
        port: launchContract.port,
        url: launchContract.url,
        user_data_dir: launchContract.userDataDir,
        pid: child.pid ?? null,
        hint: `Browser launched with --remote-debugging-port=${launchContract.port}. ` +
              'Connect via tv_health_check or tv_observe_snapshot to verify.',
      });
    }, 1500);

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(`Failed to launch browser: ${err.message}`));
    });

    child.on('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(
        new Error(
          signal
            ? `Browser exited immediately with signal ${signal}`
            : `Browser exited immediately with code ${code ?? 'unknown'}`,
        ),
      );
    });
  });
}
