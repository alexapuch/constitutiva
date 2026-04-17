import { jsPDF } from 'jspdf';
import { DocumentInfo } from '../types';
import Swal from 'sweetalert2';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';

// Fetch font and return base64
const fetchFontBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load font ${url}`);
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Fetch logo as png base64 to keep transparency
const loadWatermarkPng = async (): Promise<string | null> => {
    try {
        const res = await fetch('/seprisa-logo.png');
        if (!res.ok) throw new Error('Could not load seprisa-logo');
        const blob = await res.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn('Could not load seprisa-logo for watermark', e);
        return null;
    }
};

export const generateCaratulasPDF = async (docInfo: DocumentInfo, preview: boolean = false): Promise<string | void> => {

    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        // Load fonts
        try {
            const [regularB64, boldB64] = await Promise.all([
                fetchFontBase64('/Montserrat-Regular.ttf'),
                fetchFontBase64('/Montserrat-Bold.ttf')
            ]);
            doc.addFileToVFS('Montserrat-Regular.ttf', regularB64);
            doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal');
            doc.addFileToVFS('Montserrat-Bold.ttf', boldB64);
            doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold');
            doc.setFont('Montserrat');
        } catch (fontErr) {
            console.warn('Could not load Montserrat font, falling back to Helvetica', fontErr);
            doc.setFont('helvetica');
        }

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const centerY = pageHeight / 2 - 20;

        const watermarkImg = await loadWatermarkPng();

        const addCaratulaPage = (anexo: string, subtitle: string, includeBottomBox: boolean = false) => {
            // Draw Blue Frame
            doc.setDrawColor(31, 73, 125); // Seprisa blue
            doc.setLineWidth(1.5);
            // 10mm margin on all sides
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20); 

            // Draw watermark if available
            if (watermarkImg) {
                doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
                const imgSize = 150;
                doc.addImage(watermarkImg, 'PNG', (pageWidth - imgSize) / 2, (pageHeight - imgSize) / 2, imgSize, imgSize);
                doc.setGState(new (doc as any).GState({ opacity: 1.0 }));
            }

            // Text color to standard black
            doc.setTextColor(0, 0, 0);

            // Anexo title
            doc.setFontSize(22);
            doc.setFont('Montserrat', 'bold');
            doc.text(anexo, pageWidth / 2, 40, { align: 'center' });

            // Company Name
            doc.setFontSize(20);
            doc.setFont('Montserrat', 'bold');
            doc.text((docInfo.company_name || 'RAZÓN SOCIAL NO DEFINIDA').toUpperCase(), pageWidth / 2, centerY - 15, { align: 'center', maxWidth: pageWidth - 40 });

            // Commercial Name
            doc.setFontSize(24);
            doc.setFont('Montserrat', 'bold');
            doc.text(`"${(docInfo.commercial_name || 'NOMBRE COMERCIAL NO DEFINIDO').toUpperCase()}"`, pageWidth / 2, centerY, { align: 'center', maxWidth: pageWidth - 40 });

            // Subtitle
            doc.setFontSize(16);
            doc.setFont('Montserrat', 'normal');
            doc.text(subtitle, pageWidth / 2, centerY + 25, { align: 'center', maxWidth: pageWidth - 40 });

            if (includeBottomBox) {
                const boxText = "PROGRAMA INTERNO DE PROTECCIÓN CIVIL 2026";
                doc.setFontSize(14);
                doc.setFont('Montserrat', 'bold');
                const textWidth = doc.getTextWidth(boxText);
                const boxWidth = textWidth + 20;
                const boxHeight = 15;
                const boxX = (pageWidth - boxWidth) / 2;
                const boxY = pageHeight - 55;

                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.5);
                doc.rect(boxX, boxY, boxWidth, boxHeight);
                doc.text(boxText, pageWidth / 2, boxY + 10, { align: 'center' });
            }
        };

        // Page 1
        addCaratulaPage("ANEXO I", "CONSTANCIA GRÁFICA Y DOCUMENTAL DE CAPACITACIONES Y SIMULACROS", true);

        // Page 2
        doc.addPage();
        addCaratulaPage("ANEXO II", "CONSTANCIA GRÁFICA Y DOCUMENTAL DE MANTENIMIENTO PREVENTIVO Y CORRECTIVO", true);

        // Page 3
        doc.addPage();
        addCaratulaPage("ANEXO III", "CONSTANCIA GRÁFICA Y DOCUMENTAL DE REVISIÓN Y MANTENIMIENTO DE EQUIPOS DE EMERGENCIA", true);

        // Page 4
        doc.addPage();
        addCaratulaPage("ANEXO IV", "DOCUMENTACIÓN FISCAL Y OTROS DOCUMENTOS", true);

        const fileName = generatePdfName('CARATULAS ANEXOS', docInfo.commercial_name || 'DOCUMENTO', docInfo.date);
        
        const pdfBlob = doc.output('blob');

        if (!preview) {
            await savePdf(pdfBlob, `${fileName}.pdf`, `Carátulas - ${docInfo.commercial_name}`);
        } else {
            return URL.createObjectURL(pdfBlob);
        }

    } catch (error: any) {
        console.error('Error generating Carátulas:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error de PDF',
            text: 'Hubo un error al generar las Carátulas. ' + error.message,
            confirmButtonColor: '#722F37'
        });
    }
};
