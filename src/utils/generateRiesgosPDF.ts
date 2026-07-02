import { jsPDF } from 'jspdf';
import Swal from 'sweetalert2';
import { FIRMA_JORGE_BASE64 } from './firmaJorge';
import { generatePdfName } from './pdfNameGenerator';

export interface RiesgosPDFData {
  companyName: string;
  representativeName: string;
  commercialName: string;
  giro: string;
  fecha: string;
  direccion: string;
  entreCalles?: string;
  colonia?: string;
  municipio: string;
  niveles: string;
  m2Construccion: string;
  m2Superficie: string;
  antiguedad: string;
  poblacionFija: string;
  poblacionFlotante: string;
  gasDictamenVigencia?: string;
  gasDictamenFecha?: string;
  electricaDictamenVigencia?: string;
  electricaDictamenFecha?: string;

  croquis: {
    norteGeografico: boolean;
    riesgosInternos: boolean;
    zonasAltoRiesgo: boolean;
    equiposEmergencia: boolean;
    rutasEvacuacion: boolean;
    zonaConteo: boolean;
  };
  estructural: {
    inclinacion: boolean;
    separacion: boolean;
    deformacion: boolean;
    grietasMuros: boolean;
    hundimiento: boolean;
    grietasPiso: boolean;
    filtracion: boolean;
    danosEscaleras: boolean;
  };
  escalerasServicio: {
    homogeneas: boolean;
    barandal: boolean;
    pasamanos: boolean;
    cinta: boolean;
    iluminacion: boolean;
    estado: string;
  };
  escalerasEmergencia: {
    homogeneas: boolean;
    barandal: boolean;
    pasamanos: boolean;
    cinta: boolean;
    iluminacion: boolean;
    estado: string;
  };
  instalaciones: {
    hidrosanitaria: {
      cisterna: boolean;
      tinaco: boolean;
      danosTuberia: boolean;
      danosLlaves: boolean;
      dictamenTecnico: boolean;
    };
    gas: {
      tanqueEstacionario: boolean;
      tanqueMovil: boolean;
      calentadorAgua: boolean;
      dictamenTecnico: boolean;
      capacidad: string;
      fugas: boolean;
      estado: string;
      recomendaciones: string;
    };
    electrica: {
      subestacion: boolean;
      tableros: boolean;
      cableado: boolean;
      contactos: boolean;
      interruptores: boolean;
      lamparas: boolean;
      lamparasEmergencia: boolean;
      plantaEmergencia: boolean;
      transformador: boolean;
      dictamenTecnico: boolean;
      recomendaciones: string;
      estado: string;
    };
    especiales: {
      bombasAgua: boolean;
      ac: boolean;
      extractores: boolean;
      ventiladores: boolean;
      cercaElectrica: boolean;
      alarmaGeneral: boolean;
      presurizadores: boolean;
      recomendaciones: string;
    };
  };
  caer: {
    lamparas: { siNo: boolean; cantidad: number; estado: string };
    ventiladores: { siNo: boolean; cantidad: number; estado: string };
    pantallas: { siNo: boolean; cantidad: number; estado: string };
    evaporador: { siNo: boolean; cantidad: number; estado: string };
    cristaleria: { siNo: boolean; cantidad: number; estado: string };
    canceles: { siNo: boolean; cantidad: number; estado: string };
    techos: { siNo: boolean; cantidad: number; estado: string };
    plafones: { siNo: boolean; cantidad: number; estado: string };
    repisas: { siNo: boolean; cantidad: number; estado: string };
    cuadros: { siNo: boolean; cantidad: number; estado: string };
    espejos: { siNo: boolean; cantidad: number; estado: string };
    liquidosToxicos: { siNo: boolean; cantidad: number; estado: string };
    liquidosInflamables: { siNo: boolean; cantidad: number; estado: string };
    liquidosCorrosivos: { siNo: boolean; cantidad: number; estado: string };
    otros: { siNo: boolean; cantidad: number; estado: string };
    recomendaciones: string;
  };
  deslizarse: {
    escritorios: { siNo: boolean; cantidad: number; estado: string };
    mesas: { siNo: boolean; cantidad: number; estado: string };
    sillas: { siNo: boolean; cantidad: number; estado: string };
    refrigeradores: { siNo: boolean; cantidad: number; estado: string };
    ruedas: { siNo: boolean; cantidad: number; estado: string };
    recomendaciones: string;
  };
  volcar: {
    computo: { siNo: boolean; cantidad: number; estado: string };
    libreros: { siNo: boolean; cantidad: number; estado: string };
    roperos: { siNo: boolean; cantidad: number; estado: string };
    lockers: { siNo: boolean; cantidad: number; estado: string };
    archiveros: { siNo: boolean; cantidad: number; estado: string };
    estantes: { siNo: boolean; cantidad: number; estado: string };
    vitrinas: { siNo: boolean; cantidad: number; estado: string };
    tanquesGas: { siNo: boolean; cantidad: number; estado: string };
    subdivisiones: { siNo: boolean; cantidad: number; estado: string };
    recomendaciones: string;
  };
  acabados: {
    lambrinesIncombustibles: boolean;
    lambrinesCombustibles: boolean;
    pisosDesniveles: boolean;
    pisosFalsos: boolean;
    losetasAzulejos: boolean;
    cantidadM2: number;
    estado: string;
    recomendaciones: string;
  };
  equiposEmergencia: {
    alarmas: { siNo: boolean; cantidad: number; estado: string };
    detectoresHumo: { siNo: boolean; cantidad: number; estado: string };
    extintores: { siNo: boolean; cantidad: number; estado: string };
    trajeBombero: { siNo: boolean; cantidad: number; estado: string };
    casco: { siNo: boolean; cantidad: number; estado: string };
    herramienta: { siNo: boolean; cantidad: number; estado: string };
    manta: { siNo: boolean; cantidad: number; estado: string };
    rutaEvacuacion: { siNo: boolean; cantidad: number; estado: string };
    salidaEmergencia: { siNo: boolean; cantidad: number; estado: string };
    puntoReunion: { siNo: boolean; cantidad: number; estado: string };
    senalizacion: { siNo: boolean; cantidad: number; estado: string };
    brigadas: { siNo: boolean; cantidad: number; estado: string };
    comunicacion: { siNo: boolean; cantidad: number; estado: string };
    zonasSeguridad: { siNo: boolean; cantidad: number; estado: string };
  };
  otrosRiesgos: {
    inflamar: {
      combustibles: boolean;
      solventes: boolean;
      papelCarton: boolean;
      recomendaciones: string;
    };
    propiciar: {
      cigarros: boolean;
      colillas: boolean;
      velas: boolean;
      instalacionGas: boolean;
      cafeteras: boolean;
      contactos: boolean;
      apagadores: boolean;
      cablesMalEstado: boolean;
      microondas: boolean;
      recomendaciones: string;
    };
    obstaculizar: {
      tapetes: boolean;
      macetas: boolean;
      archiveros: boolean;
      pizarrones: boolean;
      muebles: boolean;
      equiposLimpieza: boolean;
      herramientas: boolean;
      puertasCerradas: boolean;
      lavadoras: boolean;
      bombeo: boolean;
      recomendaciones: string;
    };
  };
  riesgosExternos: {
    entorno: {
      tanquesElevados: { siNo: boolean; distancia: string };
      postesMalEstado: { siNo: boolean; distancia: string };
      torresAltaTension: { siNo: boolean; distancia: string };
      transformadores: { siNo: boolean; distancia: string };
      inmueblesDanados: { siNo: boolean; distancia: string };
      banquetas: { siNo: boolean; distancia: string };
      alcantarillas: { siNo: boolean; distancia: string };
      arboles: { siNo: boolean; distancia: string };
      callesTransitadas: { siNo: boolean; distancia: string };
      fabricasGas: { siNo: boolean; distancia: string };
      tanquesGasLp: { siNo: boolean; distancia: string };
      gasolineras: { siNo: boolean; distancia: string };
      espectaculares: { siNo: boolean; distancia: string };
      almacenesPeligrosos: { siNo: boolean; distancia: string };
      fabricas: { siNo: boolean; distancia: string };
      costas: { siNo: boolean; distancia: string };
      tallerSolventes: { siNo: boolean; distancia: string };
    };
    socioOrganizativo: {
      accidentes: {
        vehiculosParticulares: boolean;
        vehiculosPeligrosos: boolean;
        vehiculosPasajeros: boolean;
        aereos: boolean;
        otros: boolean;
      };
      delictivo: {
        robo: boolean;
        roboViolencia: boolean;
        invasion: boolean;
        interrupcion: boolean;
        sabotajeServicios: boolean;
        sabotajePrivados: boolean;
        otros: boolean;
      };
      disturbios: {
        marchas: boolean;
        plantones: boolean;
        vandalismo: boolean;
        otros: boolean;
      };
      lugaresPublicos: {
        bares: boolean;
        cantinas: boolean;
        antros: boolean;
        iglesias: boolean;
        restaurantesBares: boolean;
        salones: boolean;
        construcciones: boolean;
        hospitales: boolean;
        centrosNocturnos: boolean;
      };
    };
    geologico: {
      fallas: boolean;
      sismos: boolean;
      deslizamiento: boolean;
      hundimiento: boolean;
    };
    quimico: {
      incendios: boolean;
      explosiones: boolean;
      fugas: boolean;
      radiaciones: boolean;
    };
    hidrometeorologico: {
      inundacion: {
        rio: boolean;
        lago: boolean;
        lluvia: boolean;
        mar: boolean;
      };
      otros: {
        vientosFuertes: boolean;
        huracan: boolean;
        mareaTormenta: boolean;
        tormentaElectrica: boolean;
        lluviaTorrencial: boolean;
        tromba: boolean;
        tornado: boolean;
        granizo: boolean;
        sequia: boolean;
      };
    };
    sanitario: {
      epidemia: { siNo: boolean; vulnerableA: string };
      plaga: { siNo: boolean; vulnerableA: string };
      envenenamiento: { siNo: boolean; vulnerableA: string };
    };
  };
}

