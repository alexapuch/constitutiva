import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentInfo, Employee } from '../types';
import { Trash2, Save, FileText, Users, Plus, ArrowLeft, LogOut, Download } from 'lucide-react';
import { generateSimulacroPDF } from '../utils/generateSimulacroPDF';
import { compressSignature } from '../utils/compressSignature';
import { sortEmployees } from './PublicView';

export default function AdminView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [visitantes, setVisitantes] = useState('0');
  const [usuarios, setUsuarios] = useState('0');

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      fetchEmployees(selectedDocId);
    } else {
      setEmployees([]);
    }
  }, [selectedDocId]);

  const fetchDocuments = async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data);
    if (data.length > 0 && !selectedDocId) {
      setSelectedDocId(data[0].id);
    }
  };

  const fetchEmployees = async (docId: number) => {
    const res = await fetch(`/api/documents/${docId}/employees`);
    const data = await res.json();
    setEmployees(data);
  };

  const handleSaveDocInfo = async () => {
    const docInfo = documents.find(d => d.id === selectedDocId);
    if (!docInfo) return;
    setIsSaving(true);
    await fetch(`/api/documents/${docInfo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docInfo)
    });
    setIsSaving(false);
    fetchDocuments();
  };

  const handleCreateDocument = async () => {
    const newDoc = {
      commercial_name: 'Nueva Empresa',
      company_name: 'Nueva Razón Social',
      date: 'Fecha',
      time_start: '00:00',
      time_end: '00:00',
      address: 'Dirección',
      is_active: 1
    };
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDoc)
    });
    const data = await res.json();
    await fetchDocuments();
    setSelectedDocId(data.id);
  };

  const handleRegenerateCode = async () => {
    if (!selectedDocId) return;
    const res = await fetch(`/api/documents/${selectedDocId}/regenerate-code`, { method: 'PATCH' });
    const data = await res.json();
    if (data.access_code) {
      setDocuments(docs => docs.map(d => d.id === selectedDocId ? { ...d, access_code: data.access_code } : d));
    }
  };


  const handleDeleteDocument = async (id: number) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (selectedDocId === id) setSelectedDocId(null);
    fetchDocuments();
  };



  const handleDeleteEmployee = async (id: number) => {
    await fetch(`/api/employees/${id}`, { method: 'DELETE' });
    if (selectedDocId) fetchEmployees(selectedDocId);
  };

  const updateSelectedDoc = (field: keyof DocumentInfo, value: any) => {
    setDocuments(docs => docs.map(d => d.id === selectedDocId ? { ...d, [field]: value } : d));
  };

  const docInfo = documents.find(d => d.id === selectedDocId);

  const handleDownloadPDF = async () => {
    if (!docInfo) return;
    try {

      // Pre-compress all signature images to reduce PDF size
      const sortedEmps = sortEmployees(employees);
      const compressedSignatures: Record<number, string> = {};
      await Promise.all(
        sortedEmps.map(async (emp) => {
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

      const margin = 20; // 2cm
      const pageWidth = doc.internal.pageSize.getWidth();
      let currentY = 20;

      // Local helper to add text and manage Y-axis
      const addText = (text: string, size: number, style: 'normal' | 'bold' | 'italic', align: 'left' | 'center' | 'right' | 'justify', yOffset: number = 0) => {
        doc.setFontSize(size);
        doc.setFont('helvetica', style);
        const textLines = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(textLines, align === 'center' ? pageWidth / 2 : margin, currentY + yOffset, { align: align as any });
        currentY += (textLines.length * size * 0.3527 * 1.5) + yOffset;
      };

      // Header section
      addText('ACTA CONSTITUTIVA DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL', 13, 'bold', 'center');
      currentY += 2;
      addText(docInfo.commercial_name, 11, 'bold', 'center');
      currentY += 2;
      addText(`"${docInfo.company_name}"`, 11, 'bold', 'center');
      currentY += 8;

      // Body paragraphs
      addText(`C. ${docInfo.commercial_name} RESPONSABLE DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL DE LA EMPRESA DENOMINADA "${docInfo.company_name}" y Siendo las ${docInfo.time_start} horas del día ${docInfo.date}, en el inmueble que ocupa la empresa, con domicilio, ${docInfo.address}. Se reúne la representante legal, así como lo empleados:`, 10, 'normal', 'left');
      currentY += 4;
      addText(`Con el objeto de constituir formalmente la Unidad Interna de Protección Civil de este inmueble.`, 10, 'normal', 'left');
      currentY += 4;
      addText(`Como consecuencia de los sucesos ocurridos en el año de 1985, el Gobierno Federal decidió instrumentar un sistema que permitiese una respuesta eficaz y eficiente de los diversos sectores de la sociedad ante la presencia de desastres naturales y/o humanos con el propósito de prevenir sus consecuencias o en su caso mitigarlas.`, 10, 'normal', 'left');
      currentY += 4;
      addText(`Por lo antes expuesto, y con fundamento en el Decreto por el que se aprueben las Bases para el Establecimiento del Sistema Nacional de Protección Civil.- Diario Oficial de la Federación del 6 de Mayo de 1986.- Manual de Organización y Operación del Sistema Nacional de Protección Civil.- Publicación de la Dirección General de Protección Civil del año de 1998.- Decreto por el que se crea el Consejo Nacional de Protección Civil.- Diario Oficial de la Federación del 11 de Mayo de 1990.- Programa de Protección Civil 1995-2000.- Diario Oficial de la Federación del 17 de Julio de 1996.`, 10, 'normal', 'left');
      currentY += 4;
      addText(`Se Constituye la Unidad Interna de Protección Civil, cuyos objetivos, integración y funciones se indican a continuación.`, 10, 'normal', 'left');
      currentY += 8;

      // 1. OBJETIVOS
      addText('1. OBJETIVOS', 10, 'bold', 'left');
      currentY += 2;
      addText(`Adecuar el Reglamento Interior u ordenamiento jurídico correspondiente, para incluir la función de Protección Civil en esta institución; elaborar, establecer, operar y evaluar permanentemente el Programa Interno de Protección Civil, así como implantar los mecanismos de coordinación con las dependencias y entidades públicas, privadas y sociales, en sus niveles federal, estatal y municipal que conforman el Sistema Nacional de Protección Civil, con el fin de cumplir con los objetivos del mismo, a través de la ejecución del Programa, particularmente realizando actividades que conduzcan a salvaguardar la integridad física del personal, visitantes y de las instalaciones del Inmueble.`, 10, 'normal', 'left');
      currentY += 8;

      // 2. INTEGRACIÓN
      doc.addPage(); currentY = margin;
      addText('2. INTEGRACIÓN', 10, 'bold', 'left');
      currentY += 2;
      addText('La Unidad Interna de Protección Civil queda integrada por:', 10, 'normal', 'left');
      currentY += 4;

      const sortedEmployees = sortEmployees(employees);

      const table1Body = sortedEmployees.length > 0
        ? sortedEmployees.map(e => [e.name.toUpperCase(), e.role.toUpperCase(), e.brigade || 'MULTIBRIGADA'])
        : [['Aún no hay firmas registradas.', '', '']];

      autoTable(doc, {
        startY: currentY,
        head: [['NOMBRE', 'PUESTO EN LA EMPRESA', 'BRIGADA QUE INTEGRA']],
        body: table1Body,
        theme: 'grid',
        headStyles: { fillColor: [232, 232, 232], textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: 0 },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 } },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // 3. FUNCIONES
      if (currentY > 250) { doc.addPage(); currentY = margin; }
      addText('3. FUNCIONES', 10, 'bold', 'left');
      currentY += 2;
      addText('Corresponde a los integrantes de la Unidad Interna de Protección Civil, llevar a cabo las siguientes funciones:', 10, 'normal', 'left');
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

      bulletPoints.forEach(bp => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const bulletStr = `•  ${bp}`;
        const lines = doc.splitTextToSize(bulletStr, pageWidth - margin * 2 - 5);
        if (currentY + (lines.length * 5) > 270) { doc.addPage(); currentY = margin; }
        doc.text(lines, margin + 5, currentY);
        currentY += lines.length * 5 + 1;
      });
      currentY += 8;

      // 4. ESQUEMA ORGANIZACIONAL — always on a new page
      doc.addPage(); currentY = margin;
      addText('4. ESQUEMA ORGANIZACIONAL', 10, 'bold', 'left');
      currentY += 2;
      addText('Para que la Unidad Interna de Protección Civil logre los objetivos y desempeñe las funciones antes descritas, contará con la estructura organizacional.', 10, 'normal', 'left');
      currentY += 4;
      addText(`Se firma la presente ACTA CONSTITUTIVA de la Unidad Interna de Protección Civil, por sus integrantes, en el lugar y fecha indicados, siendo las ${docInfo.time_end} horas.`, 10, 'normal', 'left');
      currentY += 4;

      const table2Body = sortedEmployees.length > 0
        ? sortedEmployees.map(e => [e.name.toUpperCase(), e.role.toUpperCase(), ''])
        : [['Aún no hay firmas registradas.', '', '']];

      autoTable(doc, {
        startY: currentY,
        head: [['NOMBRE', 'PUESTO EN LA EMPRESA', 'FIRMA']],
        body: table2Body,
        theme: 'grid',
        headStyles: { fillColor: [232, 232, 232], textColor: 0, fontStyle: 'bold', halign: 'center' },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, textColor: 0, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50, minCellHeight: 15 } },
        margin: { left: margin, right: margin },
        didDrawCell: function (data) {
          if (data.column.index === 2 && data.cell.section === 'body' && sortedEmployees.length > 0) {
            const emp = sortedEmployees[data.row.index];
            if (emp && emp.signature) {
              const dim = data.cell;
              const imgW = 24;
              const imgH = 9;
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
      const fileName = `acta_constitutiva_${safeName}.pdf`;

      console.log('Generating blob...');
      const pdfBlob = doc.output('blob');
      console.log('Blob size:', pdfBlob.size);
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      console.log('Trying share...', navigator.canShare ? 'Supported' : 'Not supported');
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `Acta Constitutiva - ${docInfo.commercial_name}`,
          });
          console.log('Shared successfully');
          return; // Success, exit
        } catch (error) {
          console.log('User cancelled share or share failed:', error);
          // Fallback to normal download if share fails
        }
      }

      // Fallback for desktop browsers / browsers without file sharing
      console.log('Saving file using JS...');
      doc.save(fileName);
      console.log('Save triggered.');
    } catch (e: any) {
      console.error('Fatal PDF Error:', e);
      alert('Error al generar PDF: ' + (e?.message || JSON.stringify(e)));
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Acceso Administrador</h2>
            <p className="text-gray-500 text-sm mt-2">Ingresa la contraseña para continuar</p>
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Contraseña"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gray-900 hover:bg-black text-white p-3 rounded-xl font-medium transition-colors"
          >
            Ingresar
          </button>
          <Link
            to="/"
            className="block text-center w-full text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors"
          >
            Volver al inicio
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Volver al inicio
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-400">v1.14</span>
            <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium transition-colors">
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <FileText className="w-6 h-6" />
              Gestión de Actas Constitutivas
            </h2>
            <button
              onClick={handleCreateDocument}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Nueva Acta
            </button>
          </div>

          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Nombre Comercial</th>
                  <th className="px-6 py-3 font-medium">Código Acceso</th>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr
                    key={doc.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${selectedDocId === doc.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{doc.commercial_name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">{doc.access_code || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{doc.date}</td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                        title="Eliminar Acta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                      No hay actas constitutivas creadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {docInfo && (
          <>
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-blue-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-blue-900">
                  <FileText className="w-6 h-6" />
                  Editar Información del Acta Seleccionada
                </h2>
                <button
                  onClick={handleSaveDocInfo}
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    value={docInfo.commercial_name}
                    onChange={(e) => updateSelectedDoc('commercial_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de Acceso (Solo Lectura)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={docInfo.access_code || 'No asignado'}
                      className="w-full border border-gray-200 bg-gray-50 rounded-md p-2 text-gray-600 font-mono"
                    />
                    <button
                      onClick={() => {
                        if (docInfo.access_code) {
                          navigator.clipboard.writeText(docInfo.access_code);
                          alert('Código copiado al portapapeles');
                        }
                      }}
                      className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
                      title="Copiar código"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={handleRegenerateCode}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-md transition-colors text-sm font-medium whitespace-nowrap"
                      title="Generar nuevo código"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={docInfo.company_name}
                    onChange={(e) => updateSelectedDoc('company_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="text"
                    value={docInfo.date}
                    onChange={(e) => updateSelectedDoc('date', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej. 19 de FEBRERO DEL 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                    <input
                      type="text"
                      value={docInfo.time_start}
                      onChange={(e) => updateSelectedDoc('time_start', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej. 12:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                    <input
                      type="text"
                      value={docInfo.time_end}
                      onChange={(e) => updateSelectedDoc('time_end', e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej. 13:00"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección del Inmueble</label>
                  <textarea
                    rows={2}
                    value={docInfo.address}
                    onChange={(e) => updateSelectedDoc('address', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giro o actividad productiva principal</label>
                  <input
                    type="text"
                    value={docInfo.activity || ''}
                    onChange={(e) => updateSelectedDoc('activity', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej. HOTEL U HOSPEDAJE TEMPORAL"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold flex flex-col sm:flex-row items-center gap-2 text-gray-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    Firmas Registradas
                  </div>
                  <span className="text-sm font-normal text-gray-500">({employees.length} en total)</span>
                </h2>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Usuarios:</label>
                    <input
                      type="number"
                      min="0"
                      value={usuarios}
                      onChange={(e) => setUsuarios(e.target.value)}
                      className="w-16 border-none bg-transparent p-0 text-right focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Visitantes:</label>
                    <input
                      type="number"
                      min="0"
                      value={visitantes}
                      onChange={(e) => setVisitantes(e.target.value)}
                      className="w-16 border-none bg-transparent p-0 text-right focus:ring-0 text-gray-900 font-semibold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => docInfo && generateSimulacroPDF(docInfo, employees, visitantes, usuarios)}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                      title="Descargar Cédula de Evaluación de Simulacro"
                    >
                      <Download className="w-4 h-4" />
                      Cédula Simulacro
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
                      title="Descargar Acta Constitutiva"
                    >
                      <Download className="w-4 h-4" />
                      Acta Constitutiva
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="border-b border-gray-200 p-3 text-left">ID</th>
                      <th className="border-b border-gray-200 p-3 text-left">Nombre</th>
                      <th className="border-b border-gray-200 p-3 text-left">Puesto</th>
                      <th className="border-b border-gray-200 p-3 text-left">Brigada</th>
                      <th className="border-b border-gray-200 p-3 text-center">Firma</th>
                      <th className="border-b border-gray-200 p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortEmployees(employees).map((emp, index) => (
                      <tr key={emp.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="p-3 text-gray-500">#{index + 1}</td>
                        <td className="p-3 font-medium uppercase">{emp.name}</td>
                        <td className="p-3 uppercase">{emp.role}</td>
                        <td className="p-3 uppercase">{emp.brigade}</td>
                        <td className="p-3 text-center h-16">
                          <img src={emp.signature} alt="Firma" className="h-10 mx-auto object-contain mix-blend-multiply" />
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id); }}
                            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                            title="Eliminar Firma"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                          Aún no hay firmas registradas en esta acta.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
