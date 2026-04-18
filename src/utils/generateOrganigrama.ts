import { jsPDF } from 'jspdf';
import { DocumentInfo, Employee } from '../types';
import { sortEmployees } from './employees';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';
import Swal from 'sweetalert2';

const DARK: [number, number, number] = [11, 21, 42];
const LIGHT: [number, number, number] = [236, 242, 248];
const BORDER: [number, number, number] = [180, 196, 215];
const LINE: [number, number, number] = [60, 80, 110];

const TITLE_H = 13;
const NAME_H = 12;
const NODE_H = TITLE_H + NAME_H;
const MAX_PER_ROW = 4;
const NODE_GAP = 5;
const ROW_VERT_GAP = 16;

export const generateOrganigrama = async (
    docInfo: DocumentInfo,
    employees: Employee[],
    preview = false
): Promise<string | void> => {
    try {
        const sorted = sortEmployees(employees);
        if (sorted.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Sin empleados', text: 'No hay firmas registradas en esta acta.', confirmButtonColor: '#0B152A' });
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 15;

        const jefe = sorted[0];
        const multis = sorted.slice(1);
        const rows: Employee[][] = [];
        for (let i = 0; i < multis.length; i += MAX_PER_ROW) {
            rows.push(multis.slice(i, i + MAX_PER_ROW));
        }

        // ── helpers ──────────────────────────────────────────────────────────
        const drawNode = (nx: number, ny: number, nw: number, titleText: string, nameText: string) => {
            doc.setFillColor(...DARK);
            doc.roundedRect(nx, ny, nw, TITLE_H, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            const tLines = doc.splitTextToSize(titleText, nw - 4);
            const tLH = 6.5 * 0.3527 * 1.25;
            const tStart = ny + (TITLE_H - tLines.length * tLH) / 2 + tLH * 0.75;
            doc.text(tLines, nx + nw / 2, tStart, { align: 'center', lineHeightFactor: 1.25 });

            doc.setFillColor(...LIGHT);
            doc.setDrawColor(...BORDER);
            doc.setLineWidth(0.3);
            doc.roundedRect(nx, ny + TITLE_H, nw, NAME_H, 2, 2, 'FD');
            doc.setTextColor(20, 30, 55);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            const nLines = doc.splitTextToSize(nameText, nw - 4);
            const nLH = 6.5 * 0.3527 * 1.25;
            const nStart = ny + TITLE_H + (NAME_H - nLines.length * nLH) / 2 + nLH * 0.75;
            doc.text(nLines, nx + nw / 2, nStart, { align: 'center', lineHeightFactor: 1.25 });
        };

        const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
            doc.setDrawColor(...LINE);
            doc.setLineWidth(0.35);
            doc.line(x1, y1, x2, y2);
        };

        // ── Header ───────────────────────────────────────────────────────────
        let y = margin;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text('ORGANIGRAMA', pageW / 2, y, { align: 'center' });
        y += 5;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text('UNIDAD INTERNA DE PROTECCIÓN CIVIL', pageW / 2, y, { align: 'center' });
        y += 4.5;
        doc.setFont('helvetica', 'bold');
        doc.text((docInfo.commercial_name || '').toUpperCase(), pageW / 2, y, { align: 'center' });
        y += 7;

        // ── Jefe ─────────────────────────────────────────────────────────────
        const jefeW = 62;
        const jefeX = (pageW - jefeW) / 2;
        drawNode(jefeX, y, jefeW, 'JEFE DE BRIGADA DE EMERGENCIA MULTIFUNCIONAL', jefe.name.toUpperCase());

        const jefeCX = jefeX + jefeW / 2;
        let spineY = y + NODE_H; // top of the next available space (bottom of jefe)
        y = spineY;

        // ── Rows — all connect from jefeCX ───────────────────────────────────
        const multiW = (() => {
            const maxCount = Math.min(rows[0]?.length ?? 0, MAX_PER_ROW);
            if (maxCount === 0) return 42;
            const available = pageW - 2 * margin;
            return Math.min(42, (available - (maxCount - 1) * NODE_GAP) / maxCount);
        })();

        rows.forEach((row) => {
            const count = row.length;
            const rowW = count * multiW + (count - 1) * NODE_GAP;
            const rowX = (pageW - rowW) / 2;
            const rowY = spineY + ROW_VERT_GAP;
            const junctionY = spineY + ROW_VERT_GAP / 2;

            const firstCX = rowX + multiW / 2;
            const lastCX = rowX + (count - 1) * (multiW + NODE_GAP) + multiW / 2;

            // Vertical spine from jefe center down to junction (always from jefeCX)
            drawLine(jefeCX, spineY, jefeCX, junctionY);
            // Horizontal spanning all nodes in this row
            drawLine(Math.min(jefeCX, firstCX), junctionY, Math.max(jefeCX, lastCX), junctionY);
            // Vertical drop to each node
            row.forEach((emp, idx) => {
                const cx = rowX + idx * (multiW + NODE_GAP) + multiW / 2;
                drawLine(cx, junctionY, cx, rowY);
                drawNode(rowX + idx * (multiW + NODE_GAP), rowY, multiW, 'MULTIBRIGADA', emp.name.toUpperCase());
            });

            spineY = rowY + NODE_H; // next spine starts from bottom of this row
            y = spineY;
        });

        // ── Footer ───────────────────────────────────────────────────────────
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 170);
        doc.setFont('helvetica', 'normal');
        doc.text('HOJA 1 DE 1', pageW - margin, pageH - 8, { align: 'right' });

        // ── Output ───────────────────────────────────────────────────────────
        const blob = doc.output('blob');
        if (preview) return URL.createObjectURL(blob);

        const fileName = generatePdfName('ORGANIGRAMA', docInfo.commercial_name || 'DOCUMENTO', docInfo.date);
        await savePdf(blob, `${fileName}.pdf`, `Organigrama - ${docInfo.commercial_name}`);

    } catch (e: any) {
        console.error('Error generando organigrama:', e);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un error al generar el organigrama.',
            confirmButtonColor: '#722F37'
        });
    }
};
