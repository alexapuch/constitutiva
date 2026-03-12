import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { FIRMA_JORGE_BASE64 } from './firmaJorge';
import { savePdfVersion } from './savePdfVersion';
import { generatePdfName } from './pdfNameGenerator';

export interface CartaResponsivaData {
    nombreComercial: string;
    razonSocial: string;
    direccion: string;
    giroComercial: string;
    fecha: string;
    fvu: string;
    dictamenGas: boolean;
}

export const generateCartaResponsivaPDF = async (data: CartaResponsivaData, preview: boolean = false): Promise<string | void> => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const docWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const usableWidth = docWidth - margin * 2;

        // Use 9pt font throughout — compact but readable
        const fs = 9;
        // Line height for splitTextToSize blocks (font size in mm * lineHeightFactor)
        // 9pt ≈ 3.17mm, × 1.4 ≈ 4.4mm per line
        const lh = 4.4;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(fs);

        // Date header
        let y = 30;
        doc.setFont('helvetica', 'normal');
        doc.text(`PLAYA DEL CARMEN QUINTANA ROO, A ${data.fecha.toUpperCase()}`, docWidth - margin, y, { align: 'right' });

        // Addressee
        y += 18;
        doc.setFont('helvetica', 'bold');
        doc.text('LICENCIADO DARWIN MANUEL COVARRUBIAS GÓNGORA', margin, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.text('SECRETARIO DE PROTECCIÓN CIVIL, PREVENCIÓN DE RIESGOS Y BOMBEROS', margin, y);
        y += 4.5;
        doc.text('DEL MUNICIPIO DE PLAYA DEL CARMEN.', margin, y);
        y += 4.5;
        doc.setFont('helvetica', 'bold');
        doc.text('P R E S E N T E', margin, y);

        // First paragraph (FVU in bold at the end)
        y += 20;
        doc.setFont('helvetica', 'normal');
        const p1Text = `POR MEDIO DE LA PRESENTE MANIFIESTO QUE LOS DATOS, INFORMES Y DOCUMENTACIÓN QUE INTEGRAN LA CARPETA DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL A NOMBRE DE "${data.razonSocial.toUpperCase()}" DE NOMBRE COMERCIAL "${data.nombreComercial.toUpperCase()}" GIRO COMERCIAL "${data.giroComercial.toUpperCase()}" Y DIRECCIÓN: ${data.direccion.toUpperCase()}, PLAYA DEL CARMEN, QUINTANA ROO, MÉXICO. SON VERÍDICOS. CON`;
        const fvuText = ` FVU-2026-${data.fvu}`;
        const p1Full = p1Text + fvuText;
        const lines1 = doc.splitTextToSize(p1Full, usableWidth);
        // Draw all lines normal first
        doc.text(lines1, margin, y, { align: 'justify', maxWidth: usableWidth, lineHeightFactor: 1.4 });
        // Now overlay the FVU part in bold on the last line
        const lastLine: string = lines1[lines1.length - 1];
        const fvuMatch = lastLine.match(/(FVU-2026-\S*)/);
        if (fvuMatch) {
            const lastLineY = y + (lines1.length - 1) * lh;
            const beforeFvu = lastLine.substring(0, lastLine.indexOf(fvuMatch[1]));
            const beforeWidth = doc.getTextWidth(beforeFvu);
            // White out the FVU text area and redraw in bold
            doc.setFillColor(255, 255, 255);
            doc.rect(margin + beforeWidth, lastLineY - 3, doc.getTextWidth(fvuMatch[1]) + 1, 4, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text(fvuMatch[1], margin + beforeWidth, lastLineY);
            doc.setFont('helvetica', 'normal');
        }
        y += lines1.length * lh + 4;

        // Second paragraph
        const p2 = 'DICHO PROGRAMA FUE ELABORADO POR UN SERVIDOR DE ACUERDO CON LAS NORMAS Y LEYES EN MATERIA DE PROTECCIÓN CIVIL. EL USB CONTIENE LO SIGUIENTE:';
        const lines2 = doc.splitTextToSize(p2, usableWidth);
        doc.text(lines2, margin, y, { align: 'justify', maxWidth: usableWidth, lineHeightFactor: 1.4 });
        y += lines2.length * lh + 4;

        // Numbered list (conditionally include Dictamen de Gas)
        const listItems: string[] = [
            'PROGRAMA INTERNO',
            'PLAN DE CONTINGENCIA Y RECUPERACIÓN',
            'CONSTANCIAS CAPACITACIÓN',
            'PÓLIZA DE SEGURO',
        ];
        if (data.dictamenGas) {
            listItems.push('DICTAMEN DE GAS');
        }
        listItems.push(
            'DICTAMEN ELÉCTRICO',
            'FACTURA RECARGA EXTINTORES',
            'DOCUMENTACIÓN LEGAL (ACTA CONSTITUTIVA, CEDULA DE SIMULACRO, ORDEN DE INSPECCIÓN)'
        );
        const romanNumerals = listItems.map((_, i) => `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i]}.`);
        const romanX = margin + 5;
        const listIndent = margin + 14;

        listItems.forEach((item, i) => {
            doc.text(romanNumerals[i], romanX, y);
            const itemLines = doc.splitTextToSize(item, usableWidth - 18);
            doc.text(itemLines, listIndent, y);
            y += itemLines.length * lh;
        });

        // Third paragraph
        y += 4;
        const p3 = 'POR LO QUE EXTIENDO ESTA CARTA RESPONSIVA, CONOCIENDO LOS ALCANCES QUE PUDIERA TENER, EL DAR INFORMACIÓN FALSA O INEXACTA A UNA AUTORIDAD.';
        const lines3 = doc.splitTextToSize(p3, usableWidth);
        doc.text(lines3, margin, y, { align: 'justify', maxWidth: usableWidth, lineHeightFactor: 1.4 });
        y += lines3.length * lh + 3;

        // Fourth paragraph
        doc.text('ANEXO DOCUMENTACIÓN, PARA DAR CUMPLIMIENTO PARA LOS TRÁMITES CORRESPONDIENTES.', margin, y);
        y += lh + 3;

        // Fifth paragraph
        doc.text('SIN OTRO EN PARTICULAR QUEDO A SUS ÓRDENES.', margin, y);

        // Check remaining space and scale signature area if needed
        const signatureNeeded = 38; // firma(18) + gap + text
        const remaining = pageHeight - y - 10; // 10mm bottom margin
        const sigScale = remaining < signatureNeeded ? remaining / signatureNeeded : 1;

        // Signature image
        y += 4 * sigScale;
        const sigW = 38 * sigScale;
        const sigH = 18 * sigScale;
        doc.addImage(FIRMA_JORGE_BASE64, 'PNG', margin, y, sigW, sigH);

        y += sigH + 1;
        doc.setFontSize(Math.max(7, 9 * sigScale));
        doc.setFont('helvetica', 'normal');
        doc.text('A T E N T A M E N T E', margin, y);

        y += 5 * sigScale;
        doc.setFont('helvetica', 'bold');
        doc.text('JORGE HUMBERTO MEZA CONTRERAS', margin, y);
        y += 4 * sigScale;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(Math.max(6.5, 8 * sigScale));
        doc.text('REGISTRO: MPDC/SPCPRyB/AUT-DT/RPS/028/2026', margin, y);

        const fileName = generatePdfName('CARTA RESPONSIVA', data.nombreComercial, data.fecha);
        const pdfBlob = doc.output('blob');

        // Preview mode: return blob URL
        if (preview) {
            return URL.createObjectURL(pdfBlob);
        }

        // Background cloud save (pass raw title since document id is optional/unknown here)
        savePdfVersion(pdfBlob, `${fileName}.pdf`, 'Carta Responsiva', undefined).catch(err => console.error('Auto-save failed:', err));

        // Save/Share
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile && navigator.share) {
            const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
            try {
                await navigator.share({ files: [file] });
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
            }
        } else {
            doc.save(`${fileName}.pdf`);
        }
    } catch (error: any) {
        console.error('Error al generar carta responsiva:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al generar carta responsiva',
            text: `Hubo un error al crear el PDF. Detalles: ${error.message}`,
            confirmButtonColor: '#722F37'
        });
    }
};
