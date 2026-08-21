'use strict';

const { spawnSync } = require('node:child_process');
const https = require('node:https');

const RELEASES_URL = 'https://api.github.com/repos/herdrdev/herdr/releases/latest';
const LLMS_TXT_URL = 'https://herdr.dev/llms.txt';
const HTTP_TIMEOUT_MS = 15000;
const UPDATE_TIMEOUT_MS = 10 * 60 * 1000;

const { updateKind } = require('./semver');

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
    return null;
  }
  const match = String(result.stdout).match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

async function latestVersion() {
  try {
    const release = JSON.parse(await fetchText(RELEASES_URL));
    const match = String(release.tag_name || '').match(/(\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  } catch {}
  // fallback: the docs index states "Current stable release: X.Y.Z."
  const llms = await fetchText(LLMS_TXT_URL);
  const match = llms.match(/Current stable release:\s*(\d+\.\d+\.\d+)/);
  if (!match) {
    throw new Error('could not determine the latest herdr version');
  }
  return match[1];
}

// pure decision: what to do about the current->latest jump under this config
function decideUpdate(config, current, latest) {
  const kind = updateKind(current, latest);
  if (!kind) {
    return { action: 'none', kind: null };
  }
  const allowedByKind = {
    major: config.autoUpdateMajors,
    minor: config.autoUpdateMinors,
    patch: config.autoUpdatePatches,
  };
  return { action: allowedByKind[kind] ? 'update' : 'skip', kind };
}

function runUpdate({ handoff }) {
  const args = handoff ? ['update', '--handoff'] : ['update'];
  const result = spawnSync(herdrBinaryPath(), args, { encoding: 'utf8', timeout: UPDATE_TIMEOUT_MS });
  return {
    ok: !result.error && result.status === 0,
    output: `${result.stdout || ''}${result.stderr || ''}`.trim(),
  };
}

function notify(title, body) {
  try {
    spawnSync(herdrBinaryPath(), ['notification', 'show', title, '--body', body], { encoding: 'utf8' });
  } catch {}
}

module.exports = { currentVersion, latestVersion, decideUpdate, runUpdate, notify };
