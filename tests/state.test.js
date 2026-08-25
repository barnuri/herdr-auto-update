'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { statePath, readState, writeState } = require('../lib/state');

const ORIGINAL_STATE_DIR = process.env.HERDR_PLUGIN_STATE_DIR;

describe('state', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-auto-update-state-'));
    process.env.HERDR_PLUGIN_STATE_DIR = tmpDir;
  });

  afterEach(() => {
    if (ORIGINAL_STATE_DIR === undefined) {
      delete process.env.HERDR_PLUGIN_STATE_DIR;
    } else {
      process.env.HERDR_PLUGIN_STATE_DIR = ORIGINAL_STATE_DIR;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeStateFile(contents) {
    fs.writeFileSync(statePath(), contents, 'utf8');
  }

  test('returns an empty object when no state file exists', () => {
    assert.deepEqual(readState(), {});
  });

  test('round-trips a written state', () => {
    writeState({ current: '0.8.2', latest: '0.9.0' });
    assert.deepEqual(readState(), { current: '0.8.2', latest: '0.9.0' });
  });

  test('creates the state directory when it is missing', () => {
    const nested = path.join(tmpDir, 'deep', 'nested');
    process.env.HERDR_PLUGIN_STATE_DIR = nested;
    writeState({ current: '0.8.2' });
    assert.equal(readState().current, '0.8.2');
  });

  test('merges onto existing state instead of replacing it', () => {
    writeState({ current: '0.8.2', notifiedSkipVersion: '0.9.0' });
    writeState({ lastResult: 'failed' });
    assert.deepEqual(readState(), {
      current: '0.8.2',
      notifiedSkipVersion: '0.9.0',
      lastResult: 'failed',
    });
  });

  test('overwrites keys present in the patch', () => {
    writeState({ lastResult: 'current' });
    writeState({ lastResult: 'failed' });
    assert.equal(readState().lastResult, 'failed');
  });

  test('returns the merged state from writeState', () => {
    writeState({ current: '0.8.2' });
    assert.deepEqual(writeState({ latest: '0.9.0' }), { current: '0.8.2', latest: '0.9.0' });
  });

  test('ignores a corrupt state file', () => {
    writeStateFile('not json{{{');
    assert.deepEqual(readState(), {});
  });

  test('ignores a state file holding a non-object', () => {
    writeStateFile('42');
    assert.deepEqual(readState(), {});
  });

  test('ignores a state file holding an array', () => {
    writeStateFile('[1, 2, 3]');
    assert.deepEqual(readState(), {});
  });

  test('ignores a state file holding null', () => {
    writeStateFile('null');
    assert.deepEqual(readState(), {});
  });

  test('recovers by overwriting a corrupt state file', () => {
    writeStateFile('not json{{{');
    writeState({ current: '0.8.2' });
    assert.deepEqual(readState(), { current: '0.8.2' });
  });
});
