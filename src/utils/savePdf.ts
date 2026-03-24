export const savePdf = async (blob: Blob, fileName: string, title?: string): Promise<void> => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = isIOS || /Android/i.test(navigator.userAgent);

    // Try Web Share API first on mobile (works in Safari and in iOS PWA on iOS 15+)
    if (isMobile && navigator.share) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const canShare = navigator.canShare ? navigator.canShare({ files: [file] }) : true;
        if (canShare) {
            try {
                await navigator.share({ files: [file], title });
                return;
            } catch (err: any) {
                if (err.name === 'AbortError') return; // user cancelled — do nothing
                // share failed (e.g. gesture timeout in PWA) — fall through
            }
        }
    }

    // iOS fallback: open blob URL so the native PDF viewer handles save/share
    if (isIOS) {
        window.location.href = URL.createObjectURL(blob);
        return;
    }

    // Desktop / Android fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
