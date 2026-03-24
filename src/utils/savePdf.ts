export const savePdf = async (blob: Blob, fileName: string, title?: string): Promise<void> => {
  const blobUrl = URL.createObjectURL(blob);

  // 1. Detección de entorno
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isIosPwa = isIos && isStandalone;

  // 2. Lógica exclusiva para PWA en iOS
  if (isIosPwa) {
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title || fileName,
        });
        return;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('El usuario canceló el diálogo.');
          return;
        }
        console.warn('navigator.share falló en PWA, usando el visor como respaldo...', error);
      }
    }
    // Respaldo de PWA
    window.location.assign(blobUrl);
    return;
  }

  // 3. Lógica para Safari normal y otros navegadores (Descarga clásica)
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
};
