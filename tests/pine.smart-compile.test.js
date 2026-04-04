import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyStrategyAttached,
  verifyStrategyAttachmentChange,
  pickApplyButton,
} from '../src/core/pine.js';

// ---------------------------------------------------------------------------
// verifyStrategyAttached — pure helper
// ---------------------------------------------------------------------------
describe('verifyStrategyAttached', () => {
  it('returns attached:true when strategy title found in studies', () => {
    const studies = [
      { id: 'study_1', name: 'Volume' },
      { id: 'study_2', name: 'NVDA 5/20 MA Cross' },
    ];
    const result = verifyStrategyAttached(studies, 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, true);
    assert.equal(result.matchedStudy, 'NVDA 5/20 MA Cross');
  });

  it('returns attached:false when strategy title not found', () => {
    const studies = [
      { id: 'study_1', name: 'Volume' },
      { id: 'study_2', name: 'RSI' },
    ];
    const result = verifyStrategyAttached(studies, 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, false);
    assert.equal(result.matchedStudy, null);
  });

  it('returns attached:false for empty studies array', () => {
    const result = verifyStrategyAttached([], 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, false);
  });

  it('returns attached:false for null studies', () => {
    const result = verifyStrategyAttached(null, 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, false);
  });

  it('matches case-insensitively', () => {
    const studies = [{ id: 's1', name: 'nvda 5/20 ma cross' }];
    const result = verifyStrategyAttached(studies, 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, true);
  });

  it('matches partial title in study description', () => {
    const studies = [{ id: 's1', name: 'Strategy: NVDA 5/20 MA Cross (v6)' }];
    const result = verifyStrategyAttached(studies, 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, true);
  });

  it('matches when title is only in description field', () => {
    const studies = [{ id: 's1', name: 'Script@tv-scripting-101!', description: 'NVDA 5/20 MA Cross' }];
    const result = verifyStrategyAttached(studies, 'NVDA 5/20 MA Cross');
    assert.equal(result.attached, true);
  });
});

// ---------------------------------------------------------------------------
// pickApplyButton — pure label matcher
// ---------------------------------------------------------------------------
describe('pickApplyButton', () => {
  it('prefers "Add to chart" over "Update on chart"', () => {
    const labels = ['Save', 'Update on chart', 'Add to chart'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'Add to chart');
    assert.equal(result.index, 2);
  });

  it('prefers "Update on chart" over keyboard fallback', () => {
    const labels = ['Save', 'Update on chart'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'Update on chart');
    assert.equal(result.index, 1);
  });

  it('matches Japanese "チャートに追加"', () => {
    const labels = ['保存', 'チャートに追加'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'チャートに追加');
  });

  it('matches Japanese "チャート上で更新"', () => {
    const labels = ['保存', 'チャート上で更新'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'チャート上で更新');
  });

  it('recognizes "Save and add to chart" as lowest priority apply', () => {
    const labels = ['Save and add to chart'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'Save and add to chart');
  });

  it('recognizes Japanese "保存してチャートに追加"', () => {
    const labels = ['保存してチャートに追加'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, '保存してチャートに追加');
  });

  it('returns null when no matching button found', () => {
    const labels = ['Save', 'Close'];
    const result = pickApplyButton(labels);
    assert.equal(result, null);
  });

  it('returns null for empty array', () => {
    const result = pickApplyButton([]);
    assert.equal(result, null);
  });

  it('prefers "Add to chart" over "Save and add to chart" when both exist', () => {
    const labels = ['Save and add to chart', 'Add to chart'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'Add to chart');
    assert.equal(result.index, 1);
  });

  it('prefers "チャートに追加" over "保存してチャートに追加" when both exist', () => {
    const labels = ['保存してチャートに追加', 'チャートに追加'];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'チャートに追加');
    assert.equal(result.index, 1);
  });

  it('matches title attribute when button text is empty', () => {
    const labels = [{ text: '', title: 'チャートに追加', ariaLabel: '' }];
    const result = pickApplyButton(labels);
    assert.notEqual(result, null);
    assert.equal(result.label, 'チャートに追加');
    assert.equal(result.index, 0);
  });

  it('prefers text over title when both match', () => {
    const labels = [{ text: 'Add to chart', title: 'チャートに追加', ariaLabel: '' }];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'Add to chart');
  });

  it('falls back to ariaLabel when text and title are empty', () => {
    const labels = [{ text: '', title: '', ariaLabel: 'Add to chart' }];
    const result = pickApplyButton(labels);
    assert.notEqual(result, null);
    assert.equal(result.label, 'Add to chart');
  });

  it('respects priority for title-only button descriptors', () => {
    const labels = [
      { text: '', title: '保存してチャートに追加', ariaLabel: '' },
      { text: '', title: 'チャートに追加', ariaLabel: '' },
    ];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'チャートに追加');
    assert.equal(result.index, 1);
  });

  it('handles mixed string and descriptor entries', () => {
    const labels = ['Save', { text: '', title: 'チャートに追加', ariaLabel: '' }];
    const result = pickApplyButton(labels);
    assert.equal(result.label, 'チャートに追加');
    assert.equal(result.index, 1);
  });

  it('picks unlabeled secondary button immediately before save button', () => {
    const labels = [
      { text: '', title: '', ariaLabel: '', className: 'secondary-PVWoXu5j', x: 839, y: 62 },
      { text: '', title: 'スクリプトを保存', ariaLabel: '', className: 'saveButton-fF7iXGw2 ghost-PVWoXu5j', x: 881, y: 62 },
    ];
    const result = pickApplyButton(labels);
    assert.notEqual(result, null);
    assert.equal(result.label, 'toolbar_apply_unlabeled');
    assert.equal(result.index, 0);
  });

  it('does not pick unlabeled secondary button when save button is missing', () => {
    const labels = [
      { text: '', title: '', ariaLabel: '', className: 'secondary-PVWoXu5j', x: 839, y: 62 },
      { text: '', title: 'その他', ariaLabel: '', className: 'secondary-PVWoXu5j', x: 881, y: 62 },
    ];
    const result = pickApplyButton(labels);
    assert.equal(result, null);
  });

  it('prefers the toolbar save button over unrelated save labels elsewhere', () => {
    const labels = [
      { text: '無題保存', title: '', ariaLabel: 'すべての変更を保存', className: 'button-IfxMm7Gw', x: 584, y: 0 },
      { text: '', title: '', ariaLabel: '', className: 'secondary-PVWoXu5j', x: 839, y: 62 },
      { text: '', title: 'スクリプトを保存', ariaLabel: '', className: 'saveButton-fF7iXGw2 ghost-PVWoXu5j', x: 881, y: 62 },
    ];
    const result = pickApplyButton(labels);
    assert.notEqual(result, null);
    assert.equal(result.label, 'toolbar_apply_unlabeled');
    assert.equal(result.index, 1);
  });

  it('prefers labeled add-to-chart button over unlabeled toolbar candidate', () => {
    const labels = [
      { text: '', title: '', ariaLabel: '', className: 'secondary-PVWoXu5j', x: 839, y: 62 },
      { text: '', title: 'スクリプトを保存', ariaLabel: '', className: 'saveButton-fF7iXGw2 ghost-PVWoXu5j', x: 881, y: 62 },
      { text: 'チャートに追加', title: '', ariaLabel: '', className: 'button-GwQQdU8S', x: 920, y: 62 },
    ];
    const result = pickApplyButton(labels);
    assert.notEqual(result, null);
    assert.equal(result.label, 'チャートに追加');
    assert.equal(result.index, 2);
  });
});

