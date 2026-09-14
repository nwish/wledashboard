import os from 'os'
import { existsSync, statSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getDb, DB_PATH } from '../db/database.js'
import { getPollerStats, clearStateCache, restartAllPolling, listDevices } from './deviceService.js'
import { logEvent } from './loggerService.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let APP_VERSION = '0.19.0'
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'))
  APP_VERSION = pkg.version || APP_VERSION
} catch (_) {}

/**
 * Format bytes into human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Gather system health and telemetry metrics
 */
export function getSystemHealth() {
  const db = getDb()
  const mem = process.memoryUsage()

  // Database metrics
  let dbSizeBytes = 0
  try {
    if (existsSync(DB_PATH)) {
      dbSizeBytes = statSync(DB_PATH).size
    }
  } catch (_) {}

  // Table counts
  const countTable = (table) => {
    try {
      return db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count ?? 0
    } catch {
      return 0
    }
  }

  const tableCounts = {
    devices: countTable('devices'),
    groups: countTable('groups'),
    presets: countTable('presets'),
    schedules: countTable('schedules'),
    routines: countTable('routines'),
    dwellings: countTable('dwellings'),
    floors: countTable('floors'),
    rooms: countTable('rooms'),
    anchors: countTable('anchors'),
    matrices: countTable('matrices'),
    settings: countTable('settings'),
  }

  let journalMode = 'unknown'
  try {
    journalMode = db.pragma('journal_mode', { simple: true })
  } catch (_) {}

  // Poller metrics
  const pollerStats = getPollerStats()

  // Network interfaces (IPv4 non-internal prioritized)
  const rawIfaces = os.networkInterfaces()
  const interfaces = []
  for (const [name, addrs] of Object.entries(rawIfaces)) {
    for (const addr of addrs || []) {
      if (addr.family === 'IPv4') {
        interfaces.push({
          name,
          address: addr.address,
          netmask: addr.netmask,
          internal: addr.internal,
          mac: addr.mac,
        })
      }
    }
  }

  return {
    version: APP_VERSION,
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    os_type: os.type(),
    os_release: os.release(),
    uptime_seconds: Math.floor(process.uptime()),
    system_uptime_seconds: Math.floor(os.uptime()),
    memory: {
      rss_bytes: mem.rss,
      rss_formatted: formatBytes(mem.rss),
      heap_used_bytes: mem.heapUsed,
      heap_used_formatted: formatBytes(mem.heapUsed),
      heap_total_bytes: mem.heapTotal,
      heap_total_formatted: formatBytes(mem.heapTotal),
      external_bytes: mem.external,
      external_formatted: formatBytes(mem.external),
    },
    database: {
      path: DB_PATH,
      size_bytes: dbSizeBytes,
      size_formatted: formatBytes(dbSizeBytes),
      journal_mode: journalMode,
      tables: tableCounts,
    },
    poller: pollerStats,
    network_interfaces: interfaces,
  }
}

/**
 * Run internal diagnostics checks
 */
export async function runSystemDiagnostics() {
  const db = getDb()
  const results = {
    timestamp: new Date().toISOString(),
    overall_ok: true,
    checks: {},
  }

  // 1. Database Read/Write Check
  const startDb = Date.now()
  try {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('_diag_test', ?)").run(String(startDb))
    const row = db.prepare("SELECT value FROM settings WHERE key = '_diag_test'").get()
    db.prepare("DELETE FROM settings WHERE key = '_diag_test'").run()
    const elapsed = Date.now() - startDb
    results.checks.database_rw = {
      ok: row?.value === String(startDb),
      latency_ms: elapsed,
      message: `Database read/write verified in ${elapsed}ms`,
    }
  } catch (err) {
    results.overall_ok = false
    results.checks.database_rw = {
      ok: false,
      error: err.message,
    }
  }

  // 2. Database Integrity Check
  try {
    const integrity = db.pragma('quick_check')
    const ok = Array.isArray(integrity) && integrity.length > 0 && integrity[0].quick_check === 'ok'
    results.checks.database_integrity = {
      ok,
      message: ok ? 'SQLite quick_check passed with 0 corruptions' : 'SQLite reported integrity warning',
      details: integrity,
    }
    if (!ok) results.overall_ok = false
  } catch (err) {
    results.overall_ok = false
    results.checks.database_integrity = {
      ok: false,
      error: err.message,
    }
  }

  // 3. Poller Service Status
  const pollerStats = getPollerStats()
  results.checks.poller_health = {
    ok: typeof pollerStats.monitored_count === 'number',
    message: `${pollerStats.online_count}/${pollerStats.monitored_count} devices online, ${pollerStats.active_timers} active poller timer(s)`,
    stats: pollerStats,
  }

  // 4. Device Connectivity Probes (parallelized)
  const devices = listDevices()
  const probePromises = devices.map(async (dev) => {
    const devStart = Date.now()
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1000)
      const res = await fetch(`http://${dev.ip_address}/json/info`, { signal: controller.signal })
      clearTimeout(timeoutId)
      return {
        id: dev.id,
        name: dev.name,
        ip: dev.ip_address,
        ok: res.ok,
        status: res.status,
        latency_ms: Date.now() - devStart,
      }
    } catch (err) {
      return {
        id: dev.id,
        name: dev.name,
        ip: dev.ip_address,
        ok: false,
        error: err.name === 'AbortError' ? 'Timeout (1s)' : err.message,
      }
    }
  })
  results.checks.devices_connectivity = await Promise.all(probePromises)

  logEvent(results.overall_ok ? 'info' : 'warn', 'system', `Ran system diagnostics: ${results.overall_ok ? 'All checks passed' : 'Issues detected'}`)
  return results
}

