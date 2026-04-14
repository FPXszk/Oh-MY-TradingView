import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';
import { getClient } from '../connection.js';
import { SCREENSHOT_OUTPUT_DIR } from './repo-paths.js';

export function resolveCaptureOutputPath(outputPath, baseDir = SCREENSHOT_OUTPUT_DIR) {
  if (!outputPath || typeof outputPath !== 'string' || outputPath.trim() === '') {
    throw new Error('outputPath must be a non-empty relative path');
  }

  if (isAbsolute(outputPath) || win32.isAbsolute(outputPath)) {
    throw new Error('outputPath must be a relative path under docs/research/results/screenshots');
  }

  const normalized = outputPath.replace(/\\/g, '/');
  if (normalized.split('/').includes('..')) {
    throw new Error('outputPath must stay within docs/research/results/screenshots');
  }

  const resolvedBaseDir = resolve(baseDir);
  const resolvedTargetPath = resolve(resolvedBaseDir, normalized);
  if (
    resolvedTargetPath !== resolvedBaseDir &&
    !resolvedTargetPath.startsWith(`${resolvedBaseDir}${sep}`)
  ) {
    throw new Error('outputPath must stay within docs/research/results/screenshots');
  }

  return resolvedTargetPath;
}

export async function writeScreenshotFile(buffer, outputPath, baseDir = SCREENSHOT_OUTPUT_DIR) {
  const resolvedTargetPath = resolveCaptureOutputPath(outputPath, baseDir);
  await mkdir(dirname(resolvedTargetPath), { recursive: true });
  await writeFile(resolvedTargetPath, buffer, { flag: 'wx' });
  return resolvedTargetPath;
}

/**
 * Capture a screenshot of the current TradingView Desktop page via CDP.
 * Returns { success, format, dataLength } and optionally writes to file.
 */
export async function captureScreenshot({ outputPath, format, quality, fullPage } = {}) {
  const effectiveFormat = format === 'jpeg' ? 'jpeg' : 'png';
  const opts = { format: effectiveFormat };
  if (effectiveFormat === 'jpeg') {
    opts.quality = Math.min(100, Math.max(0, Number(quality) || 80));
  }
  if (fullPage) {
    opts.captureBeyondViewport = true;
  }

  const client = await getClient();
  const { data } = await client.Page.captureScreenshot(opts);

  if (!data) {
    throw new Error('CDP returned empty screenshot data');
  }

  const buffer = Buffer.from(data, 'base64');
  const result = {
    success: true,
    format: effectiveFormat,
    dataLength: buffer.length,
    width: null,
    height: null,
  };

  if (outputPath) {
    const savedPath = await writeScreenshotFile(buffer, outputPath);
    result.outputPath = relative(process.cwd(), savedPath);
  } else {
    result.base64 = data;
  }

  return result;
}
