'use strict';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const DEFAULT_LEVEL = 'info';

function normalizeLevel(candidate) {
  const level = String(candidate || '').toLowerCase();
  return LEVELS[level] ? level : null;
}

const envLevel = normalizeLevel(process.env.HERDR_PLUGIN_LOG_LEVEL);
let currentLevel = envLevel || DEFAULT_LEVEL;

// env var is a manual override for debugging a single run — config must not silently undo it
function setLevel(candidate) {
  if (envLevel) {
    return;
  }
  const normalized = normalizeLevel(candidate);
  if (normalized) {
    currentLevel = normalized;
  }
}

function write(namespace, level, message) {
  if (LEVELS[level] < LEVELS[currentLevel]) {
    return;
  }
  process.stderr.write(`${new Date().toISOString()} [${level.toUpperCase()}] ${namespace}: ${message}\n`);
}

function createLogger(namespace) {
  return {
    debug: (message) => write(namespace, 'debug', message),
    info: (message) => write(namespace, 'info', message),
    warn: (message) => write(namespace, 'warn', message),
    error: (message) => write(namespace, 'error', message),
  };
}

module.exports = { createLogger, setLevel, LEVELS };
