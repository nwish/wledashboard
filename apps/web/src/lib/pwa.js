/**
 * PWA and Mobile Environment Utilities
 * Used for dynamic Add to Home Screen (A2HS) detection and platform-specific instructions.
 */

export function isStandaloneApp({
  displayModeStandalone = false,
  navigatorStandalone = false,
  referrer = '',
} = {}) {
  if (displayModeStandalone) return true
  if (navigatorStandalone) return true
  if (typeof referrer === 'string' && referrer.includes('android-app://')) return true
  return false
}

export function isMobileDevice({
  userAgent = '',
  coarsePointer = false,
  innerWidth = 1024,
} = {}) {
  const ua = userAgent.toLowerCase()
  const mobileUAPattern = /android|iphone|ipad|ipod|mobile|silk|kindle|blackberry|opera mini|iemobile/
  const isMobileUA = mobileUAPattern.test(ua)
  const isNarrowTouch = coarsePointer && innerWidth <= 820

  return isMobileUA || isNarrowTouch
}

export function getMobilePlatform({
  userAgent = '',
  maxTouchPoints = 0,
  platform = '',
} = {}) {
  const ua = userAgent.toLowerCase()
  const plat = platform.toLowerCase()

  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (plat.includes('mac') && maxTouchPoints > 1)

  if (isIOS) return 'ios'

  const isAndroid = /android/.test(ua)
  if (isAndroid) return 'android'

  return 'other'
}
