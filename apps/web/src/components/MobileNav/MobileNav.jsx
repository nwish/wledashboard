import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LogoMark } from '../Logo/LogoMark.jsx'
import styles from './MobileNav.module.css'

const MOBILE_NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',      icon: DashIcon },
  { to: '/spatial',    label: 'Spatial View',   icon: SpatialIcon },
  { to: '/groups',     label: 'Groups',         icon: GroupsIcon },
  { to: '/automation', label: 'Automation',     icon: AutoIcon },
  { to: '/studio',     label: 'Studio',         icon: StudioIcon },
  { to: '/devices',    label: 'Device Manager', icon: DevicesIcon },
  { to: '/guides',     label: 'Guides & Docs',  icon: GuidesIcon },
  { to: '/settings',   label: 'Settings',       icon: SettingsIcon },
]

export function MobileNav({ showInstallButton, onOpenInstall }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => setMenuOpen(prev => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={styles.mobileNav} aria-label="Mobile navigation header">
      <div className={styles.bar}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          <span className={styles.logo} aria-hidden>
            <LogoMark />
          </span>
          <span className={styles.wordmark}>
            WLED<strong>ashboard</strong><span className={styles.tld}>.com</span>
          </span>
        </Link>

        <div className={styles.actions}>
          {/* Mobile Install Button: dynamically hidden on desktop */}
          {showInstallButton && (
            <button
              type="button"
              className={styles.installBtn}
              onClick={onOpenInstall}
              title="Install WLEDashboard as mobile app"
              aria-label="Install WLEDashboard app"
            >
              <DownloadIcon />
              <span>Install</span>
            </button>
          )}

          <button
            type="button"
            className={styles.menuToggleBtn}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className={styles.drawerOverlay} onClick={closeMenu}>
          <nav
            className={styles.drawer}
            onClick={e => e.stopPropagation()}
            aria-label="Mobile menu"
          >
            <ul className={styles.drawerList} role="list">
              {MOBILE_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      [styles.drawerItem, isActive && styles.activeDrawerItem]
                        .filter(Boolean)
                        .join(' ')
                    }
                    onClick={closeMenu}
                  >
                    <span className={styles.drawerIcon} aria-hidden><Icon /></span>
                    <span className={styles.drawerLabel}>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>

            {showInstallButton && (
              <div className={styles.drawerFooter}>
                <button
                  type="button"
                  className={styles.drawerInstallBtn}
                  onClick={() => {
                    closeMenu()
                    onOpenInstall()
                  }}
                >
                  <DownloadIcon />
                  <span>Install App to Home Screen</span>
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="3" y1="5" x2="17" y2="5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="3" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <line x1="3" y1="15" x2="17" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4.5 4.5L13.5 13.5M4.5 13.5L13.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8m0 0l-3-3m3 3l3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="1" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="1" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function SpatialIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2L16 6V12L9 16L2 12V6L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="9" y1="2" x2="9" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function GroupsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="4" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="1" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="6" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 9h1M11 9h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="3" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="2" r="1.5" fill="currentColor" />
    </svg>
  )
}

function StudioIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M13.5 2.5a2.121 2.121 0 0 1 3 3L13 9l-3-3 3.5-3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 6l-5 5c-1.5 1.5-3.5 1.5-3.5 1.5s0-2 1.5-3.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function DevicesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="4" y="4" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="6" x2="4" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="9" x2="4" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function GuidesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 3.5C2 2.67 2.67 2 3.5 2H7.5C8.33 2 9 2.67 9 3.5V15C9 14.17 8.33 13.5 7.5 13.5H3.5C2.67 13.5 2 14.17 2 15V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16 3.5C16 2.67 15.33 2 14.5 2H10.5C9.67 2 9 2.67 9 3.5V15C9 14.17 9.67 13.5 10.5 13.5H14.5C15.33 13.5 16 14.17 16 15V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
