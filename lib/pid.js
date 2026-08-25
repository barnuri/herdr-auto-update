'use strict';

const fs = require('node:fs');

const { configDir, pidPath } = require('./paths');
const { createLogger } = require('./logger');

const logger = createLogger('pid');

function writePidFile() {
  try {
    fs.mkdirSync(configDir(), { recursive: true });
    fs.writeFileSync(pidPath(), `${process.pid}\n`, 'utf8');
    logger.debug(`recorded pid ${process.pid} at ${pidPath()}`);
  } catch (error) {
    logger.warn(`failed to record pid: ${error.message}`);
  }
}

function clearPidFile() {
  try {
    fs.unlinkSync(pidPath());
  } catch {
    // already gone, or never written — nothing to clean up
  }
}

module.exports = { writePidFile, clearPidFile };
