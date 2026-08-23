'use strict';

const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const ORIGINAL_ENV_LEVEL = process.env.HERDR_PLUGIN_LOG_LEVEL;

function freshLogger() {
  delete require.cache[require.resolve('../lib/logger')];
  return require('../lib/logger');
}

function captureStderr(run) {
  const original = process.stderr.write;
  const lines = [];
  process.stderr.write = (chunk) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    run();
  } finally {
    process.stderr.write = original;
  }
  return lines;
}

describe('logger', () => {
  afterEach(() => {
    if (ORIGINAL_ENV_LEVEL === undefined) {
      delete process.env.HERDR_PLUGIN_LOG_LEVEL;
    } else {
      process.env.HERDR_PLUGIN_LOG_LEVEL = ORIGINAL_ENV_LEVEL;
    }
    delete require.cache[require.resolve('../lib/logger')];
  });

  test('default level is info: debug is suppressed, info/warn/error are emitted', () => {
    delete process.env.HERDR_PLUGIN_LOG_LEVEL;
    const { createLogger } = freshLogger();
    const logger = createLogger('test');

    const lines = captureStderr(() => {
      logger.debug('hidden');
      logger.info('shown-info');
      logger.warn('shown-warn');
      logger.error('shown-error');
    });

    assert.equal(lines.length, 3);
    assert.match(lines[0], /\[INFO\] test: shown-info/);
    assert.match(lines[1], /\[WARN\] test: shown-warn/);
    assert.match(lines[2], /\[ERROR\] test: shown-error/);
  });

  test('setLevel lowers the threshold so debug becomes visible', () => {
    delete process.env.HERDR_PLUGIN_LOG_LEVEL;
    const { createLogger, setLevel } = freshLogger();
    setLevel('debug');
    const logger = createLogger('test');

    const lines = captureStderr(() => {
      logger.debug('now-visible');
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], /\[DEBUG\] test: now-visible/);
  });

  test('an invalid level passed to setLevel is ignored', () => {
    delete process.env.HERDR_PLUGIN_LOG_LEVEL;
    const { createLogger, setLevel } = freshLogger();
    setLevel('not-a-level');
    const logger = createLogger('test');

    const lines = captureStderr(() => {
      logger.debug('still-hidden');
    });

    assert.equal(lines.length, 0);
  });

  test('HERDR_PLUGIN_LOG_LEVEL env var wins over a later setLevel call', () => {
    process.env.HERDR_PLUGIN_LOG_LEVEL = 'error';
    const { createLogger, setLevel } = freshLogger();
    setLevel('debug');
    const logger = createLogger('test');

    const lines = captureStderr(() => {
      logger.warn('should-be-suppressed-by-env');
      logger.error('should-show');
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], /\[ERROR\] test: should-show/);
  });
});
