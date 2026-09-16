import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '../../stores/uiStore.js'
import styles from './IpChip.module.css'

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const input = document.createElement('input')
    input.value = text
    input.style.position = 'fixed'
    input.style.opacity = '0'
    document.body.appendChild(input)
    input.focus()
    input.select()
    const result = document.execCommand('copy')
    document.body.removeChild(input)
    return result
  } catch {
    return false
  }
}

function CaretIcon() {
  return (
    <svg className={styles.ipCaret} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/**
 * IpChip
 * Interactive IP address chip that honors user preferences:
 * - 'menu': opens floating portaled action popover
 * - 'open': opens controller web interface directly in new tab
 * - 'copy': copies IP address to clipboard
 * Also supports Ctrl/Cmd click or middle click to always open in new tab.
 */
export function IpChip({ ip, className = '', compact = false, align = 'auto', disabled = false }) {
  const deviceIpClickAction = useUIStore(s => s.deviceIpClickAction ?? 'menu')
  const addToast = useUIStore(s => s.addToast)

  const [showMenu, setShowMenu] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, transform: 'none' })

  const btnRef = useRef(null)
  const menuRef = useRef(null)

  const handleOpenInNewTab = useCallback((e) => {
    if (disabled) return
    if (e && e.stopPropagation) e.stopPropagation()
    setShowMenu(false)
    window.open(`http://${ip}`, '_blank', 'noopener,noreferrer')
  }, [disabled, ip])

  const handleCopyIP = useCallback(async (e) => {
    if (disabled) return
    if (e && e.stopPropagation) e.stopPropagation()
    setShowMenu(false)
    const success = await copyToClipboard(ip)
    if (success) {
      addToast({ message: `Copied ${ip}`, type: 'info', duration: 2000 })
    } else {
      addToast({ message: `Failed to copy ${ip}`, type: 'error', duration: 3000 })
    }
  }, [disabled, ip, addToast])

  const handleClick = useCallback((e) => {
    if (disabled) return
    if (e && e.stopPropagation) e.stopPropagation()

    // Modifier keys (Cmd, Ctrl, Shift) or middle click always open in new tab
    if (e.metaKey || e.ctrlKey || e.button === 1) {
      handleOpenInNewTab(e)
      return
    }

    if (deviceIpClickAction === 'open') {
      handleOpenInNewTab(e)
    } else if (deviceIpClickAction === 'copy') {
      handleCopyIP(e)
    } else {
      // Menu mode
      if (showMenu) {
        setShowMenu(false)
      } else {
        const rect = e.currentTarget.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const openUpward = spaceBelow < 90 && rect.top > 90

        let top = openUpward ? rect.top - 4 : rect.bottom + 4
        let translateY = openUpward ? '-100%' : '0%'

        const isRightAligned = align === 'right' || (align === 'auto' && rect.right > window.innerWidth - 180)
        let left = isRightAligned ? rect.right : rect.left
        let translateX = isRightAligned ? '-100%' : '0%'

        setPos({
          top,
          left,
          transform: `translate(${translateX}, ${translateY})`,
        })
        setShowMenu(true)
      }
    }
  }, [disabled, deviceIpClickAction, showMenu, align, handleOpenInNewTab, handleCopyIP])

  useEffect(() => {
    if (!showMenu) return

    const handleOutside = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setShowMenu(false)
      }
    }

    const handleKey = (e) => {
      if (e.key === 'Escape') setShowMenu(false)
    }

    const handleDismiss = () => setShowMenu(false)

    document.addEventListener('pointerdown', handleOutside)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleDismiss, true)
    window.addEventListener('resize', handleDismiss)

    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleDismiss, true)
      window.removeEventListener('resize', handleDismiss)
    }
  }, [showMenu])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        className={[
          styles.ipChip,
          compact && styles.compact,
          showMenu && styles.ipChipActive,
          disabled && styles.disabled,
          className,
        ].filter(Boolean).join(' ')}
        onClick={handleClick}
        title={
          disabled
            ? `${ip} (Device unreachable)`
            : deviceIpClickAction === 'open'
            ? `Open http://${ip} (configured in Settings)`
            : deviceIpClickAction === 'copy'
            ? `Copy ${ip} (configured in Settings)`
            : `Click for actions for ${ip}`
        }
        aria-haspopup="menu"
        aria-expanded={showMenu}
        aria-disabled={disabled}
      >
        <span>{ip}</span>
        {deviceIpClickAction === 'menu' && !disabled && <CaretIcon />}
      </button>

      {showMenu && createPortal(
        <div
          ref={menuRef}
          className={styles.popover}
          style={{
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            transform: pos.transform,
          }}
          role="menu"
          aria-label={`Actions for ${ip}`}
        >
          <button
            type="button"
            className={styles.popoverItem}
            onClick={handleOpenInNewTab}
            role="menuitem"
          >
            <ExternalLinkIcon />
            <span>Open in New Tab</span>
          </button>
          <button
            type="button"
            className={styles.popoverItem}
            onClick={handleCopyIP}
            role="menuitem"
          >
            <CopyIcon />
            <span>Copy IP Address</span>
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
