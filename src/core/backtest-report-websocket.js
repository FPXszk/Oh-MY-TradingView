// ---------------------------------------------------------------------------
// WebSocket `du` frame report extraction — pure helpers
// ---------------------------------------------------------------------------

export const REQUIRED_PERFORMANCE_KEYS = [
  'netProfit',
  'totalTrades',
  'percentProfitable',
  'profitFactor',
];
export const REQUIRED_REPORT_KEYS = ['maxStrategyDrawDown'];

function parseDuMessageObject(msg) {
  if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return null;
  if (msg.m !== 'du') return null;

  const p = msg.p;
  if (!Array.isArray(p) || p.length < 2) return null;

  const sessionId = p[0];
  const studyData = p[1];

  if (typeof sessionId !== 'string' || sessionId === '') return null;
  if (!studyData || typeof studyData !== 'object' || Array.isArray(studyData)) return null;

  return { sessionId, studyData };
}

export function decodeWsJsonMessages(rawMessage) {
  if (typeof rawMessage !== 'string') {
    if (!rawMessage || typeof rawMessage !== 'object' || Array.isArray(rawMessage)) {
      return [];
    }
    return [rawMessage];
  }

  const text = rawMessage.trim();
  if (text === '') {
    return [];
  }

  if (!text.startsWith('~m~')) {
    try {
      return [JSON.parse(text)];
    } catch {
      return [];
    }
  }

  const messages = [];
  let index = 0;

  while (index < text.length) {
    if (!text.startsWith('~m~', index)) {
      break;
    }
    index += 3;

    const lengthDelimiter = text.indexOf('~m~', index);
    if (lengthDelimiter === -1) {
      break;
    }

    const lengthRaw = text.slice(index, lengthDelimiter);
    const payloadLength = Number(lengthRaw);
    if (!Number.isInteger(payloadLength) || payloadLength < 0) {
      break;
    }

    index = lengthDelimiter + 3;
    const payload = text.slice(index, index + payloadLength);
    if (payload.length !== payloadLength) {
      break;
    }
    index += payloadLength;

    if (payload.startsWith('~h~')) {
      continue;
    }

    try {
      messages.push(JSON.parse(payload));
    } catch {
      // non-JSON payload inside frame — ignore
    }
  }

  return messages;
}

/**
 * Parse a raw WebSocket `du` frame message.
 * Returns `{ sessionId, studyData }` or `null` for any non-du / malformed input.
 */
export function parseDuFramePayload(rawMessage) {
  const messages = decodeWsJsonMessages(rawMessage);
  for (const msg of messages) {
    const parsed = parseDuMessageObject(msg);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

/**
 * Walk study data keys and return the first `report.performance` that contains
 * the required performance fields (`netProfit` in `performance.all`).
 * Returns the raw `{ performance: { all: {...}, maxStrategyDrawDown: ... } }` shape
 * or `null`.
 */
export function extractReportFromStudyData(studyData) {
  if (!studyData || typeof studyData !== 'object' || Array.isArray(studyData)) return null;

  for (const key of Object.keys(studyData)) {
    const entry = studyData[key];
    if (!entry || typeof entry !== 'object') continue;

    const report = entry.report;
    if (!report || typeof report !== 'object') continue;

    const performance = report.performance;
    if (!performance || typeof performance !== 'object') continue;

    const all = performance.all;
    if (!all || typeof all !== 'object') continue;

  const hasRequiredAll = REQUIRED_PERFORMANCE_KEYS.every(
    (k) => all[k] !== undefined && all[k] !== null,
  );
  if (!hasRequiredAll) continue;

  const hasRequiredReport = REQUIRED_REPORT_KEYS.every(
    (k) => performance[k] !== undefined && performance[k] !== null,
  );
  if (!hasRequiredReport) continue;

  return { performance };
  }

  return null;
}

/**
 * Exact session-ID match. Returns `false` for any falsy, non-string, or empty value.
 */
export function isSessionMatch(frameSessionId, expectedSessionId) {
  if (!frameSessionId || typeof frameSessionId !== 'string') return false;
  if (!expectedSessionId || typeof expectedSessionId !== 'string') return false;
  return frameSessionId === expectedSessionId;
}

/**
 * Convenience wrapper: parse frame → verify session → extract report.
 * Returns normalizeMetrics-compatible shape or `null`.
 */
export function extractMetricsFromWsReport(rawMessage, { expectedSessionId } = {}) {
  const parsed = parseDuFramePayload(rawMessage);
  if (!parsed) return null;

  if (expectedSessionId != null) {
    if (!isSessionMatch(parsed.sessionId, expectedSessionId)) return null;
  }

  return extractReportFromStudyData(parsed.studyData);
}

/**
 * Collect valid report-bearing `du` frames from a frame list.
 * When `expectedSessionId` is provided, only that session is retained.
 */
export function collectWsReportCandidates(rawMessages, { expectedSessionId } = {}) {
  if (!Array.isArray(rawMessages)) return [];

  const candidates = [];
  for (const rawMessage of rawMessages) {
    const parsed = parseDuFramePayload(rawMessage);
    if (!parsed) continue;

    if (expectedSessionId != null && !isSessionMatch(parsed.sessionId, expectedSessionId)) {
      continue;
    }

    const report = extractReportFromStudyData(parsed.studyData);
    if (!report) continue;

    candidates.push({
      sessionId: parsed.sessionId,
      report,
    });
  }

  return candidates;
}

/**
 * Pick the latest valid report-bearing `du` frame candidate.
 * When `requireUniqueSession` is true, mixed candidate sessions are rejected.
 */
export function selectLatestWsReportCandidate(
  rawMessages,
  { expectedSessionId, requireUniqueSession = false } = {},
) {
  const candidates = collectWsReportCandidates(rawMessages, { expectedSessionId });
  if (candidates.length === 0) return null;

  if (requireUniqueSession) {
    const sessionIds = new Set(candidates.map((candidate) => candidate.sessionId));
    if (sessionIds.size !== 1) {
      return null;
    }
  }

  return candidates[candidates.length - 1];
}
