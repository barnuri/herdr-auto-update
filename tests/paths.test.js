'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { resolveDir, configDir, stateDir } = require('../lib/paths');

const ORIGINAL_CONFIG_DIR = process.env.HERDR_PLUGIN_CONFIG_DIR;
const ORIGINAL_STATE_DIR = process.env.HERDR_PLUGIN_STATE_DIR;

function restore(name, original) {
  if (original === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = original;
}

describe('resolveDir', () => {
  let tmpDir;
  let existingDir;
  let missingDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-auto-update-paths-'));
    existingDir = path.join(tmpDir, 'herdr-managed');
    missingDir = path.join(tmpDir, 'not-created');
    fs.mkdirSync(existingDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('prefers the environment value herdr exports to plugin processes', () => {
    assert.equal(resolveDir('/from/env', existingDir, '/standalone'), '/from/env');
  });

  test('falls back to the herdr-managed directory when it exists', () => {
    assert.equal(resolveDir(undefined, existingDir, '/standalone'), existingDir);
  });

  test('falls back to the standalone directory when herdr has not created one', () => {
    assert.equal(resolveDir(undefined, missingDir, '/standalone'), '/standalone');
  });

  test('treats an empty environment value as unset', () => {
    assert.equal(resolveDir('', existingDir, '/standalone'), existingDir);
  });
});

describe('directory resolution without herdr environment', () => {
  beforeEach(() => {
    delete process.env.HERDR_PLUGIN_CONFIG_DIR;
    delete process.env.HERDR_PLUGIN_STATE_DIR;
  });

  afterEach(() => {
    restore('HERDR_PLUGIN_CONFIG_DIR', ORIGINAL_CONFIG_DIR);
    restore('HERDR_PLUGIN_STATE_DIR', ORIGINAL_STATE_DIR);
  });

  // regression: ui.tab_bar_right commands get no HERDR_PLUGIN_* variables, so an
  // env-only resolution made bin/status.js read a different directory than the
  // toggle action and the watcher wrote to
  test('a process with no herdr environment still resolves the herdr-managed config dir', () => {
    const expected = path.join(os.homedir(), '.config', 'herdr', 'plugins', 'config', 'barnuri.auto-update');
    if (!fs.existsSync(expected)) {
      return;
    }
    assert.equal(configDir(), expected);
  });

  test('a process with no herdr environment still resolves the herdr-managed state dir', () => {
    const expected = path.join(os.homedir(), '.local', 'state', 'herdr', 'plugins', 'barnuri.auto-update');
    if (!fs.existsSync(expected)) {
      return;
    }
    assert.equal(stateDir(), expected);
  });
});
