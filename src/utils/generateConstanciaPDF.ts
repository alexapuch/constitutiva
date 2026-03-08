import { jsPDF } from 'jspdf';
import { DocumentInfo, Employee } from '../types';
import Swal from 'sweetalert2';

export const generateConstanciaPDF = async (docInfo: DocumentInfo, emp: Employee) => {
    try {
        // 1. URL to the empty template
        const imgUrl = '/constancia_vacia.png';

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

        // Note: If using a PNG, change 'JPEG' to 'PNG'
        // JS PDF usually handles base64 urls dynamically, but let's assume JPEG as standard photo format
        const imgType = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, imgType, 0, 0, docWidth, docHeight, 'template', 'FAST');

        // Text position settings

        // 1. Name of the employee
        doc.setFont('helvetica', 'bold');
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
        const addressText = docInfo.address.trim().toUpperCase();
        const pdcText = "PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.";

        // Determine layout based on address length
        const maxAddressWidth = 155;
        const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);

        // If the address fits in one line, array format forces a nice line break for Playa del Carmen.
        // If the address wraps to multiple lines, concatenating prevents isolated short lines and extra forced jumps.
        const finalAddress = addressLines.length === 1
            ? [addressText, pdcText]
            : `${addressText} ${pdcText}`;

        // Micro-adjustment up by 2px (0.5mm)
        doc.text(finalAddress, 96, 100.5, { align: 'left', maxWidth: maxAddressWidth, lineHeightFactor: 1.5 });

        // 4. Date
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255); // White text inside red banner
        doc.setFont('helvetica', 'bold');
        // Shift slightly down and left based on visual feedback
        doc.text(docInfo.date.toUpperCase(), 145, 124, { align: 'center' });

        // Generate output and download
        const safeName = emp.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `constancia_${safeName}.pdf`;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && navigator.canShare) {
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
            if (navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Constancia - ${emp.name}`,
                    });
                    return; // Success, exit
                } catch (error) {
                    console.log('Share canceled or failed:', error);
                    // DO NOT FALLTHROUGH on mobile. doc.save() on iOS overrides the current tab.
                    return;
                }
            }
        }

        doc.save(fileName);
    } catch (error: any) {
        console.error('Error al generar constancia:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al generar constancia',
            text: `Asegúrate de haber guardado la imagen vacía como "constancia_vacia.jpg" en la carpeta public. Detalles: ${error.message}`,
            confirmButtonColor: '#e11d48'
        });
    }
};
