/**
 * Release notes markdown sanitization and processing utilities.
 * Ensures upstream firmware release notes do not contain raw binary links
 * or asset download tables.
 */

/**
 * Sanitizes markdown by stripping asset tables and .bin links.
 */
export function sanitizeMarkdown(rawBody = '') {
  const lines = rawBody.split('\n')
  const sanitized = []
  let inAssetsSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect beginning of Assets or Downloads section
    if (/^#{1,4}\s+(Assets|Downloads|Binaries)/i.test(trimmed)) {
      inAssetsSection = true
      continue
    }

    // Detect end of Assets section if another header appears
    if (inAssetsSection && /^#{1,4}\s+/.test(trimmed)) {
      inAssetsSection = false
    }

    if (inAssetsSection) continue

    // Skip lines that are purely .bin file downloads or checksums
    if (/\.bin\b/i.test(trimmed) && (/https?:\/\//i.test(trimmed) || /^\s*[-*]\s+/i.test(trimmed))) {
      continue
    }

    sanitized.push(line)
  }

  return sanitized.join('\n')
}

/**
 * Strips or replaces .bin links from inline markdown tokens.
 */
export function isBinaryLink(href = '') {
  return /\.bin(\?.*)?$/i.test(href) || href.toLowerCase().includes('/download/')
}
