import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { getCachedJpeg } from './imageCache';
import { generatePdfName } from './pdfNameGenerator';
import { savePdf } from './savePdf';

export interface DC3CourseData {
  nombreCurso: string;
  duracionHoras: string;
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string;    // YYYY-MM-DD
}

export interface DC3EmployeeData {
  nombreCompleto: string;
  curp: string;
}

export interface DC3Data {
  // Lista de trabajadores
  employees: DC3EmployeeData[];

  // Empresa
  razonSocial: string;
  actividadGiro: string;

  // Lista de cursos seleccionados
  courses: DC3CourseData[];

  // Agente
  agenteCapacitador: string;
  registroSTPS: string;

  // Firmas
  representanteEmpresa: string;
  representanteTrabajadores: string;
  instructor: string;

  // Nombre de archivo personalizado
  customFileName?: string;
}

// Coordenadas calibradas con precisión matemática a partir del análisis de desplazamientos
// para coincidir exactamente con las cajas del formato oficial vertical (Carta: 215.9 x 279.4 mm).
export const DC3_COORDINATES = {
  // CONFIGURACIÓN VISUAL
  fontSizeGrid: 10,
  fontSizeText: 9.5,
  fontFamily: 'helvetica',
  textColor: [0, 0, 0] as [number, number, number],

  // SECCIÓN 1: DATOS DEL TRABAJADOR
  nombreCompleto:  { x: 32.0, y: 28.5 },             // Caja del Nombre Completo (Texto normal)
  curp:            { x: 31.5, y: 41.8, step: 4.55 }, // Cuadrícula de 18 cajas de la CURP

  // SECCIÓN 2: DATOS DE LA EMPRESA
  razonSocial:     { x: 32.0, y: 71.0 },              // Centrado en la caja de Razón Social
  actividadGiro:   { x: 32.0, y: 83.5 },              // Centrado en la caja de Actividad o Giro

  // SECCIÓN 3: DATOS DEL PROGRAMA DE CAPACITACIÓN
  nombreCurso:     { x: 32.0, y: 102.0 },             // Nombre del curso (Texto libre)
  duracionHoras:   { x: 44.0, y: 112.8, step: 5.15 }, // Duración en horas (3 cajas)
  
  // Periodo de ejecución (Fecha de Inicio)
  inicioAnio:      { x: 91.5, y: 112.8, step: 4.80 }, // 4 cajas para AAAA
  inicioMes:       { x: 111.2, y: 112.8, step: 5.75 }, // 2 cajas para MM
  inicioDia:       { x: 124.2, y: 112.8, step: 4.55 }, // 2 cajas para DD

  // Periodo de ejecución (Fecha de Fin)
  finAnio:         { x: 141.2, y: 112.8, step: 5.50 }, // 4 cajas para AAAA
  finMes:          { x: 163.7, y: 112.8, step: 5.75 }, // 2 cajas para MM
  finDia:          { x: 176.0, y: 112.8, step: 4.55 }, // 2 cajas para DD

  agenteCapacitador:{ x: 32.0, y: 129.5 },            // Agente (Texto libre)
  registroSTPS:    { x: 32.0, y: 141.0 },             // Registro STPS (Texto libre)

  // SECCIÓN 4: FIRMAS (Perfectamente alinedadas con las líneas inferiores)
  instructor: {
    nameX: 60.0,
    nameY: 178.0,
    titleX: 60.0,
    titleY: 202.0
  },
  representanteEmpresa: {
    nameX: 108.0,
    nameY: 236.0,
    titleX: 108.0,
    titleY: 252.0
  },
  representanteTrabajadores: {
    nameX: 168.0,
    nameY: 236.0,
    titleX: 168.0,
    titleY: 252.0
  }
};

/**
 * Divide un nombre completo en español en apellido paterno, materno y nombres,
 * soportando apellidos compuestos como "DE LA CRUZ", "SAN ROMAN", etc.
 */
