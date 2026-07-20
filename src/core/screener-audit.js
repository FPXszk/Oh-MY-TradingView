const AUDITED_METRICS = [
  'fcfTtm',
  'fcfMargin',
  'fcfGrowthTtm',
  'cashFromOperationsTtm',
  'cashConversion',
  'pFcf',
  'revenueGrowthTtm',
];

function rowKey(row) {
  return `${row.exchange ?? ''}:${row.symbol ?? ''}`.toUpperCase();
}

function displayName(row) {
  return row.companyNameJa ? `${row.symbol} (${row.companyNameJa})` : row.symbol;
}

function getRankingRows(result) {
  if (Array.isArray(result?.unifiedAuditRows) && result.unifiedAuditRows.length > 0) {
    return result.unifiedAuditRows;
  }
  if (Array.isArray(result?.unifiedPhase4Ranking) && result.unifiedPhase4Ranking.length > 0) {
    return result.unifiedPhase4Ranking;
  }
  if (Array.isArray(result?.finalStockRanking) && result.finalStockRanking.length > 0) {
    return result.finalStockRanking;
  }
  return Array.isArray(result?.results) ? result.results : [];
}

function isFiniteMetric(value) {
  return value === null || value === undefined || Number.isFinite(Number(value));
}

function buildTop10(rows, rankField = null, scoreField = null) {
  return rows
    .filter((row) => !rankField || (Number.isFinite(row[rankField]) && row[rankField] <= 10))
    .sort((left, right) => {
      const leftRank = rankField ? left[rankField] : rows.indexOf(left) + 1;
      const rightRank = rankField ? right[rankField] : rows.indexOf(right) + 1;
      return leftRank - rightRank;
    })
    .slice(0, 10)
    .map((row, index) => ({
      rank: rankField ? row[rankField] : index + 1,
      symbol: row.symbol,
      exchange: row.exchange ?? null,
      companyName: row.companyNameJa ?? row.companyName ?? null,
      score: scoreField ? row[scoreField] ?? null : row.unifiedRankScore ?? row.rankScore ?? null,
    }));
}

function buildRankChanges(rows) {
  return rows
    .filter((row) => (
      Number.isFinite(row.unifiedRankBeforeSupplement ?? row.rankBeforeSupplement)
      || Number.isFinite(row.unifiedRankAfterSupplement ?? row.rankAfterSupplement)
    ))
    .map((row) => ({
      symbol: row.symbol,
      companyName: row.companyNameJa ?? row.companyName ?? null,
      rankBeforeSupplement: row.unifiedRankBeforeSupplement ?? row.rankBeforeSupplement,
      rankAfterSupplement: row.unifiedRankAfterSupplement ?? row.rankAfterSupplement,
      unifiedRankBeforeSupplement: row.unifiedRankBeforeSupplement ?? row.rankBeforeSupplement,
      unifiedRankAfterSupplement: row.unifiedRankAfterSupplement ?? row.rankAfterSupplement,
      rankDelta: row.unifiedRankDelta ?? row.rankDelta,
      unifiedRankDelta: row.unifiedRankDelta ?? row.rankDelta,
      scoreBeforeSupplement: row.unifiedScoreBeforeSupplement ?? row.scoreBeforeSupplement ?? null,
      scoreAfterSupplement: row.unifiedScoreAfterSupplement ?? row.scoreAfterSupplement ?? row.unifiedRankScore ?? row.rankScore ?? null,
      unifiedScoreBeforeSupplement: row.unifiedScoreBeforeSupplement ?? row.scoreBeforeSupplement ?? null,
      unifiedScoreAfterSupplement: row.unifiedScoreAfterSupplement ?? row.scoreAfterSupplement ?? row.unifiedRankScore ?? row.rankScore ?? null,
      scoreDelta: row.unifiedScoreDelta ?? row.scoreDelta ?? null,
      unifiedScoreDelta: row.unifiedScoreDelta ?? row.scoreDelta ?? null,
      changedMetrics: row.changedMetrics ?? AUDITED_METRICS.filter((metricName) => {
        const provenance = row.metricProvenance?.[metricName];
        return provenance?.previousValue !== undefined && provenance.previousValue !== provenance.finalValue;
      }),
      metricSourcesBefore: row.metricSourcesBefore ?? {},
      metricSourcesAfter: row.metricSourcesAfter ?? {},
      phase4EligibleBefore: row.phase4EligibleBefore ?? row.phase4Eligible ?? false,
      phase4EligibleAfter: row.phase4EligibleAfter ?? row.phase4Eligible ?? false,
      phase5EligibleBefore: row.phase5EligibleBefore ?? row.phase5Eligible ?? false,
      phase5EligibleAfter: row.phase5EligibleAfter ?? row.phase5Eligible ?? false,
      sources: row.metricSourcesAfter ?? Object.fromEntries(AUDITED_METRICS.map((metricName) => [
        metricName,
        row.metricProvenance?.[metricName]?.source ?? null,
      ])),
    }))
    .sort((left, right) => Math.abs(right.rankDelta ?? 0) - Math.abs(left.rankDelta ?? 0));
}

