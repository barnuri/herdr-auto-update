'use strict';

const path = require('node:path');

const { readJsonObject } = require('./json-file');
const { configDir } = require('./paths');
const { createLogger, setLevel, LEVELS } = require('./logger');

const logger = createLogger('config');

const DEFAULTS = {
  autoUpdateMajors: true,
  autoUpdateMinors: true,
  autoUpdatePatches: true,
  updateWithHandoff: true,
  checkIntervalMinutes: 360,
  logLevel: 'info',
};

const MIN_CHECK_INTERVAL_MINUTES = 15;

function configPath() {
  return path.join(configDir(), 'config.json');
}

function readConfigFile() {
  const { value, error } = readJsonObject(configPath());
  if (value) {
    return value;
  }
  if (error.code !== 'ENOENT') {
    process.stderr.write(`herdr-auto-update: ignoring invalid config: ${error.message}\n`);
  }
  return {};
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
  const normalizedLogLevel = String(config.logLevel).toLowerCase();
  config.logLevel = LEVELS[normalizedLogLevel] ? normalizedLogLevel : DEFAULTS.logLevel;
  // apply before logging so this line itself obeys the level it just resolved
  setLevel(config.logLevel);
  logger.debug(`config loaded: ${JSON.stringify(config)}`);
  return Object.freeze(config);
}

module.exports = { DEFAULTS, configDir, configPath, loadConfig };