export function splitSpanishName(fullName: string): { paterno: string; materno: string; nombres: string } {
  const cleanName = (fullName || '').trim().toUpperCase();
  if (!cleanName) return { paterno: '', materno: '', nombres: '' };

  const parts = cleanName.split(/\s+/);
  const prefixes = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'MC', 'MAC', 'VAN', 'VON']);

  const tokens: string[] = [];
  let i = 0;
  while (i < parts.length) {
    let part = parts[i];
    if (prefixes.has(part) && i + 1 < parts.length) {
      let compound = part;
      while (i + 1 < parts.length && prefixes.has(parts[i])) {
        i++;
        compound += ' ' + parts[i];
      }
      if (i + 1 < parts.length) {
        i++;
        compound += ' ' + parts[i];
      }
      tokens.push(compound);
    } else {
      tokens.push(part);
      i++;
    }
  }

  if (tokens.length === 1) {
    return { paterno: tokens[0], materno: '', nombres: '' };
  }
  if (tokens.length === 2) {
    return { paterno: tokens[0], materno: '', nombres: tokens[1] };
  }
  if (tokens.length === 3) {
    return { paterno: tokens[0], materno: tokens[1], nombres: tokens[2] };
  }
  return {
    paterno: tokens[0],
    materno: tokens[1],
    nombres: tokens.slice(2).join(' ')
  };
}

/**
 * Dibuja un texto letra por letra alineado a una cuadrícula.
 */
function drawGridText(doc: jsPDF, text: string, startX: number, y: number, stepX: number) {
  const chars = (text || '').toUpperCase().split('');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(DC3_COORDINATES.fontSizeGrid);
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char.trim() !== '') {
      // Ajuste dinámico de la mitad del paso para centrado exacto dentro de la celda de la rejilla
      doc.text(char, startX + i * stepX + (stepX / 2), y, { align: 'center' });
    }
  }
}


/**
 * Dibuja un texto normal libre.
 */
function drawNormalText(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(DC3_COORDINATES.fontSizeText);
  doc.text((text || '').toUpperCase(), x, y);
}

/**
 * Genera el PDF DC-3 utilizando la plantilla oficial de la STPS.
 * Soporta múltiples trabajadores y múltiples cursos consecutivamente.
 * Cada combinación de trabajador + curso añade 2 páginas (anverso y reverso).
 */
