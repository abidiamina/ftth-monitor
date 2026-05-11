/**
 * Utilities for processing and normalizing intervention data (signatures, photos).
 */

/**
 * Normalizes photo data strings.
 * If the string is a raw base64 string, adds the data:image/jpeg;base64 prefix.
 * If the string is a URL or already has a prefix, returns it as is.
 */
export const normalizePhotoData = (data?: string | null): string => {
  if (!data) return ''
  
  // If it's already a data URL or a full web URL, return it
  if (data.startsWith('data:') || data.startsWith('http')) {
    return data
  }
  
  // Check for relative URL paths (e.g. /api/uploads/...) but NOT raw base64
  // JPEG base64 starts with /9j/ so we must not treat that as a path
  if (data.startsWith('/') && !data.startsWith('/9j')) {
    return data
  }
  
  // Otherwise assume it's a raw base64 string (typical of Expo ImagePicker on certain configs)
  return `data:image/jpeg;base64,${data}`
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
