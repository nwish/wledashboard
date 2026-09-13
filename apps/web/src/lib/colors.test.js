import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hexToRgb,
  rgbToHex,
  briToGlow,
  wledColorToHex,
  wledBriToPct,
  pctToWledBri,
} from './colors.js'

test('hexToRgb parses full and short hex correctly', () => {
  assert.deepEqual(hexToRgb('#ff0000'), [255, 0, 0])
  assert.deepEqual(hexToRgb('#00ff00'), [0, 255, 0])
  assert.deepEqual(hexToRgb('0000ff'), [0, 0, 255])
  assert.deepEqual(hexToRgb('#fff'), [255, 255, 255])
  assert.deepEqual(hexToRgb(null), [255, 255, 255])
  assert.deepEqual(hexToRgb('invalid'), [255, 255, 255])
})

test('rgbToHex converts RGB components to formatted hex string', () => {
  assert.equal(rgbToHex(255, 0, 0), '#ff0000')
  assert.equal(rgbToHex(0, 255, 128), '#00ff80')
  assert.equal(rgbToHex(0, 0, 0), '#000000')
})

test('briToGlow handles both (bri, color) and (color, bri) robustly', () => {
  const glow1 = briToGlow(128, '#ff8000')
  const glow2 = briToGlow('#ff8000', 128)
  assert.equal(glow1, glow2)
  assert.ok(glow1.includes('rgba(255, 128, 0'))

  assert.equal(briToGlow(0, '#ff8000'), 'none')
  assert.equal(briToGlow(128, null), 'none')
})

test('wledColorToHex converts array to hex', () => {
  assert.equal(wledColorToHex([255, 128, 0]), '#ff8000')
  assert.equal(wledColorToHex([]), '#000000')
  assert.equal(wledColorToHex(null), '#000000')
})

test('brightness conversion preserves hardware baseline', () => {
  assert.equal(wledBriToPct(0), 0)
  assert.equal(wledBriToPct(255), 100)
  assert.equal(pctToWledBri(0), 0)
  assert.equal(pctToWledBri(100), 255)
})
