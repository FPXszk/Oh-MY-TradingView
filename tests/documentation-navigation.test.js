import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const PROJECT_ROOT = process.cwd();
const docsToCheck = [
  'README.md',
  'docs/README.md',
  'docs/DOCUMENTATION_SYSTEM.md',
];

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

describe('documentation navigation', () => {
  it('keeps primary README and docs links pointing at existing local paths', () => {
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

  it('documents the main docs index and skill runbook entry point', () => {
    const readme = readRepoFile('README.md');
    assert.match(readme, /\[docs\/README\.md\]\(docs\/README\.md\)/);
    assert.match(readme, /\.agents\/skills\//);
    assert.ok(existsSync(join(PROJECT_ROOT, '.agents', 'skills')));
  });
});
