import { jsPDF } from 'jspdf';
import { DocumentInfo, Employee } from '../types';
import Swal from 'sweetalert2';
import { savePdfVersion } from './savePdfVersion';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';
import { hasChinese, loadChineseFont } from './loadChineseFont';

export const generateConstanciaPDF = async (docInfo: DocumentInfo, emp: Employee, templateImage: string = '/constancia_vacia.png', preview: boolean = false, pdfPrefix: string = 'CONSTANCIA', fileDate?: string): Promise<string | void> => {
    try {
        // 1. URL to the empty template
        const imgUrl = templateImage;

        // Convert image to base64
        const imgData = await fetch(imgUrl)
            .then(res => {
                if (!res.ok) throw new Error('No se encontró la imagen public/constancia_vacia.jpg o .png');
                return res.blob();
            })
            .then(blob => new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            }));

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [279.4, 157.16], // Custom 16:9 format matching 1920x1080 to prevent squishing
            compress: true
        });

        const docWidth = doc.internal.pageSize.getWidth();
        const docHeight = doc.internal.pageSize.getHeight();

        // Load Chinese font if any field contains Chinese characters
        const needsChinese = hasChinese(emp.name) || hasChinese(docInfo.commercial_name) || hasChinese(docInfo.address);
        const chineseFontLoaded = needsChinese ? await loadChineseFont(doc) : false;
        const font = chineseFontLoaded ? 'NotoSansSC' : 'helvetica';

        // Note: If using a PNG, change 'JPEG' to 'PNG'
        // JS PDF usually handles base64 urls dynamically, but let's assume JPEG as standard photo format
        const imgType = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, imgType, 0, 0, docWidth, docHeight, 'template', 'FAST');

        // Text position settings

        // 1. Name of the employee
        doc.setFont(font, 'bold');
        doc.setTextColor(27, 54, 93); // Dark blue from the template
        doc.setFontSize(22);
        // Move up further for Name
        doc.text(emp.name.toUpperCase(), docWidth / 2, 53, { align: 'center' });

        // 2. Commercial Name
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80); // Gray text
        // Exact translation from 825.75px, 642.75px (1920x1080 base) with micro-adjustments (down and left, then slightly up by 2px)
        doc.text(docInfo.commercial_name.toUpperCase(), 118, 94.5, { align: 'left', maxWidth: 140 });

        // 3. Address
        const addressText = (docInfo.address || '').split(/\s*\|\s*/)[0].trim().toUpperCase();
        const pdcText = templateImage.includes('_tulum') ? "TULUM, QUINTANA ROO, MÉXICO." : "PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.";

        const maxAddressWidth = 155;

        let finalAddress: string | string[];
        if (!addressText) {
            // No address: show city/state on the first line only
            finalAddress = pdcText;
        } else {
            // Address present: keep original layout
            const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);
            finalAddress = addressLines.length === 1
                ? [addressText, pdcText]
                : `${addressText} ${pdcText}`;
        }

        // Micro-adjustment up by 2px (0.5mm)
        doc.text(finalAddress, 96, 100.5, { align: 'left', maxWidth: maxAddressWidth, lineHeightFactor: 1.5 });

        // 4. Date
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255); // White text inside red banner
        doc.setFont(font, 'bold');
        // Shift slightly down and left based on visual feedback
        doc.text(docInfo.date.toUpperCase(), 145, 124, { align: 'center' });

        // 5. Vigencia
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100); // Dark gray
        doc.setFont(font, 'bold');
        doc.text('VIGENCIA AÑO FISCAL', 142.61, 134.32, { align: 'center' });

        // Preview mode: return blob URL
        if (preview) {
            const pdfBlob = doc.output('blob');
            return URL.createObjectURL(pdfBlob);
        }

        // Generate output and share/download
        const pdfName = generatePdfName(pdfPrefix, docInfo.commercial_name, fileDate || docInfo.date);
        const pdfBlob = doc.output('blob');
        
        // Background cloud save
        savePdfVersion(pdfBlob, `${pdfName}.pdf`, 'Constancia', Object.keys(docInfo).length > 0 && docInfo.id ? docInfo.id : undefined).catch(err => console.error('Auto-save failed:', err));

        await savePdf(pdfBlob, `${pdfName}.pdf`);
    } catch (error: any) {
        console.error('Error al generar constancia:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al generar constancia',
            text: `Asegúrate de haber guardado la imagen vacía como "constancia_vacia.jpg" en la carpeta public. Detalles: ${error.message}`,
            confirmButtonColor: '#722F37'
        });
    }
};
