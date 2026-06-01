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

test('classifyUsTheme maps MU to Memory / HBM/DRAM', () => {
  const row = {
    symbol: 'MU',
    sector: 'Electronic Technology',
    industry: 'Semiconductors',
    companyName: 'Micron Technology, Inc.',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Memory');
  assert.equal(classification.subThemes[0], 'HBM/DRAM');
  assert.match(classification.themeMatchReason, /HBM\/DRAM:symbol=MU/);
});

test('classifyUsTheme maps NVDA to AI Compute / AI Accelerators', () => {
  const row = {
    symbol: 'NVDA',
    sector: 'Electronic Technology',
    industry: 'Semiconductors',
    companyName: 'NVIDIA Corporation',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'AI Compute');
  assert.equal(classification.subThemes[0], 'AI Accelerators');
  assert.match(classification.themeMatchReason, /AI Accelerators:symbol=NVDA/);
});

test('classifyUsTheme maps STX to Memory / NAND/Storage', () => {
  const row = {
    symbol: 'STX',
    sector: 'Electronic Technology',
    industry: 'Computer Peripherals',
    companyName: 'Seagate Technology Holdings plc',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Memory');
  assert.equal(classification.subThemes[0], 'NAND/Storage');
  assert.match(classification.themeMatchReason, /NAND\/Storage:symbol=STX/);
});

test('classifyUsTheme maps KLAC to Semiconductor Equipment / Test & Metrology', () => {
  const row = {
    symbol: 'KLAC',
    sector: 'Electronic Technology',
    industry: 'Electronic Production Equipment',
    companyName: 'KLA Corporation',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Semiconductor Equipment');
  assert.equal(classification.subThemes[0], 'Test & Metrology');
  assert.match(classification.themeMatchReason, /Test & Metrology:symbol=KLAC/);
});

test('classifyUsTheme maps COHR to Optical / Photonics / Laser / Photonics', () => {
  const row = {
    symbol: 'COHR',
    sector: 'Electronic Technology',
    industry: 'Electronic Production Equipment',
    companyName: 'Coherent Corp.',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Optical / Photonics');
  assert.equal(classification.subThemes[0], 'Laser / Photonics');
  assert.match(classification.themeMatchReason, /Laser \/ Photonics:symbol=COHR/);
});

test('classifyUsTheme maps QRVO to Connectivity Silicon / RF / Mobile Connectivity', () => {
  const row = {
    symbol: 'QRVO',
    sector: 'Electronic Technology',
    industry: 'Semiconductors',
    companyName: 'Qorvo, Inc.',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Connectivity Silicon');
  assert.equal(classification.subThemes[0], 'RF / Mobile Connectivity');
  assert.match(classification.themeMatchReason, /RF \/ Mobile Connectivity:symbol=QRVO/);
});
