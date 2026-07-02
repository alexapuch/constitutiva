import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';

export const ACTIVITIES_LIST = [
  "INTEGRACIÓN DEL COMITÉ INTERNO DE PROTECCIÓN CIVIL",
  "REVISIÓN DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL (CADA EJERCICIO DE SIMULACRO)",
  "PLÁTICAS Y ACCIONES DE DIFUSIÓN REFERENTES A LA PROTECCIÓN CIVIL",
  "REVISIÓN DE LA INTEGRIDAD DEL INMUEBLE (1 VEZ AL AÑO)",
  "REVISIÓN DE LA INSTALACIÓN ELÉCTRICA, INCLUYENDO LUCES DE EMERGENCIA (MENSUAL)",
  "REVISIÓN DE RUTAS DE EVACUACIÓN Y SALIDAS DE EMERGENCIA (DIARIO)",
  "REVISIÓN INSTALACIÓN SANITARIA (MENSUAL)",
  "REVISIÓN DE EXTINTORES (MENSUAL)",
  "REVISIÓN DE EQUIPO CONTRA INCENDIO Y PRIMEROS AUXILIOS (MENSUAL)",
  "MANTENIMIENTO Y RECARGA DEL EQUIPO CONTRA INCENDIOS (ANUAL)",
  "RECORRIDO DE SEGURIDAD EN EL INMUEBLE (BIMESTRAL)",
  "CAPACITACIÓN EN MATERIA DE PROTECCIÓN CIVIL A TODO EL PERSONAL (ANUAL)",
  "CURSO DE PREVENCIÓN Y PROTECCIÓN CONTRA INCENDIO (ANUAL)",
  "CURSO DE PRIMEROS AUXILIOS (ANUAL)",
  "CURSO DE EVACUACIÓN, BÚSQUEDA Y RESCATE (ANUAL)",
  "PLÁTICAS DE SEGURIDAD Y PROTECCIÓN CIVIL (ANUAL)",
  "SIMULACRO DE EMERGENCIA EN EL CENTRO DE TRABAJO, MANEJO DE LA EMERGENCIA Y EVACUACIÓN (SEMESTRAL)",
  "REVISIÓN DE SEÑALES Y AVISOS (MENSUAL)",
  "ACTUALIZACIÓN DE DIRECTORIO E INVENTARIO (SEMESTRAL)",
  "RENOVACIÓN POLIZA DE SEGURO",
  "MANTENIMIENTO DETECTORES DE HUMO (MENSUAL)"
];

export const MONTHS_LIST = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

export interface CalendarioData {
  commercialName: string;
  year: string;
  grid: boolean[][]; // [activityIndex][monthIndex]
}

export const generateCalendarioPDF = async (
  data: CalendarioData,
  preview: boolean = false
): Promise<string | void> => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(11, 44, 94); // Dark blue
  doc.text(`CALENDARIO DE ACTIVIDADES DE PROTECCIÓN CIVIL - ${data.year}`, pageWidth / 2, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(data.commercialName, pageWidth / 2, 22, { align: 'center' });

  // Tabla
  const head = [['ACTIVIDAD', ...MONTHS_LIST, 'RESPONSABLE', 'EVIDENCIA\nDOCUMENTAL']];
  
  const body = ACTIVITIES_LIST.map((activity, rIdx) => {
    let evidencia = "REPORTE";
    if (rIdx === 2) evidencia = "EVIDENCIA FOTOGRÁFICA";
    if (rIdx >= 12 && rIdx <= 14) evidencia = "CONSTANCIAS";
    return [
      activity,
      ...MONTHS_LIST.map((_, cIdx) => data.grid[rIdx][cIdx] ? 'X' : ''),
      '',
      evidencia
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 44, 94], // Dark blue header
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'bottom',
      minCellHeight: 25,
      fontSize: 7,
      cellPadding: 1,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.3
    },
    columnStyles: {
      0: { cellWidth: 90, halign: 'left', fillColor: [240, 248, 255] }, // Activity col
      13: { cellWidth: 28, halign: 'center' }, // Responsable
      14: { cellWidth: 25, halign: 'center' } // Evidencia
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      cellPadding: 1.2,
    },
    didParseCell: function (data) {
      if (data.section === 'head' && data.column.index > 0 && data.column.index <= 12) {
        data.cell.text = []; // Clear header text, we draw it manually rotated
      }
      if (data.section === 'head' && data.column.index >= 13) {
        data.cell.styles.halign = 'center';
        data.cell.styles.valign = 'middle';
      }
      if (data.section === 'body') {
        if (data.column.index > 0 && data.column.index <= 12) {
          data.cell.styles.halign = 'center';
          data.cell.styles.valign = 'middle';
          // If it's an 'X', we fill the cell and remove the 'X' text
          if (data.cell.raw === 'X') {
            data.cell.styles.fillColor = [153, 194, 230]; // Light blue from image
            data.cell.text = []; // Clear the text so it's just a colored block
          } else {
            data.cell.styles.fillColor = [255, 255, 255];
          }
        } else if (data.column.index >= 13) {
          data.cell.styles.halign = 'center';
          data.cell.styles.valign = 'middle';
          data.cell.styles.fillColor = [255, 255, 255];
        }
      }
    },
    didDrawCell: function (data) {
      if (data.section === 'head' && data.column.index > 0 && data.column.index <= 12) {
        // Draw vertical text
        const text = MONTHS_LIST[data.column.index - 1];
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        
        // Calculate center of cell
        const x = data.cell.x + data.cell.width / 2 + 2;
        const y = data.cell.y + data.cell.height - 2;
        
        doc.text(text, x, y, { angle: 90 });
      }
    },
    margin: { top: 25, bottom: 10, left: 10, right: 10 },
  });

  const pdfName = generatePdfName('CALENDARIO', data.commercialName, data.year);
  
  const blob = doc.output('blob');
  
  if (preview) {
    return URL.createObjectURL(blob);
  }

  await savePdf(blob, pdfName);
};
