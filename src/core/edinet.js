import { strFromU8, unzipSync } from 'fflate';

const EDINET_BASE_URL = 'https://api.edinet-fsa.go.jp/api/v2';
const DEFAULT_LOOKBACK_DAYS = 120;
const DEFAULT_DOCUMENT_LIST_TYPE = 2;
const DEFAULT_DOCUMENT_DOWNLOAD_TYPE = 5;
const ELIGIBLE_DOCUMENT_PATTERN = /有価証券報告書|四半期報告書|半期報告書/i;

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
    .toLowerCase()
    .replace(/[\s_\-:./\\()[\]{}]+/g, '');
}

function normalizeSecurityCode(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');
}

function normalizeSymbol(value) {
  return String(value ?? '')
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

function createHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'Subscription-Key': apiKey,
  };
}

function buildUrl(pathname, params) {
  const url = new URL(`${EDINET_BASE_URL}${pathname}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
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

function parseCsv(text) {
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
    if (char === ',' && !inQuotes) {
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

function scoreFactRow(joined, period) {
  let score = 0;
  if (joined.includes('consolidated')) score += 8;
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

function pickMetricValue(factRows, spec, period) {
  const candidates = [];

  factRows.forEach((factRow) => {
    if (!spec.concepts.some((concept) => factRow.joined.includes(concept))) return;
    const score = scoreFactRow(factRow.joined, period);
    if (score <= 0) return;
    candidates.push({
      score,
      value: spec.asAbsolute ? Math.abs(factRow.value) : factRow.value,
    });
  });

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.value ?? null;
}

function collectFactRows(csvFiles) {
  const factRows = [];

  csvFiles.forEach((file) => {
    const rows = parseCsv(file.text);
    rows.forEach((cells) => {
      const numericValues = cells.map(parseLooseNumber).filter((value) => value !== null);
      if (numericValues.length === 0) return;
      factRows.push({
        fileName: file.name,
        joined: normalizeText(cells.join('|')),
        value: numericValues[numericValues.length - 1],
      });
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

function deriveSupplementalMetrics({ marketCapUsd, factRows }) {
  const revenueCurrent = pickMetricValue(factRows, METRIC_SPECS.revenue, 'current');
  const revenuePrior = pickMetricValue(factRows, METRIC_SPECS.revenue, 'prior');
  const operatingCashFlowCurrent = pickMetricValue(factRows, METRIC_SPECS.operatingCashFlow, 'current');
  const operatingCashFlowPrior = pickMetricValue(factRows, METRIC_SPECS.operatingCashFlow, 'prior');
  const capexCurrent = (pickMetricValue(factRows, METRIC_SPECS.capexPpe, 'current') ?? 0)
    + (pickMetricValue(factRows, METRIC_SPECS.capexIntangibles, 'current') ?? 0);
  const capexPrior = (pickMetricValue(factRows, METRIC_SPECS.capexPpe, 'prior') ?? 0)
    + (pickMetricValue(factRows, METRIC_SPECS.capexIntangibles, 'prior') ?? 0);
  const netIncomeCurrent = pickMetricValue(factRows, METRIC_SPECS.netIncome, 'current');

  const fcfCurrent = Number.isFinite(operatingCashFlowCurrent)
    ? operatingCashFlowCurrent - capexCurrent
    : null;
  const fcfPrior = Number.isFinite(operatingCashFlowPrior)
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
    extractedFacts: {
      revenueCurrent: roundNullable(revenueCurrent, 0),
      revenuePrior: roundNullable(revenuePrior, 0),
      operatingCashFlowCurrent: roundNullable(operatingCashFlowCurrent, 0),
      operatingCashFlowPrior: roundNullable(operatingCashFlowPrior, 0),
      capexCurrent: roundNullable(capexCurrent, 0),
      capexPrior: roundNullable(capexPrior, 0),
      netIncomeCurrent: roundNullable(netIncomeCurrent, 0),
    },
  };
}

function parseCsvZip(buffer) {
  const files = unzipSync(new Uint8Array(asArrayBuffer(buffer)));
  return Object.entries(files)
    .filter(([name]) => name.toLowerCase().endsWith('.csv'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, bytes]) => ({ name, text: strFromU8(bytes) }));
}

function buildDocumentCandidateScore(doc) {
  let score = 0;
  if (ELIGIBLE_DOCUMENT_PATTERN.test(doc.docDescription ?? '')) score += 40;
  if (doc.csvFlag === '1' || doc.csvFlag === 1) score += 30;
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

async function fetchDocumentListByDate(dateString, { apiKey, fetchFn }) {
  const response = await fetchFn(buildUrl('/documents.json', {
    date: dateString,
    type: DEFAULT_DOCUMENT_LIST_TYPE,
  }), {
    headers: createHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(`EDINET documents list request failed: HTTP ${response.status} (${dateString})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.results) ? payload.results : [];
}

