#!/usr/bin/env node
'use strict';

const { loadConfig } = require('../lib/config');
const { checkOnce } = require('./check');
const { writePidFile, clearPidFile } = require('../lib/pid');
const { createLogger } = require('../lib/logger');

const MS_PER_MINUTE = 60 * 1000;
const EXIT_SIGNALS = ['SIGTERM', 'SIGINT'];
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

// the pid file is how scripts/ensure-watch.sh tells this process apart from the
// identically-named watcher in the sibling telegram plugin
writePidFile();
process.on('exit', clearPidFile);
for (const signal of EXIT_SIGNALS) {
  process.on(signal, () => {
    logger.info(`received ${signal}, shutting down`);
    process.exit(0);
  });
}

runSafely();
setInterval(runSafely, config.checkIntervalMinutes * MS_PER_MINUTE);
