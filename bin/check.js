#!/usr/bin/env node
'use strict';

const { loadConfig } = require('../lib/config');
const { readState, writeState } = require('../lib/state');
const { currentVersion, latestVersion, decideUpdate, runUpdate, notify } = require('../lib/updater');
const { createLogger } = require('../lib/logger');

const NOTIFICATION_TITLE = 'Herdr Auto Update';
const NOTIFY_OUTPUT_LIMIT = 400;
const STATE_ERROR_LIMIT = 200;
const logger = createLogger('check');

async function checkOnce({ notifyWhenCurrent = false } = {}) {
  const config = loadConfig();
  logger.debug('starting update check');
  const current = currentVersion();
  if (!current) {
    logger.error('could not read the current herdr version');
    return;
  }
  const latest = await latestVersion();
  const decision = decideUpdate(config, current, latest);
  const state = readState();
  writeState({
    lastCheckAt: new Date().toISOString(),
    checkIntervalMinutes: config.checkIntervalMinutes,
    current,
    latest,
  });

  if (decision.action === 'none') {
    logger.info(`up to date: herdr ${current}`);
    process.stdout.write(`herdr ${current} is up to date\n`);
    writeState({ lastResult: 'current', lastUpdateError: null });
    if (notifyWhenCurrent) {
      notify(NOTIFICATION_TITLE, `herdr ${current} is up to date`);
    }
    return;
  }

  if (decision.action === 'skip') {
    logger.info(`skipped: ${decision.kind} update ${current} -> ${latest} (disabled in config)`);
    process.stdout.write(`skipping ${decision.kind} update ${current} -> ${latest} (disabled in config)\n`);
    writeState({ lastResult: 'skipped', lastUpdateError: null });
    // notify a skipped version once, not on every poll
    if (state.notifiedSkipVersion !== latest) {
      writeState({ notifiedSkipVersion: latest });
      notify(NOTIFICATION_TITLE, `herdr ${latest} available (${decision.kind} update) — auto-${decision.kind} updates are off`);
    }
    return;
  }

  logger.info(`updating: ${decision.kind} update ${current} -> ${latest}`);
  process.stdout.write(`updating herdr ${current} -> ${latest} (${decision.kind})\n`);
  const result = runUpdate({ handoff: config.updateWithHandoff });
  if (result.ok) {
    logger.info(`updated: herdr ${current} -> ${latest}`);
    writeState({ lastResult: 'updated', lastUpdateError: null });
    notify(NOTIFICATION_TITLE, `herdr updated ${current} -> ${latest}`);
    return;
  }
  logger.error(`update failed: ${current} -> ${latest}: ${result.output.slice(0, NOTIFY_OUTPUT_LIMIT)}`);
  writeState({ lastResult: 'failed', lastUpdateError: result.output.slice(0, STATE_ERROR_LIMIT) || 'herdr update failed' });
  process.stderr.write(`herdr-auto-update: update failed: ${result.output.slice(0, NOTIFY_OUTPUT_LIMIT)}\n`);
  notify(NOTIFICATION_TITLE, `herdr update to ${latest} failed — run 'herdr update' manually`);
}

if (require.main === module) {
  checkOnce({ notifyWhenCurrent: process.argv.includes('--notify-when-current') }).catch((error) => {
    process.stderr.write(`herdr-auto-update: check failed: ${error.message}\n`);
    process.exit(1);
  });
}

module.exports = { checkOnce };
