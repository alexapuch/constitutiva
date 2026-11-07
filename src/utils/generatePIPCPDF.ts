import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pdfjs } from 'react-pdf';
import Swal from 'sweetalert2';
import { DocumentInfo, Employee, RiskData } from '../types';
import { FIRMA_JORGE_BASE64 } from './firmaJorge';
import { sortEmployees } from './employees';
import { generateConstitutivaPDF } from './generateConstitutivaPDF';
import { generateSimulacroPDF } from './generateSimulacroPDF';
import { generateRiesgosPDF, RiesgosPDFData } from './generateRiesgosPDF';
import { generateIncendioPDF, IncendioPDFData } from './generateIncendioPDF';
import { ACTIVITIES_LIST, MONTHS_LIST } from './generateCalendarioPDF';
import {
  InternalRisksSection,
  buildDefaultRiesgosData,
  buildDefaultIncendioData,
  buildDefaultCalendarioGrid
} from './pipcTemplates';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';
import {
  resolveRiskPhotoAsJpegDataUrl,
  generateCroquis250mDataUrl,
  loadCrossOriginImage
} from './generateCroquis250mImage';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface PuntosCriticosData {
  brigadaPrimerosAuxilios: boolean;
  combateIncendios: boolean;
  equipoContraIncendios: boolean;
  equipoPrimerosAuxilios: boolean;
  alarma: boolean;
  rutasEvacuacion: boolean;
  salidasEmergencia: boolean;
  alarmaSonora: boolean;
  notaCorrectiva: string;
}

export interface PIPCPDFConfig {
  docInfo: DocumentInfo;
  employees: Employee[];

  // Pág. 1 y 5: Datos de la Empresa
  razonSocial: string;
  nombreComercial: string;
  representanteLegal: string;
  direccion: string;
  municipio: string;
  estado: string;
  rfc: string;
  horario: string;
  numTrabajadores: string;
  afluenciaClientes: string;
  telefono: string;
  m2Construccion: string;
  giro: string;
  anio: string;

  // Pág. 6: Croquis de Ubicación
  coordenadas: string;
  croquisUbicacionImg?: string; // base64 o data URL

  // Pág. 7: Riesgos Circundantes
  riesgosCircundantesMode: 'table' | 'images';
  riesgosCircundantesList: RiskData[];
  riesgosCircundantesImgs: string[]; // si el usuario pega capturas

  // Pág. 8: Croquis Riesgos Circundantes
  croquisCircundantesImg?: string;
  simbologiaItems: { label: string; color: string }[];

  // Pág. 45: Actividad Económica y Puntos Críticos
  actividadEconomicaText: string;
  puntosCriticos: PuntosCriticosData;

  // Pág. 46: Riesgos Internos
  riesgosInternos: InternalRisksSection;

  // Pág. 54+: Inventario Señaléticas y Equipos de Emergencia
  inventarioImgs: string[]; // imágenes pegadas por el usuario (o usa las del machote si está vacío y useDefaultInventario=true)
  useDefaultInventarioIfEmpty?: boolean;

  // Estudios opcionales personalizados (si no se pasan, se autogeneran)
  riesgosData?: RiesgosPDFData;
  incendioData?: IncendioPDFData;
  calendarioGrid?: boolean[][];
  turnosSimulacro?: 'M' | 'MV' | 'MVN';

  onProgress?: (stepText: string, percent: number) => void;
}

/**
 * Renderiza una página de un documento PDF de pdfjs a un HTMLCanvasElement.
 */
async function renderPdfPageToCanvas(
  pdfDoc: any,
  pageNum: number,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  return canvas;
}

async function loadPdfDocument(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar el archivo PDF base (${res.status}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
}

/**
 * Convierte una URL de imagen (incluyendo URLs externas o dataURL) a DataURL base64.
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Obtiene las dimensiones naturales de una imagen en base64/dataURL.
 */
async function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
    img.onerror = () => resolve({ width: 800, height: 600 });
    img.src = dataUrl;
  });
}

