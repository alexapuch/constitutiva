import { jsPDF } from 'jspdf';
import { DocumentInfo, Employee } from '../types';

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
            format: [279.4, 157.16] // Custom 16:9 format matching 1920x1080 to prevent squishing
        });

        const docWidth = doc.internal.pageSize.getWidth();
        const docHeight = doc.internal.pageSize.getHeight();

        // Note: If using a PNG, change 'JPEG' to 'PNG'
        // JS PDF usually handles base64 urls dynamically, but let's assume JPEG as standard photo format
        const imgType = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, imgType, 0, 0, docWidth, docHeight);

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
        // Move up and left
        doc.text(docInfo.commercial_name.toUpperCase(), 105, 96, { align: 'left', maxWidth: 140 });

        // 3. Address
        // Move up and left
        const fullAddress = `${docInfo.address}${docInfo.address ? ", " : ""}Playa del Carmen, Quintana Roo, México.`.toUpperCase();
        doc.text(fullAddress, 95, 104, { align: 'left', maxWidth: 155, lineHeightFactor: 1.5 });

        // 4. Date
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0); // Black text for testing visibility
        doc.setFont('helvetica', 'bold');
        // Move date up
        doc.text(docInfo.date.toUpperCase(), 140, 125, { align: 'center' });

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
                    return;
                } catch (error) {
                    console.log('Share canceled or failed:', error);
                }
            }
        }

        doc.save(fileName);
    } catch (error: any) {
        console.error('Error al generar constancia:', error);
        alert('Error al generar constancia. Asegúrate de haber guardado la imagen vacía como "constancia_vacia.jpg" en la carpeta public. Detalles: ' + error.message);
    }
};
