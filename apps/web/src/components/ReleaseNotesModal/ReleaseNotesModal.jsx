import { useEffect, useMemo } from 'react'
import { sanitizeMarkdown, isBinaryLink } from '../../lib/releaseNotes.js'
import styles from './ReleaseNotesModal.module.css'

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

/**
 * Parses markdown inline text with bold, code, and links,
 * strictly excluding any links pointing to .bin files.
 */
function renderInline(text, keyPrefix) {
  const tokens = []
  let remaining = text
  let index = 0

  while (remaining.length > 0) {
    // 1. Code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      tokens.push(<code key={`${keyPrefix}-code-${index++}`}>{codeMatch[1]}</code>)
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // 2. Bold: **bold**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      tokens.push(<strong key={`${keyPrefix}-bold-${index++}`}>{boldMatch[1]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // 3. Link: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const label = linkMatch[1]
      const href = linkMatch[2]

      // Filter out links pointing to .bin firmware files or raw downloads
      if (isBinaryLink(href)) {
        tokens.push(<span key={`${keyPrefix}-txt-${index++}`}>{label}</span>)
      } else {
        tokens.push(
          <a
            key={`${keyPrefix}-link-${index++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>
        )
      }
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // 4. Plain text up to next special character
    const nextSpecial = remaining.search(/[`*[]/)
    if (nextSpecial === -1) {
      tokens.push(remaining)
      break
    } else if (nextSpecial === 0) {
      tokens.push(remaining[0])
      remaining = remaining.slice(1)
    } else {
      tokens.push(remaining.slice(0, nextSpecial))
      remaining = remaining.slice(nextSpecial)
    }
  }

  return tokens
}

export function ReleaseNotesModal({ releaseInfo, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const parsedElements = useMemo(() => {
    if (!releaseInfo?.body) return null

    const cleanText = sanitizeMarkdown(releaseInfo.body)
    const lines = cleanText.split('\n')
    const elements = []
    let currentList = []
    let listKeyIndex = 0

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(<ul key={`list-${listKeyIndex++}`}>{currentList}</ul>)
        currentList = []
      }
    }

    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (!trimmed) {
        flushList()
        return
      }

      // Headers
      if (trimmed.startsWith('#### ')) {
        flushList()
        elements.push(<h4 key={`h4-${idx}`}>{renderInline(trimmed.slice(5), `h4-${idx}`)}</h4>)
      } else if (trimmed.startsWith('### ')) {
        flushList()
        elements.push(<h3 key={`h3-${idx}`}>{renderInline(trimmed.slice(4), `h3-${idx}`)}</h3>)
      } else if (trimmed.startsWith('## ')) {
        flushList()
        elements.push(<h2 key={`h2-${idx}`}>{renderInline(trimmed.slice(3), `h2-${idx}`)}</h2>)
      } else if (trimmed.startsWith('# ')) {
        flushList()
        elements.push(<h1 key={`h1-${idx}`}>{renderInline(trimmed.slice(2), `h1-${idx}`)}</h1>)
      } else if (/^[-*]\s+/.test(trimmed)) {
        // List item
        const text = trimmed.replace(/^[-*]\s+/, '')
        currentList.push(<li key={`li-${idx}`}>{renderInline(text, `li-${idx}`)}</li>)
      } else {
        // Regular paragraph
        flushList()
        elements.push(<p key={`p-${idx}`}>{renderInline(trimmed, `p-${idx}`)}</p>)
      }
    })

    flushList()
    return elements
  }, [releaseInfo?.body])

  if (!releaseInfo) return null

  const formattedDate = releaseInfo.publishedAt
    ? new Date(releaseInfo.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <h2 className={styles.title}>{releaseInfo.name || `WLED v${releaseInfo.tagName}`}</h2>
            <div className={styles.subtitle}>
              <span className={styles.versionBadge}>v{releaseInfo.tagName}</span>
              {formattedDate && <span>Released {formattedDate}</span>}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close release notes">
            <CloseIcon />
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.noticeBox}>
            Release notes for upstream WLED. In-place OTA firmware updates from the dashboard will be available in an upcoming release.
          </div>
          {parsedElements || <p>No release notes provided for this version.</p>}
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerNote}>
            Source: GitHub Releases (wled/WLED)
          </span>
          <div className={styles.footerActions}>
            {releaseInfo.htmlUrl && (
              <a
                href={releaseInfo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryBtn}
              >
                <span>View on GitHub</span>
                <ExternalLinkIcon />
              </a>
            )}
            <button className={styles.primaryBtn} onClick={onClose}>
              Done
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
