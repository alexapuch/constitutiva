import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentInfo, Employee } from '../types';
import { Trash2, Save, FileText, Users, Plus, Eye, EyeOff, ArrowLeft, LogOut, Download } from 'lucide-react';

export default function AdminView() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleDeleteDocument = async (id: number) => {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    if (selectedDocId === id) setSelectedDocId(null);
    fetchDocuments();
  };

  const handleToggleActive = async (doc: DocumentInfo) => {
    await fetch(`/api/documents/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...doc, is_active: doc.is_active ? 0 : 1 })
    });
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

  const handleDownloadPDF = () => {
    if (!docInfo) return;

    const employeeRows = employees.map(emp => `
      <tr>
        <td>${emp.name.toUpperCase()}</td>
        <td>${emp.role.toUpperCase()}</td>
        <td>${emp.brigade.toUpperCase()}</td>
      </tr>
    `).join('');

    const signatureRows = employees.map(emp => `
      <tr>
        <td>${emp.name.toUpperCase()}</td>
        <td>${emp.role.toUpperCase()}</td>
        <td class="sig-cell">
          <img src="${emp.signature}" class="sig-img" />
        </td>
      </tr>
    `).join('');

    const emptyRow = (cols: number) =>
      `<tr><td colspan="${cols}" style="text-align:center;font-style:italic;">Aún no hay firmas registradas.</td></tr>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Acta Constitutiva - ${docInfo.commercial_name}</title>
  <style>
    @media print {
      @page { margin: 0; }
      body { margin: 0; padding: 0 2cm; }
      .report-header { display: table-header-group; }
      .report-footer { display: table-footer-group; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #000;
      padding: 0 2cm;
      line-height: 1.5;
      margin: 0;
    }
    table.report-container { width: 100%; border: none; margin: 0; padding: 0; }
    .report-container > thead > tr > td, 
    .report-container > tfoot > tr > td, 
    .report-container > tbody > tr > td { border: none; padding: 0; }
    .space-placeholder { height: 2cm; }
    h1 { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 0 0 6px 0; }
    h2 { font-size: 11pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 0 0 4px 0; }
    h3 { font-size: 11pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 0 0 16px 0; }
    h4 { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin: 16px 0 6px 0; page-break-after: avoid; }
    p { text-align: justify; margin: 0 0 8px 0; }
    ul { margin: 0 0 8px 0; padding-left: 18px; }
    li { text-align: justify; margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; table-layout: fixed; word-wrap: break-word; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #000; padding: 6px 8px; font-size: 9pt; vertical-align: middle; }
    th { background: #e8e8e8; font-weight: bold; }
    .sig-cell { height: 55px; text-align: center; }
    .sig-img { max-height: 48px; max-width: 100%; display: block; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 20px; }
    .page-break { page-break-before: always; break-before: page; }
  </style>
</head>
<body>
  <table class="report-container">
    <thead class="report-header">
      <tr><td class="space-placeholder">&nbsp;</td></tr>
    </thead>
    <tfoot class="report-footer">
      <tr><td class="space-placeholder">&nbsp;</td></tr>
    </tfoot>
    <tbody class="report-content">
      <tr>
        <td>
          <div class="header">
    <h1>ACTA CONSTITUTIVA DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL</h1>
    <h2>${docInfo.commercial_name}</h2>
    <h3>"${docInfo.company_name}"</h3>
  </div>

  <p>C. ${docInfo.commercial_name} RESPONSABLE DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL DE LA EMPRESA DENOMINADA "${docInfo.company_name}" y Siendo las ${docInfo.time_start} horas del día ${docInfo.date}, en el inmueble que ocupa la empresa, con domicilio, ${docInfo.address}. Se reúne la representante legal, así como lo empleados:</p>
  <p>Con el objeto de constituir formalmente la Unidad Interna de Protección Civil de este inmueble.</p>
  <p>Como consecuencia de los sucesos ocurridos en el año de 1985, el Gobierno Federal decidió instrumentar un sistema que permitiese una respuesta eficaz y eficiente de los diversos sectores de la sociedad ante la presencia de desastres naturales y/o humanos con el propósito de prevenir sus consecuencias o en su caso mitigarlas.</p>
  <p>Por lo antes expuesto, y con fundamento en el Decreto por el que se aprueben las Bases para el Establecimiento del Sistema Nacional de Protección Civil.- Diario Oficial de la Federación del 6 de Mayo de 1986.- Manual de Organización y Operación del Sistema Nacional de Protección Civil.- Publicación de la Dirección General de Protección Civil del año de 1998.- Decreto por el que se crea el Consejo Nacional de Protección Civil.- Diario Oficial de la Federación del 11 de Mayo de 1990.- Programa de Protección Civil 1995-2000.- Diario Oficial de la Federación del 17 de Julio de 1996.</p>
  <p>Se Constituye la Unidad Interna de Protección Civil, cuyos objetivos, integración y funciones se indican a continuación.</p>

  <div class="print-section">
    <h4>1. OBJETIVOS</h4>
    <p>Adecuar el Reglamento Interior u ordenamiento jurídico correspondiente, para incluir la función de Protección Civil en esta institución; elaborar, establecer, operar y evaluar permanentemente el Programa Interno de Protección Civil, así como implantar los mecanismos de coordinación con las dependencias y entidades públicas, privadas y sociales, en sus niveles federal, estatal y municipal que conforman el Sistema Nacional de Protección Civil, con el fin de cumplir con los objetivos del mismo, a través de la ejecución del Programa, particularmente realizando actividades que conduzcan a salvaguardar la integridad física del personal, visitantes y de las instalaciones del Inmueble.</p>
  </div>

  <div class="print-section">
    <h4>2. INTEGRACIÓN</h4>
    <p>La Unidad Interna de Protección Civil queda integrada por:</p>
    <table>
      <thead>
        <tr>
          <th style="width:34%">NOMBRE</th>
          <th style="width:33%">PUESTO EN LA EMPRESA</th>
          <th style="width:33%">BRIGADA QUE INTEGRA</th>
        </tr>
      </thead>
      <tbody>
        ${employees.length > 0 ? employeeRows : emptyRow(3)}
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <div class="print-section">
    <h4>3. FUNCIONES</h4>
    <p>Corresponde a los integrantes de la Unidad Interna de Protección Civil, llevar a cabo las siguientes funciones:</p>
    <ul>
      <li>Integrar y Formalizar la Unidad Interna de Protección Civil.</li>
      <li>Integrar las Brigadas Internas de Protección Civil.</li>
      <li>Diseñar y promover la impartición de cursos de capacitación a los integrantes de las Brigadas Internas de Protección Civil.</li>
      <li>Elaborar el diagnóstico de riesgos a los que está expuesta la zona donde se ubica el inmueble.</li>
      <li>Elaborar e implementar medidas de prevención para cada tipo de calamidad, de acuerdo al riesgo potencial al que está expuesto el inmueble.</li>
      <li>Definir áreas o zonas de seguridad internas y externas.</li>
      <li>Realizar simulacros en el inmueble, de acuerdo a los planes de emergencia y procedimientos metodológicos previamente elaborados para cada desastre.</li>
      <li>Elaborar y distribuir material de difusión y concientización para que el personal que labora en la dependencia.</li>
      <li>Evaluar el avance y la eficacia del Programa Interno de Protección Civil.</li>
      <li>Elaborar directorios e inventarios por inmueble, de la dependencia.</li>
      <li>Programar y realizar ejercicios y simulacros.</li>
      <li>Establecer mecanismos de coordinación con las instituciones responsables de la detección, monitoreo y pronóstico de los diferentes agentes perturbadores.</li>
      <li>Establecer acciones permanentes de mantenimiento de las diferentes instalaciones del inmueble.</li>
      <li>Determinar el equipo de seguridad que debe ser instalado en el inmueble.</li>
      <li>Promover la colocación de señalamientos, de acuerdo a los lineamientos establecidos en la Norma Mexicana NMX-S-017-1996-SCFI.</li>
      <li>Aplicar las normas de seguridad que permitan reducir al mínimo la incidencia de riesgos del personal y los bienes del inmueble en general.</li>
      <li>Elaborar un plan de reconstrucción inicial, para restablecer las condiciones normales de operación del inmueble.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <div class="print-section">
    <h4>4. ESQUEMA ORGANIZACIONAL</h4>
    <p>Para que la Unidad Interna de Protección Civil logre los objetivos y desempeñe las funciones antes descritas, contará con la estructura organizacional.</p>
    <p>Se firma la presente <strong>ACTA CONSTITUTIVA</strong> de la <strong>Unidad Interna de Protección Civil</strong>, por sus integrantes, en el lugar y fecha indicados, siendo las ${docInfo.time_end} horas.</p>
    <table>
      <thead>
        <tr>
          <th style="width:35%">NOMBRE</th>
          <th style="width:35%">PUESTO EN LA EMPRESA</th>
          <th style="width:30%;text-align:center">FIRMA</th>
        </tr>
      </thead>
      <tbody>
        ${employees.length > 0 ? signatureRows : emptyRow(3)}
      </tbody>
    </table>
  </div>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión. Permite ventanas emergentes para este sitio.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Change URL from 'about:blank' to site URL so print footer looks clean
    printWindow.history.pushState({}, '', '/acta-constitutiva');

    // Wait for images (signatures) to load before printing
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
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
            <span className="text-sm font-medium text-gray-400">v1.2</span>
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
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 font-medium text-center">Estado</th>
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
                    <td className="px-6 py-4 text-gray-500">{doc.date}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(doc); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${doc.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {doc.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {doc.is_active ? 'Visible' : 'Oculto'}
                      </button>
                    </td>
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
                    rows={3}
                    value={docInfo.address}
                    onChange={(e) => updateSelectedDoc('address', e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                  <Users className="w-6 h-6" />
                  Firmas Registradas en esta Acta ({employees.length})
                </h2>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>
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
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50 border-b border-gray-100">
                        <td className="p-3 text-gray-500">#{emp.id}</td>
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
