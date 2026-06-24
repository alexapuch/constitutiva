import { APP_VERSION } from './version';

// Caches template images as JPEG base64 in memory so subsequent PDF generations are instant.
const jpegCache = new Map<string, string>();
const pendingCache = new Map<string, Promise<string>>();

export const getCachedJpeg = (url: string): Promise<string> => {
  const cacheKey = url.split('?')[0];
  if (jpegCache.has(cacheKey)) return Promise.resolve(jpegCache.get(cacheKey)!);
  if (pendingCache.has(cacheKey)) return pendingCache.get(cacheKey)!;

  const fetchUrl = `${cacheKey}?v=${APP_VERSION}`;

  const promise = fetch(fetchUrl)
    .then(res => {
      if (!res.ok) throw new Error(`No se encontró la imagen ${url}`);
      return res.blob();
    })
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }))
    .then(imgData => new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        const jpeg = canvas.toDataURL('image/jpeg', 0.88);
        jpegCache.set(cacheKey, jpeg);
        pendingCache.delete(cacheKey);
        resolve(jpeg);
      };
      img.src = imgData;
    }));

  pendingCache.set(cacheKey, promise);
  return promise;
};

// Preload a list of template URLs so they are ready before the user taps download.
export const preloadTemplates = (urls: string[]): void => {
  urls.forEach(url => { getCachedJpeg(url).catch(() => {}); });
};
