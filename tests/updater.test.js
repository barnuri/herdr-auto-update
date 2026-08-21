'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { decideUpdate } = require('../lib/updater');

const ALL_ON = { autoUpdateMajors: true, autoUpdateMinors: true, autoUpdatePatches: true };

describe('decideUpdate', () => {
  test('updates every kind when all toggles are on (the default)', () => {
    assert.deepEqual(decideUpdate(ALL_ON, '0.8.2', '0.8.3'), { action: 'update', kind: 'patch' });
    assert.deepEqual(decideUpdate(ALL_ON, '0.8.2', '0.9.0'), { action: 'update', kind: 'minor' });
    assert.deepEqual(decideUpdate(ALL_ON, '0.8.2', '1.0.0'), { action: 'update', kind: 'major' });
  });

  test('skips a kind whose toggle is off', () => {
    assert.deepEqual(decideUpdate({ ...ALL_ON, autoUpdateMajors: false }, '0.8.2', '1.0.0'), { action: 'skip', kind: 'major' });
    assert.deepEqual(decideUpdate({ ...ALL_ON, autoUpdateMinors: false }, '0.8.2', '0.9.0'), { action: 'skip', kind: 'minor' });
    assert.deepEqual(decideUpdate({ ...ALL_ON, autoUpdatePatches: false }, '0.8.2', '0.8.3'), { action: 'skip', kind: 'patch' });
  });

  test('does nothing when already up to date or ahead', () => {
    assert.deepEqual(decideUpdate(ALL_ON, '0.8.2', '0.8.2'), { action: 'none', kind: null });
    assert.deepEqual(decideUpdate(ALL_ON, '0.9.0', '0.8.2'), { action: 'none', kind: null });
  });
});
