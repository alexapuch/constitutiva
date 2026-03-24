/**
 * Handles PDF save/share across platforms.
 *
 * iOS PWA (standalone) special case: navigator.share() fails because the
 * user gesture permission expires while the PDF is being generated.
 * Workaround: navigate to the blob URL so the built-in iOS PDF viewer
 * opens it — the user can then save/share from there with the native button.
 */
export const savePdf = async (blob: Blob, fileName: string, title?: string): Promise<void> => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = isIOS && (window.navigator as any).standalone === true;

    if (isStandalone) {
        // iOS PWA: open blob in the PDF viewer embedded in the app window
        window.location.href = URL.createObjectURL(blob);
        return;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ files: [file], title });
                return;
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                // fall through to link download
            }
        }
    }

    // Desktop / Android fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
