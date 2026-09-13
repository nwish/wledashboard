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

  db.close()
})
