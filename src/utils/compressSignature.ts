/**
 * Compresses a signature data URL by drawing it on a smaller canvas
 * and exporting as JPEG with reduced quality.
 * This dramatically reduces PDF file size (from ~300KB per signature to ~5KB).
 */
export function compressSignature(dataUrl: string, maxWidth = 200, quality = 0.5): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = Math.min(maxWidth / img.width, 1);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d')!;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl); // fallback to original
        img.src = dataUrl;
    });
}

/**
 * Synchronous version: compresses directly from a canvas element,
 * skipping the async PNG→Image loading step.
 */
export function compressSignatureFromCanvas(sourceCanvas: HTMLCanvasElement, maxWidth = 300, quality = 0.6): string {
    const ratio = Math.min(maxWidth / sourceCanvas.width, 1);
    const target = document.createElement('canvas');
    target.width = sourceCanvas.width * ratio;
    target.height = sourceCanvas.height * ratio;
    const ctx = target.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, target.width, target.height);
    ctx.drawImage(sourceCanvas, 0, 0, target.width, target.height);
    return target.toDataURL('image/jpeg', quality);
}
