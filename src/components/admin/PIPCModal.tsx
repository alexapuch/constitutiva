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
  Camera,
  Calendar,
  RotateCw,
  Layers,
  FolderArchive,
  Upload
} from 'lucide-react';
import Swal from 'sweetalert2';
import { DocumentInfo, Employee, RiskData } from '../../types';
import {
  generateActividadEconomicaText,
  generateRiesgosInternosSection,
  InternalRisksSection,
  buildDefaultCalendarioGrid
} from '../../utils/pipcTemplates';
import {
  ACTIVITIES_LIST,
  MONTHS_LIST
} from '../../utils/generateCalendarioPDF';
import {
  generatePIPCPDF,
  PIPCPDFConfig,
  PuntosCriticosData,
  EvidenciaFotograficaItem,
  CroquisPlacedSign
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

type PIPCTab = 'empresa' | 'ubicacion' | 'actividad' | 'inventario' | 'croquis_senaletica' | 'calendario' | 'resumen' | 'zip';

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
  const [collapsedEvidenciaIds, setCollapsedEvidenciaIds] = useState<Record<string, boolean>>({});
  const [useDefaultInventarioIfEmpty, setUseDefaultInventarioIfEmpty] = useState(true);
  const [loadingRisksForCoords, setLoadingRisksForCoords] = useState(false);
  const analyzedCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const syncTimeoutRef = useRef<any>(null);
  const hasCompletedRef = useRef<boolean>(false);
  const initializedDocKeyRef = useRef<string | null>(null);

  // 4b. Croquis de Señaléticas y Equipos de Emergencia (página después del Inventario)
  const [croquisSenaleticaBaseImg, setCroquisSenaleticaBaseImg] = useState<string>('');
  const [croquisSenaleticaSigns, setCroquisSenaleticaSigns] = useState<CroquisPlacedSign[]>([]);
  const [croquisSenaleticaIconScale, setCroquisSenaleticaIconScale] = useState<number>(6.5);
  const [omitCroquisSenaletica, setOmitCroquisSenaletica] = useState<boolean>(false);
  const [activeCroquisTool, setActiveCroquisTool] = useState<string>('extintor');
  const [activeCroquisRotation, setActiveCroquisRotation] = useState<number>(0);
  const [selectedCroquisSignId, setSelectedCroquisSignId] = useState<string | null>(null);
  const croquisContainerRef = useRef<HTMLDivElement>(null);
  const croquisDragRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    origXPct: number;
    origYPct: number;
  } | null>(null);
  const bgTapStartRef = useRef<{ x: number; y: number } | null>(null);

  // Resumen de señaléticas que el usuario ya escogió en la pestaña previa (Evidencia Fotográfica)
  const inventorySignalSummary = React.useMemo(() => {
    const map = new Map<string, { signalType: string; label: string; targetCount: number }>();
    for (const it of evidenciaItems) {
      const st = it.signalType || 'extintor';
      const qty = Math.max(1, parseInt(it.cantidad) || 1);
      const existing = map.get(st);
      if (existing) {
        existing.targetCount += qty;
      } else {
        const opt = EVIDENCIA_SIGNAL_OPTIONS.find((o) => o.value === st);
        map.set(st, {
          signalType: st,
          label: it.label || opt?.label || st.toUpperCase(),
          targetCount: qty
        });
      }
    }
    return Array.from(map.values());
  }, [evidenciaItems]);

  // Cuando el usuario entra a la pestaña de Croquis de Señalética, pre-seleccionar la primera señal de su inventario
  useEffect(() => {
    if (activeTab === 'croquis_senaletica' && inventorySignalSummary.length > 0) {
      const existsInInv = inventorySignalSummary.some((s) => s.signalType === activeCroquisTool);
      if (!existsInInv) {
        setActiveCroquisTool(inventorySignalSummary[0].signalType);
      }
    }
  }, [activeTab, inventorySignalSummary]);

  // 5. Calendario Anual de Actividades (Pág. 56)
  const [calendarioGrid, setCalendarioGrid] = useState<boolean[][]>(() =>
    buildDefaultCalendarioGrid(docInfo?.date)
  );

  const extintoresIdx = ACTIVITIES_LIST.findIndex((a) =>
    a.includes('MANTENIMIENTO Y RECARGA DEL EQUIPO CONTRA INCENDIOS')
  );
  const polizaIdx = ACTIVITIES_LIST.findIndex((a) =>
    a.includes('RENOVACIÓN POLIZA DE SEGURO')
  );

  const toggleCalendarioCell = (rIdx: number, cIdx: number) => {
    setCalendarioGrid((prev) => {
      const copy = prev.map((row) => [...row]);
      if (!copy[rIdx]) copy[rIdx] = new Array(12).fill(false);
      copy[rIdx][cIdx] = !copy[rIdx][cIdx];
      return copy;
    });
  };

  const setSingleMonthForActivity = (rIdx: number, cIdx: number) => {
    if (rIdx < 0) return;
    setCalendarioGrid((prev) => {
      const copy = prev.map((row) => [...row]);
      if (!copy[rIdx]) copy[rIdx] = new Array(12).fill(false);
      const isCurrentlyActive = !!copy[rIdx][cIdx];
      copy[rIdx].fill(false);
      if (!isCurrentlyActive) {
        copy[rIdx][cIdx] = true;
      }
      return copy;
    });
  };

  const resetCalendarioToDefault = () => {
    setCalendarioGrid(buildDefaultCalendarioGrid(docInfo?.date));
  };

  // Estado de generación
  const [generating, setGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  // 8. Expediente ZIP ordenado (100% local en el navegador, sin guardar en servidor)
  const [includeAutoConstancias, setIncludeAutoConstancias] = useState(true);
  const [includeDictamenElectrico, setIncludeDictamenElectrico] = useState(false);
  const [zipConstanciasFiles, setZipConstanciasFiles] = useState<File[]>([]);
  const [zipLegalFiles, setZipLegalFiles] = useState<File[]>([]);
  const [zipPolizaFiles, setZipPolizaFiles] = useState<File[]>([]);
  const [zipExtintoresFiles, setZipExtintoresFiles] = useState<File[]>([]);
  const [zipDictamenFiles, setZipDictamenFiles] = useState<File[]>([]);
  const [zipCustomRegistroFiles, setZipCustomRegistroFiles] = useState<File[]>([]);

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

  // Helper para inicializar / limpiar todos los campos del modal para un documento
  const resetModalFieldsForDoc = (targetDoc: DocumentInfo) => {
    const rawAddr = targetDoc.address || '';
    const parts = rawAddr.split('|');
    const baseAddr = parts[0]?.trim() || '';
    const cityPart = parts[1]?.trim().toUpperCase() || 'PLAYA DEL CARMEN';

    setRazonSocial(targetDoc.company_name || '');
    setNombreComercial(targetDoc.commercial_name || '');
    setRepresentanteLegal(targetDoc.company_name || '');
    setDireccion(baseAddr);
    setMunicipio(cityPart);
    setRfc('');
    setHorario('');
    setM2Construccion('');
    setCroquisCircundantesImg('');
    setCroquisUbicacionImg('');
    setEvidenciaItems([]);
    setCollapsedEvidenciaIds({});
    setInventarioImgs([]);
    setCroquisSenaleticaBaseImg('');
    setCroquisSenaleticaSigns([]);
    setOmitCroquisSenaletica(false);
    setSelectedCroquisSignId(null);
    setGiro(targetDoc.activity || 'TIENDAS DE ROPA, ZAPATERIAS, NOVEDADES Y REGALOS');
    setNumTrabajadores(String(employees.length || targetDoc.usuarios || 1));
    setAfluenciaClientes(String(targetDoc.visitantes || 10));

    const actText = generateActividadEconomicaText(
      targetDoc.activity || 'TIENDAS DE ROPA, ZAPATERIAS, NOVEDADES Y REGALOS',
      targetDoc.commercial_name
    );
    setActividadEconomicaText(actText);

    const riSection = generateRiesgosInternosSection(
      targetDoc.activity || 'TIENDAS DE ROPA, ZAPATERIAS, NOVEDADES Y REGALOS'
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

    // Resetear cuadrícula del calendario y archivos de ZIP
    setCalendarioGrid(buildDefaultCalendarioGrid(targetDoc.date));
    setZipConstanciasFiles([]);
    setZipLegalFiles([]);
    setZipPolizaFiles([]);
    setZipExtintoresFiles([]);
    setZipDictamenFiles([]);
    setZipCustomRegistroFiles([]);
    setIncludeAutoConstancias(true);
    setIncludeDictamenElectrico(false);
    setActiveTab('empresa');
  };

  // Inicializar solo si es una empresa nueva o si el flujo anterior ya se había completado
  useEffect(() => {
    if (isOpen && docInfo) {
      const docKey = `${docInfo.id || ''}_${docInfo.commercial_name || docInfo.company_name || ''}`;
      if (initializedDocKeyRef.current !== docKey || hasCompletedRef.current) {
        resetModalFieldsForDoc(docInfo);
        initializedDocKeyRef.current = docKey;
        hasCompletedRef.current = false;
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

  // Rota un DataURL JPEG 90 grados en el sentido de las agujas del reloj
  const rotateDataUrl90 = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotated = canvas.toDataURL('image/jpeg', 0.88);
        canvas.width = 0;
        canvas.height = 0;
        resolve(rotated);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Convertir y optimizar imagen subida (o pegada) a DataURL JPEG de alta definición (max 2048px, calidad 0.86).
  // Respeta la orientación EXIF de la cámara del iPhone ('from-image') y si forceVertical=true garantiza que
  // quede vertical (portrait) sin girarse horizontalmente de forma indeseada.
  const fileToDataUrl = async (file: File, forceVertical = false): Promise<string> => {
    // 1. Intentar decodificar con createImageBitmap respetando la orientación EXIF nativa del iPhone
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        let bw = bitmap.width;
        let bh = bitmap.height;

        // Si se pide vertical obligatoriamente y la foto vino horizontal, rotar 90 grados
        const shouldRotate = forceVertical && bw > bh;
        const effW = shouldRotate ? bh : bw;
        const effH = shouldRotate ? bw : bh;

        const maxDim = 2048;
        let outW = effW;
        let outH = effH;
        if (outW > maxDim || outH > maxDim) {
          if (outW > outH) {
            outH = Math.round((outH * maxDim) / outW);
            outW = maxDim;
          } else {
            outW = Math.round((outW * maxDim) / outH);
            outH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          if (shouldRotate) {
            ctx.translate(outW / 2, outH / 2);
            ctx.rotate((90 * Math.PI) / 180);
            ctx.drawImage(bitmap, -outH / 2, -outW / 2, outH, outW);
          } else {
            ctx.drawImage(bitmap, 0, 0, outW, outH);
          }
          const compressed = canvas.toDataURL('image/jpeg', 0.86);
          canvas.width = 0;
          canvas.height = 0;
          bitmap.close();
          return compressed;
        }
      } catch {
        // Fallback a FileReader si el navegador no soporta options en createImageBitmap
      }
    }

    // 2. Fallback estándar con FileReader
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          let iw = img.naturalWidth || img.width;
          let ih = img.naturalHeight || img.height;
          const shouldRotate = forceVertical && iw > ih;
          const effW = shouldRotate ? ih : iw;
          const effH = shouldRotate ? iw : ih;

          const maxDim = 2048;
          let outW = effW;
          let outH = effH;
          if (outW > maxDim || outH > maxDim) {
            if (outW > outH) {
              outH = Math.round((outH * maxDim) / outW);
              outW = maxDim;
            } else {
              outW = Math.round((outW * maxDim) / outH);
              outH = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outW, outH);
            if (shouldRotate) {
              ctx.translate(outW / 2, outH / 2);
              ctx.rotate((90 * Math.PI) / 180);
              ctx.drawImage(img, -outH / 2, -outW / 2, outH, outW);
            } else {
              ctx.drawImage(img, 0, 0, outW, outH);
            }
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
    croquisSenaleticaBaseImg: omitCroquisSenaletica ? undefined : (croquisSenaleticaBaseImg || undefined),
    croquisSenaleticaSigns: omitCroquisSenaletica ? [] : croquisSenaleticaSigns,
    croquisSenaleticaIconScale,
    omitCroquisSenaletica,
    calendarioGrid,
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
      hasCompletedRef.current = true;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadZip = async () => {
    setGenerating(true);
    setProgressText('Preparando expediente ZIP...');
    setProgressPercent(2);
    try {
      const { generateExpedienteZip } = await import('../../utils/generateExpedienteZip');
      await generateExpedienteZip({
        pipcConfig: buildConfig(),
        includeAutoConstancias,
        includeDictamenElectrico,
        constanciasFiles: zipConstanciasFiles,
        legalFiles: zipLegalFiles,
        polizaFiles: zipPolizaFiles,
        extintoresFiles: zipExtintoresFiles,
        dictamenFiles: zipDictamenFiles,
        customRegistroFiles: zipCustomRegistroFiles,
        onProgress: (txt, pct) => {
          setProgressText(txt);
          setProgressPercent(pct);
        }
      });
      hasCompletedRef.current = true;
    } finally {
      setGenerating(false);
    }
  };

  // Si ya se completó (descargó PIPC o ZIP), al cerrar borra todo; si está incompleto, conserva el avance
  const handleCloseModal = () => {
    if (hasCompletedRef.current && docInfo) {
      resetModalFieldsForDoc(docInfo);
      initializedDocKeyRef.current = null;
      hasCompletedRef.current = false;
    }
    onClose();
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
            onClick={handleCloseModal}
            disabled={generating}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 shrink-0 touch-manipulation"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - Adaptados con scroll horizontal táctil suave para iPhone y Desktop */}
        <div className="flex overflow-x-auto scrollbar-none bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-1.5 sm:px-3 pt-1.5 sm:pt-2 gap-1 sm:gap-1.5 shrink-0">
          {[
            { id: 'empresa', shortLabel: '1. Empresa', label: '1. Empresa y Portada', icon: Building2 },
            { id: 'ubicacion', shortLabel: '2. Croquis', label: '2. Croquis y Circundantes', icon: MapPin },
            { id: 'actividad', shortLabel: '3. Actividad', label: '3. Actividad y Riesgos', icon: ShieldAlert },
            { id: 'inventario', shortLabel: '4. Fotos', label: '4. Evidencia Fotográfica', icon: Camera },
            { id: 'croquis_senaletica', shortLabel: '5. Croquis Señal.', label: '5. Croquis Señaléticas', icon: Layers },
            { id: 'calendario', shortLabel: '6. Calendario', label: '6. Calendario Anual', icon: Calendar },
            { id: 'resumen', shortLabel: '7. Estudios', label: '7. Estudios Incluidos', icon: CheckCircle2 },
            { id: 'zip', shortLabel: '8. ZIP', label: '8. Expediente ZIP', icon: FolderArchive }
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as PIPCTab)}
                className={`shrink-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-t-lg text-[10px] sm:text-sm font-bold whitespace-nowrap transition-colors border-b-2 touch-manipulation ${
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
                      Sube fotos desde tu <strong>Carrete / Galería</strong> (tabla <strong>EVIDENCIA FOTOGRÁFICA | SEÑALÉTICA | CANTIDAD</strong>), o agrega las señaléticas con su <strong>Ubicación</strong> sin fotos para generar la tabla <strong>SEÑALÉTICA | UBICACIÓN | CANTIDAD</strong> con sus íconos oficiales.
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
                          const urls = await Promise.all(files.map((file) => fileToDataUrl(file, true)));
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase text-emerald-900 dark:text-emerald-300">
                        Evidencias / Señaléticas ({evidenciaItems.length}):
                      </span>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const allCollapsed = evidenciaItems.every((it) => collapsedEvidenciaIds[it.id]);
                            if (allCollapsed) {
                              setCollapsedEvidenciaIds({});
                            } else {
                              const next: Record<string, boolean> = {};
                              evidenciaItems.forEach((it) => {
                                next[it.id] = true;
                              });
                              setCollapsedEvidenciaIds(next);
                            }
                          }}
                          className="text-xs text-gray-600 dark:text-gray-300 font-bold hover:underline"
                        >
                          {evidenciaItems.every((it) => collapsedEvidenciaIds[it.id])
                            ? 'Expandir todas'
                            : 'Contraer todas'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newId = `ev-${Date.now()}-${Math.random()}`;
                            setEvidenciaItems((prev) => [
                              ...prev,
                              {
                                id: newId,
                                signalType: 'extintor',
                                label: 'EXTINTOR',
                                cantidad: '1',
                                ubicacion: '',
                                photoDataUrl: ''
                              }
                            ]);
                          }}
                          className="text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar fila
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEvidenciaItems([]);
                            setCollapsedEvidenciaIds({});
                          }}
                          className="text-xs text-red-600 font-bold hover:underline"
                        >
                          Limpiar todas
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {evidenciaItems.map((item, idx) => {
                        const isCollapsed = !!collapsedEvidenciaIds[item.id];
                        if (isCollapsed) {
                          return (
                            <div
                              key={item.id}
                              onClick={() =>
                                setCollapsedEvidenciaIds((prev) => ({ ...prev, [item.id]: false }))
                              }
                              className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 rounded-xl flex items-center gap-2.5 shadow-2xs cursor-pointer transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
                                {item.photoDataUrl ? (
                                  <img
                                    src={item.photoDataUrl}
                                    alt={item.label}
                                    className="w-full h-full object-cover"
                                  />
                                ) : item.signalType && item.signalType !== 'otro' ? (
                                  <img
                                    src={`/senales/${item.signalType}.png`}
                                    alt={item.label}
                                    className="w-7 h-7 object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] font-extrabold text-emerald-700">PR</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                    {item.label || 'SEÑAL'}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shrink-0">
                                    Cant: {item.cantidad || '1'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {item.ubicacion
                                    ?.split('\n')
                                    .map((s) => s.trim())
                                    .filter(Boolean).length
                                    ? `📍 ${item.ubicacion
                                        .split('\n')
                                        .map((s) => s.trim())
                                        .filter(Boolean)
                                        .join(' · ')}`
                                    : 'Sin ubicación'}
                                </p>
                              </div>
                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCollapsedEvidenciaIds((prev) => ({ ...prev, [item.id]: false }))
                                  }
                                  className="px-2 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 touch-manipulation"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEvidenciaItems((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 touch-manipulation"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                        <div
                          key={item.id}
                          className="sm:col-span-2 p-3 bg-white dark:bg-gray-800 border-2 border-emerald-300/80 dark:border-emerald-700/70 rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-start shadow-xs"
                        >
                          {/* Miniatura o botón para elegir foto del Carrete (en móvil ocupa ancho completo horizontal para no aplastar los campos) */}
                          <label className="w-full h-20 sm:w-24 sm:h-24 rounded-lg border-2 border-dashed border-emerald-400 dark:border-emerald-600 flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-0 bg-gray-50 dark:bg-gray-900 overflow-hidden cursor-pointer shrink-0 relative group touch-manipulation">
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
                              <div className="text-center p-1.5 flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1">
                                {item.signalType && item.signalType !== 'otro' ? (
                                  <img
                                    src={`/senales/${item.signalType}.png`}
                                    alt={item.label}
                                    className="w-10 h-10 object-contain opacity-80 shrink-0"
                                  />
                                ) : (
                                  <Camera className="w-6 h-6 mx-auto text-emerald-600 shrink-0" />
                                )}
                                <span className="block text-[10px] sm:text-[9px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                                  Subir foto (o usa ícono)
                                </span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  const url = await fileToDataUrl(f, true);
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
                              <div className="flex items-center gap-1 shrink-0">
                                {item.photoDataUrl && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const rotated = await rotateDataUrl90(item.photoDataUrl);
                                      setEvidenciaItems((prev) =>
                                        prev.map((it, i) => (i === idx ? { ...it, photoDataUrl: rotated } : it))
                                      );
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
                                    title="Girar foto 90° (para que quede vertical)"
                                    aria-label="Girar foto 90°"
                                  >
                                    <RotateCw className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEvidenciaItems((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="p-1.5 text-red-500 hover:text-red-700 shrink-0 touch-manipulation rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                  title="Eliminar evidencia"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

                            {/* Casillas de ubicación automáticas según la Cantidad (sin duplicar tarjetas ni copiar texto) */}
                            {(() => {
                              const qty = Math.min(12, Math.max(1, parseInt(item.cantidad) || 1));
                              const slots = (item.ubicacion || '').split('\n');
                              const updateSlot = (slotIdx: number, val: string) => {
                                const nextSlots = Array.from({ length: qty }, (_, k) =>
                                  k === slotIdx ? val.toUpperCase() : (slots[k] || '')
                                );
                                setEvidenciaItems((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, ubicacion: nextSlots.join('\n') } : it
                                  )
                                );
                              };

                              if (qty === 1) {
                                return (
                                  <input
                                    type="text"
                                    value={slots[0] || ''}
                                    onChange={(e) => updateSlot(0, e.target.value)}
                                    placeholder="Ubicación (ej. Recepción, Entrada, Pasillo...)"
                                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-base sm:text-xs bg-white dark:bg-gray-900"
                                  />
                                );
                              }

                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {Array.from({ length: qty }, (_, k) => (
                                    <div key={k} className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 w-5 text-right shrink-0">
                                        #{k + 1}
                                      </span>
                                      <input
                                        type="text"
                                        value={slots[k] || ''}
                                        onChange={(e) => updateSlot(k, e.target.value)}
                                        placeholder={`Ubicación #${k + 1}...`}
                                        className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-base sm:text-xs bg-white dark:bg-gray-900"
                                      />
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            <div className="flex justify-end pt-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setCollapsedEvidenciaIds((prev) => ({ ...prev, [item.id]: true }))
                                }
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs touch-manipulation"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Listo (Contraer)
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })}
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
                      const urls = await Promise.all(files.map((file) => fileToDataUrl(file, true)));
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
                        className="relative border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-white dark:bg-gray-800 shadow-xs flex flex-col justify-between"
                      >
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Hoja #{i + 1}
                        </span>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              const rot = await rotateDataUrl90(img);
                              setInventarioImgs((prev) => prev.map((item, idx) => (idx === i ? rot : item)));
                            }}
                            className="bg-black/70 hover:bg-blue-600 text-white rounded-full p-1.5 shadow touch-manipulation transition-colors"
                            title="Girar hoja 90°"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setInventarioImgs((prev) => prev.filter((_, idx) => idx !== i))
                            }
                            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow touch-manipulation"
                            title="Eliminar hoja"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <img
                          src={img}
                          alt={`Inventario ${i + 1}`}
                          className="h-36 mx-auto object-contain rounded my-auto"
                        />
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

              {/* Acceso directo a la pestaña de Croquis de Señalética */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 rounded-xl">
                <div className="text-xs text-gray-700 dark:text-gray-300">
                  <strong className="text-[#7b1f1c] dark:text-amber-400">¿Listo tu inventario?</strong> En la siguiente pestaña puedes subir la foto de tu croquis y colocar estas mismas señaléticas con un toque o clic.
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('croquis_senaletica')}
                  className="px-4 py-2.5 bg-[#7b1f1c] hover:bg-[#5c1614] text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm shrink-0 touch-manipulation"
                >
                  <Layers className="w-4 h-4" />
                  <span>Ir a Croquis de Señaléticas →</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: CROQUIS DE SEÑALÉTICAS Y EQUIPOS DE EMERGENCIA (PÁG. DESPUÉS DEL INVENTARIO) */}
          {activeTab === 'croquis_senaletica' && (
            <div
              className="space-y-4"
              onPaste={(e) =>
                handlePasteImage(e, (url) => {
                  setCroquisSenaleticaBaseImg(url);
                })
              }
            >
              {/* Banner explicativo */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
                      Croquis de Señaléticas y Equipos de Emergencia (Va después del Inventario)
                    </h4>
                    <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                      1) Sube la foto de tu croquis. 2) Escoge arriba la señalética y <strong>haz clic (en PC) o toca (en celular)</strong> sobre el croquis para colocarla. También puedes arrastrarlas con el dedo o cursor para acomodarlas.
                    </p>
                  </div>
                </div>
                {croquisSenaleticaBaseImg && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        const rot = await rotateDataUrl90(croquisSenaleticaBaseImg);
                        setCroquisSenaleticaBaseImg(rot);
                      }}
                      className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-emerald-100 touch-manipulation"
                      title="Girar imagen base del croquis 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Girar croquis 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCroquisSenaleticaBaseImg('');
                        setCroquisSenaleticaSigns([]);
                        setSelectedCroquisSignId(null);
                      }}
                      className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 hover:bg-red-100 touch-manipulation"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Quitar croquis
                    </button>
                  </div>
                )}
              </div>

              {/* Opción explícita: No hay croquis (omitir página en Vista Previa y Descarga) */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/70 cursor-pointer touch-manipulation">
                <input
                  type="checkbox"
                  checked={omitCroquisSenaletica}
                  onChange={(e) => setOmitCroquisSenaletica(e.target.checked)}
                  className="rounded text-[#7b1f1c] w-4 h-4 shrink-0"
                />
                <div className="text-xs leading-snug">
                  <span className="font-extrabold text-gray-900 dark:text-gray-100">
                    No hay croquis (omitir esta página en el PIPC)
                  </span>
                  <span className="block text-gray-500 dark:text-gray-400 mt-0.5">
                    {omitCroquisSenaletica
                      ? 'Esta página se omitirá en la Vista Previa y en la Descarga del PDF.'
                      : 'Si tampoco subes una foto del croquis abajo, esta página también se omitirá automáticamente.'}
                  </span>
                </div>
              </label>

              {!omitCroquisSenaletica && (
                <>
              {/* PASO 1: PALETA DE SEÑALÉTICAS (Priorizando las escogidas en la pestaña previa) */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xs space-y-3">
                {inventorySignalSummary.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-emerald-800 dark:text-emerald-400">
                        1. Tus Señaléticas elegidas en la pestaña previa (Toca una para colocarla):
                      </span>
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                        Total colocadas: {croquisSenaleticaSigns.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {inventorySignalSummary.map((item) => {
                        const placedCount = croquisSenaleticaSigns.filter(
                          (s) => s.signalType === item.signalType
                        ).length;
                        const isComplete = placedCount >= item.targetCount;
                        const isActive = activeCroquisTool === item.signalType;
                        return (
                          <button
                            key={item.signalType}
                            type="button"
                            onClick={() => setActiveCroquisTool(item.signalType)}
                            className={`p-2 rounded-xl border-2 text-left transition-all flex items-center gap-2.5 touch-manipulation ${
                              isActive
                                ? 'border-[#7b1f1c] dark:border-amber-400 bg-amber-50/90 dark:bg-amber-950/40 shadow-sm scale-[1.01]'
                                : isComplete
                                ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/40 dark:bg-emerald-950/20'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-850 hover:bg-gray-100'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1 shrink-0 shadow-2xs">
                              {item.signalType !== 'otro' ? (
                                <img
                                  src={`/senales/${item.signalType}.png`}
                                  alt={item.label}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-[11px] font-extrabold text-emerald-700">PR</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-extrabold text-gray-900 dark:text-gray-100 truncate">
                                {item.label}
                              </div>
                              <div
                                className={`text-[10px] font-bold mt-0.5 ${
                                  isComplete
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-amber-700 dark:text-amber-400'
                                }`}
                              >
                                {isComplete ? '✓ ' : ''}
                                {placedCount} / {item.targetCount} colocadas
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5">
                    Aún no has subido fotos individuales en la pestaña <strong>4. Fotos</strong>, pero puedes elegir cualquiera de las señaléticas oficiales de abajo para colocarlas sobre tu croquis:
                  </div>
                )}

                {/* Catálogo rápido con todas las señaléticas NOM-003 por si quiere agregar cualquier otra */}
                <div className="pt-1 border-t border-gray-100 dark:border-gray-700/70">
                  <span className="block text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1.5">
                    {inventorySignalSummary.length > 0
                      ? 'Otras señaléticas NOM-003 disponibles (Toca para seleccionar):'
                      : '1. Selecciona la señalética que deseas colocar en el croquis:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {EVIDENCIA_SIGNAL_OPTIONS.map((opt) => {
                      const isActive = activeCroquisTool === opt.value;
                      const placedCount = croquisSenaleticaSigns.filter(
                        (s) => s.signalType === opt.value
                      ).length;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setActiveCroquisTool(opt.value)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-all touch-manipulation ${
                            isActive
                              ? 'border-[#7b1f1c] bg-[#7b1f1c] text-white shadow-xs'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {opt.value !== 'otro' ? (
                            <img
                              src={`/senales/${opt.value}.png`}
                              alt={opt.label}
                              className="w-4 h-4 object-contain bg-white rounded-xs p-0.5"
                            />
                          ) : (
                            <span className="w-4 h-4 rounded-xs bg-emerald-600 text-white text-[9px] font-extrabold inline-flex items-center justify-center">
                              PR
                            </span>
                          )}
                          <span>{opt.label}</span>
                          {placedCount > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                                isActive
                                  ? 'bg-white/25 text-white'
                                  : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                              }`}
                            >
                              {placedCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Si la herramienta activa es Ruta de Evacuación, permitir escoger hacia dónde apunta la flecha */}
                {activeCroquisTool === 'ruta_evacuacion' && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Dirección de la flecha de Ruta de Evacuación:
                    </span>
                    {[
                      { deg: 0, label: '➡ Derecha' },
                      { deg: 90, label: '⬇ Abajo' },
                      { deg: 180, label: '⬅ Izquierda' },
                      { deg: 270, label: '⬆ Arriba' }
                    ].map((dir) => (
                      <button
                        key={dir.deg}
                        type="button"
                        onClick={() => setActiveCroquisRotation(dir.deg)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border touch-manipulation ${
                          activeCroquisRotation === dir.deg
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {dir.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PASO 2: SUBIR FOTO DEL CROQUIS O INTERACTUAR CON EL CROQUIS CARGADO */}
              {!croquisSenaleticaBaseImg ? (
                <div className="border-2 border-dashed border-emerald-400 dark:border-emerald-600 rounded-2xl p-6 sm:p-8 text-center bg-emerald-50/40 dark:bg-emerald-950/15 space-y-3">
                  <Camera className="w-10 h-10 mx-auto text-emerald-600 dark:text-emerald-400" />
                  <div className="space-y-1">
                    <h5 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      2. Sube la Foto o Imagen de tu Croquis
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Sube la foto del plano/croquis desde el Carrete de tu iPhone o Galería (o pega con <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border rounded">Ctrl + V</kbd> en PC) para colocarle encima las señaléticas con un toque.
                    </p>
                  </div>
                  <label className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-md cursor-pointer min-h-[46px] touch-manipulation">
                    <ImageIcon className="w-4 h-4 shrink-0" />
                    <span>Elegir Foto del Croquis de mi Galería / Carrete</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const url = await fileToDataUrl(f, false);
                          setCroquisSenaleticaBaseImg(url);
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Barra de controles rápidos del lienzo (Tamaño, Deshacer, Limpiar, Señal seleccionada) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-100 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Tamaño señales:
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCroquisSenaleticaIconScale((s) => Math.max(3.5, Math.round((s - 0.8) * 10) / 10))
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 font-extrabold text-sm flex items-center justify-center touch-manipulation"
                        title="Hacer señales más pequeñas"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-bold w-10 text-center">
                        {Math.round(croquisSenaleticaIconScale * 10) / 10}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCroquisSenaleticaIconScale((s) => Math.min(14, Math.round((s + 0.8) * 10) / 10))
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 font-extrabold text-sm flex items-center justify-center touch-manipulation"
                        title="Hacer señales más grandes"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {selectedCroquisSignId && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCroquisSenaleticaSigns((prev) =>
                                prev.map((s) =>
                                  s.id === selectedCroquisSignId
                                    ? { ...s, rotation: ((s.rotation || 0) + 90) % 360 }
                                    : s
                                )
                              );
                            }}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 touch-manipulation"
                          >
                            <RotateCw className="w-3.5 h-3.5" /> Girar señal 90°
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCroquisSenaleticaSigns((prev) =>
                                prev.filter((s) => s.id !== selectedCroquisSignId)
                              );
                              setSelectedCroquisSignId(null);
                            }}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 touch-manipulation"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Borrar señal
                          </button>
                        </>
                      )}

                      {croquisSenaleticaSigns.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCroquisSenaleticaSigns((prev) => prev.slice(0, -1));
                              setSelectedCroquisSignId(null);
                            }}
                            className="px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold touch-manipulation"
                          >
                            Deshacer última
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCroquisSenaleticaSigns([]);
                              setSelectedCroquisSignId(null);
                            }}
                            className="px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-red-300 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold touch-manipulation"
                          >
                            Limpiar todas
                          </button>
                        </>
                      )}

                      <label className="px-2.5 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                        Cambiar foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const url = await fileToDataUrl(f, false);
                              setCroquisSenaleticaBaseImg(url);
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Indicador de herramienta activa */}
                  <div className="text-center text-xs font-bold text-[#7b1f1c] dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 py-1.5 px-3 rounded-lg border border-amber-200 dark:border-amber-800/70">
                    👆 Toca o haz clic en cualquier punto del croquis para colocar:{' '}
                    <span className="underline uppercase">
                      {EVIDENCIA_SIGNAL_OPTIONS.find((o) => o.value === activeCroquisTool)?.label ||
                        activeCroquisTool}
                    </span>{' '}
                    (o arrastra cualquier señal ya colocada para moverla)
                  </div>

                  {/* Contenedor interactivo del Croquis */}
                  <div className="flex justify-center bg-gray-100 dark:bg-gray-950 p-2 sm:p-4 rounded-2xl border border-gray-300 dark:border-gray-700 overflow-hidden">
                    <div
                      ref={croquisContainerRef}
                      onPointerDown={(e) => {
                        bgTapStartRef.current = { x: e.clientX, y: e.clientY };
                      }}
                      onPointerUp={(e) => {
                        if (!bgTapStartRef.current) return;
                        const dist = Math.hypot(
                          e.clientX - bgTapStartRef.current.x,
                          e.clientY - bgTapStartRef.current.y
                        );
                        bgTapStartRef.current = null;
                        // Si fue un toque/clic limpio (< 10px de movimiento) y no un scroll de pantalla
                        if (dist < 10 && croquisContainerRef.current && activeCroquisTool) {
                          const rect = croquisContainerRef.current.getBoundingClientRect();
                          if (rect.width <= 0 || rect.height <= 0) return;
                          const xPct = Math.max(
                            2,
                            Math.min(98, ((e.clientX - rect.left) / rect.width) * 100)
                          );
                          const yPct = Math.max(
                            2,
                            Math.min(98, ((e.clientY - rect.top) / rect.height) * 100)
                          );
                          const opt = EVIDENCIA_SIGNAL_OPTIONS.find(
                            (o) => o.value === activeCroquisTool
                          );
                          const invMatch = inventorySignalSummary.find(
                            (s) => s.signalType === activeCroquisTool
                          );
                          const newSign: CroquisPlacedSign = {
                            id: `cs-${Date.now()}-${Math.random()}`,
                            signalType: activeCroquisTool,
                            label:
                              invMatch?.label || opt?.label || activeCroquisTool.toUpperCase(),
                            xPct: Math.round(xPct * 10) / 10,
                            yPct: Math.round(yPct * 10) / 10,
                            rotation:
                              activeCroquisTool === 'ruta_evacuacion' ? activeCroquisRotation : 0
                          };

                          const nextList = [...croquisSenaleticaSigns, newSign];
                          setCroquisSenaleticaSigns(nextList);
                          setSelectedCroquisSignId(newSign.id);

                          // Si completó la cantidad declarada de esta señal en su inventario, avanzar automáticamente a la siguiente señal pendiente
                          if (invMatch) {
                            const countNow = nextList.filter(
                              (s) => s.signalType === activeCroquisTool
                            ).length;
                            if (countNow >= invMatch.targetCount) {
                              const nextPending = inventorySignalSummary.find((s) => {
                                const c = nextList.filter(
                                  (item) => item.signalType === s.signalType
                                ).length;
                                return c < s.targetCount;
                              });
                              if (nextPending) {
                                setActiveCroquisTool(nextPending.signalType);
                              }
                            }
                          }
                        }
                      }}
                      className="relative inline-block max-w-full select-none cursor-crosshair shadow-lg rounded-lg overflow-hidden bg-white"
                      style={{ touchAction: 'pan-y' }}
                    >
                      <img
                        src={croquisSenaleticaBaseImg}
                        alt="Croquis base"
                        draggable={false}
                        className="block max-w-full max-h-[68vh] w-auto h-auto object-contain pointer-events-none select-none"
                      />

                      {/* Señaléticas colocadas encima */}
                      {croquisSenaleticaSigns.map((sign) => {
                        const isSelected = selectedCroquisSignId === sign.id;
                        return (
                          <div
                            key={sign.id}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              bgTapStartRef.current = null;
                              try {
                                e.currentTarget.setPointerCapture(e.pointerId);
                              } catch {}
                              setSelectedCroquisSignId(sign.id);
                              croquisDragRef.current = {
                                id: sign.id,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                origXPct: sign.xPct,
                                origYPct: sign.yPct
                              };
                            }}
                            onPointerMove={(e) => {
                              if (
                                !croquisDragRef.current ||
                                croquisDragRef.current.id !== sign.id ||
                                !croquisContainerRef.current
                              ) {
                                return;
                              }
                              e.stopPropagation();
                              const rect = croquisContainerRef.current.getBoundingClientRect();
                              if (rect.width <= 0 || rect.height <= 0) return;
                              const dx = e.clientX - croquisDragRef.current.startClientX;
                              const dy = e.clientY - croquisDragRef.current.startClientY;
                              const newXPct = Math.max(
                                2,
                                Math.min(98, croquisDragRef.current.origXPct + (dx / rect.width) * 100)
                              );
                              const newYPct = Math.max(
                                2,
                                Math.min(98, croquisDragRef.current.origYPct + (dy / rect.height) * 100)
                              );
                              setCroquisSenaleticaSigns((prev) =>
                                prev.map((s) =>
                                  s.id === sign.id
                                    ? {
                                        ...s,
                                        xPct: Math.round(newXPct * 10) / 10,
                                        yPct: Math.round(newYPct * 10) / 10
                                      }
                                    : s
                                )
                              );
                            }}
                            onPointerUp={(e) => {
                              e.stopPropagation();
                              try {
                                e.currentTarget.releasePointerCapture(e.pointerId);
                              } catch {}
                              croquisDragRef.current = null;
                            }}
                            style={{
                              left: `${sign.xPct}%`,
                              top: `${sign.yPct}%`,
                              width: `${croquisSenaleticaIconScale}%`,
                              minWidth: '22px',
                              aspectRatio: '1 / 1',
                              transform: `translate(-50%, -50%) rotate(${sign.rotation || 0}deg)`,
                              touchAction: 'none'
                            }}
                            className={`absolute cursor-grab active:cursor-grabbing bg-white p-0.5 rounded-xs shadow-md transition-shadow ${
                              isSelected
                                ? 'ring-2 ring-blue-500 z-20 scale-110'
                                : 'ring-1 ring-black/30 z-10 hover:scale-105'
                            }`}
                            title={`${sign.label} (Arrastra para mover)`}
                          >
                            {sign.signalType !== 'otro' ? (
                              <img
                                src={`/senales/${sign.signalType}.png`}
                                alt={sign.label}
                                draggable={false}
                                className="w-full h-full object-contain pointer-events-none select-none"
                              />
                            ) : (
                              <div className="w-full h-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center select-none pointer-events-none">
                                PR
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* TAB 6: CALENDARIO ANUAL DE ACTIVIDADES (PÁG. 56) */}
          {activeTab === 'calendario' && (
            <div className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-relaxed text-blue-950 dark:text-blue-200">
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-blue-900 dark:text-blue-200">
                      Calendario de Actividades de Protección Civil (Pág. 56)
                    </h4>
                    <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                      Selecciona qué mes pintar para los <strong>equipos de emergencia / extintores</strong> y la <strong>póliza de seguro</strong>, o haz clic directamente en cualquier casilla de la tabla anual para personalizar los 20 renglones.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetCalendarioToDefault}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-blue-900/60 hover:bg-blue-100 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-bold shrink-0 self-start sm:self-center transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restablecer
                </button>
              </div>

              {/* SELECTOR RÁPIDO 1: PÓLIZA DE SEGURO */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                        Renovación Póliza de Seguro
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Haz clic en el mes en que se contrata o renueva la póliza de la empresa para marcarlo en el calendario:
                    </p>
                  </div>
                  {polizaIdx >= 0 && (
                    <div className="text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 shrink-0 self-start sm:self-center">
                      Mes activo:{' '}
                      {MONTHS_LIST.filter((_, mIdx) => calendarioGrid[polizaIdx]?.[mIdx]).join(', ') || 'Ninguno'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                  {MONTHS_LIST.map((m, mIdx) => {
                    const isSelected = polizaIdx >= 0 && !!calendarioGrid[polizaIdx]?.[mIdx];
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSingleMonthForActivity(polizaIdx, mIdx)}
                        className={`py-2 px-1 rounded-xl text-center font-extrabold text-xs transition-all touch-manipulation border ${
                          isSelected
                            ? 'bg-[#0b2c5e] text-white border-[#0b2c5e] shadow-sm scale-[1.02]'
                            : 'bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="block text-[11px] leading-tight">{m.slice(0, 3)}</span>
                        {isSelected && <span className="block text-[9px] font-normal opacity-90">✓ Marcado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SELECTOR RÁPIDO 2: MANTENIMIENTO Y RECARGA DE EQUIPOS CONTRA INCENDIOS */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                      <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                        Mantenimiento y Recarga del Equipo Contra Incendios (Extintores)
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Haz clic en el mes en que se realiza la recarga anual de extintores para marcar el recuadro correspondiente:
                    </p>
                  </div>
                  {extintoresIdx >= 0 && (
                    <div className="text-xs font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-md border border-red-200 dark:border-red-800 shrink-0 self-start sm:self-center">
                      Mes activo:{' '}
                      {MONTHS_LIST.filter((_, mIdx) => calendarioGrid[extintoresIdx]?.[mIdx]).join(', ') || 'Ninguno'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                  {MONTHS_LIST.map((m, mIdx) => {
                    const isSelected = extintoresIdx >= 0 && !!calendarioGrid[extintoresIdx]?.[mIdx];
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSingleMonthForActivity(extintoresIdx, mIdx)}
                        className={`py-2 px-1 rounded-xl text-center font-extrabold text-xs transition-all touch-manipulation border ${
                          isSelected
                            ? 'bg-[#7b1f1c] text-white border-[#7b1f1c] shadow-sm scale-[1.02]'
                            : 'bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="block text-[11px] leading-tight">{m.slice(0, 3)}</span>
                        {isSelected && <span className="block text-[9px] font-normal opacity-90">✓ Marcado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TABLA COMPLETA DE 20 ACTIVIDADES DE LA PÁGINA 56 */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                      Tabla Completa de Actividades Anuales
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Haz clic en cualquier celda para activar o desactivar el mes de esa tarea:
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="inline-block w-3.5 h-3.5 rounded-sm bg-[#99c2e6] border border-blue-400"></span>
                    <span>= Marcado en azul en el PDF</span>
                  </div>
                </div>

                <div className="border border-gray-300 dark:border-gray-700 rounded-xl overflow-x-auto shadow-inner bg-gray-50 dark:bg-gray-900">
                  <table className="w-full text-xs text-left whitespace-nowrap min-w-[850px]">
                    <thead className="bg-[#0b2c5e] text-white">
                      <tr>
                        <th className="px-3 py-2.5 font-bold border-r border-blue-800/80 w-[280px]">ACTIVIDAD</th>
                        {MONTHS_LIST.map((m) => (
                          <th key={m} className="px-1 py-1.5 border-r border-blue-800/80 text-center font-bold text-[10px] w-8">
                            {m.slice(0, 3)}
                          </th>
                        ))}
                        <th className="px-2 py-2.5 font-bold text-center border-r border-blue-800/80 text-[10px]">RESPONSABLE</th>
                        <th className="px-2 py-2.5 font-bold text-center text-[10px]">EVIDENCIA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      {ACTIVITIES_LIST.slice(0, 20).map((act, rIdx) => {
                        let evidencia = 'REPORTE';
                        if (rIdx === 2) evidencia = 'EVIDENCIA FOTOGRÁFICA';
                        if (rIdx >= 12 && rIdx <= 14) evidencia = 'CONSTANCIAS';
                        return (
                          <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-2.5 py-2 font-medium border-r border-gray-200 dark:border-gray-700 text-[11px] leading-snug whitespace-normal max-w-[280px]">
                              {act}
                            </td>
                            {MONTHS_LIST.map((_, cIdx) => {
                              const isChecked = !!calendarioGrid[rIdx]?.[cIdx];
                              return (
                                <td
                                  key={cIdx}
                                  onClick={() => toggleCalendarioCell(rIdx, cIdx)}
                                  className={`border-r border-gray-200 dark:border-gray-700 text-center cursor-pointer transition-colors p-0 select-none ${
                                    isChecked
                                      ? 'bg-[#99c2e6] hover:bg-[#82b3dc] text-blue-950 font-bold'
                                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/60'
                                  }`}
                                  title={`Clic para alternar ${MONTHS_LIST[cIdx]}`}
                                >
                                  <div className="w-full h-8 flex items-center justify-center text-[11px]">
                                    {isChecked ? '■' : ''}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-1.5 py-1 text-center border-r border-gray-200 dark:border-gray-700 text-[10px] text-gray-500"></td>
                            <td className="px-2 py-1 text-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                              {evidencia}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: RESUMEN DE ESTUDIOS AUTOMÁTICOS INCLUIDOS */}
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

          {/* TAB 8: ARMADOR DE EXPEDIENTE COMPLETO EN ZIP */}
          {activeTab === 'zip' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 text-xs leading-relaxed text-blue-950 dark:text-blue-200 flex items-start gap-2.5">
                <FolderArchive className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-sm text-blue-900 dark:text-blue-100">
                    Expediente Completo en Carpetas (.zip)
                  </h4>
                  <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                    Arma automáticamente todas tus carpetas ordenadas en un solo <strong>.zip</strong>. Todo se procesa directo en tu dispositivo (no se guarda ningún archivo en servidores).
                  </p>
                </div>
              </div>

              {/* Archivos por fuera (raíz del ZIP) */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#7b1f1c] dark:text-amber-400 block">
                  Archivos en la raíz (por fuera de las carpetas) — Automáticos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-amber-200/80 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">
                      P.I.P.C. {anio} {(nombreComercial || 'EMPRESA').toUpperCase()}.pdf
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-amber-200/80 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold truncate">
                      PLAN DE CONTINGENCIAS (con nombre de empresa)
                    </span>
                  </div>
                </div>
              </div>

              {/* Las 6 carpetas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. CONSTANCIAS DE CAPACITACIÓN */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                      📁 CONSTANCIAS DE CAPACITACIÓN
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      Auto + Extras
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAutoConstancias}
                      onChange={(e) => setIncludeAutoConstancias(e.target.checked)}
                      className="rounded text-[#7b1f1c] w-4 h-4 shrink-0"
                    />
                    <span>
                      Generar e incluir constancias automáticas ({employees.length} persona(s))
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Agregar archivos extra</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) setZipConstanciasFiles((p) => [...p, ...files]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  {zipConstanciasFiles.length > 0 && (
                    <div className="space-y-1">
                      {zipConstanciasFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                          <span className="truncate">
                            CONSTANCIA CAPACITACION {(nombreComercial || 'EMPRESA').toUpperCase()}
                            {zipConstanciasFiles.length > 1 ? ` (${i + 1})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setZipConstanciasFiles((p) => p.filter((_, idx) => idx !== i))}
                            className="text-red-500 font-bold ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. DOCUMENTACIÓN LEGAL */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                      📁 DOCUMENTACIÓN LEGAL
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      Auto + Cliente
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    ✓ Incluye automático: Acta Constitutiva y Cédula de Simulacro
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir CSF / Documentos del cliente</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) setZipLegalFiles((p) => [...p, ...files]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  {zipLegalFiles.length > 0 && (
                    <div className="space-y-1">
                      {zipLegalFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                          <span className="truncate">
                            DOCUMENTACION LEGAL {(nombreComercial || 'EMPRESA').toUpperCase()}
                            {zipLegalFiles.length > 1 ? ` (${i + 1})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setZipLegalFiles((p) => p.filter((_, idx) => idx !== i))}
                            className="text-red-500 font-bold ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. MARCO JURIDICO */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                      📁 MARCO JURIDICO
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      Preestablecido
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                    ✓ Incluye automáticamente las 5 NOMs (NOM-002, NOM-005, NOM-017, NOM-026, NOM-029).
                  </p>
                </div>

                {/* 4. REGISTRO 2026 */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                      📁 REGISTRO {anio}
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                      {zipCustomRegistroFiles.length > 0 ? 'Personalizado' : 'Preestablecido'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">
                    {zipCustomRegistroFiles.length > 0
                      ? `Usando ${zipCustomRegistroFiles.length} archivo(s) personalizado(s).`
                      : '✓ Incluye automáticamente tu Registro Municipal 2026.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Cambiar archivo (ej. 2027)</span>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length) setZipCustomRegistroFiles(files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    {zipCustomRegistroFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setZipCustomRegistroFiles([])}
                        className="text-xs text-red-500 font-bold"
                      >
                        Usar base
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. POLIZA DE SEGURO */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                      📁 POLIZA DE SEGURO
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      {zipPolizaFiles.length > 0 ? `${zipPolizaFiles.length} archivo(s)` : 'Opcional'}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Póliza de Seguro</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) setZipPolizaFiles((p) => [...p, ...files]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  {zipPolizaFiles.length > 0 && (
                    <div className="space-y-1">
                      {zipPolizaFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                          <span className="truncate">
                            POLIZA DE SEGURO {(nombreComercial || 'EMPRESA').toUpperCase()}
                            {zipPolizaFiles.length > 1 ? ` (${i + 1})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setZipPolizaFiles((p) => p.filter((_, idx) => idx !== i))}
                            className="text-red-500 font-bold ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 6. RECARGA DE EXTINTORES */}
                <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                      📁 RECARGA DE EXTINTORES
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      {zipExtintoresFiles.length > 0 ? `${zipExtintoresFiles.length} archivo(s)` : 'Opcional'}
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Póliza de Recarga</span>
                    <input
                      type="file"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) setZipExtintoresFiles((p) => [...p, ...files]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                  {zipExtintoresFiles.length > 0 && (
                    <div className="space-y-1">
                      {zipExtintoresFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                          <span className="truncate">
                            RECARGA EXTINTORES {(nombreComercial || 'EMPRESA').toUpperCase()}
                            {zipExtintoresFiles.length > 1 ? ` (${i + 1})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => setZipExtintoresFiles((p) => p.filter((_, idx) => idx !== i))}
                            className="text-red-500 font-bold ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. DICTAMEN ELÉCTRICO (Con palomita para incluir o no en el ZIP) */}
                <div className="sm:col-span-2 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
                      <input
                        type="checkbox"
                        checked={includeDictamenElectrico}
                        onChange={(e) => setIncludeDictamenElectrico(e.target.checked)}
                        className="rounded text-[#7b1f1c] w-4 h-4 shrink-0"
                      />
                      <h5 className="font-extrabold text-xs uppercase text-gray-900 dark:text-gray-100">
                        📁 DICTAMEN ELÉCTRICO
                      </h5>
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        includeDictamenElectrico
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {includeDictamenElectrico ? 'Incluida en ZIP' : 'No incluir'}
                    </span>
                  </div>

                  {includeDictamenElectrico ? (
                    <div className="space-y-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer touch-manipulation">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Dictamen Eléctrico</span>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length) {
                              setZipDictamenFiles((p) => [...p, ...files]);
                              setIncludeDictamenElectrico(true);
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                      {zipDictamenFiles.length > 0 && (
                        <div className="space-y-1">
                          {zipDictamenFiles.map((f, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-[11px] bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded"
                            >
                              <span className="truncate">
                                DICTAMEN ELECTRICO {(nombreComercial || 'EMPRESA').toUpperCase()}
                                {zipDictamenFiles.length > 1 ? ` (${i + 1})` : ''}
                              </span>
                              <button
                                type="button"
                                onClick={() => setZipDictamenFiles((p) => p.filter((_, idx) => idx !== i))}
                                className="text-red-500 font-bold ml-2"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Marca la palomita arriba si este establecimiento cuenta con Dictamen Eléctrico para agregar la carpeta al ZIP.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={generating}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-[#1f3769] to-[#0b2c5e] hover:opacity-95 text-white rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 touch-manipulation"
              >
                <FolderArchive className="w-5 h-5 shrink-0" />
                <span>
                  {generating
                    ? 'Armando Expediente ZIP...'
                    : `Descargar Expediente Completo (.zip)`}
                </span>
              </button>
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
            onClick={handleCloseModal}
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

