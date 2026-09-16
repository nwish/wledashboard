import { getDb } from '../db/database.js'

// Current schema version identifier -- update this when new tables or columns are added.
const BACKUP_SCHEMA_VERSION = '0.22.0'

/**
 * Export full system configuration as JSON object.
 * Covers all user-editable SQLite tables introduced up to the current schema version.
 */
export function exportConfig() {
  const db = getDb()

  const devices        = db.prepare('SELECT * FROM devices').all()
  const groups         = db.prepare('SELECT * FROM groups').all()
  const group_members  = db.prepare('SELECT * FROM group_members').all()
  const group_children = db.prepare('SELECT * FROM group_children').all()
  const settings       = db.prepare('SELECT * FROM settings').all()
  const presets        = db.prepare('SELECT * FROM presets').all()
  const schedules      = db.prepare('SELECT * FROM schedules').all()
  const routines       = db.prepare('SELECT * FROM routines').all()
  const routine_steps  = db.prepare('SELECT * FROM routine_steps').all()
  const dwellings      = db.prepare('SELECT * FROM dwellings').all()
  const floors         = db.prepare('SELECT * FROM floors').all()
  const rooms          = db.prepare('SELECT * FROM rooms').all()
  const anchors        = db.prepare('SELECT * FROM anchors').all()
  const animations     = db.prepare('SELECT * FROM animations').all()
  const palettes       = db.prepare('SELECT * FROM palettes').all()
  const matrices       = db.prepare('SELECT * FROM matrices').all()
  const matrix_drawings = db.prepare('SELECT * FROM matrix_drawings').all()

  return {
    schema_version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    row_counts: {
      devices: devices.length,
      groups: groups.length,
      group_members: group_members.length,
      group_children: group_children.length,
      settings: settings.length,
      presets: presets.length,
      schedules: schedules.length,
      routines: routines.length,
      routine_steps: routine_steps.length,
      dwellings: dwellings.length,
      floors: floors.length,
      rooms: rooms.length,
      anchors: anchors.length,
      animations: animations.length,
      palettes: palettes.length,
      matrices: matrices.length,
      matrix_drawings: matrix_drawings.length,
    },
    data: {
      devices,
      groups,
      group_members,
      group_children,
      settings,
      presets,
      schedules,
      routines,
      routine_steps,
      dwellings,
      floors,
      rooms,
      anchors,
      animations,
      palettes,
      matrices,
      matrix_drawings,
    },
  }
}

/**
 * Import configuration into database.
 * Mode: 'replace' (clears user tables first) or 'merge' (upserts into existing).
 *
 * Tables that are read-only system tables (schema_version) are never modified.
 * Settings are always merged key-by-key to prevent wiping system-injected defaults.
 */
