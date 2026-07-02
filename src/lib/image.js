// Downscale + re-encode a picked photo before we store it, so we upload/keep a
// ~200 KB JPEG instead of the 3–6 MB original a phone camera produces. This is
// the single biggest load-time win: the Dashboard/list thumbnails would
// otherwise download multi-megabyte images to render them at 64px.
//
// Runs entirely in the browser on a canvas. It's defensive: anything that isn't
// a compressible image, or any decode/encode failure, falls back to the
// original file untouched.

const MAX_DIM = 1280 // longest edge; plenty for a full-screen detail view
const QUALITY = 0.82 // JPEG quality — visually indistinguishable, big size drop
const SKIP_UNDER = 300 * 1024 // don't bother re-encoding already-small files

export async function compressImage(file, { maxDim = MAX_DIM, quality = QUALITY } = {}) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) return file
  // GIFs would lose animation; already-tiny files aren't worth the work.
  if (file.type === 'image/gif' || file.size <= SKIP_UNDER) return file

  try {
    const img = await loadImage(file)
    const srcW = img.width || img.naturalWidth
    const srcH = img.height || img.naturalHeight
    if (!srcW || !srcH) return file

    const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
    const w = Math.max(1, Math.round(srcW * scale))
    const h = Math.max(1, Math.round(srcH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    img.close?.() // release ImageBitmap memory if we used one

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    // If re-encoding didn't actually shrink it, keep the original.
    if (!blob || blob.size >= file.size) return file

    const base = (file.name || 'photo').replace(/\.[^.]+$/, '')
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

// Decode a File into something drawable. Prefer createImageBitmap (fast, off the
// main thread) with EXIF orientation applied; fall back to an <img> element,
// which modern browsers also auto-orient when drawn to a canvas.
async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to the <img> path
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