describe('verifyStrategyAttachmentChange', () => {
  it('returns attached:true when study count increased and matching strategy exists', () => {
    const beforeStudies = [{ id: 's1', name: 'Volume' }];
    const afterStudies = [
      { id: 's1', name: 'Volume' },
      { id: 's2', name: 'NVDA 5/20 MA Cross' },
    ];
    const result = verifyStrategyAttachmentChange(beforeStudies, afterStudies, 'NVDA 5/20 MA Cross', true);
    assert.equal(result.attached, true);
    assert.equal(result.reason, 'study_count_increased');
  });

  it('returns attached:true when a new matching study id appears', () => {
    const beforeStudies = [{ id: 's1', name: 'Volume' }];
    const afterStudies = [
      { id: 's1', name: 'Volume' },
      { id: 's2', name: 'Strategy: NVDA 5/20 MA Cross' },
    ];
    const result = verifyStrategyAttachmentChange(beforeStudies, afterStudies, 'NVDA 5/20 MA Cross', false);
    assert.equal(result.attached, true);
    assert.equal(result.reason, 'new_matching_study_id');
  });

  it('returns attached:false when only a preexisting matching strategy remains', () => {
    const beforeStudies = [{ id: 's9', name: 'NVDA 5/20 MA Cross' }];
    const afterStudies = [{ id: 's9', name: 'NVDA 5/20 MA Cross' }];
    const result = verifyStrategyAttachmentChange(beforeStudies, afterStudies, 'NVDA 5/20 MA Cross', false);
    assert.equal(result.attached, false);
    assert.equal(result.reason, 'preexisting_matching_strategy_only');
  });

  it('returns attached:false when study count increased for a non-matching study only', () => {
    const beforeStudies = [{ id: 's9', name: 'NVDA 5/20 MA Cross' }];
    const afterStudies = [
      { id: 's9', name: 'NVDA 5/20 MA Cross' },
      { id: 's10', name: 'Volume' },
    ];
    const result = verifyStrategyAttachmentChange(beforeStudies, afterStudies, 'NVDA 5/20 MA Cross', true);
    assert.equal(result.attached, false);
    assert.equal(result.reason, 'preexisting_matching_strategy_only');
  });

  it('returns attached:true when matching strategy count increases even if IDs are missing', () => {
    const beforeStudies = [{ name: 'Volume' }];
    const afterStudies = [
      { name: 'Volume' },
      { name: 'NVDA 5/20 MA Cross' },
    ];
    const result = verifyStrategyAttachmentChange(beforeStudies, afterStudies, 'NVDA 5/20 MA Cross', true);
    assert.equal(result.attached, true);
    assert.equal(result.reason, 'matching_strategy_count_increased');
  });
});
