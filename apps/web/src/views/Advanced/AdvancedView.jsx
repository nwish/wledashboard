import { useState, useEffect, useCallback, useRef } from 'react'
import { systemApi, settingsApi } from '../../lib/api.js'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './AdvancedView.module.css'

export function AdvancedView() {
  const addToast = useUIStore(s => s.addToast)

  // ── States ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('console') // 'console' | 'diagnostics' | 'danger'
  const [health, setHealth] = useState(null)
  const [logs, setLogs] = useState([])
  const [logFilter, setLogFilter] = useState('all') // 'all' | 'info' | 'warn' | 'error'
  const [diagnostics, setDiagnostics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [runningDiag, setRunningDiag] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [customSubnets, setCustomSubnets] = useState('')
  const [savingSubnets, setSavingSubnets] = useState(false)

  // Modals for destructive actions
  const [showSpatialModal, setShowSpatialModal] = useState(false)
  const [showFactoryModal, setShowFactoryModal] = useState(false)
  const [factoryConfirmInput, setFactoryConfirmInput] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  const refreshTimer = useRef(null)

  // ── Fetch Discovery Scope Settings ──────────────────────────────────────────
  useEffect(() => {
    settingsApi.get().then(s => {
      if (s?.custom_discovery_subnets) {
        setCustomSubnets(s.custom_discovery_subnets)
      }
    }).catch(() => {})
  }, [])

  const handleSaveSubnets = async (e) => {
    e.preventDefault()
    setSavingSubnets(true)
    try {
      await settingsApi.update({ custom_discovery_subnets: customSubnets.trim() })
      addToast({ message: 'Discovery scope updated successfully', type: 'success' })
    } catch (err) {
      addToast({ message: `Failed to save discovery scope: ${err.message}`, type: 'error' })
    } finally {
      setSavingSubnets(false)
    }
  }

  // ── Fetch Telemetry & Logs ──────────────────────────────────────────────────
  const fetchTelemetryAndLogs = useCallback(async (quiet = false) => {
    try {
      const [hData, lData] = await Promise.all([
        systemApi.getHealth(),
        systemApi.getLogs({ limit: 150, level: logFilter === 'all' ? null : logFilter }),
      ])
      setHealth(hData)
      setLogs(lData.logs || [])
      setLoading(false)
    } catch (err) {
      if (!quiet) {
        addToast({ message: `Failed to load system metrics: ${err.message}`, type: 'error' })
      }
      setLoading(false)
    }
  }, [addToast, logFilter])

  useEffect(() => {
    fetchTelemetryAndLogs()
  }, [fetchTelemetryAndLogs])

  // Polling loop when autoRefresh is true
  useEffect(() => {
    if (!autoRefresh) return
    refreshTimer.current = setInterval(() => {
      fetchTelemetryAndLogs(true)
    }, 3000)
    return () => clearInterval(refreshTimer.current)
  }, [autoRefresh, fetchTelemetryAndLogs])

  // ── Diagnostics ─────────────────────────────────────────────────────────────
  const handleRunDiagnostics = async () => {
    setRunningDiag(true)
    try {
      const result = await systemApi.runDiagnostics()
      setDiagnostics(result)
      setActiveTab('diagnostics')
      addToast({ message: 'Diagnostics completed', type: 'info' })
    } catch (err) {
      addToast({ message: `Diagnostics failed: ${err.message}`, type: 'error' })
    } finally {
      setRunningDiag(false)
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleClearLogs = async () => {
    try {
      await systemApi.clearLogs()
      setLogs([])
      addToast({ message: 'Console log buffer cleared', type: 'info' })
    } catch (err) {
      addToast({ message: `Failed to clear logs: ${err.message}`, type: 'error' })
    }
  }

  const handleCopyLogs = () => {
    const text = logs
      .slice()
      .reverse()
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    addToast({ message: 'Console logs copied to clipboard', type: 'info' })
  }

  const handleCopyDiagnostics = () => {
    if (!health && !diagnostics) return
    const diagReport = {
      timestamp: new Date().toISOString(),
      health,
      diagnostics,
    }
    navigator.clipboard.writeText('```json\n' + JSON.stringify(diagReport, null, 2) + '\n```')
    addToast({ message: 'System diagnostic report copied to clipboard', type: 'info' })
  }

  const handleClearCache = async () => {
    setActionInProgress(true)
    try {
      await systemApi.clearCache()
      addToast({ message: 'Device state cache purged', type: 'info' })
      fetchTelemetryAndLogs(true)
    } catch (err) {
      addToast({ message: `Cache purge failed: ${err.message}`, type: 'error' })
    } finally {
      setActionInProgress(false)
    }
  }

  const handleRestartPoller = async () => {
    setActionInProgress(true)
    try {
      await systemApi.restartPoller()
      addToast({ message: 'All polling timers re-initialized', type: 'info' })
      fetchTelemetryAndLogs(true)
    } catch (err) {
      addToast({ message: `Poller restart failed: ${err.message}`, type: 'error' })
    } finally {
      setActionInProgress(false)
    }
  }

  const handleResetSpatial = async () => {
    setActionInProgress(true)
    try {
      await systemApi.resetSpatial()
      setShowSpatialModal(false)
      addToast({ message: 'Spatial 3D layout reset', type: 'info' })
      fetchTelemetryAndLogs(true)
    } catch (err) {
      addToast({ message: `Reset failed: ${err.message}`, type: 'error' })
    } finally {
      setActionInProgress(false)
    }
  }

  const handleFactoryReset = async () => {
    if (factoryConfirmInput !== 'RESET') {
      addToast({ message: 'Type RESET to confirm database factory reset', type: 'error' })
      return
    }
    setActionInProgress(true)
    try {
      await systemApi.factoryReset('RESET')
      setShowFactoryModal(false)
      setFactoryConfirmInput('')
      addToast({ message: 'Database reset to initial installation state', type: 'info' })
      fetchTelemetryAndLogs(true)
    } catch (err) {
      addToast({ message: `Factory reset failed: ${err.message}`, type: 'error' })
    } finally {
      setActionInProgress(false)
    }
  }

  // Format uptime
  const formatUptime = (sec) => {
    if (!sec) return '0s'
    const d = Math.floor(sec / 86400)
    const h = Math.floor((sec % 86400) / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }

  const filteredLogs = logs.filter(l => logFilter === 'all' || l.level === logFilter)

  // Memory usage percentage
  const heapPct = health?.memory?.heap_total_bytes
    ? Math.round((health.memory.heap_used_bytes / health.memory.heap_total_bytes) * 100)
    : 0

  return (
    <main className={styles.container} id="main-content">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Advanced System Dashboard</h1>
            <span className={styles.badge}>Developer</span>
          </div>
          <p className={styles.subtitle}>
            Process telemetry, live activity streaming, low-level diagnostics, and administrative control tools.
          </p>
        </div>

        <div className={styles.headerActions}>
          <label className={styles.autoRefreshToggle}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
            />
            <span>Live Stream</span>
          </label>

          <button
            type="button"
            className={styles.btnAction}
            onClick={() => fetchTelemetryAndLogs(false)}
            title="Fetch latest system telemetry"
          >
            Refresh
          </button>

          <button
            type="button"
            className={`${styles.btnAction} ${styles.btnPrimary}`}
            onClick={handleRunDiagnostics}
            disabled={runningDiag}
            title="Execute deep system diagnostic checks"
          >
            {runningDiag ? 'Running Checks...' : 'Run Diagnostics'}
          </button>
        </div>
      </header>

      {/* KPI Telemetry Grid */}
      <section className={styles.kpiGrid} aria-label="System Health Telemetry">
        {/* Card 1: Process Status */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>System Status</span>
          <div className={styles.kpiValue} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={styles.statusIndicator} />
            <span>Operational</span>
          </div>
          <span className={styles.kpiSubtext}>
            Uptime: {formatUptime(health?.uptime_seconds)} (Host: {formatUptime(health?.system_uptime_seconds)})
          </span>
        </div>

        {/* Card 2: Memory & Runtime */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Memory Heap ({heapPct}%)</span>
          <div className={styles.kpiValue}>
            {health?.memory?.heap_used_formatted || '0 MB'}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.min(heapPct, 100)}%` }} />
          </div>
          <span className={styles.kpiSubtext}>
            RSS: {health?.memory?.rss_formatted || '0 MB'} | Node {health?.node_version || 'v22'}
          </span>
        </div>

        {/* Card 3: SQLite Storage */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Database Storage</span>
          <div className={styles.kpiValue}>
            {health?.database?.size_formatted || '0 B'}
          </div>
          <span className={styles.kpiSubtext}>
            WAL Mode | {health?.database?.tables?.devices ?? 0} devices, {health?.database?.tables?.groups ?? 0} groups, {health?.database?.tables?.presets ?? 0} presets
          </span>
        </div>

        {/* Card 4: Poller Engine */}
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Poller Engine</span>
          <div className={styles.kpiValue}>
            {health?.poller?.online_count ?? 0} / {health?.poller?.monitored_count ?? 0} Online
          </div>
          <span className={styles.kpiSubtext}>
            {health?.poller?.active_timers ?? 0} active timers | {health?.poller?.interval_ms ? (health.poller.interval_ms / 1000) : 5}s cycle
          </span>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className={styles.tabsBar} aria-label="Advanced views">
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'console' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('console')}
        >
          Activity Stream & Console
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'diagnostics' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          Diagnostics & Hardware
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'danger' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('danger')}
        >
          Danger Zone
        </button>
      </nav>

      {/* TAB 1: Console / Activity Stream */}
      {activeTab === 'console' && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>Live Activity Stream</h2>
              <p className={styles.panelDesc}>
                Real-time chronological events from background pollers, firmware OTA updates, and system operations.
              </p>
            </div>
            <div className={styles.panelControls}>
              <button
                type="button"
                className={`${styles.filterPill} ${logFilter === 'all' ? styles.filterPillActive : ''}`}
                onClick={() => setLogFilter('all')}
              >
                All ({logs.length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${logFilter === 'info' ? styles.filterPillActive : ''}`}
                onClick={() => setLogFilter('info')}
              >
                Info
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${logFilter === 'warn' ? styles.filterPillActive : ''}`}
                onClick={() => setLogFilter('warn')}
              >
                Warnings
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${logFilter === 'error' ? styles.filterPillActive : ''}`}
                onClick={() => setLogFilter('error')}
              >
                Errors
              </button>

              <button
                type="button"
                className={styles.btnAction}
                onClick={handleCopyLogs}
                disabled={logs.length === 0}
              >
                Copy
              </button>
              <button
                type="button"
                className={styles.btnAction}
                onClick={handleClearLogs}
                disabled={logs.length === 0}
              >
                Clear
              </button>
            </div>
          </div>

          <div className={styles.terminalWindow}>
            {filteredLogs.length === 0 ? (
              <div className={styles.terminalEmpty}>
                No log entries recorded matching current filter.
              </div>
            ) : (
              filteredLogs.map(l => (
                <div key={l.id} className={styles.logEntry}>
                  <span className={styles.logTime}>
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`
                      ${styles.logBadge}
                      ${l.level === 'error' ? styles.logBadgeError : ''}
                      ${l.level === 'warn' ? styles.logBadgeWarn : ''}
                      ${l.level === 'info' ? styles.logBadgeInfo : ''}
                    `}
                  >
                    {l.level}
                  </span>
                  <span className={styles.logCategory}>[{l.category}]</span>
                  <span className={styles.logMessage}>{l.message}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 2: Diagnostics & Hardware */}
      {activeTab === 'diagnostics' && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>System Diagnostics & Environment</h2>
              <p className={styles.panelDesc}>
                Health checks across database integrity, network adapters, and controller connectivity.
              </p>
            </div>
            <div className={styles.panelControls}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={handleCopyDiagnostics}
              >
                Copy Diagnostic Report
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnPrimary}`}
                onClick={handleRunDiagnostics}
                disabled={runningDiag}
              >
                {runningDiag ? 'Probing...' : 'Re-Run Checks'}
              </button>
            </div>
          </div>

          {diagnostics ? (
            <div className={styles.checksGrid}>
              {/* Check 1: Database RW */}
              <div className={styles.checkCard}>
                <div className={styles.checkCardHeader}>
                  <h3 className={styles.checkCardTitle}>Database Read/Write</h3>
                  <span
                    className={`
                      ${styles.checkStatusPill}
                      ${diagnostics.checks?.database_rw?.ok ? styles.checkStatusSuccess : styles.checkStatusFail}
                    `}
                  >
                    {diagnostics.checks?.database_rw?.ok ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <p className={styles.checkCardDetail}>
                  {diagnostics.checks?.database_rw?.message || diagnostics.checks?.database_rw?.error}
                </p>
              </div>

              {/* Check 2: Database Integrity */}
              <div className={styles.checkCard}>
                <div className={styles.checkCardHeader}>
                  <h3 className={styles.checkCardTitle}>SQLite Integrity Check</h3>
                  <span
                    className={`
                      ${styles.checkStatusPill}
                      ${diagnostics.checks?.database_integrity?.ok ? styles.checkStatusSuccess : styles.checkStatusFail}
                    `}
                  >
                    {diagnostics.checks?.database_integrity?.ok ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <p className={styles.checkCardDetail}>
                  {diagnostics.checks?.database_integrity?.message || diagnostics.checks?.database_integrity?.error}
                </p>
              </div>

              {/* Check 3: Poller Health */}
              <div className={styles.checkCard}>
                <div className={styles.checkCardHeader}>
                  <h3 className={styles.checkCardTitle}>Poller Service</h3>
                  <span
                    className={`
                      ${styles.checkStatusPill}
                      ${diagnostics.checks?.poller_health?.ok ? styles.checkStatusSuccess : styles.checkStatusFail}
                    `}
                  >
                    {diagnostics.checks?.poller_health?.ok ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <p className={styles.checkCardDetail}>
                  {diagnostics.checks?.poller_health?.message}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
              <p>Click "Re-Run Checks" to initiate a deep system diagnostic pass.</p>
            </div>
          )}

          {/* Network Interfaces Table */}
          {health?.network_interfaces && health.network_interfaces.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 className={styles.panelTitle} style={{ fontSize: '1rem', marginBottom: '8px' }}>
                Active Network Interfaces (IPv4)
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Interface Name</th>
                      <th>IPv4 Address</th>
                      <th>Subnet Mask</th>
                      <th>MAC Address</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.network_interfaces.map((iface, idx) => (
                      <tr key={`${iface.name}-${idx}`}>
                        <td style={{ fontWeight: 600 }}>{iface.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{iface.address}</td>
                        <td style={{ fontFamily: 'monospace' }}>{iface.netmask}</td>
                        <td style={{ fontFamily: 'monospace' }}>{iface.mac}</td>
                        <td>{iface.internal ? 'Internal (Loopback)' : 'External (LAN)'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Network Discovery Scope & Subnet Overrides */}
          <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className={styles.panelTitle} style={{ fontSize: '1rem', margin: 0 }}>
                Network Discovery Scope (Subnet Overrides)
              </h3>
              <span className={styles.badge} style={{
                backgroundColor: customSubnets.trim() ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: customSubnets.trim() ? 'var(--accent-primary, #818cf8)' : '#34d399',
                borderColor: customSubnets.trim() ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'
              }}>
                {customSubnets.trim() ? 'Custom Scope Active' : 'RFC 1918 Standard (Default)'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px 0', lineHeight: 1.5 }}>
              Automated discovery is strictly bounded to standard RFC 1918 private subnets by default. For enterprise environments, custom lighting VLANs, or non-standard subnets, enter comma-separated IPv4 subnets or CIDRs (e.g. <code>192.168.100.0/24, 10.50.0.0/24</code>) to expand the discovery boundary.
            </p>
            <form onSubmit={handleSaveSubnets} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={customSubnets}
                onChange={e => setCustomSubnets(e.target.value)}
                placeholder="e.g. 192.168.100.0/24, 10.50.0.0/24"
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface-base, #11131a)',
                  border: '1px solid var(--border-subtle, #2d3348)',
                  borderRadius: '6px',
                  color: 'var(--text-primary, #fff)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}
              />
              <button
                type="submit"
                className={`${styles.btnAction} ${styles.btnPrimary}`}
                disabled={savingSubnets}
              >
                {savingSubnets ? 'Saving...' : 'Save Scope'}
              </button>
            </form>
          </div>

          {/* Device Probing Table */}
          {diagnostics?.checks?.devices_connectivity && diagnostics.checks.devices_connectivity.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 className={styles.panelTitle} style={{ fontSize: '1rem', marginBottom: '8px' }}>
                WLED Controller Reachability
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Controller Name</th>
                      <th>IP Address</th>
                      <th>Reachability</th>
                      <th>Round-Trip Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.checks.devices_connectivity.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{d.ip}</td>
                        <td>
                          <span
                            className={`
                              ${styles.checkStatusPill}
                              ${d.ok ? styles.checkStatusSuccess : styles.checkStatusFail}
                            `}
                          >
                            {d.ok ? `HTTP ${d.status}` : (d.error || 'Offline')}
                          </span>
                        </td>
                        <td>{d.ok ? `${d.latency_ms}ms` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Danger Zone */}
      {activeTab === 'danger' && (
        <section className={styles.dangerSection} aria-labelledby="danger-heading">
          <div className={styles.dangerHeader}>
            <h2 id="danger-heading" className={styles.dangerTitle}>Administrative Danger Zone</h2>
            <p className={styles.dangerDesc}>
              These operations directly impact backend memory, background timers, and database state. Proceed with caution.
            </p>
          </div>

          <div className={styles.dangerActionsGrid}>
            {/* Action 1: Clear Cache */}
            <div className={styles.dangerCard}>
              <div className={styles.dangerCardInfo}>
                <h3 className={styles.dangerCardTitle}>Purge Device Cache</h3>
                <p className={styles.dangerCardText}>
                  Evicts cached JSON telemetry for all devices. The backend will perform clean state queries on the next polling cycle.
                </p>
              </div>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleClearCache}
                disabled={actionInProgress}
              >
                Clear State Cache
              </button>
            </div>

            {/* Action 2: Restart Poller */}
            <div className={styles.dangerCard}>
              <div className={styles.dangerCardInfo}>
                <h3 className={styles.dangerCardTitle}>Restart Poller Timers</h3>
                <p className={styles.dangerCardText}>
                  Stops all active polling intervals and starts fresh workers for every registered WLED device.
                </p>
              </div>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleRestartPoller}
                disabled={actionInProgress}
              >
                Restart Poller
              </button>
            </div>

            {/* Action 3: Reset Spatial Layout */}
            <div className={styles.dangerCard}>
              <div className={styles.dangerCardInfo}>
                <h3 className={styles.dangerCardTitle}>Reset Spatial 3D Layout</h3>
                <p className={styles.dangerCardText}>
                  Deletes all 3D rooms, floors, dwellings, and light anchors. Registered devices will remain in the database.
                </p>
              </div>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => setShowSpatialModal(true)}
                disabled={actionInProgress}
              >
                Reset Spatial Data
              </button>
            </div>

            {/* Action 4: Factory Reset */}
            <div className={styles.dangerCard} style={{ borderColor: 'rgba(239, 68, 68, 0.6)' }}>
              <div className={styles.dangerCardInfo}>
                <h3 className={styles.dangerCardTitle} style={{ color: 'var(--accent-rose)' }}>
                  Factory Reset Database
                </h3>
                <p className={styles.dangerCardText}>
                  Permanently deletes all devices, groups, presets, routines, schedules, spatial rooms, and custom settings.
                </p>
              </div>
              <button
                type="button"
                className={`${styles.btnDanger} ${styles.btnDangerSolid}`}
                onClick={() => setShowFactoryModal(true)}
                disabled={actionInProgress}
              >
                Factory Reset...
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Reset Spatial Confirmation Modal */}
      {showSpatialModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSpatialModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Reset Spatial 3D Layout?</h3>
            <p className={styles.modalBody}>
              This will permanently delete all rooms, dimensions, and 3D light anchor positions. Your registered WLED devices will not be deleted.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => setShowSpatialModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnDanger} ${styles.btnDangerSolid}`}
                onClick={handleResetSpatial}
                disabled={actionInProgress}
              >
                Yes, Reset Spatial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal with explicit typing confirmation */}
      {showFactoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFactoryModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Confirm Factory Reset</h3>
            <p className={styles.modalBody}>
              This will completely wipe your SQLite database. All devices, groups, presets, schedules, and custom settings will be deleted.
            </p>
            <p className={styles.modalBody} style={{ fontWeight: 600 }}>
              To proceed, please type <code style={{ color: 'var(--accent-rose)' }}>RESET</code> below:
            </p>
            <input
              type="text"
              className={styles.modalInput}
              value={factoryConfirmInput}
              onChange={e => setFactoryConfirmInput(e.target.value)}
              placeholder="RESET"
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnAction}
                onClick={() => {
                  setShowFactoryModal(false)
                  setFactoryConfirmInput('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnDanger} ${styles.btnDangerSolid}`}
                onClick={handleFactoryReset}
                disabled={actionInProgress || factoryConfirmInput !== 'RESET'}
              >
                Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
