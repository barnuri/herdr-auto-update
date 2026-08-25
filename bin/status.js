#!/usr/bin/env node
'use strict';

const { readState } = require('../lib/state');
const { formatStatusLine } = require('../lib/status-format');

function main() {
  const state = readState();
  if (state.statusHidden) {
    return;
  }
  process.stdout.write(`${formatStatusLine(state)}\n`);
}

// herdr re-runs this on every tab-bar refresh: printing nothing is always
// preferable to a stack trace leaking into the status area
try {
  main();
} catch {
  // intentionally silent
}
