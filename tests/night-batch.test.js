import { beforeEach, afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const PROJECT_ROOT = join(process.cwd());
const SCRIPT_PATH = join(PROJECT_ROOT, 'python', 'night_batch.py');

function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('python3', args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ status: code, stdout, stderr });
    });
  });
}

describe('night_batch.py CLI', () => {
  let server = null;
  let port = null;

  beforeEach(async () => {
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([
          {
            id: 'chart-1',
            type: 'page',
            url: 'https://jp.tradingview.com/chart/JV6Tvois/',
            title: 'TradingView chart',
          },
        ]));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise((resolve) => server.close(resolve));
    server = null;
    port = null;
  });

  it('exists in python/night_batch.py', () => {
    assert.equal(existsSync(SCRIPT_PATH), true);
  });

  it('bundle dry-run passes preflight and prints the Node bundle command', async () => {
    const result = await runPython(
      [SCRIPT_PATH, 'bundle', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /run-finetune-bundle\.mjs/);
    assert.match(result.stdout, /--ports/);
    assert.match(result.stdout, new RegExp(String(port)));
  });

  it('report dry-run does not require CDP preflight', async () => {
    const result = await runPython(
      [
        SCRIPT_PATH,
        'report',
        '--us',
        'results/us.json',
        '--jp',
        'results/jp.json',
        '--out',
        'results/report.md',
        '--dry-run',
      ],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /generate-rich-report\.mjs/);
  });

  it('nightly dry-run includes both bundle and report commands', async () => {
    const result = await runPython(
      [SCRIPT_PATH, 'nightly', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /run-finetune-bundle\.mjs/);
    assert.match(result.stdout, /generate-rich-report\.mjs/);
  });

  it('bundle dry-run fails preflight when no TradingView chart target exists', async () => {
    await new Promise((resolve) => server.close(resolve));
    server = createServer((req, res) => {
      if (req.url === '/json/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

    const result = await runPython(
      [SCRIPT_PATH, 'bundle', '--host', '127.0.0.1', '--port', String(port), '--dry-run'],
    );

    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stdout, /Preflight failed/);
  });
});
