import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentInfo, Employee } from '../types';
import { sortEmployees } from '../pages/PublicView';
import { compressSignature } from './compressSignature';

export const generateSimulacroPDF = async (
    docInfo: DocumentInfo,
    employees: Employee[],
    visitantes: string,
    usuarios: string
) => {
    // Pre-compress all signature images
    const sortedEmployeesAll = sortEmployees(employees);
    const compressedSignatures: Record<number, string> = {};
    await Promise.all(
        sortedEmployeesAll.map(async (emp) => {
            if (emp.signature) {
                compressedSignatures[emp.id] = await compressSignature(emp.signature);
            }
        })
    );

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
    });

    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // Header: Fecha: [ ] [ 02 ] [ 2026 ]
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const dateStr = docInfo.date || '02/2026';
    doc.text(`Fecha:   ${dateStr}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 8;

    // 1. DATOS GENERALES
    doc.setFont('helvetica', 'bolditalic');
    doc.text('1. DATOS GENERALES DE LA EMPRESA', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1, textColor: 0, lineColor: 0, lineWidth: 0.1 },
        body: [
            [{ content: `Nombre, denominación o razón social: ${docInfo.commercial_name}`, colSpan: 7 }],
            [{ content: `Giro o actividad productiva principal del establecimiento: ${docInfo.activity || ''}`, colSpan: 7 }],
            [{ content: `Dirección del establecimiento o inmueble: ${docInfo.address}`, colSpan: 7 }],
            [
                { content: 'El inmueble cuenta con:', colSpan: 2 },
                { content: 'Estacionamiento   (X) Sí   ( ) No', colSpan: 2 },
                { content: 'Elevadores   ( ) Sí   (X) No', colSpan: 3 }
            ],
            [
                { content: 'Niveles\nSótanos          Superiores\n        X                        X', colSpan: 2, styles: { halign: 'center' } },
                { content: 'Escaleras de emergencia\n( ) Sí          (X) No\nCapacidad: ____________', colSpan: 2 },
                { content: 'Helipuerto\n( ) Sí          (X) No\n( ) Abierto     ( ) Acomodo', colSpan: 3 }
            ],
            [
                { content: 'Número de trabajadores por turno:', colSpan: 4, styles: { halign: 'center' } },
                { content: 'Número de población diaria:', colSpan: 2, styles: { halign: 'center' } },
                { content: `Total, de población\nparticipante\n \n${employees.length}`, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
            ],
            [
                `Matutino\n \n${employees.length}`, `Vespertino\n \n${employees.length}`, `Nocturno\n \n0`, `Otro\n \n0`,
                `Usuarios\n \n${usuarios}`, `Visitantes\n \n${visitantes}`
            ]
        ],
        willDrawCell: function (data) {
            if (data.section === 'body') {
                doc.setDrawColor(0);
                doc.setLineWidth(0.1);
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
            }
        }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 2. DATOS GENERALES DEL SIMULACRO
    doc.setFont('helvetica', 'bolditalic');
    doc.text('2. DATOS GENERALES DEL SIMULACRO', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1, textColor: 0 },
        willDrawCell: function (data) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        },
        body: [
            [
                { content: 'Hipótesis planteada:\n( ) Sismo    (X) Incendio    ( ) Huracán    ( ) Amenaza de bomba    ( ) Otra: ________________________', colSpan: 2 },
                { content: 'Presenta documento:     (X) Sí       ( ) No' }
            ],
            [
                { content: 'Tipo de simulacro:            ( ) Individual            (X) Integral                      ( ) Macro\n                                        (X) Con previo aviso                            ( ) Sin previo aviso', colSpan: 3 }
            ],
            [
                { content: 'Acciones:                       ( ) Repliegue              ( ) Evacuación parcial        (X) Evacuación total', colSpan: 3 }
            ],
            [
                { content: 'Difusión del simulacro                                   (X) Sí                               ( ) No\n¿A quién?        (X) Empleados           ( ) Usuarios y visitantes        ( ) Vecinos        ( ) Autoridades e instituciones\n¿A través de qué medios?\n________PANFLETOS___________________________________________________________', colSpan: 3 }
            ],
            [
                'Duración del simulacro',
                'Hora de inicio:          9:20 A.M.',
                'Hora de término:          9:50 A.M.'
            ],
            [
                'Tiempo realizado en la evacuación del inmueble\n                    20 SEG.',
                { content: 'Duración total del ejercicio:          30 MIN', colSpan: 2 }
            ],
            [
                { content: `Personas evacuadas:   Empleados   [   ${employees.length}   ] `, colSpan: 2 },
                `Visitantes   [   ${visitantes}   ]`
            ]
        ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 3. REALIZACIÓN DEL SIMULACRO
    doc.setFont('helvetica', 'bolditalic');
    doc.text('3. REALIZACIÓN DEL SIMULACRO', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1, textColor: 0 },
        willDrawCell: function (data) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        },
        body: [
            [
                { content: 'Sistema de alertamiento utilizado    ( ) Timbre                                   ( ) Sirena\n( ) Silbato                        ( ) Campana                        ( ) Megáfono                        (X) Voceo', colSpan: 4 }
            ],
            [
                '¿Se instaló punto de reunión?', '(X) Sí            ( ) No',
                'Señalizado:', '(X) Sí            ( ) No'
            ],
            [
                '¿Se instaló puesto de mando?', '( ) Sí            (X) No',
                'Señalizado:', '( ) Sí            (X) No'
            ],
            [
                '¿Se instaló puesto de primeros auxilios?', '( ) Sí            (X) No',
                'Señalizado:', '( ) Sí            (X) No'
            ],
            [
                { content: '¿Se aplicó el plan de...    Alertamiento?     (X) Sí      ( ) No        Emergencia?     (X) Sí      ( ) No\nEvaluación de daños?     (X) Sí      ( ) No        Vuelta a la normalidad?     (X) Sí      ( ) No', colSpan: 4 }
            ],
            [
                { content: '¿Se llevó a cabo la verificación del personal evacuado?  (X) Sí   ( ) No  ¿Se realizó reunión de evaluación?  (X) Sí   ( ) No', colSpan: 4 }
            ],
            [
                { content: '¿Quiénes participaron?      ( ) Autoridades institucionales             (X) Brigadistas\n( ) Observadores                                 ( ) Instituciones de apoyo                  ( ) Otros', colSpan: 4 }
            ],
            [
                { content: 'Brigadas internas que participaron:  ( ) Primeros auxilios       (X) Evacuación de inmuebles       (X) Combate de incendios\n( ) Búsqueda y rescate    ( ) Otra                             ¿Cuentan con equipo de identificación?    (X) Sí      ( ) No', colSpan: 4 }
            ],
            [
                { content: 'Equipos e instalaciones de emergencia utilizados:   ( ) Hidrantes             (X) Extintores             ( ) Botiquines\n( ) Equipo de protección personal        ( ) Escaleras de emergencia        ( ) Ambulancia institucional        ( ) Otros', colSpan: 4 }
            ],
            [
                { content: 'Instituciones de apoyo que se presentaron:      ( ) Seguridad pública        ( ) Cruz Roja        ( ) UREM        ( ) Bomberos\n( ) Protección civil           ( ) Otras: ___________________________________     Tiempo de respuesta: ___________', colSpan: 4 }
            ]
        ]
    });

    doc.addPage();
    currentY = margin;

    // 4. OBSERVACIONES GENERALES
    doc.setFont('helvetica', 'bolditalic');
    doc.text('4. OBSERVACIONES GENERALES: HIPÓTESIS SIMULACRO', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: 0 },
        willDrawCell: function (data) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        },
        body: [
            [{ content: 'Se presentó un conato de incendio por falla eléctrica, el cual fue controlado de manera inmediata conforme al protocolo de emergencia, sin personas lesionadas.\n\n\n' }]
        ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 5. EVALUACIÓN
    doc.setFont('helvetica', 'bolditalic');
    doc.text('5. EVALUACIÓN', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1, textColor: 0, halign: 'center' },
        headStyles: { fontStyle: 'bold' },
        willDrawCell: function (data) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        },
        head: [
            [
                { content: 'Descripción', styles: { halign: 'center' } }, 'B', 'R', 'M',
                { content: 'Descripción', styles: { halign: 'center' } }, 'B', 'R', 'M'
            ]
        ],
        body: [
            [
                { content: 'Ubicación de las zonas de menor riesgo', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Procedimiento para el plan de emergencia', styles: { halign: 'left' } }, 'X', '', ''
            ],
            [
                { content: 'Ubicación del punto de reunión externo', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Procedimiento para la evaluación de daños', styles: { halign: 'left' } }, '', 'X', ''
            ],
            [
                { content: 'Condiciones de las rutas de evacuación', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Procedimiento para la vuelta a la normalidad', styles: { halign: 'left' } }, 'X', '', ''
            ],
            [
                { content: 'Localización de las salidas de emergencia', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Participación de los mandos medios y superiores', styles: { halign: 'left' } }, 'X', '', ''
            ],
            [
                { content: 'Condiciones de las salidas de emergencia', styles: { halign: 'left' } }, '', 'X', '',
                { content: 'Actuación de los jefes de piso', styles: { halign: 'left' } }, 'X', '', ''
            ],
            [
                { content: 'Procedimiento para el plan de alertamiento', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Actuación de los brigadistas', styles: { halign: 'left' } }, 'X', '', ''
            ],
            [
                { content: 'Procedimiento para la evacuación del inmueble', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Comportamiento de los empleados y visitantes', styles: { halign: 'left' } }, 'X', '', ''
            ],
            [
                { content: 'Tiempo de evacuación del inmueble', styles: { halign: 'left' } }, 'X', '', '',
                { content: 'Coordinación con los grupos externos', styles: { halign: 'left' } }, 'X', '', ''
            ]
        ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // 6. COMENTARIOS
    doc.setFont('helvetica', 'bolditalic');
    doc.text('6. COMENTARIOS: EVALUACIÓN DEL SIMULACRO', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, textColor: 0, halign: 'center' },
        willDrawCell: function (data) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        },
        body: [
            ['SE PROCEDIÓ SIN NINGÚN INCONVENIENTE Y RÁPIDA EFICACIA']
        ]
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // CONCLUIDO
    doc.setFont('helvetica', 'bolditalic');
    doc.text('CONCLUIDO EL EJERCICIO, FIRMAN AL CALCE LOS PRESENTES:', margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 1, textColor: 0 },
        willDrawCell: function (data) {
            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height);
        },
        body: [
            [{ content: 'POR OBSERVADORES O ASESORES EXTERNOS', colSpan: 2 }],
            [
                { content: ' \n\nJORGE HUMBERTO MEZA CONTRERAS', styles: { minCellHeight: 18, halign: 'left', valign: 'bottom' } },
                { content: '', styles: { minCellHeight: 18 } }
            ],
            [{ content: 'Nombre, Cargo y Firma de los funcionarios, Observadores', colSpan: 2, styles: { halign: 'center' } }],
            [{ content: 'POR EL INMUEBLE', colSpan: 2 }],
            [
                { content: ` \n\n${docInfo.commercial_name}`, styles: { minCellHeight: 18, halign: 'center', valign: 'bottom' } },
                { content: '', styles: { minCellHeight: 18 } }
            ],
            [{ content: 'Nombre, Cargo y Firma de los Funcionarios, Representantes', colSpan: 2, styles: { halign: 'center' } }]
        ]
    });

    doc.addPage();
    currentY = margin;

    // PARTICIPANTES SIMULACRO
    doc.setFont('helvetica', 'bold');
    doc.text('PARTICIPANTES SIMULACRO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    const sortedEmployees = sortEmployees(employees);

    const tableBody = sortedEmployees.length > 0
        ? sortedEmployees.map(e => [e.name.toUpperCase(), 'EMPLEADO', ''])
        : [['Aún no hay firmas registradas.', '', '']];

    autoTable(doc, {
        startY: currentY,
        head: [['NOMBRE', 'PUESTO', 'FIRMA']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [153, 194, 255], textColor: 0, fontStyle: 'bold', halign: 'center' }, // Light blue head
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: 0, valign: 'middle', halign: 'center' },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50, minCellHeight: 12 } },
        margin: { left: margin, right: margin },
        didDrawCell: function (data) {
            if (data.column.index === 2 && data.cell.section === 'body' && sortedEmployees.length > 0) {
                const emp = sortedEmployees[data.row.index];
                if (emp && emp.signature) {
                    const dim = data.cell;
                    const imgW = 20;
                    const imgH = 8;
                    const xPos = dim.x + (dim.width - imgW) / 2;
                    const yPos = dim.y + (dim.height - imgH) / 2;
                    try {
                        doc.addImage(compressedSignatures[emp.id] || emp.signature, 'JPEG', xPos, yPos, imgW, imgH);
                    } catch (e) { console.error('Error drawing image', e); }
                }
            }
        }
    });

    const safeName = docInfo.commercial_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `cedula_simulacro_${safeName}.pdf`;

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: `Cédula Simulacro - ${docInfo.commercial_name}`,
            });
            return;
        } catch (error) {
            console.log('User cancelled share or share failed:', error);
        }
    }

    doc.save(fileName);
};
