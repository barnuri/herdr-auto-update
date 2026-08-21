'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DEFAULTS = {
  autoUpdateMajors: true,
  autoUpdateMinors: true,
  autoUpdatePatches: true,
  updateWithHandoff: true,
  checkIntervalMinutes: 360,
};

const MIN_CHECK_INTERVAL_MINUTES = 15;

function configDir() {
  return process.env.HERDR_PLUGIN_CONFIG_DIR || path.join(os.homedir(), '.config', 'herdr-auto-update');
}

function configPath() {
  return path.join(configDir(), 'config.json');
}

function readConfigFile() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      process.stderr.write(`herdr-auto-update: ignoring invalid config: ${error.message}\n`);
    }
    return {};
  }
}

function loadConfig() {
  const config = { ...DEFAULTS, ...readConfigFile() };
  for (const key of ['autoUpdateMajors', 'autoUpdateMinors', 'autoUpdatePatches', 'updateWithHandoff']) {
    if (typeof config[key] !== 'boolean') {
      config[key] = DEFAULTS[key];
    }
  }
  const interval = Number(config.checkIntervalMinutes);
  config.checkIntervalMinutes = Number.isFinite(interval)
    ? Math.max(MIN_CHECK_INTERVAL_MINUTES, interval)
    : DEFAULTS.checkIntervalMinutes;
  return Object.freeze(config);
}

module.exports = { DEFAULTS, configDir, configPath, loadConfig };
