import { evaluate, evaluateAsync, getClient } from '../connection.js';

const FIND_MONACO = `
  (function findMonacoEditor() {
    var container = document.querySelector('.monaco-editor.pine-editor-monaco');
    if (!container) return null;
    var el = container;
    var fiberKey;
    for (var i = 0; i < 20; i++) {
      if (!el) break;
      fiberKey = Object.keys(el).find(function(k) { return k.startsWith('__reactFiber$'); });
      if (fiberKey) break;
      el = el.parentElement;
    }
    if (!fiberKey) return null;
    var current = el[fiberKey];
    for (var d = 0; d < 15; d++) {
      if (!current) break;
      if (current.memoizedProps && current.memoizedProps.value && current.memoizedProps.value.monacoEnv) {
        var env = current.memoizedProps.value.monacoEnv;
        if (env.editor && typeof env.editor.getEditors === 'function') {
          var editors = env.editor.getEditors();
          if (editors.length > 0) return { editor: editors[0], env: env };
        }
      }
      current = current.return;
    }
    return null;
  })()
`;

const MONACO_SEVERITY = {
  hint: 1,
  info: 2,
  warning: 4,
  error: 8,
};

export function classifyMarkers(markers = []) {
  const errors = [];
  const warnings = [];
  const infos = [];

  for (const marker of markers) {
    if (marker.severity === MONACO_SEVERITY.error) {
      errors.push(marker);
    } else if (marker.severity === MONACO_SEVERITY.warning) {
      warnings.push(marker);
    } else {
      infos.push(marker);
    }
  }

  return { errors, warnings, infos };
}

export async function ensurePineEditorOpen() {
  const already = await evaluate(`(function() { var m = ${FIND_MONACO}; return m !== null; })()`);
  if (already) return true;

  await evaluate(`
    (function() {
      var bwb = window.TradingView && window.TradingView.bottomWidgetBar;
      if (!bwb) return;
      if (typeof bwb.activateScriptEditorTab === 'function') bwb.activateScriptEditorTab();
      else if (typeof bwb.open === 'function') bwb.open('pine-editor');
      else if (typeof bwb.showWidget === 'function') bwb.showWidget('pine-editor');
    })()
  `);

  await evaluate(`
    (function() {
      var btn = document.querySelector('[aria-label="Pine"]')
        || document.querySelector('[data-name="pine-dialog-button"]');
      if (btn) btn.click();
    })()
  `);

  for (let i = 0; i < 50; i++) {
    await new Promise(r => setTimeout(r, 200));
    const ready = await evaluate(`(function() { return ${FIND_MONACO} !== null; })()`);
    if (ready) return true;
  }
  return false;
}

// -- Offline static analysis --

