#!/usr/bin/env node
'use strict';

const { statePath, readState, writeState } = require('../lib/state');
const { notify } = require('../lib/updater');
const { createLogger } = require('../lib/logger');

const NOTIFICATION_TITLE = 'Herdr Auto Update';
const logger = createLogger('toggle-status');

// The flag lives in the state file, not the plugin config: herdr sets
// HERDR_PLUGIN_CONFIG_DIR for plugin processes like this action but NOT for the
// tab-bar command, so a config-based flag would be written and read in two
// different places and the toggle would never take effect.
function main() {
  const hidden = readState().statusHidden !== true;
  writeState({ statusHidden: hidden });

  const visibility = hidden ? 'hidden' : 'visible';
  logger.info(`status line is now ${visibility} (${statePath()})`);
  process.stdout.write(`herdr-auto-update: status line is now ${visibility}\n`);
  notify(NOTIFICATION_TITLE, `Status line ${visibility}`);
}

main();
