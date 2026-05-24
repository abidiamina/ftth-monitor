/**
 * Utilities for processing and normalizing intervention data (signatures, photos).
 */

/**
 * Normalizes photo data strings.
 * If the string is a raw base64 string, adds the data:image/jpeg;base64 prefix.
 * If the string is a URL or already has a prefix, returns it as is.
 */
export const normalizePhotoData = (data?: string | null): string => {
  const raw = String(data || '').trim()
  if (!raw) return ''

  // Already usable URLs
  if (raw.startsWith('data:image/')) return raw
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw

  // Relative API/file path (but avoid confusing raw base64 that can start with /9j)
  if (raw.startsWith('/') && !raw.startsWith('/9j')) return raw

  // Basic base64 cleanup and validation
  const base64 = raw.replace(/\s+/g, '')
  const looksBase64 = /^[A-Za-z0-9+/=]+$/.test(base64)
  if (!looksBase64 || base64.length < 32) return ''

  return `data:image/jpeg;base64,${base64}`
}
 
export const parseSignatureToPath = (signature?: string | null): string => {
  if (!signature || !signature.startsWith('DRAWN_SIGNATURE:')) {
    return ''
  }

  const coords = signature.replace('DRAWN_SIGNATURE:', '').split(';')
  if (coords.length < 2) return ''

  return coords
    .map((pair, index) => {
      const [x, y] = pair.split(',')
      if (!x || !y) return ''
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')
}
