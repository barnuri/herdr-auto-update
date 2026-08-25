'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Reads a JSON object from disk. Returns { value, error }: value is the parsed
// object, or null when the file is missing, unreadable, malformed, or holds
// something other than a plain object (JSON.parse happily returns null, numbers
// and arrays). Callers decide how loudly to report the error, which is why this
// hands the error back rather than logging it.
function readJsonObject(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return { value: null, error };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { value: null, error: new Error('file does not contain a JSON object') };
    }
    return { value: parsed, error: null };
  } catch (error) {
    return { value: null, error };
  }
}

// Creates the parent directory as needed. Returns the error on failure, null on success.
function writeJsonObject(filePath, value) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
    return null;
  } catch (error) {
    return error;
  }
}

module.exports = { readJsonObject, writeJsonObject };
