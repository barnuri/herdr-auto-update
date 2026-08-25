'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLUGIN_ID = 'barnuri.auto-update';
const PID_FILE_NAME = 'watch.pid';
const LOG_FILE_NAME = 'plugin.log';

// herdr exports HERDR_PLUGIN_CONFIG_DIR / HERDR_PLUGIN_STATE_DIR to the processes
// it spawns for a plugin (startup, actions, panes, event hooks) but NOT to a
// ui.tab_bar_right command, which it runs as a plain command. Without the probe
// below, bin/status.js would read a different config and state directory than
// every other entrypoint writes to, and the status line would never reflect an
// update check or a hide toggle.
function resolveDir(envValue, herdrManagedDir, standaloneDir) {
  if (envValue) {
    return envValue;
  }
  if (fs.existsSync(herdrManagedDir)) {
    return herdrManagedDir;
  }
  return standaloneDir;
}

function configDir() {
  return resolveDir(
    process.env.HERDR_PLUGIN_CONFIG_DIR,
    path.join(os.homedir(), '.config', 'herdr', 'plugins', 'config', PLUGIN_ID),
    path.join(os.homedir(), '.config', 'herdr-auto-update')
  );
}

function stateDir() {
  return resolveDir(
    process.env.HERDR_PLUGIN_STATE_DIR,
    path.join(os.homedir(), '.local', 'state', 'herdr', 'plugins', PLUGIN_ID),
    path.join(os.homedir(), '.local', 'state', 'herdr-auto-update')
  );
}

function pidPath() {
  return path.join(configDir(), PID_FILE_NAME);
}

function logFilePath() {
  return path.join(configDir(), 'logs', LOG_FILE_NAME);
}

module.exports = { PLUGIN_ID, resolveDir, configDir, stateDir, pidPath, logFilePath };
