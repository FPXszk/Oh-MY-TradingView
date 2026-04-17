import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildBrowserLaunchCommand,
  buildBrowserUserDataDir,
  finalizeBrowserLaunchCommand,
  launchBrowserFallback,
  BROWSER_CANDIDATES,
  DEFAULT_CHART_URL,
} from '../src/core/browser-launch.js';

import {
  getSessionPort,
  clearSessionPort,
} from '../src/connection.js';

// ---------------------------------------------------------------------------
// buildBrowserLaunchCommand — defaults & URL
// ---------------------------------------------------------------------------
describe('buildBrowserLaunchCommand', () => {
  it('returns default port 9333 when no port given', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.equal(result.port, 9333);
  });

  it('returns default TradingView chart URL when no url given', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.equal(result.url, DEFAULT_CHART_URL);
    assert.ok(result.url.includes('tradingview.com/chart'));
  });

  it('uses custom url when provided', () => {
    const result = buildBrowserLaunchCommand({
      executablePath: '/usr/bin/chromium',
      url: 'https://www.tradingview.com/chart/AAPL/',
    });
    assert.equal(result.url, 'https://www.tradingview.com/chart/AAPL/');
  });

  it('rejects non-TradingView URLs', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({
        executablePath: '/usr/bin/chromium',
        url: 'https://example.com',
      }),
      /TradingView chart URL/,
    );
  });

  it('rejects TradingView URLs outside /chart', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({
        executablePath: '/usr/bin/chromium',
        url: 'https://www.tradingview.com/',
      }),
      /TradingView chart URL/,
    );
  });

  it('rejects charting-library URLs that only share the /chart prefix', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({
        executablePath: '/usr/bin/chromium',
        url: 'https://www.tradingview.com/charting-library/',
      }),
      /TradingView chart URL/,
    );
  });

  it('uses custom port', () => {
    const result = buildBrowserLaunchCommand({ port: 9333, executablePath: '/usr/bin/chromium' });
    assert.equal(result.port, 9333);
    assert.ok(result.args.includes('--remote-debugging-port=9333'));
  });

  it('includes remote-debugging-port in args', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.ok(result.args.includes('--remote-debugging-port=9333'));
  });

  it('includes no-first-run and no-default-browser-check flags', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.ok(result.args.includes('--no-first-run'));
    assert.ok(result.args.includes('--no-default-browser-check'));
  });

  it('includes notification-suppression flags', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.ok(result.args.includes('--disable-notifications'));
    assert.ok(result.args.includes('--disable-session-crashed-bubble'));
  });

  it('includes a non-default user-data-dir flag', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.ok(result.args.some((arg) => arg.startsWith('--user-data-dir=')));
    assert.ok(result.userDataDir);
  });

  it('includes the URL as the last arg', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/usr/bin/chromium' });
    assert.equal(result.args[result.args.length - 1], DEFAULT_CHART_URL);
  });

  it('returns the explicit executablePath as command', () => {
    const result = buildBrowserLaunchCommand({ executablePath: '/custom/chrome' });
    assert.equal(result.command, '/custom/chrome');
  });

  // -- port validation --
  it('rejects port 0', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({ port: 0, executablePath: '/usr/bin/chromium' }),
      /Invalid port/,
    );
  });

  it('rejects port > 65535', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({ port: 70000, executablePath: '/usr/bin/chromium' }),
      /Invalid port/,
    );
  });

  it('rejects NaN port', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({ port: NaN, executablePath: '/usr/bin/chromium' }),
      /Invalid port/,
    );
  });

  // -- executable resolution --
  it('uses explicit executablePath over candidate list', () => {
    const result = buildBrowserLaunchCommand({
      executablePath: '/my/special/chrome',
      os: 'linux',
    });
    assert.equal(result.command, '/my/special/chrome');
  });

  it('falls back to first candidate when no executablePath', () => {
    const result = buildBrowserLaunchCommand({ os: 'linux' });
    assert.ok(result.candidatePaths.length > 0);
    assert.equal(result.command, result.candidatePaths[0]);
  });

  it('returns candidatePaths list for auto-detection', () => {
    const result = buildBrowserLaunchCommand({ os: 'linux' });
    assert.ok(Array.isArray(result.candidatePaths));
    assert.ok(result.candidatePaths.length > 0);
  });

  it('throws for unknown platform with no executablePath', () => {
    assert.throws(
      () => buildBrowserLaunchCommand({ os: 'freebsd' }),
      /No browser candidate/,
    );
  });

  it('discovers a Windows browser path when running under WSL', () => {
    const tempBase = mkdtempSync(join(tmpdir(), 'tv-browser-launch-wsl-'));
    const fakeUsersDir = join(tempBase, 'Users');
    const fakeChromeDir = join(fakeUsersDir, 'alice', 'AppData', 'Local', 'Google', 'Chrome', 'Application');
    mkdirSync(fakeChromeDir, { recursive: true });
    try {
      const result = buildBrowserLaunchCommand({
        os: 'linux',
        env: { WSL_DISTRO_NAME: 'Ubuntu', USER: 'alice' },
        wslUserBaseDir: fakeUsersDir,
      });
      assert.ok(result.command.endsWith('alice/AppData/Local/Google/Chrome/Application/chrome.exe'));
    } finally {
      rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('includes machine-wide Windows browser candidates when running under WSL', () => {
    const result = buildBrowserLaunchCommand({
      os: 'linux',
      env: { WSL_DISTRO_NAME: 'Ubuntu' },
      wslUserBaseDir: '/nonexistent/users',
    });
    assert.ok(result.candidatePaths.includes('/mnt/c/Program Files/Google/Chrome/Application/chrome.exe'));
    assert.ok(result.candidatePaths.includes('/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'));
  });

  it('expands %ENV% placeholders in explicit executablePath', () => {
    const original = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = 'C:\\Users\\alice\\AppData\\Local';
    try {
      const result = buildBrowserLaunchCommand({
        executablePath: '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
        os: 'win32',
      });
      assert.equal(result.command, 'C:\\Users\\alice\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe');
    } finally {
      if (original === undefined) {
        delete process.env.LOCALAPPDATA;
      } else {
        process.env.LOCALAPPDATA = original;
      }
    }
  });

  it('uses the provided env override for executable path expansion', () => {
    const result = buildBrowserLaunchCommand({
      executablePath: '%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe',
      os: 'win32',
      env: { LOCALAPPDATA: 'C:\\Users\\alice\\AppData\\Local' },
    });
    assert.equal(result.command, 'C:\\Users\\alice\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe');
  });

  it('falls back to scanning installed WSL browser paths when the preferred user path is absent', () => {
    const tempBase = mkdtempSync(join(tmpdir(), 'tv-browser-launch-wsl-fallback-'));
    const fakeUsersDir = join(tempBase, 'Users');
    const fakeChromeDir = join(fakeUsersDir, 'alice', 'AppData', 'Local', 'Google', 'Chrome', 'Application');
    mkdirSync(fakeChromeDir, { recursive: true });
    try {
      const result = buildBrowserLaunchCommand({
        os: 'linux',
        env: { WSL_DISTRO_NAME: 'Ubuntu', USER: 'ubuntu' },
        wslUserBaseDir: fakeUsersDir,
      });
      assert.ok(result.candidatePaths.some((path) => path.endsWith('alice/AppData/Local/Google/Chrome/Application/chrome.exe')));
    } finally {
      rmSync(tempBase, { recursive: true, force: true });
    }
  });
});

describe('buildBrowserUserDataDir', () => {
  it('derives a Windows profile path for Windows executable paths', () => {
    const result = buildBrowserUserDataDir({
      commandPath: 'C:\\Users\\alice\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      port: 9222,
      env: {},
    });
    assert.equal(result, 'C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9222');
  });

  it('derives a Windows profile path from WSL Windows executable paths', () => {
    const result = buildBrowserUserDataDir({
      commandPath: '/mnt/c/Users/alice/AppData/Local/Google/Chrome/Application/chrome.exe',
      port: 9333,
      env: {},
    });
    assert.equal(result, 'C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9333');
  });

  it('prefers the resolved executable path over env.LOCALAPPDATA', () => {
    const result = buildBrowserUserDataDir({
      commandPath: 'C:\\Users\\alice\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      port: 9222,
      env: { LOCALAPPDATA: 'C:\\Users\\bob\\AppData\\Local' },
    });
    assert.equal(result, 'C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9222');
  });

  it('derives a WSL machine-wide browser profile from the preferred Windows user', () => {
    const result = buildBrowserUserDataDir({
      commandPath: '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
      port: 9222,
      env: { USER: 'alice' },
      wslUserBaseDir: '/mnt/c/Users',
      strictWindowsLocalProfile: true,
    });
    assert.equal(result, 'C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9222');
  });
});

describe('finalizeBrowserLaunchCommand', () => {
  it('rebuilds userDataDir from the resolved launch command', () => {
    const base = buildBrowserLaunchCommand({
      os: 'linux',
      executablePath: '/usr/bin/chromium',
      port: 9222,
    });
    const result = finalizeBrowserLaunchCommand(
      base,
      '/mnt/c/Users/alice/AppData/Local/Google/Chrome/Application/chrome.exe',
      { env: {} },
    );
    assert.equal(result.command, '/mnt/c/Users/alice/AppData/Local/Google/Chrome/Application/chrome.exe');
    assert.equal(result.userDataDir, 'C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9222');
    assert.ok(result.args.includes('--user-data-dir=C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9222'));
  });
});

// ---------------------------------------------------------------------------
// BROWSER_CANDIDATES
// ---------------------------------------------------------------------------
describe('BROWSER_CANDIDATES', () => {
  it('has linux candidates', () => {
    assert.ok(BROWSER_CANDIDATES.linux.length > 0);
  });

  it('has darwin candidates', () => {
    assert.ok(BROWSER_CANDIDATES.darwin.length > 0);
  });

  it('has win32 candidates', () => {
    assert.ok(BROWSER_CANDIDATES.win32.length > 0);
  });
});

// ---------------------------------------------------------------------------
// launchBrowserFallback — dry-run
// ---------------------------------------------------------------------------
describe('launchBrowserFallback dry-run', () => {
  beforeEach(() => {
    clearSessionPort();
  });

  it('returns success and dry_run=true', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      dryRun: true,
    });
    assert.equal(result.success, true);
    assert.equal(result.dry_run, true);
  });

  it('returns the resolved command and args', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      port: 9444,
      dryRun: true,
    });
    assert.equal(result.command, '/usr/bin/chromium');
    assert.ok(Array.isArray(result.args));
    assert.equal(result.port, 9444);
  });

  it('returns the url in dry-run result', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      dryRun: true,
    });
    assert.equal(result.url, DEFAULT_CHART_URL);
  });

  it('returns the derived user_data_dir in dry-run result', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      dryRun: true,
    });
    assert.ok(result.user_data_dir);
  });

  it('derives user_data_dir from the resolved existing candidate in dry-run mode', async () => {
    const result = await launchBrowserFallback(
      { os: 'linux', dryRun: true },
      {
        pickFirstExistingPath: async () => '/mnt/c/Users/alice/AppData/Local/Google/Chrome/Application/chrome.exe',
      },
    );
    assert.equal(result.command, '/mnt/c/Users/alice/AppData/Local/Google/Chrome/Application/chrome.exe');
    assert.equal(result.user_data_dir, 'C:\\Users\\alice\\AppData\\Local\\OhMyTradingView\\BrowserFallback\\port-9333');
  });

  it('returns browser field identifying the surface', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      dryRun: true,
    });
    assert.equal(result.browser, true);
  });

  it('does not set session port on dry-run', async () => {
    clearSessionPort();
    await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      port: 9555,
      dryRun: true,
    });
    assert.equal(getSessionPort(), null);
  });

  it('does not include pid on dry-run', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      dryRun: true,
    });
    assert.equal(result.pid, undefined);
  });

  it('includes a hint string', async () => {
    const result = await launchBrowserFallback({
      executablePath: '/usr/bin/chromium',
      dryRun: true,
    });
    assert.ok(typeof result.hint === 'string');
    assert.ok(result.hint.length > 0);
  });
});

// ---------------------------------------------------------------------------
// launchBrowserFallback — real launch failure
// ---------------------------------------------------------------------------
describe('launchBrowserFallback real launch', () => {
  it('rejects when executable not found in candidates', async () => {
    await assert.rejects(
      () => launchBrowserFallback({
        executablePath: '/nonexistent/browser/chrome',
      }),
      /not found/,
    );
  });

  it('rejects when launched process exits immediately', async () => {
    await assert.rejects(
      () => launchBrowserFallback({ executablePath: '/bin/true', port: 9222 }),
      /exited immediately/,
    );
  });
});
