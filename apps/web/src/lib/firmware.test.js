import test from 'node:test'
import assert from 'node:assert/strict'
import { isVersionBehind, getEffectiveLatestVersion, isDeviceFirmwareOutdated } from './firmware.js'

test('isVersionBehind correctly compares semantic versions', () => {
  assert.equal(isVersionBehind('0.14.0', '0.15.0'), true)
  assert.equal(isVersionBehind('0.14.4', '0.14.4'), false)
  assert.equal(isVersionBehind('0.15.0', '0.14.0'), false)
  assert.equal(isVersionBehind('v0.14.0', '0.15.0'), true)
  assert.equal(isVersionBehind('0.14.0', 'v0.15.0'), true)
  assert.equal(isVersionBehind('0.14.0-b1', '0.14.0'), false)
  assert.equal(isVersionBehind('', '0.15.0'), false)
  assert.equal(isVersionBehind('0.14.0', null), false)
})

test('getEffectiveLatestVersion resolves versions correctly with swapped arguments', () => {
  const devices = [
    { id: '1', firmware_ver: '0.14.0' },
    { id: '2', firmware_ver: '0.14.4' },
  ]

  // Swapped order (devices, latestFirmware)
  assert.equal(getEffectiveLatestVersion(devices, '0.15.0'), '0.15.0')
  // Standard order (latestFirmware, devices)
  assert.equal(getEffectiveLatestVersion('0.15.0', devices), '0.15.0')
  // Strip 'v' prefix
  assert.equal(getEffectiveLatestVersion('v0.15.1', devices), '0.15.1')
  // Fallback to highest device version when no remote version provided
  assert.equal(getEffectiveLatestVersion(devices, null), '0.14.4')
  assert.equal(getEffectiveLatestVersion([], null), null)
})

test('isDeviceFirmwareOutdated flags older versions when effective version is newer', () => {
  assert.equal(isDeviceFirmwareOutdated({ firmware_ver: '0.14.0' }, '0.15.0'), true)
  assert.equal(isDeviceFirmwareOutdated({ firmware_ver: '0.15.0' }, '0.15.0'), false)
  assert.equal(isDeviceFirmwareOutdated({ firmware_ver: '0.15.1' }, '0.15.0'), false)
  assert.equal(isDeviceFirmwareOutdated(null, '0.15.0'), false)
  assert.equal(isDeviceFirmwareOutdated({ firmware_ver: '0.14.0' }, null), false)
})
