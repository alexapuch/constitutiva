import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { FIRMA_JORGE_BASE64 } from './firmaJorge';
import { generatePdfName } from './pdfNameGenerator';

export interface IncendioPDFData {
  companyName: string;
  representativeName: string;
  commercialName: string;
  giro: string;
  fecha: string; // e.g. "05 DE MAYO DEL 2026"

  // Dirección
  direccion: string;

  // Inmueble por nivel
  sotanoSi: boolean;
  sotanoM2: string;
  nivel1Si: boolean;
  nivel1M2: string;
  nivel2Si: boolean;
  nivel2M2: string;
  nivel3Si: boolean;
  nivel3M2: string;
  azoteaSi: boolean;
  azoteaM2: string;

  m2Construccion: string;
  m2Superficie: string;

  antiguedad: string;
  poblacionFija: string;
  poblacionFlotante: string;

  // Conceptos
  gasesInflamables: string;    // Litros
  liquidosInflamables: string; // Litros
  liquidosCombustibles: string; // Litros
  solidosCombustibles: string;  // Kgs
  materialesPiroforicos: string; // Kgs
}

// ─── Design constants ────────────────────────────────────────────────────────
const NAVY  = [18, 52, 86]  as const;  // #123456 — same as Riesgos header
const WHITE = [255, 255, 255] as const;
const BLACK = [0, 0, 0]     as const;
const LIGHT_BG = [240, 244, 248] as const; // subtle blue-grey tint

