/**
 * Firmware version utilities for WLED and WLEDashboard.
 */

/**
 * Compares two semver-like version strings (e.g. '0.15.0' vs '0.15.1', or '0.15.1' vs '16.0.1').
 * Returns true if currentVer is strictly behind targetVer.
 */
export function isVersionBehind(currentVer, targetVer) {
  if (!currentVer || !targetVer) return false

  const cleanCurrent = String(currentVer).trim().replace(/^v/i, '')
  const cleanTarget = String(targetVer).trim().replace(/^v/i, '')

  if (cleanCurrent === cleanTarget) return false

  const parseParts = (v) => {
    const main = v.split(/[-+]/)[0]
    return main.split('.').map(n => parseInt(n, 10) || 0)
  }

  const cParts = parseParts(cleanCurrent)
  const tParts = parseParts(cleanTarget)

  for (let i = 0; i < Math.max(cParts.length, tParts.length); i++) {
    const c = cParts[i] ?? 0
    const t = tParts[i] ?? 0
    if (c < t) return true
    if (c > t) return false
  }

  return false
}

/**
 * Resolves the effective latest firmware version across GitHub and the fleet.
 * Accepts arguments in either order: (devices, latestFirmwareVersion) or (latestFirmwareVersion, devices).
 */
export function getEffectiveLatestVersion(arg1, arg2) {
  const latestFirmwareVersion = typeof arg1 === 'string' ? arg1 : typeof arg2 === 'string' ? arg2 : null
  const devices = Array.isArray(arg1) ? arg1 : Array.isArray(arg2) ? arg2 : []

  if (latestFirmwareVersion) {
    return String(latestFirmwareVersion).trim().replace(/^v/i, '')
  }

  const deviceVers = devices
    .map(d => d.firmware_ver || d.liveState?.info?.ver)
    .filter(Boolean)
    .map(v => String(v).trim().replace(/^v/i, ''))

  if (deviceVers.length === 0) return null

  // Sort descending to find the highest known version in the fleet
  deviceVers.sort((a, b) => (isVersionBehind(a, b) ? 1 : isVersionBehind(b, a) ? -1 : 0))
  return deviceVers[0]
}

/**
 * Returns true if a device's firmware is behind the latest version.
 */
export function isDeviceFirmwareOutdated(device, latestVersion) {
  if (!device) return false
  const currentVer = device.firmware_ver || device.liveState?.info?.ver
  if (!currentVer) return false
  if (!latestVersion) return false
  return isVersionBehind(currentVer, latestVersion)
}
