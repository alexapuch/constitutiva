import { jsPDF } from 'jspdf';
import { DocumentInfo, Employee } from '../types';
import Swal from 'sweetalert2';
import { savePdfVersion } from './savePdfVersion';
import { generatePdfName } from './pdfNameGenerator';

export const generateBatchConstanciasPDF = async (docInfo: DocumentInfo, employees: Employee[], templateImage: string = '/constancia_vacia.png', preview: boolean = false): Promise<string | void> => {
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
            compress: true
        });

        const docWidth = doc.internal.pageSize.getWidth();
        const docHeight = doc.internal.pageSize.getHeight();

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
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(27, 54, 93); // Dark blue
            doc.setFontSize(22);
            doc.text(emp.name.toUpperCase(), docWidth / 2, 53, { align: 'center' });

            // 2. Commercial Name
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80); // Gray text
            doc.text(docInfo.commercial_name.toUpperCase(), 118, 94.5, { align: 'left', maxWidth: 140 });

            // 3. Address
            const addressText = docInfo.address.trim().toUpperCase();
            const pdcText = "PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.";

            const maxAddressWidth = 155;
            const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);

            const finalAddress = addressLines.length === 1
                ? [addressText, pdcText]
                : `${addressText} ${pdcText}`;

            doc.text(finalAddress, 96, 100.5, { align: 'left', maxWidth: maxAddressWidth, lineHeightFactor: 1.5 });

            // 4. Date
            doc.setFontSize(11);
            doc.setTextColor(255, 255, 255); // White text inside red banner
            doc.setFont('helvetica', 'bold');
            doc.text(docInfo.date.toUpperCase(), 145, 124, { align: 'center' });

            // 5. Vigencia
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100); // Dark gray
            doc.setFont('helvetica', 'bold');
            doc.text('VIGENCIA AÑO FISCAL', 142.61, 134.32, { align: 'center' });
        }

        // Preview mode: return blob URL
        if (preview) {
            const pdfBlob = doc.output('blob');
            return URL.createObjectURL(pdfBlob);
        }

        // Generate output and share/download
        const pdfName = generatePdfName('CONSTANCIAS', docInfo.commercial_name, docInfo.date);
        const pdfBlob = doc.output('blob');
        
        // Background cloud save
        savePdfVersion(pdfBlob, `${pdfName}.pdf`, 'Constancias (Lote)', Object.keys(docInfo).length > 0 && docInfo.id ? docInfo.id : undefined).catch(err => console.error('Auto-save failed:', err));

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && navigator.share) {
            const file = new File([pdfBlob], `${pdfName}.pdf`, { type: 'application/pdf' });
            try {
                await navigator.share({ files: [file] });
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
            }
        } else {
            doc.save(`${pdfName}.pdf`);
        }
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
