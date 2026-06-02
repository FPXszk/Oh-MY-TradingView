import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyThemeForMarket,
  classifyUsTheme,
  getSectorThemeHierarchyForMarket,
  getUsSectorThemeHierarchy,
  summarizeThemes,
} from '../src/core/theme-taxonomy.js';

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
      subThemes: ['HBM / DRAM'],
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
  assert.equal(themes[0].averageRankScore, 95.8);
});

test('summarizeThemes no longer adds external confirmation bonuses', () => {
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

  assert.deepEqual(themes.map((entry) => entry.theme), ['Cybersecurity', 'Space']);
  assert.equal(themes[0].averageRankScore, 80);
  assert.equal(themes[1].averageRankScore, 80);
});

test('classifyUsTheme maps MU to Memory / HBM / DRAM', () => {
  const row = {
    symbol: 'MU',
    sector: 'Electronic Technology',
    industry: 'Semiconductors',
    companyName: 'Micron Technology, Inc.',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Memory');
  assert.equal(classification.subThemes[0], 'HBM / DRAM');
  assert.match(classification.themeMatchReason, /HBM \/ DRAM:symbol=MU/);
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

test('classifyUsTheme maps STX to Memory / NAND / Storage', () => {
  const row = {
    symbol: 'STX',
    sector: 'Electronic Technology',
    industry: 'Computer Peripherals',
    companyName: 'Seagate Technology Holdings plc',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Memory');
  assert.equal(classification.subThemes[0], 'NAND / Storage');
  assert.match(classification.themeMatchReason, /NAND \/ Storage:symbol=STX/);
});

test('classifyUsTheme maps KLAC to Semiconductor Equipment / Test / Metrology / Inspection', () => {
  const row = {
    symbol: 'KLAC',
    sector: 'Electronic Technology',
    industry: 'Electronic Production Equipment',
    companyName: 'KLA Corporation',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Semiconductor Equipment');
  assert.equal(classification.subThemes[0], 'Test / Metrology / Inspection');
  assert.match(classification.themeMatchReason, /Test \/ Metrology \/ Inspection:symbol=KLAC/);
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

test('classifyUsTheme maps QRVO to Connectivity / Networking / RF / Mobile Connectivity', () => {
  const row = {
    symbol: 'QRVO',
    sector: 'Electronic Technology',
    industry: 'Semiconductors',
    companyName: 'Qorvo, Inc.',
  };

  const classification = classifyUsTheme(row);

  assert.equal(classification.primaryTheme, 'Connectivity / Networking');
  assert.equal(classification.subThemes[0], 'RF / Mobile Connectivity');
  assert.match(classification.themeMatchReason, /RF \/ Mobile Connectivity:symbol=QRVO/);
});

test('getUsSectorThemeHierarchy exposes the external Electronic Technology hierarchy definition', () => {
  const hierarchy = getUsSectorThemeHierarchy('Electronic Technology');

  assert.equal(hierarchy?.version, 'us-theme-hierarchy-v1');
  assert.equal(hierarchy?.middleThemes.length, 8);
  assert.deepEqual(
    hierarchy?.middleThemes.map((entry) => entry.label),
    [
      'AI Compute',
      'Memory',
      'Semiconductor Equipment',
      'Connectivity / Networking',
      'Optical / Photonics',
      'Electronic Components',
      'Defense / Space Electronics',
      'Industrial / Power Electronics',
    ],
  );
});

test('classifyThemeForMarket maps 6981 to Electronic Components / Passives / RF Modules in japan', () => {
  const row = {
    symbol: '6981',
    sector: 'Electronic Technology',
    industry: 'Electronic Components',
    companyName: 'Murata Manufacturing Co., Ltd.',
  };

  const classification = classifyThemeForMarket(row, 'japan');

  assert.equal(classification.primaryTheme, 'Electronic Components');
  assert.equal(classification.subThemes[0], 'Passives / RF Modules');
  assert.match(classification.themeMatchReason, /Passives \/ RF Modules:symbol=6981/);
  assert.deepEqual(classification.externalConfirmedBy, ['Minkabu']);
});

test('classifyThemeForMarket maps 9984 to AI / Data Center / AI Infrastructure in japan', () => {
  const row = {
    symbol: '9984',
    sector: 'Communications',
    industry: 'Wireless Telecommunications',
    companyName: 'SoftBank Group Corp.',
  };

  const classification = classifyThemeForMarket(row, 'japan');

  assert.equal(classification.primaryTheme, 'AI / Data Center');
  assert.equal(classification.subThemes[0], 'AI Infrastructure');
  assert.match(classification.themeMatchReason, /AI Infrastructure:symbol=9984/);
});

test('classifyThemeForMarket maps 285A to AI / Data Center / Data Center Memory in japan', () => {
  const row = {
    symbol: '285A',
    sector: 'Electronic Technology',
    industry: 'Semiconductors',
    companyName: 'Kioxia Holdings Corporation',
  };

  const classification = classifyThemeForMarket(row, 'japan');

  assert.equal(classification.primaryTheme, 'AI / Data Center');
  assert.equal(classification.subThemes[0], 'Data Center Memory');
  assert.match(classification.themeMatchReason, /Data Center Memory:symbol=285A/);
});

test('getSectorThemeHierarchyForMarket exposes the Japan Producer Manufacturing hierarchy definition', () => {
  const hierarchy = getSectorThemeHierarchyForMarket('japan', 'Producer Manufacturing');

  assert.equal(hierarchy?.version, 'jp-theme-hierarchy-v1');
  assert.deepEqual(
    hierarchy?.middleThemes.map((entry) => entry.label),
    ['Semiconductor Equipment', 'Electric Wire / Grid'],
  );
});
