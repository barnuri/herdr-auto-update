#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { loadConfig } = require('../lib/config');
const { currentVersion, latestVersion, decideUpdate, runUpdate, notify } = require('../lib/updater');

const NOTIFICATION_TITLE = 'Herdr Auto Update';

function stateDir() {
  return process.env.HERDR_PLUGIN_STATE_DIR || path.join(os.homedir(), '.local', 'state', 'herdr-auto-update');
}

function statePath() {
  return path.join(stateDir(), 'last-check.json');
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.mkdirSync(stateDir(), { recursive: true });
    fs.writeFileSync(statePath(), `${JSON.stringify(state)}\n`, 'utf8');
  } catch (error) {
    process.stderr.write(`herdr-auto-update: failed to persist state: ${error.message}\n`);
  }
}

async function checkOnce({ notifyWhenCurrent = false } = {}) {
  const config = loadConfig();
  const current = currentVersion();
  if (!current) {
    process.stderr.write('herdr-auto-update: could not read the current herdr version\n');
    return;
  }
  const latest = await latestVersion();
  const decision = decideUpdate(config, current, latest);
  const state = readState();
  writeState({ ...state, lastCheckAt: new Date().toISOString(), current, latest });

  if (decision.action === 'none') {
    process.stdout.write(`herdr ${current} is up to date\n`);
    if (notifyWhenCurrent) {
      notify(NOTIFICATION_TITLE, `herdr ${current} is up to date`);
    }
    return;
  }

  if (decision.action === 'skip') {
    process.stdout.write(`skipping ${decision.kind} update ${current} -> ${latest} (disabled in config)\n`);
    // notify a skipped version once, not on every poll
    if (state.notifiedSkipVersion !== latest) {
      writeState({ ...readState(), notifiedSkipVersion: latest });
      notify(NOTIFICATION_TITLE, `herdr ${latest} available (${decision.kind} update) — auto-${decision.kind} updates are off`);
    }
    return;
  }

  process.stdout.write(`updating herdr ${current} -> ${latest} (${decision.kind})\n`);
  const result = runUpdate({ handoff: config.updateWithHandoff });
  if (result.ok) {
    notify(NOTIFICATION_TITLE, `herdr updated ${current} -> ${latest}`);
    return;
  }
  process.stderr.write(`herdr-auto-update: update failed: ${result.output.slice(0, 400)}\n`);
  notify(NOTIFICATION_TITLE, `herdr update to ${latest} failed — run 'herdr update' manually`);
}

if (require.main === module) {
  checkOnce({ notifyWhenCurrent: process.argv.includes('--notify-when-current') }).catch((error) => {
    process.stderr.write(`herdr-auto-update: check failed: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = { checkOnce };
