import { getDb } from '../db/database.js'

/**
 * Curated Demo Mode Hardware Roster
 * Provides realistic virtual WLED devices with pre-configured live states,
 * color palettes, and segment geometries.
 */

export const DEMO_DEVICES = [
  {
    id: 'demo-tv',
    name: 'Living Room TV Bias',
    ip_address: '192.168.1.180',
    mac_address: '34:85:18:22:33:44',
    firmware_ver: '0.15.0',
    led_count: 72,
    led_density: 60,
    is_online: 1,
    sort_order: 0,
    spotify_sync_enabled: 1,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-kitchen',
    name: 'Kitchen Island Underglow',
    ip_address: '192.168.1.181',
    mac_address: '34:85:18:55:66:77',
    firmware_ver: '0.15.0',
    led_count: 144,
    led_density: 60,
    is_online: 1,
    sort_order: 1,
    spotify_sync_enabled: 0,
    weather_sync_enabled: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-office',
    name: 'Studio Desk Halo',
    ip_address: '192.168.1.182',
    mac_address: '34:85:18:88:99:AA',
    firmware_ver: '0.15.0',
    led_count: 90,
    led_density: 60,
    is_online: 1,
    sort_order: 2,
    spotify_sync_enabled: 1,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-matrix',
    name: 'PixelForge Matrix 16x16',
    ip_address: '192.168.1.183',
    mac_address: '34:85:18:BB:CC:DD',
    firmware_ver: '0.15.0',
    led_count: 256,
    led_density: 60,
    is_online: 1,
    sort_order: 3,
    spotify_sync_enabled: 0,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-patio',
    name: 'Patio String Lights',
    ip_address: '192.168.1.184',
    mac_address: '34:85:18:EE:FF:11',
    firmware_ver: '0.14.4',
    led_count: 200,
    led_density: 30,
    is_online: 1,
    sort_order: 4,
    spotify_sync_enabled: 0,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-garden',
    name: 'Garden Pathway (Offline)',
    ip_address: '192.168.1.185',
    mac_address: '34:85:18:22:99:00',
    firmware_ver: '0.14.0',
    led_count: 50,
    led_density: 30,
    is_online: 0,
    sort_order: 5,
    spotify_sync_enabled: 0,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
]

/**
 * Initial Simulated Live States for Demo Devices
 */
export const DEMO_LIVE_STATES = {
  'demo-tv': {
    on: true,
    bri: 210,
    transition: 7,
    ps: -1,
    pl: -1,
    seg: [
      {
        id: 0,
        start: 0,
        stop: 72,
        len: 72,
        grp: 1,
        spc: 0,
        of: 0,
        on: true,
        bri: 255,
        col: [[0, 210, 255], [0, 0, 0], [0, 0, 0]],
        fx: 0,
        sx: 128,
        ix: 128,
        pal: 0,
      },
    ],
    info: {
      ver: '0.15.0',
      vid: 2401010,
      leds: { count: 72, pwr: 650, fps: 42, maxpwr: 2000, maxseg: 16 },
      name: 'Living Room TV Bias',
      udpport: 21324,
      live: false,
      fxcount: 187,
      palcount: 71,
      arch: 'esp32',
      core: 'v3.3.6',
      freeheap: 184500,
      uptime: 36000,
      opt: 127,
      brand: 'WLED',
      product: 'Faux Device',
      mac: '34:85:18:22:33:44',
      ip: '192.168.1.180',
    },
  },
  'demo-kitchen': {
    on: true,
    bri: 255,
    transition: 7,
    ps: -1,
    pl: -1,
    seg: [
      {
        id: 0,
        start: 0,
        stop: 144,
        len: 144,
        grp: 1,
        spc: 0,
        of: 0,
        on: true,
        bri: 255,
        col: [[255, 160, 40], [0, 0, 0], [0, 0, 0]],
        fx: 0,
        sx: 128,
        ix: 128,
        pal: 0,
      },
    ],
    info: {
      ver: '0.15.0',
      vid: 2401010,
      leds: { count: 144, pwr: 1200, fps: 42, maxpwr: 4000, maxseg: 16 },
      name: 'Kitchen Island Underglow',
      udpport: 21324,
      live: false,
      fxcount: 187,
      palcount: 71,
      arch: 'esp32',
      core: 'v3.3.6',
      freeheap: 192000,
      uptime: 72000,
      opt: 127,
      brand: 'WLED',
      product: 'Faux Device',
      mac: '34:85:18:55:66:77',
      ip: '192.168.1.181',
    },
  },
  'demo-office': {
    on: true,
    bri: 190,
    transition: 7,
    ps: -1,
    pl: -1,
    seg: [
      {
        id: 0,
        start: 0,
        stop: 90,
        len: 90,
        grp: 1,
        spc: 0,
        of: 0,
        on: true,
        bri: 255,
        col: [[168, 85, 247], [59, 130, 246], [0, 0, 0]],
        fx: 8,
        sx: 140,
        ix: 210,
        pal: 11,
      },
    ],
    info: {
      ver: '0.15.0',
      vid: 2401010,
      leds: { count: 90, pwr: 800, fps: 42, maxpwr: 3000, maxseg: 16 },
      name: 'Studio Desk Halo',
      udpport: 21324,
      live: false,
      fxcount: 187,
      palcount: 71,
      arch: 'esp32',
      core: 'v3.3.6',
      freeheap: 178000,
      uptime: 14400,
      opt: 127,
      brand: 'WLED',
      product: 'Faux Device',
      mac: '34:85:18:88:99:AA',
      ip: '192.168.1.182',
    },
  },
  'demo-matrix': {
    on: true,
    bri: 160,
    transition: 7,
    ps: -1,
    pl: -1,
    seg: [
      {
        id: 0,
        start: 0,
        stop: 256,
        len: 256,
        grp: 1,
        spc: 0,
        of: 0,
        on: true,
        bri: 255,
        col: [[255, 40, 100], [0, 255, 200], [0, 0, 0]],
        fx: 0,
        sx: 128,
        ix: 128,
        pal: 0,
      },
    ],
    info: {
      ver: '0.15.0',
      vid: 2401010,
      leds: { count: 256, pwr: 2100, fps: 30, maxpwr: 5000, maxseg: 16, matrix: { w: 16, h: 16 } },
      name: 'PixelForge Matrix 16x16',
      udpport: 21324,
      live: false,
      fxcount: 187,
      palcount: 71,
      arch: 'esp32-s3',
      core: 'v3.3.6',
      freeheap: 240000,
      uptime: 48000,
      opt: 127,
      brand: 'WLED',
      product: 'Faux Device',
      mac: '34:85:18:BB:CC:DD',
      ip: '192.168.1.183',
    },
  },
  'demo-patio': {
    on: false,
    bri: 140,
    transition: 7,
    ps: -1,
    pl: -1,
    seg: [
      {
        id: 0,
        start: 0,
        stop: 200,
        len: 200,
        grp: 1,
        spc: 0,
        of: 0,
        on: false,
        bri: 255,
        col: [[255, 214, 138], [0, 0, 0], [0, 0, 0]],
        fx: 0,
        sx: 128,
        ix: 128,
        pal: 0,
      },
    ],
    info: {
      ver: '0.14.4',
      vid: 2403200,
      leds: { count: 200, pwr: 1500, fps: 40, maxpwr: 5000, maxseg: 16 },
      name: 'Patio String Lights',
      udpport: 21324,
      live: false,
      fxcount: 187,
      palcount: 71,
      arch: 'esp32',
      core: 'v3.3.6',
      freeheap: 165000,
      uptime: 86400,
      opt: 127,
      brand: 'WLED',
      product: 'Faux Device',
      mac: '34:85:18:EE:FF:11',
      ip: '192.168.1.184',
    },
  },
  'demo-garden': {
    on: false,
    bri: 0,
    seg: [],
    info: {
      ver: '0.14.0',
      name: 'Garden Pathway (Offline)',
      leds: { count: 50 },
      mac: '34:85:18:22:99:00',
      ip: '192.168.1.185',
    },
  },
}

/**
 * Curated Demo Groups
 */
export const DEMO_GROUPS = [
  {
    id: 'demo-grp-ambient',
    name: 'Main Floor Ambient',
    type: 'zone',
    color: '#22d3ee',
    sort_order: 0,
    spotify_sync_enabled: 1,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    device_ids: ['demo-tv', 'demo-kitchen'],
    child_group_ids: [],
  },
  {
    id: 'demo-grp-studio',
    name: 'Studio Creative Sync',
    type: 'sync',
    color: '#a855f7',
    sort_order: 1,
    spotify_sync_enabled: 1,
    weather_sync_enabled: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    device_ids: ['demo-office', 'demo-matrix'],
    child_group_ids: [],
  },
]

/**
 * Curated 3D Spatial Companion Floorplan
 * Perfectly proportioned architectural layout containing Living Room, Kitchen,
 * and Studio with physical light bars positioned and aligned to the demo devices.
 */
export const DEMO_SPATIAL_HIERARCHY = [
  {
    id: 'demo-dwelling-1',
    name: 'Demo Penthouse',
    sort_order: 0,
    floors: [
      {
        id: 'demo-floor-1',
        dwelling_id: 'demo-dwelling-1',
        name: 'Main Level',
        elevation: 0,
        sort_order: 0,
        rooms: [
          {
            id: 'demo-room-living',
            floor_id: 'demo-floor-1',
            name: 'Living Room',
            width: 6.0,
            depth: 5.5,
            position_x: -3.2,
            position_y: 0,
            rotation_y: 0,
            sort_order: 0,
            anchors: [
              {
                id: 'demo-anchor-tv',
                room_id: 'demo-room-living',
                device_id: 'demo-tv',
                name: 'TV Media Bias Bar',
                type: 'light_bar',
                offset_x: 0,
                offset_y: 1.35,
                offset_z: -2.4,
                rotation_y: 0,
                length: 2.1,
                led_density: 60,
              },
              {
                id: 'demo-anchor-patio',
                room_id: 'demo-room-living',
                device_id: 'demo-patio',
                name: 'Balcony Perimeter Strip',
                type: 'light_bar',
                offset_x: 0,
                offset_y: 2.65,
                offset_z: 2.5,
                rotation_y: 0,
                length: 5.2,
                led_density: 30,
              },
            ],
          },
          {
            id: 'demo-room-kitchen',
            floor_id: 'demo-floor-1',
            name: 'Kitchen & Bar',
            width: 4.5,
            depth: 5.5,
            position_x: 2.5,
            position_y: 0,
            rotation_y: 0,
            sort_order: 1,
            anchors: [
              {
                id: 'demo-anchor-kitchen',
                room_id: 'demo-room-kitchen',
                device_id: 'demo-kitchen',
                name: 'Island Counter Glow',
                type: 'light_bar',
                offset_x: 0,
                offset_y: 0.9,
                offset_z: 0,
                rotation_y: 0,
                length: 2.8,
                led_density: 60,
              },
            ],
          },
          {
            id: 'demo-room-studio',
            floor_id: 'demo-floor-1',
            name: 'Creative Studio',
            width: 4.5,
            depth: 4.2,
            position_x: 2.5,
            position_y: -5.2,
            rotation_y: 0,
            sort_order: 2,
            anchors: [
              {
                id: 'demo-anchor-office',
                room_id: 'demo-room-studio',
                device_id: 'demo-office',
                name: 'Desk Ambient Bar',
                type: 'light_bar',
                offset_x: 0,
                offset_y: 0.85,
                offset_z: -1.7,
                rotation_y: 0,
                length: 1.8,
                led_density: 60,
              },
              {
                id: 'demo-anchor-matrix',
                room_id: 'demo-room-studio',
                device_id: 'demo-matrix',
                name: 'Pixel Matrix Wall Mount',
                type: 'matrix_panel',
                offset_x: -1.2,
                offset_y: 1.5,
                offset_z: -1.9,
                rotation_y: 0,
                length: 0.8,
                led_density: 60,
              },
            ],
          },
        ],
      },
    ],
  },
]

// ── In-Memory Demo State Cache ───────────────────────────────────────────────
const demoStateCache = new Map()

// Initialize cache with default live states
for (const [id, state] of Object.entries(DEMO_LIVE_STATES)) {
  demoStateCache.set(id, JSON.parse(JSON.stringify(state)))
}

/**
 * Check if demo mode is currently enabled in settings.
 */
export function isDemoMode() {
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'demo_mode'").get()
    return row?.value === '1' || row?.value === 'true'
  } catch {
    return false
  }
}

