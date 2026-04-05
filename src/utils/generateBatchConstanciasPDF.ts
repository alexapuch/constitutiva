import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { DocumentInfo, Employee } from '../types';
import { generateFolio, folioToSlug } from './generateFolio';
import Swal from 'sweetalert2';
import { savePdfVersion } from './savePdfVersion';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';
import { hasChinese, loadChineseFont } from './loadChineseFont';

export const generateBatchConstanciasPDF = async (docInfo: DocumentInfo, employees: Employee[], templateImage: string = '/constancia_vacia.png', preview: boolean = false, pdfPrefix: string = 'CONSTANCIAS', fileDate?: string): Promise<string | void> => {
    try {
        if (!employees || employees.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No hay personas',
                text: 'No hay firmas/personas registradas en esta acta para generar constancias.',
                confirmButtonColor: '#722F37'
            });
            return;
        }

        // 1. URL to the empty template
        const imgUrl = templateImage;

        // Convert image to base64
        const imgData = await fetch(imgUrl)
            .then(res => {
                if (!res.ok) throw new Error('No se encontró la imagen public/constancia_vacia.png');
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
            compress: true,
            encryption: {
                ownerPassword: 'Meyersound1##',
                userPermissions: ['print']
            }
        });

        const docWidth = doc.internal.pageSize.getWidth();
        const docHeight = doc.internal.pageSize.getHeight();

        // Load Chinese font if any employee name or company info contains Chinese characters
        const needsChinese = hasChinese(docInfo.commercial_name) || hasChinese(docInfo.address) ||
            employees.some(e => hasChinese(e.name));
        const chineseFontLoaded = needsChinese ? await loadChineseFont(doc) : false;
        const font = chineseFontLoaded ? 'NotoSansSC' : 'helvetica';

        // Note: If using a PNG, change 'JPEG' to 'PNG'
        const imgType = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];

            if (i > 0) {
                doc.addPage();
            }

            // Image background
            doc.addImage(imgData, imgType, 0, 0, docWidth, docHeight, 'template', 'FAST');

            // 1. Name of the employee
            doc.setFont(font, 'bold');
            doc.setTextColor(27, 54, 93); // Dark blue
            doc.setFontSize(22);
            doc.text(emp.name.toUpperCase(), docWidth / 2, 53, { align: 'center' });

            // 2. Commercial Name
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80); // Gray text
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
                const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);
                finalAddress = addressLines.length === 1
                    ? [addressText, pdcText]
                    : `${addressText} ${pdcText}`;
            }

            doc.text(finalAddress, 96, 100.5, { align: 'left', maxWidth: maxAddressWidth, lineHeightFactor: 1.5 });

            // 4. Date
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255); // White text inside red banner
            doc.setFont(font, 'bold');
            doc.text(docInfo.date.toUpperCase(), 145, 124, { align: 'center' });

            // 5. Vigencia
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100); // Dark gray
            doc.setFont(font, 'bold');
            doc.text('VIGENCIA AÑO FISCAL', 142.61, 134.32, { align: 'center' });

            // 6. QR Code de verificación
            const folio = await generateFolio(docInfo.id, emp.name);
            const verifyUrl = `${window.location.origin}/verificar/${folioToSlug(folio)}`;
            const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
            const qrSize = 18;
            const qrPad = 2;
            const qrX = 234;
            const qrY = 107.5;
            // Marco rojo vino redondeado
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 3, 3, 'F');
            doc.setDrawColor(220, 20, 20);
            doc.setLineWidth(1.2);
            doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 3, 3, 'S');
            doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        }

        // Preview mode: return blob URL
        if (preview) {
            const pdfBlob = doc.output('blob');
            return URL.createObjectURL(pdfBlob);
        }

        // Generate output and share/download
        const pdfName = generatePdfName(pdfPrefix, docInfo.commercial_name, fileDate || docInfo.date);
        const pdfBlob = doc.output('blob');
        
        // Background cloud save
        savePdfVersion(pdfBlob, `${pdfName}.pdf`, 'Constancias (Lote)', Object.keys(docInfo).length > 0 && docInfo.id ? docInfo.id : undefined).catch(err => console.error('Auto-save failed:', err));

        await savePdf(pdfBlob, `${pdfName}.pdf`);
    } catch (error: any) {
        console.error('Error al generar constancias en lote:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Hubo un error crítico al generar las constancias. Detalles: ${error.message}`,
            confirmButtonColor: '#722F37'
        });
    }
};
