import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();
const WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener.yml');
const JP_WORKFLOW_PATH = join(PROJECT_ROOT, '.github', 'workflows', 'daily-screener-japan.yml');
const SYNC_SCRIPT_PATH = join(PROJECT_ROOT, 'scripts', 'windows', 'github-actions', 'sync-daily-screener-report-to-main.ps1');

describe('Daily Fundamental Screener workflow', () => {
  it('preserves local self-hosted artifacts and avoids npm cache save warnings', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /actions\/checkout@v4[\s\S]*?with:[\s\S]*?clean:\s+false/,
      'workflow checkout must not delete untracked local artifacts');
    assert.doesNotMatch(workflow, /cache:\s+['"]?npm['"]?/,
      'workflow must not enable setup-node npm cache on the Windows self-hosted runner');
  });

  it('publishes the report from the Windows checkout and uploads run metadata', () => {
    const workflow = readFileSync(WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /SCREENER_EXCHANGES:\s+NASDAQ,NYSE/,
      'US workflow must limit the report universe to NASDAQ and NYSE');
    assert.match(workflow, /SCREENER_RESULT_LIMIT:\s+'90'/,
      'US workflow must publish up to 30 names for each of the top 3 sectors');
    assert.match(workflow, /SCREENER_SELECTED_SECTOR_COUNT:\s+'3'/,
      'US workflow must narrow phase1 sector selection to the strongest 3 sectors');
    assert.match(workflow, /SCREENER_EXTRA_PHASE1_SECTORS:\s+Technology Services/,
      'US workflow must keep AI cloud names such as NBIS observable even when Technology Services is outside the top 3 sectors');
    assert.match(workflow, /SCREENER_GROSS_MARGIN_MIN_PCT:\s+'30'/,
      'US workflow must lower the gross-margin threshold to 30%');
    assert.match(workflow, /name:\s+Publish screener report to main/,
      'workflow must run a dedicated publish step after report generation');
    assert.match(workflow, /name:\s+Validate screener report output/,
      'workflow must fail fast if the screener did not emit the markdown report');
    assert.match(workflow, /sync-daily-screener-report-to-main\.ps1/,
      'workflow must call the Windows native sync PowerShell script');
    assert.match(workflow, /SCREENER_METADATA_PATH:\s+docs\/reports\/screener\/daily-ranking-run\.json/,
      'workflow must generate and handle per-run metadata');
    assert.match(workflow, /actions\/upload-artifact@v4[\s\S]*?path:\s*\|[\s\S]*?\$\{\{\s*env\.SCREENER_REPORT_PATH\s*\}\}[\s\S]*?\$\{\{\s*env\.SCREENER_METADATA_PATH\s*\}\}/,
      'artifact upload must keep both the report and the run metadata');
    assert.match(workflow, /name:\s+Notify LINE on success/,
      'US workflow must send a LINE notification after a successful run');
    assert.match(workflow, /name:\s+Notify LINE on failure/,
      'US workflow must send a LINE notification when the run fails');
    assert.match(workflow, /LINE_CHANNEL_ACCESS_TOKEN:\s+\$\{\{\s*secrets\.LINE_CHANNEL_ACCESS_TOKEN\s*\}\}/,
      'US workflow must pass the LINE channel access token secret');
    assert.match(workflow, /LINE_TO_USER_ID:\s+\$\{\{\s*secrets\.LINE_TO_USER_ID\s*\}\}/,
      'US workflow must pass the LINE destination user id secret');
  });

  it('defines a separate Japan workflow with TSE Prime scope', () => {
    const workflow = readFileSync(JP_WORKFLOW_PATH, 'utf8');

    assert.match(workflow, /name:\s+Daily Fundamental Screener Japan/,
      'Japan workflow must be defined separately');
    assert.match(workflow, /SCREENER_MARKET:\s+japan/,
      'Japan workflow must switch the scanner market to japan');
    assert.match(workflow, /SCREENER_EXCHANGES:\s+TSE/,
      'Japan workflow must filter to TSE listings');
    assert.match(workflow, /SCREENER_SYMBOL_ALLOWLIST_KEY:\s+jpx-prime/,
      'Japan workflow must restrict the universe to JPX Prime symbols');
    assert.match(workflow, /SCREENER_RESULT_LIMIT:\s+'90'/,
      'Japan workflow must keep enough report capacity for Industry and Sector Top stock views');
    assert.match(workflow, /SCREENER_SELECTED_SECTOR_COUNT:\s+'5'/,
      'Japan workflow must select five Phase1 sectors for the Industry hierarchy');
    assert.match(workflow, /SCREENER_REPORT_PATH:\s+docs\/reports\/screener\/daily-ranking-jp\.md/,
      'Japan workflow must write a dedicated markdown report');
    assert.match(workflow, /SCREENER_METADATA_PATH:\s+docs\/reports\/screener\/daily-ranking-jp-run\.json/,
      'Japan workflow must write dedicated metadata');
    assert.match(workflow, /SCREENER_AUDIT_PATH:\s+docs\/reports\/screener\/daily-ranking-jp-audit\.json/,
      'Japan workflow must write a dedicated audit artifact');
    assert.match(workflow, /SCREENER_AUDIT_STRICT:\s+'true'/,
      'Japan workflow must fail strict audit criticals');
    assert.match(workflow, /EDINET_API_KEY:\s+\$\{\{\s*secrets\.EDINET_API_KEY\s*\}\}/,
      'Japan workflow must pass the EDINET API key when available');
    assert.match(workflow, /actions\/upload-artifact@v4[\s\S]*?path:\s*\|[\s\S]*?\$\{\{\s*env\.SCREENER_REPORT_PATH\s*\}\}[\s\S]*?\$\{\{\s*env\.SCREENER_METADATA_PATH\s*\}\}[\s\S]*?\$\{\{\s*env\.SCREENER_AUDIT_PATH\s*\}\}/,
      'Japan artifact upload must keep report, run metadata, and audit JSON');
    assert.match(workflow, /-AuditPath "\$\{\{\s*env\.SCREENER_AUDIT_PATH\s*\}\}"/,
      'Japan publish step must include the audit path');
    assert.match(workflow, /name:\s+Notify LINE on success/,
      'Japan workflow must send a LINE notification after a successful run');
    assert.match(workflow, /name:\s+Notify LINE on failure/,
      'Japan workflow must send a LINE notification when the run fails');
    assert.doesNotMatch(workflow, /SCREENER_REPORT_TITLE:/,
      'Japan workflow should rely on the shared date-based default title');
  });
});

describe('daily screener Windows native publish script', () => {
  it('stages only screener report files and pushes main', () => {
    const script = readFileSync(SYNC_SCRIPT_PATH, 'utf8');

    assert.doesNotMatch(script, /wsl\.exe|wslpath|bash -lc/,
      'publish script must not depend on WSL');
    assert.match(script, /\[string\]\$ReportPath = 'docs\/reports\/screener\/daily-ranking\.md'/,
      'publish script must accept an overridable report path');
    assert.match(script, /\[string\]\$MetadataPath = 'docs\/reports\/screener\/daily-ranking-run\.json'/,
      'publish script must accept an overridable metadata path');
    assert.match(script, /\[string\]\$AuditPath = ''/,
      'publish script must accept an optional audit path');
    assert.match(script, /git add -- \$ReportPath \$MetadataPath/,
      'publish script must stage only the configured screener report files');
    assert.match(script, /git add -- \$ReportPath \$MetadataPath \$AuditPath/,
      'publish script must include the configured audit file when provided');
    assert.match(script, /git push origin HEAD:main/,
      'publish script must push the Windows checkout commit to main');
  });
});
