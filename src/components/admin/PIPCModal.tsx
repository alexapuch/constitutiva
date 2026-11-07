import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  Eye,
  Building2,
  MapPin,
  ShieldAlert,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Plus,
  CheckCircle2,
  ClipboardPaste
} from 'lucide-react';
import Swal from 'sweetalert2';
import { DocumentInfo, Employee, RiskData } from '../../types';
import {
  generateActividadEconomicaText,
  generateRiesgosInternosSection,
  InternalRisksSection
} from '../../utils/pipcTemplates';
import {
  generatePIPCPDF,
  PIPCPDFConfig,
  PuntosCriticosData
} from '../../utils/generatePIPCPDF';
import { generatePdfName } from '../../utils/pdfNameGenerator';
import { generateCroquis250mDataUrl } from '../../utils/generateCroquis250mImage';

interface PIPCModalProps {
  isOpen: boolean;
  onClose: () => void;
  docInfo: DocumentInfo | null;
  employees: Employee[];
  onPreview: (url: string, name: string) => void;
}

type PIPCTab = 'empresa' | 'ubicacion' | 'actividad' | 'inventario' | 'resumen';

export default function PIPCModal({
  isOpen,
  onClose,
  docInfo,
  employees,
  onPreview
}: PIPCModalProps) {
  const [activeTab, setActiveTab] = useState<PIPCTab>('empresa');

  // 1. Datos de la Empresa (Págs. 1, 3, 5, 14, 47)
  const [anio, setAnio] = useState('2026');
  const [razonSocial, setRazonSocial] = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [representanteLegal, setRepresentanteLegal] = useState('');
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState('PLAYA DEL CARMEN');
  const [estado, setEstado] = useState('QUINTANA ROO');
  const [rfc, setRfc] = useState('');
  const [horario, setHorario] = useState('');
  const [numTrabajadores, setNumTrabajadores] = useState('1');
  const [afluenciaClientes, setAfluenciaClientes] = useState('10');
  const [telefono, setTelefono] = useState('SE RESERVA EL DERECHO');
  const [m2Construccion, setM2Construccion] = useState('');
  const [giro, setGiro] = useState('');
  const [turnosSimulacro, setTurnosSimulacro] = useState<'M' | 'MV' | 'MVN'>('MV');

  // 2. Ubicación y Riesgos Circundantes (Págs. 6, 7, 8)
  const [coordenadas, setCoordenadas] = useState('20.650283395825614, -87.06150292348663');
  const [croquisUbicacionImg, setCroquisUbicacionImg] = useState<string>('');
  const [loadingMapImg, setLoadingMapImg] = useState(false);

  const [riesgosCircundantesMode, setRiesgosCircundantesMode] = useState<'table' | 'images'>('table');
  const [riesgosCircundantesList, setRiesgosCircundantesList] = useState<RiskData[]>([]);
  const [riesgosCircundantesImgs, setRiesgosCircundantesImgs] = useState<string[]>([]);

  const [croquisCircundantesImg, setCroquisCircundantesImg] = useState<string>('');
  const [simbologiaItems, setSimbologiaItems] = useState<{ label: string; color: string }[]>([
    { label: 'TIENDA DEPARTAMENTAL', color: '#4ade80' },
    { label: 'SUPERMERCADO', color: '#60a5fa' },
    { label: 'COMERCIOS / RESTAURANTES', color: '#facc15' },
    { label: 'LOCALES TIENDAS VARIAS', color: '#f87171' }
  ]);

  // 3. Actividad Económica (Pág. 45) y Riesgos Internos (Pág. 46)
  const [actividadEconomicaText, setActividadEconomicaText] = useState('');
  const [puntosCriticos, setPuntosCriticos] = useState<PuntosCriticosData>({
    brigadaPrimerosAuxilios: true,
    combateIncendios: true,
    equipoContraIncendios: true,
    equipoPrimerosAuxilios: true,
    alarma: false,
    rutasEvacuacion: true,
    salidasEmergencia: true,
    alarmaSonora: false,
    notaCorrectiva:
      'DAR EL MANTENIMIENTO PREVENTIVO A TODA LA SEÑALIZACIÓN, LOS EXTINTORES RECARGARLOS SEGÚN SU FECHA INDICADA EN LA ETIQUETA, REVISAR Y ACTUALIZAR EL BOTIQUÍN.'
  });
  const [riesgosInternos, setRiesgosInternos] = useState<InternalRisksSection>({
    items: [],
    conclusion: ''
  });

  // 4. Inventario de Señaléticas y Equipos de Emergencia (Pág. 54+)
  const [inventarioImgs, setInventarioImgs] = useState<string[]>([]);
  const [useDefaultInventarioIfEmpty, setUseDefaultInventarioIfEmpty] = useState(true);

  // Estado de generación
  const [generating, setGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Inicializar datos al abrir para una empresa
  useEffect(() => {
    if (isOpen && docInfo) {
      const rawAddr = docInfo.address || '';
      const parts = rawAddr.split('|');
      const baseAddr = parts[0]?.trim() || '';
      const cityPart = parts[1]?.trim().toUpperCase() || 'PLAYA DEL CARMEN';

      setRazonSocial(docInfo.company_name || '');
      setNombreComercial(docInfo.commercial_name || '');
      setRepresentanteLegal(docInfo.company_name || '');
      setDireccion(baseAddr);
      setMunicipio(cityPart);
      setRfc('');
      setHorario('');
      setM2Construccion('');
      setCroquisCircundantesImg('');
      setGiro(docInfo.activity || 'TIENDAS DE ROPA, ZAPATERIAS, NOVEDADES Y REGALOS');
      setNumTrabajadores(String(employees.length || docInfo.usuarios || 1));
      setAfluenciaClientes(String(docInfo.visitantes || 10));

      const actText = generateActividadEconomicaText(
        docInfo.activity || 'TIENDAS DE ROPA, ZAPATERIAS, NOVEDADES Y REGALOS',
        docInfo.commercial_name
      );
      setActividadEconomicaText(actText);

      const riSection = generateRiesgosInternosSection(
        docInfo.activity || 'TIENDAS DE ROPA, ZAPATERIAS, NOVEDADES Y REGALOS'
      );
      setRiesgosInternos(riSection);

      // Intentar cargar caché reciente de GeoRiesgos
      try {
        const cachedRaw = localStorage.getItem('circundantes_places_cache');
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (parsed?.center?.lat && parsed?.center?.lng) {
            setCoordenadas(`${parsed.center.lat}, ${parsed.center.lng}`);
          }
          if (Array.isArray(parsed?.places) && parsed.places.length > 0) {
            setRiesgosCircundantesList(parsed.places.slice(0, 5));
            const colors = ['#16a34a', '#1d4ed8', '#dc2626', '#f59e0b', '#7c3aed'];
            setSimbologiaItems(
              parsed.places.slice(0, 5).map((p: RiskData, i: number) => ({
                label: (p.name || `LOCAL ${i + 1}`).toUpperCase(),
                color: colors[i % colors.length]
              }))
            );
          }
        }
      } catch (e) {
        console.error('Error reading circundantes_places_cache:', e);
      }
    }
  }, [isOpen, docInfo, employees]);

  if (!isOpen || !docInfo) return null;

  // Convertir archivo de imagen subido o pegado a DataURL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handler para pegar imagen con Ctrl+V desde el portapapeles
  const handlePasteImage = async (
    e: React.ClipboardEvent,
    onImageReady: (dataUrl: string) => void
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const dataUrl = await fileToDataUrl(file);
          onImageReady(dataUrl);
        }
        return;
      }
    }
  };

  // Descargar mapa satelital automático desde Google Static Maps usando las coordenadas
  const handleAutoFetchSatelliteMap = async () => {
    const parts = coordenadas.split(',').map((s) => s.trim());
    if (parts.length < 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
      Swal.fire('Coordenadas inválidas', 'Ingresa Latitud, Longitud separadas por coma.', 'warning');
      return;
    }
    setLoadingMapImg(true);
    try {
      const keyRes = await fetch('/api/maps-key');
      const keyData = await keyRes.json();
      const apiKey = keyData?.key;
      if (!apiKey) throw new Error('No se encontró API Key de Google Maps.');

      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x480&scale=2&maptype=hybrid&markers=color:red%7C${lat},${lng}&key=${apiKey}`;

      const res = await fetch(staticUrl);
      if (!res.ok) throw new Error('No se pudo obtener el mapa satelital.');
      const blob = await res.blob();
      const dataUrl = await fileToDataUrl(new File([blob], 'map.jpg', { type: 'image/jpeg' }));
      setCroquisUbicacionImg(dataUrl);

      const croq250 = await generateCroquis250mDataUrl({
        lat,
        lng,
        places: riesgosCircundantesList,
        mapsApiKey: apiKey
      });
      if (croq250) {
        setCroquisCircundantesImg(croq250);
      }
    } catch (err: any) {
      Swal.fire('Aviso', err?.message || 'Error al obtener mapa satelital.', 'info');
    } finally {
      setLoadingMapImg(false);
    }
  };

  const handleRegenerateTextsFromGiro = () => {
    const newAct = generateActividadEconomicaText(giro, nombreComercial);
    const newRi = generateRiesgosInternosSection(giro);
    setActividadEconomicaText(newAct);
    setRiesgosInternos(newRi);
    Swal.fire({
      icon: 'success',
      title: 'Textos actualizados',
      text: 'Se redactaron automáticamente la Actividad Económica (Pág. 45) y los Riesgos Internos (Pág. 46) según el giro.',
      timer: 1600,
      showConfirmButton: false
    });
  };

  const buildConfig = (): PIPCPDFConfig => ({
    docInfo,
    employees,
    razonSocial,
    nombreComercial,
    representanteLegal,
    direccion,
    municipio,
    estado,
    rfc,
    horario,
    numTrabajadores,
    afluenciaClientes,
    telefono,
    m2Construccion,
    giro,
    anio,
    coordenadas,
    croquisUbicacionImg: croquisUbicacionImg || undefined,
    riesgosCircundantesMode,
    riesgosCircundantesList,
    riesgosCircundantesImgs,
    croquisCircundantesImg: croquisCircundantesImg || undefined,
    simbologiaItems,
    actividadEconomicaText,
    puntosCriticos,
    riesgosInternos,
    inventarioImgs,
    useDefaultInventarioIfEmpty,
    turnosSimulacro,
    onProgress: (txt, pct) => {
      setProgressText(txt);
      setProgressPercent(pct);
    }
  });

  const handlePreviewPIPC = async () => {
    setGenerating(true);
    setProgressText('Iniciando armado del PIPC...');
    setProgressPercent(2);
    try {
      const url = await generatePIPCPDF(buildConfig(), true);
      if (url) {
        const pdfName = generatePdfName('PIPC 2026', nombreComercial, docInfo.date);
        onPreview(url, pdfName);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPIPC = async () => {
    setGenerating(true);
    setProgressText('Iniciando armado del PIPC...');
    setProgressPercent(2);
    try {
      await generatePIPCPDF(buildConfig(), false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-2 sm:p-4">
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#7b1f1c] to-[#4a1210] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Generador de Programa Interno (PIPC {anio})
              </h3>
              <p className="text-xs text-amber-100/90 font-medium truncate max-w-md">
                {nombreComercial} — {employees.length} brigadista(s) firmado(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 pt-2 gap-1.5 shrink-0">
          {[
            { id: 'empresa', label: '1. Empresa y Portada', icon: Building2 },
            { id: 'ubicacion', label: '2. Croquis y Circundantes', icon: MapPin },
            { id: 'actividad', label: '3. Actividad y Riesgos Internos', icon: ShieldAlert },
            { id: 'inventario', label: '4. Inventario Señaléticas', icon: ImageIcon },
            { id: 'resumen', label: '5. Estudios Incluidos', icon: CheckCircle2 }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as PIPCTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                  active
                    ? 'bg-white dark:bg-gray-900 text-[#7b1f1c] dark:text-amber-400 border-[#7b1f1c] dark:border-amber-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
          {/* TAB 1: DATOS DE LA EMPRESA Y PORTADA */}
          {activeTab === 'empresa' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200">
                Estos datos llenan automáticamente la <strong>Portada (Pág. 1)</strong>, <strong>Presentación (Pág. 3)</strong>, <strong>Datos de la Empresa (Pág. 5)</strong>, <strong>Agentes Perturbadores (Pág. 14)</strong> y <strong>Organigrama (Pág. 47)</strong>.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Razón Social / Propietario
                  </label>
                  <input
                    type="text"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-semibold bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Nombre Comercial (va entre comillas en Portada)
                  </label>
                  <input
                    type="text"
                    value={nombreComercial}
                    onChange={(e) => setNombreComercial(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-semibold bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Giro / Descripción de Actividades (Pág. 6, 38, 43, 45, 46, 63)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={giro}
                      onChange={(e) => setGiro(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateTextsFromGiro}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
                      title="Actualizar textos de Pág. 45 y 46 con base en este giro"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Auto-Redactar Pág. 45 y 46</span>
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Dirección del Establecimiento
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Municipio
                  </label>
                  <input
                    type="text"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    RFC (Pág. 5 - Escribir manualmente)
                  </label>
                  <input
                    type="text"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value.toUpperCase())}
                    placeholder="Escribe aquí el RFC de la empresa..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Horario de Funcionamiento (Pág. 5 - Escribir manualmente)
                  </label>
                  <input
                    type="text"
                    value={horario}
                    onChange={(e) => setHorario(e.target.value.toUpperCase())}
                    placeholder="Ej. 9:00 A.M. – 9:00 P.M. LUNES - DOMINGO"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Representante Legal (Pág. 5)
                  </label>
                  <input
                    type="text"
                    value={representanteLegal}
                    onChange={(e) => setRepresentanteLegal(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      N° Trabajadores
                    </label>
                    <input
                      type="text"
                      value={numTrabajadores}
                      onChange={(e) => setNumTrabajadores(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Afluencia 100%
                    </label>
                    <input
                      type="text"
                      value={afluenciaClientes}
                      onChange={(e) => setAfluenciaClientes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-[#7b1f1c] dark:text-amber-400 mb-1">
                      Metros Cuadrados (M² Construcción / Superficie) *
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="any"
                      value={m2Construccion}
                      onChange={(e) => setM2Construccion(e.target.value)}
                      placeholder="Escribe los m² (Ej. 45, 90, 180)..."
                      className="w-full px-3 py-2 border-2 border-[#7b1f1c]/50 dark:border-amber-500/60 rounded-lg text-sm font-bold bg-amber-50/40 dark:bg-gray-800 focus:border-[#7b1f1c] focus:outline-none"
                    />
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Calcula automáticamente Sí/No y cantidades en Análisis de Riesgo (Pág. 38-42) e Incendio (Pág. 43)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CROQUIS DE UBICACIÓN Y RIESGOS CIRCUNDANTES (PÁGS. 6, 7 Y 8) */}
          {activeTab === 'ubicacion' && (
            <div className="space-y-6">
              {/* Pág. 6: Croquis de Ubicación */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                    Pág. 6 — Croquis de Ubicación y Coordenadas
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoFetchSatelliteMap}
                    disabled={loadingMapImg}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{loadingMapImg ? 'Descargando mapa...' : 'Generar Satelital con Google Maps'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Coordenadas (Latitud, Longitud)
                  </label>
                  <input
                    type="text"
                    value={coordenadas}
                    onChange={(e) => setCoordenadas(e.target.value)}
                    placeholder="Ej. 20.650283, -87.061502"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
                  />
                </div>

                <div
                  onPaste={(e) => handlePasteImage(e, (url) => setCroquisUbicacionImg(url))}
                  tabIndex={0}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center focus:border-blue-500 focus:outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {croquisUbicacionImg ? (
                    <div className="space-y-2">
                      <img
                        src={croquisUbicacionImg}
                        alt="Croquis Ubicación"
                        className="max-h-48 mx-auto rounded-lg shadow border"
                      />
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCroquisUbicacionImg('')}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          Quitar imagen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2">
                      <ClipboardPaste className="w-7 h-7 mx-auto text-gray-400" />
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                        Haz clic aquí y presiona <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl + V</kbd> para pegar tu screenshot satelital, o sube una imagen:
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) setCroquisUbicacionImg(await fileToDataUrl(f));
                        }}
                        className="text-xs mx-auto block"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pág. 7: Riesgos Circundantes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                    Pág. 7 — Riesgos Circundantes
                  </h4>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRiesgosCircundantesMode('table')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        riesgosCircundantesMode === 'table'
                          ? 'bg-[#7b1f1c] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Usar Tabla Automática ({riesgosCircundantesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiesgosCircundantesMode('images')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        riesgosCircundantesMode === 'images'
                          ? 'bg-[#7b1f1c] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Pegar Captura(s) Manualmente ({riesgosCircundantesImgs.length})
                    </button>
                  </div>
                </div>

                {riesgosCircundantesMode === 'table' ? (
                  riesgosCircundantesList.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        ✓ Se cargaron automáticamente {riesgosCircundantesList.length} riesgos circundantes del módulo GeoRiesgos:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {riesgosCircundantesList.map((r, i) => (
                          <div
                            key={i}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="truncate">
                              <span className="font-bold">{r.name}</span> ({r.distance}) — Nivel {r.riskLevel}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setRiesgosCircundantesList((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="text-red-500 hover:text-red-700 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      No hay riesgos guardados recientemente en GeoRiesgos. Puedes abrir <strong>Riesgos Circundantes</strong> en el menú para analizarlos, o cambiar a <strong>"Pegar Captura(s) Manualmente"</strong> arriba.
                    </p>
                  )
                ) : (
                  <div
                    onPaste={(e) =>
                      handlePasteImage(e, (url) => setRiesgosCircundantesImgs((prev) => [...prev, url]))
                    }
                    tabIndex={0}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center focus:border-blue-500 focus:outline-none"
                  >
                    <p className="text-xs font-semibold mb-2">
                      Haz clic aquí y presiona <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl + V</kbd> para pegar la imagen de tu tabla de Riesgos Circundantes:
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files: File[] = Array.from(e.target.files || []);
                        const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
                        setRiesgosCircundantesImgs((prev) => [...prev, ...urls]);
                      }}
                      className="text-xs mx-auto block mb-3"
                    />
                    {riesgosCircundantesImgs.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                        {riesgosCircundantesImgs.map((img, idx) => (
                          <div key={idx} className="relative border rounded-lg p-1">
                            <img src={img} alt={`Riesgo ${idx + 1}`} className="h-28 mx-auto object-contain" />
                            <button
                              type="button"
                              onClick={() =>
                                setRiesgosCircundantesImgs((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pág. 8: Croquis Riesgos Circundantes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                    Pág. 8 — Croquis Riesgos Circundantes (250 m a la redonda)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoFetchSatelliteMap}
                    disabled={loadingMapImg}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>
                      {loadingMapImg ? 'Generando Croquis 250m...' : 'Generar Croquis 250m Automático'}
                    </span>
                  </button>
                </div>
                <div
                  onPaste={(e) => handlePasteImage(e, (url) => setCroquisCircundantesImg(url))}
                  tabIndex={0}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center focus:border-blue-500 focus:outline-none"
                >
                  {croquisCircundantesImg ? (
                    <div className="space-y-2">
                      <img
                        src={croquisCircundantesImg}
                        alt="Croquis Circundantes 250m"
                        className="max-h-56 mx-auto rounded-lg shadow border"
                      />
                      <button
                        type="button"
                        onClick={() => setCroquisCircundantesImg('')}
                        className="text-xs text-red-600 font-bold hover:underline"
                      >
                        Quitar imagen (se regenerará automáticamente el Croquis de 250m al crear el PDF)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        ✓ Al generar el PDF se dibujará automáticamente el Croquis de Riesgos Circundantes a 250 m a la redonda con los establecimientos, círculo rojo de 250m y simbología de riesgos.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        (Opcional: también puedes pulsar &quot;Generar Croquis 250m Automático&quot; arriba para previsualizarlo aquí o pegar una captura con <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl + V</kbd>)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) setCroquisCircundantesImg(await fileToDataUrl(f));
                        }}
                        className="text-xs mx-auto block"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVIDAD ECONÓMICA (PÁG. 45) Y RIESGOS INTERNOS (PÁG. 46) */}
          {activeTab === 'actividad' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  Ambas páginas ya se redactaron automáticamente para el giro <strong>"{giro}"</strong>. Puedes editarlas libremente si deseas ajustar algo.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateTextsFromGiro}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Regenerar con Giro</span>
                </button>
              </div>

              {/* Pág. 45 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                  Pág. 45 — Descripción de Actividad Económica y Puntos Críticos
                </h4>
                <textarea
                  rows={6}
                  value={actividadEconomicaText}
                  onChange={(e) => setActividadEconomicaText(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-xs leading-relaxed bg-white dark:bg-gray-800 font-medium"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { key: 'brigadaPrimerosAuxilios', label: 'Brigada Primeros Aux.' },
                    { key: 'combateIncendios', label: 'Combate de Incendios' },
                    { key: 'equipoContraIncendios', label: 'Equipo Contra Incendios' },
                    { key: 'equipoPrimerosAuxilios', label: 'Equipo Primeros Aux.' },
                    { key: 'alarma', label: 'Alarma' },
                    { key: 'rutasEvacuacion', label: 'Rutas de Evacuación' },
                    { key: 'salidasEmergencia', label: 'Salidas de Emergencia' },
                    { key: 'alarmaSonora', label: 'Alarma Sonora' }
                  ].map((chk) => (
                    <label
                      key={chk.key}
                      className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(puntosCriticos as any)[chk.key]}
                        onChange={(e) =>
                          setPuntosCriticos((prev) => ({ ...prev, [chk.key]: e.target.checked }))
                        }
                        className="rounded text-[#7b1f1c]"
                      />
                      <span className="font-semibold">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pág. 46 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                  Pág. 46 — Riesgos Internos (5 Puntos y Conclusión)
                </h4>
                <div className="space-y-3">
                  {riesgosInternos.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2"
                    >
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRiesgosInternos((prev) => ({
                            ...prev,
                            items: prev.items.map((it, i) => (i === idx ? { ...it, title: val } : it))
                          }));
                        }}
                        className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs font-bold bg-white dark:bg-gray-800"
                      />
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRiesgosInternos((prev) => ({
                            ...prev,
                            items: prev.items.map((it, i) =>
                              i === idx ? { ...it, description: val } : it
                            )
                          }));
                        }}
                        className="w-full px-2.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Conclusión de Riesgos Internos
                    </label>
                    <textarea
                      rows={3}
                      value={riesgosInternos.conclusion}
                      onChange={(e) =>
                        setRiesgosInternos((prev) => ({ ...prev, conclusion: e.target.value }))
                      }
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTARIO DE SEÑALÉTICAS Y EQUIPOS (PÁGS. 54-55+) */}
          {activeTab === 'inventario' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200">
                Aquí puedes pegar con <strong>Ctrl + V</strong> (o subir) las capturas de pantalla de las tablas de <strong>Inventario de Señaléticas y Equipos de Emergencia</strong> que haces en tu otra página. Cada imagen ocupará una página dentro del marco del PIPC y el índice ajustará los números de página automáticamente.
              </div>

              <div
                onPaste={(e) =>
                  handlePasteImage(e, (url) => setInventarioImgs((prev) => [...prev, url]))
                }
                tabIndex={0}
                className="border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-xl p-6 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/60 dark:bg-gray-800/40 cursor-pointer"
              >
                <ClipboardPaste className="w-9 h-9 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  Haz clic en este recuadro y presiona <kbd className="px-2 py-0.5 bg-white dark:bg-gray-700 border rounded shadow-2xs">Ctrl + V</kbd> para pegar cada hoja del inventario
                </p>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  O selecciona una o varias imágenes desde tu computadora:
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files: File[] = Array.from(e.target.files || []);
                    const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
                    setInventarioImgs((prev) => [...prev, ...urls]);
                  }}
                  className="text-xs mx-auto block"
                />
              </div>

              {inventarioImgs.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                      Hojas de Inventario agregadas ({inventarioImgs.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setInventarioImgs([])}
                      className="text-xs text-red-600 font-bold hover:underline"
                    >
                      Borrar todas
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {inventarioImgs.map((img, i) => (
                      <div
                        key={i}
                        className="relative border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-800 shadow-xs"
                      >
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Hoja #{i + 1}
                        </span>
                        <img
                          src={img}
                          alt={`Inventario ${i + 1}`}
                          className="h-36 mx-auto object-contain rounded"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setInventarioImgs((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={useDefaultInventarioIfEmpty}
                    onChange={(e) => setUseDefaultInventarioIfEmpty(e.target.checked)}
                    className="rounded text-[#7b1f1c]"
                  />
                  <span>
                    Si no pego imágenes arriba, dejar las 2 páginas de inventario de ejemplo del machote (Págs. 54 y 55)
                  </span>
                </label>
              )}
            </div>
          )}

          {/* TAB 5: RESUMEN DE ESTUDIOS AUTOMÁTICOS INCLUIDOS */}
          {activeTab === 'resumen' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    title: 'Acta Constitutiva (Pág. 10+)',
                    desc: `Se genera e inserta automáticamente con las ${employees.length} firma(s) registradas de la empresa.`
                  },
                  {
                    title: 'Análisis de Riesgo (5 Hojas, Pág. 38+)',
                    desc: `Se genera automáticamente para el giro "${giro}" con superficie de ${m2Construccion || '(escribe los m² en Pestaña 1)'} m² y firma del asesor.`
                  },
                  {
                    title: 'Análisis de Incendio NOM-002 (Pág. 43)',
                    desc: `Cálculo automático de grado de riesgo de incendio para ${m2Construccion || '(escribe los m² en Pestaña 1)'} m² con firma del asesor.`
                  },
                  {
                    title: 'Organigrama y Brigadas (Pág. 47)',
                    desc: 'Organigrama visual + tabla con nombre, dirección y funciones de la Multibrigada.'
                  },
                  {
                    title: 'Calendario de Actividades (Pág. 56)',
                    desc: `Tabla anual con los meses sombreados automáticamente según la fecha del acta (${docInfo.date}).`
                  },
                  {
                    title: 'Cédula de Simulacro (Pág. 63+)',
                    desc: `Cédula completa + evaluación + hojas de firmas de participantes (${employees.length} empleado(s)).`
                  }
                ].map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl flex items-start gap-2.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        {st.title}
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-xs uppercase text-gray-600 dark:text-gray-300">
                    Turnos para la Cédula de Simulacro
                  </h5>
                  <p className="text-xs text-gray-500">
                    Selecciona qué turnos marcar con trabajadores en la Cédula de Simulacro:
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {(['M', 'MV', 'MVN'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTurnosSimulacro(mode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        turnosSimulacro === mode
                          ? 'bg-[#1f497d] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {mode === 'M' ? 'Solo Matutino' : mode === 'MV' ? 'Matutino y Vespertino' : 'M / V / Nocturno'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de progreso mientras ensambla las ~84 páginas */}
        {generating && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-gray-800 border-t border-amber-200 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#7b1f1c] dark:text-amber-300">
              <span>{progressText}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7b1f1c] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePreviewPIPC}
              disabled={generating}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              <span>{generating ? 'Ensamblando...' : 'Vista Previa PIPC'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPIPC}
              disabled={generating}
              className="px-5 py-2 bg-[#7b1f1c] hover:bg-[#5c1614] text-white rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{generating ? 'Generando PDF...' : 'Descargar PIPC 2026'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

