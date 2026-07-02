import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { DocumentInfo, Employee } from '../types';
import { generateFolio, folioToSlug } from './generateFolio';
import Swal from 'sweetalert2';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';
import { hasChinese, loadChineseFont } from './loadChineseFont';
import { getCachedJpeg } from './imageCache';

interface RegistryEntry {
  folio: string;
  employee_name: string;
  commercial_name: string;
  date: string;
  address: string;
}

// Auto-shrink address font so it never overlaps the bottom layout bounds (max Y ≈ 116mm)
export function resolveAddressLayout(doc: jsPDF, addressText: string, pdcText: string, maxWidth: number, startY: number = 100.5, qrTopY: number = 116): { finalAddress: string; fontSize: number } {
  const lineHeightFactor = 1.5;

  if (!addressText) return { finalAddress: pdcText, fontSize: 12 };

  // If the user explicitly set the address to the city itself, render it once only
  if (addressText.replace(/\.$/, '') === pdcText.replace(/\.$/, '')) {
    return { finalAddress: pdcText, fontSize: 12 };
  }

  const cleanAddress = addressText.trim().replace(/[,.\s]+$/, '');
  const fullAddress = `${cleanAddress}, ${pdcText}`;

  for (let fontSize = 12; fontSize >= 6; fontSize--) {
    doc.setFontSize(fontSize);
    const rendered: string[] = doc.splitTextToSize(fullAddress, maxWidth);
    const lineHeightMm = fontSize * 0.352778 * lineHeightFactor;
    const bottomY = startY + (rendered.length - 1) * lineHeightMm;
    if (bottomY <= qrTopY) return { finalAddress: fullAddress, fontSize };
  }
  // Fallback: use font 6
  return { finalAddress: fullAddress, fontSize: 6 };
}

function drawConstanciaPage(doc: jsPDF, entry: RegistryEntry, imgJpeg: string, font: string) {
  const docWidth = doc.internal.pageSize.getWidth();
  const docHeight = doc.internal.pageSize.getHeight();

  doc.addImage(imgJpeg, 'JPEG', 0, 0, docWidth, docHeight, 'template', 'FAST');

  doc.setFont(font, 'bold');
  doc.setTextColor(27, 54, 93);
  doc.setFontSize(22);
  doc.text(entry.employee_name.toUpperCase(), (docWidth / 2) + 5.0, 78.0, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(entry.commercial_name.toUpperCase(), 77.0, 131.5, { align: 'left', maxWidth: 171.0 });

  const addressText = (entry.address || '').split(/\s*\|\s*/)[0].trim().toUpperCase();
  const pdcText = 'PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.';
  const maxAddressWidth = 174.0;
  const { finalAddress, fontSize: addressFontSize } = resolveAddressLayout(doc, addressText, pdcText, maxAddressWidth, 141.0, 157.0);
  doc.setFontSize(addressFontSize);
  doc.setTextColor(30, 30, 30);
  doc.text(finalAddress, 55.0, 141.0, { align: 'left', maxWidth: maxAddressWidth, lineHeightFactor: 1.5 });

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont(font, 'bold');
  doc.text(entry.date.toUpperCase(), 140.0, 170.3, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont(font, 'bold');
  doc.text('VIGENCIA AÑO FISCAL', 140.61, 184.5, { align: 'center' });

  const verifyUrl = `https://seprisa.app/v/${folioToSlug(entry.folio)}`;
  const qrMatrix = QRCode.create(verifyUrl, { errorCorrectionLevel: 'L' });
  const qrSize = 25.0;
  const qrPad = 1.5;
  const qrX = 231.75;
  const qrY = 151.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 2.5, 2.5, 'F');
  doc.setDrawColor(220, 20, 20);
  doc.setLineWidth(1.2);
  doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 2.5, 2.5, 'S');
  const modules = qrMatrix.modules;
  const modCount = modules.size;
  const cellSize = qrSize / modCount;
  doc.setFillColor(15, 23, 42);
  for (let row = 0; row < modCount; row++) {
    for (let col = 0; col < modCount; col++) {
      if (modules.data[row * modCount + col]) {
        // Añadir +0.1 al tamaño para evitar que se vean líneas minúsculas de separación en renderizado PDF
        doc.rect(qrX + col * cellSize, qrY + row * cellSize, cellSize + 0.1, cellSize + 0.1, 'F');
      }
    }
  }
}

export const generateConstanciasBatchFromRegistry = async (entries: RegistryEntry[], companyName: string): Promise<void> => {
  try {
    if (!entries || entries.length === 0) return;

    const imgJpeg = await getCachedJpeg('/constancia_vacia.png');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [279.4, 215.9],
      compress: true,
      encryption: { ownerPassword: 'Meyersound1##', userPermissions: ['print'] }
    });

    const needsChinese = entries.some(e =>
      hasChinese(e.employee_name) || hasChinese(e.commercial_name) || hasChinese(e.address)
    );
    const chineseFontLoaded = needsChinese ? await loadChineseFont(doc) : false;
    const font = chineseFontLoaded ? 'NotoSansSC' : 'helvetica';

    for (let i = 0; i < entries.length; i++) {
      if (i > 0) doc.addPage();
      drawConstanciaPage(doc, entries[i], imgJpeg, font);
    }

    const dateStr = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const pdfBlob = doc.output('blob');
    await savePdf(pdfBlob, `CONSTANCIAS-LOTE_${companyName}_${dateStr}.pdf`);
  } catch (error: any) {
    console.error('Error al generar lote de constancias:', error);
    Swal.fire({ icon: 'error', title: 'Error', text: `No se pudo generar el lote. Detalles: ${error.message}`, confirmButtonColor: '#722F37' });
  }
};

