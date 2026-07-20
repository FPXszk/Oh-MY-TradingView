import { strFromU8, unzipSync } from 'fflate';

const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';
const DEFAULT_LOOKBACK_DAYS = 180;
const DEFAULT_ANNUAL_LOOKBACK_DAYS = 450;
const DEFAULT_DOCUMENT_LIST_TYPE = 2;
const DEFAULT_DOCUMENT_DOWNLOAD_TYPE = 5;
const ELIGIBLE_DOCUMENT_PATTERN = /有価証券報告書|四半期報告書|半期報告書/i;
const ANNUAL_DOCUMENT_PATTERN = /有価証券報告書/i;
const QUARTERLY_OR_HALF_PATTERN = /四半期報告書|半期報告書/i;

const METRIC_SPECS = {
  revenue: {
    concepts: [
      'netsales',
      'netsalessummaryofbusinessresults',
      'operatingrevenue',
      'operatingrevenue1',
      'salesrevenue',
      'revenuefromcontractswithcustomers',
      'ordinaryrevenuebnk',
    ],
    duration: true,
  },
  operatingCashFlow: {
    concepts: [
      'netcashprovidedbyusedinoperatingactivities',
      'cashflowsfromusedinoperatingactivitiesifrs',
      'cashflowsfromusedinoperatingactivitiesusgaap',
    ],
    duration: true,
  },
  capexPpe: {
    concepts: [
      'purchaseofpropertyplantandequipment',
      'paymentsforacquisitionofpropertyplantandequipment',
    ],
    duration: true,
    asAbsolute: true,
  },
  capexIntangibles: {
    concepts: [
      'purchaseofintangibleassets',
      'paymentsforacquisitionofintangibleassets',
      'purchaseofsoftware',
      'paymentsforacquisitionofsoftware',
    ],
    duration: true,
    asAbsolute: true,
  },
  netIncome: {
    concepts: [
      'profitloss',
      'netincome',
      'profitattributabletoownersofparent',
      'profitattributabletoownersofparentsummaryofbusinessresults',
    ],
    duration: true,
  },
};

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s_\-:./\\()[\]{}]+/g, '');
}

function normalizeHeaderName(value) {
  return normalizeText(value).replace(/[・、，,]/g, '');
}

function normalizeSecurityCode(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
}

function normalizeSymbol(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase();
}

function matchesSecurityCode(symbol, secCode) {
  const normalizedSymbol = normalizeSecurityCode(symbol);
  const normalizedCode = normalizeSecurityCode(secCode).replace(/0+$/, '');
  if (!normalizedSymbol || !normalizedCode) return false;
  return normalizedCode === normalizedSymbol
    || normalizedCode.startsWith(normalizedSymbol)
    || normalizedSymbol.startsWith(normalizedCode);
}