export function analyze({ source }) {
  const lines = source.split('\n');
  const diagnostics = [];

  let isV6 = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//@version=6')) { isV6 = true; break; }
    if (trimmed.startsWith('//@version=')) break;
    if (trimmed === '' || trimmed.startsWith('//')) continue;
    break;
  }

  const arrays = new Map();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fromMatch = line.match(/(\w+)\s*=\s*array\.from\(([^)]*)\)/);
    if (fromMatch) {
      const name = fromMatch[1].trim();
      const args = fromMatch[2].trim();
      const size = args === '' ? 0 : args.split(',').length;
      arrays.set(name, { name, size, line: i + 1 });
      continue;
    }
    const newMatch = line.match(/(\w+)\s*=\s*array\.new(?:<\w+>|_\w+)\((\d+)?/);
    if (newMatch) {
      const name = newMatch[1].trim();
      const size = newMatch[2] !== undefined ? parseInt(newMatch[2], 10) : null;
      arrays.set(name, { name, size, line: i + 1 });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const pattern = /array\.(get|set)\(\s*(\w+)\s*,\s*(-?\d+)/g;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const method = match[1];
      const arrName = match[2];
      const idx = parseInt(match[3], 10);
      const info = arrays.get(arrName);
      if (!info || info.size === null) continue;
      if (idx < 0 || idx >= info.size) {
        diagnostics.push({
          line: i + 1,
          column: match.index + 1,
          message: `array.${method}(${arrName}, ${idx}) — index ${idx} out of bounds (array size is ${info.size})`,
          severity: 'error',
        });
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const firstLastPattern = /(\w+)\.(first|last)\(\)/g;
    let match;
    while ((match = firstLastPattern.exec(line)) !== null) {
      const arrName = match[1];
      if (arrName === 'array') continue;
      const info = arrays.get(arrName);
      if (info && info.size === 0) {
        diagnostics.push({
          line: i + 1,
          column: match.index + 1,
          message: `${arrName}.${match[2]}() called on possibly empty array (declared with size 0)`,
          severity: 'warning',
        });
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.includes('strategy.entry') || trimmed.includes('strategy.close')) {
      let hasStrategyDecl = false;
      for (const l of lines) {
        if (l.trim().startsWith('strategy(')) { hasStrategyDecl = true; break; }
      }
      if (!hasStrategyDecl) {
        diagnostics.push({
          line: i + 1,
          column: 1,
          message: 'strategy.entry/close used but no strategy() declaration found — did you mean to use indicator()?',
          severity: 'error',
        });
        break;
      }
    }
  }

  if (!isV6 && source.includes('//@version=')) {
    const vMatch = source.match(/\/\/@version=(\d+)/);
    if (vMatch && parseInt(vMatch[1]) < 5) {
      diagnostics.push({
        line: 1,
        column: 1,
        message: `Script uses Pine v${vMatch[1]} — consider upgrading to v6 for latest features`,
        severity: 'info',
      });
    }
  }

  return {
    success: true,
    issue_count: diagnostics.length,
    diagnostics,
    note: diagnostics.length === 0
      ? 'No static analysis issues found. Use pine_compile or pine_smart_compile for full server-side compilation check.'
      : undefined,
  };
}

// -- Strategy attach verification (pure) --

/**
 * Check whether a study list contains a strategy matching the expected title.
 * @param {Array|null} studies - array of {id, name, ...} from chart.getAllStudies()
 * @param {string} expectedTitle - strategy title to look for
 * @returns {{ attached: boolean, matchedStudy: string|null }}
 */
export function verifyStrategyAttached(studies, expectedTitle) {
  if (!Array.isArray(studies) || studies.length === 0) {
    return { attached: false, matchedStudy: null };
  }
  const needle = expectedTitle.toLowerCase();
  for (const study of studies) {
    const name = (study.name || '').toLowerCase();
    const desc = (study.description || '').toLowerCase();
    if (name.includes(needle) || desc.includes(needle)) {
      return { attached: true, matchedStudy: study.name || study.description };
    }
  }
  return { attached: false, matchedStudy: null };
}

/**
 * Verify that strategy attachment is evidenced by a change, not only by presence.
 * Returns true when a matching strategy is present after apply and either:
 * - study count increased, or
 * - a new matching study ID appeared.
 */
export function verifyStrategyAttachmentChange(beforeStudies, afterStudies, expectedTitle, studyAdded = false) {
  if (!Array.isArray(afterStudies) || afterStudies.length === 0) {
    return { attached: false, matchedStudy: null, reason: 'no_matching_strategy_after' };
  }

  const needle = expectedTitle.toLowerCase();
  const before = Array.isArray(beforeStudies) ? beforeStudies : [];
  const matchesExpectedTitle = (study) => {
    const name = (study.name || '').toLowerCase();
    const desc = (study.description || '').toLowerCase();
    return name.includes(needle) || desc.includes(needle);
  };
  const beforeMatching = before.filter(matchesExpectedTitle);
  const beforeMatchingIds = new Set(beforeMatching.map((study) => study.id).filter(Boolean));

  const afterMatching = afterStudies.filter(matchesExpectedTitle);

  if (afterMatching.length === 0) {
    return { attached: false, matchedStudy: null, reason: 'no_matching_strategy_after' };
  }

  const newlyAdded = afterMatching.find((study) => study.id && !beforeMatchingIds.has(study.id));
  const matchingCountIncreased = afterMatching.length > beforeMatching.length;

  if (studyAdded) {
    if (newlyAdded) {
      const matchedStudy = newlyAdded.name || newlyAdded.description || null;
      return { attached: true, matchedStudy, reason: 'study_count_increased' };
    }
  }

  if (newlyAdded) {
    return {
      attached: true,
      matchedStudy: newlyAdded.name || newlyAdded.description || null,
      reason: 'new_matching_study_id',
    };
  }

  if (matchingCountIncreased) {
    return {
      attached: true,
      matchedStudy: afterMatching[afterMatching.length - 1].name || afterMatching[afterMatching.length - 1].description || null,
      reason: 'matching_strategy_count_increased',
    };
  }

  return {
    attached: false,
    matchedStudy: afterMatching[0].name || afterMatching[0].description || null,
    reason: beforeMatching.length > 0 ? 'preexisting_matching_strategy_only' : 'matching_strategy_not_verified',
  };
}

// -- Apply button picker (pure) --

const APPLY_PATTERNS = [
  { pattern: /^(add to chart|チャートに追加)$/i, priority: 1 },
  { pattern: /^(update on chart|チャート上で更新)$/i, priority: 2 },
  { pattern: /^(save and add to chart|保存してチャートに追加)$/i, priority: 3 },
];

/**
 * Pick the best apply button from a list of button labels.
 * Returns { label, index } or null if none found.
 * @param {string[]} labels
 * @returns {{ label: string, index: number }|null}
 */
export function pickApplyButton(labels) {
  if (!Array.isArray(labels) || labels.length === 0) return null;
  let best = null;
  for (let i = 0; i < labels.length; i++) {
    const text = labels[i].trim();
    for (const { pattern, priority } of APPLY_PATTERNS) {
      if (pattern.test(text)) {
        if (!best || priority < best.priority) {
          best = { label: text, index: i, priority };
        }
      }
    }
  }
  return best ? { label: best.label, index: best.index } : null;
}

// -- Functions requiring TradingView connection --

export async function getSource() {
  const editorReady = await ensurePineEditorOpen();
  if (!editorReady) throw new Error('Could not open Pine Editor or Monaco not found.');

  const source = await evaluate(`
    (function() {
      var m = ${FIND_MONACO};
      if (!m) return null;
      return m.editor.getValue();
    })()
  `);

  if (source === null || source === undefined) {
    throw new Error('Monaco editor found but getValue() returned null.');
  }

  return { success: true, source, line_count: source.split('\n').length, char_count: source.length };
}

export async function setSource({ source }) {
  const editorReady = await ensurePineEditorOpen();
  if (!editorReady) throw new Error('Could not open Pine Editor.');

  const escaped = JSON.stringify(source);
  const set = await evaluate(`
    (function() {
      var m = ${FIND_MONACO};
      if (!m) return false;
      m.editor.setValue(${escaped});
      return true;
    })()
  `);

  if (!set) throw new Error('Monaco found but setValue() failed.');
  return { success: true, lines_set: source.split('\n').length };
}

export async function compile() {
  const editorReady = await ensurePineEditorOpen();
  if (!editorReady) throw new Error('Could not open Pine Editor.');

  const clicked = await clickPreferredApplyButton();

  if (!clicked) {
    const c = await getClient();
    await c.Input.dispatchKeyEvent({
      type: 'keyDown', modifiers: 2, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
    });
    await c.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Enter', code: 'Enter' });
  }

  await new Promise(r => setTimeout(r, 2000));
  return { success: true, button_clicked: clicked || 'keyboard_shortcut' };
}

export async function getErrors() {
  const editorReady = await ensurePineEditorOpen();
  if (!editorReady) throw new Error('Could not open Pine Editor.');

  const errors = await evaluate(`
    (function() {
      var m = ${FIND_MONACO};
      if (!m) return [];
      var model = m.editor.getModel();
      if (!model) return [];
      var markers = m.env.editor.getModelMarkers({ resource: model.uri });
      return markers.map(function(mk) {
        return {
          line: mk.startLineNumber,
          column: mk.startColumn,
          message: mk.message,
          severity: mk.severity
        };
      });
    })()
  `);

  const classified = classifyMarkers(errors);

  return {
    success: true,
    has_errors: classified.errors.length > 0,
    error_count: classified.errors.length,
    warning_count: classified.warnings.length,
    info_count: classified.infos.length,
    errors: classified.errors,
    warnings: classified.warnings,
    infos: classified.infos,
  };
}

export async function smartCompile() {
  const editorReady = await ensurePineEditorOpen();
  if (!editorReady) throw new Error('Could not open Pine Editor.');

  const studiesBefore = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        if (chart && typeof chart.getAllStudies === 'function') return chart.getAllStudies().length;
      } catch(e) {}
      return null;
    })()
  `);

  const buttonClicked = await clickPreferredApplyButton();

  if (!buttonClicked) {
    const c = await getClient();
    await c.Input.dispatchKeyEvent({
      type: 'keyDown', modifiers: 2, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
    });
    await c.Input.dispatchKeyEvent({ type: 'keyUp', key: 'Enter', code: 'Enter' });
  }

  await new Promise(r => setTimeout(r, 2500));

  const errors = await evaluate(`
    (function() {
      var m = ${FIND_MONACO};
      if (!m) return [];
      var model = m.editor.getModel();
      if (!model) return [];
      var markers = m.env.editor.getModelMarkers({ resource: model.uri });
      return markers.map(function(mk) {
        return {
          line: mk.startLineNumber,
          column: mk.startColumn,
          message: mk.message,
          severity: mk.severity
        };
      });
    })()
  `);

  const studiesAfter = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        if (chart && typeof chart.getAllStudies === 'function') return chart.getAllStudies().length;
      } catch(e) {}
      return null;
    })()
  `);

  const classified = classifyMarkers(errors);
  const studyAdded =
    studiesBefore !== null && studiesAfter !== null ? studiesAfter > studiesBefore : null;

  return {
    success: true,
    button_clicked: buttonClicked || 'keyboard_shortcut',
    has_errors: classified.errors.length > 0,
    error_count: classified.errors.length,
    warning_count: classified.warnings.length,
    info_count: classified.infos.length,
    errors: classified.errors,
    warnings: classified.warnings,
    infos: classified.infos,
    study_added: studyAdded,
  };
}

