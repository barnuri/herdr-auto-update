'use strict';

const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)/;

function parseVersion(raw) {
  if (typeof raw !== 'string') {
    return null;
  }
  const match = raw.trim().match(VERSION_PATTERN);
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

// kind of the jump from current to latest: 'major' | 'minor' | 'patch',
// or null when latest is not strictly newer (equal, older, or unparseable)
function updateKind(currentRaw, latestRaw) {
  const current = parseVersion(currentRaw);
  const latest = parseVersion(latestRaw);
  if (!current || !latest) {
    return null;
  }
  if (latest.major !== current.major) {
    return latest.major > current.major ? 'major' : null;
  }
  if (latest.minor !== current.minor) {
    return latest.minor > current.minor ? 'minor' : null;
  }
  if (latest.patch !== current.patch) {
    return latest.patch > current.patch ? 'patch' : null;
  }
  return null;
}

module.exports = { parseVersion, updateKind };
