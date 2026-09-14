/**
 * In-memory ring-buffer activity stream and logger for WLEDashboard system operations.
 */
const MAX_LOGS = 300
const logs = []

/**
 * Log a system event
 * @param {'info' | 'warn' | 'error'} level
 * @param {'system' | 'poller' | 'firmware' | 'device' | 'automation' | 'mqtt' | 'api'} category
 * @param {string} message
 * @param {object} [meta]
 */
export function logEvent(level, category, message, meta = null) {
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    meta: meta ? (typeof meta === 'object' ? meta : { value: meta }) : null,
  }
  logs.unshift(entry)
  if (logs.length > MAX_LOGS) {
    logs.pop()
  }
  return entry
}

export function getSystemLogs(limit = 100, level = null) {
  let result = logs
  if (level) {
    result = result.filter(l => l.level === level)
  }
  return result.slice(0, limit)
}

export function clearSystemLogs() {
  logs.length = 0
}

// Seed initial startup log
logEvent('info', 'system', 'Activity stream logger initialized and ready')
