import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'docs', 'archive-stale-latest.mjs');

describe('archive-stale-latest.mjs', () => {
  it('moves stale current research docs and leaves only the newest session log at top level', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'archive-latest-policy-'));
    const researchLatestDir = join(tempRoot, 'docs', 'research', 'current');
    const researchArchiveDir = join(tempRoot, 'docs', 'research', 'archive');
    const sessionLogsDir = join(tempRoot, 'logs', 'sessions');
    const sessionLogsArchiveDir = join(sessionLogsDir, 'archive');

    mkdirSync(researchLatestDir, { recursive: true });
    mkdirSync(researchArchiveDir, { recursive: true });
    mkdirSync(sessionLogsArchiveDir, { recursive: true });

    writeFileSync(join(researchLatestDir, 'README.md'), '# readme\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'keep.md'), '# keep\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'stale.md'), '# stale\n', 'utf8');

    const olderLog = join(sessionLogsDir, 'older.md');
    const newerLog = join(sessionLogsDir, 'newer.md');
    writeFileSync(olderLog, '# older\n', 'utf8');
    writeFileSync(newerLog, '# newer\n', 'utf8');
    const now = Date.now() / 1000;
    utimesSync(olderLog, now - 60, now - 60);
    utimesSync(newerLog, now, now);

    const result = spawnSync('node', [SCRIPT_PATH, '--root', tempRoot, '--research-keep', 'keep.md'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(join(researchLatestDir, 'stale.md')), false);
    assert.equal(existsSync(join(researchArchiveDir, 'stale.md')), true);
    assert.equal(existsSync(join(researchLatestDir, 'keep.md')), true);
    assert.equal(existsSync(join(sessionLogsDir, 'older.md')), false);
    assert.equal(existsSync(join(sessionLogsArchiveDir, 'older.md')), true);
    assert.equal(existsSync(join(sessionLogsDir, 'newer.md')), true);
    assert.ok(statSync(join(sessionLogsDir, 'newer.md')).isFile());
  });

  it('prefers the newest timestamped session log when mtimes are tied', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'archive-latest-policy-tied-'));
    const researchLatestDir = join(tempRoot, 'docs', 'research', 'current');
    const researchArchiveDir = join(tempRoot, 'docs', 'research', 'archive');
    const sessionLogsDir = join(tempRoot, 'logs', 'sessions');
    const sessionLogsArchiveDir = join(sessionLogsDir, 'archive');

    mkdirSync(researchLatestDir, { recursive: true });
    mkdirSync(researchArchiveDir, { recursive: true });
    mkdirSync(sessionLogsArchiveDir, { recursive: true });

    const olderLog = join(sessionLogsDir, 'session-a_20260410_1200.md');
    const newerLog = join(sessionLogsDir, 'session-b_20260414_1735.md');
    writeFileSync(olderLog, '# older\n', 'utf8');
    writeFileSync(newerLog, '# newer\n', 'utf8');
    const now = Date.now() / 1000;
    utimesSync(olderLog, now, now);
    utimesSync(newerLog, now, now);

    const result = spawnSync('node', [SCRIPT_PATH, '--root', tempRoot], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(join(sessionLogsDir, 'session-a_20260410_1200.md')), false);
    assert.equal(existsSync(join(sessionLogsArchiveDir, 'session-a_20260410_1200.md')), true);
    assert.equal(existsSync(join(sessionLogsDir, 'session-b_20260414_1735.md')), true);
  });

  it('keeps files listed in manifest.json and archives unlisted ones', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'archive-manifest-keep-'));
    const researchLatestDir = join(tempRoot, 'docs', 'research', 'current');
    const researchArchiveDir = join(tempRoot, 'docs', 'research', 'archive');
    const sessionLogsDir = join(tempRoot, 'logs', 'sessions');
    const sessionLogsArchiveDir = join(sessionLogsDir, 'archive');

    mkdirSync(researchLatestDir, { recursive: true });
    mkdirSync(researchArchiveDir, { recursive: true });
    mkdirSync(sessionLogsArchiveDir, { recursive: true });

    writeFileSync(join(researchLatestDir, 'manifest.json'), JSON.stringify({
      keep: ['README.md', 'important.md'],
    }), 'utf8');
    writeFileSync(join(researchLatestDir, 'README.md'), '# readme\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'important.md'), '# keep me\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'stale.md'), '# archive me\n', 'utf8');

    const result = spawnSync('node', [SCRIPT_PATH, '--root', tempRoot], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(join(researchLatestDir, 'README.md')), true, 'README.md kept');
    assert.equal(existsSync(join(researchLatestDir, 'important.md')), true, 'manifest-listed file kept');
    assert.equal(existsSync(join(researchLatestDir, 'stale.md')), false, 'unlisted file archived');
    assert.equal(existsSync(join(researchArchiveDir, 'stale.md')), true, 'unlisted file moved to archive');
    assert.equal(existsSync(join(researchLatestDir, 'manifest.json')), true, 'manifest.json itself is kept');
  });

  it('manifest keep merges with --research-keep CLI flag', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'archive-manifest-merge-'));
    const researchLatestDir = join(tempRoot, 'docs', 'research', 'current');
    const researchArchiveDir = join(tempRoot, 'docs', 'research', 'archive');
    const sessionLogsDir = join(tempRoot, 'logs', 'sessions');
    const sessionLogsArchiveDir = join(sessionLogsDir, 'archive');

    mkdirSync(researchLatestDir, { recursive: true });
    mkdirSync(researchArchiveDir, { recursive: true });
    mkdirSync(sessionLogsArchiveDir, { recursive: true });

    writeFileSync(join(researchLatestDir, 'manifest.json'), JSON.stringify({
      keep: ['from-manifest.md'],
    }), 'utf8');
    writeFileSync(join(researchLatestDir, 'README.md'), '# readme\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'from-manifest.md'), '# manifest\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'from-cli.md'), '# cli\n', 'utf8');
    writeFileSync(join(researchLatestDir, 'stale.md'), '# stale\n', 'utf8');

    const result = spawnSync('node', [SCRIPT_PATH, '--root', tempRoot, '--research-keep', 'from-cli.md'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(join(researchLatestDir, 'from-manifest.md')), true, 'manifest keep preserved');
    assert.equal(existsSync(join(researchLatestDir, 'from-cli.md')), true, 'CLI keep preserved');
    assert.equal(existsSync(join(researchLatestDir, 'stale.md')), false, 'unlisted file archived');
    assert.equal(existsSync(join(researchArchiveDir, 'stale.md')), true, 'unlisted file moved to archive');
  });
});