/**
 * Fetch the list of studies currently on the active chart via CDP.
 * Returns an array of { id, name } or an empty array on failure.
 */
export async function fetchChartStudies() {
  const studies = await evaluate(`
    (function() {
      try {
        var chart = window.TradingViewApi._activeChartWidgetWV.value();
        if (!chart || typeof chart.getAllStudies !== 'function') return [];
        return chart.getAllStudies().map(function(s) {
          return { id: s.id || '', name: s.name || '', description: s.description || '' };
        });
      } catch(e) { return []; }
    })()
  `);
  return Array.isArray(studies) ? studies : [];
}

/**
 * Attempt to click a specific apply button by label via CDP.
 * Returns true if the button was found and clicked.
 */
export async function clickApplyButtonByLabel(targetLabel) {
  const labelJson = JSON.stringify(targetLabel);
  return evaluate(`
    (function() {
      var target = ${labelJson}.toLowerCase();
      var btns = document.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        var text = btns[i].textContent.trim().toLowerCase();
        if (text === target) {
          btns[i].click();
          return true;
        }
      }
      return false;
    })()
  `);
}

async function clickPreferredApplyButton() {
  const labels = await evaluate(`
    (function() {
      return Array.from(document.querySelectorAll('button'))
        .map(function(btn) { return (btn.textContent || '').trim(); })
        .filter(Boolean);
    })()
  `);
  const picked = pickApplyButton(Array.isArray(labels) ? labels : []);
  if (!picked) return null;
  const clicked = await clickApplyButtonByLabel(picked.label);
  return clicked ? picked.label : null;
}