export const generateDC3PDF = async (data: DC3Data, preview: boolean = false): Promise<string | void> => {
  try {
    // Cargar plantillas y firma del capacitador en paralelo
    // Carga PNG y devuelve { dataUrl, width, height } para preservar aspecto
    const loadPng = async (url: string): Promise<{ dataUrl: string; w: number; h: number } | null> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const { w, h } = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.src = dataUrl;
        });
        return { dataUrl, w, h };
      } catch {
        return null;
      }
    };

    const [imgHoja1, imgHoja2, firmaCapacitador] = await Promise.all([
      getCachedJpeg('/formatodc3_hoja1.jpg'),
      getCachedJpeg('/formatodc3_hoja2.jpg'),
      loadPng('/firma_capacitador.png')
    ]);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true,
      encryption: {
        ownerPassword: 'Meyersound1##',
        userPermissions: ['print']
      }
    });

    const docWidth = doc.internal.pageSize.getWidth();
    const docHeight = doc.internal.pageSize.getHeight();

    // Validar trabajadores y cursos
    if (!data.employees || data.employees.length === 0) {
      throw new Error('No hay trabajadores registrados en la lista.');
    }
    if (!data.courses || data.courses.length === 0) {
      throw new Error('No se seleccionó ningún curso para generar.');
    }

    // Iterar sobre cada trabajador
    for (let e = 0; e < data.employees.length; e++) {
      const emp = data.employees[e];

      // Iterar sobre cada uno de los cursos seleccionados
      for (let c = 0; c < data.courses.length; c++) {
        const course = data.courses[c];

        // Si no es la primera combinación absoluta, agregamos página nueva
        if (e > 0 || c > 0) {
          doc.addPage();
        }

        // ────────────────────────────────────────────────────────
        // ANVERSO DEL TRABAJADOR Y CURSO ACTUAL
        // ────────────────────────────────────────────────────────
        doc.addImage(imgHoja1, 'JPEG', 0, 0, docWidth, docHeight, 'dc3_hoja1', 'FAST');

        const tc = DC3_COORDINATES.textColor;
        doc.setTextColor(tc[0], tc[1], tc[2]);

        const coords = DC3_COORDINATES;

        // 1. Datos del Trabajador (Nombre y CURP dinámicos)
        const cleanNombre = emp.nombreCompleto.replace(/\s+/g, ' ').trim();
        drawNormalText(doc, cleanNombre, coords.nombreCompleto.x, coords.nombreCompleto.y);
        drawGridText(doc, emp.curp,             coords.curp.x,            coords.curp.y,            coords.curp.step);

        // 2. Datos de la Empresa
        drawNormalText(doc, data.razonSocial,   coords.razonSocial.x,     coords.razonSocial.y);
        drawNormalText(doc, data.actividadGiro, coords.actividadGiro.x,   coords.actividadGiro.y);

        // 3. Datos del Curso
        drawNormalText(doc, course.nombreCurso,   coords.nombreCurso.x,     coords.nombreCurso.y);
        drawGridText(doc, course.duracionHoras,   coords.duracionHoras.x,   coords.duracionHoras.y,   coords.duracionHoras.step);
        drawNormalText(doc, data.agenteCapacitador, coords.agenteCapacitador.x, coords.agenteCapacitador.y);

        // Separar Fechas en AAAA - MM - DD
        if (course.fechaInicio) {
          const [anioI, mesI, diaI] = course.fechaInicio.split('-');
          drawGridText(doc, anioI || '', coords.inicioAnio.x, coords.inicioAnio.y, coords.inicioAnio.step);
          drawGridText(doc, mesI || '',  coords.inicioMes.x,  coords.inicioMes.y,  coords.inicioMes.step);
          drawGridText(doc, diaI || '',  coords.inicioDia.x,  coords.inicioDia.y,  coords.inicioDia.step);
        }

        if (course.fechaFin) {
          const [anioF, mesF, diaF] = course.fechaFin.split('-');
          drawGridText(doc, anioF || '', coords.finAnio.x, coords.finAnio.y, coords.finAnio.step);
          drawGridText(doc, mesF || '',  coords.finMes.x,  coords.finMes.y,  coords.finMes.step);
          drawGridText(doc, diaF || '',  coords.finDia.x,  coords.finDia.y,  coords.finDia.step);
        }

        // 4. Firmas
        // Imagen de firma del capacitador (centrada, respetando proporción original)
        if (firmaCapacitador) {
          const maxW = 28; // ancho máximo en mm (un poco más chico)
          const ratio = firmaCapacitador.h / firmaCapacitador.w;
          const sigW = maxW;
          const sigH = maxW * ratio;  // alto calculado para no deformar
          doc.addImage(
            firmaCapacitador.dataUrl,
            'PNG',
            coords.instructor.nameX - sigW / 2,   // centrado horizontalmente
            coords.instructor.nameY - sigH - 2 + 23,  // posición vertical (+8mm más abajo)
            sigW,
            sigH
          );
        }

        // Nombre del instructor
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(data.instructor.toUpperCase(), coords.instructor.nameX, coords.instructor.nameY, { align: 'center', maxWidth: 60 });



        // ────────────────────────────────────────────────────────
        // REVERSO DEL TRABAJADOR Y CURSO ACTUAL
        // ────────────────────────────────────────────────────────
        doc.addPage();
        doc.addImage(imgHoja2, 'JPEG', 0, 0, docWidth, docHeight, 'dc3_hoja2', 'FAST');
      }
    }

    // Nombre de archivo final
    let fileName = '';
    if (data.customFileName && data.customFileName.trim()) {
      fileName = generatePdfName('DC3', data.customFileName.trim(), data.courses[0].fechaInicio || 'LOTE');
    } else {
      const firstEmp = data.employees[0].nombreCompleto.replace(/\s+/g, '_').substring(0, 15);
      const batchSuffix = data.employees.length > 1 ? `_LOTE_${data.employees.length}TRAB` : `_${firstEmp}`;
      fileName = generatePdfName('DC3', batchSuffix, data.courses[0].fechaFin || 'LOTE');
    }
    
    const pdfBlob = doc.output('blob');

    if (preview) {
      return URL.createObjectURL(pdfBlob);
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      const file = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });
      try {
        await navigator.share({ files: [file] });
      } catch (err: any) {
        if (err.name !== 'AbortError') throw err;
      }
    } else {
      await savePdf(pdfBlob, `${fileName}.pdf`);
    }
  } catch (error: any) {
    console.error('Error al generar constancia DC-3:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al generar DC-3',
      text: `No se pudo generar la constancia DC-3. Asegúrate de tener formatodc3_hoja1.jpg y formatodc3_hoja2.jpg en tu carpeta public. Detalle: ${error.message}`,
      confirmButtonColor: '#722F37'
    });
  }
};
