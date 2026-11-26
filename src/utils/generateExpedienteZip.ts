import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import Swal from 'sweetalert2';
import { PIPCPDFConfig, generatePIPCPDF } from './generatePIPCPDF';
import { generateConstitutivaPDF } from './generateConstitutivaPDF';
import { generateSimulacroPDF } from './generateSimulacroPDF';
import { generateBatchConstanciasPDF } from './generateBatchConstanciasPDF';
import { generatePdfName } from './pdfNameGenerator';

export interface ExpedienteZipInput {
  pipcConfig: PIPCPDFConfig;
  includeAutoConstancias: boolean;
  includeDictamenElectrico: boolean;
  constanciasFiles: File[];
  legalFiles: File[];
  polizaFiles: File[];
  extintoresFiles: File[];
  dictamenFiles: File[];
  customRegistroFiles: File[];
  onProgress?: (text: string, percent: number) => void;
}

const MARCO_JURIDICO_FILES = [
  {
    url: '/plantillas-zip/MARCO%20JURIDICO/Nom-002-STPS-2000.pdf',
    zipName: 'NOM-002-STPS-2000.pdf'
  },
  {
    url: '/plantillas-zip/MARCO%20JURIDICO/NOM-005-STPS-1998.pdf',
    zipName: 'NOM-005-STPS-1998.pdf'
  },
  {
    url: '/plantillas-zip/MARCO%20JURIDICO/Nom-017-STPS-2008.pdf',
    zipName: 'NOM-017-STPS-2008.pdf'
  },
  {
    url: '/plantillas-zip/MARCO%20JURIDICO/Nom-026-STPS-2008.pdf',
    zipName: 'NOM-026-STPS-2008.pdf'
  },
  {
    url: '/plantillas-zip/MARCO%20JURIDICO/NOM-029-STPS-2005.pdf',
    zipName: 'NOM-029-STPS-2005.pdf'
  }
];

function sanitizeFileSegment(str: string): string {
  return (str || 'EMPRESA')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function addAutoRenamedFiles(
  folder: JSZip,
  files: File[],
  basePrefix: string,
  cleanCommercial: string
) {
  files.forEach((file, idx) => {
    const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';
    const suffix = files.length > 1 ? ` (${idx + 1})` : '';
    const finalName = cleanCommercial
      ? `${basePrefix} ${cleanCommercial}${suffix}.${ext}`
      : `${basePrefix}${suffix}.${ext}`;
    folder.file(finalName, file);
  });
}

async function fetchBlobUrlAsBlob(blobUrl: string): Promise<Blob> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  try {
    URL.revokeObjectURL(blobUrl);
  } catch {
    // ignore
  }
  return blob;
}