function buildUrl(pathname, params, apiKey) {
  const url = new URL(`${EDINET_BASE_URL}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  if (hasEdinetApiKey(apiKey)) {
    url.searchParams.set('Subscription-Key', apiKey.trim());
  }
  return url;
}

function asArrayBuffer(payload) {
  if (payload instanceof ArrayBuffer) return payload;
  if (ArrayBuffer.isView(payload)) {
    return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
  }
  return payload;
}

function parseLooseNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, '').replace(/\u2212/g, '-');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseScale(value) {
  const numeric = parseLooseNumber(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDelimited(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => String(value ?? '').trim() !== ''));
}

function decodeCsvText(bytes) {
  const hasUtf16LeBom = bytes[0] === 0xff && bytes[1] === 0xfe;
  const looksUtf16Le = hasUtf16LeBom || (
    bytes.length >= 4
    && bytes[1] === 0x00
    && bytes[3] === 0x00
  );
  if (looksUtf16Le) {
    return new TextDecoder('utf-16le').decode(bytes).replace(/^\uFEFF/, '');
  }
  return strFromU8(bytes).replace(/^\uFEFF/, '');
}

function detectDelimiter(text) {
  const firstLine = String(text ?? '').split(/\r?\n/, 1)[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? '\t' : ',';
}

function scoreFactRow(joined, period) {
  let score = 0;
  if (joined.includes('nonconsolidated')) score -= 8;
  else if (joined.includes('consolidated')) score += 8;
  if (joined.includes('summaryofbusinessresults')) score += 6;
  if (period === 'current') {
    if (joined.includes('currentyear')) score += 10;
    if (joined.includes('currentperiod')) score += 8;
  } else {
    if (joined.includes('prioryear')) score += 10;
    if (joined.includes('previousyear')) score += 8;
    if (joined.includes('prior1year')) score += 10;
  }
  if (joined.includes('duration')) score += 4;
  if (joined.includes('instant')) score -= 4;
  return score;
}

function factMatchesSpec(factRow, spec, period) {
  if (!spec.concepts.some((concept) => factRow.joined.includes(concept))) return false;
  if (factRow.periodType !== 'duration') return false;
  if (factRow.metricStatus === 'invalid') return false;
  if (period && factRow.relativePeriod !== period) return false;
  return true;
}

function pickMetricValue(factRows, spec, period) {
  const candidates = [];

  factRows.forEach((factRow) => {
    if (!factMatchesSpec(factRow, spec, period)) return;
    if (factRow.rankEligible === false && period === 'current') return;
    const score = scoreFactRow(factRow.joined, period);
    if (score <= 0) return;
    candidates.push({
      score,
      value: spec.asAbsolute ? Math.abs(factRow.normalizedValue) : factRow.normalizedValue,
      fact: factRow,
    });
  });

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0] ?? null;
}

function findHeaderIndex(headers, aliases) {
  const normalizedAliases = aliases.map(normalizeHeaderName);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeaderName(header)));
}

function buildColumnMap(headers) {
  const aliases = {
    conceptId: ['要素ID', 'elementId', 'conceptId', 'concept'],
    label: ['項目名', 'label', 'itemName'],
    contextRef: ['コンテキストID', 'contextRef', 'contextID'],
    relativePeriod: ['相対年度', 'relativePeriod'],
    consolidation: ['連結・個別', '連結個別', 'consolidatedOrNonConsolidated', 'consolidation'],
    periodType: ['期間・時点', '期間時点', 'periodType'],
    periodStart: ['期間開始日', 'periodStart', 'startDate'],
    periodEnd: ['期間終了日', 'periodEnd', 'endDate'],
    instantDate: ['時点日', 'instantDate'],
    unitId: ['ユニットID', 'unitId'],
    unit: ['単位', 'unit', 'currency'],
    scale: ['スケール', 'scale'],
    decimals: ['decimals', '精度'],
    value: ['値', 'value', 'amount', '金額'],
  };

  return Object.fromEntries(
    Object.entries(aliases).map(([key, values]) => [key, findHeaderIndex(headers, values)]),
  );
}

function isUsableColumnMap(columnMap) {
  return columnMap.conceptId >= 0 && columnMap.contextRef >= 0 && columnMap.value >= 0;
}

function normalizePeriodType(value, contextRef) {
  const text = normalizeText(`${value}|${contextRef}`);
  if (text.includes('instant') || text.includes('時点')) return 'instant';
  if (text.includes('duration') || text.includes('期間')) return 'duration';
  return null;
}

function normalizeRelativePeriod(value, contextRef) {
  const text = normalizeText(`${value}|${contextRef}`);
  if (text.includes('currentyear') || text.includes('currentperiod') || text.includes('当期')) return 'current';
  if (text.includes('prioryear') || text.includes('previousyear') || text.includes('prior1year') || text.includes('前期')) return 'prior';
  if (text.includes('currentquarter')) return 'currentQuarter';
  return null;
}

function normalizeConsolidation(value, contextRef) {
  const text = normalizeText(`${value}|${contextRef}`);
  if (text.includes('nonconsolidated') || text.includes('個別')) return 'nonConsolidated';
  if (text.includes('consolidated') || text.includes('連結')) return 'consolidated';
  return null;
}

function normalizeCurrency(unitId, unit) {
  const text = normalizeText(`${unitId}|${unit}`);
  if (text.includes('jpy') || text.includes('円')) return 'JPY';
  if (text.includes('usd')) return 'USD';
  return null;
}

function unitMultiplier(unit, scale) {
  const explicitScale = parseScale(scale);
  if (Number.isFinite(explicitScale)) return 10 ** explicitScale;
  const text = normalizeText(unit);
  if (text.includes('千円')) return 1_000;
  if (text.includes('百万円')) return 1_000_000;
  if (text.includes('億円')) return 100_000_000;
  if (text.includes('円') || text.includes('jpy')) return 1;
  return null;
}

function isAnnualCurrentDuration(contextRef, documentType, periodType, relativePeriod) {
  const context = normalizeText(contextRef);
  if (periodType !== 'duration' || relativePeriod !== 'current') return false;
  if (context.includes('quarter') || context.includes('半期') || context.includes('四半期')) return false;
  if (QUARTERLY_OR_HALF_PATTERN.test(documentType ?? '')) return false;
  return context.includes('currentyear') || ANNUAL_DOCUMENT_PATTERN.test(documentType ?? '');
}

function durationDays(periodStart, periodEnd) {
  const start = Date.parse(periodStart ?? '');
  const end = Date.parse(periodEnd ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

function isFullYearDuration(fact) {
  const days = durationDays(fact.periodStart, fact.periodEnd);
  return days !== null && days >= 330 && days <= 380;
}

function parseDocumentPeriod(documentType) {
  const match = String(documentType ?? '').match(/\((\d{4})[/-](\d{2})[/-](\d{2})[－~-](\d{4})[/-](\d{2})[/-](\d{2})\)/);
  if (!match) return { periodStart: null, periodEnd: null };
  return {
    periodStart: `${match[1]}-${match[2]}-${match[3]}`,
    periodEnd: `${match[4]}-${match[5]}-${match[6]}`,
  };
}

function shiftIsoDateYears(value, years) {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return `${String(Number(match[1]) + years).padStart(4, '0')}-${match[2]}-${match[3]}`;
}

function documentPeriodForRelativePeriod(documentType, relativePeriod) {
  const period = parseDocumentPeriod(documentType);
  if (relativePeriod === 'prior' && period.periodStart && period.periodEnd) {
    return {
      periodStart: shiftIsoDateYears(period.periodStart, -1),
      periodEnd: shiftIsoDateYears(period.periodEnd, -1),
    };
  }
  return period;
}

function hasCompletePeriod(fact) {
  return Boolean(fact.periodStart && fact.periodEnd && isFullYearDuration(fact));
}

function factSummary(fact, value = null) {
  if (!fact) return null;
  return {
    conceptId: fact.conceptId,
    label: fact.label,
    contextRef: fact.contextRef,
    periodStart: fact.periodStart,
    periodEnd: fact.periodEnd,
    periodType: fact.periodType,
    relativePeriod: fact.relativePeriod,
    consolidation: fact.consolidation,
    currency: fact.currency,
    value,
    sourceFile: fact.sourceFile,
    documentId: fact.documentId,
    documentType: fact.documentType,
    submittedAt: fact.submittedAt,
  };
}

function buildFactRow(cells, columnMap, file, documentMeta = {}) {
  const rawValue = cells[columnMap.value] ?? '';
  const numericValue = parseLooseNumber(rawValue);
  const conceptId = cells[columnMap.conceptId] ?? '';
  const contextRef = cells[columnMap.contextRef] ?? '';
  const unitId = columnMap.unitId >= 0 ? cells[columnMap.unitId] : '';
  const unit = columnMap.unit >= 0 ? cells[columnMap.unit] : '';
  const scale = columnMap.scale >= 0 ? cells[columnMap.scale] : null;
  const multiplier = unitMultiplier(unit || unitId, scale);
  const periodType = normalizePeriodType(columnMap.periodType >= 0 ? cells[columnMap.periodType] : '', contextRef);
  const relativePeriod = normalizeRelativePeriod(columnMap.relativePeriod >= 0 ? cells[columnMap.relativePeriod] : '', contextRef);
  const consolidation = normalizeConsolidation(columnMap.consolidation >= 0 ? cells[columnMap.consolidation] : '', contextRef);
  const currency = normalizeCurrency(unitId, unit);
  const documentPeriod = documentPeriodForRelativePeriod(documentMeta.documentType, relativePeriod);
  const periodStart = columnMap.periodStart >= 0
    ? cells[columnMap.periodStart] || documentPeriod.periodStart
    : documentPeriod.periodStart;
  const periodEnd = columnMap.periodEnd >= 0
    ? cells[columnMap.periodEnd] || documentPeriod.periodEnd
    : documentPeriod.periodEnd;
  const warnings = [];

  if (numericValue === null) warnings.push('value_column_not_numeric');
  if (periodType === null) warnings.push('period_type_unknown');
  if (relativePeriod === null) warnings.push('relative_period_unknown');
  if (consolidation === null) warnings.push('consolidation_unknown');
  if (currency === null) warnings.push('currency_unknown');
  if (multiplier === null) warnings.push('unit_unknown');

  const normalizedValue = numericValue !== null && multiplier !== null
    ? numericValue * multiplier
    : null;
  const status = warnings.some((warning) => warning.endsWith('_unknown') || warning === 'value_column_not_numeric')
    ? 'invalid'
    : 'valid';

  return {
    conceptId,
    label: columnMap.label >= 0 ? cells[columnMap.label] : null,
    contextRef,
    periodType,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
    instantDate: columnMap.instantDate >= 0 ? cells[columnMap.instantDate] || null : null,
    relativePeriod,
    consolidation,
    unitId: unitId || null,
    currency,
    scale,
    decimals: columnMap.decimals >= 0 ? cells[columnMap.decimals] || null : null,
    rawValue,
    normalizedValue,
    sourceFile: file.name,
    documentId: documentMeta.documentId ?? null,
    documentType: documentMeta.documentType ?? null,
    submittedAt: documentMeta.submittedAt ?? null,
    warnings,
    metricStatus: status,
    rankEligible: isAnnualCurrentDuration(contextRef, documentMeta.documentType, periodType, relativePeriod)
      && Boolean(periodStart && periodEnd),
    joined: normalizeText([
      conceptId,
      columnMap.label >= 0 ? cells[columnMap.label] : '',
      contextRef,
      columnMap.relativePeriod >= 0 ? cells[columnMap.relativePeriod] : '',
      consolidation,
      periodType,
    ].join('|')),
  };
}

function collectFactRows(csvFiles, documentMeta = {}) {
  const factRows = [];

  csvFiles.forEach((file) => {
    const rows = parseDelimited(file.text, detectDelimiter(file.text));
    if (rows.length === 0) return;
    const headerIndex = rows.findIndex((cells) => isUsableColumnMap(buildColumnMap(cells)));
    if (headerIndex === -1) return;
    const columnMap = buildColumnMap(rows[headerIndex]);
    rows.slice(headerIndex + 1).forEach((cells) => {
      const fact = buildFactRow(cells, columnMap, file, documentMeta);
      if (fact.normalizedValue === null) return;
      factRows.push(fact);
    });
  });

  return factRows;
}

function computeGrowthPct(currentValue, priorValue) {
  if (!Number.isFinite(currentValue) || !Number.isFinite(priorValue) || priorValue === 0) return null;
  return Number((((currentValue - priorValue) / Math.abs(priorValue)) * 100).toFixed(2));
}

function roundNullable(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function buildFactGroupKey(fact) {
  return [
    fact.documentId ?? '',
    fact.periodStart ?? '',
    fact.periodEnd ?? '',
    fact.periodType ?? '',
    fact.relativePeriod ?? '',
    fact.consolidation ?? '',
    fact.currency ?? '',
  ].join('\u0000');
}

function collectFactGroups(factRows, period) {
  const groups = new Map();
  factRows.forEach((fact) => {
    if (fact.periodType !== 'duration' || fact.relativePeriod !== period) return;
    const key = buildFactGroupKey(fact);
    if (!groups.has(key)) {
      groups.set(key, {
        documentId: fact.documentId ?? null,
        periodStart: fact.periodStart ?? null,
        periodEnd: fact.periodEnd ?? null,
        periodType: fact.periodType ?? null,
        relativePeriod: fact.relativePeriod ?? null,
        consolidation: fact.consolidation ?? null,
        currency: fact.currency ?? null,
        sourceFiles: new Set(),
        facts: [],
      });
    }
    const group = groups.get(key);
    group.facts.push(fact);
    if (fact.sourceFile) group.sourceFiles.add(fact.sourceFile);
  });
  return [...groups.values()];
}

function selectGroupMetric(group, spec, period) {
  const candidates = group.facts
    .filter((fact) => factMatchesSpec(fact, spec, period))
    .map((fact) => ({
      score: scoreFactRow(fact.joined, period),
      value: spec.asAbsolute ? Math.abs(fact.normalizedValue) : fact.normalizedValue,
      fact,
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
  return candidates[0] ?? null;
}

function buildMetricGroup(group, period) {
  const revenue = selectGroupMetric(group, METRIC_SPECS.revenue, period);
  const operatingCashFlow = selectGroupMetric(group, METRIC_SPECS.operatingCashFlow, period);
  const capexPpe = selectGroupMetric(group, METRIC_SPECS.capexPpe, period);
  const capexIntangibles = selectGroupMetric(group, METRIC_SPECS.capexIntangibles, period);
  const netIncome = selectGroupMetric(group, METRIC_SPECS.netIncome, period);
  const warnings = [];

  if (!group.periodStart || !group.periodEnd) warnings.push('period_dates_missing');
  if (!isFullYearDuration(group)) warnings.push('not_full_year_duration');
  if (!group.consolidation) warnings.push('consolidation_unknown');
  if (!group.currency) warnings.push('currency_unknown');
  if (group.consolidation === 'nonConsolidated') warnings.push('non_consolidated_only_not_ranked');
  if (!revenue) warnings.push('revenue_missing');
  if (!operatingCashFlow) warnings.push('operating_cash_flow_missing');
  if (!capexPpe) warnings.push('capex_ppe_missing');
  if (capexIntangibles === null) warnings.push('capex_intangibles_not_present');

  const eligible = warnings.every((warning) => (
    warning === 'capex_intangibles_not_present'
  )) && revenue.value > 0 && Number.isFinite(operatingCashFlow.value) && Number.isFinite(capexPpe.value);

  return {
    ...group,
    revenue,
    operatingCashFlow,
    capexPpe,
    capexIntangibles,
    netIncome,
    warnings,
    rankEligible: eligible,
  };
}

function selectMetricGroup(factRows, period) {
  const groups = collectFactGroups(factRows, period).map((group) => buildMetricGroup(group, period));
  return groups
    .sort((left, right) => {
      if (left.rankEligible !== right.rankEligible) return left.rankEligible ? -1 : 1;
      if (left.consolidation !== right.consolidation) {
        if (left.consolidation === 'consolidated') return -1;
        if (right.consolidation === 'consolidated') return 1;
      }
      const leftSubmitted = Date.parse(left.revenue?.fact?.submittedAt ?? '');
      const rightSubmitted = Date.parse(right.revenue?.fact?.submittedAt ?? '');
      return (Number.isFinite(rightSubmitted) ? rightSubmitted : 0) - (Number.isFinite(leftSubmitted) ? leftSubmitted : 0);
    })[0] ?? null;
}

function deriveSupplementalMetrics({ marketCapUsd, factRows }) {
  const currentGroup = selectMetricGroup(factRows, 'current');
  const priorGroup = selectMetricGroup(factRows, 'prior');
  const revenueCurrentFact = currentGroup?.revenue ?? null;
  const revenuePriorFact = priorGroup?.revenue ?? null;
  const operatingCashFlowCurrentFact = currentGroup?.operatingCashFlow ?? null;
  const operatingCashFlowPriorFact = priorGroup?.operatingCashFlow ?? null;
  const capexPpeCurrentFact = currentGroup?.capexPpe ?? null;
  const capexIntangiblesCurrentFact = currentGroup?.capexIntangibles ?? null;
  const capexPpePriorFact = priorGroup?.capexPpe ?? null;
  const capexIntangiblesPriorFact = priorGroup?.capexIntangibles ?? null;
  const netIncomeCurrentFact = currentGroup?.netIncome ?? null;
  const revenueCurrent = revenueCurrentFact?.value ?? null;
  const revenuePrior = revenuePriorFact?.value ?? null;
  const operatingCashFlowCurrent = operatingCashFlowCurrentFact?.value ?? null;
  const operatingCashFlowPrior = operatingCashFlowPriorFact?.value ?? null;
  const capexCurrent = capexPpeCurrentFact
    ? capexPpeCurrentFact.value + (capexIntangiblesCurrentFact?.value ?? 0)
    : null;
  const capexPrior = capexPpePriorFact
    ? capexPpePriorFact.value + (capexIntangiblesPriorFact?.value ?? 0)
    : null;
  const netIncomeCurrent = netIncomeCurrentFact?.value ?? null;

  const fcfCurrent = Number.isFinite(operatingCashFlowCurrent) && Number.isFinite(capexCurrent)
    ? operatingCashFlowCurrent - capexCurrent
    : null;
  const fcfPrior = Number.isFinite(operatingCashFlowPrior) && Number.isFinite(capexPrior)
    ? operatingCashFlowPrior - capexPrior
    : null;

  const revenueGrowthTtm = computeGrowthPct(revenueCurrent, revenuePrior);
  const fcfGrowthTtm = computeGrowthPct(fcfCurrent, fcfPrior);
  const fcfMargin = Number.isFinite(fcfCurrent) && Number.isFinite(revenueCurrent) && revenueCurrent !== 0
    ? roundNullable((fcfCurrent / revenueCurrent) * 100)
    : null;
  const pFcf = Number.isFinite(marketCapUsd) && Number.isFinite(fcfCurrent) && fcfCurrent > 0
    ? roundNullable(marketCapUsd / fcfCurrent, 1)
    : null;
  const cashConversion = Number.isFinite(fcfCurrent) && Number.isFinite(netIncomeCurrent) && netIncomeCurrent > 0
    ? roundNullable(fcfCurrent / netIncomeCurrent, 2)
    : Number.isFinite(operatingCashFlowCurrent) && Number.isFinite(netIncomeCurrent) && netIncomeCurrent > 0
      ? roundNullable(operatingCashFlowCurrent / netIncomeCurrent, 2)
      : null;
  const ruleOf40 = revenueGrowthTtm !== null && fcfMargin !== null
    ? roundNullable(revenueGrowthTtm + fcfMargin)
    : null;
  const warnings = [];
  if (fcfMargin !== null && Math.abs(fcfMargin) > 50) warnings.push('fcf_margin_abs_gt_50');
  if (fcfMargin !== null && Math.abs(fcfMargin) > 100) warnings.push('fcf_margin_abs_gt_100');
  if (pFcf !== null && pFcf <= 0) warnings.push('pfcf_non_positive');
  if (cashConversion !== null && Math.abs(cashConversion) >= 5) warnings.push('cash_conversion_abs_gte_5');
  if (fcfGrowthTtm !== null && Math.abs(fcfGrowthTtm) >= 500) warnings.push('fcf_growth_abs_gte_500');
  if (Number.isFinite(fcfCurrent) && Number.isFinite(operatingCashFlowCurrent) && fcfCurrent > operatingCashFlowCurrent + 1) {
    warnings.push('fcf_exceeds_operating_cash_flow');
  }
  if (!currentGroup) warnings.push('current_period_group_missing');
  if (currentGroup?.warnings?.length) warnings.push(...currentGroup.warnings);
  if (priorGroup?.warnings?.length) warnings.push(...priorGroup.warnings.map((warning) => `prior_${warning}`));
  if (revenueCurrent !== null && revenueCurrent <= 0) warnings.push('revenue_not_positive');
  const annualEligible = Boolean(currentGroup?.rankEligible);
  const metricStatus = warnings.some((warning) => [
    'fcf_margin_abs_gt_100',
    'pfcf_non_positive',
    'fcf_exceeds_operating_cash_flow',
    'current_period_group_missing',
    'period_dates_missing',
    'not_full_year_duration',
    'consolidation_unknown',
    'currency_unknown',
    'non_consolidated_only_not_ranked',
    'revenue_missing',
    'revenue_not_positive',
    'operating_cash_flow_missing',
    'capex_ppe_missing',
  ].includes(warning)) || !annualEligible
    ? 'invalid'
    : warnings.length > 0
      ? 'warning'
      : 'valid';

  return {
    revenueGrowthTtm,
    fcfMargin,
    fcfGrowthTtm,
    pFcf,
    cashConversion,
    cashFromOperationsTtm: roundNullable(operatingCashFlowCurrent, 0),
    netIncomeTtm: roundNullable(netIncomeCurrent, 0),
    fcfTtm: roundNullable(fcfCurrent, 0),
    ruleOf40,
    metricStatus,
    rankEligible: metricStatus !== 'invalid',
    warnings,
    metricProvenance: Object.fromEntries([
      ['fcfTtm', fcfCurrent],
      ['fcfMargin', fcfMargin],
      ['fcfGrowthTtm', fcfGrowthTtm],
      ['cashFromOperationsTtm', operatingCashFlowCurrent],
      ['cashConversion', cashConversion],
      ['pFcf', pFcf],
      ['revenueGrowthTtm', revenueGrowthTtm],
    ].map(([metricName, finalValue]) => [metricName, {
      source: 'edinet',
      status: metricStatus,
      rankEligible: metricStatus !== 'invalid',
      rawValue: finalValue,
      finalValue,
      formula: {
        fcfTtm: 'operatingCashFlow - capexPpe - capexIntangiblesKnown',
        fcfMargin: 'fcfTtm / revenue',
        fcfGrowthTtm: '(fcfCurrent - fcfPrior) / abs(fcfPrior)',
        cashFromOperationsTtm: 'operatingCashFlow',
        cashConversion: 'fcfTtm / netIncome',
        pFcf: 'marketCapUsd / fcfTtm',
        revenueGrowthTtm: '(revenueCurrent - revenuePrior) / abs(revenuePrior)',
      }[metricName],
      documentType: revenueCurrentFact?.fact?.documentType ?? null,
      periodStart: revenueCurrentFact?.fact?.periodStart ?? null,
      periodEnd: revenueCurrentFact?.fact?.periodEnd ?? null,
      consolidation: revenueCurrentFact?.fact?.consolidation ?? null,
      currency: revenueCurrentFact?.fact?.currency ?? null,
      sourceFile: revenueCurrentFact?.fact?.sourceFile ?? null,
      metricWarnings: metricName === 'fcfGrowthTtm'
        ? warnings.filter((warning) => warning === 'fcf_growth_abs_gte_500')
        : warnings.filter((warning) => warning !== 'fcf_growth_abs_gte_500' && !warning.startsWith('prior_')),
      rowWarnings: warnings.filter((warning) => warning.startsWith('prior_')),
      documentWarnings: currentGroup?.warnings ?? [],
      warnings: metricName === 'fcfGrowthTtm'
        ? warnings
        : warnings.filter((warning) => warning !== 'fcf_growth_abs_gte_500'),
      inputs: {
        revenue: factSummary(revenueCurrentFact?.fact, revenueCurrent),
        operatingCashFlow: factSummary(operatingCashFlowCurrentFact?.fact, operatingCashFlowCurrent),
        capexPpe: factSummary(capexPpeCurrentFact?.fact, capexPpeCurrentFact?.value ?? null),
        capexIntangibles: factSummary(capexIntangiblesCurrentFact?.fact, capexIntangiblesCurrentFact?.value ?? null),
        netIncome: factSummary(netIncomeCurrentFact?.fact, netIncomeCurrent),
      },
    }])),
    extractedFacts: {
      revenueCurrent: roundNullable(revenueCurrent, 0),
      revenuePrior: roundNullable(revenuePrior, 0),
      operatingCashFlowCurrent: roundNullable(operatingCashFlowCurrent, 0),
      operatingCashFlowPrior: roundNullable(operatingCashFlowPrior, 0),
      capexCurrent: roundNullable(capexCurrent, 0),
      capexPrior: roundNullable(capexPrior, 0),
      netIncomeCurrent: roundNullable(netIncomeCurrent, 0),
      provenance: {
        revenueCurrent: revenueCurrentFact?.fact ?? null,
        revenuePrior: revenuePriorFact?.fact ?? null,
        operatingCashFlowCurrent: operatingCashFlowCurrentFact?.fact ?? null,
        operatingCashFlowPrior: operatingCashFlowPriorFact?.fact ?? null,
        capexPpeCurrent: capexPpeCurrentFact?.fact ?? null,
        capexIntangiblesCurrent: capexIntangiblesCurrentFact?.fact ?? null,
        capexPpePrior: capexPpePriorFact?.fact ?? null,
        capexIntangiblesPrior: capexIntangiblesPriorFact?.fact ?? null,
        netIncomeCurrent: netIncomeCurrentFact?.fact ?? null,
      },
      group: currentGroup
        ? {
          documentId: currentGroup.documentId,
          periodStart: currentGroup.periodStart,
          periodEnd: currentGroup.periodEnd,
          periodType: currentGroup.periodType,
          relativePeriod: currentGroup.relativePeriod,
          consolidation: currentGroup.consolidation,
          currency: currentGroup.currency,
          sourceFiles: [...currentGroup.sourceFiles],
          rankEligible: currentGroup.rankEligible,
          warnings: currentGroup.warnings,
        }
        : null,
    },
  };
}

function parseCsvZip(buffer) {
  const files = unzipSync(new Uint8Array(asArrayBuffer(buffer)));
  return Object.entries(files)
    .filter(([name]) => name.toLowerCase().endsWith('.csv'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, bytes]) => ({ name, text: decodeCsvText(bytes) }));
}

function isCsvEligibleDocument(doc) {
  return doc.csvFlag === '1' || doc.csvFlag === 1;
}

function isAnnualRankingDocument(doc) {
  const description = doc.docDescription ?? '';
  return ANNUAL_DOCUMENT_PATTERN.test(description)
    && !QUARTERLY_OR_HALF_PATTERN.test(description)
    && isCsvEligibleDocument(doc);
}

function summarizeDocument(doc, purpose, selectedReason = null) {
  if (!doc) return null;
  return {
    purpose,
    documentId: doc.docID ?? null,
    secCode: doc.secCode ?? null,
    documentType: doc.docDescription ?? null,
    submittedAt: doc.submitDateTime ?? null,
    csvEligible: isCsvEligibleDocument(doc),
    legalStatus: doc.legalStatus ?? null,
    selectedReason,
  };
}

function buildLatestDocumentCandidateScore(doc) {
  let score = 0;
  if (ELIGIBLE_DOCUMENT_PATTERN.test(doc.docDescription ?? '')) score += 40;
  if (isCsvEligibleDocument(doc)) score += 30;
  if (doc.legalStatus === '1' || doc.legalStatus === 1) score += 10;
  if (doc.legalStatus === '2' || doc.legalStatus === 2) score += 8;
  if (/四半期報告書/i.test(doc.docDescription ?? '')) score += 20;
  if (/半期報告書/i.test(doc.docDescription ?? '')) score += 16;
  if (/有価証券報告書/i.test(doc.docDescription ?? '')) score += 12;
  const submittedAt = Date.parse(doc.submitDateTime ?? '');
  if (Number.isFinite(submittedAt)) {
    score += submittedAt / 1_000_000_000_000;
  }
  return score;
}

function buildAnnualDocumentCandidateScore(doc) {
  let score = 0;
  if (!isAnnualRankingDocument(doc)) return -Infinity;
  score += 100;
  if (/訂正有価証券報告書/i.test(doc.docDescription ?? '')) score += 10;
  if (doc.legalStatus === '1' || doc.legalStatus === 1) score += 10;
  if (doc.legalStatus === '2' || doc.legalStatus === 2) score += 8;
  const submittedAt = Date.parse(doc.submitDateTime ?? '');
  if (Number.isFinite(submittedAt)) {
    score += submittedAt / 1_000_000_000_000;
  }
  return score;
}

async function fetchDocumentListByDate(dateString, { apiKey, fetchFn }) {
  const response = await fetchFn(buildUrl('/documents.json', {
    date: dateString,
    type: DEFAULT_DOCUMENT_LIST_TYPE,
  }, apiKey));

  if (!response.ok) {
    throw new Error(`EDINET documents list request failed: HTTP ${response.status} (${dateString})`);
  }

  const payload = await response.json();
  if (payload?.StatusCode && Number(payload.StatusCode) >= 400) {
    throw new Error(`EDINET documents list API error: ${payload.StatusCode} ${payload.message ?? ''}`.trim());
  }
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function downloadDocumentCsv(docId, { apiKey, fetchFn }) {
  const response = await fetchFn(buildUrl(`/documents/${docId}`, {
    type: DEFAULT_DOCUMENT_DOWNLOAD_TYPE,
  }, apiKey));

  if (!response.ok) {
    throw new Error(`EDINET document download failed: HTTP ${response.status} (${docId})`);
  }

  return response.arrayBuffer();
}

function shiftDate(date, offsetDays) {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function hasEdinetApiKey(value) {
  return typeof value === 'string' && value.trim() !== '';
}

export async function getEdinetSupplementalFundamentalsBatch(rows, options = {}) {
  const apiKey = options.apiKey ?? process.env.EDINET_API_KEY ?? '';
  const fetchFn = options.fetch ?? globalThis.fetch;
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const annualLookbackDays = options.annualLookbackDays ?? DEFAULT_ANNUAL_LOOKBACK_DAYS;
  const asOfDate = options.asOfDate ? new Date(options.asOfDate) : new Date();
  const symbols = [...new Set((rows ?? []).map((row) => normalizeSymbol(row.symbol)).filter(Boolean))];

  if (!hasEdinetApiKey(apiKey)) {
    return {
      rows: {},
      meta: {
        enabled: false,
        reason: 'missing_api_key',
        requestedSymbols: symbols.length,
        matchedFilings: 0,
        supplementedRows: 0,
        lookbackDays,
        annualLookbackDays,
      },
    };
  }

  try {
    const latestDocumentBySymbol = new Map();
    const annualDocumentBySymbol = new Map();
    const secCodeMatchedSymbols = new Set();
    const eligibleDescriptionMatchedSymbols = new Set();
    const csvEligibleMatchedSymbols = new Set();
    const annualDescriptionMatchedSymbols = new Set();
    let documentCount = 0;
    let documentListRequests = 0;
    let documentsWithSecCode = 0;
    let sampleCodeFields = null;
    const startedAt = Date.now();

    const maxLookbackDays = Math.max(lookbackDays, annualLookbackDays);
    for (let offset = 0; offset < maxLookbackDays; offset += 1) {
      if (
        (offset >= lookbackDays || latestDocumentBySymbol.size >= symbols.length)
        && (offset >= annualLookbackDays || annualDocumentBySymbol.size >= symbols.length)
      ) {
        break;
      }
      const dateString = toIsoDate(shiftDate(asOfDate, -offset));
      const documents = await fetchDocumentListByDate(dateString, { apiKey, fetchFn });
      documentListRequests += 1;
      documentCount += documents.length;
      documents.forEach((doc) => {
        if (sampleCodeFields === null) {
          sampleCodeFields = Object.fromEntries(
            Object.entries(doc).filter(([key]) => /code/i.test(key)).slice(0, 10),
          );
        }
        if (normalizeSecurityCode(doc.secCode)) {
          documentsWithSecCode += 1;
        }
        const matchingSymbol = symbols.find((symbol) => matchesSecurityCode(symbol, doc.secCode));
        if (!matchingSymbol) return;
        secCodeMatchedSymbols.add(matchingSymbol);
        if (!ELIGIBLE_DOCUMENT_PATTERN.test(doc.docDescription ?? '')) return;
        eligibleDescriptionMatchedSymbols.add(matchingSymbol);
        if (isCsvEligibleDocument(doc)) csvEligibleMatchedSymbols.add(matchingSymbol);

        if (offset < lookbackDays) {
          const nextLatestScore = buildLatestDocumentCandidateScore(doc);
          const currentLatest = latestDocumentBySymbol.get(matchingSymbol);
          if (!currentLatest || nextLatestScore > currentLatest.score) {
            latestDocumentBySymbol.set(matchingSymbol, {
              doc,
              score: nextLatestScore,
              selectedReason: 'latest_eligible_document_by_score',
            });
          }
        }

        if (offset < annualLookbackDays && isAnnualRankingDocument(doc)) {
          annualDescriptionMatchedSymbols.add(matchingSymbol);
          const nextAnnualScore = buildAnnualDocumentCandidateScore(doc);
          const currentAnnual = annualDocumentBySymbol.get(matchingSymbol);
          if (!currentAnnual || nextAnnualScore > currentAnnual.score) {
            annualDocumentBySymbol.set(matchingSymbol, {
              doc,
              score: nextAnnualScore,
              selectedReason: /訂正有価証券報告書/i.test(doc.docDescription ?? '')
                ? 'amended_annual_ranking_document'
                : 'annual_ranking_document',
            });
          }
        }
      });
    }

    const results = {};
    let downloadedRows = 0;
    let rowsWithFactRows = 0;
    let errorRows = 0;
    let sampleError = null;
    const sampleDownloads = [];
    for (const row of rows) {
      const symbol = normalizeSymbol(row.symbol);
      const latestSelected = latestDocumentBySymbol.get(symbol);
      const selected = annualDocumentBySymbol.get(symbol);
      if (!selected?.doc?.docID) continue;

      try {
        const archive = await downloadDocumentCsv(selected.doc.docID, { apiKey, fetchFn });
        const csvFiles = parseCsvZip(archive);
        const factRows = collectFactRows(csvFiles, {
          documentId: selected.doc.docID,
          documentType: selected.doc.docDescription ?? null,
          submittedAt: selected.doc.submitDateTime ?? null,
        });
        downloadedRows += 1;
        if (factRows.length > 0) {
          rowsWithFactRows += 1;
        }
        const metrics = deriveSupplementalMetrics({
          marketCapUsd: row.marketCapUsd,
          factRows,
        });

        results[symbol] = {
          ...metrics,
          source: 'edinet',
          latestDocument: summarizeDocument(latestSelected?.doc, 'latest', latestSelected?.selectedReason ?? null),
          annualRankingDocument: summarizeDocument(selected.doc, 'annualRanking', selected.selectedReason),
          docId: selected.doc.docID,
          secCode: selected.doc.secCode ?? null,
          docDescription: selected.doc.docDescription ?? null,
          submitDateTime: selected.doc.submitDateTime ?? null,
          csvFileCount: csvFiles.length,
          factRowCount: factRows.length,
        };
        if (sampleDownloads.length < 5) {
          sampleDownloads.push({
            symbol,
            docId: selected.doc.docID ?? null,
            docDescription: selected.doc.docDescription ?? null,
            latestDocument: latestSelected?.doc?.docDescription ?? null,
            annualRankingDocument: selected.doc.docDescription ?? null,
            csvFileCount: csvFiles.length,
            factRowCount: factRows.length,
          });
        }
      } catch (error) {
        errorRows += 1;
        if (!sampleError) {
          sampleError = error.message;
        }
        results[symbol] = {
          source: 'edinet',
          latestDocument: summarizeDocument(latestSelected?.doc, 'latest', latestSelected?.selectedReason ?? null),
          annualRankingDocument: summarizeDocument(selected.doc, 'annualRanking', selected.selectedReason),
          error: error.message,
        };
      }
    }

    symbols.forEach((symbol) => {
      if (results[symbol]) return;
      const latestSelected = latestDocumentBySymbol.get(symbol);
      results[symbol] = {
        source: 'edinet',
        metricStatus: 'invalid',
        rankEligible: false,
        warnings: [latestSelected ? 'only_interim_documents_found' : 'annual_document_missing'],
        latestDocument: summarizeDocument(latestSelected?.doc, 'latest', latestSelected?.selectedReason ?? null),
        annualRankingDocument: null,
      };
    });

    const supplementedRows = Object.values(results).filter((entry) => (
      entry.fcfMargin !== null
      || entry.fcfGrowthTtm !== null
      || entry.pFcf !== null
      || entry.cashConversion !== null
      || entry.revenueGrowthTtm !== null
    )).length;

    return {
      rows: results,
      meta: {
        enabled: true,
        reason: supplementedRows > 0 ? 'active' : 'no_extractable_metrics',
        requestedSymbols: symbols.length,
        documentCount,
        documentsWithSecCode,
        sampleCodeFields,
        matchedFilings: annualDocumentBySymbol.size,
        latestDocumentMatchedSymbols: latestDocumentBySymbol.size,
        annualDocumentMatchedSymbols: annualDocumentBySymbol.size,
        annualDocumentMissingSymbols: symbols.length - annualDocumentBySymbol.size,
        interimOnlySymbols: symbols.filter((symbol) => latestDocumentBySymbol.has(symbol) && !annualDocumentBySymbol.has(symbol)).length,
        downloadedRows,
        rowsWithFactRows,
        errorRows,
        sampleError,
        sampleDownloads,
        secCodeMatchedSymbols: secCodeMatchedSymbols.size,
        eligibleDescriptionMatchedSymbols: eligibleDescriptionMatchedSymbols.size,
        csvEligibleMatchedSymbols: csvEligibleMatchedSymbols.size,
        annualDescriptionMatchedSymbols: annualDescriptionMatchedSymbols.size,
        supplementedRows,
        lookbackDays,
        annualLookbackDays,
        asOfDate: toIsoDate(asOfDate),
        documentListRequests,
        elapsedMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    const loweredMessage = String(error?.message ?? '').toLowerCase();
    const reason = loweredMessage.includes('invalid subscription key') || loweredMessage.includes('401')
      ? 'invalid_api_key'
      : 'api_error';
    return {
      rows: {},
      meta: {
        enabled: true,
        reason,
        requestedSymbols: symbols.length,
        matchedFilings: 0,
        supplementedRows: 0,
        lookbackDays,
        annualLookbackDays,
        asOfDate: toIsoDate(asOfDate),
        error: error.message,
      },
    };
  }
}
