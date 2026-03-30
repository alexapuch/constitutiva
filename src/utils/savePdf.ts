import Swal from 'sweetalert2';

export const savePdf = async (blob: Blob, fileName: string, title?: string): Promise<void> => {
  const blobUrl = URL.createObjectURL(blob);

  // 1. Detección de entorno
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
  const isIosPwa = isIos && isStandalone;

  const file = new File([blob], fileName, { type: 'application/pdf' });

  const tryShare = async () => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title || fileName,
        });
        return true;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return true; // user cancelled but it's fine
        }
      }
    }
    return false;
  };

  if (isIosPwa || isIos) {
    // Attempt direct share first.
    const success = await tryShare();
    if (success) {
      if (!isIosPwa) { URL.revokeObjectURL(blobUrl); }
      return;
    }

    // Fallback: If it silently failed or required user interaction gesture, we show a Swal
    // button, so when the user clicks 'Compartir/Guardar', we get a fresh synchronous gesture.
    Swal.fire({
      title: 'Documento Listo',
      text: 'Presiona el botón para descargar o compartir el archivo.',
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Compartir / Guardar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#1f3769'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const shareSuccess = await tryShare();
        if (!shareSuccess) {
           if (!isStandalone) { window.location.assign(blobUrl); }
           else { Swal.fire('Aviso', 'No se pudo exportar automáticamente. Intenta usar otro navegador.', 'error'); }
        }
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    });
    return;
  }

  // 4. Desktop / Android: descarga clásica
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
};
