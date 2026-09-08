/**
 * Client-side image compression.
 *
 * Images are shrunk and re-encoded fully inside the browser and stored as a
 * compact data URL in the database — no external upload service, no extra
 * credit or storage cost. Aspect ratio is preserved.
 */

const DEFAULTS = { maxSize: 640, quality: 0.7 };

let webpSupport;
function supportsWebp() {
  if (webpSupport !== undefined) return webpSupport;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

/** Compress a data URL (or any loadable image src) to a small data URL. */
export function compressImage(src, options = {}) {
  const { maxSize, quality } = { ...DEFAULTS, ...options };
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string') return resolve(src);
    if (!src.startsWith('data:') && !src.startsWith('blob:')) return resolve(src);

    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (!width || !height) return resolve(src);
        const ratio = Math.min(1, maxSize / Math.max(width, height));
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const type = supportsWebp() ? 'image/webp' : 'image/jpeg';
        const out = canvas.toDataURL(type, quality);
        // Never return something bigger than the original.
        resolve(out && out.length < src.length ? out : src);
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/** Read a File/Blob and return a compressed data URL. */
export function compressFile(file, options) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = (e) => compressImage(e.target.result, options).then(resolve);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default compressImage;
