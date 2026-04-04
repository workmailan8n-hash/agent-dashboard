const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function log(level, ...args) {
  if (LEVELS[level] >= LEVELS[LOG_LEVEL]) {
    const ts = new Date().toISOString();
    console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${ts}`, ...args);
  }
}

module.exports = {
  debug: (...args) => log('debug', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};
