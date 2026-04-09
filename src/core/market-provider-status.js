function stringifyError(error) {
  return [
    error?.message,
    error?.stderr,
    error?.stdout,
  ]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join('\n')
    .trim();
}

export function classifyProviderFailure(error, { provider } = {}) {
  const detail = stringifyError(error);
  const providerName = typeof provider === 'string' ? provider.toLowerCase() : '';
  const isSocialAuthProvider = ['x', 'twitter'].includes(providerName);

  if (
    /authentication required|auth required|cookie expired|TWITTER_AUTH_TOKEN|TWITTER_CT0/i.test(detail)
    || (isSocialAuthProvider && /\b401\b|\b403\b/i.test(detail))
  ) {
    return {
      status: 'auth_required',
      missing_reason: 'auth_required',
      warning: detail || 'Authentication required',
    };
  }
  if (/not installed|not found|enoent|no such file/i.test(detail)) {
    return {
      status: 'not_configured',
      missing_reason: 'not_configured',
      warning: detail || 'Provider not configured',
    };
  }
  if (/No .* data|No .* found|no valid close prices|no close prices|no recent/i.test(detail)) {
    return {
      status: 'no_results',
      missing_reason: 'empty_payload',
      warning: detail || 'No results available',
    };
  }
  return {
    status: 'provider_error',
    missing_reason: 'fetch_failed',
    warning: detail || 'Provider request failed',
  };
}

export function buildProviderStatusEntry({
  provider,
  status,
  available = false,
  signal_present = false,
  missing_reason = null,
  warning = null,
  detail = null,
} = {}) {
  return {
    provider,
    status: status || 'provider_error',
    available: Boolean(available),
    signal_present: Boolean(signal_present),
    missing_reason: missing_reason ?? null,
    warning: warning ?? null,
    detail: detail ?? null,
  };
}

export function summarizeProviderCoverage(entries) {
  const normalizedEntries = Array.isArray(entries) ? entries.filter(Boolean) : [];
  const skipped_providers = normalizedEntries
    .filter((entry) => entry.status === 'skipped' || entry.missing_reason === 'not_requested')
    .map((entry) => entry.provider);
  const available_providers = normalizedEntries
    .filter((entry) => entry.available)
    .map((entry) => entry.provider);
  const missing_providers = normalizedEntries
    .filter((entry) => !entry.available && !skipped_providers.includes(entry.provider))
    .map((entry) => entry.provider);
  const degraded_providers = normalizedEntries
    .filter((entry) => entry.status !== 'ok' && entry.status !== 'skipped')
    .map((entry) => entry.provider);

  return {
    available_count: available_providers.length,
    total_count: normalizedEntries.length,
    available_providers,
    missing_providers,
    degraded_providers,
    skipped_providers,
    has_partial_failures: missing_providers.length > 0 || degraded_providers.length > 0,
  };
}
