import test from 'node:test'
import assert from 'node:assert/strict'
import { isStandaloneApp, isMobileDevice, getMobilePlatform } from './pwa.js'

test('isStandaloneApp detects standalone display mode or standalone navigator', () => {
  assert.equal(isStandaloneApp({ displayModeStandalone: true }), true)
  assert.equal(isStandaloneApp({ navigatorStandalone: true }), true)
  assert.equal(isStandaloneApp({ referrer: 'android-app://com.google.android.apps.chrome' }), true)
  assert.equal(isStandaloneApp({ displayModeStandalone: false, navigatorStandalone: false, referrer: '' }), false)
})

test('isMobileDevice distinguishes desktop from mobile devices', () => {
  // Desktop browser (Windows Chrome, fine pointer, 1440px wide)
  assert.equal(
    isMobileDevice({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      coarsePointer: false,
      innerWidth: 1440,
    }),
    false
  )

  // Desktop browser (macOS Safari, fine pointer, 1280px wide)
  assert.equal(
    isMobileDevice({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      coarsePointer: false,
      innerWidth: 1280,
    }),
    false
  )

  // iPhone Safari
  assert.equal(
    isMobileDevice({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      coarsePointer: true,
      innerWidth: 390,
    }),
    true
  )

  // Android Chrome
  assert.equal(
    isMobileDevice({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
      coarsePointer: true,
      innerWidth: 412,
    }),
    true
  )

  // Generic narrow touch screen
  assert.equal(
    isMobileDevice({
      userAgent: 'Custom Browser',
      coarsePointer: true,
      innerWidth: 600,
    }),
    true
  )
})

test('getMobilePlatform identifies iOS, Android, and other', () => {
  assert.equal(
    getMobilePlatform({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    }),
    'ios'
  )

  // iPad on iPadOS reporting MacIntel with touch points
  assert.equal(
    getMobilePlatform({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }),
    'ios'
  )

  // Android
  assert.equal(
    getMobilePlatform({
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
    }),
    'android'
  )

  // Desktop Linux / Windows
  assert.equal(
    getMobilePlatform({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      platform: 'Win32',
      maxTouchPoints: 0,
    }),
    'other'
  )
})
