/**
 * Deterministic raw-output artifact persistence for compact mode.
 *
 * When compact mode is active, the full raw result is saved to a
 * deterministic repo-local path so agents or users can retrieve it later.
 * Compact=false never writes anything.
 */

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARTIFACT_BASE_DIR = '.output-artifacts/raw';
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ARTIFACT_WRITE_HINT = 'Compact output returned without raw artifact. Check repository write permissions for .output-artifacts/.';

/**
 * Sanitize a segment for safe filesystem use.
 * Replaces non-alphanumeric characters (except - and _) with underscores,
 * and truncates to a reasonable length.
 */
function sanitizeSegment(segment) {
  return String(segment)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'key';
}

/**
 * Validate surface names against path traversal, null bytes, and empty values.
 */
function validateSurfaceName(surfaceName) {
  if (!surfaceName) {
    throw new Error('surfaceName is required (empty)');
  }
  if (String(surfaceName).includes('\0')) {
    throw new Error('Null byte detected in artifact path input');
  }
  if (String(surfaceName).includes('..')) {
    throw new Error('Path traversal detected in artifact path input');
  }
}

function normalizeKeyPart(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeKeyPart);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined) {
          acc[key] = normalizeKeyPart(value[key]);
        }
        return acc;
      }, {});
  }
  return value;
}

function serializeInputKey(inputKey) {
  if (inputKey === undefined || inputKey === null || inputKey === '') {
    throw new Error('inputKey is required (empty)');
  }
  if (typeof inputKey === 'string') {
    if (inputKey.includes('\0')) {
      throw new Error('Null byte detected in artifact path input');
    }
    return inputKey;
  }
  return JSON.stringify(normalizeKeyPart(inputKey));
}

/**
 * Build a deterministic artifact path for a surface + inputKey combination.
 *
 * Same surface + same inputKey always returns the same path.
 *
 * @param {string} surfaceName - e.g. 'reach_read_web', 'x_search_posts'
 * @param {unknown} inputKey   - e.g. URL, query, symbol, or normalized option object
 * @param {string} [baseDir]   - override base directory (for testing)
 * @returns {string} deterministic filesystem path ending in .json
 */
export function buildArtifactPath(surfaceName, inputKey, baseDir = ARTIFACT_BASE_DIR) {
  validateSurfaceName(surfaceName);
  const serializedKey = serializeInputKey(inputKey);
  const safeSurface = sanitizeSegment(surfaceName);
  const preview = sanitizeSegment(serializedKey);
  const hash = createHash('sha256')
    .update(`${surfaceName}\0${serializedKey}`)
    .digest('hex')
    .slice(0, 16);
  const artifactPath = path.join(baseDir, safeSurface, `${preview}--${hash}.json`);
  resolveArtifactAbsolutePath(artifactPath);
  return artifactPath;
}

export function resolveArtifactAbsolutePath(artifactPath) {
  const absolutePath = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.resolve(REPO_ROOT, artifactPath);
  const relativeToRoot = path.relative(REPO_ROOT, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Artifact path must stay within repository root');
  }
  return absolutePath;
}

/**
 * Write the raw payload to a deterministic artifact path.
 * Only writes when compact=true.
 *
 * @param {string} surfaceName
 * @param {string} inputKey
 * @param {object} payload - the full raw result to persist
 * @param {object} [opts]
 * @param {boolean} [opts.compact=false] - only writes when true
 * @param {string}  [opts.baseDir]       - override base directory (for testing)
 * @returns {Promise<string|null>} the artifact path, or null if not written
 */
export async function writeRawArtifact(surfaceName, inputKey, payload, opts = {}) {
  const { compact = false, baseDir = ARTIFACT_BASE_DIR } = opts;
  if (!compact) return null;

  const artifactPath = buildArtifactPath(surfaceName, inputKey, baseDir);
  const artifactAbsPath = resolveArtifactAbsolutePath(artifactPath);
  const dir = path.dirname(artifactAbsPath);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(artifactAbsPath, JSON.stringify(payload, null, 2), 'utf-8');

  return artifactPath;
}

export async function tryWriteRawArtifact(surfaceName, inputKey, payload, opts = {}) {
  try {
    return {
      artifactPath: await writeRawArtifact(surfaceName, inputKey, payload, opts),
      warning: null,
      hint: null,
    };
  } catch (err) {
    return {
      artifactPath: null,
      warning: `Failed to persist compact raw artifact: ${err.message}`,
      hint: ARTIFACT_WRITE_HINT,
    };
  }
}

export function attachArtifactWarning(result, artifactInfo) {
  if (!artifactInfo?.warning) {
    return result;
  }
  return {
    ...result,
    warning: artifactInfo.warning,
    hint: result?.hint && artifactInfo.hint
      ? `${result.hint} ${artifactInfo.hint}`
      : (result?.hint || artifactInfo.hint),
  };
}
