import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentInfo } from '../types';
import Swal from 'sweetalert2';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';

export const generateActaBlankPDF = async (
    docInfo: DocumentInfo,
    numEmpleados: number,
    preview: boolean = false
): Promise<string | void> => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'letter'
        });

        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 20;

        const addText = (text: string, size: number, style: 'normal' | 'bold' | 'italic', align: 'left' | 'center' | 'right' | 'justify', yOffset: number = 0) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', style);
            const textLines = doc.splitTextToSize(text, pageWidth - margin * 2);
            if (align === 'justify') {
                doc.text(text, margin, currentY + yOffset, { align: 'justify', maxWidth: pageWidth - margin * 2, lineHeightFactor: 1.5 });
            } else {
                doc.text(textLines, align === 'center' ? pageWidth / 2 : margin, currentY + yOffset, { align: align as any, lineHeightFactor: 1.5 });
            }
            currentY += (textLines.length * size * 0.3527 * 1.5) + yOffset;
        };

        // Header
        addText('ACTA CONSTITUTIVA DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL', 13, 'bold', 'center');
        currentY += 2;
        addText(docInfo.commercial_name || '', 11, 'bold', 'center');
        currentY += 2;
        addText(`"${(docInfo.company_name || '').toUpperCase()}"`, 11, 'bold', 'center');
        currentY += 8;

        const rawAddress = docInfo.address || '';
        const addrParts = rawAddress.split('|');
        const baseAddress = addrParts[0] ? addrParts[0].trim() : '';
        const cityPrefix = addrParts[1]?.trim() === 'TULUM' ? 'TULUM' : 'PLAYA DEL CARMEN';
        const fullAddress = `${baseAddress}${baseAddress ? ", " : ""}${cityPrefix}, QUINTANA ROO, MÉXICO.`;

        addText(`C. ${(docInfo.company_name || '').toUpperCase()} RESPONSABLE DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL DE LA EMPRESA DENOMINADA "${docInfo.commercial_name || ''}" y Siendo las ${docInfo.time_start || ''} horas del día ${docInfo.date || ''}, en el inmueble que ocupa la empresa, con domicilio, ${fullAddress} Se reúne la representante legal, así como lo empleados:`, 10, 'normal', 'justify');
        currentY += 4;
        addText(`Con el objeto de constituir formalmente la Unidad Interna de Protección Civil de este inmueble.`, 10, 'normal', 'justify');
        currentY += 4;
        addText(`Como consecuencia de los sucesos ocurridos en el año de 1985, el Gobierno Federal decidió instrumentar un sistema que permitiese una respuesta eficaz y eficiente de los diversos sectores de la sociedad ante la presencia de desastres naturales y/o humanos con el propósito de prevenir sus consecuencias o en su caso mitigarlas.`, 10, 'normal', 'justify');
        currentY += 4;
        addText(`Por lo antes expuesto, y con fundamento en el Decreto por el que se aprueben las Bases para el Establecimiento del Sistema Nacional de Protección Civil.- Diario Oficial de la Federación del 6 de Mayo de 1986.- Manual de Organización y Operación del Sistema Nacional de Protección Civil.- Publicación de la Dirección General de Protección Civil del año de 1998.- Decreto por el que se crea el Consejo Nacional de Protección Civil.- Diario Oficial de la Federación del 11 de Mayo de 1990.- Programa de Protección Civil 1995-2000.- Diario Oficial de la Federación del 17 de Julio de 1996.`, 10, 'normal', 'justify');
        currentY += 4;
        addText(`Se Constituye la Unidad Interna de Protección Civil, cuyos objetivos, integración y funciones se indican a continuación.`, 10, 'normal', 'justify');
        currentY += 8;

        // 1. OBJETIVOS
        addText('1. OBJETIVOS', 10, 'bold', 'left');
        currentY += 2;
        addText(`Adecuar el Reglamento Interior u ordenamiento jurídico correspondiente, para incluir la función de Protección Civil en esta institución; elaborar, establecer, operar y evaluar permanentemente el Programa Interno de Protección Civil, así como implantar los mecanismos de coordinación con las dependencias y entidades públicas, privadas y sociales, en sus niveles federal, estatal y municipal que conforman el Sistema Nacional de Protección Civil, con el fin de cumplir con los objetivos del mismo, a través de la ejecución del Programa, particularmente realizando actividades que conduzcan a salvaguardar la integridad física del personal, visitantes y de las instalaciones del Inmueble.`, 10, 'normal', 'justify');
        currentY += 8;

        // 2. INTEGRACIÓN
        doc.addPage(); currentY = margin;
        addText('2. INTEGRACIÓN', 10, 'bold', 'left');
        currentY += 2;
        addText('La Unidad Interna de Protección Civil queda integrada por:', 10, 'normal', 'left');
        currentY += 4;

        // Build blank rows: row 1 = Representante Legal, rest = Multibrigada
        const count = Math.max(1, numEmpleados);
        const table1Body: string[][] = Array.from({ length: count }, (_, i) =>
            i === 0
                ? ['', 'REPRESENTANTE LEGAL', 'REPRESENTANTE LEGAL']
                : ['', 'MULTIBRIGADA', 'MULTIBRIGADA']
        );

        autoTable(doc, {
            startY: currentY,
            head: [['NOMBRE', 'PUESTO EN LA EMPRESA', 'BRIGADA QUE INTEGRA']],
            body: table1Body,
            theme: 'grid',
            headStyles: { fillColor: [232, 232, 232], textColor: 0, fontStyle: 'bold', halign: 'center' },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: 0, minCellHeight: 10 },
            columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 } },
            margin: { left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // 3. FUNCIONES
        if (currentY > 250) { doc.addPage(); currentY = margin; }
        addText('3. FUNCIONES', 10, 'bold', 'left');
        currentY += 2;
        addText('Corresponde a los integrantes de la Unidad Interna de Protección Civil, llevar a cabo las siguientes funciones:', 10, 'normal', 'justify');
        currentY += 4;

        const bulletPoints = [
            'Integrar y Formalizar la Unidad Interna de Protección Civil.',
            'Integrar las Brigadas Internas de Protección Civil.',
            'Diseñar y promover la impartición de cursos de capacitación a los integrantes de las Brigadas Internas de Protección Civil.',
            'Elaborar el diagnóstico de riesgos a los que está expuesta la zona donde se ubica el inmueble.',
            'Elaborar e implementar medidas de prevención para cada tipo de calamidad, de acuerdo al riesgo potencial al que está expuesto el inmueble.',
            'Definir áreas o zonas de seguridad internas y externas.',
            'Realizar simulacros en el inmueble, de acuerdo a los planes de emergencia y procedimientos metodológicos previamente elaborados para cada desastre.',
            'Elaborar y distribuir material de difusión y concientización para que el personal que labora en la dependencia.',
            'Evaluar el avance y la eficacia del Programa Interno de Protección Civil.',
            'Elaborar directorios e inventarios por inmueble, de la dependencia.',
            'Programar y realizar ejercicios y simulacros.',
            'Establecer mecanismos de coordinación con las instituciones responsables de la detección, monitoreo y pronóstico de los diferentes agentes perturbadores.',
            'Establecer acciones permanentes de mantenimiento de las diferentes instalaciones del inmueble.',
            'Determinar el equipo de seguridad que debe ser instalado en el inmueble.',
            'Promover la colocación de señalamientos, de acuerdo a los lineamientos establecidos en la Norma Mexicana NMX-S-017-1996-SCFI.',
            'Aplicar las normas de seguridad que permitan reducir al mínimo la incidencia de riesgos del personal y los bienes del inmueble en general.',
            'Elaborar un plan de reconstrucción inicial, para restablecer las condiciones normales de operación del inmueble.'
        ];

        bulletPoints.forEach((bp, idx) => {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const bulletStr = `•  ${bp}`;
            const lines = doc.splitTextToSize(bulletStr, pageWidth - margin * 2 - 5);
            const bulletHeight = lines.length * 5 + 1;
            const isLastBullet = idx === bulletPoints.length - 1;
            const nextBp = !isLastBullet ? bulletPoints[idx + 1] : null;
            const nextLines = nextBp ? doc.splitTextToSize(`•  ${nextBp}`, pageWidth - margin * 2 - 5) : [];
            const nextHeight = nextLines.length * 5 + 1;
            const shouldBreak = currentY + bulletHeight > 260 ||
                (!isLastBullet && currentY + bulletHeight + nextHeight > 265 && currentY + bulletHeight <= 260 && nextHeight > 0 && currentY > margin + 40);
            if (shouldBreak) { doc.addPage(); currentY = margin; }
            doc.text(bulletStr, margin + 5, currentY, { align: 'justify', maxWidth: pageWidth - margin * 2 - 5, lineHeightFactor: 1.5 });
            currentY += bulletHeight;
        });
        currentY += 8;

        // 4. ESQUEMA ORGANIZACIONAL
        if (currentY + 60 > 270) { doc.addPage(); currentY = margin; }
        addText('4. ESQUEMA ORGANIZACIONAL', 10, 'bold', 'left');
        currentY += 2;
        addText('Para que la Unidad Interna de Protección Civil logre los objetivos y desempeñe las funciones antes descritas, contará con la estructura organizacional.', 10, 'normal', 'justify');
        currentY += 4;
        addText(`Se firma la presente ACTA CONSTITUTIVA de la Unidad Interna de Protección Civil, por sus integrantes, en el lugar y fecha indicados, siendo las ${docInfo.time_end || ''} horas.`, 10, 'normal', 'justify');
        currentY += 4;

        // Same blank rows as section 2 but FIRMA column is blank
        const table2Body: string[][] = Array.from({ length: count }, (_, i) =>
            i === 0
                ? ['', 'REPRESENTANTE LEGAL', '']
                : ['', 'MULTIBRIGADA', '']
        );

        autoTable(doc, {
            startY: currentY,
            head: [['NOMBRE', 'PUESTO EN LA EMPRESA', 'FIRMA']],
            body: table2Body,
            theme: 'grid',
            headStyles: { fillColor: [232, 232, 232], textColor: 0, fontStyle: 'bold', halign: 'center' },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: 0, valign: 'middle', minCellHeight: 15 },
            columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 } },
            margin: { left: margin, right: margin }
        });

        const fileName = generatePdfName('ACTA CONSTITUTIVA BLANK', docInfo.commercial_name || 'DOCUMENTO', docInfo.date);

        const pdfBlob = doc.output('blob');

        if (preview) {
            return URL.createObjectURL(pdfBlob);
        }

        await savePdf(pdfBlob, `${fileName}.pdf`, `Acta Constitutiva (Para Firmar) - ${docInfo.commercial_name}`);
    } catch (e: any) {
        console.error('Fatal PDF Error:', e);
        Swal.fire({
            icon: 'error',
            title: 'Error de PDF',
            text: 'Hubo un error al generar el Acta Constitutiva para firmar.',
            confirmButtonColor: '#722F37'
        });
    }
};