function buildMetricAnomalies(rows) {
  const anomalies = [];
  rows.forEach((row, rowIndex) => {
    AUDITED_METRICS.forEach((metricName) => {
      const provenance = row.metricProvenance?.[metricName];
      const value = row[metricName] ?? provenance?.finalValue ?? null;
      const warnings = provenance?.warnings ?? [];
      const status = provenance?.status ?? 'valid';
      if (status === 'valid' && warnings.length === 0 && isFiniteMetric(value)) return;
      anomalies.push({
        symbol: row.symbol,
        companyName: row.companyNameJa ?? row.companyName ?? null,
        rank: row.unifiedRank ?? rowIndex + 1,
        metricName,
        value,
        status: !isFiniteMetric(value) ? 'invalid' : status,
        rankEligible: provenance?.rankEligible ?? true,
        source: provenance?.source ?? 'unknown',
        reasons: !isFiniteMetric(value) ? ['non_finite'] : warnings,
        documentType: provenance?.documentType ?? row.edinetSupplement?.docDescription ?? null,
        periodStart: provenance?.periodStart ?? null,
        periodEnd: provenance?.periodEnd ?? null,
        consolidation: provenance?.consolidation ?? null,
        currency: provenance?.currency ?? null,
        sourceFile: provenance?.sourceFile ?? null,
      });
    });
  });
  return anomalies;
}

function comparePreviousTop10(previousAudit, currentTop10) {
  const previous = Array.isArray(previousAudit?.top10CurrentRun) ? previousAudit.top10CurrentRun : [];
  const previousBySymbol = new Map(previous.map((entry) => [entry.symbol, entry]));
  return currentTop10.map((entry) => {
    const before = previousBySymbol.get(entry.symbol);
    return {
      ...entry,
      previousRank: before?.rank ?? null,
      previousScore: before?.score ?? null,
      rankDeltaFromPrevious: before?.rank ? before.rank - entry.rank : null,
      scoreDeltaFromPrevious: Number.isFinite(before?.score) && Number.isFinite(entry.score)
        ? Number((entry.score - before.score).toFixed(4))
        : null,
      isNewTop10FromPrevious: !before,
    };
  });
}

function diffTop10(beforeTop10, afterTop10) {
  const beforeBySymbol = new Map(beforeTop10.map((entry) => [entry.symbol, entry]));
  const afterBySymbol = new Map(afterTop10.map((entry) => [entry.symbol, entry]));
  return {
    entered: afterTop10.filter((entry) => !beforeBySymbol.has(entry.symbol)),
    exited: beforeTop10.filter((entry) => !afterBySymbol.has(entry.symbol)),
    stayed: afterTop10
      .filter((entry) => beforeBySymbol.has(entry.symbol))
      .map((entry) => ({
        ...entry,
        previousRank: beforeBySymbol.get(entry.symbol)?.rank ?? null,
        rankDelta: beforeBySymbol.get(entry.symbol)?.rank
          ? beforeBySymbol.get(entry.symbol).rank - entry.rank
          : null,
      })),
  };
}