/**
 * Destructive action: Clear Device Cache
 */
export function executeClearCache() {
  clearStateCache()
  return { ok: true, message: 'Device state cache cleared' }
}

/**
 * Destructive action: Restart Poller Timers
 */
export function executeRestartPoller() {
  restartAllPolling()
  return { ok: true, message: 'All polling timers restarted' }
}

/**
 * Destructive action: Reset Spatial Layout
 */
export function executeResetSpatial() {
  const db = getDb()
  db.transaction(() => {
    db.prepare('DELETE FROM anchors').run()
    db.prepare('DELETE FROM rooms').run()
    db.prepare('DELETE FROM floors').run()
    db.prepare('DELETE FROM dwellings').run()
  })()
  logEvent('warn', 'system', 'Spatial 3D layout data reset to empty')
  return { ok: true, message: 'Spatial layout deleted' }
}

/**
 * Destructive action: Factory Reset Database
 */
export function executeFactoryReset(confirmation) {
  if (confirmation !== 'RESET' && confirmation !== 'CONFIRM_FACTORY_RESET') {
    throw new Error('Confirmation string mismatch. Expected "RESET".')
  }

  const db = getDb()
  db.transaction(() => {
    // Foreign key order delete
    db.prepare('DELETE FROM group_members').run()
    db.prepare('DELETE FROM group_children').run()
    db.prepare('DELETE FROM presets').run()
    db.prepare('DELETE FROM routine_steps').run()
    db.prepare('DELETE FROM routines').run()
    db.prepare('DELETE FROM schedules').run()
    db.prepare('DELETE FROM anchors').run()
    db.prepare('DELETE FROM rooms').run()
    db.prepare('DELETE FROM floors').run()
    db.prepare('DELETE FROM dwellings').run()
    db.prepare('DELETE FROM matrix_drawings').run()
    db.prepare('DELETE FROM matrices').run()
    db.prepare('DELETE FROM animations').run()
    db.prepare('DELETE FROM palettes').run()
    db.prepare('DELETE FROM groups').run()
    db.prepare('DELETE FROM devices').run()

    // Restore baseline settings
    db.prepare('DELETE FROM settings').run()
    const baseline = [
      ['poll_interval_ms', '5000'],
      ['mdns_scan_interval_ms', '30000'],
      ['websocket_preferred', '0'],
      ['latitude', ''],
      ['longitude', ''],
      ['animation_intensity', 'full'],
      ['card_density', 'comfortable'],
      ['theme', 'dark'],
      ['mqtt_enabled', '0'],
      ['mqtt_broker_url', 'mqtt://localhost:1883'],
      ['advanced_mode', 'true'],
    ]
    const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    for (const [k, v] of baseline) {
      insertSetting.run(k, v)
    }
  })()

  try {
    db.pragma('vacuum')
  } catch (_) {}

  restartAllPolling()
  logEvent('error', 'system', 'CRITICAL: Full factory reset executed. All user data wiped.')
  return { ok: true, message: 'Factory reset completed successfully' }
}
