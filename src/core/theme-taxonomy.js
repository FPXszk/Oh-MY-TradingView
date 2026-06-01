import { readFileSync } from 'node:fs';

const US_THEME_TAXONOMY = JSON.parse(
  readFileSync(new URL('../../config/screener/theme-taxonomy-us.json', import.meta.url), 'utf8'),
);
const US_EXTERNAL_THEME_REFERENCE = JSON.parse(
  readFileSync(new URL('../../config/screener/external-theme-reference-us.json', import.meta.url), 'utf8'),
);

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function includesAny(text, needles) {
  const normalizedText = normalizeText(text);
  return (needles || []).find((needle) => normalizedText.includes(normalizeText(needle))) ?? null;
}

const EXTERNAL_CONFIRMATION_POINT = 1.25;
const SP_KENSHO_BONUS_POINT = 1.0;

function getExternalThemeReference(themeId) {
  return US_EXTERNAL_THEME_REFERENCE?.themes?.[themeId] ?? null;
}

function buildExternalConfirmation(themeId) {
  const providers = getExternalThemeReference(themeId)?.providers ?? [];
  return {
    externalThemeReferenceVersion: US_EXTERNAL_THEME_REFERENCE.version,
    externalThemeReferences: providers.map((provider) => ({
      source: provider.source,
      label: provider.label,
      confidence: provider.confidence,
    })),
    externalConfirmedBy: uniqueStrings(providers.map((provider) => provider.source)),
    externalConfirmationCount: uniqueStrings(providers.map((provider) => provider.source)).length,
  };
}

function scoreDescriptor(row, descriptor, themeLabel) {
  const sectors = descriptor.sectors ?? [];
  if (sectors.length > 0 && !sectors.includes(row.sector)) {
    return null;
  }

  const reasons = [];
  let score = 0;

  if ((descriptor.symbols ?? []).includes(row.symbol)) {
    score += 100;
    reasons.push(`${themeLabel}:symbol=${row.symbol}`);
  }

  const industryKeyword = includesAny(row.industry, descriptor.industry_keywords);
  if (industryKeyword) {
    score += 40;
    reasons.push(`${themeLabel}:industry~${industryKeyword}`);
  }

  const companyKeyword = includesAny(row.companyName, descriptor.company_keywords);
  if (companyKeyword) {
    score += 20;
    reasons.push(`${themeLabel}:company~${companyKeyword}`);
  }

  if (score === 0 && descriptor.allow_sector_only) {
    score += 10;
    reasons.push(`${themeLabel}:sector=${row.sector}`);
  }

  if (score === 0) return null;

  return {
    score,
    reasons,
  };
}

function classifyTheme(row, theme) {
  const subThemeMatches = (theme.subthemes || [])
    .map((subtheme) => {
      const match = scoreDescriptor(
        row,
        {
          sectors: theme.sectors,
          ...subtheme,
        },
        subtheme.label,
      );
      return match
        ? {
          id: subtheme.id,
          label: subtheme.label,
          score: match.score,
          reasons: match.reasons,
        }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  const themeLevelMatch = scoreDescriptor(row, theme, theme.label);
  const themeScore = Math.max(themeLevelMatch?.score ?? 0, subThemeMatches[0]?.score ?? 0);

  if (themeScore <= 0) return null;

  const reasons = uniqueStrings([
    ...(themeLevelMatch?.reasons ?? []),
    ...subThemeMatches.flatMap((entry) => entry.reasons),
  ]);

  return {
    id: theme.id,
    label: theme.label,
    score: themeScore,
    subThemes: subThemeMatches.map((entry) => ({
      id: entry.id,
      label: entry.label,
      score: entry.score,
    })),
    reasons,
  };
}

export function classifyUsTheme(row) {
  const matches = (US_THEME_TAXONOMY.medium_themes || [])
    .map((theme, index) => {
      const match = classifyTheme(row, theme);
      return match ? { ...match, index } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const primary = matches[0] ?? null;

  return {
    taxonomyVersion: US_THEME_TAXONOMY.version,
    primaryThemeId: primary?.id ?? null,
    primaryTheme: primary?.label ?? 'Unclassified',
    subThemeIds: uniqueStrings(primary?.subThemes?.map((entry) => entry.id) ?? []),
    subThemes: uniqueStrings(primary?.subThemes?.map((entry) => entry.label) ?? []),
    themeMatchReason: primary?.reasons?.join(', ') ?? 'no-theme-match',
    matchedThemeIds: matches.map((entry) => entry.id),
    matchedThemes: matches.map((entry) => entry.label),
    ...buildExternalConfirmation(primary?.id ?? null),
  };
}

export function summarizeThemes(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.primaryTheme ?? 'Unclassified';
    if (!grouped.has(key)) {
      grouped.set(key, {
        theme: key,
        count: 0,
        totalPerf3m: 0,
        perf3mCount: 0,
        totalRankScore: 0,
        subThemeCounts: new Map(),
        externalConfirmedBy: [],
      });
    }

    const entry = grouped.get(key);
    entry.count += 1;
    entry.totalRankScore += row.rankScore ?? 0;
    if (row.perf3m !== null && row.perf3m !== undefined) {
      entry.totalPerf3m += row.perf3m;
      entry.perf3mCount += 1;
    }
    (row.subThemes || []).forEach((subTheme) => {
      entry.subThemeCounts.set(subTheme, (entry.subThemeCounts.get(subTheme) ?? 0) + 1);
    });
    (row.externalConfirmedBy || []).forEach((provider) => {
      if (!entry.externalConfirmedBy.includes(provider)) {
        entry.externalConfirmedBy.push(provider);
      }
    });
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      averageRankScore: entry.count > 0
        ? Number((entry.totalRankScore / entry.count).toFixed(1))
        : null,
      theme: entry.theme,
      count: entry.count,
      averagePerf3m: entry.perf3mCount > 0
        ? Number((entry.totalPerf3m / entry.perf3mCount).toFixed(1))
        : null,
      topSubThemes: Array.from(entry.subThemeCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 3)
        .map(([label]) => label),
      externalConfirmedBy: entry.externalConfirmedBy,
      externalConfirmationCount: entry.externalConfirmedBy.length,
    }))
    .map((entry) => {
      const hasSpKenshoConfirmation = entry.externalConfirmedBy.includes('S&P Kensho');
      const externalConfirmationScore = Number((entry.externalConfirmationCount * EXTERNAL_CONFIRMATION_POINT).toFixed(2));
      const spKenshoBonus = hasSpKenshoConfirmation ? SP_KENSHO_BONUS_POINT : 0;
      const baseRankScore = entry.averageRankScore ?? 0;
      return {
        ...entry,
        hasSpKenshoConfirmation,
        externalConfirmationScore,
        spKenshoBonus,
        themeHeatScore: Number((baseRankScore + externalConfirmationScore + spKenshoBonus).toFixed(2)),
      };
    })
    .sort((a, b) => {
      if (b.themeHeatScore !== a.themeHeatScore) {
        return (b.themeHeatScore ?? -Infinity) - (a.themeHeatScore ?? -Infinity);
      }
      if (b.averageRankScore !== a.averageRankScore) {
        return (b.averageRankScore ?? -Infinity) - (a.averageRankScore ?? -Infinity);
      }
      if (b.averagePerf3m !== a.averagePerf3m) {
        return (b.averagePerf3m ?? -Infinity) - (a.averagePerf3m ?? -Infinity);
      }
      if (b.count !== a.count) return b.count - a.count;
      return a.theme.localeCompare(b.theme);
    });
}