export const generateIncendioPDF = async (
  data: IncendioPDFData,
  preview: boolean = false,
): Promise<string | void> => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    const docWidth  = doc.internal.pageSize.getWidth();
    const margin    = 15;
    const w         = docWidth - margin * 2; // 186 mm usable

    // ── Font helpers ──
    const setBold   = (size: number) => { doc.setFont('helvetica', 'bold');   doc.setFontSize(size); };
    const setNormal = (size: number) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); };
    const setColor  = (rgb: readonly [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setFill   = (rgb: readonly [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const setDraw   = (rgb: readonly [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

    let y = 15;

    // ── TITLE BANNER ──────────────────────────────────────────────────────────
    setFill(NAVY);
    doc.rect(margin, y - 6, w, 11, 'F');
    setBold(12);
    setColor(WHITE);
    doc.text('ANÁLISIS DE RIESGO DE INCENDIO', docWidth / 2, y, { align: 'center' });
    setColor(BLACK);
    y += 9;

    // ── INFO FIELD helper (same style as Riesgos) ────────────────────────────
    const drawInfoField = (label: string, value: string, labelW: number = 55): void => {
      setBold(8.5);
      setColor(NAVY);
      doc.text(label, margin, y);
      setColor(BLACK);
      const lines = doc.splitTextToSize((value || '').toUpperCase(), w - labelW);
      doc.text(lines, margin + labelW, y);
      const lineY = y + 1 + (lines.length - 1) * 3.5;
      setDraw([200, 200, 200]);
      doc.line(margin + labelW, lineY, margin + w, lineY);
      setDraw(BLACK);
      y = lineY + 4;
    };

    // ── DATOS GENERALES ───────────────────────────────────────────────────────
    drawInfoField('NOMBRE COMERCIAL:', data.commercialName, 40);
    drawInfoField('RAZÓN SOCIAL:', data.companyName, 40);
    drawInfoField('REPRESENTANTE LEGAL:', data.representativeName || data.companyName, 55);
    drawInfoField('DOMICILIO:', data.direccion, 22);
    drawInfoField('ACTIVIDAD O GIRO:', data.giro, 35);
    y += 2;

    // ── POPULATION / AREA COMPACT ROW ────────────────────────────────────────
    setNormal(8.5);
    setColor(NAVY); setBold(8.5);
    doc.text('SUPERFICIE CONSTRUIDA:', margin, y);
    setColor(BLACK); setNormal(8.5);
    doc.text(`${data.m2Construccion} M²`, margin + 40, y);

    setColor(NAVY); setBold(8.5);
    doc.text('ANTIGÜEDAD:', margin + 75, y);
    setColor(BLACK); setNormal(8.5);
    doc.text(`${data.antiguedad} AÑOS`, margin + 95, y);

    setColor(NAVY); setBold(8.5);
    doc.text('POB. FIJA:', margin + 130, y);
    setColor(BLACK); setNormal(8.5);
    doc.text(data.poblacionFija, margin + 150, y);

    setColor(NAVY); setBold(8.5);
    doc.text('/ FLOTANTE:', margin + 162, y);
    setColor(BLACK); setNormal(8.5);
    doc.text(data.poblacionFlotante, margin + 180, y);
    setColor(BLACK);
    y += 8;

    // ── SECTION HEADER helper ─────────────────────────────────────────────────
    const drawSectionHeader = (title: string): void => {
      setFill(NAVY);
      doc.rect(margin, y, w, 6, 'F');
      setBold(9);
      setColor(WHITE);
      doc.text(title, margin + 2, y + 4.3);
      setColor(BLACK);
      y += 6;
    };

    // ── TABLE ROW helpers ─────────────────────────────────────────────────────
    const COL_LABEL_W  = 100; // description column width
    const COL_VAL_W    = 20;  // result / value column
    const COL_FORM_W   = 28;  // formula column
    const COL_FACT_W   = 20;  // factor column
    const COL_RIESGO_W = 18;  // last column

    const xLabel  = margin;
    const xVal    = xLabel  + COL_LABEL_W;
    const xForm   = xVal    + COL_VAL_W;
    const xFact   = xForm   + COL_FORM_W;
    const xRiesgo = xFact   + COL_FACT_W;

    const ROW_H = 7;

    const drawConceptTableHeader = (): void => {
      setFill(NAVY);
      doc.rect(xLabel, y, w, 5, 'F');
      setBold(7.5);
      setColor(WHITE);
      doc.text('CONCEPTO',  xLabel + 2,          y + 3.8);
      doc.text('RESULTADO', xVal   + COL_VAL_W /2, y + 3.8, { align: 'center' });
      doc.text('FÓRMULA',   xForm  + COL_FORM_W/2, y + 3.8, { align: 'center' });
      doc.text('FACTOR',    xFact  + COL_FACT_W/2, y + 3.8, { align: 'center' });
      doc.text('NIVEL',     xRiesgo + COL_RIESGO_W/2, y + 3.8, { align: 'center' });
      setColor(BLACK);
      y += 5;
    };

    const drawConceptRow = (
      label: string,
      result: string,
      formula: string,
      factor: string,
      rowSpan: number = 1, // for cells that span two rows (solidos)
    ): void => {
      const h = ROW_H * rowSpan;
      setDraw([200, 200, 200]);
      doc.rect(xLabel,  y, COL_LABEL_W,  h, 'S');
      doc.rect(xVal,    y, COL_VAL_W,    h, 'S');
      doc.rect(xForm,   y, COL_FORM_W,   h, 'S');
      doc.rect(xFact,   y, COL_FACT_W,   h, 'S');
      setDraw(BLACK);

      setNormal(7.5);
      const labelLines = doc.splitTextToSize(label, COL_LABEL_W - 3);
      doc.text(labelLines, xLabel + 2, y + (h / 2) - (labelLines.length - 1) * 1.5 + 2);

      setBold(8.5);
      doc.text(result, xVal  + COL_VAL_W /2, y + h/2 + 1.5, { align: 'center' });
      setNormal(7.5);
      doc.text(formula, xForm + COL_FORM_W/2, y + h/2 + 1.5, { align: 'center' });
      setBold(8.5);
      doc.text(factor,  xFact + COL_FACT_W/2, y + h/2 + 1.5, { align: 'center' });

      y += h;
    };

    // ── CALCULATIONS ──────────────────────────────────────────────────────────
    const m2ConstNum   = parseFloat(data.m2Construccion)     || 0;
    const gasNum       = parseFloat(data.gasesInflamables)   || 0;
    const liqInfNum    = parseFloat(data.liquidosInflamables)|| 0;
    const liqCombNum   = parseFloat(data.liquidosCombustibles)||0;
    const solCombNum   = parseFloat(data.solidosCombustibles)|| 0;
    const fixedPopNum  = parseInt(data.poblacionFija)         || 0;
    const piroNum      = parseFloat(data.materialesPiroforicos)||0;

    const f1 = parseFloat((m2ConstNum / 3000).toFixed(2));
    const f2 = parseFloat((gasNum     / 3000).toFixed(2));
    const f3 = parseFloat((liqInfNum  / 1400).toFixed(2));
    const f4 = parseFloat((liqCombNum / 2000).toFixed(2));
    const solidTotal   = solCombNum + fixedPopNum * 60;
    const f5 = parseFloat((solidTotal  / 15000).toFixed(2));
    const f6 = parseFloat((piroNum     / 15000).toFixed(2));
    const totalGrado   = parseFloat((f1+f2+f3+f4+f5+f6).toFixed(2));
    const esAlto       = totalGrado >= 1.0;

    // ── DATOS DEL INMUEBLE POR NIVEL ──────────────────────────────────────────
    drawSectionHeader('DATOS DEL INMUEBLE POR NIVEL');

    // Left block: level table
    const levelTableX = margin;
    const levelColW   = [50, 18, 18, 22]; // Label | SI | NO | M²
    const levelRowH   = 6;
    const levelStartY = y;

    // Header row
    setFill(NAVY);
    const lhTotal = levelColW.reduce((a, b) => a + b, 0);
    doc.rect(levelTableX, y, lhTotal, levelRowH, 'F');
    setBold(7.5);
    setColor(WHITE);
    doc.text('NIVEL',  levelTableX + 2,                 y + 4.2);
    doc.text('SÍ',     levelTableX + levelColW[0] + 5,  y + 4.2);
    doc.text('NO',     levelTableX + levelColW[0] + levelColW[1] + 5,  y + 4.2);
    doc.text('M²',     levelTableX + levelColW[0] + levelColW[1] + levelColW[2] + 6,  y + 4.2);
    setColor(BLACK);
    y += levelRowH;

    const drawLevelRow = (label: string, si: boolean, m2Val: string): void => {
      setDraw([200, 200, 200]);
      doc.rect(levelTableX, y, lhTotal, levelRowH, 'S');
      setNormal(7.5);
      doc.text(label, levelTableX + 2, y + 4.2);
      setBold(8);
      const siX  = levelTableX + levelColW[0]                               + levelColW[1]/2;
      const noX  = levelTableX + levelColW[0] + levelColW[1]                + levelColW[2]/2;
      const m2X  = levelTableX + levelColW[0] + levelColW[1] + levelColW[2] + levelColW[3]/2;
      doc.text(si ? 'X' : '',  siX, y + 4.2, { align: 'center' });
      doc.text(!si ? 'X' : '', noX, y + 4.2, { align: 'center' });
      doc.text(si ? m2Val : '—', m2X, y + 4.2, { align: 'center' });
      // column dividers
      setDraw(NAVY);
      [levelColW[0], levelColW[0]+levelColW[1], levelColW[0]+levelColW[1]+levelColW[2]].forEach(dx => {
        doc.line(levelTableX + dx, y, levelTableX + dx, y + levelRowH);
      });
      setDraw(BLACK);
      y += levelRowH;
    };

    drawLevelRow('SÓTANO',      data.sotanoSi, data.sotanoM2);
    drawLevelRow('1er. Nivel',  data.nivel1Si, data.nivel1M2);
    drawLevelRow('2do. Nivel',  data.nivel2Si, data.nivel2M2);
    drawLevelRow('3er. Nivel',  data.nivel3Si, data.nivel3M2);
    drawLevelRow('Azotea',      data.azoteaSi, data.azoteaM2);

    // Totals
    const drawLevelTotal = (label: string, val: string): void => {
      setFill(LIGHT_BG);
      setDraw(NAVY);
      doc.rect(levelTableX, y, lhTotal, levelRowH, 'FD');
      setBold(7.5);
      setColor(NAVY);
      doc.text(label, levelTableX + 2, y + 4.2);
      doc.text(val, levelTableX + lhTotal - 2, y + 4.2, { align: 'right' });
      setColor(BLACK); setDraw(BLACK);
      y += levelRowH;
    };
    drawLevelTotal('TOTAL M² CONSTRUCCIÓN', data.m2Construccion);
    drawLevelTotal('TOTAL M² SUPERFICIE',   data.m2Superficie);

    const afterLevelTableY = y;

    // Right block: population / age (position next to the level table)
    const rightBlockX = levelTableX + lhTotal + 6;
    const rightBlockW = w - lhTotal - 6;
    let   rY          = levelStartY;

    const drawInfoBox = (title: string, sub: string, val: string): void => {
      setFill(LIGHT_BG);
      setDraw(NAVY);
      doc.rect(rightBlockX, rY, rightBlockW, 14, 'FD');
      setBold(7);
      setColor(NAVY);
      doc.text(title, rightBlockX + rightBlockW / 2, rY + 4, { align: 'center' });
      setNormal(6.5);
      setColor([80, 80, 80]);
      doc.text(sub, rightBlockX + rightBlockW / 2, rY + 7.5, { align: 'center' });
      setBold(11);
      setColor(NAVY);
      doc.text(val, rightBlockX + rightBlockW / 2, rY + 12.5, { align: 'center' });
      setColor(BLACK); setDraw(BLACK);
      rY += 16;
    };

    drawInfoBox('ANTIGÜEDAD', 'AÑOS', data.antiguedad);
    drawInfoBox('POBLACIÓN FIJA', 'PERSONAS', data.poblacionFija);
    drawInfoBox('POBLACIÓN FLOTANTE', 'PERSONAS', data.poblacionFlotante);

    y = Math.max(afterLevelTableY, rY) + 8;

    // ── TABLA DE CONCEPTOS ────────────────────────────────────────────────────
    drawSectionHeader('INVENTARIO DE MATERIALES Y CÁLCULO DE RIESGO');

    // Draw Riesgo header over the last column (before row loop)
    const conceptTableStartY = y;
    drawConceptTableHeader();

    // Rows 1-4
    drawConceptRow(
      'SUPERFICIE CONSTRUIDA',
      data.m2Construccion,
      `${data.m2Construccion} / 3000`,
      f1.toFixed(2),
    );
    drawConceptRow(
      'INVENTARIO GASES INFLAMABLES (LITROS)',
      data.gasesInflamables,
      `${data.gasesInflamables} / 3000`,
      f2.toFixed(2),
    );
    drawConceptRow(
      'INVENTARIO DE LÍQUIDOS INFLAMABLES (LITROS)',
      data.liquidosInflamables,
      `${data.liquidosInflamables} / 1400`,
      f3.toFixed(2),
    );
    drawConceptRow(
      'INVENTARIO DE LÍQUIDOS COMBUSTIBLES (LITROS)',
      data.liquidosCombustibles,
      `${data.liquidosCombustibles} / 2000`,
      f4.toFixed(2),
    );

    // Row 5 — Sólidos (spans 2 visual sub-rows)
    const solidStartY = y;

    setDraw([200, 200, 200]);
    doc.rect(xLabel, y, COL_LABEL_W, ROW_H, 'S');
    doc.rect(xVal,   y, COL_VAL_W,   ROW_H, 'S');
    doc.rect(xForm,  y, COL_FORM_W,  ROW_H, 'S');
    doc.rect(xFact,  y, COL_FACT_W,  ROW_H, 'S');
    setNormal(7.5);
    doc.text('INVENTARIO DE SÓLIDOS COMBUSTIBLES INCL. MOBILIARIO (KG)', xLabel + 2, y + 4.5);
    setBold(8.5);
    doc.text(data.solidosCombustibles, xVal + COL_VAL_W / 2, y + 4.5, { align: 'center' });
    y += ROW_H;

    setDraw([200, 200, 200]);
    doc.rect(xLabel, y, COL_LABEL_W, ROW_H, 'S');
    doc.rect(xVal,   y, COL_VAL_W,   ROW_H, 'S');
    doc.rect(xForm,  y, COL_FORM_W,  ROW_H, 'S');
    doc.rect(xFact,  y, COL_FACT_W,  ROW_H, 'S');
    setNormal(7.5);
    doc.text(`+ CADA PERSONA FIJA (${data.poblacionFija} × 60 KG)`, xLabel + 2, y + 4.5);
    setBold(8.5);
    doc.text(String(fixedPopNum * 60),        xVal  + COL_VAL_W  / 2, y + 4.5, { align: 'center' });
    setNormal(7.5);
    doc.text(`${solidTotal} / 15000`,         xForm + COL_FORM_W / 2, y + 4.5, { align: 'center' });
    setBold(8.5);
    doc.text(f5.toFixed(2),                   xFact + COL_FACT_W / 2, y + 4.5, { align: 'center' });
    y += ROW_H;

    // Riesgo column spanning rows 5+6
    setDraw([200, 200, 200]);
    doc.rect(xRiesgo, solidStartY, COL_RIESGO_W, ROW_H * 2, 'S');
    setDraw(BLACK);

    // Row 6 — Piroforicos
    drawConceptRow(
      'MATERIALES PIROFÓRICOS Y EXPLOSIVOS (KG)',
      data.materialesPiroforicos,
      `${data.materialesPiroforicos} / 15000`,
      f6.toFixed(2),
    );

    // The riesgo column for rows 1-4 + pirofóricos was left open → close with the full-span rect
    const conceptTableEndY = y;
    // Draw the "NIVEL DE RIESGO" spanning cell for rows 1-4 and piroforicos
    // We close only the last column with a vertical span over ALL rows
    setDraw([200, 200, 200]);
    doc.rect(xRiesgo, conceptTableStartY + 5 /* skip header */, COL_RIESGO_W, conceptTableEndY - conceptTableStartY - 5, 'S');
    setDraw(BLACK);

    // Risk level label (vertical centre of the big rect)
    const midRiesgoY = conceptTableStartY + 5 + (conceptTableEndY - conceptTableStartY - 5) / 2;
    setBold(14);
    const riesgoColor: readonly [number, number, number] = esAlto ? [180, 20, 20] : [18, 100, 50];
    setColor(riesgoColor);
    doc.text(esAlto ? 'ALTO' : 'BAJO', xRiesgo + COL_RIESGO_W / 2, midRiesgoY + 2, { align: 'center' });
    setColor(BLACK);

    y += 5;

    // ── TOTAL GRADO INCENDIO banner ────────────────────────────────────────────
    const isHighColor: readonly [number, number, number] = esAlto ? [160, 30, 30] : [18, 100, 50];
    setFill(isHighColor);
    doc.rect(margin, y, w, 9, 'F');
    setBold(10);
    setColor(WHITE);
    doc.text('TOTAL GRADO DE INCENDIO:', margin + 4, y + 6);
    doc.text(totalGrado.toFixed(2), margin + w - 4, y + 6, { align: 'right' });
    setColor(BLACK);
    y += 14;

    // ── CONCLUSION ────────────────────────────────────────────────────────────
    drawSectionHeader('CONCLUSIÓN');

    // Highlighted conclusion box
    setFill(LIGHT_BG);
    setDraw(NAVY);
    doc.rect(margin, y, w, 22, 'FD');

    setNormal(8.5);
    const conclusionText =
      `DE ACUERDO A LOS RESULTADOS OBTENIDOS EN LA APLICACIÓN DE ESTE CRITERIO, LA EMPRESA TIENE UN RIESGO DE INCENDIO ${esAlto ? 'ALTO' : 'BAJO'}. ` +
      `EL VALOR OBTENIDO ES DE ${totalGrado.toFixed(2)}, QUE ES ${esAlto ? 'MAYOR O IGUAL A 1 (RIESGO ALTO)' : 'MENOR A 1 (RIESGO BAJO)'}.`;
    const conclusionLines = doc.splitTextToSize(conclusionText, w - 6);
    doc.text(conclusionLines, margin + 3, y + 5, { lineHeightFactor: 1.5 });
    y += 26;

    setNormal(8.5);
    doc.text(`ESTA DETERMINACIÓN FUE ELABORADA EL ${data.fecha.toUpperCase()}`, margin, y);
    y += 14;

    // ── FIRMA ─────────────────────────────────────────────────────────────────
    doc.addImage(FIRMA_JORGE_BASE64, 'PNG', margin + 10, y - 4.5, 52, 25);
    y += 19;
    setBold(9);
    doc.text('ELABORÓ: JORGE HUMBERTO MEZA CONTRERAS', margin, y);
    setNormal(8.5);
    doc.text('REGISTRO: MPDC/SPCPRyB/AUT-DT/RPS/028/2026', margin, y + 4);

    // ── OUTPUT ────────────────────────────────────────────────────────────────
    const fileName = generatePdfName('ANALISIS INCENDIO', data.commercialName, data.fecha);
    const pdfBlob  = doc.output('blob');

    if (preview) return URL.createObjectURL(pdfBlob);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
      try { await navigator.share({ files: [file] }); }
      catch (err: any) { if (err.name !== 'AbortError') throw err; }
    } else {
      doc.save(`${fileName}.pdf`);
    }

  } catch (error: any) {
    console.error('Error generating Incendio PDF:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al generar PDF',
      text: `Hubo un error al crear el PDF: ${error.message}`,
      confirmButtonColor: '#722F37',
    });
  }
};
