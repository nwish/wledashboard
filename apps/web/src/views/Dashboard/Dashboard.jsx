import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { useSpatialStore } from '../../stores/spatialStore.js'
import { DeviceCard } from '../../components/DeviceCard/DeviceCard.jsx'
import { GroupCard } from '../../components/GroupCard/GroupCard.jsx'
import { SearchBar } from '../../components/SearchBar/SearchBar.jsx'
import { IpChip } from '../../components/IpChip/IpChip.jsx'
import { ReleaseNotesModal } from '../../components/ReleaseNotesModal/ReleaseNotesModal.jsx'
import { extractDominantColor, blendColors, wledBriToPct, pctToWledBri } from '../../lib/colors.js'
import { isDeviceFirmwareOutdated, getEffectiveLatestVersion } from '../../lib/firmware.js'
import { Toggle } from '../../components/Toggle/Toggle.jsx'
import styles from './Dashboard.module.css'

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function SortableCard({ device, disabled, room, animationDelay }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: device.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : undefined,
    animationDelay,
    position: 'relative'
  }

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={{ 
          ...style, 
          border: '2px dashed var(--accent-violet)', 
          borderRadius: 'var(--radius-l)', 
          backgroundColor: 'var(--accent-violet-10)', 
          height: '100%',
          minHeight: '300px',
          opacity: 0.7
        }}
        className={styles.cardWrapper}
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.cardWrapper}
    >
      <DeviceCard 
        device={device} 
        isManualSort={!disabled}
        dragAttributes={attributes}
        dragListeners={listeners}
        dragRef={setActivatorNodeRef}
      />
      {room && (
        <div className={styles.roomTag}>{room}</div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { devices, loading, error, fetchDevices, reorderDevices, latestFirmwareVersion, latestReleaseInfo, isFetchingFirmware, fetchLatestFirmware } = useDeviceStore()
  const { groups, fetchGroups } = useGroupStore()
  const { hierarchy, fetchHierarchy } = useSpatialStore()
  const setHeaderAccentColor = useUIStore(s => s.setHeaderAccentColor)
  const sortMode = useUIStore(s => s.dashboardSortMode)
  const setSortMode = useUIStore(s => s.setDashboardSortMode)
  const viewMode = useUIStore(s => s.dashboardViewMode)
  const setViewMode = useUIStore(s => s.setDashboardViewMode)
  const filter = useUIStore(s => s.dashboardFilter)
  const setFilter = useUIStore(s => s.setDashboardFilter)

  const [search, setSearch]         = useState('')
  const [localOrder, setLocalOrder] = useState([])
  const [activeId, setActiveId]     = useState(null)
  const [showReleaseNotes, setShowReleaseNotes] = useState(false)

  useEffect(() => {
    fetchDevices()
    fetchGroups()
    fetchHierarchy()
  }, [fetchDevices, fetchGroups, fetchHierarchy])

  // Keep local order in sync with store (e.g. after initial load or external add)
  useEffect(() => {
    setLocalOrder(prev => {
      const prevIds = new Set(prev)
      const newIds  = new Set(devices.map(d => d.id))
      const merged  = prev.filter(id => newIds.has(id))
      devices.forEach(d => { if (!prevIds.has(d.id)) merged.push(d.id) })
      return merged
    })
  }, [devices])

  // Blend active device colors into header accent
  useEffect(() => {
    const activeColors = devices
      .filter(d => d.liveState?.on && d.is_online)
      .map(d => extractDominantColor(d.liveState))
      .filter(Boolean)
    setHeaderAccentColor(blendColors(activeColors))
  }, [devices, setHeaderAccentColor])

  // Map devices to rooms for grouping
  const deviceRoomMap = useMemo(() => {
    const map = {}
    hierarchy.forEach(d => {
      d.floors?.forEach(f => {
        f.rooms?.forEach(r => {
          r.anchors?.forEach(a => {
            if (a.device_id) map[a.device_id] = r.name
          })
        })
      })
    })
    return map
  }, [hierarchy])

  // Filtered + ordered device list
  const orderedDevices = localOrder
    .map(id => devices.find(d => d.id === id))
    .filter(Boolean)

  let sortedDevices = [...orderedDevices]
  if (sortMode === 'az') {
    sortedDevices.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortMode === 'za') {
    sortedDevices.sort((a, b) => b.name.localeCompare(a.name))
  } else if (sortMode === 'date') {
    sortedDevices.sort((a, b) => b.sort_order - a.sort_order) // Newest first
  } else if (sortMode === 'room') {
    sortedDevices.sort((a, b) => {
      const rA = deviceRoomMap[a.id] || 'Unassigned'
      const rB = deviceRoomMap[b.id] || 'Unassigned'
      if (rA === rB) return a.name.localeCompare(b.name)
      if (rA === 'Unassigned') return 1
      if (rB === 'Unassigned') return -1
      return rA.localeCompare(rB)
    })
  }

  const effectiveLatestVersion = getEffectiveLatestVersion(devices, latestFirmwareVersion)

  const filtered = sortedDevices.filter(d => {
    if (search) {
      const q = search.toLowerCase()
      const room = deviceRoomMap[d.id]?.toLowerCase() || ''
      if (!d.name.toLowerCase().includes(q) && !d.ip_address.includes(q) && !room.includes(q)) {
        return false
      }
    }
    if (filter === 'online')  return d.is_online
    if (filter === 'offline') return !d.is_online
    if (filter === 'on')      return d.is_online && (d.liveState?.on ?? false)
    if (filter === 'off')     return d.is_online && !(d.liveState?.on ?? false)
    if (filter === 'firmware') return isDeviceFirmwareOutdated(d, effectiveLatestVersion)
    return true
  })

  // Stats counts
  const onlineCount   = devices.filter(d => d.is_online).length
  const offlineCount  = devices.length - onlineCount
  const onCount       = devices.filter(d => d.is_online && (d.liveState?.on ?? false)).length
  const offCount      = devices.filter(d => d.is_online && !(d.liveState?.on ?? false)).length
  const outdatedCount = devices.filter(d => isDeviceFirmwareOutdated(d, effectiveLatestVersion)).length

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const isManualSort = sortMode === 'manual'

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null)
    if (!isManualSort) return
    if (!over || active.id === over.id) return
    const oldIndex = localOrder.indexOf(active.id)
    const newIndex = localOrder.indexOf(over.id)
    const next = arrayMove(localOrder, oldIndex, newIndex)
    setLocalOrder(next)
    reorderDevices(next)
  }, [localOrder, reorderDevices, isManualSort])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeDevice = activeId ? devices.find(d => d.id === activeId) : null

  const showSearch = devices.length > 4

  if (loading) return <DashboardSkeleton />
  if (error)   return <DashboardError message={error} onRetry={fetchDevices} />

  return (
    <main className={styles.dashboard} id="main-content">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Dashboard</h1>
          <div className={styles.stats} role="group" aria-label="Device category filters">
            <StatPill label="Devices" value={devices.length} active={filter === 'all'} onClick={() => setFilter('all')} />
            <StatPill label="Online"  value={onlineCount} active={filter === 'online'} onClick={() => setFilter('online')} />
            <StatPill label="Offline" value={offlineCount} active={filter === 'offline'} onClick={() => setFilter('offline')} />
            <StatPill label="ON"      value={onCount} active={filter === 'on'} onClick={() => setFilter('on')} />
            <StatPill label="OFF"     value={offCount} active={filter === 'off'} onClick={() => setFilter('off')} />
            <StatPill 
              label="Firmware" 
              value={outdatedCount} 
              active={filter === 'firmware'} 
              highlight={outdatedCount > 0}
              onClick={() => setFilter('firmware')} 
            />
            {groups.length > 0 && <StatPill label="Groups" value={groups.length} active={false} onClick={() => setViewMode('groups')} />}
          </div>
        </div>

        <div className={styles.headerRight}>
          {(viewMode === 'devices' || viewMode === 'compact') && (
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value)}
              className={styles.sortSelect}
              title="Sort Devices"
            >
              <option value="manual">Manual Sort (Drag & Drop)</option>
              <option value="room">Group by Room</option>
              <option value="az">Alphabetical (A-Z)</option>
              <option value="za">Alphabetical (Z-A)</option>
              <option value="date">Date Added</option>
            </select>
          )}

          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value)}
            className={styles.sortSelect}
            title="Dashboard View"
            style={{ fontWeight: 600, color: 'var(--text-primary)' }}
          >
            <option value="devices">Grid View</option>
            <option value="compact">Compact List</option>
            <option value="rooms">Rooms View</option>
            {groups.length > 0 && <option value="groups">Groups ({groups.length})</option>}
            <option value="media">Media & Sync</option>
            <option value="favorites">Favorites</option>
            <option value="firmware">Firmware ({outdatedCount})</option>
          </select>
          <span className={styles.networkBadge}>
            <span className={styles.networkDot} />
            Local Network
          </span>
        </div>
      </header>

      {showSearch && viewMode === 'devices' && (
        <SearchBar
          value={search}
          onChange={setSearch}
          filter={filter}
          onFilter={setFilter}
          resultCount={filtered.length}
        />
      )}

      {devices.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'groups' ? (
        <section className={styles.grid} aria-label="Group list">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </section>
      ) : viewMode === 'rooms' ? (
        <RoomsView devices={filtered} deviceRoomMap={deviceRoomMap} />
      ) : viewMode === 'compact' ? (
        <CompactView devices={filtered} effectiveLatestVersion={effectiveLatestVersion} />
      ) : viewMode === 'media' ? (
        <MediaView devices={filtered} />
      ) : viewMode === 'favorites' ? (
        <FavoritesView devices={filtered} />
      ) : viewMode === 'firmware' ? (
        <FirmwareView 
          devices={devices} 
          effectiveLatestVersion={effectiveLatestVersion}
          latestReleaseInfo={latestReleaseInfo}
          isFetchingFirmware={isFetchingFirmware}
          onRefresh={() => {
            fetchLatestFirmware(true)
            fetchDevices()
          }}
          onOpenNotes={() => setShowReleaseNotes(true)}
        />
      ) : filtered.length === 0 ? (
        <NoResults filter={filter} effectiveLatestVersion={effectiveLatestVersion} onClear={() => { setSearch(''); setFilter('all') }} />
      ) : (
        <>
          {filter === 'firmware' && (
            <div className={styles.firmwareBanner}>
              <div className={styles.firmwareBannerContent}>
                <div className={styles.firmwareBannerTitle}>
                  <span>Firmware Updates</span>
                  {effectiveLatestVersion && (
                    <span className={styles.firmwareVersionBadge}>Latest: v{effectiveLatestVersion}</span>
                  )}
                </div>
                <p className={styles.firmwareBannerSub}>
                  {filtered.length} {filtered.length === 1 ? 'device' : 'devices'} behind current release.
                </p>
              </div>
              <div className={styles.firmwareBannerActions}>
                <button
                  type="button"
                  className={[styles.firmwareRefreshBtn, isFetchingFirmware && styles.firmwareRefreshSpinning].filter(Boolean).join(' ')}
                  onClick={() => {
                    fetchLatestFirmware(true)
                    fetchDevices()
                  }}
                  disabled={isFetchingFirmware}
                  title="Check for firmware updates now"
                  aria-label="Check for firmware updates now"
                >
                  <RefreshIcon />
                </button>
                {effectiveLatestVersion && (
                  <button
                    type="button"
                    className={styles.firmwareNotesBtn}
                    onClick={() => setShowReleaseNotes(true)}
                  >
                    What's New in v{effectiveLatestVersion}
                  </button>
                )}
                <a 
                  href="https://github.com/wled/WLED/releases" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.firmwareReleaseLink}
                >
                  View WLED Releases
                </a>
              </div>
            </div>
          )}
          <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={filtered.map(d => d.id)} strategy={rectSortingStrategy}>
              <section className={styles.grid} aria-label="Device list">
                {filtered.map((device, i) => (
                  <SortableCard 
                    key={device.id} 
                    device={device} 
                    disabled={!isManualSort} 
                    room={sortMode === 'room' ? deviceRoomMap[device.id] : null}
                    animationDelay={`${i * 30}ms`}
                  />
                ))}
              </section>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDevice ? (
                <div style={{ transform: 'scale(1.02)', boxShadow: 'var(--shadow-4)', borderRadius: 'var(--radius-l)', cursor: 'grabbing' }}>
                  <DeviceCard device={activeDevice} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {showReleaseNotes && (
        <ReleaseNotesModal
          releaseInfo={latestReleaseInfo || {
            tagName: effectiveLatestVersion || '0.15.1',
            name: `WLED v${effectiveLatestVersion || '0.15.1'}`,
            publishedAt: new Date().toISOString(),
            body: `## What's New in WLED v${effectiveLatestVersion || '0.15.1'}\n\n* Multi-segment synchronization and smooth transition curves\n* Enhanced audio reactivity and FFT audio analysis\n* Resilient network reconnection and exponential backoff\n* High-throughput JSON and WebSocket streaming APIs\n* Improved memory management for ESP32/ESP8266 architectures`,
            htmlUrl: 'https://github.com/wled/WLED/releases',
          }}
          onClose={() => setShowReleaseNotes(false)}
        />
      )}
    </main>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({ label, value, active, highlight, onClick }) {
  return (
    <button
      className={[
        styles.statPill,
        active && styles.statPillActive,
        highlight && !active && styles.statPillHighlight
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-pressed={active}
      title={`Filter by ${label}`}
    >
      <span className={[styles.statValue, highlight && !active && styles.statValueHighlight].filter(Boolean).join(' ')}>
        {value}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.emptyGlow} aria-hidden />
      <p className={styles.emptyTitle}>No devices found</p>
      <p className={styles.emptyBody}>
        WLEDashboard automatically discovers WLED devices on your local network via mDNS.
        Ensure your devices are powered on and on the same network.
      </p>
      <p className={styles.emptyHint}>
        You can also add a device manually in Settings.
      </p>
    </div>
  )
}

function NoResults({ filter, effectiveLatestVersion, onClear }) {
  if (filter === 'firmware') {
    return (
      <div className={styles.emptyState} role="status">
        <p className={styles.emptyTitle}>All Devices Up to Date</p>
        <p className={styles.emptyBody}>
          Every detected controller is running the current release
          {effectiveLatestVersion ? ` (v${effectiveLatestVersion})` : ''}.
        </p>
        <button className={styles.retryBtn} onClick={onClear}>Show all devices</button>
      </div>
    )
  }

  return (
    <div className={styles.emptyState} role="status">
      <p className={styles.emptyTitle}>No matches</p>
      <p className={styles.emptyBody}>No devices match your current search or filter.</p>
      <button className={styles.retryBtn} onClick={onClear}>Clear filters</button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <main className={styles.dashboard} aria-busy="true" aria-label="Loading devices">
      <header className={styles.header}>
        <div className={styles.skeletonTitle} />
      </header>
      <section className={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </section>
    </main>
  )
}

function DashboardError({ message, onRetry }) {
  return (
    <main className={styles.dashboard} role="alert">
      <div className={styles.errorState}>
        <p className={styles.errorTitle}>Failed to load devices</p>
        <p className={styles.errorBody}>{message}</p>
        <button className={styles.retryBtn} onClick={onRetry}>Try Again</button>
      </div>
    </main>
  )
}

function CompactView({ devices, effectiveLatestVersion }) {
  const sendCommand = useDeviceStore(s => s.sendCommand)
  const [sortKey, setSortKey] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(v => !v)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortedDevices = [...devices].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortKey === 'ip') cmp = a.ip_address.localeCompare(b.ip_address)
    else if (sortKey === 'status') cmp = (a.is_online ? 1 : 0) - (b.is_online ? 1 : 0)
    else if (sortKey === 'power') cmp = ((a.liveState?.on ? 1 : 0) - (b.liveState?.on ? 1 : 0))
    else if (sortKey === 'bri') cmp = (a.liveState?.bri ?? 0) - (b.liveState?.bri ?? 0)
    else if (sortKey === 'firmware') {
      const vA = (a.firmware_ver || a.liveState?.info?.ver) ? String(a.firmware_ver || a.liveState?.info?.ver).replace(/^v/i, '') : ''
      const vB = (b.firmware_ver || b.liveState?.info?.ver) ? String(b.firmware_ver || b.liveState?.info?.ver).replace(/^v/i, '') : ''
      cmp = vA.localeCompare(vB, undefined, { numeric: true })
    }

    return sortAsc ? cmp : -cmp
  })

  const renderHeader = (key, label, style) => (
    <div 
      className={styles.compactHeaderCol} 
      style={style} 
      onClick={() => handleSort(key)}
      role="button"
      tabIndex={0}
      title={`Sort by ${label}`}
    >
      {label} <span className={styles.sortIndicator}>{sortKey === key ? (sortAsc ? '▲' : '▼') : ''}</span>
    </div>
  )

  return (
    <div className={styles.compactContainer}>
      <div className={styles.compactHeaderRow}>
        {renderHeader('name', 'Name', { flex: 1 })}
        {renderHeader('ip', 'IP Address', { width: '130px' })}
        {renderHeader('firmware', 'Firmware', { width: '120px' })}
        {renderHeader('status', 'Status', { width: '90px' })}
        {renderHeader('power', 'Power', { width: '60px' })}
        {renderHeader('bri', 'Bri', { width: '60px', textAlign: 'right' })}
      </div>
      {sortedDevices.map(d => {
        const isOn = d.liveState?.on ?? false
        const briPct = wledBriToPct(d.liveState?.bri ?? 0)
        const isOutdated = isDeviceFirmwareOutdated(d, effectiveLatestVersion)
        const dFirmware = d.firmware_ver || d.liveState?.info?.ver
        return (
          <div key={d.id} className={styles.compactRow}>
            <div className={styles.compactName} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={styles.networkDot} style={{ backgroundColor: d.is_online ? 'var(--accent-emerald)' : 'var(--text-tertiary)', boxShadow: 'none' }} />
              {d.name}
            </div>
            <div style={{ width: '130px', display: 'flex', alignItems: 'center' }}>
              <IpChip ip={d.ip_address} compact />
            </div>
            <div style={{ width: '120px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {dFirmware ? `v${String(dFirmware).replace(/^v/i, '')}` : '—'}
              </span>
              {isOutdated && (
                <span className={styles.firmwareTag} title="Firmware update available">Update</span>
              )}
            </div>
            <div style={{ width: '90px', color: d.is_online ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {d.is_online ? 'Online' : 'Offline'}
            </div>
            <div style={{ width: '60px' }}>
              <Toggle 
                id={`power-compact-${d.id}`}
                checked={isOn}
                disabled={!d.is_online}
                onChange={(on) => sendCommand(d.id, { on, lor: 0 })}
              />
            </div>
            <div style={{ width: '60px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {briPct}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RoomsView({ devices, deviceRoomMap }) {
  const rooms = {}
  devices.forEach(d => {
    const r = deviceRoomMap[d.id] || 'Unassigned'
    if (!rooms[r]) rooms[r] = []
    rooms[r].push(d)
  })

  return (
    <div className={styles.roomsContainer}>
      {Object.entries(rooms).sort().map(([room, devs]) => (
        <div key={room} className={styles.roomSection}>
          <h2 className={styles.roomTitle}>{room} <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8em' }}>({devs.length})</span></h2>
          <section className={styles.grid}>
            {devs.map(d => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </section>
        </div>
      ))}
    </div>
  )
}

function MediaView({ devices }) {
  const mediaDevs = devices.filter(d => 
    Boolean(d.spotify_sync_enabled) || 
    Boolean(d.weather_sync_enabled) ||
    d.liveState?.info?.name?.toLowerCase().includes('wled-sr') ||
    d.liveState?.info?.audio
  )
  if (mediaDevs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No Media Sync Active</p>
        <p className={styles.emptyBody}>Enable Spotify Sync or Weather Sync on a device to see it here.</p>
      </div>
    )
  }
  return (
    <section className={styles.grid}>
      {mediaDevs.map(d => <DeviceCard key={d.id} device={d} />)}
    </section>
  )
}

function FavoritesView({ devices }) {
  const favorites = useUIStore(s => s.favorites)
  const favDevs = devices.filter(d => favorites.includes(d.id))
  
  if (favDevs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No Favorites Pinned</p>
        <p className={styles.emptyBody}>Click the options menu (•••) on any device card and select "Pin to Favorites".</p>
      </div>
    )
  }
  return (
    <section className={styles.grid}>
      {favDevs.map(d => <DeviceCard key={d.id} device={d} />)}
    </section>
  )
}

function FirmwareView({ devices, effectiveLatestVersion, latestReleaseInfo, isFetchingFirmware, onRefresh, onOpenNotes }) {
  const outdatedDevices = devices.filter(d => isDeviceFirmwareOutdated(d, effectiveLatestVersion))
  const upToDateDevices = devices.filter(d => !isDeviceFirmwareOutdated(d, effectiveLatestVersion))

  return (
    <div className={styles.firmwareContainer}>
      <div className={styles.firmwareBanner}>
        <div className={styles.firmwareBannerContent}>
          <div className={styles.firmwareBannerTitle}>
            <span>Firmware Status</span>
            {effectiveLatestVersion && (
              <span className={styles.firmwareVersionBadge}>Latest: v{effectiveLatestVersion}</span>
            )}
          </div>
          <p className={styles.firmwareBannerSub}>
            {outdatedDevices.length === 0
              ? 'All controllers are running the current firmware release.'
              : `${outdatedDevices.length} controller${outdatedDevices.length === 1 ? '' : 's'} behind current release.`}
          </p>
        </div>
        <div className={styles.firmwareBannerActions}>
          <button
            type="button"
            className={[styles.firmwareRefreshBtn, isFetchingFirmware && styles.firmwareRefreshSpinning].filter(Boolean).join(' ')}
            onClick={onRefresh}
            disabled={isFetchingFirmware}
            title="Check for firmware updates now"
            aria-label="Check for firmware updates now"
          >
            <RefreshIcon />
          </button>
          {effectiveLatestVersion && (
            <button
              type="button"
              className={styles.firmwareNotesBtn}
              onClick={onOpenNotes}
            >
              What's New in v{effectiveLatestVersion}
            </button>
          )}
          <a
            href="https://github.com/wled/WLED/releases"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.firmwareReleaseLink}
          >
            View WLED Releases
          </a>
        </div>
      </div>

      {outdatedDevices.length > 0 && (
        <div className={styles.firmwareSection}>
          <h2 className={styles.firmwareSectionTitle}>
            Updates Available <span className={styles.firmwareCountBadge}>{outdatedDevices.length}</span>
          </h2>
          <section className={styles.grid}>
            {outdatedDevices.map(d => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </section>
        </div>
      )}

      <div className={styles.firmwareSection}>
        <h2 className={styles.firmwareSectionTitle}>
          {outdatedDevices.length > 0 ? 'Up To Date Devices' : 'All Devices'} <span className={styles.firmwareCountBadge}>{upToDateDevices.length}</span>
        </h2>
        <section className={styles.grid}>
          {upToDateDevices.map(d => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </section>
      </div>
    </div>
  )
}
