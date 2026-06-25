const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_COMPANY_FACTS_BASE_URL = 'https://data.sec.gov/api/xbrl/companyfacts';
const EPS_FACTS = [
  ['us-gaap', 'EarningsPerShareDiluted'],
  ['ifrs-full', 'DilutedEarningsLossPerShare'],
];

let tickerMapCache = null;
const companyFactsCache = new Map();

function normalizeTicker(value) {
  return String(value ?? '').trim().toUpperCase().replace('.', '-');
}

function padCik(value) {
  return String(value ?? '').replace(/\D/g, '').padStart(10, '0');
}

function durationDays(entry) {
  const start = Date.parse(entry?.start);
  const end = Date.parse(entry?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 86400000);
}

function periodType(entry) {
  const days = durationDays(entry);
  if (days === null) return null;
  if (days >= 250 && days <= 430) return 'annual';
  if (days >= 60 && days <= 130) return 'quarterly';
  return null;
}

function dedupeFacts(entries) {
  const latestByPeriod = new Map();
  entries.forEach((entry) => {
    if (!Number.isFinite(entry?.val) || !entry?.start || !entry?.end) return;
    const type = periodType(entry);
    if (!type) return;
    const key = `${entry.start}|${entry.end}|${entry.fp ?? ''}|${type}`;
    const existing = latestByPeriod.get(key);
    if (!existing || String(entry.filed ?? '') > String(existing.filed ?? '')) {
      latestByPeriod.set(key, entry);
    }
  });
  return [...latestByPeriod.values()].sort((a, b) => String(b.end).localeCompare(String(a.end)));
}

function findComparablePair(entries) {
  const facts = dedupeFacts(entries);
  const current = facts[0];
  if (!current) return null;
  const currentType = periodType(current);
  const currentDays = durationDays(current);
  const currentEnd = Date.parse(current.end);
  const previous = facts.find((candidate) => {
    if (candidate === current || periodType(candidate) !== currentType) return false;
    if ((candidate.fp ?? null) !== (current.fp ?? null)) return false;
    const endGapDays = Math.round((currentEnd - Date.parse(candidate.end)) / 86400000);
    const durationGapDays = Math.abs(currentDays - durationDays(candidate));
    return endGapDays >= 300 && endGapDays <= 430 && durationGapDays <= 14;
  });
  return previous ? { current, previous } : null;
}

function extractComparableEps(companyFacts) {
  for (const [namespace, factName] of EPS_FACTS) {
    const units = companyFacts?.facts?.[namespace]?.[factName]?.units ?? {};
    const entries = units['USD/shares'] ?? units.USD ?? [];
    const pair = findComparablePair(entries);
    if (pair) return { ...pair, fact: `${namespace}:${factName}` };
  }
  return null;
}

async function fetchJson(url, { fetchImpl, userAgent }) {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': userAgent,
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
  });
  if (!response.ok) throw new Error(`SEC request failed: ${response.status}`);
  return response.json();
}

async function loadTickerMap({ fetchImpl, userAgent }) {
  if (tickerMapCache) return tickerMapCache;
  const payload = await fetchJson(SEC_TICKERS_URL, { fetchImpl, userAgent });
  tickerMapCache = new Map(
    Object.values(payload ?? {}).map((entry) => [
      normalizeTicker(entry?.ticker),
      padCik(entry?.cik_str),
    ]),
  );
  return tickerMapCache;
}

async function loadCompanyFacts(cik, { fetchImpl, userAgent }) {
  if (companyFactsCache.has(cik)) return companyFactsCache.get(cik);
  const payload = await fetchJson(`${SEC_COMPANY_FACTS_BASE_URL}/CIK${cik}.json`, {
    fetchImpl,
    userAgent,
  });
  companyFactsCache.set(cik, payload);
  return payload;
}

export async function getSecEpsTurnaroundSupplements(
  rows,
  {
    fetchImpl = globalThis.fetch,
    userAgent = process.env.SEC_USER_AGENT,
    requestDelayMs = 125,
  } = {},
) {
  if (!userAgent || typeof fetchImpl !== 'function') return {};
  const targets = rows.filter((row) => row?.epsGrowthTtm === null && row?.exchange !== 'OTC');
  if (targets.length === 0) return {};

  try {
    const tickerMap = await loadTickerMap({ fetchImpl, userAgent });
    const supplements = {};
    let requestCount = 0;
    for (const row of targets) {
      const symbol = String(row.symbol ?? '').toUpperCase();
      const cik = tickerMap.get(normalizeTicker(symbol));
      if (!cik) continue;
      try {
        if (requestCount > 0 && requestDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, requestDelayMs));
        }
        const companyFacts = await loadCompanyFacts(cik, { fetchImpl, userAgent });
        requestCount += 1;
        const comparison = extractComparableEps(companyFacts);
        if (!comparison) continue;
        const previousEps = comparison.previous.val;
        const currentEps = comparison.current.val;
        if (previousEps > 0 || currentEps <= 0) continue;
        supplements[symbol] = {
          epsGrowthStatus: 'turnaround_to_profit',
          epsGrowthDisplay: `黒字転換 (SEC ${previousEps} -> ${currentEps})`,
          epsGrowthSourceDetail: {
            source: 'sec-companyfacts',
            fact: comparison.fact,
            currentPeriod: comparison.current.frame ?? `${comparison.current.fy} ${comparison.current.fp}`,
            previousPeriod: comparison.previous.frame ?? `${comparison.previous.fy} ${comparison.previous.fp}`,
            currentEps,
            previousEps,
          },
          source: `sec-companyfacts-cik-${cik}`,
        };
      } catch {
        // A single unavailable company must not fail the screener.
      }
    }
    return supplements;
  } catch {
    return {};
  }
}

export function resetSecEdgarCachesForTests() {
  tickerMapCache = null;
  companyFactsCache.clear();
}
