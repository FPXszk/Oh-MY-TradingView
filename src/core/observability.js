import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { resolveCdpEndpoint, getClient, getTargetInfo, evaluateAsync } from '../connection.js';
import { collectPageState } from './health.js';
import { captureScreenshot } from './capture.js';
import { OBSERVABILITY_OUTPUT_DIR } from './repo-paths.js';
const MAX_RUNTIME_ERRORS = 20;
const DEFAULT_RUNTIME_ERROR_WAIT_MS = 250;

/**
 * JS expression to install and read a small persistent runtime error buffer.
 * The snapshot waits briefly so errors emitted during the window can be observed.
 */
export const RUNTIME_ERRORS_JS = `(async function() {
  var maxItems = ${MAX_RUNTIME_ERRORS};
  var waitMs = ${DEFAULT_RUNTIME_ERROR_WAIT_MS};
  try {
    var store = Array.isArray(window.__tv_observe_errors) ? window.__tv_observe_errors : [];
    if (!Array.isArray(window.__tv_observe_errors)) {
      window.__tv_observe_errors = store;
    }
    function trimStore() {
      if (store.length > maxItems) {
        store.splice(0, store.length - maxItems);
      }
    }
    function pushError(entry) {
      try {
        store.push(entry);
        trimStore();
      } catch (_) {}
    }
    function normalizeReason(reason) {
      if (!reason) return 'Unhandled promise rejection';
      if (typeof reason === 'string') return reason;
      if (typeof reason.message === 'string' && reason.message) return reason.message;
      try {
        return JSON.stringify(reason);
      } catch (_) {
        return String(reason);
      }
    }
    if (!window.__tv_observe_errors_installed) {
      window.__tv_observe_errors_installed = true;
      window.addEventListener('error', function(event) {
        pushError({
          type: 'error',
          message: event.message || (event.error && event.error.message) || 'Unknown page error',
          source: event.filename || null,
          line: typeof event.lineno === 'number' ? event.lineno : null,
          column: typeof event.colno === 'number' ? event.colno : null,
          captured_at: new Date().toISOString(),
        });
      }, true);
      window.addEventListener('unhandledrejection', function(event) {
        pushError({
          type: 'unhandledrejection',
          message: normalizeReason(event.reason),
          captured_at: new Date().toISOString(),
        });
      });
    }
    await new Promise(function(resolve) { setTimeout(resolve, waitMs); });
    return store.slice(-maxItems);
  } catch (_) {
    return [];
  }
})()`;

/**
 * Generate a deterministic snapshot ID from a Date.
 */
export function generateSnapshotId(now = new Date()) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const y = now.getUTCFullYear();
  const mo = pad(now.getUTCMonth() + 1);
  const d = pad(now.getUTCDate());
  const h = pad(now.getUTCHours());
  const mi = pad(now.getUTCMinutes());
  const s = pad(now.getUTCSeconds());
  return `snapshot-${y}${mo}${d}T${h}${mi}${s}Z`;
}

/**
 * Resolve and validate the bundle directory for a snapshot.
 */
export function resolveSnapshotDir(snapshotId, baseDir = OBSERVABILITY_OUTPUT_DIR) {
  if (!snapshotId || typeof snapshotId !== 'string') {
    throw new Error('snapshot ID must be a non-empty string');
  }
  if (/[/\\]/.test(snapshotId) || snapshotId.includes('..')) {
    throw new Error('snapshot ID must not contain path separators or traversal');
  }
  return resolve(baseDir, snapshotId);
}

/**
 * Build the manifest object for a snapshot bundle.
 */
export function buildManifest(snapshotId, artifacts, generatedAt) {
  return {
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    artifacts: { ...artifacts },
  };
}

export async function allocateSnapshotBundle(baseSnapshotId, baseDir = OBSERVABILITY_OUTPUT_DIR, _deps = {}) {
  const mkdirFn = _deps.mkdir || mkdir;
  await mkdirFn(baseDir, { recursive: true });

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const snapshotId = suffix === 0 ? baseSnapshotId : `${baseSnapshotId}-${suffix + 1}`;
    const bundleDir = resolveSnapshotDir(snapshotId, baseDir);
    try {
      await mkdirFn(bundleDir);
      return { snapshotId, bundleDir };
    } catch (err) {
      if (err?.code === 'EEXIST') {
        continue;
      }
      throw err;
    }
  }

  throw new Error('Unable to allocate a unique observability snapshot directory');
}

/**
 * Collect runtime errors via CDP evaluation (best-effort).
 */
export async function collectRuntimeErrors(_deps = {}) {
  const evalAsyncFn = _deps.evaluateAsync || _deps.evaluate || evaluateAsync;
  const errors = await evalAsyncFn(RUNTIME_ERRORS_JS);
  if (!Array.isArray(errors)) {
    throw new Error('Runtime error probe returned a non-array payload');
  }
  return errors;
}

/**
 * Collect CDP connection/target diagnostic info.
 */
export async function collectConnectionInfo(_deps = {}) {
  const resolveEndpoint = _deps.resolveCdpEndpoint || resolveCdpEndpoint;
  const getTarget = _deps.getTargetInfo || getTargetInfo;

  const endpoint = resolveEndpoint();
  try {
    const target = await getTarget();
    return {
      host: endpoint.host,
      port: endpoint.port,
      url: endpoint.url,
      target_id: target?.id || null,
      target_title: target?.title || null,
      target_url: target?.url || null,
    };
  } catch (err) {
    return {
      host: endpoint.host,
      port: endpoint.port,
      url: endpoint.url,
      target_id: null,
      target_title: null,
      target_url: null,
      error: err.message,
    };
  }
}

