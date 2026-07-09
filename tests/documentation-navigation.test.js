import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

const PROJECT_ROOT = process.cwd();
const docsToCheck = [
  'README.md',
  'docs/DOCUMENTATION_SYSTEM.md',
];
const ignoredDirectories = new Set(['.git', '.venv', 'node_modules', 'artifacts']);

function readRepoFile(repoPath) {
  return readFileSync(join(PROJECT_ROOT, repoPath), 'utf8');
}

function localMarkdownLinks(markdown) {
  const links = [];
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(markdown)) !== null) {
    const rawTarget = match[1].trim();
    if (
      rawTarget.startsWith('#')
      || rawTarget.startsWith('http://')
      || rawTarget.startsWith('https://')
      || rawTarget.startsWith('mailto:')
    ) {
      continue;
    }
    const withoutFragment = rawTarget.split('#')[0];
    if (withoutFragment === '') continue;
    links.push(withoutFragment.replace(/^<|>$/g, ''));
  }
  return links;
}

function findRepositoryReadmes(directory = PROJECT_ROOT) {
  const results = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...findRepositoryReadmes(absolutePath));
    } else if (entry.name.toLowerCase() === 'readme.md') {
      results.push(relative(PROJECT_ROOT, absolutePath).replaceAll('\\', '/'));
    }
  }
  return results;
}

describe('documentation navigation', () => {
  it('keeps primary documentation links pointing at existing local paths', () => {
    for (const docPath of docsToCheck) {
      const docAbs = join(PROJECT_ROOT, docPath);
      assert.ok(existsSync(docAbs), `${docPath} should exist`);

      const baseDir = dirname(docAbs);
      const links = localMarkdownLinks(readRepoFile(docPath));
      for (const link of links) {
        const target = normalize(join(baseDir, link));
        assert.ok(
          target.startsWith(PROJECT_ROOT),
          `${docPath} link escapes repository: ${link}`,
        );
        assert.ok(existsSync(target), `${docPath} has missing link target: ${link}`);
      }
    }
  });

  it('uses the root README as the only README', () => {
    assert.deepEqual(findRepositoryReadmes().sort(), ['README.md']);
  });

  it('documents the documentation system and skill runbook entry points', () => {
    const readme = readRepoFile('README.md');
    assert.match(
      readme,
      /\[docs\/DOCUMENTATION_SYSTEM\.md\]\(docs\/DOCUMENTATION_SYSTEM\.md\)/,
    );
    assert.match(readme, /\.agents\/skills\//);
    assert.ok(existsSync(join(PROJECT_ROOT, '.agents', 'skills')));
  });
});
