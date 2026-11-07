import React, { useState, useEffect, useRef } from 'react';
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
  ClipboardPaste,
  RefreshCw,
  Camera
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
  PuntosCriticosData,
  EvidenciaFotograficaItem
} from '../../utils/generatePIPCPDF';
import { generatePdfName } from '../../utils/pdfNameGenerator';
import {
  generateCroquis250mDataUrl,
  discoverSurroundingRisksForCoords,
  computeDistanceMeters
} from '../../utils/generateCroquis250mImage';

const EVIDENCIA_SIGNAL_OPTIONS = [
  { value: 'extintor', label: 'EXTINTOR' },
  { value: 'botiquin', label: 'BOTIQUÍN DE PRIMEROS AUXILIOS' },
  { value: 'ruta_evacuacion', label: 'RUTA DE EVACUACIÓN' },
  { value: 'salida_emergencia', label: 'SALIDA DE EMERGENCIA' },
  { value: 'riesgo_electrico', label: 'RIESGO ELÉCTRICO' },
  { value: 'detector_humo', label: 'DETECTOR DE HUMO' },
  { value: 'valvula_gas', label: 'VÁLVULA DE GAS' },
  { value: 'otro', label: 'PUNTO DE REUNIÓN / OTRO EQUIPO' }
];

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
  const [evidenciaItems, setEvidenciaItems] = useState<EvidenciaFotograficaItem[]>([]);
  const [useDefaultInventarioIfEmpty, setUseDefaultInventarioIfEmpty] = useState(true);
  const [loadingRisksForCoords, setLoadingRisksForCoords] = useState(false);
  const analyzedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const syncTimeoutRef = useRef<any>(null);

  // Estado de generación
  const [generating, setGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // Actualizar establecimientos circundantes, simbología y croquis cuando cambian las coordenadas
  const syncRisksWithCoords = async (lat: number, lng: number, updateSatelliteToo = true) => {
    setLoadingRisksForCoords(true);
    if (updateSatelliteToo) setLoadingMapImg(true);
    try {
      const keyRes = await fetch('/api/maps-key');
      const keyData = await keyRes.json();
      const apiKey = keyData?.key;
      if (!apiKey) return;

      if (updateSatelliteToo) {
        try {
          const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x480&scale=2&maptype=hybrid&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
          const res = await fetch(staticUrl);
          if (res.ok) {
            const blob = await res.blob();
            const reader = new FileReader();
            const satDataUrl: string = await new Promise((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(new File([blob], 'map.jpg', { type: 'image/jpeg' }));
            });
            setCroquisUbicacionImg(satDataUrl);
          }
        } catch {
          // ignore
        }
      }

      const discovered = await discoverSurroundingRisksForCoords(
        lat,
        lng,
        apiKey,
        nombreComercial || docInfo?.commercial_name || ''
      );

      analyzedCenterRef.current = { lat, lng };
      setRiesgosCircundantesList(discovered);

      const colors = ['#16a34a', '#1d4ed8', '#dc2626', '#f59e0b', '#7c3aed'];
      if (discovered.length > 0) {
        setSimbologiaItems(
          discovered.slice(0, 5).map((p: RiskData, i: number) => ({
            label: (p.name || `LOCAL ${i + 1}`).toUpperCase(),
            color: colors[i % colors.length]
          }))
        );
      }

      const croq250 = await generateCroquis250mDataUrl({
        lat,
        lng,
        places: discovered,
        mapsApiKey: apiKey
      });
      if (croq250) {
        setCroquisCircundantesImg(croq250);
      }
    } catch (e) {
      console.error('Error syncing risks with new coordinates:', e);
    } finally {
      setLoadingRisksForCoords(false);
      if (updateSatelliteToo) setLoadingMapImg(false);
    }
  };

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
      setCroquisUbicacionImg('');
      setEvidenciaItems([]);
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
          if (typeof parsed?.center?.lat === 'number' && typeof parsed?.center?.lng === 'number') {
            setCoordenadas(`${parsed.center.lat}, ${parsed.center.lng}`);
            analyzedCenterRef.current = { lat: parsed.center.lat, lng: parsed.center.lng };
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

  // Detectar cambio de coordenadas (ej. al pegar nuevas coordenadas en celular o PC)
  // y actualizar automáticamente los riesgos circundantes, mapa satelital y croquis 250m
  useEffect(() => {
    if (!isOpen) return;
    const parts = coordenadas.split(',').map((s) => s.trim());
    if (parts.length < 2) return;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    const prevCenter = analyzedCenterRef.current;
    const distFromPrev = prevCenter
      ? computeDistanceMeters(prevCenter.lat, prevCenter.lng, lat, lng)
      : Infinity;

    // Si las coordenadas cambiaron más de 50 metros respecto a las anteriores,
    // limpiar inmediatamente los establecimientos viejos y buscar los del nuevo punto
    if (distFromPrev > 50) {
      setRiesgosCircundantesList([]);
      setCroquisUbicacionImg('');
      setCroquisCircundantesImg('');
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncRisksWithCoords(lat, lng, true);
      }, 650);
    }

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [coordenadas, isOpen]);

  if (!isOpen || !docInfo) return null;

  // Convertir y optimizar imagen subida (o pegada) a DataURL JPEG de alta definición (max 2048px, calidad 0.86).
  // Mantiene letras, tablas y fotos 100% nítidas evitando que fotos crudas de 48MP de iPhone inflen el PDF sin necesidad.
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 2048;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.86);
            canvas.width = 0;
            canvas.height = 0;
            resolve(compressed);
          } else {
            resolve(rawUrl);
          }
        };
        img.onerror = () => resolve(rawUrl);
        img.src = rawUrl;
      };
      reader.onerror = () => resolve('');
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

  // Descargar mapa satelital automático y actualizar riesgos circundantes según coordenadas
  const handleAutoFetchSatelliteMap = async () => {
    const parts = coordenadas.split(',').map((s) => s.trim());
    if (parts.length < 2 || isNaN(parseFloat(parts[0])) || isNaN(parseFloat(parts[1]))) {
      Swal.fire('Coordenadas inválidas', 'Ingresa Latitud, Longitud separadas por coma.', 'warning');
      return;
    }
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    await syncRisksWithCoords(lat, lng, true);
  };

  // Inicializar 6 señales básicas para subir fotos desde el Carrete del iPhone
  const handlePreloadDefaultEvidenciaSignals = () => {
    const preset: EvidenciaFotograficaItem[] = [
      { id: `ev-${Date.now()}-1`, signalType: 'extintor', label: 'EXTINTOR', cantidad: '1', photoDataUrl: '' },
      { id: `ev-${Date.now()}-2`, signalType: 'botiquin', label: 'BOTIQUÍN DE PRIMEROS AUXILIOS', cantidad: '1', photoDataUrl: '' },
      { id: `ev-${Date.now()}-3`, signalType: 'ruta_evacuacion', label: 'RUTA DE EVACUACIÓN', cantidad: '2', photoDataUrl: '' },
      { id: `ev-${Date.now()}-4`, signalType: 'salida_emergencia', label: 'SALIDA DE EMERGENCIA', cantidad: '1', photoDataUrl: '' },
      { id: `ev-${Date.now()}-5`, signalType: 'riesgo_electrico', label: 'RIESGO ELÉCTRICO', cantidad: '1', photoDataUrl: '' },
      { id: `ev-${Date.now()}-6`, signalType: 'detector_humo', label: 'DETECTOR DE HUMO', cantidad: '1', photoDataUrl: '' }
    ];
    setEvidenciaItems(preset);
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
    evidenciaItems,
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
    <div className="fixed inset-0 z-50 bg-black/65 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div
        className="bg-white dark:bg-gray-900 rounded-none sm:rounded-2xl shadow-2xl w-full max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[92dvh] flex flex-col overflow-hidden border-0 sm:border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-5 py-3 sm:py-3.5 bg-gradient-to-r from-[#7b1f1c] to-[#4a1210] text-white flex items-center justify-between gap-2 shrink-0"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FileText className="w-5 h-5 text-amber-300 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm sm:text-lg leading-tight truncate">
                Generador de Programa Interno (PIPC {anio})
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-100/90 font-medium truncate">
                {nombreComercial} — {employees.length} brigadista(s) firmado(s)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={generating}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 shrink-0 touch-manipulation"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Adaptados para iPhone (5 pestañas visibles sin amontonarse) y Desktop */}
        <div className="grid grid-cols-5 sm:flex sm:overflow-x-auto bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-1.5 sm:px-3 pt-1.5 sm:pt-2 gap-1 sm:gap-1.5 shrink-0">
          {[
            { id: 'empresa', shortLabel: '1. Empresa', label: '1. Empresa y Portada', icon: Building2 },
            { id: 'ubicacion', shortLabel: '2. Croquis', label: '2. Croquis y Circundantes', icon: MapPin },
            { id: 'actividad', shortLabel: '3. Actividad', label: '3. Actividad y Riesgos Internos', icon: ShieldAlert },
            { id: 'inventario', shortLabel: '4. Inventario', label: '4. Inventario Señaléticas', icon: ImageIcon },
            { id: 'resumen', shortLabel: '5. Estudios', label: '5. Estudios Incluidos', icon: CheckCircle2 }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as PIPCTab)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-3.5 py-2 rounded-t-lg text-[10px] sm:text-sm font-bold whitespace-nowrap transition-colors border-b-2 touch-manipulation ${
                  active
                    ? 'bg-white dark:bg-gray-900 text-[#7b1f1c] dark:text-amber-400 border-[#7b1f1c] dark:border-amber-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="sm:hidden truncate max-w-full">{t.shortLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
          {/* TAB 1: DATOS DE LA EMPRESA Y PORTADA */}
          {activeTab === 'empresa' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm font-semibold bg-white dark:bg-gray-800"
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm font-semibold bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Giro / Descripción de Actividades (Pág. 6, 38, 43, 45, 46, 63)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={giro}
                      onChange={(e) => setGiro(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
                    />
                    <button
                      type="button"
                      onClick={handleRegenerateTextsFromGiro}
                      className="w-full sm:w-auto px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 shadow-xs min-h-[42px] touch-manipulation"
                      title="Actualizar textos de Pág. 45 y 46 con base en este giro"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
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
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:col-span-2">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      N° Trabajadores
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={numTrabajadores}
                      onChange={(e) => setNumTrabajadores(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Afluencia 100%
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={afluenciaClientes}
                      onChange={(e) => setAfluenciaClientes(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-extrabold uppercase text-[#7b1f1c] dark:text-amber-400 mb-1">
                      Metros Cuadrados (M² Construcción) *
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="5"
                      step="any"
                      value={m2Construccion}
                      onChange={(e) => setM2Construccion(e.target.value)}
                      placeholder="Escribe los m² (Ej. 45, 90, 180)..."
                      className="w-full px-3 py-2.5 border-2 border-[#7b1f1c]/50 dark:border-amber-500/60 rounded-lg text-base sm:text-sm font-bold bg-amber-50/40 dark:bg-gray-800 focus:border-[#7b1f1c] focus:outline-none"
                    />
                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                      Calcula automáticamente Sí/No y cantidades en Análisis de Riesgo (Pág. 38-42) e Incendio (Pág. 43)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CROQUIS DE UBICACIÓN Y RIESGOS CIRCUNDANTES (PÁGS. 6, 7 Y 8) */}
          {activeTab === 'ubicacion' && (
            <div className="space-y-5">
              {/* Pág. 6: Croquis de Ubicación */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h4 className="font-bold text-xs sm:text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                    Pág. 6 — Croquis de Ubicación y Coordenadas
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoFetchSatelliteMap}
                    disabled={loadingMapImg}
                    className="w-full sm:w-auto px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[40px] touch-manipulation"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{loadingMapImg ? 'Descargando mapa...' : 'Generar Satelital con Google Maps'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Coordenadas (Latitud, Longitud) — Al pegar nuevas coordenadas se actualizan automáticamente los 5 establecimientos circundantes
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={coordenadas}
                      onChange={(e) => setCoordenadas(e.target.value)}
                      placeholder="Ej. 20.650283, -87.061502"
                      className="flex-1 px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-sm bg-white dark:bg-gray-800"
                    />
                    <button
                      type="button"
                      onClick={handleAutoFetchSatelliteMap}
                      disabled={loadingRisksForCoords || loadingMapImg}
                      className="w-full sm:w-auto px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 min-h-[42px] touch-manipulation"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loadingRisksForCoords ? 'animate-spin' : ''}`} />
                      <span>
                        {loadingRisksForCoords
                          ? 'Buscando establecimientos...'
                          : 'Actualizar Riesgos y Mapas'}
                      </span>
                    </button>
                  </div>
                </div>

                <div
                  onPaste={(e) => handlePasteImage(e, (url) => setCroquisUbicacionImg(url))}
                  tabIndex={0}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3.5 sm:p-4 text-center focus:border-blue-500 focus:outline-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {croquisUbicacionImg ? (
                    <div className="space-y-2.5">
                      <img
                        src={croquisUbicacionImg}
                        alt="Croquis Ubicación"
                        className="max-h-48 mx-auto rounded-lg shadow border object-contain"
                      />
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCroquisUbicacionImg('')}
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-xs text-red-600 font-bold rounded-lg hover:underline"
                        >
                          Quitar imagen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 py-2">
                      <ClipboardPaste className="w-7 h-7 mx-auto text-gray-400" />
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                        En PC presiona <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl + V</kbd> para pegar tu captura, o sube una foto desde tu iPhone / dispositivo:
                      </p>
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs active:scale-[0.99] cursor-pointer w-full sm:w-auto min-h-[42px] touch-manipulation">
                        <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Seleccionar imagen de Galería / Archivos</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) setCroquisUbicacionImg(await fileToDataUrl(f));
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Pág. 7: Riesgos Circundantes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h4 className="font-bold text-xs sm:text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                    Pág. 7 — Riesgos Circundantes
                  </h4>
                  <div className="grid grid-cols-2 sm:flex gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setRiesgosCircundantesMode('table')}
                      className={`px-2.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-center touch-manipulation ${
                        riesgosCircundantesMode === 'table'
                          ? 'bg-[#7b1f1c] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Tabla Automática ({riesgosCircundantesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRiesgosCircundantesMode('images')}
                      className={`px-2.5 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-center touch-manipulation ${
                        riesgosCircundantesMode === 'images'
                          ? 'bg-[#7b1f1c] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Subir / Pegar ({riesgosCircundantesImgs.length})
                    </button>
                  </div>
                </div>

                {riesgosCircundantesMode === 'table' ? (
                  loadingRisksForCoords ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2.5 text-xs font-bold text-amber-800 dark:text-amber-200">
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-[#7b1f1c] dark:text-amber-400" />
                      <span>
                        Buscando establecimientos reales en un radio de 250 m para las coordenadas ({coordenadas})...
                      </span>
                    </div>
                  ) : riesgosCircundantesList.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                        ✓ {riesgosCircundantesList.length} establecimientos detectados para las coordenadas actuales (puedes subir foto desde tu Carrete en cualquiera):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {riesgosCircundantesList.map((r, i) => (
                          <div
                            key={i}
                            className="p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between gap-2 text-xs bg-gray-50/50 dark:bg-gray-800/40"
                          >
                            {r.photoUri && r.photoUri.startsWith('data:') && (
                              <img
                                src={r.photoUri}
                                alt={r.name}
                                className="w-10 h-10 rounded object-cover border shrink-0"
                              />
                            )}
                            <div className="truncate min-w-0 flex-1">
                              <span className="font-bold block truncate">{r.name}</span>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                {r.distance} — Nivel {r.riskLevel}
                              </span>
                            </div>
                            <label
                              className="px-2 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 touch-manipulation"
                              title="Subir foto desde mi Carrete / Galería"
                            >
                              <Camera className="w-3.5 h-3.5 shrink-0" />
                              <span>Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    const url = await fileToDataUrl(f);
                                    setRiesgosCircundantesList((prev) =>
                                      prev.map((item, idx) =>
                                        idx === i ? { ...item, photoUri: url } : item
                                      )
                                    );
                                  }
                                }}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setRiesgosCircundantesList((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="p-1.5 text-red-500 hover:text-red-700 shrink-0 touch-manipulation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Pulsa <strong>"Actualizar Riesgos y Mapas"</strong> arriba para buscar automáticamente los 5 establecimientos cercanos a las coordenadas ingresadas, o cambia a <strong>"Subir / Pegar"</strong> para subir capturas desde tu Carrete.
                      </p>
                    </div>
                  )
                ) : (
                  <div
                    onPaste={(e) =>
                      handlePasteImage(e, (url) => setRiesgosCircundantesImgs((prev) => [...prev, url]))
                    }
                    tabIndex={0}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3.5 sm:p-4 text-center focus:border-blue-500 focus:outline-none space-y-2.5"
                  >
                    <p className="text-xs font-semibold">
                      Pega con <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Ctrl + V</kbd> o selecciona imágenes de tu galería:
                    </p>
                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs active:scale-[0.99] cursor-pointer w-full sm:w-auto min-h-[42px] touch-manipulation">
                      <ImageIcon className="w-4 h-4 text-[#7b1f1c] shrink-0" />
                      <span>Seleccionar imagen(es) de Galería</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files: File[] = Array.from(e.target.files || []);
                          const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
                          setRiesgosCircundantesImgs((prev) => [...prev, ...urls]);
                        }}
                        className="hidden"
                      />
                    </label>
                    {riesgosCircundantesImgs.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                        {riesgosCircundantesImgs.map((img, idx) => (
                          <div key={idx} className="relative border rounded-lg p-1">
                            <img src={img} alt={`Riesgo ${idx + 1}`} className="h-28 mx-auto object-contain" />
                            <button
                              type="button"
                              onClick={() =>
                                setRiesgosCircundantesImgs((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1.5 shadow touch-manipulation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pág. 8: Croquis Riesgos Circundantes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h4 className="font-bold text-xs sm:text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                    Pág. 8 — Croquis Riesgos Circundantes (250 m a la redonda)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAutoFetchSatelliteMap}
                    disabled={loadingMapImg}
                    className="w-full sm:w-auto px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[40px] touch-manipulation"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {loadingMapImg ? 'Generando Croquis 250m...' : 'Generar Croquis 250m Automático'}
                    </span>
                  </button>
                </div>
                <div
                  onPaste={(e) => handlePasteImage(e, (url) => setCroquisCircundantesImg(url))}
                  tabIndex={0}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-3.5 sm:p-4 text-center focus:border-blue-500 focus:outline-none"
                >
                  {croquisCircundantesImg ? (
                    <div className="space-y-2.5">
                      <img
                        src={croquisCircundantesImg}
                        alt="Croquis Circundantes 250m"
                        className="max-h-56 mx-auto rounded-lg shadow border object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setCroquisCircundantesImg('')}
                        className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-xs text-red-600 font-bold rounded-lg hover:underline"
                      >
                        Quitar imagen (se regenerará automáticamente el Croquis de 250m al crear el PDF)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed">
                        ✓ Al generar el PDF se dibujará automáticamente el Croquis de Riesgos Circundantes a 250 m a la redonda con los establecimientos, círculo rojo de 250m y simbología de riesgos.
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        (Opcional: puedes previsualizarlo con el botón de arriba o subir una captura manual)
                      </p>
                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs active:scale-[0.99] cursor-pointer w-full sm:w-auto min-h-[42px] touch-manipulation">
                        <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Subir imagen manual de Croquis 250m</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) setCroquisCircundantesImg(await fileToDataUrl(f));
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVIDAD ECONÓMICA (PÁG. 45) Y RIESGOS INTERNOS (PÁG. 46) */}
          {activeTab === 'actividad' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  Ambas páginas ya se redactaron automáticamente para el giro <strong>"{giro}"</strong>. Puedes editarlas libremente si deseas ajustar algo.
                </p>
                <button
                  type="button"
                  onClick={handleRegenerateTextsFromGiro}
                  className="w-full sm:w-auto px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 min-h-[38px] touch-manipulation"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Regenerar con Giro</span>
                </button>
              </div>

              {/* Pág. 45 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 space-y-3">
                <h4 className="font-bold text-xs sm:text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
                  Pág. 45 — Descripción de Actividad Económica y Puntos Críticos
                </h4>
                <textarea
                  rows={6}
                  value={actividadEconomicaText}
                  onChange={(e) => setActividadEconomicaText(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg text-base sm:text-xs leading-relaxed bg-white dark:bg-gray-800 font-medium"
                />

                <div className="grid grid-cols-1 min-[370px]:grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
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
                      className="flex items-center gap-2 p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs cursor-pointer min-h-[42px] touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        checked={(puntosCriticos as any)[chk.key]}
                        onChange={(e) =>
                          setPuntosCriticos((prev) => ({ ...prev, [chk.key]: e.target.checked }))
                        }
                        className="rounded text-[#7b1f1c] w-4 h-4 shrink-0"
                      />
                      <span className="font-semibold leading-tight">{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Pág. 46 */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 space-y-3">
                <h4 className="font-bold text-xs sm:text-sm uppercase text-[#7b1f1c] dark:text-amber-400">
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
                        className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded text-base sm:text-xs font-bold bg-white dark:bg-gray-800"
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
                        className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded text-base sm:text-xs bg-white dark:bg-gray-800"
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
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-base sm:text-xs bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTARIO DE SEÑALÉTICAS Y EQUIPOS (PÁGS. 54-55+) */}
          {activeTab === 'inventario' && (
            <div className="space-y-5">
              {/* SECCIÓN 1: SUBIR EVIDENCIA FOTOGRÁFICA DESDE EL CARRETE DEL IPHONE (ARMA LA TABLA OFICIAL) */}
              <div className="border-2 border-emerald-500/40 dark:border-emerald-700/60 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-3.5 sm:p-4 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm uppercase text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Opción 1 (Ideal iPhone / Móvil): Subir Evidencia Fotográfica desde tu Carrete</span>
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                      Sube las fotos directamente desde tu <strong>Carrete / Galería de Fotos</strong> y el sistema armará automáticamente la tabla oficial (<strong>EVIDENCIA FOTOGRÁFICA | SEÑAL | CANTIDAD</strong>) con los íconos de Protección Civil.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-[0.99] cursor-pointer min-h-[42px] touch-manipulation">
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>Subir Fotos de mi Carrete</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files: File[] = Array.from(e.target.files || []);
                          if (files.length === 0) return;
                          const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
                          const defaultOrder = [
                            { type: 'extintor', label: 'EXTINTOR' },
                            { type: 'botiquin', label: 'BOTIQUÍN DE PRIMEROS AUXILIOS' },
                            { type: 'ruta_evacuacion', label: 'RUTA DE EVACUACIÓN' },
                            { type: 'salida_emergencia', label: 'SALIDA DE EMERGENCIA' },
                            { type: 'riesgo_electrico', label: 'RIESGO ELÉCTRICO' },
                            { type: 'detector_humo', label: 'DETECTOR DE HUMO' }
                          ];
                          setEvidenciaItems((prev) => [
                            ...prev,
                            ...urls.map((url, idx) => {
                              const preset = defaultOrder[(prev.length + idx) % defaultOrder.length];
                              return {
                                id: `ev-${Date.now()}-${idx}-${Math.random()}`,
                                signalType: preset.type,
                                label: preset.label,
                                cantidad: '1',
                                photoDataUrl: url
                              };
                            })
                          ]);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    {evidenciaItems.length === 0 && (
                      <button
                        type="button"
                        onClick={handlePreloadDefaultEvidenciaSignals}
                        className="px-3 py-2.5 bg-white dark:bg-gray-800 border border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Cargar 6 Señales Básicas</span>
                      </button>
                    )}
                  </div>
                </div>

                {evidenciaItems.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-900 dark:text-emerald-300">
                        Evidencias Fotográficas ({evidenciaItems.length}):
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setEvidenciaItems((prev) => [
                              ...prev,
                              {
                                id: `ev-${Date.now()}-${Math.random()}`,
                                signalType: 'extintor',
                                label: 'EXTINTOR',
                                cantidad: '1',
                                photoDataUrl: ''
                              }
                            ])
                          }
                          className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar fila
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvidenciaItems([])}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          Limpiar todas
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evidenciaItems.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex gap-3 items-start shadow-2xs"
                        >
                          {/* Miniatura o botón para elegir foto del Carrete */}
                          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-emerald-400 dark:border-emerald-600 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden cursor-pointer shrink-0 relative group touch-manipulation">
                            {item.photoDataUrl ? (
                              <>
                                <img
                                  src={item.photoDataUrl}
                                  alt={item.label}
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] font-bold py-0.5 text-center">
                                  Cambiar foto
                                </span>
                              </>
                            ) : (
                              <div className="text-center p-1.5 space-y-1">
                                <Camera className="w-6 h-6 mx-auto text-emerald-600" />
                                <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                                  Subir de Carrete
                                </span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const url = await fileToDataUrl(f);
                                  setEvidenciaItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, photoDataUrl: url } : it))
                                  );
                                }
                              }}
                              className="hidden"
                            />
                          </label>

                          {/* Selector de Señal y Cantidad */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <select
                                value={item.signalType}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const found = EVIDENCIA_SIGNAL_OPTIONS.find((o) => o.value === val);
                                  setEvidenciaItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? {
                                            ...it,
                                            signalType: val,
                                            label: found ? found.label : it.label
                                          }
                                        : it
                                    )
                                  );
                                }}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-base sm:text-xs font-bold bg-white dark:bg-gray-900"
                              >
                                {EVIDENCIA_SIGNAL_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  setEvidenciaItems((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="p-1.5 text-red-500 hover:text-red-700 shrink-0 touch-manipulation"
                                title="Eliminar evidencia"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setEvidenciaItems((prev) =>
                                    prev.map((it, i) => (i === idx ? { ...it, label: val } : it))
                                  );
                                }}
                                placeholder="Nombre de señal..."
                                className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-base sm:text-xs bg-white dark:bg-gray-900"
                              />
                              <div className="w-20 shrink-0 flex items-center gap-1">
                                <span className="text-[10px] font-bold uppercase text-gray-500">Cant:</span>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min="1"
                                  value={item.cantidad}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEvidenciaItems((prev) =>
                                      prev.map((it, i) => (i === idx ? { ...it, cantidad: val } : it))
                                    );
                                  }}
                                  className="w-12 px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-base sm:text-xs font-bold text-center bg-white dark:bg-gray-900"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: SUBIR CAPTURAS DE HOJA COMPLETA DESDE GALERÍA O CTRL+V */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs leading-relaxed text-blue-900 dark:text-blue-200">
                <strong>Opción 2 (Hojas completas):</strong> También puedes subir desde el Carrete de tu iPhone (o pegar con <strong>Ctrl + V</strong> en PC) capturas de pantalla completas de las tablas de Inventario.
              </div>

              <div
                onPaste={(e) =>
                  handlePasteImage(e, (url) => setInventarioImgs((prev) => [...prev, url]))
                }
                tabIndex={0}
                className="border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-xl p-4 sm:p-5 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/60 dark:bg-gray-800/40 cursor-pointer space-y-2.5"
              >
                <ClipboardPaste className="w-7 h-7 mx-auto text-blue-600 dark:text-blue-400" />
                <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug">
                  Sube capturas desde tu Carrete / Galería (o presiona <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border rounded shadow-2xs">Ctrl + V</kbd> en PC)
                </p>
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-[0.99] cursor-pointer w-full sm:w-auto min-h-[44px] touch-manipulation">
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Abrir Carrete / Seleccionar Capturas de Inventario</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files: File[] = Array.from(e.target.files || []);
                      const urls = await Promise.all(files.map((file) => fileToDataUrl(file)));
                      setInventarioImgs((prev) => [...prev, ...urls]);
                    }}
                    className="hidden"
                  />
                </label>
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
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow touch-manipulation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <label className="flex items-start sm:items-center gap-2.5 text-xs text-gray-600 dark:text-gray-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={useDefaultInventarioIfEmpty}
                    onChange={(e) => setUseDefaultInventarioIfEmpty(e.target.checked)}
                    className="rounded text-[#7b1f1c] w-4 h-4 mt-0.5 sm:mt-0 shrink-0"
                  />
                  <span className="leading-snug">
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
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">{st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-bold text-xs uppercase text-gray-600 dark:text-gray-300">
                    Turnos para la Cédula de Simulacro
                  </h5>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Selecciona qué turnos marcar con trabajadores en la Cédula de Simulacro:
                  </p>
                </div>
                <div className="grid grid-cols-3 sm:flex gap-1.5 w-full sm:w-auto">
                  {(['M', 'MV', 'MVN'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTurnosSimulacro(mode)}
                      className={`px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-center touch-manipulation ${
                        turnosSimulacro === mode
                          ? 'bg-[#1f497d] text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {mode === 'M' ? 'Matutino' : mode === 'MV' ? 'Mat. y Vesp.' : 'M / V / Noc.'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de progreso mientras ensambla las ~84 páginas */}
        {generating && (
          <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-amber-50 dark:bg-gray-800 border-t border-amber-200 dark:border-gray-700 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-[#7b1f1c] dark:text-amber-300">
              <span className="truncate">{progressText}</span>
              <span className="shrink-0">{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7b1f1c] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer adaptado para iPhone 16 (con safe-area-inset-bottom y botones de ancho completo en móvil) */}
        <div
          className="px-3.5 sm:px-5 pt-3 bg-gray-50 dark:bg-gray-800/95 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cerrar
          </button>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePreviewPIPC}
              disabled={generating}
              className="px-3 sm:px-4 py-2.5 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl sm:rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 min-h-[44px] touch-manipulation"
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span className="truncate">{generating ? 'Ensamblando...' : 'Vista Previa'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPIPC}
              disabled={generating}
              className="px-3 sm:px-5 py-2.5 sm:py-2 bg-[#7b1f1c] hover:bg-[#5c1614] text-white rounded-xl sm:rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors disabled:opacity-50 min-h-[44px] touch-manipulation"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">{generating ? 'Generando...' : 'Descargar PIPC'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

