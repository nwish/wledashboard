import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './InstallAppModal.module.css'

export function InstallAppModal({
  isOpen,
  onClose,
  platform,
  canPromptNative,
  onPromptNative,
}) {
  const navigate = useNavigate()
  const [installing, setInstalling] = useState(false)

  if (!isOpen) return null

  const handleNativeClick = async () => {
    setInstalling(true)
    try {
      const accepted = await onPromptNative?.()
      if (accepted) {
        onClose()
      }
    } finally {
      setInstalling(false)
    }
  }

  const handleOpenGuide = () => {
    onClose()
    navigate('/guides?topic=mobile-pwa-install')
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <div className={styles.iconBadge} aria-hidden="true">
              <DownloadAppIcon />
            </div>
            <div>
              <h2 id="modal-title" className={styles.title}>Install WLEDashboard</h2>
              <p className={styles.subtitle}>Add to your home screen for full-screen native control</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.body}>
          {/* iOS Instructions */}
          {platform === 'ios' && (
            <div className={styles.section}>
              <div className={styles.platformBadge}>
                <AppleIcon />
                <span>Apple iOS (Safari)</span>
              </div>
              <ol className={styles.stepsList}>
                <li className={styles.stepItem}>
                  <span className={styles.stepNum}>1</span>
                  <span>Tap the <strong>Share</strong> button in Safari toolbar</span>
                </li>
                <li className={styles.stepItem}>
                  <span className={styles.stepNum}>2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong></span>
                </li>
                <li className={styles.stepItem}>
                  <span className={styles.stepNum}>3</span>
                  <span>Tap <strong>Add</strong> in the top right to complete</span>
                </li>
              </ol>
            </div>
          )}

          {/* Android Instructions */}
          {platform === 'android' && (
            <div className={styles.section}>
              <div className={styles.platformBadge}>
                <AndroidIcon />
                <span>Android (Chrome / Edge)</span>
              </div>
              {canPromptNative ? (
                <div className={styles.directInstallBox}>
                  <p className={styles.directInstallText}>
                    WLEDashboard is ready to install directly to your device.
                  </p>
                  <button
                    type="button"
                    className={styles.installPrimaryBtn}
                    onClick={handleNativeClick}
                    disabled={installing}
                  >
                    <DownloadIcon />
                    {installing ? 'Installing...' : 'Install to Home Screen'}
                  </button>
                </div>
              ) : (
                <ol className={styles.stepsList}>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNum}>1</span>
                    <span>Tap the <strong>three dots menu</strong> (top right in Chrome)</span>
                  </li>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNum}>2</span>
                    <span>Select <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
                  </li>
                  <li className={styles.stepItem}>
                    <span className={styles.stepNum}>3</span>
                    <span>Confirm installation in the system dialog</span>
                  </li>
                </ol>
              )}
            </div>
          )}

          {/* Other Mobile Platform */}
          {platform !== 'ios' && platform !== 'android' && (
            <div className={styles.section}>
              <div className={styles.platformBadge}>
                <DeviceIcon />
                <span>Mobile Device</span>
              </div>
              <p className={styles.generalText}>
                Open your mobile browser menu and select <strong>Add to Home screen</strong> or <strong>Install App</strong> to run WLEDashboard in standalone mode.
              </p>
            </div>
          )}

          {/* User Review Documentation Callout */}
          <div className={styles.guideCallout}>
            <div className={styles.guideCalloutHeader}>
              <DocIcon />
              <span className={styles.guideCalloutTitle}>Setup & Documentation</span>
            </div>
            <p className={styles.guideCalloutText}>
              Review our detailed mobile guide for step-by-step walkthroughs, local network routing tips, and reverse proxy SSL setup.
            </p>
            <button
              type="button"
              className={styles.guideCalloutBtn}
              onClick={handleOpenGuide}
            >
              <span>View Mobile App Guide</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.dismissBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadAppIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="5" y="2" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 6v7m0 0l-2.5-2.5M11 13l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="17" r="1" fill="currentColor" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.88c.59-.71.99-1.7.88-2.7-.85.04-1.89.57-2.5 1.28-.54.63-.98 1.63-.86 2.61.95.07 1.91-.49 2.48-1.19z" fill="currentColor" />
    </svg>
  )
}

function AndroidIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v6c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-6C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v6c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-6c0-.83-.67-1.5-1.5-1.5zm-4.97-4.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.68 2.23 12.61 2 11.5 2c-1.11 0-2.18.23-3.14.63L6.88 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.3 1.3C5.77 4.29 4.67 6 4.5 8h14c-.17-2-1.27-3.71-2.97-4.84zM9 5.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm5 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z" fill="currentColor" />
    </svg>
  )
}

function DeviceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="18" x2="13" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2.5C3 1.67 3.67 1 4.5 1H9l4 4v8.5c0 .83-.67 1.5-1.5 1.5h-7C3.67 15 3 14.33 3 13.5v-11z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="5.5" y1="8" x2="10.5" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="5.5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