/**
 * Normalize raw page state from collectPageState into the snapshot schema.
 */
export function normalizePageState(raw) {
  return {
    url: raw?.url || null,
    title: raw?.title || null,
    chart_symbol: raw?.symbol || null,
    chart_resolution: raw?.resolution || null,
    chart_type: raw?.chartType ?? null,
    api_available: raw?.apiAvailable ?? false,
  };
}

/**
 * One-shot observability snapshot orchestrator.
 *
 * Collects CDP connection info, page/chart state, runtime errors,
 * and a screenshot into a deterministic artifact bundle.
 *
 * Prefers partial results with warnings over hard failure when
 * individual probes or artifact writes fail.
 */
export async function captureObservabilitySnapshot(options = {}, _deps = {}) {
  const now = options._now || new Date();
  const baseSnapshotId = generateSnapshotId(now);
  const generatedAt = now.toISOString();
  const baseDir = options.baseDir || OBSERVABILITY_OUTPUT_DIR;

  const warnings = [];
  const artifactPaths = {};
  const emptyPageState = normalizePageState(null);
  let snapshotId = baseSnapshotId;
  let bundleDir = resolveSnapshotDir(snapshotId, baseDir);

  // 1. Connection info (best-effort)
  let connection;
  try {
    connection = await collectConnectionInfo(_deps);
  } catch (err) {
    connection = { error: err.message };
    warnings.push(`connection info failed: ${err.message}`);
  }

  // 2. Ensure CDP client is connected (hard failure)
  const getClientFn = _deps.getClient || getClient;
  try {
    await getClientFn();
  } catch (err) {
    return {
      success: false,
      snapshot_id: snapshotId,
      generated_at: generatedAt,
      bundle_dir: relative(process.cwd(), bundleDir),
      connection,
      page_state: emptyPageState,
      runtime_errors: [],
      artifacts: {},
      error: `CDP connection failed: ${err.message}`,
      warnings,
    };
  }

  // 3. Page state (best-effort)
  const collectState = _deps.collectPageState || collectPageState;
  let pageState;
  try {
    const raw = await collectState(_deps);
    pageState = normalizePageState(raw);
  } catch (err) {
    pageState = { ...emptyPageState, error: err.message };
    warnings.push(`page state collection failed: ${err.message}`);
  }

  // 4. Runtime errors (best-effort, always array)
  let runtimeErrors;
  try {
    runtimeErrors = await collectRuntimeErrors(_deps);
  } catch (err) {
    runtimeErrors = [];
    warnings.push(`runtime error collection failed: ${err.message}`);
  }

  // 5. Create bundle directory
  const mkdirFn = _deps.mkdir || mkdir;
  const writeFileFn = _deps.writeFile || writeFile;

  try {
    const allocated = await allocateSnapshotBundle(baseSnapshotId, baseDir, { mkdir: mkdirFn });
    snapshotId = allocated.snapshotId;
    bundleDir = allocated.bundleDir;
  } catch (err) {
    warnings.push(`bundle directory creation failed: ${err.message}`);
    return {
      success: true,
      snapshot_id: snapshotId,
      generated_at: generatedAt,
      bundle_dir: relative(process.cwd(), bundleDir),
      connection,
      page_state: pageState,
      runtime_errors: runtimeErrors,
      artifacts: {},
      warnings,
    };
  }

  // 5a. Save page-state.json
  try {
    const pageStatePath = join(bundleDir, 'page-state.json');
    await writeFileFn(pageStatePath, JSON.stringify(pageState, null, 2));
    artifactPaths.page_state_path = relative(process.cwd(), pageStatePath);
  } catch (err) {
    warnings.push(`page-state.json save failed: ${err.message}`);
  }

  // 5b. Save runtime-errors.json
  try {
    const errorsPath = join(bundleDir, 'runtime-errors.json');
    await writeFileFn(errorsPath, JSON.stringify(runtimeErrors, null, 2));
    artifactPaths.runtime_errors_path = relative(process.cwd(), errorsPath);
  } catch (err) {
    warnings.push(`runtime-errors.json save failed: ${err.message}`);
  }

  // 5c. Screenshot (best-effort)
  try {
    const captureFn = _deps.captureScreenshot || captureScreenshot;
    const captureResult = await captureFn({ format: 'png' });
    if (!captureResult.base64) {
      throw new Error('No screenshot data returned');
    }
    const buffer = Buffer.from(captureResult.base64, 'base64');
    const screenshotPath = join(bundleDir, 'page.png');
    await writeFileFn(screenshotPath, buffer);
    artifactPaths.screenshot_path = relative(process.cwd(), screenshotPath);
  } catch (err) {
    warnings.push(`screenshot capture failed: ${err.message}`);
  }

  // 5d. Build and save manifest.json
  try {
    const manifestPath = join(bundleDir, 'manifest.json');
    artifactPaths.manifest_path = relative(process.cwd(), manifestPath);
    const manifest = buildManifest(snapshotId, artifactPaths, generatedAt);
    await writeFileFn(manifestPath, JSON.stringify(manifest, null, 2));
  } catch (err) {
    delete artifactPaths.manifest_path;
    warnings.push(`manifest.json save failed: ${err.message}`);
  }

  return {
    success: true,
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    bundle_dir: relative(process.cwd(), bundleDir),
    connection,
    page_state: pageState,
    runtime_errors: runtimeErrors,
    artifacts: artifactPaths,
    warnings,
  };
}