export function importConfig(configObj, mode = 'merge') {
  if (!configObj || typeof configObj !== 'object' || !configObj.data) {
    throw new Error('Invalid backup format: missing data envelope.')
  }

  const db = getDb()

  const {
    devices        = [],
    groups         = [],
    group_members  = [],
    group_children = [],
    settings       = [],
    presets        = [],
    schedules      = [],
    routines       = [],
    routine_steps  = [],
    dwellings      = [],
    floors         = [],
    rooms          = [],
    anchors        = [],
    animations     = [],
    palettes       = [],
    matrices       = [],
    matrix_drawings = [],
  } = configObj.data

  db.transaction(() => {
    if (mode === 'replace') {
      // Delete in FK-safe order (children before parents)
      db.prepare('DELETE FROM matrix_drawings').run()
      db.prepare('DELETE FROM matrices').run()
      db.prepare('DELETE FROM animations').run()
      db.prepare('DELETE FROM palettes').run()
      db.prepare('DELETE FROM routine_steps').run()
      db.prepare('DELETE FROM routines').run()
      db.prepare('DELETE FROM schedules').run()
      db.prepare('DELETE FROM anchors').run()
      db.prepare('DELETE FROM rooms').run()
      db.prepare('DELETE FROM floors').run()
      db.prepare('DELETE FROM dwellings').run()
      db.prepare('DELETE FROM presets').run()
      db.prepare('DELETE FROM group_children').run()
      db.prepare('DELETE FROM group_members').run()
      db.prepare('DELETE FROM groups').run()
      db.prepare('DELETE FROM devices').run()
    }

    // ── Devices ───────────────────────────────────────────────────────────────
    const devStmt = db.prepare(`
      INSERT OR REPLACE INTO devices
        (id, name, ip_address, mac_address, firmware_ver, led_count, led_density,
         is_online, sort_order, spotify_sync_enabled, weather_sync_enabled,
         last_seen_at, created_at, updated_at)
      VALUES
        (@id, @name, @ip_address, @mac_address, @firmware_ver, @led_count, @led_density,
         @is_online, @sort_order, @spotify_sync_enabled, @weather_sync_enabled,
         @last_seen_at,
         COALESCE(@created_at, datetime('now')), COALESCE(@updated_at, datetime('now')))
    `)
    for (const d of devices) {
      if (!d || !d.id || !d.name || !d.ip_address) continue
      devStmt.run({
        id: d.id,
        name: d.name,
        ip_address: d.ip_address,
        mac_address: d.mac_address ?? null,
        firmware_ver: d.firmware_ver ?? null,
        led_count: d.led_count ?? null,
        led_density: d.led_density ?? 60,
        is_online: d.is_online ?? 1,
        sort_order: d.sort_order ?? 0,
        spotify_sync_enabled: d.spotify_sync_enabled ?? 0,
        weather_sync_enabled: d.weather_sync_enabled ?? 0,
        last_seen_at: d.last_seen_at ?? null,
        created_at: d.created_at ?? null,
        updated_at: d.updated_at ?? null,
      })
    }

    // ── Groups ────────────────────────────────────────────────────────────────
    const groupStmt = db.prepare(`
      INSERT OR REPLACE INTO groups
        (id, name, type, color, sort_order, spotify_sync_enabled, weather_sync_enabled, created_at)
      VALUES
        (@id, @name, @type, @color, @sort_order,
         @spotify_sync_enabled, @weather_sync_enabled,
         COALESCE(@created_at, datetime('now')))
    `)
    for (const g of groups) {
      if (!g || !g.id || !g.name) continue
      groupStmt.run({
        id: g.id,
        name: g.name,
        type: g.type ?? 'custom',
        color: g.color ?? null,
        sort_order: g.sort_order ?? 0,
        spotify_sync_enabled: g.spotify_sync_enabled ?? 0,
        weather_sync_enabled: g.weather_sync_enabled ?? 0,
        created_at: g.created_at ?? null,
      })
    }

    // ── Group Memberships ────────────────────────────────────────────────────
    const memberStmt = db.prepare(`
      INSERT OR IGNORE INTO group_members (group_id, device_id) VALUES (@group_id, @device_id)
    `)
    for (const m of group_members) {
      if (!m || !m.group_id || !m.device_id) continue
      memberStmt.run({ group_id: m.group_id, device_id: m.device_id })
    }

    const childStmt = db.prepare(`
      INSERT OR IGNORE INTO group_children (parent_group_id, child_group_id)
      VALUES (@parent_group_id, @child_group_id)
    `)
    for (const c of group_children) {
      if (!c || !c.parent_group_id || !c.child_group_id) continue
      childStmt.run({ parent_group_id: c.parent_group_id, child_group_id: c.child_group_id })
    }

    // ── Presets ───────────────────────────────────────────────────────────────
    const presetStmt = db.prepare(`
      INSERT OR REPLACE INTO presets (id, name, group_id, state_json, created_at)
      VALUES (@id, @name, @group_id, @state_json, COALESCE(@created_at, datetime('now')))
    `)
    for (const p of presets) {
      if (!p || !p.id || !p.name) continue
      presetStmt.run({
        id: p.id,
        name: p.name,
        group_id: p.group_id ?? null,
        state_json: typeof p.state_json === 'string' ? p.state_json : JSON.stringify(p.state_json ?? {}),
        created_at: p.created_at ?? null,
      })
    }

    // ── Settings (always merge key-by-key) ───────────────────────────────────
    const settingStmt = db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)
    `)
    for (const s of settings) {
      if (!s || !s.key) continue
      settingStmt.run({ key: s.key, value: String(s.value ?? '') })
    }

    // ── Schedules ─────────────────────────────────────────────────────────────
    const schedStmt = db.prepare(`
      INSERT OR REPLACE INTO schedules
        (id, name, is_enabled, trigger_type, trigger_config, trigger_value,
         action_type, action_config, target_type, target_id, payload_json,
         enabled, last_run_at, created_at)
      VALUES
        (@id, @name, @is_enabled, @trigger_type, @trigger_config,
         @trigger_value, @action_type, @action_config, @target_type, @target_id,
         @payload_json, @enabled, @last_run_at,
         COALESCE(@created_at, datetime('now')))
    `)
    for (const s of schedules) {
      if (!s || !s.id || !s.name) continue
      schedStmt.run({
        id: s.id,
        name: s.name,
        is_enabled: s.is_enabled ?? s.enabled ?? 1,
        trigger_type: s.trigger_type ?? 'fixed_time',
        trigger_config: typeof s.trigger_config === 'string' ? s.trigger_config : JSON.stringify(s.trigger_config ?? {}),
        trigger_value: s.trigger_value ?? '12:00',
        action_type: s.action_type ?? 'preset',
        action_config: typeof s.action_config === 'string' ? s.action_config : JSON.stringify(s.action_config ?? {}),
        target_type: s.target_type ?? 'device',
        target_id: s.target_id ?? '',
        payload_json: typeof s.payload_json === 'string' ? s.payload_json : JSON.stringify(s.payload_json ?? {}),
        enabled: s.enabled ?? s.is_enabled ?? 1,
        last_run_at: s.last_run_at ?? null,
        created_at: s.created_at ?? null,
      })
    }

    // ── Routines ──────────────────────────────────────────────────────────────
    const routineStmt = db.prepare(`
      INSERT OR REPLACE INTO routines
        (id, name, is_enabled, description, steps_json, enabled, created_at)
      VALUES
        (@id, @name, @is_enabled, @description,
         @steps_json, @enabled,
         COALESCE(@created_at, datetime('now')))
    `)
    for (const r of routines) {
      if (!r || !r.id || !r.name) continue
      routineStmt.run({
        id: r.id,
        name: r.name,
        is_enabled: r.is_enabled ?? r.enabled ?? 1,
        description: r.description ?? '',
        steps_json: typeof r.steps_json === 'string' ? r.steps_json : JSON.stringify(r.steps_json ?? []),
        enabled: r.enabled ?? r.is_enabled ?? 1,
        created_at: r.created_at ?? null,
      })
    }

    const stepStmt = db.prepare(`
      INSERT OR REPLACE INTO routine_steps
        (id, routine_id, step_order, action_type, action_config, delay_ms, target_type, target_id)
      VALUES
        (@id, @routine_id, @step_order, @action_type, @action_config,
         @delay_ms, @target_type, @target_id)
    `)
    for (const s of routine_steps) {
      if (!s || !s.id || !s.routine_id) continue
      stepStmt.run({
        id: s.id,
        routine_id: s.routine_id,
        step_order: s.step_order ?? 0,
        action_type: s.action_type ?? 'command',
        action_config: typeof s.action_config === 'string' ? s.action_config : JSON.stringify(s.action_config ?? {}),
        delay_ms: s.delay_ms ?? 0,
        target_type: s.target_type ?? null,
        target_id: s.target_id ?? null,
      })
    }

    // ── Spatial Hierarchy ─────────────────────────────────────────────────────
    const dwellingStmt = db.prepare(`
      INSERT OR REPLACE INTO dwellings (id, name, sort_order)
      VALUES (@id, @name, @sort_order)
    `)
    for (const d of dwellings) {
      if (!d || !d.id || !d.name) continue
      dwellingStmt.run({
        id: d.id,
        name: d.name,
        sort_order: d.sort_order ?? 0,
      })
    }

    const floorStmt = db.prepare(`
      INSERT OR REPLACE INTO floors (id, dwelling_id, name, elevation, sort_order)
      VALUES (@id, @dwelling_id, @name, @elevation, @sort_order)
    `)
    for (const f of floors) {
      if (!f || !f.id || !f.dwelling_id || !f.name) continue
      floorStmt.run({
        id: f.id,
        dwelling_id: f.dwelling_id,
        name: f.name,
        elevation: f.elevation ?? 0,
        sort_order: f.sort_order ?? 0,
      })
    }

    const roomStmt = db.prepare(`
      INSERT OR REPLACE INTO rooms
        (id, floor_id, name, width, depth, position_x, position_y, rotation_y, sort_order)
      VALUES
        (@id, @floor_id, @name, @width, @depth,
         @position_x, @position_y,
         @rotation_y, @sort_order)
    `)
    for (const r of rooms) {
      if (!r || !r.id || !r.floor_id || !r.name) continue
      roomStmt.run({
        id: r.id,
        floor_id: r.floor_id,
        name: r.name,
        width: r.width ?? 4.0,
        depth: r.depth ?? 4.0,
        position_x: r.position_x ?? 0,
        position_y: r.position_y ?? 0,
        rotation_y: r.rotation_y ?? 0,
        sort_order: r.sort_order ?? 0,
      })
    }

    const anchorStmt = db.prepare(`
      INSERT OR REPLACE INTO anchors
        (id, room_id, device_id, name, type, offset_x, offset_y, offset_z,
         rotation_y, length, led_density)
      VALUES
        (@id, @room_id, @device_id, @name, @type,
         @offset_x, @offset_y, @offset_z,
         @rotation_y, @length, @led_density)
    `)
    for (const a of anchors) {
      if (!a || !a.id || !a.room_id || !a.name) continue
      anchorStmt.run({
        id: a.id,
        room_id: a.room_id,
        device_id: a.device_id ?? null,
        name: a.name,
        type: a.type ?? 'light_bar',
        offset_x: a.offset_x ?? 0,
        offset_y: a.offset_y ?? 0,
        offset_z: a.offset_z ?? 0,
        rotation_y: a.rotation_y ?? 0,
        length: a.length ?? 3.5,
        led_density: a.led_density ?? 60,
      })
    }

    // ── Studio ────────────────────────────────────────────────────────────────
    const animStmt = db.prepare(`
      INSERT OR REPLACE INTO animations (id, name, timeline_json, duration_ms, created_at)
      VALUES (@id, @name, @timeline_json, @duration_ms, COALESCE(@created_at, datetime('now')))
    `)
    for (const a of animations) {
      if (!a || !a.id || !a.name) continue
      animStmt.run({
        id: a.id,
        name: a.name,
        timeline_json: typeof a.timeline_json === 'string' ? a.timeline_json : JSON.stringify(a.timeline_json ?? {}),
        duration_ms: a.duration_ms ?? 10000,
        created_at: a.created_at ?? null,
      })
    }

    const palStmt = db.prepare(`
      INSERT OR REPLACE INTO palettes (id, name, colors_json, created_at)
      VALUES (@id, @name, @colors_json, COALESCE(@created_at, datetime('now')))
    `)
    for (const p of palettes) {
      if (!p || !p.id || !p.name) continue
      palStmt.run({
        id: p.id,
        name: p.name,
        colors_json: typeof p.colors_json === 'string' ? p.colors_json : JSON.stringify(p.colors_json ?? []),
        created_at: p.created_at ?? null,
      })
    }

    // ── Matrix ────────────────────────────────────────────────────────────────
    const matStmt = db.prepare(`
      INSERT OR REPLACE INTO matrices (id, device_id, name, width, height, created_at)
      VALUES (@id, @device_id, @name, @width, @height,
              COALESCE(@created_at, datetime('now')))
    `)
    for (const m of matrices) {
      if (!m || !m.id || !m.name) continue
      matStmt.run({
        id: m.id,
        device_id: m.device_id ?? null,
        name: m.name,
        width: m.width ?? 16,
        height: m.height ?? 16,
        created_at: m.created_at ?? null,
      })
    }

    const drawStmt = db.prepare(`
      INSERT OR REPLACE INTO matrix_drawings (id, name, width, height, pixels_json, created_at)
      VALUES (@id, @name, @width, @height, @pixels_json, COALESCE(@created_at, datetime('now')))
    `)
    for (const d of matrix_drawings) {
      if (!d || !d.id || !d.name) continue
      drawStmt.run({
        id: d.id,
        name: d.name,
        width: d.width ?? 16,
        height: d.height ?? 16,
        pixels_json: typeof d.pixels_json === 'string' ? d.pixels_json : JSON.stringify(d.pixels_json ?? []),
        created_at: d.created_at ?? null,
      })
    }
  })()

  return {
    ok: true,
    stats: {
      devices: devices.length,
      groups: groups.length,
      presets: presets.length,
      schedules: schedules.length,
      routines: routines.length,
      routine_steps: routine_steps.length,
      dwellings: dwellings.length,
      floors: floors.length,
      rooms: rooms.length,
      anchors: anchors.length,
      animations: animations.length,
      palettes: palettes.length,
      matrices: matrices.length,
      matrix_drawings: matrix_drawings.length,
    },
  }
}