export const generateConstanciaPDF = async (docInfo: DocumentInfo, emp: Employee, templateImage: string = '/constancia_vacia.png', preview: boolean = false, pdfPrefix: string = 'CONSTANCIA', fileDate?: string, existingFolio?: string): Promise<string | void> => {
    try {
        // Start folio fetch immediately — runs in parallel with synchronous PDF setup below
        const folioPromise = preview
            ? Promise.resolve('PREV/0001')
            : (existingFolio ? Promise.resolve(existingFolio) : generateFolio(docInfo.id, emp.name, docInfo.commercial_name, docInfo.address, docInfo.date));

        const imgJpeg = await getCachedJpeg(templateImage);

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [279.4, 215.9], // Custom Letter landscape format to cover entire page when printing
            compress: true,
            encryption: {
                ownerPassword: 'Meyersound1##',
                userPermissions: ['print']
            }
        });

        const docWidth = doc.internal.pageSize.getWidth();
        const docHeight = doc.internal.pageSize.getHeight();

        // Load Chinese font if any field contains Chinese characters
        const needsChinese = hasChinese(emp.name) || hasChinese(docInfo.commercial_name) || hasChinese(docInfo.address);
        const chineseFontLoaded = needsChinese ? await loadChineseFont(doc) : false;
        const font = chineseFontLoaded ? 'NotoSansSC' : 'helvetica';

        doc.addImage(imgJpeg, 'JPEG', 0, 0, docWidth, docHeight, 'template', 'FAST');
        // Text position settings

        // 1. Name of the employee
        doc.setFont(font, 'bold');
        doc.setTextColor(27, 54, 93); // Dark blue from the template
        doc.setFontSize(22);
        // Move up further for Name
        doc.text(emp.name.toUpperCase(), (docWidth / 2) + 5.0, 78.0, { align: 'center' });

        // 2. Commercial Name
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 30); // Dark text
        // Exact translation from 825.75px, 642.75px (1920x1080 base) with micro-adjustments (down and left, then slightly up by 2px)
        doc.text(docInfo.commercial_name.toUpperCase(), 77.0, 131.5, { align: 'left', maxWidth: 171.0 });

        // 3. Address
        const addressText = (docInfo.address || '').split(/\s*\|\s*/)[0].trim().toUpperCase();
        const pdcText = templateImage.includes('_tulum') ? "TULUM, QUINTANA ROO, MÉXICO." : "PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO.";
        const maxAddressWidth = 174.0;
        const { finalAddress, fontSize: addressFontSize } = resolveAddressLayout(doc, addressText, pdcText, maxAddressWidth, 141.0, 157.0);
        doc.setFontSize(addressFontSize);
        doc.setTextColor(30, 30, 30);
        doc.text(finalAddress, 55.0, 141.0, { align: 'left', maxWidth: maxAddressWidth, lineHeightFactor: 1.5 });

        // 4. Date
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255); // White text inside red banner
        doc.setFont(font, 'bold');
        // Shift slightly down and left based on visual feedback
        doc.text(docInfo.date.toUpperCase(), 140.0, 170.3, { align: 'center' });

        // 5. Vigencia
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100); // Dark gray
        doc.setFont(font, 'bold');
        doc.text('VIGENCIA AÑO FISCAL', 140.61, 184.5, { align: 'center' });

        // 6. QR Code de verificación — en preview folio ficticio, en descarga real crea el registro
        const folio = await folioPromise;
        const verifyUrl = `https://seprisa.app/v/${folioToSlug(folio)}`;
        
        const qrSize = 25.0;
        const qrPad = 1.5;
        const qrX = 231.75;
        const qrY = 151.5;
        
        // Marco blanco con borde rojo redondeado
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 2.5, 2.5, 'F');
        doc.setDrawColor(220, 20, 20);
        doc.setLineWidth(1.2);
        doc.roundedRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 2.5, 2.5, 'S');
        
        // Dibujar QR como imagen para evitar miles de paths lentos en lote
        const qrBase64 = await QRCode.toDataURL(verifyUrl, {
            errorCorrectionLevel: 'L',
            margin: 0,
            width: 300,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });
        doc.addImage(qrBase64, 'PNG', qrX, qrY, qrSize, qrSize, `qr_${folio}`, 'FAST');

        // Preview mode: return blob URL
        if (preview) {
            const pdfBlob = doc.output('blob');
            return URL.createObjectURL(pdfBlob);
        }

        // Generate output and share/download
        const pdfName = generatePdfName(pdfPrefix, docInfo.commercial_name, fileDate || docInfo.date);
        const pdfBlob = doc.output('blob');
        
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