const APPLY_RETRY_LABELS = [
  'Update on chart', 'チャート上で更新',
  'Add to chart', 'チャートに追加',
  'Save and add to chart', '保存してチャートに追加',
];
const ATTACH_VERIFY_DELAY = 2000;
const ATTACH_VERIFY_RETRIES = 2;

/**
 * Retry applying the strategy to the chart by trying known button labels.
 * Returns { applied: boolean, method: string|null }.
 */
export async function retryApplyStrategy(expectedTitle) {
  const studiesBeforeRetry = await fetchChartStudies();

  for (const label of APPLY_RETRY_LABELS) {
    const clicked = await clickApplyButtonByLabel(label);
    if (!clicked) continue;

    await new Promise((r) => setTimeout(r, ATTACH_VERIFY_DELAY));

    for (let attempt = 0; attempt < ATTACH_VERIFY_RETRIES; attempt++) {
      const studiesAfterClick = await fetchChartStudies();
      const studyAdded = studiesAfterClick.length > studiesBeforeRetry.length;
      const verification = verifyStrategyAttachmentChange(
        studiesBeforeRetry,
        studiesAfterClick,
        expectedTitle,
        studyAdded,
      );
      if (verification.attached) return { applied: true, method: label };
      if (verification.reason === 'preexisting_matching_strategy_only') break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return { applied: false, method: null };
}
