import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'

test('SQLite in-memory initialization and schema verification', () => {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      ip_address   TEXT NOT NULL,
      mac_address  TEXT,
      firmware_ver TEXT,
      led_count    INTEGER,
      is_online    INTEGER NOT NULL DEFAULT 1,
      last_seen_at TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Insert sample device
  const insert = db.prepare(`
    INSERT INTO devices (id, name, ip_address, firmware_ver)
    VALUES (?, ?, ?, ?)
  `)
  insert.run('test-dev-1', 'Living Room Strip', '192.168.1.50', '0.14.0')

  const row = db.prepare('SELECT * FROM devices WHERE id = ?').get('test-dev-1')
  assert.equal(row.id, 'test-dev-1')
  assert.equal(row.name, 'Living Room Strip')
  assert.equal(row.ip_address, '192.168.1.50')
  assert.equal(row.firmware_ver, '0.14.0')
  assert.equal(row.is_online, 1)

  // Verify OTA firmware update query updates existing firmware version
  const updateStmt = db.prepare(`
    UPDATE devices SET
      mac_address  = COALESCE(NULLIF(?, ''), mac_address),
      firmware_ver = COALESCE(NULLIF(?, ''), firmware_ver),
      led_count    = COALESCE(?, led_count),
      updated_at   = datetime('now')
    WHERE id = ?
  `)
  updateStmt.run('aabbcc112233', '0.15.0', 120, 'test-dev-1')

  const updatedRow = db.prepare('SELECT * FROM devices WHERE id = ?').get('test-dev-1')
  assert.equal(updatedRow.firmware_ver, '0.15.0', 'Firmware version updated after OTA')
  assert.equal(updatedRow.mac_address, 'aabbcc112233', 'MAC address updated')
  assert.equal(updatedRow.led_count, 120, 'LED count updated')

  // Verify null or empty does not overwrite
  updateStmt.run(null, '', null, 'test-dev-1')
  const preservedRow = db.prepare('SELECT * FROM devices WHERE id = ?').get('test-dev-1')
  assert.equal(preservedRow.firmware_ver, '0.15.0', 'Firmware version preserved when poll has empty ver')

  db.close()
})
