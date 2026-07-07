import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  resolveNamedJsonPath,
} from '../src/core/repo-paths.js';

describe('resolveNamedJsonPath', () => {
  it('resolves ids with or without .json suffix from fixture search dirs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'repo-paths-'));
    try {
      const baseDir = join(root, 'configs');
      const currentDir = join(baseDir, 'current');
      const archiveDir = join(baseDir, 'archive');
      await mkdir(currentDir, { recursive: true });
      await mkdir(archiveDir, { recursive: true });
      await writeFile(join(archiveDir, 'sample.json'), '{}\n', 'utf8');

      const searchDirs = [currentDir, baseDir, archiveDir];
      const withoutSuffix = await resolveNamedJsonPath(searchDirs, 'sample', 'Fixture');
      const withSuffix = await resolveNamedJsonPath(searchDirs, 'sample.json', 'Fixture');

      assert.equal(withSuffix, withoutSuffix);
      assert.equal(withSuffix, join(archiveDir, 'sample.json'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
