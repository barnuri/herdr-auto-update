#!/usr/bin/env node
'use strict';

const { loadConfig } = require('../lib/config');
const { checkOnce } = require('./check');

const MS_PER_MINUTE = 60 * 1000;

function runSafely() {
  checkOnce().catch((error) => {
    process.stderr.write(`herdr-auto-update: check failed: ${error.message}\n`);
  });
}

// startup hook entry: check once right away, then keep checking on the
// configured interval for as long as herdr is running
const config = loadConfig();
runSafely();
setInterval(runSafely, config.checkIntervalMinutes * MS_PER_MINUTE);
