import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const SKILLS_DIR = join(PROJECT_ROOT, '.agents', 'skills');

function getSkillFiles() {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(SKILLS_DIR, entry.name, 'SKILL.md'))
    .filter((skillPath) => existsSync(skillPath));
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

function toRepoRelative(path) {
  return path
    .slice(PROJECT_ROOT.length + 1)
    .replaceAll('\\', '/');
}

const prohibitedStrings = [
  'post_buz.yml',
  'auto_follow.yml',
  'auto_like.yml',
  'morning_post.yml',
  'evening_post.yml',
  'twitter_diagnostic.yml',
  'python3 -m unittest discover -s tests',
  'night-batch-results',
  'SQL todos',
];

const requiredRepoReferences = [
  '.agents/skills/',
  'docs/exec-plans/active/',
  'docs/exec-plans/completed/',
  '.github/workflows/night-batch-self-hosted.yml',
  'scripts/windows/github-actions/find-night-batch-outputs.ps1',
  'docs/research/manifest.json',
];

const twitterWritePatterns = [
  /\btwitter\s+post\b/i,
  /\btwitter\s+reply\b/i,
  /\btwitter\s+quote\b/i,
  /\btwitter\s+delete\b/i,
  /\btwitter\s+like\b/i,
  /\btwitter\s+unlike\b/i,
  /\btwitter\s+retweet\b/i,
  /\btwitter\s+follow\b/i,
  /\btwitter\s+unfollow\b/i,
  /\btv\s+x\s+(post|reply|quote|delete|like|unlike|retweet|follow|unfollow)\b/i,
  /\bx_(post|reply|quote|delete|like|unlike|retweet|follow|unfollow)\b/i,
];

describe('agent skills contract', () => {
  it('has readable skill files with name and description front matter', () => {
    const skillFiles = getSkillFiles();
    assert.ok(skillFiles.length > 0, 'expected at least one skill file');

    for (const skillFile of skillFiles) {
      const text = readText(skillFile);
      const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      assert.ok(frontMatter, `${toRepoRelative(skillFile)} is missing front matter`);
      assert.match(frontMatter[1], /^name:\s*\S+/m, `${toRepoRelative(skillFile)} is missing name`);
      assert.match(frontMatter[1], /^description:\s*\S+/m, `${toRepoRelative(skillFile)} is missing description`);
    }
  });

  it('does not contain known stale workflow, command, or artifact strings in skills', () => {
    for (const skillFile of getSkillFiles()) {
      const text = readText(skillFile);
      for (const prohibited of prohibitedStrings) {
        assert.equal(
          text.includes(prohibited),
          false,
          `${toRepoRelative(skillFile)} contains stale string: ${prohibited}`,
        );
      }
    }
  });

  it('keeps important repo-local references visible and real', () => {
    const corpusPaths = [
      join(PROJECT_ROOT, 'README.md'),
      ...getSkillFiles(),
    ];
    const corpus = corpusPaths.map(readText).join('\n');

    for (const repoRef of requiredRepoReferences) {
      assert.ok(corpus.includes(repoRef), `missing repo reference: ${repoRef}`);
      assert.ok(existsSync(join(PROJECT_ROOT, ...repoRef.split('/'))), `referenced path does not exist: ${repoRef}`);
    }
  });

  it('keeps the Twitter/X skill read-only', () => {
    const twitterSkill = join(SKILLS_DIR, 'twitter-cli', 'SKILL.md');
    const text = readText(twitterSkill);

    for (const pattern of twitterWritePatterns) {
      assert.equal(pattern.test(text), false, `twitter-cli skill contains write command pattern: ${pattern}`);
    }
  });

  it('uses the current Night Batch artifact naming contract', () => {
    const backtestSkill = readText(join(SKILLS_DIR, 'backtest-results-capture', 'SKILL.md'));
    assert.match(backtestSkill, /night-batch-\{github\.run_id\}-\{github\.run_attempt\}/);
  });
});