export const generateRiesgosPDF = async (data: RiesgosPDFData, preview: boolean = false): Promise<string | void> => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const docWidth = doc.internal.pageSize.getWidth();
    const docHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const w = docWidth - margin * 2; // 186 mm usable width

    const setBold = (size: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
    };
    const setNormal = (size: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
    };

    let y = 15;

    // --- PAGE 1: DATOS GENERALES Y ESTRUCTURALES ---
    // Title
    doc.setFillColor(18, 52, 86);
    doc.rect(margin, y - 5, w, 10, 'F');
    setBold(12);
    doc.setTextColor(255, 255, 255);
    doc.text('IDENTIFICACIÓN Y ANÁLISIS DE RIESGOS', docWidth / 2, y + 1.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 12;

    // General Info Box
    setNormal(8.5);
    const drawInfoField = (label: string, value: string, currentY: number, labelW: number = 55): number => {
      setBold(8.5);
      doc.setTextColor(18, 52, 86);
      doc.text(label, margin, currentY);
      setBold(8.5);
      doc.setTextColor(0, 0, 0);
      const textLines = doc.splitTextToSize((value || '').toUpperCase(), w - labelW);
      doc.text(textLines, margin + labelW, currentY);
      const lineY = currentY + 1 + (textLines.length - 1) * 3.5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin + labelW, lineY, margin + w, lineY);
      doc.setDrawColor(0, 0, 0);
      return lineY + 4;
    };

    y = drawInfoField('1. NOMBRE COMERCIAL:', data.commercialName, y, 40);
    y = drawInfoField('RAZÓN SOCIAL:', data.companyName, y, 40);
    y = drawInfoField('PROPIETARIO / RESPONSABLE:', data.representativeName, y, 55);
    y = drawInfoField('DOMICILIO:', data.direccion, y, 22);
    y = drawInfoField('MUNICIPIO:', data.municipio, y, 22);
    y = drawInfoField('ACTIVIDAD O GIRO:', data.giro, y, 35);
    y = drawInfoField('FECHA DE VISITA:', data.fecha, y, 35);

    // Levels, Area, Population (Compact Grid)
    setNormal(8.5);
    doc.text(`NIVELES: ${data.niveles || '1'}`, margin, y);
    doc.text(`SUPERFICIE CONSTRUIDA M²: ${data.m2Construccion}`, margin + 65, y);
    doc.text(`ANTIGÜEDAD (AÑOS): ${data.antiguedad}`, margin + 130, y);
    y += 5;
    doc.text(`POBLACIÓN FIJA: ${data.poblacionFija}`, margin, y);
    doc.text(`POBLACIÓN FLOTANTE: ${data.poblacionFlotante}`, margin + 65, y);
    y += 8;

    // Croquis de localización checklist
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('CROQUIS DE LOCALIZACIÓN POR CADA NIVEL DONDE SE SEÑALE:', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    const drawChecklistHeader = (currentY: number, textColW: number = 110) => {
      setBold(8.5);
      doc.setFillColor(18, 52, 86);
      doc.rect(margin, currentY, w, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('DESCRIPCIÓN', margin + 2, currentY + 3.8);
      doc.text('SÍ', margin + textColW + 8, currentY + 3.8);
      doc.text('NO', margin + textColW + 28, currentY + 3.8);
      doc.setTextColor(0, 0, 0);
      return currentY + 5;
    };

    const drawChecklistRow = (label: string, value: boolean, currentY: number, textColW: number = 110): number => {
      setNormal(8);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, w, 5, 'S');
      doc.text(label, margin + 2, currentY + 3.8);
      setBold(8);
      if (value) {
        doc.text('X', margin + textColW + 9, currentY + 3.8);
      } else {
        doc.text('X', margin + textColW + 29, currentY + 3.8);
      }
      doc.line(margin + textColW, currentY, margin + textColW, currentY + 5);
      doc.line(margin + textColW + 20, currentY, margin + textColW + 20, currentY + 5);
      doc.setDrawColor(0, 0, 0);
      return currentY + 5;
    };

    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Norte geográfico del inmueble', data.croquis.norteGeografico, y, 140);
    y = drawChecklistRow('Riesgos internos identificados', data.croquis.riesgosInternos, y, 140);
    y = drawChecklistRow('Zonas consideradas como alto riesgo', data.croquis.zonasAltoRiesgo, y, 140);
    y = drawChecklistRow('Equipos y servicios de emergencia', data.croquis.equiposEmergencia, y, 140);
    y = drawChecklistRow('Rutas de evacuación y salidas de emergencias', data.croquis.rutasEvacuacion, y, 140);
    y = drawChecklistRow('Zona de menor riesgo y zona de conteo', data.croquis.zonaConteo, y, 140);
    y += 6;

    // 2.1 RIESGOS POR DAÑOS ESTRUCTURALES
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('2.1 RIESGOS POR DAÑOS ESTRUCTURALES', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Presenta inclinación', data.estructural.inclinacion, y, 140);
    y = drawChecklistRow('Separación de elementos estructurales', data.estructural.separacion, y, 140);
    y = drawChecklistRow('Deformación de muros, columnas, losas o trabes', data.estructural.deformacion, y, 140);
    y = drawChecklistRow('Los muros presentan grietas', data.estructural.grietasMuros, y, 140);
    y = drawChecklistRow('Hundimiento del inmueble', data.estructural.hundimiento, y, 140);
    y = drawChecklistRow('Grietas en el piso', data.estructural.grietasPiso, y, 140);
    y = drawChecklistRow('Existe filtración de agua', data.estructural.filtracion, y, 140);
    y = drawChecklistRow('Presenta daños en escaleras y rampas', data.estructural.danosEscaleras, y, 140);

    // --- PAGE 2: ESCALERAS & INSTALACIONES ---
    doc.addPage();
    y = 15;

    const drawStateRowHeader = (title: string, currentY: number): number => {
      setBold(9);
      doc.setTextColor(18, 52, 86);
      doc.text(title, margin, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 3;
      doc.setFillColor(18, 52, 86);
      doc.rect(margin, currentY, w, 5, 'F');
      doc.setTextColor(255, 255, 255);
      setBold(8);
      doc.text('DESCRIPCIÓN', margin + 2, currentY + 3.8);
      doc.text('SÍ', margin + 98, currentY + 3.8);
      doc.text('NO', margin + 113, currentY + 3.8);
      doc.text('BUENO', margin + 128, currentY + 3.8);
      doc.text('REGULAR', margin + 148, currentY + 3.8);
      doc.text('MALO', margin + 171, currentY + 3.8);
      doc.setTextColor(0, 0, 0);
      return currentY + 5;
    };

    const drawStateRow = (label: string, siNo: boolean, estado: string, currentY: number): number => {
      setNormal(8);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, w, 5, 'S');
      doc.text(label, margin + 2, currentY + 3.8);
      setBold(8);
      if (siNo) {
        doc.text('X', margin + 99, currentY + 3.8);
      } else {
        doc.text('X', margin + 114, currentY + 3.8);
      }
      if (siNo) {
        if (estado === 'BUENO') doc.text('X', margin + 132, currentY + 3.8);
        if (estado === 'REGULAR') doc.text('X', margin + 154, currentY + 3.8);
        if (estado === 'MALO') doc.text('X', margin + 174, currentY + 3.8);
      }
      doc.line(margin + 95, currentY, margin + 95, currentY + 5);
      doc.line(margin + 110, currentY, margin + 110, currentY + 5);
      doc.line(margin + 125, currentY, margin + 125, currentY + 5);
      doc.line(margin + 145, currentY, margin + 145, currentY + 5);
      doc.line(margin + 168, currentY, margin + 168, currentY + 5);
      doc.setDrawColor(0, 0, 0);
      return currentY + 5;
    };

    y = drawStateRowHeader('2.2 DESCRIPCION DE LAS ESCALERAS DE SERVICIO', y);
    y = drawStateRow('Escaleras homogéneas', data.escalerasServicio.homogeneas, data.escalerasServicio.estado, y);
    y = drawStateRow('Cuenta con barandal', data.escalerasServicio.barandal, data.escalerasServicio.estado, y);
    y = drawStateRow('Cuenta con pasamanos', data.escalerasServicio.pasamanos, data.escalerasServicio.estado, y);
    y = drawStateRow('Cuenta con cinta antiderrapante', data.escalerasServicio.cinta, data.escalerasServicio.estado, y);
    y = drawStateRow('Iluminación artificial', data.escalerasServicio.iluminacion, data.escalerasServicio.estado, y);
    y += 5;

    y = drawStateRowHeader('2.3 DESCRIPCION DE LAS ESCALERAS DE EMERGENCIA', y);
    y = drawStateRow('Escaleras homogéneas', data.escalerasEmergencia.homogeneas, data.escalerasEmergencia.estado, y);
    y = drawStateRow('Cuenta con barandal', data.escalerasEmergencia.barandal, data.escalerasEmergencia.estado, y);
    y = drawStateRow('Cuenta con pasamanos', data.escalerasEmergencia.pasamanos, data.escalerasEmergencia.estado, y);
    y = drawStateRow('Cuenta con cinta antiderrapante', data.escalerasEmergencia.cinta, data.escalerasEmergencia.estado, y);
    y = drawStateRow('Iluminación artificial', data.escalerasEmergencia.iluminacion, data.escalerasEmergencia.estado, y);
    y += 6;

    // 2.4 INSTALACIONES DE SERVICIO
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('2.4 RIESGOS POR DEFICIENCIA EN LAS INSTALACIONES DE SERVICIO DEL INMUEBLE', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    const drawInstalacionesHeader = (label: string, currentY: number): number => {
      setBold(8.5);
      doc.setFillColor(18, 52, 86);
      doc.rect(margin, currentY, w, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(label, margin + 2, currentY + 3.8);
      doc.text('SÍ', margin + 98, currentY + 3.8);
      doc.text('NO', margin + 113, currentY + 3.8);
      doc.text('CAPACIDAD', margin + 127, currentY + 3.8);
      doc.text('ESTADO / FUGAS', margin + 155, currentY + 3.8);
      doc.setTextColor(0, 0, 0);
      return currentY + 5;
    };

    const drawInstalacionRow = (label: string, siNo: boolean, capacidad: string, estadoFugas: string, currentY: number): number => {
      setNormal(8);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, w, 5, 'S');
      doc.text(label, margin + 2, currentY + 3.8);
      setBold(8);
      if (siNo) {
        doc.text('X', margin + 99, currentY + 3.8);
      } else {
        doc.text('X', margin + 114, currentY + 3.8);
      }
      
      let finalCapacidad = capacidad;
      let finalEstado = estadoFugas;
      
      if (label === 'Daños en tuberías / Llaves') {
        finalEstado = siNo ? 'CON DAÑOS' : 'SIN DAÑOS';
      } else {
        if (!siNo) {
          finalCapacidad = 'N/A';
          finalEstado = 'N/A';
        } else {
          if (finalEstado === 'N/A') finalEstado = 'BUENO';
        }
      }

      doc.text(finalCapacidad, margin + 127, currentY + 3.8);
      doc.text(finalEstado, margin + 154, currentY + 3.8);
      doc.line(margin + 95, currentY, margin + 95, currentY + 5);
      doc.line(margin + 110, currentY, margin + 110, currentY + 5);
      doc.line(margin + 125, currentY, margin + 125, currentY + 5);
      doc.line(margin + 152, currentY, margin + 152, currentY + 5);
      doc.setDrawColor(0, 0, 0);
      return currentY + 5;
    };

    // Hidrosanitaria
    y = drawInstalacionesHeader('INSTALACIÓN HIDROSANITARIA', y);
    y = drawInstalacionRow('Cisterna', data.instalaciones.hidrosanitaria.cisterna, 'N.D.', 'BUENO', y);
    y = drawInstalacionRow('Tinaco', data.instalaciones.hidrosanitaria.tinaco, 'N.D.', 'BUENO', y);
    y = drawInstalacionRow('Daños en tuberías / Llaves', data.instalaciones.hidrosanitaria.danosTuberia, '—', 'SIN DAÑOS', y);
    y = drawInstalacionRow('Cuenta con Dictamen Técnico', data.instalaciones.hidrosanitaria.dictamenTecnico, '—', 'VIGENTE', y);
    y += 4;

    // Gas
    y = drawInstalacionesHeader('INSTALACIÓN DE GAS', y);
    y = drawInstalacionRow('Tanque Estacionario', data.instalaciones.gas.tanqueEstacionario, data.instalaciones.gas.capacidad, data.instalaciones.gas.estado, y);
    y = drawInstalacionRow('Tanque Móvil', data.instalaciones.gas.tanqueMovil, '—', 'BUENO', y);
    y = drawInstalacionRow('Calentador de Agua', data.instalaciones.gas.calentadorAgua, '—', 'BUENO', y);
    y += 2;
    if (data.instalaciones.gas.dictamenTecnico) {
      doc.setFillColor(240, 244, 248);
      doc.setDrawColor(18, 52, 86);
      doc.rect(margin, y, w, 11, 'FD');
      setBold(7.5);
      doc.setTextColor(18, 52, 86);
      doc.text('DICTAMEN TÉCNICO DE GAS (VIGENTE)', margin + 3, y + 3.5);
      setNormal(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`FECHA DE ELABORACIÓN: ${data.gasDictamenFecha || 'N/D'}`, margin + 3, y + 7.5);
      doc.text(`VIGENCIA: ${data.gasDictamenVigencia || 'N/D'}`, margin + 95, y + 7.5);
      y += 13;
    }
    if (data.instalaciones.gas.recomendaciones) {
      setNormal(7.5);
      doc.text(`Recomendaciones Gas: ${data.instalaciones.gas.recomendaciones.toUpperCase()}`, margin, y + 3.5);
      y += 5;
    }
    y += 4;

    const electricaHeight = 35 + (data.instalaciones.electrica.dictamenTecnico ? 15 : 0) + (data.instalaciones.electrica.recomendaciones ? 8 : 0);
    if (y + electricaHeight > 265) {
      doc.addPage();
      y = 15;
    }

     // Eléctrica
    y = drawInstalacionesHeader('INSTALACIÓN ELÉCTRICA', y);
    y = drawInstalacionRow('Subestación / Transformador', data.instalaciones.electrica.subestacion || data.instalaciones.electrica.transformador, '—', data.instalaciones.electrica.estado, y);
    y = drawInstalacionRow('Tableros eléctricos', data.instalaciones.electrica.tableros, '—', 'BUENO', y);
    y = drawInstalacionRow('Cableado e instalaciones', data.instalaciones.electrica.cableado, '—', 'BUENO', y);
    y = drawInstalacionRow('Contactos / Apagadores / Lámparas', data.instalaciones.electrica.contactos || data.instalaciones.electrica.lamparas, '—', 'BUENO', y);
    y = drawInstalacionRow('Lámparas de emergencia', data.instalaciones.electrica.lamparasEmergencia, '—', 'BUENO', y);
    y = drawInstalacionRow('Planta de Emergencia', data.instalaciones.electrica.plantaEmergencia, '—', 'N/A', y);
    y += 2;
    if (data.instalaciones.electrica.dictamenTecnico) {
      doc.setFillColor(240, 244, 248);
      doc.setDrawColor(18, 52, 86);
      doc.rect(margin, y, w, 11, 'FD');
      setBold(7.5);
      doc.setTextColor(18, 52, 86);
      doc.text('DICTAMEN TÉCNICO DE INSTALACIÓN ELÉCTRICA (VIGENTE)', margin + 3, y + 3.5);
      setNormal(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`FECHA DE ELABORACIÓN: ${data.electricaDictamenFecha || 'N/D'}`, margin + 3, y + 7.5);
      doc.text(`VIGENCIA: ${data.electricaDictamenVigencia || 'N/D'}`, margin + 95, y + 7.5);
      y += 13;
    }
    if (data.instalaciones.electrica.recomendaciones) {
      setNormal(7.5);
      doc.text(`Recomendaciones Electricas: ${data.instalaciones.electrica.recomendaciones.toUpperCase()}`, margin, y + 3.5);
      y += 5;
    }
    y += 4;

    if (y + 35 > 265) {
      doc.addPage();
      y = 15;
    }

    // Especiales
    y = drawInstalacionesHeader('INSTALACIONES ESPECIALES', y);
    y = drawInstalacionRow('Bombas de agua / Presurizadores', data.instalaciones.especiales.bombasAgua || data.instalaciones.especiales.presurizadores, '—', 'BUENO', y);
    y = drawInstalacionRow('Aires Acondicionados', data.instalaciones.especiales.ac, '—', 'BUENO', y);
    y = drawInstalacionRow('Extractores / Ventiladores', data.instalaciones.especiales.extractores || data.instalaciones.especiales.ventiladores, '—', 'BUENO', y);
    y = drawInstalacionRow('Alarma General / Cerca Eléctrica', data.instalaciones.especiales.alarmaGeneral || data.instalaciones.especiales.cercaElectrica, '—', 'BUENO', y);
    y += 6;

    // 2.5 RIESGOS POR ELEMENTOS NO ESTRUCTURALES
    if (y + 85 > 265) {
      doc.addPage();
      y = 15;
    }
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('2.5 RIESGOS POR ELEMENTOS NO ESTRUCTURALES (OBJETOS A CAER, DESLIZARSE O VOLCAR)', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    const drawNoEstructuralHeader = (title: string, currentY: number): number => {
      setBold(8.5);
      doc.setFillColor(18, 52, 86);
      doc.rect(margin, currentY, w, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 2, currentY + 3.8);
      doc.text('SÍ', margin + 98, currentY + 3.8);
      doc.text('NO', margin + 113, currentY + 3.8);
      doc.text('CANTIDAD', margin + 127, currentY + 3.8);
      doc.text('ESTADO FISICO', margin + 155, currentY + 3.8);
      doc.setTextColor(0, 0, 0);
      return currentY + 5;
    };

    const drawNoEstructuralRow = (label: string, item: { siNo: boolean; cantidad: number; estado: string }, currentY: number): number => {
      setNormal(8);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, w, 5, 'S');
      doc.text(label, margin + 2, currentY + 3.8);
      setBold(8);
      if (item.siNo) {
        doc.text('X', margin + 99, currentY + 3.8);
      } else {
        doc.text('X', margin + 114, currentY + 3.8);
      }
      doc.text(item.siNo ? String(item.cantidad) : '—', margin + 130, currentY + 3.8);
      doc.text(item.siNo ? item.estado : '—', margin + 155, currentY + 3.8);
      doc.line(margin + 95, currentY, margin + 95, currentY + 5);
      doc.line(margin + 110, currentY, margin + 110, currentY + 5);
      doc.line(margin + 125, currentY, margin + 125, currentY + 5);
      doc.line(margin + 152, currentY, margin + 152, currentY + 5);
      doc.setDrawColor(0, 0, 0);
      return currentY + 5;
    };

    y = drawNoEstructuralHeader('OBJETOS QUE PUEDEN CAER', y);
    y = drawNoEstructuralRow('Lámparas', data.caer.lamparas, y);
    y = drawNoEstructuralRow('Ventiladores', data.caer.ventiladores, y);
    y = drawNoEstructuralRow('Pantallas', data.caer.pantallas, y);
    y = drawNoEstructuralRow('Evaporador A/C', data.caer.evaporador, y);
    y = drawNoEstructuralRow('Cristalería', data.caer.cristaleria, y);
    y = drawNoEstructuralRow('Canceles de vidrio', data.caer.canceles, y);
    y = drawNoEstructuralRow('Techos', data.caer.techos, y);
    y = drawNoEstructuralRow('Plafones', data.caer.plafones, y);
    y = drawNoEstructuralRow('Repisas', data.caer.repisas, y);
    y = drawNoEstructuralRow('Cuadros', data.caer.cuadros, y);
    y = drawNoEstructuralRow('Espejos', data.caer.espejos, y);
    y = drawNoEstructuralRow('Líquidos Tóxicos', data.caer.liquidosToxicos, y);
    y = drawNoEstructuralRow('Líquidos Inflamables', data.caer.liquidosInflamables, y);
    y = drawNoEstructuralRow('Líquidos Corrosivos', data.caer.liquidosCorrosivos, y);
    y = drawNoEstructuralRow('Otros', data.caer.otros, y);
    if (data.caer.recomendaciones) {
      setNormal(7.5);
      doc.text(`Recomendaciones Caer: ${data.caer.recomendaciones.toUpperCase()}`, margin, y + 3.5);
      y += 5;
    }
    y += 4;
    if (y + 35 > 265) {
      doc.addPage();
      y = 15;
    }

    y = drawNoEstructuralHeader('OBJETOS QUE PUEDEN DESLIZARSE', y);
    y = drawNoEstructuralRow('Escritorios', data.deslizarse.escritorios, y);
    y = drawNoEstructuralRow('Mesas', data.deslizarse.mesas, y);
    y = drawNoEstructuralRow('Sillas', data.deslizarse.sillas, y);
    y = drawNoEstructuralRow('Refrigeradores', data.deslizarse.refrigeradores, y);
    y = drawNoEstructuralRow('Objetos con ruedas', data.deslizarse.ruedas, y);
    if (data.deslizarse.recomendaciones) {
      setNormal(7.5);
      doc.text(`Recomendaciones Deslizarse: ${data.deslizarse.recomendaciones.toUpperCase()}`, margin, y + 3.5);
      y += 5;
    }
    y += 4;
    if (y + 55 > 265) {
      doc.addPage();
      y = 15;
    }

    y = drawNoEstructuralHeader('EQUIPOS QUE PUEDEN VOLCAR', y);
    y = drawNoEstructuralRow('Equipo de cómputo', data.volcar.computo, y);
    y = drawNoEstructuralRow('Libreros', data.volcar.libreros, y);
    y = drawNoEstructuralRow('Roperos', data.volcar.roperos, y);
    y = drawNoEstructuralRow('Lockers', data.volcar.lockers, y);
    y = drawNoEstructuralRow('Archiveros', data.volcar.archiveros, y);
    y = drawNoEstructuralRow('Estantes no anclados', data.volcar.estantes, y);
    y = drawNoEstructuralRow('Vitrinas', data.volcar.vitrinas, y);
    y = drawNoEstructuralRow('Tanques de gas', data.volcar.tanquesGas, y);
    y = drawNoEstructuralRow('Subdivisiones', data.volcar.subdivisiones, y);
    if (data.volcar.recomendaciones) {
      setNormal(7.5);
      doc.text(`Recomendaciones Volcar: ${data.volcar.recomendaciones.toUpperCase()}`, margin, y + 3.5);
      y += 5;
    }

    // 2.6 ACABADOS
    if (y + 35 > 265) {
      doc.addPage();
      y = 15;
    }
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('2.6 RIESGOS POR ACABADOS EN EL INMUEBLE', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Lambrines incombustibles', data.acabados.lambrinesIncombustibles, y, 140);
    y = drawChecklistRow('Lambrines combustibles', data.acabados.lambrinesCombustibles, y, 140);
    y = drawChecklistRow('Pisos con desniveles', data.acabados.pisosDesniveles, y, 140);
    y = drawChecklistRow('Pisos falsos', data.acabados.pisosFalsos, y, 140);
    y = drawChecklistRow('Losetas y azulejos', data.acabados.losetasAzulejos, y, 140);
    y += 5;
    if (y + 80 > 265) {
      doc.addPage();
      y = 15;
    }

    // 2.7 EQUIPOS Y SERVICIOS DE EMERGENCIA
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('2.7 RIESGO DEFICIENCIAS EN LOS EQUIPOS Y SERVICIOS DE EMERGENCIA', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    y = drawNoEstructuralHeader('EQUIPOS Y SERVICIOS DE EMERGENCIA', y);
    y = drawNoEstructuralRow('Sistema de Alarma', data.equiposEmergencia.alarmas, y);
    y = drawNoEstructuralRow('Detectores de humo', data.equiposEmergencia.detectoresHumo, y);
    y = drawNoEstructuralRow('Extintores portátiles', data.equiposEmergencia.extintores, y);
    y = drawNoEstructuralRow('Traje de bombero', data.equiposEmergencia.trajeBombero, y);
    y = drawNoEstructuralRow('Casco', data.equiposEmergencia.casco, y);
    y = drawNoEstructuralRow('Herramientas', data.equiposEmergencia.herramienta, y);
    y = drawNoEstructuralRow('Manta contra incendios', data.equiposEmergencia.manta, y);
    y = drawNoEstructuralRow('Rutas de Evacuación', data.equiposEmergencia.rutaEvacuacion, y);
    y = drawNoEstructuralRow('Salida de emergencia', data.equiposEmergencia.salidaEmergencia, y);
    y = drawNoEstructuralRow('Punto de Reunión', data.equiposEmergencia.puntoReunion, y);
    y = drawNoEstructuralRow('Señalización', data.equiposEmergencia.senalizacion, y);
    y = drawNoEstructuralRow('Brigadas', data.equiposEmergencia.brigadas, y);
    y = drawNoEstructuralRow('Equipo de comunicación', data.equiposEmergencia.comunicacion, y);
    y = drawNoEstructuralRow('Zonas de seguridad', data.equiposEmergencia.zonasSeguridad, y);
    y += 5;

    // 2.8 OTROS RIESGOS INTERNOS
    if (y + 120 > 265) {
      doc.addPage();
      y = 15;
    }
    setBold(9.5);
    doc.setTextColor(18, 52, 86);
    doc.text('2.8 OTROS RIESGOS INTERNOS COMO:', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Papel y cartón', data.otrosRiesgos.inflamar.papelCarton, y, 140);
    y = drawChecklistRow('Líquidos combustibles', data.otrosRiesgos.inflamar.combustibles, y, 140);
    y = drawChecklistRow('Solventes', data.otrosRiesgos.inflamar.solventes, y, 140);
    y = drawChecklistRow('Cigarros', data.otrosRiesgos.propiciar.cigarros, y, 140);
    y = drawChecklistRow('Colillas encendidas', data.otrosRiesgos.propiciar.colillas, y, 140);
    y = drawChecklistRow('Velas', data.otrosRiesgos.propiciar.velas, y, 140);
    y = drawChecklistRow('Instalación de gas', data.otrosRiesgos.propiciar.instalacionGas, y, 140);
    y = drawChecklistRow('Cafeteras', data.otrosRiesgos.propiciar.cafeteras, y, 140);
    y = drawChecklistRow('Contactos eléctricos', data.otrosRiesgos.propiciar.contactos, y, 140);
    y = drawChecklistRow('Apagadores', data.otrosRiesgos.propiciar.apagadores, y, 140);
    y = drawChecklistRow('Cables en mal estado', data.otrosRiesgos.propiciar.cablesMalEstado, y, 140);
    y = drawChecklistRow('Hornos de microondas', data.otrosRiesgos.propiciar.microondas, y, 140);
    y = drawChecklistRow('Tapetes', data.otrosRiesgos.obstaculizar.tapetes, y, 140);
    y = drawChecklistRow('Macetas', data.otrosRiesgos.obstaculizar.macetas, y, 140);
    y = drawChecklistRow('Archiveros', data.otrosRiesgos.obstaculizar.archiveros, y, 140);
    y = drawChecklistRow('Pizarrones', data.otrosRiesgos.obstaculizar.pizarrones, y, 140);
    y = drawChecklistRow('Muebles sueltos', data.otrosRiesgos.obstaculizar.muebles, y, 140);
    y = drawChecklistRow('Equipos de limpieza', data.otrosRiesgos.obstaculizar.equiposLimpieza, y, 140);
    y = drawChecklistRow('Herramientas', data.otrosRiesgos.obstaculizar.herramientas, y, 140);
    y = drawChecklistRow('Puertas cerradas con llave', data.otrosRiesgos.obstaculizar.puertasCerradas, y, 140);
    y = drawChecklistRow('Lavadoras', data.otrosRiesgos.obstaculizar.lavadoras, y, 140);
    y = drawChecklistRow('Equipos de bombeo', data.otrosRiesgos.obstaculizar.bombeo, y, 140);
    y += 6;

    // 3. RIESGOS EXTERNOS
    if (y + 95 > 265) {
      doc.addPage();
      y = 15;
    }
    setBold(10);
    doc.setTextColor(18, 52, 86);
    doc.text('3. RIESGOS EXTERNOS (ENTORNO Y AGENTES PERTURBADORES)', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    const drawExternoHeader = (currentY: number): number => {
      setBold(8.5);
      doc.setFillColor(18, 52, 86);
      doc.rect(margin, currentY, w, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('ELEMENTOS A EVALUAR EN EL ENTORNO', margin + 2, currentY + 3.8);
      doc.text('SÍ', margin + 98, currentY + 3.8);
      doc.text('NO', margin + 113, currentY + 3.8);
      doc.text('DISTANCIA APROXIMADA', margin + 132, currentY + 3.8);
      doc.setTextColor(0, 0, 0);
      return currentY + 5;
    };

    const drawExternoRow = (label: string, element: { siNo: boolean; distancia: string }, currentY: number): number => {
      setNormal(8);
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, currentY, w, 5, 'S');
      doc.text(label, margin + 2, currentY + 3.8);
      setBold(8);
      if (element.siNo) {
        doc.text('X', margin + 99, currentY + 3.8);
      } else {
        doc.text('X', margin + 114, currentY + 3.8);
      }
      doc.text(element.siNo ? element.distancia : '—', margin + 133, currentY + 3.8);
      doc.line(margin + 95, currentY, margin + 95, currentY + 5);
      doc.line(margin + 110, currentY, margin + 110, currentY + 5);
      doc.line(margin + 130, currentY, margin + 130, currentY + 5);
      doc.setDrawColor(0, 0, 0);
      return currentY + 5;
    };

    y = drawExternoHeader(y);
    y = drawExternoRow('Tanques elevados de agua', data.riesgosExternos.entorno.tanquesElevados, y);
    y = drawExternoRow('Postes en mal estado', data.riesgosExternos.entorno.postesMalEstado, y);
    y = drawExternoRow('Torres de alta tensión', data.riesgosExternos.entorno.torresAltaTension, y);
    y = drawExternoRow('Transformadores de energía eléctrica', data.riesgosExternos.entorno.transformadores, y);
    y = drawExternoRow('Inmuebles dañados', data.riesgosExternos.entorno.inmueblesDanados, y);
    y = drawExternoRow('Banquetas', data.riesgosExternos.entorno.banquetas, y);
    y = drawExternoRow('Alcantarillas', data.riesgosExternos.entorno.alcantarillas, y);
    y = drawExternoRow('Árboles grandes que puedan caer', data.riesgosExternos.entorno.arboles, y);
    y = drawExternoRow('Calles muy transitadas', data.riesgosExternos.entorno.callesTransitadas, y);
    y = drawExternoRow('Fábricas de gas', data.riesgosExternos.entorno.fabricasGas, y);
    y = drawExternoRow('Tanques de gas L.P.', data.riesgosExternos.entorno.tanquesGasLp, y);
    y = drawExternoRow('Gasolineras', data.riesgosExternos.entorno.gasolineras, y);
    y = drawExternoRow('Anuncios espectaculares', data.riesgosExternos.entorno.espectaculares, y);
    y = drawExternoRow('Almacenes peligrosos', data.riesgosExternos.entorno.almacenesPeligrosos, y);
    y = drawExternoRow('Fábricas', data.riesgosExternos.entorno.fabricas, y);
    y = drawExternoRow('Costas (Cercanía con el mar)', data.riesgosExternos.entorno.costas, y);
    y = drawExternoRow('Taller de solventes', data.riesgosExternos.entorno.tallerSolventes, y);
    y += 4;
    if (y + 40 > 265) {
      doc.addPage();
      y = 15;
    }

    setBold(10);
    doc.setTextColor(18, 52, 86);
    doc.text('AGENTES PERTURBADORES EXTERNOS', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 4;

    // Socio-Organizativo
    setBold(9);
    doc.text('AGENTE PERTURBADOR DE TIPO SOCIO-ORGANIZATIVO', margin, y);
    y += 3;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Accidentes vehiculares (particulares, de carga, aéreos)', data.riesgosExternos.socioOrganizativo.accidentes.vehiculosParticulares || data.riesgosExternos.socioOrganizativo.accidentes.vehiculosPeligrosos, y, 140);
    y = drawChecklistRow('Actos delictivos (robo, robo con violencia, invasión)', data.riesgosExternos.socioOrganizativo.delictivo.robo || data.riesgosExternos.socioOrganizativo.delictivo.roboViolencia, y, 140);
    y = drawChecklistRow('Disturbios sociales (marchas, vandalismo, mítines)', data.riesgosExternos.socioOrganizativo.disturbios.marchas || data.riesgosExternos.socioOrganizativo.disturbios.vandalismo, y, 140);
    y = drawChecklistRow('Lugares con posibles riñas (bares, cantinas, antros, centros nocturnos)', data.riesgosExternos.socioOrganizativo.lugaresPublicos.bares || data.riesgosExternos.socioOrganizativo.lugaresPublicos.centrosNocturnos, y, 140);
    y += 5;

    // Hidrometeorológico
    setBold(9);
    doc.text('AGENTE PERTURBADOR DE TIPO HIDROMETEOROLÓGICO', margin, y);
    y += 3;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Inundación (por río, lluvia o mar)', data.riesgosExternos.hidrometeorologico.inundacion.lluvia || data.riesgosExternos.hidrometeorologico.inundacion.mar, y, 140);
    y = drawChecklistRow('Vientos fuertes / Huracán / Tormenta eléctrica', data.riesgosExternos.hidrometeorologico.otros.vientosFuertes || data.riesgosExternos.hidrometeorologico.otros.huracan, y, 140);
    y = drawChecklistRow('Sequía / Granizo / Lluvia torrencial', data.riesgosExternos.hidrometeorologico.otros.sequia || data.riesgosExternos.hidrometeorologico.otros.lluviaTorrencial, y, 140);
    y += 5;

    // Sanitario
    setBold(9);
    doc.text('AGENTE PERTURBADOR DE TIPO SANITARIO', margin, y);
    y += 3;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow(`Epidemia (${data.riesgosExternos.sanitario.epidemia.vulnerableA || 'gripe, influenza'})`, data.riesgosExternos.sanitario.epidemia.siNo, y, 140);
    y = drawChecklistRow(`Plagas (${data.riesgosExternos.sanitario.plaga.vulnerableA || 'insectos, roedores'})`, data.riesgosExternos.sanitario.plaga.siNo, y, 140);
    y = drawChecklistRow(`Envenenamiento (${data.riesgosExternos.sanitario.envenenamiento.vulnerableA || 'alimentos/agua'})`, data.riesgosExternos.sanitario.envenenamiento.siNo, y, 140);
    y += 5;

    // Geológico y Químico
    setBold(9);
    doc.text('AGENTES GEOLÓGICOS Y FÍSICO-QUÍMICOS', margin, y);
    y += 3;
    y = drawChecklistHeader(y, 140);
    y = drawChecklistRow('Sismos / Fallas geológicas / Deslizamiento suelos', data.riesgosExternos.geologico.sismos || data.riesgosExternos.geologico.fallas, y, 140);
    y = drawChecklistRow('Incendios / Explosiones / Fugas químicas', data.riesgosExternos.quimico.incendios || data.riesgosExternos.quimico.explosiones, y, 140);
    y += 6;
    if (y + 25 > 265) {
      doc.addPage();
      y = 15;
    }

    // Signatures / Footer
    doc.addImage(FIRMA_JORGE_BASE64, 'PNG', margin + 10, y, 36, 17);
    y += 19;
    setBold(9);
    doc.text('RESPONSABLE DEL ANÁLISIS: JORGE HUMBERTO MEZA CONTRERAS', margin, y);
    setNormal(8.5);
    doc.text('REGISTRO CAPACITADOR: MPDC/SPCPRyB/AUT-DT/RPS/028/2026', margin, y + 4);

    const fileName = generatePdfName('ANALISIS DE RIESGOS', data.commercialName, data.fecha);
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
      doc.save(`${fileName}.pdf`);
    }

  } catch (error: any) {
    console.error('Error generating Riesgos PDF:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al generar PDF',
      text: `Hubo un error al crear el PDF del Análisis de Riesgos: ${error.message}`,
      confirmButtonColor: '#722F37'
    });
  }
};