async function fetchTemplateBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo cargar la plantilla: ${url} (${res.status})`);
  }
  return await res.arrayBuffer();
}

/**
 * Estampa el nombre de la empresa (y año si es distinto a 2026) en la portada del
 * Plan de Contingencias y Recuperación justo debajo de "PROTECCIÓN CIVIL 2026".
 */
async function buildCustomPlanContingenciasPdf(
  companyLabel: string,
  anio: string
): Promise<Uint8Array> {
  const rawBytes = await fetchTemplateBytes(
    '/plantillas-zip/PLAN%20DE%20CONTIGENCIAS%20Y%20RECUPERACION.pdf'
  );
  const pdfDoc = await PDFDocument.load(rawBytes);
  const firstPage = pdfDoc.getPage(0);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Si el año cambió (ej. 2027), reemplazar "2026" en "PROTECCIÓN CIVIL 2026" (x:133, y:683)
  const cleanYear = (anio || '2026').trim();
  if (cleanYear && cleanYear !== '2026') {
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    firstPage.drawRectangle({
      x: 132,
      y: 679,
      width: 45,
      height: 15,
      color: rgb(1, 1, 1)
    });
    firstPage.drawText(cleanYear, {
      x: 133,
      y: 683,
      size: 11,
      font: fontRegular,
      color: rgb(0, 0, 0)
    });
  }

  // Estampar el nombre de la empresa justo debajo de "PROTECCIÓN CIVIL 2026" (y: 683 -> y: 660)
  const displayName = (companyLabel || '').toUpperCase().trim();
  if (displayName) {
    // Dividir en máximo 2 líneas si el nombre es muy largo para respetar márgenes (maxWidth ~540pt)
    const maxW = 540;
    const words = displayName.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';
    for (const w of words) {
      const candidate = currentLine ? `${currentLine} ${w}` : w;
      if (fontBold.widthOfTextAtSize(candidate, 11) <= maxW) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);

    lines.slice(0, 2).forEach((line, idx) => {
      firstPage.drawText(line, {
        x: 36,
        y: 661 - idx * 15,
        size: 11,
        font: fontBold,
        color: rgb(0, 0, 0)
      });
    });
  }

  return await pdfDoc.save();
}

async function saveZipBlob(blob: Blob, fileName: string): Promise<void> {
  const blobUrl = URL.createObjectURL(blob);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isIos) {
    const file = new File([blob], fileName, { type: 'application/zip' });
    const tryShare = async () => {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          return true;
        } catch (err: any) {
          if (err?.name === 'AbortError') return true;
        }
      }
      return false;
    };

    const shared = await tryShare();
    if (shared) {
      if (!isStandalone) URL.revokeObjectURL(blobUrl);
      return;
    }

    await Swal.fire({
      title: 'Expediente ZIP Listo',
      text: 'Presiona el botón para guardar o compartir tu archivo .zip en Archivos.',
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Guardar / Compartir ZIP',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#1f3769'
    }).then(async (res) => {
      if (res.isConfirmed) {
        const ok = await tryShare();
        if (!ok && !isStandalone) {
          window.location.assign(blobUrl);
        }
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    });
    return;
  }

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
}

export async function generateExpedienteZip(input: ExpedienteZipInput): Promise<void> {
  const {
    pipcConfig,
    includeAutoConstancias,
    includeDictamenElectrico,
    constanciasFiles,
    legalFiles,
    polizaFiles,
    extintoresFiles,
    dictamenFiles,
    customRegistroFiles,
    onProgress
  } = input;

  const report = (text: string, pct: number) => {
    if (onProgress) onProgress(text, Math.min(99, Math.max(1, Math.round(pct))));
  };

  try {
    const zip = new JSZip();
    const anio = (pipcConfig.anio || '2026').trim();
    const cleanCommercial = sanitizeFileSegment(
      pipcConfig.nombreComercial || pipcConfig.razonSocial || 'EMPRESA'
    );
    const actaDocInfo = {
      ...pipcConfig.docInfo,
      company_name: pipcConfig.razonSocial,
      commercial_name: pipcConfig.nombreComercial,
      address: `${pipcConfig.direccion} | ${pipcConfig.municipio}`,
      activity: pipcConfig.giro
    };

    // Crear las 6 carpetas principales (garantizando que existan aunque alguna no tenga archivos extra)
    const folderConstancias = zip.folder('CONSTANCIAS DE CAPACITACIÓN')!;
    const folderLegal = zip.folder('DOCUMENTACIÓN LEGAL')!;
    const folderMarco = zip.folder('MARCO JURIDICO')!;
    const folderPoliza = zip.folder('POLIZA DE SEGURO')!;
    const folderExtintores = zip.folder('RECARGA DE EXTINTORES')!;
    const folderRegistro = zip.folder(`REGISTRO ${anio}`)!;

    // 1. Generar P.I.P.C. completo (en la raíz)
    report('Generando P.I.P.C. 2026 completo...', 8);
    const pipcBlobUrl = (await generatePIPCPDF(
      {
        ...pipcConfig,
        onProgress: (txt, p) => {
          // Mapear 0..100 del PIPC a 8..58% del progreso total del ZIP
          report(`PIPC: ${txt}`, 8 + p * 0.5);
        }
      },
      true
    )) as string;

    if (pipcBlobUrl) {
      const pipcBlob = await fetchBlobUrlAsBlob(pipcBlobUrl);
      zip.file(`P.I.P.C. ${anio} ${cleanCommercial}.pdf`, pipcBlob);
    }

    // 2. Generar Plan de Contingencias y Recuperación personalizado (en la raíz)
    report('Personalizando Plan de Contingencias y Recuperación...', 62);
    const planBytes = await buildCustomPlanContingenciasPdf(
      pipcConfig.nombreComercial || pipcConfig.razonSocial,
      anio
    );
    zip.file(`PLAN DE CONTINGENCIAS Y RECUPERACION ${cleanCommercial}.pdf`, planBytes);

    // 3. Documentación Legal automática (Acta Constitutiva + Cédula de Simulacro)
    report('Generando Acta Constitutiva y Cédula de Simulacro...', 68);
    const actaUrl = (await generateConstitutivaPDF(
      actaDocInfo,
      pipcConfig.employees,
      true
    )) as string;
    if (actaUrl) {
      const actaBlob = await fetchBlobUrlAsBlob(actaUrl);
      const actaName = generatePdfName('ACTA CONSTITUTIVA', pipcConfig.nombreComercial, pipcConfig.docInfo.date);
      folderLegal.file(`${actaName}.pdf`, actaBlob);
    }

    const simUrl = (await generateSimulacroPDF(
      actaDocInfo,
      pipcConfig.employees,
      true,
      pipcConfig.turnosSimulacro || 'MV'
    )) as string;
    if (simUrl) {
      const simBlob = await fetchBlobUrlAsBlob(simUrl);
      const simName = generatePdfName('CEDULA DE SIMULACRO', pipcConfig.nombreComercial, pipcConfig.docInfo.date);
      folderLegal.file(`${simName}.pdf`, simBlob);
    }

    addAutoRenamedFiles(folderLegal, legalFiles, 'DOCUMENTACION LEGAL', cleanCommercial);

    // 4. Constancias de Capacitación (automáticas + extras subidas)
    if (includeAutoConstancias && pipcConfig.employees.length > 0) {
      report('Generando Constancias de Capacitación...', 76);
      const constBlob = (await generateBatchConstanciasPDF(
        actaDocInfo,
        pipcConfig.employees,
        '/constancia_vacia.png',
        false,
        'CONSTANCIAS',
        pipcConfig.docInfo.date,
        true
      )) as Blob | void;
      if (constBlob instanceof Blob) {
        const constName = generatePdfName('CONSTANCIAS', pipcConfig.nombreComercial, pipcConfig.docInfo.date);
        folderConstancias.file(`${constName}.pdf`, constBlob);
      }
    }
    addAutoRenamedFiles(folderConstancias, constanciasFiles, 'CONSTANCIA CAPACITACION', cleanCommercial);

    // 5. Marco Jurídico (5 NOMs preestablecidas)
    report('Empaquetando Marco Jurídico...', 83);
    await Promise.all(
      MARCO_JURIDICO_FILES.map(async (item) => {
        const bytes = await fetchTemplateBytes(item.url);
        folderMarco.file(item.zipName, bytes);
      })
    );

    // 6. Póliza de Seguro y Recarga de Extintores (renombrados automáticamente)
    addAutoRenamedFiles(folderPoliza, polizaFiles, 'POLIZA DE SEGURO', cleanCommercial);
    addAutoRenamedFiles(folderExtintores, extintoresFiles, 'RECARGA EXTINTORES', cleanCommercial);

    // 6b. Dictamen Eléctrico (solo si la palomita de incluir carpeta está activa)
    if (includeDictamenElectrico) {
      const folderDictamen = zip.folder('DICTAMEN ELÉCTRICO')!;
      addAutoRenamedFiles(folderDictamen, dictamenFiles, 'DICTAMEN ELECTRICO', cleanCommercial);
    }

    // 7. Registro Municipal (preestablecido o reemplazo personalizado)
    report('Agregando Registro Municipal...', 89);
    if (customRegistroFiles.length > 0) {
      addAutoRenamedFiles(folderRegistro, customRegistroFiles, `REGISTRO MUNICIPAL ${anio}`, '');
    } else {
      const regBytes = await fetchTemplateBytes(
        '/plantillas-zip/REGISTRO%202026/REGISTRO%20MUNICIPAL%202026.pdf'
      );
      folderRegistro.file(`REGISTRO MUNICIPAL ${anio}.pdf`, regBytes);
    }

    // 8. Comprimir ZIP en memoria del navegador (cero almacenamiento en servidor)
    report('Comprimiendo expediente .zip en tu dispositivo...', 94);
    const zipBlob = await zip.generateAsync(
      {
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      },
      (meta) => {
        report('Comprimiendo expediente .zip...', 94 + meta.percent * 0.05);
      }
    );

    report('¡Expediente ZIP listo!', 100);
    await saveZipBlob(zipBlob, `EXPEDIENTE PIPC ${anio} ${cleanCommercial}.zip`);
  } catch (err: any) {
    console.error('Error al generar expediente ZIP:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error al armar el ZIP',
      text: err?.message || 'No se pudo generar el expediente ZIP.',
      confirmButtonColor: '#722F37'
    });
  }
}
