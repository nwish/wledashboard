import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { isStandaloneApp, isMobileDevice, getMobilePlatform } from '../lib/pwa.js'

let globalDeferredPrompt = null
const promptSubscribers = new Set()

function notifyPromptSubscribers() {
  promptSubscribers.forEach(cb => cb())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar or auto prompt
    e.preventDefault()
    globalDeferredPrompt = e
    notifyPromptSubscribers()
  })

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null
    notifyPromptSubscribers()
  })
}

function subscribeToPrompt(callback) {
  promptSubscribers.add(callback)
  return () => promptSubscribers.delete(callback)
}

function getPromptSnapshot() {
  return globalDeferredPrompt
}

export function usePWAInstall() {
  const deferredPrompt = useSyncExternalStore(
    subscribeToPrompt,
    getPromptSnapshot,
    () => null
  )

  const [env, setEnv] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isStandalone: false, platform: 'other' }
    }
    const standalone = isStandaloneApp({
      displayModeStandalone: window.matchMedia?.('(display-mode: standalone)').matches,
      navigatorStandalone: window.navigator?.standalone,
      referrer: document.referrer,
    })
    const mobile = isMobileDevice({
      userAgent: window.navigator?.userAgent || '',
      coarsePointer: window.matchMedia?.('(pointer: coarse)').matches,
      innerWidth: window.innerWidth,
    })
    const plat = getMobilePlatform({
      userAgent: window.navigator?.userAgent || '',
      maxTouchPoints: window.navigator?.maxTouchPoints || 0,
      platform: window.navigator?.platform || '',
    })
    return { isMobile: mobile, isStandalone: standalone, platform: plat }
  })

  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const evaluate = () => {
      const standalone = isStandaloneApp({
        displayModeStandalone: window.matchMedia?.('(display-mode: standalone)').matches,
        navigatorStandalone: window.navigator?.standalone,
        referrer: document.referrer,
      })
      const mobile = isMobileDevice({
        userAgent: window.navigator?.userAgent || '',
        coarsePointer: window.matchMedia?.('(pointer: coarse)').matches,
        innerWidth: window.innerWidth,
      })
      const plat = getMobilePlatform({
        userAgent: window.navigator?.userAgent || '',
        maxTouchPoints: window.navigator?.maxTouchPoints || 0,
        platform: window.navigator?.platform || '',
      })
      setEnv({ isMobile: mobile, isStandalone: standalone, platform: plat })
    }

    evaluate()
    window.addEventListener('resize', evaluate)
    return () => window.removeEventListener('resize', evaluate)
  }, [])

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const promptNativeInstall = useCallback(async () => {
    if (!globalDeferredPrompt) return null
    const prompt = globalDeferredPrompt
    prompt.prompt()
    const choice = await prompt.userChoice
    globalDeferredPrompt = null
    notifyPromptSubscribers()
    return choice?.outcome === 'accepted'
  }, [])

  // Never show on desktop computer or if already installed in standalone mode
  const showInstallButton = env.isMobile && !env.isStandalone

  return {
    isMobile: env.isMobile,
    isStandalone: env.isStandalone,
    showInstallButton,
    canPromptNative: Boolean(deferredPrompt),
    platform: env.platform,
    isModalOpen,
    openModal,
    closeModal,
    promptNativeInstall,
  }
}
