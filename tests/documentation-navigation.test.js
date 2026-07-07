import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');

function readRepoFile(...parts) {
  return readFileSync(join(PROJECT_ROOT, ...parts), 'utf8');
}

function assertContains(content, expected, label) {
  assert.ok(content.includes(expected), `${label} must include "${expected}"`);
}

function localMarkdownLinks(content) {
  const links = [];
  const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkPattern.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    if (
      rawTarget.length === 0 ||
      rawTarget.startsWith('#') ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:')
    ) {
      continue;
    }
    const withoutAnchor = rawTarget.split('#')[0];
    if (withoutAnchor.length > 0) links.push(withoutAnchor);
  }
  return links;
}

function assertLocalLinksExist(markdownPath) {
  const absoluteMarkdownPath = join(PROJECT_ROOT, markdownPath);
  const content = readFileSync(absoluteMarkdownPath, 'utf8');
  const baseDir = dirname(absoluteMarkdownPath);

  for (const target of localMarkdownLinks(content)) {
    const resolvedTarget = normalize(resolve(baseDir, target));
    assert.ok(
      resolvedTarget.startsWith(PROJECT_ROOT),
      `${markdownPath} must not link outside the repository: ${target}`,
    );
    assert.ok(existsSync(resolvedTarget), `${markdownPath} link target must exist: ${target}`);
  }
}

describe('documentation navigation', () => {
  it('README exposes the current project routing sections', () => {
    const readme = readRepoFile('README.md');

    for (const heading of [
      '## 現在の主実行環境',
      '## 最初に読む順番',
      '## タスク別ナビゲーション',
      '## 主要実行経路',
      '## リポジトリ構造',
      '## テストの選び方',
      '## 正本と生成物',
      '## 詳細ドキュメント',
    ]) {
      assertContains(readme, heading, 'README');
    }
  });

  it('README points to the current entry points and environment', () => {
    const readme = readRepoFile('README.md');

    for (const expected of [
      'Windows native',
      'C:\\00_mycode\\Oh-MY-TradingView',
      '127.0.0.1:9222',
      'src/server.js',
      'src/connection.js',
      'src/cli/index.js',
      'src/tools/',
      'src/core/',
      '.github/workflows/',
      'python/night_batch.py',
      'artifacts/',
    ]) {
      assertContains(readme, expected, 'README');
    }

    assert.match(readme, /WSL[^\n]*(legacy|optional)/i, 'README must label WSL as legacy or optional');
  });

  it('docs index exists and routes the main documentation areas', () => {
    const docsReadmePath = join(PROJECT_ROOT, 'docs', 'README.md');
    assert.ok(existsSync(docsReadmePath), 'docs/README.md must exist');
    assert.ok(statSync(docsReadmePath).isFile(), 'docs/README.md must be a file');

    const docsReadme = readRepoFile('docs', 'README.md');
    for (const expected of [
      'exec-plans',
      'strategy',
      'research',
      'reports',
      'references',
      'sessions',
      'archive',
      'generated',
    ]) {
      assertContains(docsReadme, expected, 'docs/README.md');
    }
  });

  it('README and docs index only link to existing local paths', () => {
    assertLocalLinksExist('README.md');
    assertLocalLinksExist(join('docs', 'README.md'));
  });
});
