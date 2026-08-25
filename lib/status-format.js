'use strict';

const { updateKind } = require('./semver');

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_INTERVAL_MINUTES = 360;
// a tick that is merely a little late is normal; only a clearly overdue one means the watcher died
const STALE_GRACE_MINUTES = 20;
const UNKNOWN_VERSION = 'herdr';
const VERSION_PREFIX = 'v';

// herdr's tab bar renders command output verbatim — it has no ANSI parser, so
// escapes sent there show up as literal "[32m" text. Colour is therefore opt-in,
// for surfaces that can actually render it.
function colorize(text, color, useColor) {
  if (!useColor) {
    return text;
  }
  return `${color}${text}${ANSI.reset}`;
}

function formatClock(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// null when the state carries no usable last-check timestamp
function resolveSchedule(state, now) {
  const lastCheck = new Date(state.lastCheckAt);
  if (Number.isNaN(lastCheck.getTime())) {
    return null;
  }
  const configured = Number(state.checkIntervalMinutes);
  const intervalMinutes = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INTERVAL_MINUTES;
  const nextCheck = new Date(lastCheck.getTime() + intervalMinutes * MS_PER_MINUTE);
  const isStale = now.getTime() > nextCheck.getTime() + STALE_GRACE_MINUTES * MS_PER_MINUTE;
  return { lastCheck, nextCheck, isStale };
}

function hasPendingUpdate(state) {
  if (state.lastResult === 'skipped') {
    return true;
  }
  return Boolean(updateKind(state.current, state.latest));
}

// one compact status line; `now` is injectable so this stays pure. Each state
// carries its own glyph so it stays distinguishable when colour is off.
function formatStatusLine(state, now = new Date(), { color = false } = {}) {
  const version = state.current ? `${VERSION_PREFIX}${state.current}` : UNKNOWN_VERSION;

  if (state.lastResult === 'failed') {
    return colorize(`${version} ✗ update failed`, ANSI.red, color);
  }

  const schedule = resolveSchedule(state, now);
  if (!schedule) {
    return colorize(`${version} …`, ANSI.dim, color);
  }
  if (schedule.isStale) {
    return colorize(`${version} ⚠ stale`, ANSI.red, color);
  }

  const window = `${formatClock(schedule.lastCheck)}→${formatClock(schedule.nextCheck)}`;
  if (hasPendingUpdate(state)) {
    return colorize(`${version} ↑${VERSION_PREFIX}${state.latest} ${window}`, ANSI.yellow, color);
  }
  return colorize(`${version} ✓ ${window}`, ANSI.green, color);
}

module.exports = { ANSI, STALE_GRACE_MINUTES, DEFAULT_INTERVAL_MINUTES, formatStatusLine };