function buildDocumentSummary(result, rows) {
  const edinetMeta = result?.sourceDetails?.edinet ?? {};
  const unifiedMeta = result?.unifiedScoringMeta ?? result?.sourceDetails?.unifiedScoring ?? {};
  const evidenceRows = rows.filter((row) => row.edinetSupplement || Object.values(row.metricProvenance ?? {}).some((entry) => entry?.source === 'edinet'));
  const fallbackRows = rows.filter((row) => Object.values(row.metricProvenance ?? {}).some((entry) => entry?.source === 'tradingview'));
  return {
    requestedSymbols: edinetMeta.uniqueRequestedSymbols ?? edinetMeta.requestedSymbols ?? rows.length,
    phase4RequestedSymbols: edinetMeta.phase4RequestedSymbols ?? null,
    phase5RequestedSymbols: edinetMeta.phase5RequestedSymbols ?? null,
    overlapSymbols: edinetMeta.overlapSymbols ?? null,
    documentListRequests: edinetMeta.documentListRequests ?? null,
    documentDownloads: edinetMeta.documentDownloads ?? edinetMeta.downloadedRows ?? null,
    documentDownloadCacheHits: edinetMeta.documentDownloadCacheHits ?? null,
    parsedDocumentCacheHits: edinetMeta.parsedDocumentCacheHits ?? null,
    annualDocumentMatchedSymbols: edinetMeta.annualDocumentMatchedSymbols ?? null,
    annualDocumentMissingSymbols: edinetMeta.annualDocumentMissingSymbols ?? null,
    interimOnlySymbols: edinetMeta.interimOnlySymbols ?? null,
    candidatePopulationBeforeCount: unifiedMeta.candidatePopulationBeforeCount ?? null,
    candidatePopulationAfterCount: unifiedMeta.candidatePopulationAfterCount ?? null,
    candidatePopulationUnionCount: unifiedMeta.candidatePopulationUnionCount ?? rows.length,
    enteredCandidatePopulationCount: unifiedMeta.enteredCandidatePopulationCount ?? rows.filter((row) => row.enteredCandidatePopulation).length,
    exitedCandidatePopulationCount: unifiedMeta.exitedCandidatePopulationCount ?? rows.filter((row) => row.exitedCandidatePopulation).length,
    rankEligibleFalseMetrics: rows.reduce((sum, row) => (
      sum + AUDITED_METRICS.filter((metricName) => row.metricProvenance?.[metricName]?.rankEligible === false).length
    ), 0),
    rankingEligibleRows: evidenceRows.filter((row) => row.edinetSupplement?.rankEligible !== false).length,
    tradingViewFallbackRows: fallbackRows.length,
  };
}

