import { jsPDF } from 'jspdf';

export const hasChinese = (text: string): boolean =>
    /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);

// Loads NotoSansSC font into the jsPDF instance.
// Returns true if loaded successfully, false if the font file is not found.
export const loadChineseFont = async (doc: jsPDF): Promise<boolean> => {
    try {
        const response = await fetch('/NotoSansSC-Regular.ttf');
        if (!response.ok) return false;

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        doc.addFileToVFS('NotoSansSC-Regular.ttf', base64);
        doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
        doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'bold');
        return true;
    } catch {
        return false;
    }
};
