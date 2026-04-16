import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SKILLS_DIR = resolve(import.meta.dirname, '..', '.agents', 'skills');

const REQUIRED_FRONTMATTER_KEYS = ['name', 'description'];
const REQUIRED_SECTIONS = ['When to Use', 'Anti-Patterns'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const pairs = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      pairs[key] = value;
    }
  }
  return pairs;
}

function extractHeadings(content) {
  const headings = [];
  for (const line of content.split('\n')) {
    const match = line.match(/^#{1,6}\s+(.+)/);
    if (match) headings.push(match[1].trim());
  }
  return headings;
}

describe('agent skill conformance', () => {
  const skillDirs = existsSync(SKILLS_DIR)
    ? readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  it('skills directory exists and has entries', () => {
    assert.ok(existsSync(SKILLS_DIR), '.agents/skills/ directory must exist');
    assert.ok(skillDirs.length > 0, 'at least one skill directory must exist');
  });

  const TRADINGVIEW_SKILLS = [
    'tradingview-operator-playbook',
    'tradingview-research-capture',
  ];

  for (const skillName of TRADINGVIEW_SKILLS) {
    describe(`skill: ${skillName}`, () => {
      const skillDir = join(SKILLS_DIR, skillName);
      const skillFile = join(skillDir, 'SKILL.md');

      it('directory exists', () => {
        assert.ok(existsSync(skillDir), `${skillName}/ must exist`);
      });

      it('SKILL.md exists', () => {
        assert.ok(existsSync(skillFile), `${skillName}/SKILL.md must exist`);
      });

      it('has valid frontmatter', () => {
        const content = readFileSync(skillFile, 'utf8');
        const fm = parseFrontmatter(content);
        assert.ok(fm, 'frontmatter block (---) must exist');
        for (const key of REQUIRED_FRONTMATTER_KEYS) {
          assert.ok(fm[key], `frontmatter must have "${key}"`);
          assert.ok(fm[key].length > 0, `frontmatter "${key}" must not be empty`);
        }
      });

      it('has required sections', () => {
        const content = readFileSync(skillFile, 'utf8');
        const headings = extractHeadings(content);
        for (const section of REQUIRED_SECTIONS) {
          assert.ok(
            headings.some((h) => h.includes(section)),
            `SKILL.md must have a "${section}" section`,
          );
        }
      });

      it('name in frontmatter matches directory name', () => {
        const content = readFileSync(skillFile, 'utf8');
        const fm = parseFrontmatter(content);
        assert.ok(fm, 'frontmatter must exist');
        assert.equal(fm.name, skillName, 'frontmatter name must match directory name');
      });
    });
  }
});
