import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyUsTheme, summarizeThemes } from '../src/core/theme-taxonomy.js';

test('classifyUsTheme maps ITRN to Connected Mobility instead of Unclassified', () => {
  const row = {
    symbol: 'ITRN',
    sector: 'Communications',
    industry: 'Specialty Telecommunications',
    companyName: 'Ituran Location and Control Ltd.',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Connected Mobility');
  assert.deepEqual(classification.subThemes, ['Telematics & Fleet Connectivity']);
  assert.match(classification.themeMatchReason, /Telematics & Fleet Connectivity:symbol=ITRN/);
  assert.ok(classification.matchedThemes.includes('Connected Mobility'));
});

test('summarizeThemes groups the classified ITRN row under Connected Mobility', () => {
  const themes = summarizeThemes([
    {
      symbol: 'ITRN',
      primaryTheme: 'Connected Mobility',
      subThemes: ['Telematics & Fleet Connectivity'],
      perf3m: 36.6,
      rankScore: 83.5,
    },
    {
      symbol: 'MU',
      primaryTheme: 'Memory',
      subThemes: ['HBM/DRAM'],
      perf3m: 53.5,
      rankScore: 95.8,
    },
  ]);

  assert.deepEqual(
    themes.map((entry) => entry.theme),
    ['Memory', 'Connected Mobility'],
  );
  assert.deepEqual(themes[1].topSubThemes, ['Telematics & Fleet Connectivity']);
});
