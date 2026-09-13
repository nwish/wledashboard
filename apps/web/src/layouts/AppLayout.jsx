import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar/Sidebar.jsx'
import { MobileNav } from '../components/MobileNav/MobileNav.jsx'
import { InstallAppModal } from '../components/InstallAppModal/InstallAppModal.jsx'
import { ToastContainer } from '../components/Toast/Toast.jsx'
import { SpotifyPlayer } from '../components/SpotifyPlayer/SpotifyPlayer.jsx'
import { useUIStore } from '../stores/uiStore.js'
import { useDeviceWebSocket } from '../hooks/useDeviceWebSocket.js'
import { usePWAInstall } from '../hooks/usePWAInstall.js'
import styles from './AppLayout.module.css'

export function AppLayout() {
  useDeviceWebSocket()

  const headerAccentColor = useUIStore(s => s.headerAccentColor)
  const {
    showInstallButton,
    canPromptNative,
    platform,
    isModalOpen,
    openModal,
    closeModal,
    promptNativeInstall,
  } = usePWAInstall()

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.content}>
        {/* Mobile Navigation & Install Bar: only rendered on mobile */}
        <MobileNav
          showInstallButton={showInstallButton}
          onOpenInstall={openModal}
        />
        <div
          className={styles.accentBar}
          style={{
            background: headerAccentColor
              ? `linear-gradient(to right, transparent, ${headerAccentColor}88, transparent)`
              : 'transparent',
          }}
          aria-hidden
        />
        <Outlet />
      </div>
      <SpotifyPlayer />
      <ToastContainer />
      <InstallAppModal
        isOpen={isModalOpen}
        onClose={closeModal}
        platform={platform}
        canPromptNative={canPromptNative}
        onPromptNative={promptNativeInstall}
      />
    </div>
  )
}
