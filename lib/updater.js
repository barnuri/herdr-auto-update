'use strict';

const { spawnSync } = require('node:child_process');
const https = require('node:https');

const RELEASES_URL = 'https://api.github.com/repos/herdrdev/herdr/releases/latest';
const LLMS_TXT_URL = 'https://herdr.dev/llms.txt';
const HTTP_TIMEOUT_MS = 15000;
const UPDATE_TIMEOUT_MS = 10 * 60 * 1000;
const SESSION_ENV_VARS = ['HERDR_ENV', 'HERDR_SESSION', 'HERDR_PANE_ID', 'HERDR_TAB_ID', 'HERDR_WORKSPACE_ID'];

const { updateKind } = require('./semver');
const { createLogger } = require('./logger');

const logger = createLogger('updater');

function herdrBinaryPath() {
  return process.env.HERDR_BIN_PATH || 'herdr';
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { 'User-Agent': 'herdr-auto-update', Accept: 'application/json' }, timeout: HTTP_TIMEOUT_MS },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`${url} answered ${response.statusCode}`));
          return;
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve(body));
      }
    );
    request.on('timeout', () => request.destroy(new Error(`${url} timed out`)));
    request.on('error', reject);
  });
}

function currentVersion() {
  const result = spawnSync(herdrBinaryPath(), ['--version'], { encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    logger.warn(`failed to read current herdr version: ${result.error ? result.error.message : `exit code ${result.status}`}`);
    return null;
  }
  const match = String(result.stdout).match(/(\d+\.\d+\.\d+)/);
  if (!match) {
    logger.warn(`could not parse a version out of 'herdr --version' output: ${result.stdout}`);
    return null;
  }
  logger.debug(`current herdr version: ${match[1]}`);
  return match[1];
}

async function latestVersion() {
  logger.debug('checking latest herdr version');
  try {
    const release = JSON.parse(await fetchText(RELEASES_URL));
    const match = String(release.tag_name || '').match(/(\d+\.\d+\.\d+)/);
    if (match) {
      logger.debug(`latest herdr version (GitHub releases): ${match[1]}`);
      return match[1];
    }
  } catch (error) {
    logger.debug(`GitHub releases lookup failed, falling back to llms.txt: ${error.message}`);
  }
  // fallback: the docs index states "Current stable release: X.Y.Z."
  const llms = await fetchText(LLMS_TXT_URL);
  const match = llms.match(/Current stable release:\s*(\d+\.\d+\.\d+)/);
  if (!match) {
    logger.error('could not determine the latest herdr version from either source');
    throw new Error('could not determine the latest herdr version');
  }
  logger.debug(`latest herdr version (llms.txt): ${match[1]}`);
  return match[1];
}

// pure decision: what to do about the current->latest jump under this config
function decideUpdate(config, current, latest) {
  const kind = updateKind(current, latest);
  if (!kind) {
    logger.debug(`no update needed: current=${current} latest=${latest}`);
    return { action: 'none', kind: null };
  }
  const allowedByKind = {
    major: config.autoUpdateMajors,
    minor: config.autoUpdateMinors,
    patch: config.autoUpdatePatches,
  };
  const action = allowedByKind[kind] ? 'update' : 'skip';
  logger.info(`update decision: ${current} -> ${latest} (${kind}) => ${action}`);
  return { action, kind };
}

// herdr refuses to self-update when it sees HERDR_ENV, and this plugin always
// runs inside a herdr-spawned process that has it set. Drop the session marker
// vars so the update sees a plain shell; HERDR_SOCKET_PATH stays so --handoff
// can still reach the running server.
function updateEnv(env = process.env) {
  const stripped = { ...env };
  for (const key of SESSION_ENV_VARS) {
    delete stripped[key];
  }
  return stripped;
}

function runUpdate({ handoff }) {
  const args = handoff ? ['update', '--handoff'] : ['update'];
  logger.info(`running: herdr ${args.join(' ')}`);
  const result = spawnSync(herdrBinaryPath(), args, {
    encoding: 'utf8',
    timeout: UPDATE_TIMEOUT_MS,
    env: updateEnv(),
  });
  const ok = !result.error && result.status === 0;
  if (ok) {
    logger.info('herdr update command succeeded');
  } else {
    logger.error(`herdr update command failed: ${result.error ? result.error.message : `exit code ${result.status}`}`);
  }
  return {
    ok,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

function notify(title, body) {
  logger.debug(`sending notification: ${title} — ${body}`);
  try {
    spawnSync(herdrBinaryPath(), ['notification', 'show', title, '--body', body], { encoding: 'utf8' });
  } catch (error) {
    logger.warn(`failed to send notification: ${error.message}`);
  }
}

module.exports = { currentVersion, latestVersion, decideUpdate, runUpdate, updateEnv, notify };