export function buildScreenerAudit(result, { previousAudit = null, generatedAt = new Date().toISOString() } = {}) {
  const rows = getRankingRows(result);
  const seen = new Set();
  const errors = [];
  rows.forEach((row, index) => {
    const key = rowKey(row);
    if (seen.has(key)) errors.push({ symbol: row.symbol, reason: 'duplicate_symbol' });
    seen.add(key);
    const score = row.unifiedRankScore ?? row.rankScore;
    if (!Number.isFinite(Number(score))) {
      errors.push({ symbol: row.symbol, reason: 'score_non_finite', rank: index + 1 });
    }
  });

  const metricAnomalies = buildMetricAnomalies(rows);
  const criticalMetricAnomalies = metricAnomalies.filter((entry) => (
    entry.status === 'invalid'
    && entry.rankEligible === false
    && rows.find((row) => row.symbol === entry.symbol)?.[entry.metricName] !== null
    && rows.find((row) => row.symbol === entry.symbol)?.[entry.metricName] !== undefined
  ));
  const top3RankIneligible = rows.slice(0, 3).flatMap((row) => AUDITED_METRICS
    .filter((metricName) => row.metricProvenance?.[metricName]?.rankEligible === false && row[metricName] !== null && row[metricName] !== undefined)
    .map((metricName) => ({ symbol: row.symbol, metricName, reason: 'top3_rank_ineligible_metric_used' })));
  const edinetEvidenceErrors = rows.flatMap((row) => AUDITED_METRICS
    .filter((metricName) => {
      const provenance = row.metricProvenance?.[metricName];
      return provenance?.source === 'edinet'
        && provenance.rankEligible !== false
        && (!provenance.documentType
          || !provenance.periodStart
          || !provenance.periodEnd
          || !provenance.consolidation
          || !provenance.currency
          || !provenance.inputs);
    })
    .map((metricName) => ({ symbol: row.symbol, metricName, reason: 'edinet_evidence_incomplete' })));
  const edinetConsistencyErrors = rows.flatMap((row) => AUDITED_METRICS
    .filter((metricName) => {
      const provenance = row.metricProvenance?.[metricName];
      if (provenance?.source !== 'edinet' || provenance.rankEligible === false) return false;
      const warningReasons = [
        ...(provenance.warnings ?? []),
        ...(provenance.metricWarnings ?? []),
        ...(provenance.rowWarnings ?? []),
        ...(provenance.documentWarnings ?? []),
      ];
      return warningReasons.some((warning) => [
        'period_dates_missing',
        'not_full_year_duration',
        'consolidation_unknown',
        'currency_unknown',
        'non_consolidated_only_not_ranked',
        'revenue_missing',
        'operating_cash_flow_missing',
        'capex_ppe_missing',
      ].includes(warning));
    })
    .map((metricName) => ({ symbol: row.symbol, metricName, reason: 'edinet_consistency_failure' })));
  const rankingPopulationErrors = [];
  if (result?.scannerScope?.market === 'japan' && result?.unifiedScoringMeta?.candidatePopulationUnionCount !== undefined) {
    if (!Array.isArray(result?.unifiedAuditRows) || result.unifiedAuditRows.length === 0) {
      rankingPopulationErrors.push({ reason: 'ranking_union_population_missing' });
    }
    rows.forEach((row) => {
      if ((row.presentBeforeSupplement && !Number.isFinite(row.unifiedRankBeforeSupplement))
        || (row.presentAfterSupplement && !Number.isFinite(row.unifiedRankAfterSupplement))) {
        rankingPopulationErrors.push({ symbol: row.symbol, reason: 'unified_candidate_rank_missing' });
      }
    });
  }
  const rankChanges = buildRankChanges(rows);
  let top10BeforeSupplement = buildTop10(rows, 'unifiedRankBeforeSupplement', 'unifiedScoreBeforeSupplement');
  let top10AfterSupplement = buildTop10(rows, 'unifiedRankAfterSupplement', 'unifiedScoreAfterSupplement');
  if (top10BeforeSupplement.length === 0) {
    top10BeforeSupplement = buildTop10(rows, 'rankBeforeSupplement', 'scoreBeforeSupplement');
  }
  if (top10AfterSupplement.length === 0) {
    top10AfterSupplement = buildTop10(rows, 'rankAfterSupplement', 'scoreAfterSupplement');
  }
  const top10CurrentRun = buildTop10(rows);
  const top10PreviousRun = comparePreviousTop10(previousAudit, top10CurrentRun);
  const supplementTop10Diff = diffTop10(top10BeforeSupplement, top10AfterSupplement);
  const previousRunTop10 = Array.isArray(previousAudit?.currentRunTop10)
    ? previousAudit.currentRunTop10
    : Array.isArray(previousAudit?.top10CurrentRun)
      ? previousAudit.top10CurrentRun
      : [];
  const previousTop10Diff = diffTop10(previousRunTop10, top10CurrentRun);
  const top10AfterSymbols = new Set(top10AfterSupplement.map((entry) => entry.symbol));
  const top10BeforeSymbols = new Set(top10BeforeSupplement.map((entry) => entry.symbol));
  const criticals = [
    ...errors,
    ...criticalMetricAnomalies,
    ...top3RankIneligible,
    ...edinetEvidenceErrors,
    ...edinetConsistencyErrors,
    ...rankingPopulationErrors,
  ];
  const documentSummary = buildDocumentSummary(result, rows);

  return {
    generatedAt,
    market: result?.scannerScope?.market ?? 'unknown',
    status: criticals.length > 0
      ? 'critical'
      : metricAnomalies.length > 0
        || rankChanges.some((entry) => Math.abs(entry.rankDelta ?? 0) >= 5)
        || documentSummary.enteredCandidatePopulationCount > 0
        || documentSummary.exitedCandidatePopulationCount > 0
          ? 'warning'
          : 'ok',
    summary: {
      validMetrics: rows.reduce((sum, row) => sum + AUDITED_METRICS.filter((metricName) => row.metricProvenance?.[metricName]?.status === 'valid').length, 0),
      warnings: metricAnomalies.filter((entry) => entry.status === 'warning').length,
      errors: criticals.length,
      rankChangesOverThreshold: rankChanges.filter((entry) => Math.abs(entry.rankDelta ?? 0) >= 5).length,
      newTop10Entries: [...top10AfterSymbols].filter((symbol) => !top10BeforeSymbols.has(symbol)).length,
      exitedTop10BySupplement: supplementTop10Diff.exited.length,
      enteredTop10FromPreviousRun: previousTop10Diff.entered.length,
      exitedTop10FromPreviousRun: previousTop10Diff.exited.length,
      annualDocumentMissingSymbols: documentSummary.annualDocumentMissingSymbols,
      tradingViewFallbackRows: documentSummary.tradingViewFallbackRows,
      candidatePopulationBeforeCount: documentSummary.candidatePopulationBeforeCount,
      candidatePopulationAfterCount: documentSummary.candidatePopulationAfterCount,
      candidatePopulationUnionCount: documentSummary.candidatePopulationUnionCount,
      enteredCandidatePopulationCount: documentSummary.enteredCandidatePopulationCount,
      exitedCandidatePopulationCount: documentSummary.exitedCandidatePopulationCount,
    },
    documentSummary,
    metricAnomalies,
    criticals,
    rankChanges,
    top10BeforeSupplement,
    top10AfterSupplement,
    enteredTop10BySupplement: supplementTop10Diff.entered,
    exitedTop10BySupplement: supplementTop10Diff.exited,
    stayedTop10: supplementTop10Diff.stayed,
    largeRankMovers: rankChanges.filter((entry) => Math.abs(entry.rankDelta ?? 0) >= 5),
    previousRunTop10,
    currentRunTop10: top10CurrentRun,
    enteredTop10FromPreviousRun: previousTop10Diff.entered,
    exitedTop10FromPreviousRun: previousTop10Diff.exited,
    stayedTop10FromPreviousRun: previousTop10Diff.stayed,
    previousRunRankMovers: top10PreviousRun.filter((entry) => Math.abs(entry.rankDeltaFromPrevious ?? 0) > 0),
    top10PreviousRun,
    top10CurrentRun,
    evidenceRows: rows.map((row, index) => ({
      rank: row.unifiedRank ?? index + 1,
      symbol: row.symbol,
      companyName: displayName(row),
      unifiedRankBeforeSupplement: row.unifiedRankBeforeSupplement ?? row.rankBeforeSupplement ?? null,
      unifiedRankAfterSupplement: row.unifiedRankAfterSupplement ?? row.rankAfterSupplement ?? null,
      unifiedRankDelta: row.unifiedRankDelta ?? row.rankDelta ?? null,
      unifiedScoreBeforeSupplement: row.unifiedScoreBeforeSupplement ?? row.scoreBeforeSupplement ?? null,
      unifiedScoreAfterSupplement: row.unifiedScoreAfterSupplement ?? row.scoreAfterSupplement ?? row.unifiedRankScore ?? row.rankScore ?? null,
      unifiedScoreDelta: row.unifiedScoreDelta ?? row.scoreDelta ?? null,
      changedMetrics: row.changedMetrics ?? [],
      metricSourcesBefore: row.metricSourcesBefore ?? {},
      metricSourcesAfter: row.metricSourcesAfter ?? {},
      phase4EligibleBefore: row.phase4EligibleBefore ?? row.phase4Eligible ?? false,
      phase4EligibleAfter: row.phase4EligibleAfter ?? row.phase4Eligible ?? false,
      phase5EligibleBefore: row.phase5EligibleBefore ?? row.phase5Eligible ?? false,
      phase5EligibleAfter: row.phase5EligibleAfter ?? row.phase5Eligible ?? false,
      metricProvenance: row.metricProvenance ?? {},
      edinetSupplement: row.edinetSupplement ?? null,
      edinetEvidence: row.edinetSupplement?.edinetEvidence ?? null,
      finalMetrics: row.edinetSupplement?.finalMetrics ?? null,
    })),
  };
}
