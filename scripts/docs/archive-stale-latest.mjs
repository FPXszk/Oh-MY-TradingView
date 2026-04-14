#!/usr/bin/env node

import { mkdir, readdir, rename, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    root: { type: 'string' },
    'research-keep': { type: 'string', multiple: true },
  },
});

const root = resolve(values.root ?? process.cwd());
const researchLatestDir = join(root, 'docs', 'research', 'latest');
const researchArchiveDir = join(root, 'docs', 'research', 'archive');
const sessionLogsDir = join(root, 'docs', 'working-memory', 'session-logs');
const sessionLogsArchiveDir = join(sessionLogsDir, 'archive');
const researchKeep = new Set(['README.md', ...(values['research-keep'] ?? [])]);

async function listMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

async function moveFiles(sourceDir, archiveDir, files) {
  await mkdir(archiveDir, { recursive: true });
  for (const file of files) {
    await rename(join(sourceDir, file), join(archiveDir, file));
  }
}

async function archiveResearchLatest() {
  const files = await listMarkdownFiles(researchLatestDir);
  const staleFiles = files.filter((file) => !researchKeep.has(file));
  await moveFiles(researchLatestDir, researchArchiveDir, staleFiles);
  return staleFiles;
}

async function archiveOldSessionLogs() {
  const files = (await listMarkdownFiles(sessionLogsDir)).filter((file) => file !== '.gitkeep');
  if (files.length <= 1) {
    return [];
  }

  const extractTimestampToken = (file) => {
    const match = file.match(/(\d{8}_\d{4})/);
    return match ? match[1] : null;
  };

  const ranked = await Promise.all(files.map(async (file) => ({
    file,
    timestampToken: extractTimestampToken(file),
    mtimeMs: (await stat(join(sessionLogsDir, file))).mtimeMs,
  })));
  ranked.sort((left, right) => {
    if (left.timestampToken && right.timestampToken && left.timestampToken !== right.timestampToken) {
      return right.timestampToken.localeCompare(left.timestampToken);
    }
    return right.mtimeMs - left.mtimeMs || right.file.localeCompare(left.file);
  });

  const staleFiles = ranked.slice(1).map((entry) => entry.file);
  await moveFiles(sessionLogsDir, sessionLogsArchiveDir, staleFiles);
  return staleFiles;
}

const [archivedResearch, archivedSessionLogs] = await Promise.all([
  archiveResearchLatest(),
  archiveOldSessionLogs(),
]);

if (archivedResearch.length > 0) {
  console.log(`Archived latest research docs: ${archivedResearch.join(', ')}`);
}
if (archivedSessionLogs.length > 0) {
  console.log(`Archived session logs: ${archivedSessionLogs.join(', ')}`);
}
