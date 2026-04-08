import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  buildLaunchCommand,
  launchDesktop,
  pickFirstExistingPath,
  verifyExecutable,
} from '../src/core/launch.js';

import {
  getSessionPort,
  clearSessionPort,
} from '../src/connection.js';

// ---------------------------------------------------------------------------
// buildLaunchCommand
// ---------------------------------------------------------------------------
describe('buildLaunchCommand', () => {
  it('returns a command with default port when no options given', () => {
    const result = buildLaunchCommand({ executablePath: '/usr/bin/tradingview', os: 'linux' });
    assert.equal(result.port, 9222);
    assert.equal(result.command, '/usr/bin/tradingview');
    assert.ok(result.args.includes('--remote-debugging-port=9222'));
  });

  it('uses custom port', () => {
    const result = buildLaunchCommand({ port: 9333, executablePath: '/bin/tv', os: 'linux' });
    assert.equal(result.port, 9333);
    assert.ok(result.args.includes('--remote-debugging-port=9333'));
  });

  it('rejects invalid port (0)', () => {
    assert.throws(
      () => buildLaunchCommand({ port: 0, executablePath: '/bin/tv', os: 'linux' }),
      /Invalid port/,
    );
  });

  it('rejects port > 65535', () => {
    assert.throws(
      () => buildLaunchCommand({ port: 70000, executablePath: '/bin/tv', os: 'linux' }),
      /Invalid port/,
    );
  });

  it('rejects NaN port', () => {
    assert.throws(
      () => buildLaunchCommand({ port: NaN, executablePath: '/bin/tv', os: 'linux' }),
      /Invalid port/,
    );
  });

  it('throws when no executable path for unknown platform', () => {
    assert.throws(
      () => buildLaunchCommand({ os: 'freebsd' }),
      /No TradingView Desktop path known/,
    );
  });

  it('uses provided executablePath over platform default', () => {
    const result = buildLaunchCommand({ executablePath: '/custom/path/tv', os: 'win32' });
    assert.equal(result.command, '/custom/path/tv');
  });

  it('uses known win32 path when no executablePath given', () => {
    const result = buildLaunchCommand({ os: 'win32' });
    assert.ok(result.command.includes('TradingView'));
  });

  it('discovers a Windows TradingView path when running under WSL', () => {
    const tempBase = mkdtempSync(join(tmpdir(), 'tv-launch-wsl-'));
    const fakeUsersDir = join(tempBase, 'Users');
    const fakeExe = join(fakeUsersDir, 'alice', 'AppData', 'Local', 'TradingView');
    mkdirSync(fakeExe, { recursive: true });
    try {
      const result = buildLaunchCommand({
        os: 'linux',
        env: { WSL_DISTRO_NAME: 'Ubuntu' },
        wslUserBaseDir: fakeUsersDir,
      });
      assert.ok(result.command.endsWith('alice/AppData/Local/TradingView/TradingView.exe'));
    } finally {
      rmSync(tempBase, { recursive: true, force: true });
    }
  });

  it('expands %ENV% placeholders in explicit executablePath', () => {
    const original = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = 'C:\\Users\\alice\\AppData\\Local';
    try {
      const result = buildLaunchCommand({
        executablePath: '%LOCALAPPDATA%\\TradingView\\TradingView.exe',
        os: 'win32',
      });
      assert.equal(result.command, 'C:\\Users\\alice\\AppData\\Local\\TradingView\\TradingView.exe');
    } finally {
      process.env.LOCALAPPDATA = original;
    }
  });

  it('returns os in result', () => {
    const result = buildLaunchCommand({ executablePath: '/bin/tv', os: 'darwin' });
    assert.equal(result.os, 'darwin');
  });
});

// ---------------------------------------------------------------------------
// verifyExecutable
// ---------------------------------------------------------------------------
describe('verifyExecutable', () => {
  it('returns exists=false for a non-existent path', async () => {
    const result = await verifyExecutable('/nonexistent/path/to/binary');
    assert.equal(result.exists, false);
    assert.equal(result.path, '/nonexistent/path/to/binary');
  });

  it('returns exists=true for an existing file', async () => {
    const result = await verifyExecutable('/usr/bin/env');
    assert.equal(result.exists, true);
    assert.equal(result.path, '/usr/bin/env');
  });
});

describe('pickFirstExistingPath', () => {
  it('returns the first path that exists', async () => {
    const result = await pickFirstExistingPath([
      '/nonexistent/path/to/binary',
      '/usr/bin/env',
      '/bin/echo',
    ]);
    assert.equal(result, '/usr/bin/env');
  });

  it('returns null when no candidates exist', async () => {
    const result = await pickFirstExistingPath([
      '/nonexistent/path/one',
      '/nonexistent/path/two',
    ]);
    assert.equal(result, null);
  });
});

describe('launchDesktop', () => {
  it('rejects when the launched process exits immediately', async () => {
    await assert.rejects(
      () => launchDesktop({ executablePath: '/bin/true', port: 9222 }),
      /exited immediately/,
    );
  });

  it('does not set session port on dry-run launch', async () => {
    clearSessionPort();
    const result = await launchDesktop({
      port: 9444,
      executablePath: '/bin/tv',
      dryRun: true,
    });
    assert.equal(result.port, 9444);
    assert.equal(getSessionPort(), null);
    clearSessionPort();
  });

  it('returns default port on dry-run launch without mutating session port', async () => {
    clearSessionPort();
    const result = await launchDesktop({ executablePath: '/bin/tv', dryRun: true });
    assert.equal(result.port, 9222);
    assert.equal(getSessionPort(), null);
    clearSessionPort();
  });
});
