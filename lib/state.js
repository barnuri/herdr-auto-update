'use strict';

const path = require('node:path');

const { readJsonObject, writeJsonObject } = require('./json-file');
const { stateDir } = require('./paths');
const { createLogger } = require('./logger');

const logger = createLogger('state');

const STATE_FILE_NAME = 'last-check.json';

function statePath() {
  return path.join(stateDir(), STATE_FILE_NAME);
}

function readState() {
  const { value, error } = readJsonObject(statePath());
  if (!value) {
    logger.debug(`no usable prior state at ${statePath()}: ${error.message}`);
    return {};
  }
  return value;
}

// merges onto whatever is already on disk so callers never have to read-modify-write
function writeState(patch) {
  const merged = { ...readState(), ...patch };
  const error = writeJsonObject(statePath(), merged);
  if (error) {
    logger.error(`failed to persist state: ${error.message}`);
    return merged;
  }
  logger.debug(`state written to ${statePath()}`);
  return merged;
}

module.exports = { stateDir, statePath, readState, writeState };