export async function generatePIPCPDF(
  config: PIPCPDFConfig,
  preview: boolean = false
): Promise<string | void> {
  const report = (text: string, pct: number) => {
    if (config.onProgress) config.onProgress(text, Math.min(99, Math.max(1, Math.round(pct))));
  };

  try {
    report('Cargando plantilla base del PIPC...', 5);

    const templatePdf = await loadPdfDocument('/pipc-2026-template.pdf');

    // 1. Extraer el marco base limpio (borde café + marca de agua SEPRISA + ícono inferior derecho) desde la pág. 10
    report('Preparando marco institucional y marca de agua...', 10);
    const baseFrameCanvas = await renderPdfPageToCanvas(templatePdf, 10, 2.2);
    const frameCtx = baseFrameCanvas.getContext('2d')!;
    const fw = baseFrameCanvas.width;
    const fh = baseFrameCanvas.height;

    // Borrar el título "ACTA CONSTITUTIVA" de la pág. 10 para dejar solo el marco + marca de agua
    frameCtx.fillStyle = '#ffffff';
    frameCtx.fillRect(fw * 0.15, fh * 0.04, fw * 0.70, fh * 0.10);
    // Borrar el número "10" arriba del loguito inferior derecho
    frameCtx.fillRect(fw * 0.86, fh * 0.885, fw * 0.10, fh * 0.036);

    const blankFrameDataUrl = baseFrameCanvas.toDataURL('image/jpeg', 0.92);

    // Crear documento maestro jsPDF (Tamaño Carta vertical: 215.9 x 279.4 mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true
    });

    const pageW = doc.internal.pageSize.getWidth(); // 215.9
    const pageH = doc.internal.pageSize.getHeight(); // 279.4

    let currentPageNum = 1;

    // Helper para agregar el fondo institucional a la página actual
    const applyBlankFrameToCurrentPage = () => {
      doc.addImage(blankFrameDataUrl, 'JPEG', 0, 0, pageW, pageH, 'pipc_blank_frame', 'FAST');
    };

    // Helper para abrir una nueva página con el fondo institucional
    const addFramedPage = (): number => {
      doc.addPage();
      currentPageNum++;
      applyBlankFrameToCurrentPage();
      return currentPageNum;
    };

    // Helper para copiar una página estática del PDF machote (limpiando su número de página viejo)
    const addStaticTemplatePage = async (templatePageIndex: number): Promise<number> => {
      doc.addPage();
      currentPageNum++;
      const canvas = await renderPdfPageToCanvas(templatePdf, templatePageIndex, 2.0);
      const ctx = canvas.getContext('2d')!;
      // Tapar el número de página original arriba del loguito en la esquina inferior derecha
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(canvas.width * 0.87, canvas.height * 0.885, canvas.width * 0.09, canvas.height * 0.037);
      const imgData = canvas.toDataURL('image/jpeg', 0.88);
      doc.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
      return currentPageNum;
    };

    // Helper para incrustar todas las páginas de un sub-PDF (Acta, Riesgos, Incendio, Simulacro) dentro del marco PIPC
    const appendSubPdfWithFrame = async (
      subPdfBlobUrl: string,
      firstPageTitle?: string
    ): Promise<number> => {
      const subPdf = await loadPdfDocument(subPdfBlobUrl);
      const numSubPages = subPdf.numPages;
      let firstInsertedPage = currentPageNum + 1;

      for (let p = 1; p <= numSubPages; p++) {
        doc.addPage();
        currentPageNum++;

        // Componer sobre una copia de baseFrameCanvas usando 'multiply' para que se vea la marca de agua SEPRISA
        const compCanvas = document.createElement('canvas');
        compCanvas.width = fw;
        compCanvas.height = fh;
        const cCtx = compCanvas.getContext('2d')!;
        cCtx.drawImage(baseFrameCanvas, 0, 0);

        const subPageCanvas = await renderPdfPageToCanvas(subPdf, p, 2.2);

        const hasTopTitle = p === 1 && !!firstPageTitle;
        const destX = fw * 0.075;
        const destY = hasTopTitle ? fh * 0.105 : fh * 0.055;
        const destW = fw * 0.85;
        const destH = hasTopTitle ? fh * 0.81 : fh * 0.86;

        cCtx.save();
        cCtx.globalCompositeOperation = 'multiply';
        cCtx.drawImage(subPageCanvas, destX, destY, destW, destH);
        cCtx.restore();

        const mergedDataUrl = compCanvas.toDataURL('image/jpeg', 0.90);
        doc.addImage(mergedDataUrl, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');

        if (hasTopTitle && firstPageTitle) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text(firstPageTitle.toUpperCase(), pageW / 2, 23, { align: 'center' });
        }
      }

      try {
        URL.revokeObjectURL(subPdfBlobUrl);
      } catch {}

      return firstInsertedPage;
    };

    // Diccionario para guardar en qué página real cayó cada sección para el ÍNDICE (Pág. 2)
    const sectionPages: Record<string, number> = {};

    // =========================================================================
    // PÁGINA 1: PORTADA
    // =========================================================================
    report('Generando Portada e Índice...', 14);
    applyBlankFrameToCurrentPage();

    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.text('PROGRAMA INTERNO DE PROTECCIÓN', pageW / 2, 32, { align: 'center' });
    doc.text(`CIVIL ${config.anio || '2026'}`, pageW / 2, 43, { align: 'center' });

    // Razón Social
    doc.setFont('times', 'normal');
    doc.setFontSize(16.5);
    const razonLines = doc.splitTextToSize((config.razonSocial || '').toUpperCase(), pageW - 44);
    let portadaY = 119;
    doc.text(razonLines, pageW / 2, portadaY, { align: 'center', lineHeightFactor: 1.3 });
    portadaY += razonLines.length * 10 + 8;

    // Nombre Comercial entre comillas
    doc.setFont('times', 'bold');
    doc.setFontSize(21);
    const comercialLines = doc.splitTextToSize(`“${(config.nombreComercial || '').toUpperCase()}”`, pageW - 40);
    doc.text(comercialLines, pageW / 2, portadaY, { align: 'center', lineHeightFactor: 1.3 });

    // =========================================================================
    // PÁGINA 2: ÍNDICE (Reservamos la hoja 2; se llena al final con los folios exactos)
    // =========================================================================
    addFramedPage(); // Página 2

    // =========================================================================
    // PÁGINA 3: PRESENTACIÓN (Parte 1 - Dinámica con Nombre Comercial y Dirección)
    // =========================================================================
    sectionPages.presentacion = addFramedPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(0, 0, 0);
    doc.text('PRESENTACIÓN', pageW / 2, 30, { align: 'center' });

    const presMargin = 19;
    const presWidth = pageW - presMargin * 2;
    let presY = 41;

    const writeJustifiedParagraph = (text: string, fontSize = 10.8, lineSpacing = 5.1) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, presWidth);
      doc.text(text, presMargin, presY, { align: 'justify', maxWidth: presWidth, lineHeightFactor: 1.35 });
      presY += lines.length * lineSpacing + 4.5;
    };

    writeJustifiedParagraph(
      'El Programa Interno de Protección civil, hoy en día más que un requisito refleja el desarrollo y el nivel cultural a que se deben las instituciones y empresas del sector público y privado. Es una herramienta útil en la planeación y operación que se circunscribe al ámbito de esta empresa, que previene, prepara y organiza para responder efectivamente ante la presencia de riesgos que pudieran generar una emergencia o desastre en su entorno.'
    );

    writeJustifiedParagraph(
      'Se realiza con la convicción de diseñar y activar medidas preventivas y de respuesta ante escenarios de emergencia, que permitan garantizar la continuidad de las funciones sustantivas de la empresa, salvaguardar la integridad física de las personas que laboran o concurren en calidad de clientes, proveedores y usuarios en general de sus espacios y con el afán de proteger los bienes propiedad de la misma.'
    );

    writeJustifiedParagraph(
      'Actualmente la secretaria de Protección Civil, Prevención de Riesgos y Bomberos, en este Municipio de Solidaridad ha diseñado una guía para la elaboración e implementación de programas internos de Protección Civil en atención a la Ley del Sistema Estatal de Protección Civil del Estado de Quintana Roo, a la Ley General de Protección Civil y el Programa Nacional de Protección Civil.'
    );

    writeJustifiedParagraph(
      'En este sentido el enfoque se traduce en la propuesta implícita del desarrollo de tres planes sustantivos:'
    );

    writeJustifiedParagraph(
      '          El plan operativo para implementación de unidades internas (llámense brigadas de la misma empresa) de protección civil de naturaleza operativa.'
    );

    writeJustifiedParagraph(
      '          El plan de contingencias (de naturaleza geográfica) y que en este plan se refiere a los riesgos del entorno y del medio ambiente. Y'
    );

    writeJustifiedParagraph(
      '          El plan de continuidad de operaciones, de carácter netamente funcional para la empresa.'
    );

    writeJustifiedParagraph(
      'Cabe destacar que la metodología para el presente programa obedece y se apega de conformidad a la normativa existente y actual. Como antecedentes del marco jurídico aplicable se toma como partida el decreto por el que se emite el manual de organización y operación del Sistema Nacional de Protección civil (D. O. F. 13 Junio del 2018), el Programa Nacional de Protección Civil 2014-2018-2006 (D.O.F. 30 de Abril 2014), la Guía Técnica para la implementación de Programas Internos de Protección Civil, publicada por la Secretaría de Gobernación (marzo de 1994), última reforma a la Ley General de Protección Civil (D.O.F. 19 de Enero del 2018).'
    );

    const fullAddrText = `${(config.direccion || '').toUpperCase()}, ${(config.municipio || 'PLAYA DEL CARMEN').toUpperCase()}, ESTADO DE ${(config.estado || 'QUINTANA ROO').toUpperCase()}`;

    const drawRichJustifiedParagraph = (
      segments: { text: string; bold: boolean }[],
      x: number,
      startY: number,
      maxWidth: number,
      fontSize = 10.8,
      lineSpacing = 5.1
    ) => {
      doc.setFontSize(fontSize);
      type WordPart = { text: string; bold: boolean; width: number };
      type WordGroup = { parts: WordPart[]; width: number };

      const groups: WordGroup[] = [];
      let currentGroup: WordGroup | null = null;

      segments.forEach((seg) => {
        doc.setFont('helvetica', seg.bold ? 'bold' : 'normal');
        const chunks = seg.text.split(/(\s+)/);
        chunks.forEach((chunk) => {
          if (!chunk) return;
          if (/^\s+$/.test(chunk)) {
            if (currentGroup) {
              groups.push(currentGroup);
              currentGroup = null;
            }
          } else {
            const w = doc.getTextWidth(chunk);
            if (!currentGroup) {
              currentGroup = { parts: [{ text: chunk, bold: seg.bold, width: w }], width: w };
            } else {
              currentGroup.parts.push({ text: chunk, bold: seg.bold, width: w });
              currentGroup.width += w;
            }
          }
        });
      });
      if (currentGroup) {
        groups.push(currentGroup);
      }

      doc.setFont('helvetica', 'normal');
      const normalSpaceW = doc.getTextWidth(' ');

      const lines: { words: WordGroup[]; totalWordsWidth: number }[] = [];
      let currentLine: WordGroup[] = [];
      let currentWordsW = 0;

      groups.forEach((grp) => {
        const spacesW = currentLine.length * normalSpaceW;
        if (currentLine.length > 0 && currentWordsW + spacesW + grp.width > maxWidth) {
          lines.push({ words: currentLine, totalWordsWidth: currentWordsW });
          currentLine = [grp];
          currentWordsW = grp.width;
        } else {
          currentLine.push(grp);
          currentWordsW += grp.width;
        }
      });
      if (currentLine.length > 0) {
        lines.push({ words: currentLine, totalWordsWidth: currentWordsW });
      }

      let curY = startY;
      lines.forEach((line, lineIdx) => {
        const isLastLine = lineIdx === lines.length - 1;
        const gaps = line.words.length - 1;
        const spaceW =
          !isLastLine && gaps > 0
            ? (maxWidth - line.totalWordsWidth) / gaps
            : normalSpaceW;

        let curX = x;
        line.words.forEach((grp) => {
          grp.parts.forEach((part) => {
            doc.setFont('helvetica', part.bold ? 'bold' : 'normal');
            doc.text(part.text, curX, curY);
            curX += part.width;
          });
          curX += spaceW;
        });
        curY += lineSpacing;
      });

      return curY;
    };

    drawRichJustifiedParagraph(
      [
        {
          text: 'Se establece la obligación de integrar las brigadas internas de Protección Civil, cuya finalidad es; Proteger a las personas y a la sociedad ante la eventualidad de un desastre provocado por agentes naturales o humanos, a través de acciones que reduzcan o eliminen la pérdida de vidas humanas, la destrucción de bienes materiales y daños a la naturaleza, con las tareas de desarrollar y operar las acciones de Protección Civil del personal que labora en los diversos espacios de ',
          bold: false
        },
        {
          text: `“${(config.nombreComercial || '').toUpperCase()}”`,
          bold: true
        },
        {
          text: ' El cual se encuentra Ubicado ',
          bold: false
        },
        {
          text: fullAddrText,
          bold: true
        },
        {
          text: ', de las personas que acuden en general a sus instalaciones, equipo, bienes y de su acervo.',
          bold: false
        }
      ],
      presMargin,
      presY,
      presWidth,
      10.5,
      5.0
    );

    // =========================================================================
    // PÁGINA 4: PRESENTACIÓN (Parte 2 - Estática de pág. 4)
    // =========================================================================
    await addStaticTemplatePage(4);

    // =========================================================================
    // PÁGINA 5: DATOS DE LA EMPRESA
    // =========================================================================
    report('Generando Datos de la Empresa y Croquis...', 20);
    sectionPages.datosEmpresa = addFramedPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(0, 0, 0);
    doc.text('DATOS DE LA EMPRESA', pageW / 2, 26, { align: 'center' });

    const datosRows = [
      ['RAZÓN SOCIAL', (config.razonSocial || '').toUpperCase()],
      ['NOMBRE COMERCIAL', (config.nombreComercial || '').toUpperCase()],
      ['DIRECCIÓN', (config.direccion || '').toUpperCase()],
      ['MUNICIPIO', (config.municipio || 'PLAYA DEL CARMEN').toUpperCase()],
      ['ESTADO', (config.estado || 'QUINTANA ROO').toUpperCase()],
      ['RFC', (config.rfc || '').toUpperCase()],
      ['HORARIO DE FUNCIONAMIENTO', (config.horario || '').toUpperCase()],
      ['NUMERO DE TRABAJADORES', String(config.numTrabajadores || '1')],
      ['AFLUENCIA DE CLIENTES AL 100% DE\nCAPACIDAD', String(config.afluenciaClientes || '10')],
      ['NOMBRE DEL REPRESENTANTE LEGAL:', (config.representanteLegal || config.razonSocial || '').toUpperCase()],
      [
        'DATOS DEL ASESOR',
        'JORGE HUMBERTO MEZA CONTRERAS\nCENAPRED/ENAPROC-ENA-17011209\n\nMPDC/SPCPRyB/AUT-DT/RPS/028/2026'
      ]
    ];

    autoTable(doc, {
      startY: 40,
      body: datosRows,
      theme: 'plain',
      margin: { left: 30, right: 30 },
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle',
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      columnStyles: {
        0: { cellWidth: 68 },
        1: { cellWidth: pageW - 60 - 68 }
      }
    });

    // =========================================================================
    // PÁGINA 6: CROQUIS DE UBICACIÓN
    // =========================================================================
    sectionPages.croquisUbicacion = addFramedPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(0, 0, 0);
    doc.text('CROQUIS DE UBICACIÓN', pageW / 2, 34, { align: 'center' });

    // Obtener API Key de Google Maps y coordenadas numéricas para fotos y croquis
    let mapsApiKey = '';
    try {
      const kRes = await fetch('/api/maps-key');
      if (kRes.ok) {
        const kData = await kRes.json();
        mapsApiKey = kData?.key || '';
      }
    } catch {
      // ignore
    }

    const coordParts = (config.coordenadas || '').split(',').map((s) => parseFloat(s.trim()));
    const centerLat = !isNaN(coordParts[0]) ? coordParts[0] : 20.650283395825614;
    const centerLng = !isNaN(coordParts[1]) ? coordParts[1] : -87.06150292348663;

    let ubicacionImgData = config.croquisUbicacionImg || '';
    if (!ubicacionImgData && mapsApiKey) {
      const autoSatUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=18&size=640x480&scale=2&maptype=hybrid&markers=color:red%7C${centerLat},${centerLng}&key=${mapsApiKey}`;
      const loadedSat = await loadCrossOriginImage(autoSatUrl);
      if (loadedSat) {
        const c = document.createElement('canvas');
        c.width = loadedSat.naturalWidth || 800;
        c.height = loadedSat.naturalHeight || 600;
        c.getContext('2d')!.drawImage(loadedSat, 0, 0);
        ubicacionImgData = c.toDataURL('image/jpeg', 0.9);
      }
    }

    if (ubicacionImgData) {
      const dims = await getImageDimensions(ubicacionImgData);
      const maxW = pageW - 24; // 191.9 mm
      const maxH = 148;
      let drawW = maxW;
      let drawH = (dims.height / dims.width) * drawW;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = (dims.width / dims.height) * drawH;
      }
      const imgX = (pageW - drawW) / 2;
      doc.addImage(ubicacionImgData, 'JPEG', imgX, 49, drawW, drawH, undefined, 'FAST');
    } else {
      doc.setDrawColor(180, 180, 180);
      doc.rect(18, 49, pageW - 36, 145);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('IMAGEN SATELITAL DE UBICACIÓN', pageW / 2, 120, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('COORDENADAS', pageW / 2, 205, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(config.coordenadas || `${centerLat}, ${centerLng}`, pageW / 2, 210.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DESCRIPCIÓN DE ACTIVIDADES', pageW / 2, 218.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const actLines = doc.splitTextToSize((config.giro || '').toUpperCase(), pageW - 36);
    doc.text(actLines, pageW / 2, 224, { align: 'center' });

    // =========================================================================
    // PÁGINA 7+: RIESGOS CIRCUNDANTES
    // =========================================================================
    report('Generando Riesgos Circundantes y cargando fotografías...', 27);
    sectionPages.riesgosCircundantes = currentPageNum + 1;

    if (config.riesgosCircundantesMode === 'images' && config.riesgosCircundantesImgs.length > 0) {
      for (let i = 0; i < config.riesgosCircundantesImgs.length; i++) {
        addFramedPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13.5);
        doc.setTextColor(0, 0, 0);
        doc.text('RIESGOS CIRCUNDANTES', pageW / 2, 26, { align: 'center' });

        const imgData = config.riesgosCircundantesImgs[i];
        const dims = await getImageDimensions(imgData);
        const maxW = pageW - 28;
        const maxH = 205;
        let drawW = maxW;
        let drawH = (dims.height / dims.width) * drawW;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = (dims.width / dims.height) * drawH;
        }
        doc.addImage(imgData, 'JPEG', (pageW - drawW) / 2, 38, drawW, drawH, undefined, 'FAST');
      }
    } else if (config.riesgosCircundantesList && config.riesgosCircundantesList.length > 0) {
      // Pre-cargar fotos de los riesgos circundantes como JPEG limpio (vía proxy o Street View/Satélite)
      const loadedPhotos: (string | null)[] = await Promise.all(
        config.riesgosCircundantesList.map((r) =>
          resolveRiskPhotoAsJpegDataUrl(r, mapsApiKey, centerLat, centerLng)
        )
      );

      // Si son <= 5 riesgos, caben todos en 1 sola página ajustando ligeramente la altura de fila
      const chunkSize = config.riesgosCircundantesList.length <= 5 ? 5 : 4;
      for (let c = 0; c < config.riesgosCircundantesList.length; c += chunkSize) {
        const chunk = config.riesgosCircundantesList.slice(c, c + chunkSize);
        const chunkPhotos = loadedPhotos.slice(c, c + chunkSize);

        addFramedPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13.5);
        doc.setTextColor(0, 0, 0);
        doc.text('RIESGOS CIRCUNDANTES', pageW / 2, 26, { align: 'center' });

        const isFiveRows = chunk.length === 5;
        const tableX = 16;
        const tableY = isFiveRows ? 36 : 48;
        const tableW = pageW - 32; // 183.9 mm
        const col1W = 38;
        const col2W = 26;
        const col3W = tableW - col1W - col2W;
        const headerH = 9.5;
        const rowH = isFiveRows ? 38 : 40;

        // Encabezado Guinda (#7b1f1c)
        doc.setFillColor(123, 31, 28);
        doc.rect(tableX, tableY, tableW, headerH, 'F');
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.25);
        doc.rect(tableX, tableY, tableW, headerH, 'S');
        doc.line(tableX + col1W, tableY, tableX + col1W, tableY + headerH);
        doc.line(tableX + col1W + col2W, tableY, tableX + col1W + col2W, tableY + headerH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text('FOTO', tableX + col1W / 2, tableY + 6.2, { align: 'center' });
        doc.text('DISTANCIA', tableX + col1W + col2W / 2, tableY + 6.2, { align: 'center' });
        doc.text('RIESGO', tableX + col1W + col2W + col3W / 2, tableY + 6.2, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        chunk.forEach((risk, idx) => {
          const ry = tableY + headerH + idx * rowH;
          doc.setDrawColor(110, 110, 110);
          doc.rect(tableX, ry, tableW, rowH, 'S');
          doc.line(tableX + col1W, ry, tableX + col1W, ry + rowH);
          doc.line(tableX + col1W + col2W, ry, tableX + col1W + col2W, ry + rowH);

          // Foto + nombre del lugar abajo
          const photoData = chunkPhotos[idx];
          const photoSize = isFiveRows ? 25.5 : 27;
          const photoX = tableX + (col1W - photoSize) / 2;
          if (photoData) {
            doc.addImage(photoData, 'JPEG', photoX, ry + 2, photoSize, photoSize, undefined, 'FAST');
            doc.setDrawColor(180, 180, 180);
            doc.rect(photoX, ry + 2, photoSize, photoSize, 'S');
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.8);
          doc.setTextColor(80, 30, 25);
          const nameLines = doc.splitTextToSize(risk.name || '', col1W - 3);
          doc.text(nameLines.slice(0, 2), tableX + col1W / 2, ry + photoSize + 5.2, {
            align: 'center',
            lineHeightFactor: 1.15
          });

          // Distancia
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(30, 30, 30);
          doc.text((risk.distance || '').toUpperCase(), tableX + col1W + col2W / 2, ry + rowH / 2 + 1, { align: 'center' });

          // Nivel de riesgo y descripción
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(20, 20, 20);
          doc.text(`Nivel de riesgo: `, tableX + col1W + col2W + 4, ry + 6.5);
          const lvlOffset = doc.getTextWidth('Nivel de riesgo: ');
          doc.setFont('helvetica', 'normal');
          doc.text(`${risk.riskLevel || 'Medio'}.`, tableX + col1W + col2W + 4 + lvlOffset, ry + 6.5);

          doc.setFont('helvetica', 'bold');
          doc.text('Riesgo: ', tableX + col1W + col2W + 4, ry + 12);
          const descText = `Riesgo: ${risk.riskDescription || ''}`;
          doc.setFont('helvetica', 'normal');
          const descLines = doc.splitTextToSize(descText, col3W - 8);
          doc.text(descLines.slice(0, 6), tableX + col1W + col2W + 4, ry + 12, { lineHeightFactor: 1.3 });
        });
      }
    } else {
      // Fallback: página 7 del machote si no se cargaron riesgos
      await addStaticTemplatePage(7);
    }

    // =========================================================================
    // PÁGINA 8 (ref): CROQUIS RIESGOS CIRCUNDANTES (250 M A LA REDONDA)
    // =========================================================================
    report('Generando Croquis de Riesgos Circundantes (250 m a la redonda)...', 31);
    sectionPages.croquisRiesgosCircundantes = addFramedPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('CROQUIS RIESGOS CIRCUNDANTES', pageW / 2, 28, { align: 'center' });

    let croquis250Img = config.croquisCircundantesImg || '';
    if (!croquis250Img && mapsApiKey) {
      const autoCroquis = await generateCroquis250mDataUrl({
        lat: centerLat,
        lng: centerLng,
        places: config.riesgosCircundantesList || [],
        mapsApiKey
      });
      if (autoCroquis) {
        croquis250Img = autoCroquis;
      }
    }

    const croqBoxX = 14;
    const croqBoxY = 36;
    const croqBoxW = pageW - 28; // 187.9 mm
    const croqImgH = (croqBoxW * 740) / 980; // ~141.9 mm manteniendo proporción exacta 980x740

    if (croquis250Img) {
      doc.addImage(croquis250Img, 'JPEG', croqBoxX, croqBoxY, croqBoxW, croqImgH, undefined, 'FAST');
    }

    // Recuadro inferior con Nombre Comercial y Dirección del establecimiento evaluado
    const infoBoxY = croqBoxY + croqImgH + 4;
    const infoBoxH = 22;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.35);
    doc.rect(croqBoxX, infoBoxY, croqBoxW, infoBoxH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 21, 42);
    doc.text(
      `ESTABLECIMIENTO EVALUADO: “${(config.nombreComercial || '').toUpperCase()}”`,
      croqBoxX + croqBoxW / 2,
      infoBoxY + 7,
      { align: 'center' }
    );

    const dirCroqText = `DIRECCIÓN: ${(config.direccion || '').toUpperCase()}, ${(config.municipio || 'PLAYA DEL CARMEN').toUpperCase()}, ${(config.estado || 'QUINTANA ROO').toUpperCase()}, MÉXICO.`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(30, 30, 30);
    const dirCroqLines = doc.splitTextToSize(dirCroqText, croqBoxW - 8);
    doc.text(dirCroqLines.slice(0, 2), croqBoxX + croqBoxW / 2, infoBoxY + 13.5, {
      align: 'center',
      lineHeightFactor: 1.25
    });
    doc.setTextColor(0, 0, 0);

    // =========================================================================
    // PÁGINA 9 (ref): SUBPROGRAMA DE PREVENCIÓN
    // =========================================================================
    sectionPages.subprogramaPrevencion = await addStaticTemplatePage(9);

    // =========================================================================
    // PÁGINAS 10+ (ref): ACTA CONSTITUTIVA (Justo debajo del título en la pág. 10)
    // =========================================================================
    report('Generando e integrando Acta Constitutiva...', 35);
    const actaDocInfo: DocumentInfo = {
      ...config.docInfo,
      commercial_name: config.nombreComercial,
      company_name: config.razonSocial,
      address: `${config.direccion} | ${config.municipio}`,
      activity: config.giro
    };
    const actaBlobUrl = (await generateConstitutivaPDF(actaDocInfo, config.employees, true)) as string;
    if (actaBlobUrl) {
      sectionPages.actaConstitutiva = await appendSubPdfWithFrame(actaBlobUrl, 'ACTA CONSTITUTIVA');
    } else {
      sectionPages.actaConstitutiva = currentPageNum + 1;
    }

    // =========================================================================
    // PÁGINA 14 (ref): IDENTIFICACIÓN DE AGENTES PERTURBADORES (con Nombre Comercial dinámico)
    // =========================================================================
    report('Integrando Identificación de Agentes Perturbadores y Método Mosler...', 44);
    sectionPages.identificacionAgentes = currentPageNum + 1;
    {
      doc.addPage();
      currentPageNum++;
      const p14Canvas = await renderPdfPageToCanvas(templatePdf, 14, 2.0);
      const p14Ctx = p14Canvas.getContext('2d')!;
      // Reemplazar la franja inferior donde aparece "ZONA DE OFERTAS" con el fondo limpio del frame
      const sy = p14Canvas.height * 0.695;
      const sh = p14Canvas.height * 0.24;
      p14Ctx.drawImage(
        baseFrameCanvas,
        0,
        baseFrameCanvas.height * 0.695,
        baseFrameCanvas.width,
        baseFrameCanvas.height * 0.24,
        0,
        sy,
        p14Canvas.width,
        sh
      );
      // Limpiar número de página viejo
      p14Ctx.fillStyle = '#ffffff';
      p14Ctx.fillRect(p14Canvas.width * 0.87, p14Canvas.height * 0.885, p14Canvas.width * 0.09, p14Canvas.height * 0.037);

      doc.addImage(p14Canvas.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');

      const p14Margin = 13;
      const p14Width = pageW - p14Margin * 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      const comentarioText = `COMENTARIO: Los agentes perturbadores antes mencionados se refieren a las condiciones generales de la zona en que se encuentra ubicado el inmueble y es importante tomarlos en cuenta para los planes y programas de prevención y respuesta a emergencias del inmueble así como para entrar en comunicación con la Dirección Municipal de Protección Civil del Municipio de Solidaridad a efecto de contar con la información necesaria para disminuir los efectos dañinos de los agentes antes mencionados y para contar con los datos estadísticos de ocurrencia de los mismos en la zona. Importante considerar el caso de ${(config.nombreComercial || '').toUpperCase()} Los siguientes:`;
      doc.setFont('helvetica', 'normal');
      doc.text(comentarioText, p14Margin, 200, { align: 'justify', maxWidth: p14Width, lineHeightFactor: 1.28 });

      doc.setTextColor(180, 20, 20);
      const agText =
        'AGENTES PERTURBADORES: Colapso de suelo, Huracanes, Trombas, Inundaciones, Incendios, Explosiones, Concentraciones masivas, Interrupción de servicios, Accidentes aéreos, terrestres, fluviales, Terrorismo y sabotaje.';
      doc.text(agText, p14Margin, 236, { maxWidth: p14Width, lineHeightFactor: 1.28 });
      doc.setTextColor(0, 0, 0);
    }

    // =========================================================================
    // PÁGINAS 15 a 37 (ref): RIESGOS-AGENTES PERTURBADORES EXTERNOS Y MOSLER
    // =========================================================================
    sectionPages.riesgosAgentesExternos = currentPageNum + 1;
    for (let p = 15; p <= 37; p++) {
      if (p % 5 === 0) {
        report(`Copiando Agentes Perturbadores Externos (pág. ${p - 14} de 23)...`, 45 + ((p - 15) / 23) * 15);
      }
      await addStaticTemplatePage(p);
    }

    // =========================================================================
    // PÁGINAS 38 a 42 (ref): ANÁLISIS DE RIESGO (5 páginas de generateRiesgosPDF)
    // =========================================================================
    report('Generando e integrando Análisis de Riesgo (5 hojas)...', 62);
    const m2Num = parseFloat(config.m2Construccion) || 50;
    const empTotal = parseInt(config.numTrabajadores) || config.employees.length || 1;
    const floatTotal = parseInt(config.afluenciaClientes) || undefined;
    const finalRiesgosData: RiesgosPDFData =
      config.riesgosData || buildDefaultRiesgosData(actaDocInfo, m2Num, empTotal, floatTotal);
    const riesgosBlobUrl = (await generateRiesgosPDF(finalRiesgosData, true)) as string;
    if (riesgosBlobUrl) {
      sectionPages.analisisRiesgo = await appendSubPdfWithFrame(riesgosBlobUrl, 'ANÁLISIS DE RIESGO');
    } else {
      sectionPages.analisisRiesgo = currentPageNum + 1;
    }

    // =========================================================================
    // PÁGINA 43 (ref): ANÁLISIS DE INCENDIO (1 página de generateIncendioPDF)
    // =========================================================================
    report('Generando e integrando Análisis de Incendio NOM-002...', 68);
    const finalIncendioData: IncendioPDFData =
      config.incendioData || buildDefaultIncendioData(actaDocInfo, m2Num, empTotal, floatTotal);
    const incendioBlobUrl = (await generateIncendioPDF(finalIncendioData, true)) as string;
    if (incendioBlobUrl) {
      sectionPages.analisisIncendio = await appendSubPdfWithFrame(incendioBlobUrl, 'ANÁLISIS DE INCENDIO');
    } else {
      sectionPages.analisisIncendio = currentPageNum + 1;
    }

    // =========================================================================
    // PÁGINA 44 (ref): GRADO DE RIESGO DE INCENDIO (Teoría NOM-002 fija)
    // =========================================================================
    await addStaticTemplatePage(44);

    // =========================================================================
    // PÁGINA 45 (ref): ACTIVIDAD ECONÓMICA + PUNTOS CRÍTICOS POR CUMPLIR
    // =========================================================================
    report('Generando Actividad Económica y Riesgos Internos...', 72);
    addFramedPage();

    const p45Margin = 15;
    const p45Width = pageW - p45Margin * 2;
    let p45Y = 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.8);
    doc.setTextColor(0, 0, 0);
    const actEconLines = doc.splitTextToSize((config.actividadEconomicaText || '').toUpperCase(), p45Width);
    doc.text(actEconLines, p45Margin, p45Y, { lineHeightFactor: 1.38 });
    p45Y += actEconLines.length * 4.8 + 6;

    const nomText =
      'POSTERIORMENTE EL ESTUDIO DE LA NORMA, CON ESTE ANÁLISIS DAMOS CUMPLIMIENTO A LA NORMA OFICIAL MEXICANA NOM-002-STPS-2010';
    const nomLines = doc.splitTextToSize(nomText, p45Width);
    doc.text(nomLines, p45Margin, p45Y, { lineHeightFactor: 1.35 });
    p45Y += nomLines.length * 4.8 + 5;

    doc.text('SE ANEXAN EVIDENCIAS DOCUMENTALES', p45Margin, p45Y);
    p45Y += 10;

    // Cuadro de PUNTOS CRÍTICOS POR CUMPLIR y Firma de Jorge
    const boxX = 26;
    const boxW = pageW - 48; // ~167.9 mm
    const colLeftW = 105;
    const colRightW = boxW - colLeftW;
    const boxH = 95;

    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.25);
    doc.rect(boxX, p45Y, boxW, boxH, 'S');
    doc.line(boxX + colLeftW, p45Y, boxX + colLeftW, p45Y + boxH);

    let pcY = p45Y + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('PUNTOS CRÍTICOS POR CUMPLIR', boxX + 2, pcY);
    pcY += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const introPc =
      'De la inspección se desprende que los elementos para prevención y contención de emergencias se encuentran en el siguiente orden:';
    const introLines = doc.splitTextToSize(introPc, colLeftW - 4);
    doc.text(introLines, boxX + 2, pcY, { lineHeightFactor: 1.25 });
    pcY += introLines.length * 4.4 + 3;

    const pc = config.puntosCriticos;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const itemsPc = [
      `BRIGADA DE PRIMEROS AUXILIOS: ${pc.brigadaPrimerosAuxilios ? 'SI' : 'NO'}`,
      `COMBATE DE INCENDIOS: ${pc.combateIncendios ? 'SI' : 'NO'}`,
      `EQUIPO CONTRA INCENDIOS: ${pc.equipoContraIncendios ? 'SI' : 'NO'}`,
      `EQUIPO DE PRIMEROS AUXILIOS: ${pc.equipoPrimerosAuxilios ? 'SI' : 'NO'}`,
      `ALARMA: ${pc.alarma ? 'SI' : 'NO'}`,
      `RUTAS DE EVACUACIÓN: ${pc.rutasEvacuacion ? 'SI' : 'NO'}`,
      `SALIDAS DE EMERGENCIA: ${pc.salidasEmergencia ? 'SI' : 'NO'}`,
      `ALARMA SONORA: ${pc.alarmaSonora ? 'SI' : 'NO'}`
    ];
    itemsPc.forEach((line) => {
      doc.text(line, boxX + 2, pcY);
      pcY += 4.4;
    });

    pcY += 3;
    doc.setTextColor(0, 0, 0);
    const prefixCorr = 'Se deberá corregir conforme a lo descrito en el apartado de: ';
    const corrFull = `${prefixCorr}${(pc.notaCorrectiva || '').toUpperCase()}`;
    const corrLines = doc.splitTextToSize(corrFull, colLeftW - 4);
    doc.setTextColor(210, 0, 0);
    doc.text(corrLines, boxX + 2, pcY, { lineHeightFactor: 1.25 });
    doc.setTextColor(0, 0, 0);

    // Columna derecha: Firma de Jorge
    const signCenterX = boxX + colLeftW + colRightW / 2;
    doc.addImage(FIRMA_JORGE_BASE64, 'PNG', signCenterX - 20, p45Y + 46, 40, 22);
    doc.setLineWidth(0.35);
    doc.line(boxX + colLeftW + 10, p45Y + 73, boxX + boxW - 10, p45Y + 73);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(['JORGE', 'HUMBERTO', 'MEZA', 'CONTRERAS'], boxX + colLeftW + 10, p45Y + 80, { lineHeightFactor: 1.2 });

    // =========================================================================
    // PÁGINA 46 (ref): RIESGOS INTERNOS
    // =========================================================================
    sectionPages.riesgosInternos = addFramedPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('RIESGOS INTERNOS', pageW / 2, 25, { align: 'center' });

    const riMargin = 13;
    const riWidth = pageW - riMargin * 2;
    let riY = 35;

    config.riesgosInternos.items.forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.2);
      doc.setTextColor(0, 0, 0);
      doc.text(item.title, riMargin, riY);
      riY += 4.6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.8);
      const descLines = doc.splitTextToSize(item.description, riWidth);
      doc.text(descLines, riMargin, riY, { lineHeightFactor: 1.25 });
      riY += descLines.length * 4.3 + 1.5;

      // Cuadrito verde con check + "Medidas a tomar:"
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(riMargin, riY - 3.3, 3.8, 3.8, 0.6, 0.6, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.45);
      doc.line(riMargin + 0.8, riY - 1.3, riMargin + 1.6, riY - 0.4);
      doc.line(riMargin + 1.6, riY - 0.4, riMargin + 3.0, riY - 2.4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.8);
      doc.setTextColor(0, 0, 0);
      doc.text('Medidas a tomar:', riMargin + 5.2, riY);
      riY += 4.6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.6);
      item.measures.forEach((m) => {
        doc.text('•', riMargin + 6, riY);
        const mLines = doc.splitTextToSize(m, riWidth - 14);
        doc.text(mLines, riMargin + 12, riY, { lineHeightFactor: 1.22 });
        riY += mLines.length * 4.2 + 0.5;
      });

      riY += 3.5;
    });

    if (config.riesgosInternos.conclusion) {
      riY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('Conclusión', riMargin, riY);
      riY += 4.8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.8);
      const concLines = doc.splitTextToSize(config.riesgosInternos.conclusion, riWidth);
      doc.text(concLines, riMargin, riY, { lineHeightFactor: 1.28 });
    }

    // =========================================================================
    // PÁGINA 47 (ref): ORGANIGRAMA + TABLA DE BRIGADA + FUNCIONES
    // =========================================================================
    report('Generando Organigrama y Tabla de Brigadas...', 76);
    sectionPages.organigrama = addFramedPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('ORGANIGRAMA', pageW / 2, 24, { align: 'center' });

    const sortedEmps = sortEmployees(config.employees);
    const jefeName =
      sortedEmps.length > 0
        ? sortedEmps[0].name.toUpperCase()
        : (config.representanteLegal || config.razonSocial || '').toUpperCase();

    // Dibujar el árbol de Organigrama igual a generateOrganigrama.ts (Jefe arriba + ramas de Multibrigada abajo)
    const ORG_DARK: [number, number, number] = [31, 73, 125];
    const ORG_TITLE_H = 12;
    const ORG_NAME_H = 11;
    const ORG_NODE_H = ORG_TITLE_H + ORG_NAME_H;
    const ORG_MAX_PER_ROW = 4;
    const ORG_NODE_GAP = 4.5;
    const ORG_ROW_VERT_GAP = 12;

    const drawOrgNode = (nx: number, ny: number, nw: number, titleText: string, nameText: string) => {
      doc.setFillColor(...ORG_DARK);
      doc.roundedRect(nx, ny, nw, ORG_TITLE_H, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.3);
      doc.setFont('helvetica', 'bold');
      const tLines = doc.splitTextToSize(titleText, nw - 4);
      const tLH = 6.3 * 0.3527 * 1.25;
      const tStart = ny + (ORG_TITLE_H - tLines.length * tLH) / 2 + tLH * 0.75;
      doc.text(tLines, nx + nw / 2, tStart, { align: 'center', lineHeightFactor: 1.25 });

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...ORG_DARK);
      doc.setLineWidth(0.3);
      doc.roundedRect(nx, ny + ORG_TITLE_H, nw, ORG_NAME_H, 2, 2, 'FD');
      doc.setTextColor(20, 30, 55);
      doc.setFontSize(6.3);
      doc.setFont('helvetica', 'normal');
      const nLines = doc.splitTextToSize(nameText, nw - 4);
      const nLH = 6.3 * 0.3527 * 1.25;
      const nStart = ny + ORG_TITLE_H + (ORG_NAME_H - nLines.length * nLH) / 2 + nLH * 0.75;
      doc.text(nLines, nx + nw / 2, nStart, { align: 'center', lineHeightFactor: 1.25 });
    };

    const drawOrgLine = (x1: number, y1: number, x2: number, y2: number) => {
      doc.setDrawColor(...ORG_DARK);
      doc.setLineWidth(0.35);
      doc.line(x1, y1, x2, y2);
    };

    const jefeW = 62;
    const jefeX = (pageW - jefeW) / 2;
    const jefeY = 31;
    drawOrgNode(jefeX, jefeY, jefeW, 'JEFE DE BRIGADA DE EMERGENCIA MULTIFUNCIONAL', jefeName);

    let spineY = jefeY + ORG_NODE_H;
    const jefeCX = pageW / 2;
    const multis = sortedEmps.slice(1);
    const orgRows: Employee[][] = [];
    for (let i = 0; i < multis.length; i += ORG_MAX_PER_ROW) {
      orgRows.push(multis.slice(i, i + ORG_MAX_PER_ROW));
    }

    const availableOrgW = pageW - 26; // margen 13mm a cada lado
    const maxFirstRowCount = Math.min(orgRows[0]?.length ?? 0, ORG_MAX_PER_ROW);
    const multiW =
      maxFirstRowCount > 0
        ? Math.min(43, (availableOrgW - (maxFirstRowCount - 1) * ORG_NODE_GAP) / maxFirstRowCount)
        : 43;

    orgRows.forEach((row) => {
      if (spineY + ORG_ROW_VERT_GAP + ORG_NODE_H > 238) {
        addFramedPage();
        spineY = 24;
      }
      const count = row.length;
      const rowW = count * multiW + (count - 1) * ORG_NODE_GAP;
      const rowX = (pageW - rowW) / 2;
      const rowY = spineY + ORG_ROW_VERT_GAP;
      const junctionY = spineY + ORG_ROW_VERT_GAP / 2;

      const firstCX = rowX + multiW / 2;
      const lastCX = rowX + (count - 1) * (multiW + ORG_NODE_GAP) + multiW / 2;

      // Línea vertical desde el Jefe hasta la unión horizontal
      drawOrgLine(jefeCX, spineY, jefeCX, junctionY);
      // Línea horizontal abarcando los nodos de la fila
      drawOrgLine(Math.min(jefeCX, firstCX), junctionY, Math.max(jefeCX, lastCX), junctionY);
      // Bajada vertical y nodo para cada brigadista
      row.forEach((emp, idx) => {
        const cx = rowX + idx * (multiW + ORG_NODE_GAP) + multiW / 2;
        drawOrgLine(cx, junctionY, cx, rowY);
        drawOrgNode(
          rowX + idx * (multiW + ORG_NODE_GAP),
          rowY,
          multiW,
          (emp.brigade || 'MULTIBRIGADA').toUpperCase(),
          emp.name.toUpperCase()
        );
      });

      spineY = rowY + ORG_NODE_H;
    });

    // Tabla de BRIGADA | NOMBRE | DIRECCIÓN | TELEFONO
    let orgTableY = spineY + 6;
    if (orgTableY > 210) {
      addFramedPage();
      orgTableY = 26;
    }

    const uniqueEmpsForOrg =
      sortedEmps.length > 0
        ? sortedEmps
        : [
            {
              id: 0,
              document_id: 0,
              name: jefeName,
              role: 'REPRESENTANTE LEGAL',
              brigade: 'JEFE DE BRIGADA DE EMERGENCIA MULTIFUNCIONAL',
              signature: ''
            }
          ];

    const brigadaRows = uniqueEmpsForOrg.map((emp, idx) => [
      idx === 0
        ? 'JEFE DE BRIGADA DE EMERGENCIA\nMULTIFUNCIONAL'
        : (emp.brigade || 'MULTIBRIGADA').toUpperCase(),
      emp.name.toUpperCase(),
      `${(config.direccion || '').toUpperCase()}`,
      (config.telefono || 'SE RESERVA EL DERECHO').toUpperCase()
    ]);

    autoTable(doc, {
      startY: orgTableY,
      head: [['BRIGADA', 'NOMBRE', 'DIRECCIÓN', 'TELEFONO']],
      body: brigadaRows,
      theme: 'grid',
      margin: { left: 13, right: 13, top: 24, bottom: 28 },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          currentPageNum = doc.getNumberOfPages();
          applyBlankFrameToCurrentPage();
        }
      },
      headStyles: {
        fillColor: [155, 194, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
        cellPadding: 1.2,
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle',
        cellPadding: 1.3,
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      columnStyles: {
        0: { cellWidth: 48 },
        1: { cellWidth: 46 },
        2: { cellWidth: 48 },
        3: { cellWidth: pageW - 26 - 142 }
      }
    });

    let afterBrigadaY = (doc as any).lastAutoTable.finalY + 3.5;
    if (afterBrigadaY + 55 > 246) {
      addFramedPage();
      afterBrigadaY = 26;
    }

    // Nota roja de protección de datos personales
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(210, 0, 0);
    const notaRoja1 =
      'Nota: Se omiten domicilios y teléfonos particulares en concordancia con la ley federal de protección civil de datos personales en México y con el';
    const notaRoja2 = 'documento “Lineamientos para la implementación de Programas Internos de Protección Civil, México 2011”';
    doc.text(notaRoja1, 13, afterBrigadaY);
    doc.setDrawColor(210, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(13, afterBrigadaY + 0.6, 13 + doc.getTextWidth(notaRoja1), afterBrigadaY + 0.6);
    afterBrigadaY += 3.5;
    doc.text(notaRoja2, 13, afterBrigadaY);
    doc.line(13, afterBrigadaY + 0.6, 13 + doc.getTextWidth(notaRoja2), afterBrigadaY + 0.6);
    doc.setTextColor(0, 0, 0);

    afterBrigadaY += 5;

    // Tabla de Funciones de Brigadista
    autoTable(doc, {
      startY: afterBrigadaY,
      head: [['Descripcion de Brigadista', 'Funciones a efectuar', 'Acciones a efectuar']],
      body: [
        [
          { content: 'ENCARGADO DEL PROGRAMA INTERNO', styles: { fontStyle: 'bold', fontSize: 7.2 } },
          'Es el encargado de dirigir la Multibrigada en caso de una emergencia distribuyendo al personal de ésta, ordenando y coordinando las actividades para el mejor combate de la eventualidad y organizando la evacuación y rescate.',
          'Coordinar a las demás brigadas, determinar acciones a seguir durante el siniestro, llevar a cabo los planes de ataque para combatir el siniestro, Permanecerá atento durante el incidente y en caso de requerir alguna persona los primeros auxilios, realizar los pasos según el protocolo'
        ],
        [
          { content: 'Multibrigada', styles: { fontStyle: 'bold', fontSize: 9 } },
          'Debido a que es poco el personal, se conforma una multibrigada, la cual en caso de emergencia cuenta con los conocimientos de las diferentes brigadas que se conforman, siguiendo los protocolos ya establecidos y seguir las instrucciones del responsable de la Multibrigada',
          'Deberá seguir el protocolo para verificar qué tipo de Emergencia se está suscitando y proceder en consecuencia para iniciar con las acciones pertinentes para el tipo de emergencia de que se trate'
        ]
      ],
      theme: 'plain',
      margin: { left: 13, right: 13 },
      headStyles: {
        fillColor: [155, 194, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 11,
        fontSize: 8.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      bodyStyles: {
        fontSize: 7.8,
        textColor: [0, 0, 0],
        halign: 'center',
        valign: 'middle',
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      columnStyles: {
        0: { cellWidth: 56 },
        1: { cellWidth: 66 },
        2: { cellWidth: pageW - 26 - 122 }
      }
    });

    // =========================================================================
    // PÁGINAS 48 a 53 (ref): DIRECTORIO, SEÑALIZACIÓN Y PORTADA DE INVENTARIO
    // =========================================================================
    report('Copiando Directorio de Emergencias y Señalización NOM-003...', 80);
    sectionPages.directorioEmergencias = await addStaticTemplatePage(48);
    sectionPages.senalizacion = await addStaticTemplatePage(49);
    sectionPages.tablaColoresContrastantes = await addStaticTemplatePage(50);
    sectionPages.formasGeometricas = await addStaticTemplatePage(51);
    sectionPages.rutasEvacuacion = await addStaticTemplatePage(52);

    // =========================================================================
    // PÁGINAS 53+ (ref): INVENTARIO SEÑALÉTICAS Y EQUIPOS DE EMERGENCIA
    // (La primera imagen se pega en la misma página justo debajo del título)
    // =========================================================================
    if (config.inventarioImgs && config.inventarioImgs.length > 0) {
      for (let i = 0; i < config.inventarioImgs.length; i++) {
        const pageNo = addFramedPage();
        if (i === 0) {
          sectionPages.inventarioSenaleticas = pageNo;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13.5);
          doc.setTextColor(0, 0, 0);
          doc.text('INVENTARIO SEÑALÉTICAS Y EQUIPOS DE EMERGENCIA', pageW / 2, 25, { align: 'center' });
        }

        const imgData = config.inventarioImgs[i];
        const dims = await getImageDimensions(imgData);
        const topY = i === 0 ? 30 : 22;
        const maxW = pageW - 26;
        const maxH = i === 0 ? 217 : 225;
        let drawW = maxW;
        let drawH = (dims.height / dims.width) * drawW;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = (dims.width / dims.height) * drawH;
        }
        doc.addImage(imgData, 'JPEG', (pageW - drawW) / 2, topY, drawW, drawH, undefined, 'FAST');
      }
    } else if (config.useDefaultInventarioIfEmpty !== false) {
      // Si no pegó imágenes nuevas, coloca el título arriba y debajo la primera hoja del inventario (pág. 54) sin página en blanco
      sectionPages.inventarioSenaleticas = addFramedPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(0, 0, 0);
      doc.text('INVENTARIO SEÑALÉTICAS Y EQUIPOS DE EMERGENCIA', pageW / 2, 25, { align: 'center' });

      const p54Canvas = await renderPdfPageToCanvas(templatePdf, 54, 1.8);
      // Recortar el contenido interior de la página 54 (debajo del encabezado superior y arriba del pie de página)
      const cropCanvas = document.createElement('canvas');
      const sy = Math.round(p54Canvas.height * 0.08);
      const sh = Math.round(p54Canvas.height * 0.80);
      const sx = Math.round(p54Canvas.width * 0.055);
      const sw = Math.round(p54Canvas.width * 0.89);
      cropCanvas.width = sw;
      cropCanvas.height = sh;
      const cropCtx = cropCanvas.getContext('2d')!;
      cropCtx.fillStyle = '#ffffff';
      cropCtx.fillRect(0, 0, sw, sh);
      cropCtx.drawImage(p54Canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      doc.addImage(cropCanvas.toDataURL('image/jpeg', 0.88), 'JPEG', 13, 30, pageW - 26, 215, undefined, 'FAST');

      await addStaticTemplatePage(55);
    } else {
      sectionPages.inventarioSenaleticas = addFramedPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(0, 0, 0);
      doc.text('INVENTARIO SEÑALÉTICAS Y EQUIPOS DE EMERGENCIA', pageW / 2, 25, { align: 'center' });
    }

    // =========================================================================
    // PÁGINA 56 (ref): CALENDARIO DE ACTIVIDADES
    // =========================================================================
    report('Generando Calendario de Actividades...', 85);
    sectionPages.calendarioActividades = addFramedPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(0, 0, 0);
    doc.text('CALENDARIO DE ACTIVIDADES', pageW / 2, 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(
      'Calendarización anual de acciones y tareas de protección civil, que incluye los once puntos de\noperaciones preventivas.',
      13,
      34,
      { lineHeightFactor: 1.25 }
    );

    const calGrid = config.calendarioGrid || buildDefaultCalendarioGrid(config.docInfo.date);
    const calActivities20 = ACTIVITIES_LIST.slice(0, 20); // Las 20 actividades del formato PIPC (pág. 56)

    const calHead = [['ACTIVIDAD', ...MONTHS_LIST, 'RESPONSABLE', 'EVIDENCIA\nDOCUMENTAL']];
    const calBody = calActivities20.map((act, rIdx) => {
      let evidencia = 'REPORTE';
      if (rIdx === 2) evidencia = 'EVIDENCIA\nFOTOGRÁFICA';
      if (rIdx >= 12 && rIdx <= 14) evidencia = 'CONSTANCIAS';
      return [
        act,
        ...MONTHS_LIST.map((_, cIdx) => (calGrid[rIdx]?.[cIdx] ? ' ' : '')),
        '',
        evidencia
      ];
    });

    autoTable(doc, {
      startY: 44,
      head: calHead,
      body: calBody,
      theme: 'grid',
      margin: { left: 12.5, right: 12.5 },
      headStyles: {
        fillColor: [11, 44, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        minCellHeight: 16,
        fontSize: 6.2,
        cellPadding: 0.6,
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      bodyStyles: {
        fontSize: 6.1,
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        valign: 'middle',
        cellPadding: 1.0,
        minCellHeight: 5.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.25
      },
      columnStyles: {
        0: { cellWidth: 68, halign: 'left' },
        1: { cellWidth: 6.2 },
        2: { cellWidth: 6.2 },
        3: { cellWidth: 6.2 },
        4: { cellWidth: 6.2 },
        5: { cellWidth: 6.2 },
        6: { cellWidth: 6.2 },
        7: { cellWidth: 6.2 },
        8: { cellWidth: 6.2 },
        9: { cellWidth: 6.2 },
        10: { cellWidth: 6.2 },
        11: { cellWidth: 6.2 },
        12: { cellWidth: 6.2 },
        13: { cellWidth: 22, halign: 'center' },
        14: { cellWidth: 26.5, halign: 'center' }
      },
      didParseCell: (data) => {
        if (data.section === 'head' && data.column.index >= 1 && data.column.index <= 12) {
          data.cell.text = [];
        }
        if (data.section === 'body' && data.column.index >= 1 && data.column.index <= 12) {
          const isChecked = calGrid[data.row.index]?.[data.column.index - 1];
          if (isChecked) {
            data.cell.styles.fillColor = [155, 194, 230]; // Azul claro igual a la pág. 56 del machote
          } else {
            data.cell.styles.fillColor = [255, 255, 255];
          }
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'head' && data.column.index >= 1 && data.column.index <= 12) {
          const monthName = MONTHS_LIST[data.column.index - 1];
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          const cx = data.cell.x + data.cell.width / 2 + 1;
          const cy = data.cell.y + data.cell.height - 1.5;
          doc.text(monthName, cx, cy, { angle: 90 });
        }
      }
    });

    // =========================================================================
    // PÁGINAS 57 a 62 (ref): MANTENIMIENTO, EQUIPO DE SEGURIDAD, CAPACITACIÓN Y GUÍA DE SIMULACRO
    // =========================================================================
    sectionPages.mantenimientoPreventivo = await addStaticTemplatePage(57);
    sectionPages.medidasEquipoSeguridad = await addStaticTemplatePage(58);
    await addStaticTemplatePage(59);
    sectionPages.capacitacion = await addStaticTemplatePage(60);
    await addStaticTemplatePage(61);
    await addStaticTemplatePage(62);

    // =========================================================================
    // PÁGINAS 63+ (ref): CÉDULA DE SIMULACRO (Dinámica según firmantes)
    // =========================================================================
    report('Generando e integrando Cédula de Simulacro...', 89);
    const simulacroBlobUrl = (await generateSimulacroPDF(
      actaDocInfo,
      config.employees,
      true,
      config.turnosSimulacro || 'MV'
    )) as string;
    if (simulacroBlobUrl) {
      sectionPages.cedulaSimulacro = await appendSubPdfWithFrame(simulacroBlobUrl, 'CEDULA DE SIMULACRO');
    } else {
      sectionPages.cedulaSimulacro = currentPageNum + 1;
    }

    // =========================================================================
    // PÁGINAS 66 a 84 (ref): SUBPROGRAMA DE AUXILIO, CÓDIGOS DE EMERGENCIA, RECUPERACIÓN Y ANEXOS
    // =========================================================================
    report('Integrando Subprograma de Auxilio, Códigos de Emergencia y Anexos...', 93);
    await addStaticTemplatePage(66);
    sectionPages.incendioCodigoRojo = await addStaticTemplatePage(67);
    await addStaticTemplatePage(68);
    sectionPages.queHacerIncendio = await addStaticTemplatePage(69);
    sectionPages.duranteDespuesIncendio = await addStaticTemplatePage(70);
    await addStaticTemplatePage(71);
    sectionPages.evacuacionCodigoVerde = await addStaticTemplatePage(72);
    await addStaticTemplatePage(73);
    await addStaticTemplatePage(74);
    sectionPages.primerosAuxilios = await addStaticTemplatePage(75);
    await addStaticTemplatePage(76);
    await addStaticTemplatePage(77);
    await addStaticTemplatePage(78);
    sectionPages.amenazaBomba = await addStaticTemplatePage(79);
    await addStaticTemplatePage(80);
    await addStaticTemplatePage(81);
    await addStaticTemplatePage(82);
    await addStaticTemplatePage(83);
    sectionPages.anexos = await addStaticTemplatePage(84);

    // =========================================================================
    // AHORA REGRESAMOS A LA PÁGINA 2 PARA DIBUJAR EL ÍNDICE CON LOS NÚMEROS REALES
    // =========================================================================
    report('Actualizando Índice y numeración de páginas...', 97);
    doc.setPage(2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('ÍNDICE', pageW / 2, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(47, 84, 150);
    doc.text('Contenido', 13, 35.5);
    doc.setTextColor(0, 0, 0);

    const indexItems: { label: string; page: number; indent?: number }[] = [
      { label: 'PRESENTACIÓN', page: sectionPages.presentacion },
      { label: 'DATOS DE LA EMPRESA', page: sectionPages.datosEmpresa },
      { label: 'CROQUIS DE UBICACIÓN', page: sectionPages.croquisUbicacion },
      { label: 'COORDENADAS', page: sectionPages.croquisUbicacion, indent: 4 },
      { label: 'DESCRIPCIÓN DE ACTIVIDADES', page: sectionPages.croquisUbicacion, indent: 4 },
      { label: 'RIESGOS CIRCUNDANTES', page: sectionPages.riesgosCircundantes },
      { label: 'CROQUIS RIESGOS CIRCUNDANTES', page: sectionPages.croquisRiesgosCircundantes },
      { label: 'SUBPROGRAMA DE PREVENCIÓN:', page: sectionPages.subprogramaPrevencion },
      { label: 'ACTA CONSTITUTIVA', page: sectionPages.actaConstitutiva },
      { label: 'IDENTIFICACIÓN DE AGENTES PERTURBADORES', page: sectionPages.identificacionAgentes },
      { label: 'RIESGOS-AGENTES PERTURBADORES EXTERNOS', page: sectionPages.riesgosAgentesExternos },
      { label: 'ANÁLISIS DE RIESGO', page: sectionPages.analisisRiesgo },
      { label: 'ANÁLISIS DE INCENDIO', page: sectionPages.analisisIncendio },
      { label: 'RIESGOS INTERNOS', page: sectionPages.riesgosInternos },
      { label: 'ORGANIGRAMA', page: sectionPages.organigrama },
      { label: 'DIRECTORIO DE EMERGENCIAS', page: sectionPages.directorioEmergencias },
      { label: 'SEÑALIZACIÓN', page: sectionPages.senalizacion },
      { label: 'TABLA DE COLORES DE SEGURIDAD, SU SIGNIFICADO E INDICACIONES Y PRECISIONES', page: sectionPages.senalizacion, indent: 4 },
      { label: 'TABLA SELECCIÓN DE COLORES CONTRASTANTES', page: sectionPages.tablaColoresContrastantes, indent: 4 },
      { label: 'FORMAS GEOMÉTRICAS PARA SEÑALES DE SEGURIDAD E HIGIENE Y SU SIGNIFICADO', page: sectionPages.formasGeometricas, indent: 4 },
      { label: 'PUNTOS DE REUNIÓN O ZONAS SEGURAS', page: sectionPages.formasGeometricas, indent: 4 },
      { label: 'RUTAS DE EVACUACIÓN Y SALIDAS DE EMERGENCIA', page: sectionPages.rutasEvacuacion, indent: 4 },
      { label: 'INVENTARIO SEÑALÉTICAS Y EQUIPOS DE EMERGENCIA', page: sectionPages.inventarioSenaleticas },
      { label: 'CALENDARIO DE ACTIVIDADES', page: sectionPages.calendarioActividades },
      { label: 'MANTENIMIENTO PREVENTIVO Y CORRECTIVO DEL INMUEBLE', page: sectionPages.mantenimientoPreventivo },
      { label: 'CALENDARIO:', page: sectionPages.mantenimientoPreventivo, indent: 4 },
      { label: 'MEDIDAS Y EQUIPO DE SEGURIDAD', page: sectionPages.medidasEquipoSeguridad },
      { label: 'CAPACITACIÓN', page: sectionPages.capacitacion },
      { label: 'CALENDARIO DE CAPACITACIONES', page: sectionPages.capacitacion, indent: 4 },
      { label: 'DIFUSIÓN Y CONCIENTIZACIÓN', page: sectionPages.capacitacion, indent: 4 },
      { label: 'GUÍA DE SIMULACRO', page: sectionPages.capacitacion },
      { label: 'CEDULA DE SIMULACRO', page: sectionPages.cedulaSimulacro },
      { label: 'INCENDIO (CÓDIGO ROJO)', page: sectionPages.incendioCodigoRojo },
      { label: 'QUE HACER ANTES, DURANTE Y DESPUÉS DE UN INCENDIO.', page: sectionPages.queHacerIncendio, indent: 4 },
      { label: 'ANTES', page: sectionPages.queHacerIncendio, indent: 4 },
      { label: 'DURANTE', page: sectionPages.duranteDespuesIncendio, indent: 4 },
      { label: 'DESPUÉS', page: sectionPages.duranteDespuesIncendio, indent: 4 },
      { label: 'EVACUACIÓN (CÓDIGO VERDE)', page: sectionPages.evacuacionCodigoVerde },
      { label: 'PROCEDIMIENTO BRIGADA DE EVACUACIÓN', page: sectionPages.evacuacionCodigoVerde, indent: 4 },
      { label: 'PROCEDIMIENTO GENERAL DE EVACUACIÓN', page: sectionPages.evacuacionCodigoVerde, indent: 4 },
      { label: 'PRIMEROS AUXILIOS (CÓDIGO AMARILLO)', page: sectionPages.primerosAuxilios, indent: 4 },
      { label: 'AMENAZA DE BOMBA (CÓDIGO PURPURA)', page: sectionPages.amenazaBomba, indent: 4 },
      { label: 'ANEXOS', page: sectionPages.anexos },
      { label: 'DATOS DEL ASESOR', page: sectionPages.anexos, indent: 4 }
    ];

    let idxY = 39.5;
    const idxLeft = 13;
    const idxRight = pageW - 13;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    indexItems.forEach((item) => {
      const xStart = idxLeft + (item.indent || 0);
      const pageStr = String(item.page || '');
      doc.text(item.label, xStart, idxY);
      doc.text(pageStr, idxRight, idxY, { align: 'right' });

      const labelW = doc.getTextWidth(item.label);
      const pageWText = doc.getTextWidth(pageStr);
      const dotsStartX = xStart + labelW + 1.5;
      const dotsEndX = idxRight - pageWText - 2;
      if (dotsEndX > dotsStartX) {
        const dotWidth = doc.getTextWidth('. ');
        const numDots = Math.floor((dotsEndX - dotsStartX) / dotWidth);
        const dotsStr = '. '.repeat(Math.max(2, numDots)).trim();
        doc.setTextColor(80, 80, 80);
        doc.text(dotsStr, dotsEndX, idxY, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }

      idxY += 4.78;
    });

    // =========================================================================
    // ESTAMPAR NUMERACIÓN CORRIDA EN TODAS LAS PÁGINAS (Esquina inferior derecha)
    // =========================================================================
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(String(p), 202.5, 255.5, { align: 'right' });
    }

    report('¡PIPC 2026 generado con éxito!', 100);

    const fileName = generatePdfName('PIPC 2026', config.nombreComercial, config.docInfo.date);
    const pdfBlob = doc.output('blob');

    if (preview) {
      return URL.createObjectURL(pdfBlob);
    }

    await savePdf(pdfBlob, `${fileName}.pdf`);
  } catch (err: any) {
    console.error('Error generating PIPC PDF:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error al generar PIPC',
      text: err?.message || 'Ocurrió un error al ensamblar el Programa Interno.',
      confirmButtonColor: '#722F37'
    });
  }
}

