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
  assert.equal(classification.externalConfirmationCount, 4);
  assert.deepEqual(classification.externalConfirmedBy, ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo']);
});

test('summarizeThemes groups the classified ITRN row under Connected Mobility', () => {
  const themes = summarizeThemes([
    {
      symbol: 'ITRN',
      primaryThemeId: 'connected-mobility',
      primaryTheme: 'Connected Mobility',
      subThemes: ['Telematics & Fleet Connectivity'],
      perf3m: 36.6,
      rankScore: 83.5,
      externalConfirmedBy: ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo'],
    },
    {
      symbol: 'MU',
      primaryThemeId: 'memory',
      primaryTheme: 'Memory',
      subThemes: ['HBM/DRAM'],
      perf3m: 53.5,
      rankScore: 95.8,
      externalConfirmedBy: ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo'],
    },
  ]);

  assert.deepEqual(
    themes.map((entry) => entry.theme),
    ['Memory', 'Connected Mobility'],
  );
  assert.deepEqual(themes[1].topSubThemes, ['Telematics & Fleet Connectivity']);
  assert.equal(themes[0].externalConfirmationCount, 4);
  assert.deepEqual(themes[0].externalConfirmedBy, ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo']);
  assert.equal(themes[0].externalConfirmationScore, 5);
  assert.equal(themes[0].spKenshoBonus, 0);
  assert.equal(themes[0].themeHeatScore, 100.8);
});

test('summarizeThemes gives a small bonus to themes confirmed by S&P Kensho', () => {
  const themes = summarizeThemes([
    {
      symbol: 'RKLB',
      primaryThemeId: 'space',
      primaryTheme: 'Space',
      subThemes: ['Launch'],
      perf3m: 20,
      rankScore: 80,
      externalConfirmedBy: ['Morningstar', 'MSCI', 'S&P Kensho', 'moomoo'],
    },
    {
      symbol: 'CRWD',
      primaryThemeId: 'cybersecurity',
      primaryTheme: 'Cybersecurity',
      subThemes: ['Endpoint Security'],
      perf3m: 20,
      rankScore: 80,
      externalConfirmedBy: ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo'],
    },
  ]);

  assert.deepEqual(themes.map((entry) => entry.theme), ['Space', 'Cybersecurity']);
  assert.equal(themes[0].hasSpKenshoConfirmation, true);
  assert.equal(themes[0].spKenshoBonus, 1);
  assert.equal(themes[0].themeHeatScore, 86);
  assert.equal(themes[1].hasSpKenshoConfirmation, false);
  assert.equal(themes[1].themeHeatScore, 85);
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
  assert.deepEqual(classification.externalConfirmedBy, ['Morningstar', 'MSCI', 'Nasdaq', 'moomoo']);
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
