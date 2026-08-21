'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { parseVersion, updateKind } = require('../lib/semver');

describe('parseVersion', () => {
  test('parses plain and v-prefixed versions', () => {
    assert.deepEqual(parseVersion('0.8.2'), { major: 0, minor: 8, patch: 2 });
    assert.deepEqual(parseVersion('v1.12.3'), { major: 1, minor: 12, patch: 3 });
    assert.deepEqual(parseVersion(' 2.0.0-rc.1 '), { major: 2, minor: 0, patch: 0 });
  });

  test('returns null for garbage', () => {
    assert.equal(parseVersion('latest'), null);
    assert.equal(parseVersion(''), null);
    assert.equal(parseVersion(undefined), null);
    assert.equal(parseVersion('1.2'), null);
  });
});

describe('updateKind', () => {
  test('classifies patch, minor, and major jumps', () => {
    assert.equal(updateKind('0.8.2', '0.8.3'), 'patch');
    assert.equal(updateKind('0.8.2', '0.9.0'), 'minor');
    assert.equal(updateKind('0.8.2', '1.0.0'), 'major');
  });

  test('equal or older latest yields null', () => {
    assert.equal(updateKind('0.8.2', '0.8.2'), null);
    assert.equal(updateKind('0.8.2', '0.8.1'), null);
    assert.equal(updateKind('0.8.2', '0.7.9'), null);
    assert.equal(updateKind('1.0.0', '0.9.9'), null);
  });

  test('lower patch under a higher minor is still a minor update', () => {
    assert.equal(updateKind('0.8.5', '0.9.0'), 'minor');
    assert.equal(updateKind('1.5.9', '2.0.0'), 'major');
  });

  test('unparseable inputs yield null', () => {
    assert.equal(updateKind('abc', '0.9.0'), null);
    assert.equal(updateKind('0.8.2', 'nope'), null);
  });
});
