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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMarkdownSection(text, heading) {
  const startPattern = new RegExp(`^## ${escapeRegExp(heading)}\\r?\\n`, 'm');
  const startMatch = text.match(startPattern);
  assert.ok(startMatch, `missing markdown section: ${heading}`);
  const bodyStart = startMatch.index + startMatch[0].length;
  const nextHeading = text.slice(bodyStart).search(/^## /m);
  return nextHeading === -1 ? text.slice(bodyStart) : text.slice(bodyStart, bodyStart + nextHeading);
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

  it('documents the trade decision gate contract', () => {
    const tradeSkillPath = join(SKILLS_DIR, 'trade-decision-gate', 'SKILL.md');
    assert.ok(existsSync(tradeSkillPath), 'trade-decision-gate skill should exist');

    const text = readText(tradeSkillPath);
    const frontMatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(frontMatter, 'trade-decision-gate skill is missing front matter');
    assert.match(frontMatter[1], /^name:\s*trade-decision-gate$/m);
    assert.match(frontMatter[1], /^description:\s*.+buy.+hold.+sell.+portfolio.+$/m);

    for (const required of [
      'docs/strategy/Trade-rule.md',
      '.agents/skills/tradingview-operator-playbook/SKILL.md',
      'GO / STAY / STOP',
      'NEW_ENTRY',
      'ADD_POSITION',
      'HOLD_OR_EXIT',
      'PORTFOLIO_RISK',
      '.github/workflows/daily-screener.yml',
      'docs/reports/screener/daily-ranking.md',
      'docs/reports/screener/daily-ranking-run.json',
      '.github/workflows/daily-screener-japan.yml',
      'docs/reports/screener/daily-ranking-jp.md',
      'docs/reports/screener/daily-ranking-jp-run.json',
      'Return `STAY`',
      'read-only',
      'Dr.K reports',
      'optional supporting material',
      'HOLD_OR_EXIT + GO',
      'Do not use',
      'PORTFOLIO_RISK + GO',
      'US / JP / MIXED',
      'GitHub connector',
      'gh run list --workflow daily-screener.yml',
      'gh run list --workflow daily-screener-japan.yml',
    ]) {
      assert.ok(text.includes(required), `trade-decision-gate missing contract text: ${required}`);
    }

    const readOnlySection = extractMarkdownSection(text, 'Read-Only Constraint');
    for (const prohibitedOperation of ['注文発注', '注文変更', '注文取消', '取引ロック解除']) {
      assert.match(
        readOnlySection,
        new RegExp(`${prohibitedOperation}\\s+is prohibited`),
        `trade-decision-gate should prohibit ${prohibitedOperation} in read-only section`,
      );
    }
    assert.doesNotMatch(readOnlySection, /\bmay\s+(place|modify|cancel|unlock|submit)\b/i);
    assert.doesNotMatch(readOnlySection, /\ballow(?:s|ed)?\s+(order|trade|unlock)/i);
    assert.doesNotMatch(readOnlySection, /\bplace\s+orders?\b/i);

    assert.doesNotMatch(text, /Dr\.K reports[\s\S]{0,120}Always read/i);

    const prioritySection = extractMarkdownSection(text, 'Judgment Priority');
    assert.ok(
      prioritySection.indexOf('confirmed `STOP` condition') < prioritySection.indexOf('required information for `GO` is missing'),
      'confirmed STOP conditions must be prioritized before missing-info STAY',
    );

    const modeSection = extractMarkdownSection(text, 'Mode Workflows');
    for (const mode of ['NEW_ENTRY', 'ADD_POSITION', 'HOLD_OR_EXIT', 'PORTFOLIO_RISK']) {
      assert.match(modeSection, new RegExp(`### ${mode}`), `missing workflow for ${mode}`);
    }
    assert.match(modeSection, /Do not make these new-entry requirements unconditional for `HOLD_OR_EXIT`/);
    assert.match(modeSection, /Do not make these single-symbol checks unconditional for `PORTFOLIO_RISK`/);
    assert.match(modeSection, /One symbol's valid pivot/);

    const labelSection = extractMarkdownSection(text, 'Label Meanings');
    assert.match(labelSection, /`HOLD_OR_EXIT \+ GO`: Do not use\./);
    assert.match(labelSection, /`PORTFOLIO_RISK \+ GO`: There is room to take new risk\. This does not approve buying a specific symbol\./);
    assert.match(labelSection, /対象市場` to `US`, `JP`, or `MIXED`/);

    const outputSection = extractMarkdownSection(text, 'Output Format');
    assert.ok(
      outputSection.indexOf('# 判定: GO / STAY / STOP') < outputSection.indexOf('確認時刻:'),
      '# 判定 must appear before 確認時刻 in output format',
    );
    for (const holdField of [
      '平均取得価格:',
      '現在価格:',
      '含み損益率:',
      '現在の無効化ライン:',
      '保有継続条件:',
      '縮小条件:',
      '売却・損切り条件:',
      '利益管理:',
    ]) {
      assert.ok(outputSection.includes(holdField), `missing HOLD_OR_EXIT output field: ${holdField}`);
    }
    for (const portfolioField of [
      '総資産:',
      '現金残高:',
      '現金比率:',
      '建玉総額:',
      '建玉倍率:',
      '全ストップ発動時の想定損失:',
      '最大銘柄比率:',
      '最大セクター比率:',
      'テーマ重複:',
      '相関リスク:',
      'イベント集中:',
      '縮小優先候補:',
      '新規リスク余地:',
    ]) {
      assert.ok(outputSection.includes(portfolioField), `missing PORTFOLIO_RISK output field: ${portfolioField}`);
    }

    const runSection = extractMarkdownSection(text, 'Latest Successful Screener Run');
    assert.match(runSection, /Available GitHub connector \/ GitHub API tool/);
    assert.match(runSection, /gh run list --workflow daily-screener\.yml/);
    assert.match(runSection, /gh run list --workflow daily-screener-japan\.yml/);
    assert.match(runSection, /Repository run metadata and report body/);
  });
});
