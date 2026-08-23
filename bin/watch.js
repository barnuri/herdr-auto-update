#!/usr/bin/env node
'use strict';

const { loadConfig } = require('../lib/config');
const { checkOnce } = require('./check');
const { createLogger } = require('../lib/logger');

const MS_PER_MINUTE = 60 * 1000;
const logger = createLogger('watch');

function runSafely() {
  logger.debug('running scheduled update check');
  checkOnce().catch((error) => {
    logger.error(`check failed: ${error.message}`);
  });
}

// startup hook entry: check once right away, then keep checking on the
// configured interval for as long as herdr is running
const config = loadConfig();
logger.info(`starting watch loop, checking every ${config.checkIntervalMinutes} minutes`);
runSafely();
setInterval(runSafely, config.checkIntervalMinutes * MS_PER_MINUTE);
