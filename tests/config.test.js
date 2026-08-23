'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_CONFIG_DIR = process.env.HERDR_PLUGIN_CONFIG_DIR;

function freshConfig() {
  delete require.cache[require.resolve('../lib/config')];
  delete require.cache[require.resolve('../lib/logger')];
  return require('../lib/config');
}

describe('loadConfig', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-auto-update-config-'));
    process.env.HERDR_PLUGIN_CONFIG_DIR = tmpDir;
  });

  afterEach(() => {
    if (ORIGINAL_CONFIG_DIR === undefined) {
      delete process.env.HERDR_PLUGIN_CONFIG_DIR;
    } else {
      process.env.HERDR_PLUGIN_CONFIG_DIR = ORIGINAL_CONFIG_DIR;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeConfigFile(contents) {
    fs.writeFileSync(path.join(tmpDir, 'config.json'), JSON.stringify(contents));
  }

  test('defaults to logLevel "info" when no config file exists', () => {
    const { loadConfig } = freshConfig();
    assert.equal(loadConfig().logLevel, 'info');
  });

  test('accepts a valid logLevel, case-insensitively', () => {
    writeConfigFile({ logLevel: 'DEBUG' });
    const { loadConfig } = freshConfig();
    assert.equal(loadConfig().logLevel, 'debug');
  });

  test('falls back to the default logLevel when the configured value is invalid', () => {
    writeConfigFile({ logLevel: 'not-a-level' });
    const { loadConfig } = freshConfig();
    assert.equal(loadConfig().logLevel, 'info');
  });
});