export function getDemoDevices() {
  return DEMO_DEVICES.map(d => ({
    ...d,
    liveState: demoStateCache.get(d.id) || null,
  }))
}

export function getDemoDevice(id) {
  const found = DEMO_DEVICES.find(d => d.id === id)
  if (!found) return null
  return {
    ...found,
    liveState: demoStateCache.get(id) || null,
  }
}

export function getDemoCachedState(id) {
  return demoStateCache.get(id) ?? null
}

export function getAllDemoCachedStates() {
  return Object.fromEntries(demoStateCache)
}

/**
 * Apply command payload to simulated virtual device.
 * Updates in-memory stateCache and returns updated WLED state payload.
 */
export function applyDemoDeviceCommand(deviceId, payload) {
  const current = demoStateCache.get(deviceId) || { on: true, bri: 255, seg: [] }
  const updated = { ...current }

  if (payload.on != null) updated.on = Boolean(payload.on)
  if (payload.bri != null) updated.bri = Number(payload.bri)

  // Segment patches
  if (Array.isArray(payload.seg)) {
    const existingSegs = updated.seg || []
    updated.seg = payload.seg.map((patch, idx) => {
      const existing = existingSegs[idx] || {}
      return {
        ...existing,
        ...patch,
        col: patch.col || existing.col || [[255, 255, 255]],
      }
    })
  } else if (payload.col) {
    // Primary color shortcut
    if (!updated.seg || updated.seg.length === 0) {
      updated.seg = [{ id: 0, start: 0, stop: 72, col: [payload.col] }]
    } else {
      updated.seg[0] = {
        ...updated.seg[0],
        col: [payload.col, updated.seg[0].col?.[1] || [0, 0, 0], [0, 0, 0]],
      }
    }
  }

  demoStateCache.set(deviceId, updated)
  return updated
}

export function getDemoGroups() {
  return DEMO_GROUPS
}

export function getDemoSpatialHierarchy() {
  return DEMO_SPATIAL_HIERARCHY
}

/**
 * Update virtual demo device properties in memory.
 */
export function updateDemoDevice(id, fields) {
  const dev = DEMO_DEVICES.find(d => d.id === id)
  if (!dev) return null
  for (const [k, v] of Object.entries(fields)) {
    if (k in dev) {
      dev[k] = v
    }
  }
  // If firmware version is updated, synchronize liveState info cache
  if (fields.firmware_ver) {
    const cached = demoStateCache.get(id)
    if (cached?.info) {
      cached.info.ver = fields.firmware_ver
    }
  }
  return getDemoDevice(id)
}

/**
 * Safely simulate OTA firmware update for a demo device.
 */
export function simulateDemoFirmwareUpdate(id, version = '0.15.0') {
  return updateDemoDevice(id, { firmware_ver: version })
}
