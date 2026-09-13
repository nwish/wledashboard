import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeMarkdown, isBinaryLink } from './releaseNotes.js'

test('sanitizeMarkdown strips Assets and Downloads sections', () => {
  const raw = `
# WLED 0.15.0

### New Features
* Added support for new animations
* Improved WiFi reconnect

### Assets
* [WLED_0.15.0_ESP32.bin](https://github.com/Aircoookie/WLED/releases/download/v0.15.0/WLED_0.15.0_ESP32.bin)
* [WLED_0.15.0_ESP8266.bin](https://github.com/Aircoookie/WLED/releases/download/v0.15.0/WLED_0.15.0_ESP8266.bin)

### Bug Fixes
* Fixed UDP sync packet drop
`

  const sanitized = sanitizeMarkdown(raw)
  assert.ok(sanitized.includes('New Features'))
  assert.ok(sanitized.includes('Bug Fixes'))
  assert.ok(!sanitized.includes('WLED_0.15.0_ESP32.bin'))
  assert.ok(!sanitized.includes('### Assets'))
})

test('sanitizeMarkdown filters individual .bin download lines outside sections', () => {
  const raw = `
* Direct binary: https://example.com/build.bin
* Safe note: Improved performance
`
  const sanitized = sanitizeMarkdown(raw)
  assert.ok(!sanitized.includes('build.bin'))
  assert.ok(sanitized.includes('Safe note'))
})

test('isBinaryLink identifies binary and download URLs', () => {
  assert.equal(isBinaryLink('https://github.com/releases/download/v1/wled.bin'), true)
  assert.equal(isBinaryLink('https://example.com/firmware.bin?raw=true'), true)
  assert.equal(isBinaryLink('https://github.com/Aircoookie/WLED/releases/tag/v0.15.0'), false)
  assert.equal(isBinaryLink('https://kno.wled.ge/'), false)
})
