import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocumentInfo, Employee } from '../types';
import { sortEmployees } from '../utils/employees';
import SignatureModal from '../components/SignatureModal';
import { PenTool, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function PublicView() {
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) {
      setErrorMsg('No se proporcionó ningún código de acceso.');
      return;
    }
    fetchDocumentByCode(code);
  }, [code]);

  const fetchDocumentByCode = async (accessCode: string) => {
    try {
      const res = await fetch(`/api/documents/code/${accessCode}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Código inválido o acta no encontrada.');
        return;
      }
      setDocInfo(data);
      fetchEmployees(data.id);
    } catch (e) {
      setErrorMsg('Error de conexión al buscar el acta.');
    }
  };

  const fetchEmployees = async (docId: number) => {
    const res = await fetch(`/api/documents/${docId}/employees`);
    const data = await res.json();
    setEmployees(data);
  };

  const handleSaveSignature = async (name: string, role: string, brigade: string, signatureData: string) => {
    if (!docInfo?.id) return;

    const res = await fetch(`/api/documents/${docInfo.id}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        role,
        brigade,
        signature: signatureData
      })
    });

    if (res.ok) {
      setIsModalOpen(false);
      fetchEmployees(docInfo.id);
    } else {
      throw new Error('Error al guardar la firma');
    }
  };

  if (errorMsg || !docInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center max-w-md w-full">
          <p className="text-gray-500 mb-6">{errorMsg || 'Cargando acta...'}</p>
          {errorMsg && (
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-lg font-medium transition-colors w-full"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al inicio
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-4xl mx-auto mb-6 flex items-center gap-4">
        <Link to="/" className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row items-baseline gap-4 flex-1">
          <span className="font-medium text-gray-700 whitespace-nowrap">Código de Acceso en uso:</span>
          <span className="text-blue-700 font-bold tracking-widest bg-blue-50 px-3 py-1 rounded-md">{code}</span>
        </div>
      </div>

      {docInfo && (
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-8 sm:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-xl font-bold uppercase mb-4">ACTA CONSTITUTIVA DEL PROGRAMA INTERNO DE PROTECCION CIVIL</h1>
              <h2 className="text-lg font-bold uppercase">{docInfo.commercial_name}</h2>
              <h3 className="text-lg font-bold uppercase">"{docInfo.company_name}"</h3>
            </div>

            {/* Intro Text */}
            <div className="space-y-4 text-justify text-sm leading-relaxed mb-8">
              <p>
                C. {docInfo.commercial_name} RESPONSABLE DEL PROGRAMA INTERNO DE PROTECCIÓN CIVIL DE LA EMPRESA DENOMINADA "{docInfo.company_name}" y Siendo las {docInfo.time_start} horas del día {docInfo.date}, en el inmueble que ocupa la empresa, con domicilio, {docInfo.address}. Se reúne la representante legal, así como lo empleados:
              </p>
              <p>
                Con el objeto de constituir formalmente la Unidad Interna de Protección Civil de este inmueble.
              </p>
              <p>
                Como consecuencia de los sucesos ocurridos en el año de 1985, el Gobierno Federal decidió instrumentar un sistema que permitiese una respuesta eficaz y eficiente de los diversos sectores de la sociedad ante la presencia de desastres naturales y/o humanos con el propósito de prevenir sus consecuencias o en su caso mitigarlas.
              </p>
              <p>
                Por lo antes expuesto, y con fundamento en el Decreto por el que se aprueben las Bases para el Establecimiento del Sistema Nacional de Protección Civil.- Diario Oficial de la Federación del 6 de Mayo de 1986.- Manual de Organización y Operación del Sistema Nacional de Protección Civil.- Publicación de la Dirección General de Protección Civil del año de 1998.- Decreto por el que se crea el Consejo Nacional de Protección Civil.- Diario Oficial de la Federación del 11 de Mayo de 1990.- Programa de Protección Civil 1995-2000.- Diario Oficial de la Federación del 17 de Julio de 1996.
              </p>
              <p>
                Se Constituye la Unidad Interna de Protección Civil, cuyos objetivos, integración y funciones se indican a continuación.
              </p>
            </div>

            {/* Section 1 */}
            <div className="mb-8">
              <h4 className="font-bold mb-2">1. OBJETIVOS</h4>
              <p className="text-sm text-justify leading-relaxed">
                Adecuar el Reglamento Interior u ordenamiento jurídico correspondiente, para incluir la función de Protección Civil en esta institución; elaborar, establecer, operar y evaluar permanentemente el Programa Interno de Protección Civil, así como implantar los mecanismos de coordinación con las dependencias y entidades públicas, privadas y sociales, en sus niveles federal, estatal y municipal que conforman el Sistema Nacional de Protección Civil, con el fin de cumplir con los objetivos del mismo, a través de la ejecución del Programa, particularmente realizando actividades que conduzcan a salvaguardar la integridad física del personal, visitantes y de las instalaciones del Inmueble.
              </p>
            </div>

            {/* Section 2 */}
            <div className="mb-8">
              <h4 className="font-bold mb-4">2. INTEGRACIÓN</h4>
              <p className="text-sm mb-4">La Unidad Interna de Protección Civil queda integrada por.</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="border border-gray-300 p-2 text-left">NOMBRE</th>
                      <th className="border border-gray-300 p-2 text-left">PUESTO EN LA EMPRESA</th>
                      <th className="border border-gray-300 p-2 text-left">BRIGADA QUE INTEGRA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortEmployees(employees).map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2 uppercase">{emp.name}</td>
                        <td className="border border-gray-300 p-2 uppercase">{emp.role}</td>
                        <td className="border border-gray-300 p-2 uppercase">{emp.brigade}</td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500 italic">
                          Aún no hay firmas registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3 */}
            <div className="mb-8">
              <h4 className="font-bold mb-2">3. FUNCIONES</h4>
              <p className="text-sm mb-2">Corresponde a los integrantes de la Unidad Interna de Protección Civil, llevar a cabo las siguientes funciones.</p>
              <ul className="list-disc pl-5 text-sm space-y-1 text-justify">
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

            {/* Section 4 */}
            <div className="mb-8">
              <h4 className="font-bold mb-4">4. ESQUEMA ORGANIZACIONAL</h4>
              <p className="text-sm mb-4">
                Para que la Unidad Interna de Protección Civil logre los objetivos y desempeñe las funciones antes descritas, contará con la estructura organizacional.
              </p>
              <p className="text-sm mb-4">
                Se firma la presente <strong>ACTA CONSTITUTIVA</strong> de la <strong>Unidad Interna de Protección Civil</strong>, por sus integrantes, en el lugar y fecha indicados, siendo las {docInfo.time_end} horas.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-blue-900 text-white">
                      <th className="border border-gray-300 p-2 text-left">NOMBRE</th>
                      <th className="border border-gray-300 p-2 text-left">PUESTO EN LA EMPRESA</th>
                      <th className="border border-gray-300 p-2 text-center">FIRMA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortEmployees(employees).map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2 uppercase align-middle">{emp.name}</td>
                        <td className="border border-gray-300 p-2 uppercase align-middle">{emp.role}</td>
                        <td className="border border-gray-300 p-2 text-center align-middle h-16">
                          <img src={emp.signature} alt={`Firma de ${emp.name}`} className="h-12 mx-auto object-contain mix-blend-multiply" />
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={3} className="border border-gray-300 p-4 text-center text-gray-500 italic">
                          Aún no hay firmas registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {docInfo && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-8 right-4 left-4 sm:left-auto sm:right-8 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 z-10"
          aria-label="Agregar Firma"
        >
          <PenTool className="w-6 h-6 shrink-0" />
          <span className="font-bold text-sm sm:text-base">DAR CLICK AQUÍ PARA FIRMAR Y REGISTRARTE</span>
        </button>
      )}

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSignature}
      />
    </motion.div>
  );
}
