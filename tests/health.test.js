import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

describe('multiLayerHealthCheck', () => {
  let server = null;
  let port = null;

  beforeEach(async () => {
    server = createServer((req, res) => {
      if (req.url === '/json/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ Browser: 'TradingView/1.0' }));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = server.address().port;
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
  });

  it('detects port open when CDP server is listening', async () => {
    const { multiLayerHealthCheck } = await import('../src/core/health.js');
    const result = await multiLayerHealthCheck({
      host: '127.0.0.1',
      port,
      checkProcess: async () => true,
      checkMcp: async () => false,
    });
    assert.equal(result.processAlive, true);
    assert.equal(result.portOpen, true);
    assert.equal(result.mcpHealthy, false);
  });

  it('detects port closed when nothing is listening', async () => {
    const { multiLayerHealthCheck } = await import('../src/core/health.js');
    const result = await multiLayerHealthCheck({
      host: '127.0.0.1',
      port: 19999,
      checkProcess: async () => true,
    });
    assert.equal(result.processAlive, true);
    assert.equal(result.portOpen, false);
    assert.equal(result.mcpHealthy, false);
  });

  it('detects process missing', async () => {
    const { multiLayerHealthCheck } = await import('../src/core/health.js');
    const result = await multiLayerHealthCheck({
      host: '127.0.0.1',
      port: 19999,
      checkProcess: async () => false,
    });
    assert.equal(result.processAlive, false);
    assert.equal(result.portOpen, false);
    assert.equal(result.mcpHealthy, false);
  });

  it('handles checkProcess throwing as process not alive', async () => {
    const { multiLayerHealthCheck } = await import('../src/core/health.js');
    const result = await multiLayerHealthCheck({
      host: '127.0.0.1',
      port: 19999,
      checkProcess: async () => { throw new Error('check failed'); },
    });
    assert.equal(result.processAlive, false);
  });

  it('defaults processAlive to true when no checkProcess given', async () => {
    const { multiLayerHealthCheck } = await import('../src/core/health.js');
    const result = await multiLayerHealthCheck({
      host: '127.0.0.1',
      port,
      checkMcp: async () => false,
    });
    assert.equal(result.processAlive, true);
  });
});
