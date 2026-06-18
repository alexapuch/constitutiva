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
  gasesInflamables: string; // Litros
  liquidosInflamables: string; // Litros
  liquidosCombustibles: string; // Litros
  solidosCombustibles: string; // Kgs
  materialesPiroforicos: string; // Kgs
}

export const generateIncendioPDF = async (data: IncendioPDFData, preview: boolean = false): Promise<string | void> => {
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

    // Helper functions for clean typography
    const setBold = (size: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
    };
    const setNormal = (size: number) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
    };

    let y = 15;

    // Header Title
    setBold(12);
    // Let's create the form lines
    
    // 1. DENOMINACION O RAZON SOCIAL
    setNormal(9);
    doc.text('DENOMINACION O RAZON SOCIAL', margin, y);
    setBold(10);
    doc.text(data.companyName.toUpperCase(), margin + 65, y);
    doc.line(margin + 65, y + 1, margin + 175, y + 1); // Underline

    y += 8;
    setNormal(9);
    doc.text('REPRESENTANTE LEGAL Y/ PROPIETARIO', margin, y);
    setBold(9);
    doc.text(data.representativeName.toUpperCase(), margin + 65, y);
    doc.line(margin + 65, y + 1, margin + 175, y + 1);

    y += 8;
    setNormal(9);
    doc.text('NOMBRE COMERCIAL:', margin, y);
    setBold(9);
    doc.text(data.commercialName.toUpperCase(), margin + 65, y);
    doc.line(margin + 65, y + 1, margin + 175, y + 1);

    y += 8;
    setNormal(9);
    doc.text('DIRECCION:', margin, y);
    setBold(9);
    const addressLines = doc.splitTextToSize(data.direccion.toUpperCase(), 145);
    doc.text(addressLines, margin + 20, y);
    doc.line(margin + 20, y + 1 + (addressLines.length - 1) * 4, margin + 175, y + 1 + (addressLines.length - 1) * 4);

    y += 8 + (addressLines.length - 1) * 4;
    setNormal(9);
    doc.text('GIRO:', margin, y);
    setBold(9);
    const giroLines = doc.splitTextToSize(data.giro.toUpperCase(), 145);
    doc.text(giroLines, margin + 20, y);
    doc.line(margin + 20, y + 1 + (giroLines.length - 1) * 4, margin + 175, y + 1 + (giroLines.length - 1) * 4);

    y += 12 + (giroLines.length - 1) * 4;

    // DATOS DEL INMUEBLE POR NIVEL Title
    setBold(10);
    doc.text('DATOS DEL INMUEBLE POR NIVEL', margin + 30, y);
    y += 6;

    // Drawing Table 1: Datos del inmueble por nivel
    const startTable1Y = y;
    const colSiNoM2X = [margin, margin + 30, margin + 50, margin + 70]; // Sotano, SI, NO, M2
    
    // Headers
    setBold(9);
    doc.rect(margin, y, 70, 6);
    doc.text('SI', margin + 38, y + 4.5);
    doc.text('NO', margin + 58, y + 4.5);
    doc.text('M²', margin + 76, y + 4.5);
    doc.line(margin + 30, y, margin + 30, y + 6);
    doc.line(margin + 50, y, margin + 50, y + 6);
    doc.line(margin + 70, y, margin + 70, y + 6);
    
    y += 6;
    const drawRow = (label: string, si: boolean, m2Val: string) => {
      setNormal(9);
      doc.rect(margin, y, 70, 6);
      doc.text(label, margin + 2, y + 4.5);
      
      setBold(9);
      if (si) {
        doc.text('XX', margin + 37, y + 4.5);
      } else {
        doc.text('XX', margin + 57, y + 4.5);
      }
      doc.text(m2Val, margin + 74, y + 4.5);
      
      doc.line(margin + 30, y, margin + 30, y + 6);
      doc.line(margin + 50, y, margin + 50, y + 6);
      doc.line(margin + 70, y, margin + 70, y + 6);
      y += 6;
    };

    drawRow('SOTANO', data.sotanoSi, data.sotanoM2);
    drawRow('1er. Nivel', data.nivel1Si, data.nivel1M2);
    drawRow('2do. Nivel', data.nivel2Si, data.nivel2M2);
    drawRow('3er. Nivel', data.nivel3Si, data.nivel3M2);
    drawRow('Azotea', data.azoteaSi, data.azoteaM2);

    // Total m2 CONSTRUCCION
    setBold(8);
    doc.rect(margin, y, 70, 6);
    doc.text('Total m² CONSTRUCCION', margin + 2, y + 4.5);
    doc.text(data.m2Construccion, margin + 74, y + 4.5);
    doc.line(margin + 70, y, margin + 70, y + 6);
    y += 6;

    // Total m2 SUPERFICIE
    doc.rect(margin, y, 70, 6);
    doc.text('Total m² SUPERFICIE', margin + 2, y + 4.5);
    doc.text(data.m2Superficie, margin + 74, y + 4.5);
    doc.line(margin + 70, y, margin + 70, y + 6);
    
    const endTable1Y = y + 6;

    // Draw Right Side Blocks: Antigüedad, Población Fija, Población Flotante
    let rY = startTable1Y;
    
    // 1. Antigüedad
    setNormal(9);
    doc.text('ANTIGÜEDAD DEL INMUEBLE', margin + 100, rY + 8);
    // Box
    doc.rect(margin + 155, rY + 1, 20, 10);
    doc.line(margin + 155, rY + 5, margin + 175, rY + 5);
    setBold(8);
    doc.text('AÑOS', margin + 161, rY + 4);
    doc.text(data.antiguedad, margin + 162, rY + 9);

    rY += 15;
    // 2. Población Fija
    setNormal(9);
    doc.text('POBLACION FIJA', margin + 100, rY + 8);
    // Box
    doc.rect(margin + 155, rY + 1, 20, 10);
    doc.line(margin + 155, rY + 5, margin + 175, rY + 5);
    setBold(8);
    doc.text('PERSONAS', margin + 157, rY + 4);
    doc.text(data.poblacionFija, margin + 164, rY + 9);

    rY += 12;
    // 3. Población Flotante
    setNormal(9);
    doc.text('POBLACION FLOTANTE', margin + 100, rY + 8);
    // Box
    doc.rect(margin + 155, rY + 1, 20, 10);
    doc.line(margin + 155, rY + 5, margin + 175, rY + 5);
    setBold(8);
    doc.text('PERSONAS', margin + 157, rY + 4);
    doc.text(data.poblacionFlotante, margin + 164, rY + 9);

    y = Math.max(endTable1Y, rY + 16) + 10;

    // Concepts Table Header
    setBold(9);
    doc.text('CONCEPTO', margin + 2, y - 2);
    doc.text('RESULTADO', margin + 104, y - 2);
    doc.text('FORMULA', margin + 128, y - 2);
    doc.text('FACTOR', margin + 150, y - 2);
    doc.text('RIESGO DE', margin + 164, y - 4);
    doc.text('INCENDIO', margin + 165, y - 1);

    // Factors Calculations
    const m2ConstNum = parseFloat(data.m2Construccion) || 0;
    const gasNum = parseFloat(data.gasesInflamables) || 0;
    const liqInfNum = parseFloat(data.liquidosInflamables) || 0;
    const liqCombNum = parseFloat(data.liquidosCombustibles) || 0;
    const solCombNum = parseFloat(data.solidosCombustibles) || 0;
    const fixedPopNum = parseInt(data.poblacionFija) || 0;
    const piroforicosNum = parseFloat(data.materialesPiroforicos) || 0;

    const f1 = parseFloat((m2ConstNum / 3000).toFixed(2));
    const f2 = parseFloat((gasNum / 3000).toFixed(2));
    const f3 = parseFloat((liqInfNum / 1400).toFixed(2));
    const f4 = parseFloat((liqCombNum / 2000).toFixed(2));
    
    // Solids formula: (Solidos + Poblacion Fija * 60) / 15000
    const solidWeightTotal = solCombNum + (fixedPopNum * 60);
    const f5 = parseFloat((solidWeightTotal / 15000).toFixed(2));
    const f6 = parseFloat((piroforicosNum / 15000).toFixed(2));

    const totalGrado = parseFloat((f1 + f2 + f3 + f4 + f5 + f6).toFixed(2));
    const esRiesgoAlto = totalGrado >= 1.0;

    const startConceptTableY = y;

    // Draw Concept Table Borders
    // Total Width = 186 mm
    // Concept: 102 mm, Result: 20 mm, Formula: 23 mm, Factor: 18 mm, Riesgo: 23 mm
    const wConcept = 102;
    const wResult = 20;
    const wFormula = 23;
    const wFactor = 18;
    const wRiesgo = 23;

    const xConcept = margin;
    const xResult = xConcept + wConcept;
    const xFormula = xResult + wResult;
    const xFactor = xFormula + wFormula;
    const xRiesgo = xFactor + wFactor;

    const drawConceptRow = (concept: string, result: string, formulaStr: string, factorVal: string) => {
      setNormal(8.5);
      doc.rect(xConcept, y, wConcept, 7);
      doc.rect(xResult, y, wResult, 7);
      doc.rect(xFormula, y, wFormula, 7);
      doc.rect(xFactor, y, wFactor, 7);

      doc.text(concept, xConcept + 2, y + 4.8);
      
      setBold(9);
      doc.text(result, xResult + wResult/2, y + 4.8, { align: 'center' });
      setNormal(8.5);
      doc.text(formulaStr, xFormula + wFormula/2, y + 4.8, { align: 'center' });
      setBold(9);
      doc.text(factorVal, xFactor + wFactor/2, y + 4.8, { align: 'center' });

      y += 7;
    };

    drawConceptRow('SUPERFICIE CONSTRUIDA', data.m2Construccion, `${data.m2Construccion}/3000`, f1.toFixed(2));
    drawConceptRow('INVENTARIO GASES INFLAMABLES EN LITROS', data.gasesInflamables, `${data.gasesInflamables}/3000`, f2.toFixed(2));
    drawConceptRow('INVENTARIO DE LIQUIDOS INFLAMABLES EN LITROS', data.liquidosInflamables, `${data.liquidosInflamables}/1400`, f3.toFixed(2));
    drawConceptRow('INVENTARIO DE LIQUIDOS COMBUSTIBLES EN LITROS', data.liquidosCombustibles, `${data.liquidosCombustibles}/2000`, f4.toFixed(2));
    
    // Solid Combustibles (Row 5 & 6)
    setNormal(8.5);
    doc.rect(xConcept, y, wConcept, 7);
    doc.rect(xResult, y, wResult, 7);
    doc.rect(xFormula, y, wFormula, 7);
    doc.rect(xFactor, y, wFactor, 7);
    doc.text('INVENTARIO DE SOLIDOS COMBUSTIBLES INCLUIDO EL MOBILIARIO', xConcept + 2, y + 4.8);
    setBold(9);
    doc.text(data.solidosCombustibles, xResult + wResult/2, y + 4.8, { align: 'center' });
    y += 7;

    // Fixed Population weight
    setNormal(8.5);
    doc.rect(xConcept, y, wConcept, 7);
    doc.rect(xResult, y, wResult, 7);
    doc.rect(xFormula, y, wFormula, 7);
    doc.rect(xFactor, y, wFactor, 7);
    doc.text(`CADA PERSONA FIJA ( ${data.poblacionFija} PERSONAS )`, xConcept + 2, y + 4.8);
    setBold(9);
    doc.text(String(fixedPopNum * 60), xResult + wResult/2, y + 4.8, { align: 'center' });
    doc.text(`${solidWeightTotal}/15000`, xFormula + wFormula/2, y + 4.8, { align: 'center' });
    doc.text(f5.toFixed(2), xFactor + wFactor/2, y + 4.8, { align: 'center' });
    y += 7;

    // Piroforicos
    drawConceptRow('MATERIALES PIROFORICOS Y EXPLOSIVOS EN KGS', data.materialesPiroforicos, `${data.materialesPiroforicos}/15000`, f6.toFixed(2));

    const endConceptTableY = y;

    // Draw Riesgo vertical box
    doc.rect(xRiesgo, startConceptTableY, wRiesgo, endConceptTableY - startConceptTableY);
    setBold(12);
    doc.text(esRiesgoAlto ? 'ALTO' : 'BAJO', xRiesgo + wRiesgo/2, startConceptTableY + (endConceptTableY - startConceptTableY)/2 + 2, { align: 'center' });

    y += 6;
    // TOTAL GRADO INCENDIO Row
    setBold(10);
    doc.text('TOTAL GRADO INCENDIO', xConcept + 65, y);
    doc.text(totalGrado.toFixed(1), xFactor + wFactor/2, y, { align: 'center' });

    y += 12;
    // Conclusion Section
    setBold(10);
    doc.text('CONCLUSION', margin, y);
    
    y += 6;
    setNormal(9);
    const conclusionText = `DE ACUERDO A LOS RESULTADOS OBTENIDOS EN LA APLICACION DE ESTE CRITERIO, LA EMPRESA TIENE UN RIESGO DE INCENDIO ${esRiesgoAlto ? 'ALTO' : 'BAJO'}. YA QUE EL VALOR ES DE ${totalGrado.toFixed(1)} QUE ES ${esRiesgoAlto ? 'MAYOR O IGUAL A 1' : 'MENOR A 1'}.`;
    const conclusionLines = doc.splitTextToSize(conclusionText, w);
    doc.text(conclusionLines, margin, y, { lineHeightFactor: 1.4 });

    y += conclusionLines.length * 4.5 + 6;
    doc.text(`ESTA DETERMINACION FUE ELABORADA EL ${data.fecha.toUpperCase()}`, margin, y);

    y += 14;
    // Signatures
    // We add Jorge's signature on the bottom left
    doc.addImage(FIRMA_JORGE_BASE64, 'PNG', margin + 10, y, 36, 17);
    
    y += 19;
    setBold(9);
    doc.text('ELABORO: JORGE HUMBERTO MEZA CONTRERAS', margin, y);
    setNormal(8.5);
    doc.text('REGISTRO: MPDC/SPCPRyB/AUT-DT/RPS/028/2026', margin, y + 4);

    const fileName = generatePdfName('ANALISIS INCENDIO', data.commercialName, data.fecha);
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
    console.error('Error generating Incendio PDF:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error al generar PDF',
      text: `Hubo un error al crear el PDF: ${error.message}`,
      confirmButtonColor: '#722F37'
    });
  }
};
