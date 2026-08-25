'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { ANSI, STALE_GRACE_MINUTES, DEFAULT_INTERVAL_MINUTES, formatStatusLine } = require('../lib/status-format');

const MS_PER_MINUTE = 60 * 1000;
const NOW = new Date('2026-08-26T01:00:00');
const LAST_CHECK = new Date('2026-08-26T00:26:00');

function stripAnsi(line) {
  // eslint-disable-next-line no-control-regex
  return line.replace(/\x1b\[\d+m/g, '');
}

function freshState(overrides = {}) {
  return {
    current: '0.8.2',
    latest: '0.8.2',
    lastResult: 'current',
    lastCheckAt: LAST_CHECK.toISOString(),
    checkIntervalMinutes: 360,
    ...overrides,
  };
}

describe('formatStatusLine', () => {
  test('renders an up-to-date check with the last and next check times', () => {
    assert.equal(formatStatusLine(freshState(), NOW), 'v0.8.2 ✓ 00:26→06:26');
  });

  test('emits no escape codes unless colour is requested', () => {
    const states = [
      freshState(),
      freshState({ latest: '0.9.0', lastResult: 'skipped' }),
      freshState({ lastResult: 'failed' }),
      freshState({ lastCheckAt: '2026-08-23T20:23:00' }),
      {},
    ];
    for (const state of states) {
      const line = formatStatusLine(state, NOW);
      assert.equal(line, stripAnsi(line), `unexpected escape codes in: ${JSON.stringify(line)}`);
    }
  });

  test('wraps the line in green when colour is requested and herdr is current', () => {
    const line = formatStatusLine(freshState(), NOW, { color: true });
    assert.equal(stripAnsi(line), 'v0.8.2 ✓ 00:26→06:26');
    assert.ok(line.startsWith(ANSI.green));
    assert.ok(line.endsWith(ANSI.reset));
  });

  test('renders a skipped update in yellow with the available version', () => {
    const line = formatStatusLine(freshState({ latest: '0.9.0', lastResult: 'skipped' }), NOW, { color: true });
    assert.equal(stripAnsi(line), 'v0.8.2 ↑v0.9.0 00:26→06:26');
    assert.ok(line.startsWith(ANSI.yellow));
  });

  test('renders a newer available version in yellow even without a lastResult', () => {
    const state = freshState({ latest: '0.9.0' });
    delete state.lastResult;
    assert.equal(stripAnsi(formatStatusLine(state, NOW)), 'v0.8.2 ↑v0.9.0 00:26→06:26');
  });

  test('renders a failed update in red', () => {
    const line = formatStatusLine(freshState({ lastResult: 'failed' }), NOW, { color: true });
    assert.equal(stripAnsi(line), 'v0.8.2 ✗ update failed');
    assert.ok(line.startsWith(ANSI.red));
  });

  test('prefers the failure indicator over a stale schedule', () => {
    const state = freshState({ lastResult: 'failed', lastCheckAt: '2026-08-23T20:23:00' });
    assert.equal(stripAnsi(formatStatusLine(state, NOW)), 'v0.8.2 ✗ update failed');
  });

  test('renders an overdue check as stale in red', () => {
    const line = formatStatusLine(freshState({ lastCheckAt: '2026-08-23T20:23:00' }), NOW, { color: true });
    assert.equal(stripAnsi(line), 'v0.8.2 ⚠ stale');
    assert.ok(line.startsWith(ANSI.red));
  });

  test('is not stale while still inside the grace period', () => {
    const now = new Date(LAST_CHECK.getTime() + (360 + STALE_GRACE_MINUTES - 1) * MS_PER_MINUTE);
    assert.equal(stripAnsi(formatStatusLine(freshState(), now)), 'v0.8.2 ✓ 00:26→06:26');
  });

  test('is stale once the grace period is exceeded', () => {
    const now = new Date(LAST_CHECK.getTime() + (360 + STALE_GRACE_MINUTES + 1) * MS_PER_MINUTE);
    assert.equal(stripAnsi(formatStatusLine(freshState(), now)), 'v0.8.2 ⚠ stale');
  });

  test('falls back to the default interval when the state carries none', () => {
    const state = freshState();
    delete state.checkIntervalMinutes;
    const expectedNext = new Date(LAST_CHECK.getTime() + DEFAULT_INTERVAL_MINUTES * MS_PER_MINUTE);
    assert.ok(stripAnsi(formatStatusLine(state, NOW)).endsWith(`→0${expectedNext.getHours()}:26`));
  });

  test('falls back to the default interval when the stored interval is not a positive number', () => {
    const line = formatStatusLine(freshState({ checkIntervalMinutes: 'soon' }), NOW);
    assert.equal(stripAnsi(line), 'v0.8.2 ✓ 00:26→06:26');
  });

  test('renders a dim placeholder when the state has no last-check timestamp', () => {
    const line = formatStatusLine({}, NOW, { color: true });
    assert.equal(stripAnsi(line), 'herdr …');
    assert.ok(line.startsWith(ANSI.dim));
  });

  test('renders a dim placeholder when the last-check timestamp is unparseable', () => {
    const line = formatStatusLine(freshState({ lastCheckAt: 'yesterday' }), NOW);
    assert.equal(stripAnsi(line), 'v0.8.2 …');
  });

  test('keeps the known version when only the schedule is missing', () => {
    const state = freshState();
    delete state.lastCheckAt;
    assert.equal(stripAnsi(formatStatusLine(state, NOW)), 'v0.8.2 …');
  });

  test('pads single-digit clock components', () => {
    const state = freshState({ lastCheckAt: '2026-08-26T09:05:00', checkIntervalMinutes: 60 });
    const now = new Date('2026-08-26T09:30:00');
    assert.equal(stripAnsi(formatStatusLine(state, now)), 'v0.8.2 ✓ 09:05→10:05');
  });
});