async function downloadDocumentCsv(docId, { apiKey, fetchFn }) {
  const response = await fetchFn(buildUrl(`/documents/${docId}`, {
    type: DEFAULT_DOCUMENT_DOWNLOAD_TYPE,
  }), {
    headers: createHeaders(apiKey),
  });

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
      },
    };
  }

  const bestDocumentBySymbol = new Map();
  const secCodeMatchedSymbols = new Set();
  const eligibleDescriptionMatchedSymbols = new Set();
  const csvEligibleMatchedSymbols = new Set();

  for (let offset = 0; offset < lookbackDays && bestDocumentBySymbol.size < symbols.length; offset += 1) {
    const dateString = toIsoDate(shiftDate(asOfDate, -offset));
    const documents = await fetchDocumentListByDate(dateString, { apiKey, fetchFn });
    documents.forEach((doc) => {
      const matchingSymbol = symbols.find((symbol) => matchesSecurityCode(symbol, doc.secCode));
      if (!matchingSymbol) return;
      secCodeMatchedSymbols.add(matchingSymbol);
      if (!ELIGIBLE_DOCUMENT_PATTERN.test(doc.docDescription ?? '')) return;
      eligibleDescriptionMatchedSymbols.add(matchingSymbol);
      if (!(doc.csvFlag === '1' || doc.csvFlag === 1)) return;
      csvEligibleMatchedSymbols.add(matchingSymbol);

      const nextScore = buildDocumentCandidateScore(doc);
      const current = bestDocumentBySymbol.get(matchingSymbol);
      if (!current || nextScore > current.score) {
        bestDocumentBySymbol.set(matchingSymbol, { doc, score: nextScore });
      }
    });
  }

  const results = {};
  for (const row of rows) {
    const symbol = normalizeSymbol(row.symbol);
    const selected = bestDocumentBySymbol.get(symbol);
    if (!selected?.doc?.docID) continue;

    try {
      const archive = await downloadDocumentCsv(selected.doc.docID, { apiKey, fetchFn });
      const csvFiles = parseCsvZip(archive);
      const factRows = collectFactRows(csvFiles);
      const metrics = deriveSupplementalMetrics({
        marketCapUsd: row.marketCapUsd,
        factRows,
      });

      results[symbol] = {
        ...metrics,
        source: 'edinet',
        docId: selected.doc.docID,
        secCode: selected.doc.secCode ?? null,
        docDescription: selected.doc.docDescription ?? null,
        submitDateTime: selected.doc.submitDateTime ?? null,
      };
    } catch (error) {
      results[symbol] = {
        source: 'edinet',
        error: error.message,
      };
    }
  }

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
      matchedFilings: bestDocumentBySymbol.size,
      secCodeMatchedSymbols: secCodeMatchedSymbols.size,
      eligibleDescriptionMatchedSymbols: eligibleDescriptionMatchedSymbols.size,
      csvEligibleMatchedSymbols: csvEligibleMatchedSymbols.size,
      supplementedRows,
      lookbackDays,
      asOfDate: toIsoDate(asOfDate),
    },
  };
}
