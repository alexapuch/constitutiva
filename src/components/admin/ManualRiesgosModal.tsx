import React, { useState, useEffect } from 'react';
import { X, Trash2, Eye, Download, ShieldAlert, Sparkles, Loader2, ClipboardCheck } from 'lucide-react';
import { DocumentInfo } from '../../types';
import { generateRiesgosPDF, RiesgosPDFData } from '../../utils/generateRiesgosPDF';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onPreview: (url: string, name: string) => void;
}

type TabType = 'generales' | 'estructural' | 'instalaciones' | 'no_estructural' | 'otros_internos' | 'externos';

export default function ManualRiesgosModal({ isOpen, onClose, documents, onPreview }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('generales');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleCancelAi = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoadingAi(false);
      Swal.fire({
        icon: 'info',
        title: 'Generación Cancelada',
        text: 'Se canceló la generación de sugerencias por IA.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleCloseModal = () => {
    if (loadingAi) {
      handleCancelAi();
    }
    onClose();
  };

  // --- GENERAL STATE ---
  const [companyName, setCompanyName] = useState('');
  const representativeName = companyName; // Always equal to Razón Social
  const [commercialName, setCommercialName] = useState('');
  const [giro, setGiro] = useState('');
  const [estimationGiro, setEstimationGiro] = useState('comercio');
  const [fecha, setFecha] = useState('');
  const [direccion, setDireccion] = useState('');
  const [municipio, setMunicipio] = useState('PLAYA DEL CARMEN');
  const [niveles, setNiveles] = useState('1');
  const [m2Construccion, setM2Construccion] = useState('');
  const [m2Superficie, setM2Superficie] = useState('');
  const [antiguedad, setAntiguedad] = useState('');
  const [poblacionFija, setPoblacionFija] = useState('');
  const [poblacionFlotante, setPoblacionFlotante] = useState('');
  const [telefono, setTelefono] = useState('');

  // --- CROQUIS ---
  const [croquis, setCroquis] = useState({
    norteGeografico: false,
    riesgosInternos: false,
    zonasAltoRiesgo: false,
    equiposEmergencia: false,
    rutasEvacuacion: false,
    zonaConteo: false,
  });

  // --- ESTRUCTURAL ---
  const [estructural, setEstructural] = useState({
    inclinacion: false,
    separacion: false,
    deformacion: false,
    grietasMuros: false,
    hundimiento: false,
    grietasPiso: false,
    filtracion: false,
    danosEscaleras: false,
  });

  // --- ESCALERAS ---
  const [escalerasServicio, setEscalerasServicio] = useState({
    homogeneas: false,
    barandal: false,
    pasamanos: false,
    cinta: false,
    iluminacion: false,
    estado: 'BUENO',
  });
  const [escalerasEmergencia, setEscalerasEmergencia] = useState({
    homogeneas: false,
    barandal: false,
    pasamanos: false,
    cinta: false,
    iluminacion: false,
    estado: 'BUENO',
  });

  // --- INSTALACIONES ---
  const [hidrosanitaria, setHidrosanitaria] = useState({
    cisterna: false,
    tinaco: false,
    danosTuberia: false,
    danosLlaves: false,
    dictamenTecnico: false,
  });
  const [gas, setGas] = useState({
    tanqueEstacionario: false,
    tanqueMovil: false,
    calentadorAgua: false,
    dictamenTecnico: false,
    capacidad: '',
    fugas: false,
    estado: 'BUENO',
    recomendaciones: '',
  });
  const [gasDictamenVigencia, setGasDictamenVigencia] = useState('');
  const [gasDictamenFecha, setGasDictamenFecha] = useState('');
  const [electrica, setElectrica] = useState({
    subestacion: false,
    tableros: false,
    cableado: false,
    contactos: false,
    interruptores: false,
    lamparas: false,
    lamparasEmergencia: false,
    plantaEmergencia: false,
    transformador: false,
    dictamenTecnico: false,
    recomendaciones: '',
    estado: 'BUENO',
  });
  const [electricaDictamenVigencia, setElectricaDictamenVigencia] = useState('');
  const [electricaDictamenFecha, setElectricaDictamenFecha] = useState('');
  const [especiales, setEspeciales] = useState({
    bombasAgua: false,
    ac: false,
    extractores: false,
    ventiladores: false,
    cercaElectrica: false,
    alarmaGeneral: false,
    presurizadores: false,
    recomendaciones: '',
  });

  // --- ELEMENTOS NO ESTRUCTURALES ---
  const [caer, setCaer] = useState({
    lamparas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    ventiladores: { siNo: false, cantidad: 0, estado: 'BUENO' },
    pantallas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    evaporador: { siNo: false, cantidad: 0, estado: 'BUENO' },
    cristaleria: { siNo: false, cantidad: 0, estado: 'BUENO' },
    canceles: { siNo: false, cantidad: 0, estado: 'BUENO' },
    techos: { siNo: false, cantidad: 0, estado: 'BUENO' },
    plafones: { siNo: false, cantidad: 0, estado: 'BUENO' },
    repisas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    cuadros: { siNo: false, cantidad: 0, estado: 'BUENO' },
    espejos: { siNo: false, cantidad: 0, estado: 'BUENO' },
    liquidosToxicos: { siNo: false, cantidad: 0, estado: 'BUENO' },
    liquidosInflamables: { siNo: false, cantidad: 0, estado: 'BUENO' },
    liquidosCorrosivos: { siNo: false, cantidad: 0, estado: 'BUENO' },
    otros: { siNo: false, cantidad: 0, estado: 'BUENO' },
    recomendaciones: '',
  });

  const [deslizarse, setDeslizarse] = useState({
    escritorios: { siNo: false, cantidad: 0, estado: 'BUENO' },
    mesas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    sillas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    refrigeradores: { siNo: false, cantidad: 0, estado: 'BUENO' },
    ruedas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    recomendaciones: '',
  });

  const [volcar, setVolcar] = useState({
    computo: { siNo: false, cantidad: 0, estado: 'BUENO' },
    libreros: { siNo: false, cantidad: 0, estado: 'BUENO' },
    roperos: { siNo: false, cantidad: 0, estado: 'BUENO' },
    lockers: { siNo: false, cantidad: 0, estado: 'BUENO' },
    archiveros: { siNo: false, cantidad: 0, estado: 'BUENO' },
    estantes: { siNo: false, cantidad: 0, estado: 'BUENO' },
    vitrinas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    tanquesGas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    subdivisiones: { siNo: false, cantidad: 0, estado: 'BUENO' },
    recomendaciones: '',
  });

  const [acabados, setAcabados] = useState({
    lambrinesIncombustibles: false,
    lambrinesCombustibles: false,
    pisosDesniveles: false,
    pisosFalsos: false,
    losetasAzulejos: false,
    cantidadM2: 0,
    estado: 'BUENO',
    recomendaciones: '',
  });

  const [equiposEmergencia, setEquiposEmergencia] = useState({
    alarmas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    detectoresHumo: { siNo: false, cantidad: 0, estado: 'BUENO' },
    extintores: { siNo: false, cantidad: 0, estado: 'BUENO' },
    trajeBombero: { siNo: false, cantidad: 0, estado: 'BUENO' },
    casco: { siNo: false, cantidad: 0, estado: 'BUENO' },
    herramienta: { siNo: false, cantidad: 0, estado: 'BUENO' },
    manta: { siNo: false, cantidad: 0, estado: 'BUENO' },
    rutaEvacuacion: { siNo: false, cantidad: 0, estado: 'BUENO' },
    salidaEmergencia: { siNo: false, cantidad: 0, estado: 'BUENO' },
    puntoReunion: { siNo: false, cantidad: 0, estado: 'BUENO' },
    senalizacion: { siNo: false, cantidad: 0, estado: 'BUENO' },
    brigadas: { siNo: false, cantidad: 0, estado: 'BUENO' },
    comunicacion: { siNo: false, cantidad: 0, estado: 'BUENO' },
    zonasSeguridad: { siNo: false, cantidad: 0, estado: 'BUENO' },
  });

  // --- OTROS INTERNOS ---
  const [otrosRiesgos, setOtrosRiesgos] = useState({
    inflamar: { combustibles: false, solventes: false, papelCarton: false, recomendaciones: '' },
    propiciar: { cigarros: false, colillas: false, velas: false, instalacionGas: false, cafeteras: false, contactos: false, apagadores: false, cablesMalEstado: false, microondas: false, recomendaciones: '' },
    obstaculizar: { tapetes: false, macetas: false, archiveros: false, pizarrones: false, muebles: false, equiposLimpieza: false, herramientas: false, puertasCerradas: false, lavadoras: false, bombeo: false, recomendaciones: '' }
  });

  // --- EXTERNOS ---
  const [riesgosExternos, setRiesgosExternos] = useState({
    entorno: {
      tanquesElevados: { siNo: false, distancia: '' },
      postesMalEstado: { siNo: false, distancia: '' },
      torresAltaTension: { siNo: false, distancia: '' },
      transformadores: { siNo: false, distancia: '' },
      inmueblesDanados: { siNo: false, distancia: '' },
      banquetas: { siNo: false, distancia: '' },
      alcantarillas: { siNo: false, distancia: '' },
      arboles: { siNo: false, distancia: '' },
      callesTransitadas: { siNo: false, distancia: '' },
      fabricasGas: { siNo: false, distancia: '' },
      tanquesGasLp: { siNo: false, distancia: '' },
      gasolineras: { siNo: false, distancia: '' },
      espectaculares: { siNo: false, distancia: '' },
      almacenesPeligrosos: { siNo: false, distancia: '' },
      fabricas: { siNo: false, distancia: '' },
      costas: { siNo: false, distancia: '' },
      tallerSolventes: { siNo: false, distancia: '' },
    },
    socioOrganizativo: {
      accidentes: { vehiculosParticulares: false, vehiculosPeligrosos: false, vehiculosPasajeros: false, aereos: false, otros: false },
      delictivo: { robo: false, roboViolencia: false, invasion: false, interrupcion: false, sabotajeServicios: false, sabotajePrivados: false, otros: false },
      disturbios: { marchas: false, plantones: false, vandalismo: false, otros: false },
      lugaresPublicos: { bares: false, cantinas: false, antros: false, iglesias: false, restaurantesBares: false, salones: false, construcciones: false, hospitales: false, centrosNocturnos: false }
    },
    geologico: { fallas: false, sismos: false, deslizamiento: false, hundimiento: false },
    quimico: { incendios: false, explosiones: false, fugas: false, radiaciones: false },
    hidrometeorologico: {
      inundacion: { rio: false, lago: false, lluvia: false, mar: false },
      otros: { vientosFuertes: false, huracan: false, mareaTormenta: false, tormentaElectrica: false, lluviaTorrencial: false, tromba: false, tornado: false, granizo: false, sequia: false }
    },
    sanitario: {
      epidemia: { siNo: false, vulnerableA: '' },
      plaga: { siNo: false, vulnerableA: '' },
      envenenamiento: { siNo: false, vulnerableA: '' }
    }
  });

  // Set default date
  useEffect(() => {
    if (isOpen && !fecha) {
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
      setFecha(today.toLocaleDateString('es-MX', options).toUpperCase());
    }
  }, [isOpen, fecha]);

  const handleDocChange = (docIdStr: string) => {
    setSelectedDocId(docIdStr);
    if (!docIdStr) {
      handleLimpiar();
      return;
    }
    const doc = documents.find(d => String(d.id) === docIdStr);
    if (doc) {
      setCompanyName(doc.company_name || '');
      setCommercialName(doc.commercial_name || '');
      setGiro(doc.activity || '');
      setEstimationGiro(classifyGiro(doc.activity || ''));
      setFecha(doc.date || '');
      setPoblacionFija(doc.usuarios ? String(doc.usuarios) : '1');
      setPoblacionFlotante(doc.visitantes ? String(doc.visitantes) : '3');
      setNiveles(String(doc.superiores || 1));
      
      const addrStr = doc.address || '';
      const parts = addrStr.split('|');
      setDireccion(parts[0]?.trim() || '');
      setMunicipio(parts[1]?.trim().toUpperCase() || 'PLAYA DEL CARMEN');

      // Fetch employees count
      fetch(`/api/documents/${doc.id}/employees`)
        .then(res => res.json())
        .then(emps => {
          if (Array.isArray(emps)) {
            setPoblacionFija(String(emps.length || 1));
          }
        })
        .catch(err => console.error('Error fetching employees count:', err));
    }
  };

  const handleGetAiSuggestions = async () => {
    if (!commercialName || !giro || !m2Construccion) {
      Swal.fire('Atención', 'Para usar la Inteligencia Artificial, es obligatorio llenar el Nombre Comercial, el Giro y los Metros Cuadrados (M² Construcción).', 'warning');
      return;
    }
    setLoadingAi(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const selectedDoc = documents.find(d => String(d.id) === selectedDocId);
      const res = await fetch('/api/generate-risk-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName || selectedDoc?.company_name,
          commercial_name: commercialName || selectedDoc?.commercial_name,
          address: selectedDoc?.address || `${direccion} | ${municipio}`,
          activity: giro || selectedDoc?.activity,
          m2: m2Construccion,
          usuarios: parseInt(poblacionFija) || undefined,
          visitantes: parseInt(poblacionFlotante) || undefined,
          section: activeTab
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Error al conectar con la IA de sugerencias.');
      }
      const data = await res.json();

      if (activeTab === 'generales') {
        setDireccion(data.direccion || direccion);
        setAntiguedad(data.antiguedad || 'N.D.');
        setPoblacionFija(String(data.poblacionFija ?? poblacionFija));
        setPoblacionFlotante(String(data.poblacionFlotante ?? poblacionFlotante));
        if (data.croquis) setCroquis(data.croquis);
      } else if (activeTab === 'estructural') {
        if (data.estructural) setEstructural(data.estructural);
        if (data.escalerasServicio) setEscalerasServicio(data.escalerasServicio);
        if (data.escalerasEmergencia) setEscalerasEmergencia(data.escalerasEmergencia);
      } else if (activeTab === 'instalaciones') {
        if (data.hidrosanitaria) setHidrosanitaria(data.hidrosanitaria);
        if (data.gas) setGas(data.gas);
        if (data.electrica) setElectrica(data.electrica);
        if (data.especiales) setEspeciales(data.especiales);
      } else if (activeTab === 'no_estructural') {
        if (data.caer) setCaer(data.caer);
        if (data.deslizarse) setDeslizarse(data.deslizarse);
        if (data.volcar) setVolcar(data.volcar);
      } else if (activeTab === 'otros_internos') {
        if (data.acabados) setAcabados(data.acabados);
        if (data.otrosRiesgos) setOtrosRiesgos(data.otrosRiesgos);
      } else if (activeTab === 'externos') {
        if (data.riesgosExternos) setRiesgosExternos(data.riesgosExternos);
      }

      Swal.fire({
        icon: 'success',
        title: '¡Sugerencias aplicadas!',
        text: 'La sección activa se ha llenado con lógica de IA basada en el giro del negocio.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('[IA] Generación cancelada por el usuario.');
      } else {
        console.error(e);
        Swal.fire('Error', e.message || 'No se pudo obtener sugerencia de la IA.', 'error');
      }
    } finally {
      setLoadingAi(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  };

  const classifyGiro = (giroText: string) => {
    const norm = (giroText || '').toLowerCase();

    // Centros Recreativos / Juegos
    if (
      norm.includes('recreativo') || norm.includes('balneario') || norm.includes('parque') ||
      norm.includes('club') || norm.includes('alberca') || norm.includes('piscina') ||
      norm.includes('salon de fiestas') || norm.includes('salon de eventos') ||
      norm.includes('campo deportivo') || norm.includes('recreacion') ||
      norm.includes('juegos infantiles') || norm.includes('diversion') ||
      norm.includes('parque de diversion') || norm.includes('juegos') ||
      norm.includes('trampolines') || norm.includes('ludoteca') || norm.includes('inflables')
    ) {
      return 'centros_recreativos';
    }
    
    // Alimentos / Restaurante
    if (
      norm.includes('restaurante') || norm.includes('fondita') || norm.includes('puesto de comida') || 
      norm.includes('comida rapida') || norm.includes('hamburguesa') || norm.includes('marisco') || 
      norm.includes('grill') || norm.includes('sushi') || norm.includes('bistro') || 
      norm.includes('pizzeria') || norm.includes('taqueria') || norm.includes('tacos') || 
      norm.includes('loncheria') || norm.includes('cenaduria') || norm.includes('snack') || 
      norm.includes('cocina') || norm.includes('alimento') || norm.includes('comida')
    ) {
      return 'restaurante';
    }

    // Cafetería
    if (norm.includes('cafeteria') || norm.includes('creperia') || norm.includes('heladeria') || norm.includes('paleteria')) {
      return 'cafeteria';
    }

    // Panadería
    if (norm.includes('panaderia') || norm.includes('pasteleria')) {
      return 'panaderia';
    }

    // Bar / Antro
    if (/\bbar(es)?\b/i.test(norm) || norm.includes('antro') || norm.includes('cantina')) {
      return 'bar';
    }
    
    // Tortillería
    if (norm.includes('tortilleria') || norm.includes('tortilla') || norm.includes('nixtamal') || norm.includes('despacho de masa')) {
      return 'tortilleria';
    }
    
    // Lavandería y Tintorería (Always grouped together)
    if (
      norm.includes('lavanderia') || norm.includes('tintoreria') || norm.includes('lavado y planchado') || 
      norm.includes('planchaduria') || norm.includes('dry cleaning') || norm.includes('lavamatica') || 
      norm.includes('tintoria')
    ) {
      return 'lavanderia';
    }
    
    // Tienda de Pinturas
    if (norm.includes('pintura') || norm.includes('barniz') || norm.includes('barnices') || norm.includes('distribuidora de pinturas')) {
      return 'tienda_pinturas';
    }
    
    // Taller Mecánico
    if (
      norm.includes('taller') || norm.includes('mecanico') || norm.includes('hojalateria') || 
      norm.includes('automotriz') || norm.includes('suspensiones') || norm.includes('frenos') || 
      norm.includes('vulcanizadora') || norm.includes('llanteria') || norm.includes('servicio automotriz') || 
      norm.includes('enderezado') || norm.includes('alineacion')
    ) {
      return 'taller_mecanico';
    }
    
    // Bodega / Almacén
    if (norm.includes('bodega') || norm.includes('almacen') || norm.includes('almacenamiento') || norm.includes('distribucion') || norm.includes('deposito')) {
      return 'bodega';
    }
    
    // Plaza Comercial
    if (norm.includes('plaza') || norm.includes('centro comercial') || norm.includes('mall') || norm.includes('galerias')) {
      return 'plaza_comercial';
    }

    // Despacho Jurídico / Contable
    if (norm.includes('despacho') || norm.includes('bufete') || norm.includes('abogado') || norm.includes('contable')) {
      return 'despacho';
    }

    // Consultorio Médico
    if (norm.includes('consultorio medico') || norm.includes('clinica') || norm.includes('medico')) {
      return 'consultorio_medico';
    }

    // Consultorio Dental
    if (norm.includes('consultorio dental') || norm.includes('dentista') || norm.includes('dental')) {
      return 'consultorio_dental';
    }

    // Veterinaria
    if (norm.includes('veterinaria') || norm.includes('estetica canina')) {
      return 'veterinaria';
    }
    
    // Oficina
    if (norm.includes('oficina') || norm.includes('corporativo') || norm.includes('administrativo')) {
      return 'oficina';
    }
    
    // Gimnasio
    if (norm.includes('gimnasio') || norm.includes('gym') || norm.includes('crossfit')) {
      return 'gimnasio';
    }

    // Spa
    if (norm.includes('spa') || norm.includes('baños de vapor')) {
      return 'spa';
    }

    // Estética
    if (norm.includes('estetica') || norm.includes('peluqueria') || norm.includes('barberia') || norm.includes('salon de belleza')) {
      return 'estetica';
    }
    
    // Escuela / Educación
    if (
      norm.includes('escuela') || norm.includes('educacion') || norm.includes('guarderia') || 
      norm.includes('colegio') || norm.includes('academia') || norm.includes('universidad') || 
      norm.includes('kinder') || norm.includes('preescolar') || norm.includes('primaria') || 
      norm.includes('secundaria') || norm.includes('preparatoria') || norm.includes('instituto')
    ) {
      return 'escuela';
    }

    // Farmacia
    if (norm.includes('farmacia') || norm.includes('drogueria') || norm.includes('botica')) {
      return 'farmacia';
    }

    // Zapatería
    if (norm.includes('zapateria') || norm.includes('zapato') || norm.includes('calzado')) {
      return 'zapateria';
    }

    // Minisuper / Abarrotes
    if (norm.includes('minisuper') || norm.includes('abarrotes') || norm.includes('tiendita') || norm.includes('super')) {
      return 'minisuper';
    }

    // Hotel
    if (norm.includes('hotel') || norm.includes('motel') || norm.includes('hospedaje')) {
      return 'hotel';
    }
    
    // Venta de Productos en General
    if (
      norm.includes('productos en general') || norm.includes('artículos en general') || 
      norm.includes('articulos en general') || norm.includes('venta de productos') ||
      norm.includes('comercio general') || norm.includes('comercio en general')
    ) {
      return 'venta_productos_general';
    }

    // Comercio General
    if (
      norm.includes('tienda') || norm.includes('boutique') || norm.includes('comercio') || 
      norm.includes('regalos') || norm.includes('ropa') || norm.includes('papeleria') || 
      norm.includes('jugueteria') || norm.includes('ferreteria') || norm.includes('merceria') || 
      norm.includes('boneteria') || norm.includes('joyeria') || norm.includes('optica') || 
      norm.includes('venta')
    ) {
      return 'comercio';
    }
    
    return 'comercio'; // default fallback
  };

  const handlePreFillLocal = () => {
    if (!commercialName || !giro || !m2Construccion) {
      Swal.fire('Atención', 'Para pre-llenar usando reglas locales, es obligatorio ingresar el Nombre Comercial, el Giro y los Metros Cuadrados (M² Construcción).', 'warning');
      return;
    }

    const category = estimationGiro;
    const m2Val = parseFloat(m2Construccion) || 50;
    const fixedPop = parseInt(poblacionFija) || 1;
    const floatPop = parseInt(poblacionFlotante) || 3;
    const numNiveles = parseInt(niveles) || 1;

    const isFood = category === 'restaurante' || category === 'cafeteria' || category === 'bar' || category === 'panaderia' || category === 'tortilleria';
    const isSpecialGas = isFood || category === 'lavanderia' || category === 'spa' || category === 'hotel';
    const isOffice = category === 'oficina' || category === 'despacho' || category === 'consultorio_medico' || category === 'consultorio_dental' || category === 'escuela';
    const isComercio = category === 'comercio' || category === 'tienda_pinturas' || category === 'farmacia' || category === 'zapateria' || category === 'minisuper' || category === 'estetica' || category === 'veterinaria' || category === 'venta_productos_general';
    const isIndustrial = category === 'taller_mecanico' || category === 'bodega';

    if (activeTab === 'generales') {
      setCroquis({
        norteGeografico: true,
        riesgosInternos: true,
        zonasAltoRiesgo: isSpecialGas || category === 'taller_mecanico' || category === 'tienda_pinturas',
        equiposEmergencia: true,
        rutasEvacuacion: true,
        zonaConteo: true,
      });
      Swal.fire({
        icon: 'success',
        title: 'Croquis Pre-llenado',
        text: 'Se han marcado los elementos estándar para el Croquis.',
        timer: 1500,
        showConfirmButton: false
      });
    } else if (activeTab === 'estructural') {
      setEstructural({
        inclinacion: false,
        separacion: false,
        deformacion: false,
        grietasMuros: false,
        hundimiento: false,
        grietasPiso: false,
        filtracion: false,
        danosEscaleras: false,
      });

      const hasStairs = numNiveles > 1;
      const hasEmergStairs = numNiveles >= 3 || (m2Val > 300 && numNiveles > 1) || (category === 'plaza_comercial' && numNiveles > 1) || (category === 'hotel' && numNiveles > 1) || (category === 'centros_recreativos' && numNiveles > 1);

      setEscalerasServicio({
        homogeneas: hasStairs,
        barandal: hasStairs,
        pasamanos: hasStairs,
        cinta: hasStairs,
        iluminacion: hasStairs,
        estado: 'BUENO',
      });
      setEscalerasEmergencia({
        homogeneas: hasEmergStairs,
        barandal: hasEmergStairs,
        pasamanos: hasEmergStairs,
        cinta: hasEmergStairs,
        iluminacion: hasEmergStairs,
        estado: 'BUENO',
      });

      Swal.fire({
        icon: 'success',
        title: 'Estructural Pre-llenado',
        text: `Escaleras configuradas para ${numNiveles} nivel(es) y ${m2Val} m².`,
        timer: 1500,
        showConfirmButton: false
      });
    } else if (activeTab === 'instalaciones') {
      setHidrosanitaria({
        cisterna: m2Val > 80 || category === 'lavanderia' || category === 'plaza_comercial' || category === 'spa' || category === 'hotel' || category === 'gimnasio' || category === 'centros_recreativos',
        tinaco: true,
        danosTuberia: false,
        danosLlaves: false,
        dictamenTecnico: false,
      });

      let gasCapacity = 'N/A';
      if (category === 'tortilleria') gasCapacity = '300 L';
      else if (category === 'lavanderia') gasCapacity = '500 L';
      else if (category === 'spa') gasCapacity = '300 L';
      else if (category === 'hotel') gasCapacity = '1000 L';
      else if (category === 'restaurante') gasCapacity = m2Val >= 100 ? '120 L' : '30 KG';
      else if (category === 'cafeteria') gasCapacity = '30 KG';
      else if (category === 'bar') gasCapacity = '30 KG';
      else if (category === 'panaderia') gasCapacity = '120 L';

      setGas({
        tanqueEstacionario: isSpecialGas && (m2Val >= 100 || category === 'lavanderia' || category === 'tortilleria' || category === 'spa' || category === 'hotel'),
        tanqueMovil: isSpecialGas && m2Val < 100 && category !== 'lavanderia' && category !== 'tortilleria' && category !== 'spa' && category !== 'hotel',
        calentadorAgua: isSpecialGas || category === 'lavanderia' || category === 'spa' || category === 'hotel',
        dictamenTecnico: isSpecialGas,
        capacidad: gasCapacity,
        fugas: false,
        estado: 'BUENO',
        recomendaciones: isSpecialGas 
          ? 'REALIZAR PRUEBAS DE HERMETICIDAD ANUALES Y MANTENER VÁLVULAS LIBRES.'
          : 'NO APLICA AL GIRO COMERCIAL.',
      });

      if (isSpecialGas) {
        setGasDictamenVigencia('ENERO 2026 - ENERO 2027');
        setGasDictamenFecha('15 DE ENERO DE 2026');
      } else {
        setGasDictamenFecha('');
        setGasDictamenVigencia('');
      }

      const isLarge = m2Val >= 250 || category === 'plaza_comercial';
      setElectrica({
        subestacion: isLarge && (category === 'taller_mecanico' || category === 'plaza_comercial' || category === 'lavanderia' || category === 'hotel' || category === 'gimnasio' || category === 'centros_recreativos'),
        tableros: true,
        cableado: true,
        contactos: true,
        interruptores: true,
        lamparas: true,
        lamparasEmergencia: true,
        plantaEmergencia: isLarge,
        transformador: isLarge && (category === 'taller_mecanico' || category === 'plaza_comercial' || category === 'hotel' || category === 'gimnasio' || category === 'centros_recreativos'),
        dictamenTecnico: true,
        recomendaciones: 'MANTENER TABLEROS SEÑALIZADOS, CON DIRECTORIO Y CON TAPA PROTECTORA.',
        estado: 'BUENO',
      });
      setElectricaDictamenFecha('15 DE ENERO DE 2026');
      setElectricaDictamenVigencia('ENERO 2026 - ENERO 2027');

      setEspeciales({
        bombasAgua: m2Val > 80 || category === 'lavanderia' || category === 'plaza_comercial' || category === 'spa' || category === 'hotel' || category === 'gimnasio' || category === 'centros_recreativos',
        ac: category !== 'bodega',
        extractores: isFood || category === 'taller_mecanico' || category === 'lavanderia' || category === 'spa' || category === 'gimnasio' || category === 'centros_recreativos',
        ventiladores: true,
        cercaElectrica: false,
        alarmaGeneral: m2Val > 150 || category === 'plaza_comercial' || category === 'centros_recreativos',
        presurizadores: false,
        recomendaciones: 'SE RECOMIENDA MANTENIMIENTO PREVENTIVO PERIÓDICO A LOS EQUIPOS DE AIRE ACONDICIONADO.',
      });

      Swal.fire({
        icon: 'success',
        title: 'Instalaciones Pre-llenadas',
        text: 'Configuraciones de Gas, Luz e Hidráulica ajustadas al giro.',
        timer: 1500,
        showConfirmButton: false
      });
    } else if (activeTab === 'no_estructural') {
      const cantLamps = Math.max(1, Math.round((m2Val / 8) * numNiveles));
      const cantFans = Math.max(0, Math.round((m2Val / 15) * numNiveles));
      const cantScreens = category === 'plaza_comercial' ? 12 : Math.max(0, Math.round(m2Val / 40));
      const cantAC = Math.max(1, Math.round((m2Val / 35) * numNiveles));

      const hasEvaporador = category === 'oficina' || category === 'despacho' || category === 'consultorio_medico' || category === 'consultorio_dental' || category === 'plaza_comercial' || category === 'hotel' || category === 'spa' || category === 'restaurante' || category === 'cafeteria' || category === 'veterinaria' || category === 'centros_recreativos';
      const hasCristaleria = isFood || category === 'farmacia' || category === 'estetica';
      const hasCanceles = isComercio || isFood || category === 'plaza_comercial';
      const hasPlafones = isOffice || category === 'plaza_comercial';
      const hasRepisas = isOffice || isComercio || category === 'tienda_pinturas' || category === 'farmacia';
      const hasCuadros = isOffice;
      const hasEspejos = category === 'gimnasio' || category === 'estetica' || category === 'spa' || category === 'centros_recreativos';
      const hasToxicos = category === 'tienda_pinturas' || category === 'taller_mecanico' || category === 'lavanderia' || category === 'estetica' || category === 'centros_recreativos';
      const hasInflamables = category === 'tienda_pinturas' || category === 'taller_mecanico' || isFood || category === 'spa' || category === 'centros_recreativos';

      setCaer({
        lamparas: { siNo: true, cantidad: cantLamps, estado: 'BUENO' },
        ventiladores: { siNo: cantFans > 0, cantidad: cantFans, estado: 'BUENO' },
        pantallas: { siNo: cantScreens > 0, cantidad: cantScreens, estado: 'BUENO' },
        evaporador: { siNo: hasEvaporador, cantidad: hasEvaporador ? cantAC : 0, estado: 'BUENO' },
        cristaleria: { siNo: hasCristaleria, cantidad: hasCristaleria ? (isFood ? 30 : 15) : 0, estado: 'BUENO' },
        canceles: { siNo: hasCanceles, cantidad: hasCanceles ? (category === 'plaza_comercial' ? 15 : 2) : 0, estado: 'BUENO' },
        techos: { siNo: false, cantidad: 0, estado: 'BUENO' },
        plafones: { siNo: hasPlafones, cantidad: hasPlafones ? Math.round(m2Val / 5) : 0, estado: 'BUENO' },
        repisas: { siNo: hasRepisas, cantidad: hasRepisas ? (category === 'tienda_pinturas' ? 12 : 4) : 0, estado: 'BUENO' },
        cuadros: { siNo: hasCuadros, cantidad: hasCuadros ? 3 : 0, estado: 'BUENO' },
        espejos: { siNo: hasEspejos, cantidad: hasEspejos ? (category === 'estetica' ? 6 : (category === 'gimnasio' ? 4 : 2)) : 0, estado: 'BUENO' },
        liquidosToxicos: { siNo: hasToxicos, cantidad: hasToxicos ? (category === 'tienda_pinturas' ? 50 : 4) : 0, estado: 'BUENO' },
        liquidosCorrosivos: { siNo: false, cantidad: 0, estado: 'BUENO' },
        liquidosInflamables: { siNo: hasInflamables, cantidad: hasInflamables ? (category === 'tienda_pinturas' ? 200 : (category === 'taller_mecanico' ? 50 : 2)) : 0, estado: 'BUENO' },
        otros: { siNo: false, cantidad: 0, estado: 'BUENO' },
        recomendaciones: 'ASEGURAR LA CRISTALERÍA Y ELEMENTOS COLGANTES PARA EVITAR CAÍDAS EN CASO DE SISMO.',
      });

      setDeslizarse({
        escritorios: { siNo: isOffice, cantidad: isOffice ? fixedPop : 0, estado: 'BUENO' },
        mesas: { siNo: isOffice || isFood || category === 'escuela', cantidad: (isOffice || isFood || category === 'escuela') ? (isFood ? Math.round(m2Val / 5) : Math.round(m2Val / 12)) : 0, estado: 'BUENO' },
        sillas: { siNo: true, cantidad: isFood ? floatPop + fixedPop : (isOffice ? fixedPop * 2 : 4), estado: 'BUENO' },
        refrigeradores: { siNo: isFood || category === 'farmacia', cantidad: isFood ? 2 : (category === 'farmacia' ? 1 : 0), estado: 'BUENO' },
        ruedas: { siNo: false, cantidad: 0, estado: 'BUENO' },
        recomendaciones: 'MANTENER LAS SILLAS Y MESAS ACOMODADAS SIN OBSTRUIR PASILLOS.',
      });

      setVolcar({
        computo: { siNo: isOffice || category === 'plaza_comercial' || category === 'escuela', cantidad: (isOffice || category === 'plaza_comercial' || category === 'escuela') ? fixedPop : 0, estado: 'BUENO' },
        libreros: { siNo: isOffice || category === 'escuela', cantidad: (isOffice || category === 'escuela') ? 3 : 0, estado: 'BUENO' },
        roperos: { siNo: false, cantidad: 0, estado: 'BUENO' },
        lockers: { siNo: category === 'gimnasio' || category === 'escuela' || category === 'taller_mecanico' || category === 'centros_recreativos', cantidad: (category === 'gimnasio' || category === 'escuela' || category === 'taller_mecanico' || category === 'centros_recreativos') ? 2 : 0, estado: 'BUENO' },
        archiveros: { siNo: isOffice, cantidad: isOffice ? Math.max(1, Math.round(fixedPop / 2)) : 0, estado: 'BUENO' },
        estantes: { siNo: isComercio || isFood || category === 'bodega' || category === 'farmacia' || category === 'centros_recreativos', cantidad: (isComercio || isFood || category === 'bodega' || category === 'farmacia' || category === 'centros_recreativos') ? (category === 'tienda_pinturas' ? 15 : (category === 'bodega' ? 20 : 8)) : 0, estado: 'BUENO' },
        vitrinas: { siNo: isComercio || category === 'farmacia', cantidad: (isComercio || category === 'farmacia') ? 3 : 0, estado: 'BUENO' },
        tanquesGas: { siNo: isFood, cantidad: isFood ? 2 : 0, estado: 'BUENO' },
        subdivisiones: { siNo: isOffice, cantidad: isOffice ? 4 : 0, estado: 'BUENO' },
        recomendaciones: 'FIJAR LOS ESTANTES Y VITRINAS A LOS MUROS PARA EVITAR SU VOLCADURA.',
      });

      Swal.fire({
        icon: 'success',
        title: 'Inventario Pre-llenado',
        text: `Inventario calculado para ${m2Val} m² en ${numNiveles} nivel(es).`,
        timer: 1500,
        showConfirmButton: false
      });
    } else if (activeTab === 'otros_internos') {
      setAcabados({
        lambrinesIncombustibles: false,
        lambrinesCombustibles: false,
        pisosDesniveles: false,
        pisosFalsos: isOffice || category === 'plaza_comercial',
        losetasAzulejos: true,
        cantidadM2: Math.round(m2Val),
        estado: 'BUENO',
        recomendaciones: 'MANTENER LOS ACABADOS LIMPIOS Y EN BUEN ESTADO FÍSICO.',
      });

      setOtrosRiesgos({
        inflamar: {
          combustibles: category === 'taller_mecanico' || category === 'tienda_pinturas' || isFood || category === 'centros_recreativos',
          solventes: category === 'taller_mecanico' || category === 'tienda_pinturas' || category === 'centros_recreativos',
          papelCarton: isOffice || isComercio || category === 'bodega',
          recomendaciones: 'MANTENER EL CARTÓN Y PAPEL EN CONTENEDORES CERRADOS.'
        },
        propiciar: {
          cigarros: false,
          colillas: false,
          velas: false,
          instalacionGas: isSpecialGas,
          cafeteras: isOffice || category === 'gimnasio' || isFood,
          contactos: true,
          apagadores: true,
          cablesMalEstado: false,
          microondas: isOffice || isFood || category === 'plaza_comercial',
          recomendaciones: 'DESCONECTAR APARATOS ELÉCTRICOS AL CIERRE DE LA JORNADA.'
        },
        obstaculizar: {
          tapetes: false,
          macetas: false,
          archiveros: false,
          pizarrones: false,
          muebles: false,
          equiposLimpieza: false,
          herramientas: false,
          puertasCerradas: false,
          lavadoras: false,
          bombeo: false,
          recomendaciones: 'MANTENER LIBRES LAS RUTAS DE EVACUACIÓN Y SALIDAS DE EMERGENCIA.'
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Otros Internos Pre-llenados',
        text: 'Acabados y otros riesgos configurados de forma segura.',
        timer: 1500,
        showConfirmButton: false
      });
    } else if (activeTab === 'externos') {
      setRiesgosExternos({
        entorno: {
          tanquesElevados: { siNo: false, distancia: '' },
          postesMalEstado: { siNo: false, distancia: '' },
          torresAltaTension: { siNo: false, distancia: '' },
          transformadores: { siNo: true, distancia: '15 MTS' },
          inmueblesDanados: { siNo: false, distancia: '' },
          banquetas: { siNo: true, distancia: '1 MTS' },
          alcantarillas: { siNo: true, distancia: '5 MTS' },
          arboles: { siNo: true, distancia: '3 MTS' },
          callesTransitadas: { siNo: true, distancia: '5 MTS' },
          fabricasGas: { siNo: false, distancia: '' },
          tanquesGasLp: { siNo: isSpecialGas, distancia: isSpecialGas ? '15 MTS' : '' },
          gasolineras: { siNo: false, distancia: '' },
          espectaculares: { siNo: false, distancia: '' },
          almacenesPeligrosos: { siNo: false, distancia: '' },
          fabricas: { siNo: false, distancia: '' },
          costas: { siNo: false, distancia: '' },
          tallerSolventes: { siNo: category === 'tienda_pinturas' || category === 'taller_mecanico', distancia: (category === 'tienda_pinturas' || category === 'taller_mecanico') ? '10 MTS' : '' },
        },
        socioOrganizativo: {
          accidentes: { vehiculosParticulares: true, vehiculosPeligrosos: false, vehiculosPasajeros: true, aereos: false, otros: false },
          delictivo: { robo: true, roboViolencia: false, invasion: false, interrupcion: false, sabotajeServicios: false, sabotajePrivados: false, otros: false },
          disturbios: { marchas: false, plantones: false, vandalismo: false, otros: false },
          lugaresPublicos: { bares: false, cantinas: false, antros: false, iglesias: false, restaurantesBares: false, salones: false, construcciones: false, hospitales: false, centrosNocturnos: false }
        },
        geologico: { fallas: false, sismos: false, deslizamiento: false, hundimiento: false },
        quimico: { incendios: false, explosiones: false, fugas: false, radiaciones: false },
        hidrometeorologico: {
          inundacion: { rio: false, lago: false, lluvia: true, mar: false },
          otros: { vientosFuertes: true, huracan: true, mareaTormenta: false, tormentaElectrica: true, lluviaTorrencial: true, tromba: false, tornado: false, granizo: false, sequia: false }
        },
        sanitario: {
          epidemia: { siNo: false, vulnerableA: '' },
          plaga: { siNo: true, vulnerableA: 'INSECTOS Y ROEDORES' },
          envenenamiento: { siNo: false, vulnerableA: '' }
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Riesgos Externos Pre-llenados',
        text: 'Se configuraron los riesgos externos y fenómenos naturales urbanos usuales.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleLimpiar = () => {
    setSelectedDocId('');
    setCompanyName('');
    setCommercialName('');
    setGiro('');
    setDireccion('');
    setNiveles('1');
    setM2Construccion('50');
    setM2Superficie('50');
    setAntiguedad('N.D.');
    setPoblacionFija('1');
    setPoblacionFlotante('3');
    setTelefono('');
  };

  const getPDFData = (): RiesgosPDFData => ({
    companyName: companyName.trim().toUpperCase(),
    representativeName: representativeName.trim().toUpperCase(),
    commercialName: commercialName.trim().toUpperCase(),
    giro: giro.trim().toUpperCase(),
    fecha: fecha.trim().toUpperCase(),
    direccion,
    municipio,
    niveles,
    m2Construccion,
    m2Superficie,
    antiguedad,
    poblacionFija,
    poblacionFlotante,
    gasDictamenVigencia: gasDictamenVigencia.trim().toUpperCase(),
    gasDictamenFecha: gasDictamenFecha.trim().toUpperCase(),
    electricaDictamenVigencia: electricaDictamenVigencia.trim().toUpperCase(),
    electricaDictamenFecha: electricaDictamenFecha.trim().toUpperCase(),
    croquis,
    estructural,
    escalerasServicio,
    escalerasEmergencia,
    instalaciones: {
      hidrosanitaria,
      gas,
      electrica,
      especiales,
    },
    caer,
    deslizarse,
    volcar,
    acabados,
    equiposEmergencia,
    otrosRiesgos,
    riesgosExternos,
  });

  const handlePreview = async () => {
    if (!commercialName.trim()) return;
    const url = await generateRiesgosPDF(getPDFData(), true);
    if (url) onPreview(url as string, `ANALISIS RIESGOS - ${commercialName.toUpperCase()}`);
  };

  const handleDescargar = async () => {
    if (!commercialName.trim()) return;
    await generateRiesgosPDF(getPDFData(), false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center md:p-4 z-50 animate-fadeIn"
      onClick={handleCloseModal}
    >
      <div 
        className="bg-white dark:bg-gray-800 shadow-2xl w-full h-full md:h-auto md:max-h-[95vh] md:max-w-5xl md:rounded-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-blue-900 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h3 className="font-black flex items-center gap-2 text-lg uppercase tracking-wider">
            <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
            Identificación e Inspección de Riesgos
          </h3>
          <button
            type="button"
            onClick={handleCloseModal}
            className="flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors rounded-full w-10 h-10 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-gray-150 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700 overflow-x-auto shrink-0 select-none">
          {([
            { id: 'generales', label: '1. Gral & Croquis' },
            { id: 'estructural', label: '2. Estructural' },
            { id: 'instalaciones', label: '3. Instalaciones' },
            { id: 'no_estructural', label: '4. Objetos Caer/Volcar' },
            { id: 'otros_internos', label: '5. Otros Internos' },
            { id: 'externos', label: '6. R. Externos' }
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-blue-900 text-blue-900 dark:text-blue-400 bg-white dark:bg-gray-850 font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Form Body */}
        <div 
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900" 
          style={{ 
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            transform: 'translateZ(0)',
            willChange: 'scroll-position'
          }}
        >
          
          {/* Top selection bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row flex-wrap gap-4 items-end">
            <div className="flex-[2] min-w-[240px] w-full">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Cargar Datos de Empresa Existente
              </label>
              <select
                value={selectedDocId}
                onChange={e => handleDocChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-600 outline-none font-bold"
              >
                <option value="">-- Manual (Sin cargar acta) --</option>
                {documents.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.commercial_name}</option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-52">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Giro Estimación (Manual/Auto)
              </label>
              <select
                value={estimationGiro}
                onChange={e => setEstimationGiro(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-600 outline-none font-bold text-xs uppercase"
              >
                <option value="comercio">Comercio General</option>
                <option value="venta_productos_general">Venta de Productos en General</option>
                <option value="centros_recreativos">Centros Recreativos (Juegos Infantiles, de Diversión, Club)</option>
                <option value="oficina">Oficina Administrativa / Corporativo</option>
                <option value="despacho">Despacho Jurídico / Contable</option>
                <option value="consultorio_medico">Consultorio Médico / Clínica</option>
                <option value="consultorio_dental">Consultorio Dental</option>
                <option value="restaurante">Restaurante</option>
                <option value="cafeteria">Cafetería / Pastelería</option>
                <option value="bar">Bar / Cantina / Antro</option>
                <option value="lavanderia">Lavandería y Tintorería</option>
                <option value="tienda_pinturas">Tienda de Pinturas</option>
                <option value="taller_mecanico">Taller Mecánico / Hojalatería</option>
                <option value="bodega">Bodega / Almacén</option>
                <option value="plaza_comercial">Plaza Comercial</option>
                <option value="tortilleria">Tortillería</option>
                <option value="escuela">Escuela / Colegio / Instituto</option>
                <option value="gimnasio">Gimnasio / CrossFit</option>
                <option value="spa">Spa / Baños de Vapor</option>
                <option value="estetica">Estética / Peluquería / Barbería</option>
                <option value="farmacia">Farmacia / Botica</option>
                <option value="zapateria">Zapatería</option>
                <option value="panaderia">Panadería</option>
                <option value="minisuper">Minisuper / Abarrotes</option>
                <option value="veterinaria">Veterinaria / Estética Canina</option>
                <option value="hotel">Hotel / Hospedaje</option>
              </select>
            </div>
            
            {loadingAi ? (
              <button
                type="button"
                onClick={handleCancelAi}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 h-[42px]"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelar IA...</span>
              </button>
            ) : (
              <div className="flex gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handlePreFillLocal}
                  className="flex-1 md:flex-none bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 h-[42px]"
                >
                  <ClipboardCheck className="w-4 h-4 text-white" />
                  <span>Pre-llenar (Giro y M²)</span>
                </button>
                <button
                  type="button"
                  onClick={handleGetAiSuggestions}
                  className="flex-1 md:flex-none bg-blue-900 hover:bg-blue-800 text-white font-extrabold px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 h-[42px]"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span>Sugerir con IA</span>
                </button>
              </div>
            )}
          </div>

          {activeTab === 'generales' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Datos Generales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razón Social</label>
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full border rounded p-2 text-sm uppercase bg-white dark:bg-gray-750 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Comercial *</label>
                    <input type="text" value={commercialName} onChange={e => setCommercialName(e.target.value)} className="w-full border rounded p-2 text-sm uppercase bg-white dark:bg-gray-750 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Propietario / Responsable (Igual a Razón Social)</label>
                    <input type="text" value={companyName} disabled className="w-full border rounded p-2 text-sm uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Actividad o Giro</label>
                    <input type="text" value={giro} onChange={e => { setGiro(e.target.value); setEstimationGiro(classifyGiro(e.target.value)); }} className="w-full border rounded p-2 text-sm uppercase bg-white dark:bg-gray-750 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección (Calle y Número)</label>
                    <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className="w-full border rounded p-2 text-sm uppercase bg-white dark:bg-gray-750 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Municipio / Localidad</label>
                    <select value={municipio} onChange={e => setMunicipio(e.target.value)} className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750 dark:text-white">
                      <option value="PLAYA DEL CARMEN">PLAYA DEL CARMEN</option>
                      <option value="TULUM">TULUM</option>
                      <option value="CANCÚN">CANCÚN</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Niveles / Pisos</label>
                    <input type="number" min="1" value={niveles} onChange={e => setNiveles(e.target.value)} className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">M² Construcción</label>
                    <input type="number" value={m2Construccion} onChange={e => setM2Construccion(e.target.value)} className="w-full border rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Población Fija</label>
                    <input type="number" value={poblacionFija} onChange={e => setPoblacionFija(e.target.value)} className="w-full border rounded p-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Población Flotante</label>
                    <input type="number" value={poblacionFlotante} onChange={e => setPoblacionFlotante(e.target.value)} className="w-full border rounded p-2 text-sm" />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Antigüedad (Años)</label>
                    <div className="flex items-center gap-1">
                      <input type="text" value={antiguedad} onChange={e => setAntiguedad(e.target.value)} disabled={antiguedad === 'N.D.'} placeholder="Ej. 10" className={`min-w-0 flex-1 border rounded p-2 text-sm bg-white dark:bg-gray-750 dark:text-white ${antiguedad === 'N.D.' ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : ''}`} />
                      <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500 select-none whitespace-nowrap cursor-pointer shrink-0">
                        <input type="checkbox" checked={antiguedad === 'N.D.'} onChange={e => setAntiguedad(e.target.checked ? 'N.D.' : '')} className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500" />
                        N/D
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Croquis de Localización (Señalamientos en Plano)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.keys(croquis).map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={croquis[key as keyof typeof croquis]}
                        onChange={e => setCroquis({ ...croquis, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'estructural' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">2.1 Riesgos por Daños Estructurales</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(estructural).map(key => (
                    <label key={key} className="flex items-center justify-between border-b pb-2 text-sm select-none">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <input
                        type="checkbox"
                        checked={estructural[key as keyof typeof estructural]}
                        onChange={e => setEstructural({ ...estructural, [key]: e.target.checked })}
                        className="w-5 h-5 rounded text-red-600 focus:ring-red-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Escaleras */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">2.2 & 2.3 Escaleras de Servicio y Emergencia</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Servicio */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-700 border-b">Escaleras de Servicio</h5>
                    {['homogeneas', 'barandal', 'pasamanos', 'cinta', 'iluminacion'].map(key => (
                      <label key={key} className="flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={escalerasServicio[key as keyof typeof escalerasServicio] as boolean}
                          onChange={e => setEscalerasServicio({ ...escalerasServicio, [key]: e.target.checked })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                    <div>
                      <label className="text-xs font-bold text-gray-500">Estado Físico</label>
                      <select value={escalerasServicio.estado} onChange={e => setEscalerasServicio({ ...escalerasServicio, estado: e.target.value })} className="w-full border rounded p-1 text-xs">
                        <option value="BUENO">BUENO</option>
                        <option value="REGULAR">REGULAR</option>
                        <option value="MALO">MALO</option>
                      </select>
                    </div>
                  </div>

                  {/* Emergencia */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-700 border-b">Escaleras de Emergencia</h5>
                    {['homogeneas', 'barandal', 'pasamanos', 'cinta', 'iluminacion'].map(key => (
                      <label key={key} className="flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={escalerasEmergencia[key as keyof typeof escalerasEmergencia] as boolean}
                          onChange={e => setEscalerasEmergencia({ ...escalerasEmergencia, [key]: e.target.checked })}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    ))}
                    <div>
                      <label className="text-xs font-bold text-gray-500">Estado Físico</label>
                      <select value={escalerasEmergencia.estado} onChange={e => setEscalerasEmergencia({ ...escalerasEmergencia, estado: e.target.value })} className="w-full border rounded p-1 text-xs">
                        <option value="BUENO">BUENO</option>
                        <option value="REGULAR">REGULAR</option>
                        <option value="MALO">MALO</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'instalaciones' && (
            <div className="space-y-6">
              {/* Hidrosanitaria */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Instalación Hidrosanitaria</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.keys(hidrosanitaria).map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={hidrosanitaria[key as keyof typeof hidrosanitaria]}
                        onChange={e => setHidrosanitaria({ ...hidrosanitaria, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Gas */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Instalación de Gas</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={gas.tanqueEstacionario} onChange={e => setGas({ ...gas, tanqueEstacionario: e.target.checked })} className="w-4 h-4" />
                    <span>Tanque Estacionario</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={gas.tanqueMovil} onChange={e => setGas({ ...gas, tanqueMovil: e.target.checked })} className="w-4 h-4" />
                    <span>Tanque Móvil</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={gas.calentadorAgua} onChange={e => setGas({ ...gas, calentadorAgua: e.target.checked })} className="w-4 h-4" />
                    <span>Calentador de Agua</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={gas.dictamenTecnico} onChange={e => setGas({ ...gas, dictamenTecnico: e.target.checked })} className="w-4 h-4" />
                    <span>Dictamen Técnico</span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Capacidad estimada (L / kg)</label>
                    <input type="text" value={gas.capacidad} onChange={e => setGas({ ...gas, capacidad: e.target.value })} className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Recomendaciones Gas</label>
                    <input type="text" value={gas.recomendaciones} onChange={e => setGas({ ...gas, recomendaciones: e.target.value })} className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                  </div>
                </div>
                {gas.dictamenTecnico && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">📋 Vigencia del Dictamen de Gas</label>
                      <input type="text" value={gasDictamenVigencia} onChange={e => setGasDictamenVigencia(e.target.value.toUpperCase())} placeholder="Ej. JUNIO 2026 - JUNIO 2027" className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">📅 Fecha de Elaboración</label>
                      <input type="text" value={gasDictamenFecha} onChange={e => setGasDictamenFecha(e.target.value.toUpperCase())} placeholder="Ej. 15 DE JUNIO DE 2026" className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                    </div>
                  </div>
                )}
              </div>

              {/* Eléctrica */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Instalación Eléctrica</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['subestacion', 'tableros', 'cableado', 'contactos', 'interruptores', 'lamparas', 'lamparasEmergencia', 'plantaEmergencia', 'transformador', 'dictamenTecnico'].map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={electrica[key as keyof typeof electrica] as boolean}
                        onChange={e => setElectrica({ ...electrica, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 border-t pt-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Recomendaciones Eléctricas</label>
                    <input type="text" value={electrica.recomendaciones} onChange={e => setElectrica({ ...electrica, recomendaciones: e.target.value })} className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                  </div>
                </div>
                {electrica.dictamenTecnico && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">📋 Vigencia del Dictamen Eléctrico</label>
                      <input type="text" value={electricaDictamenVigencia} onChange={e => setElectricaDictamenVigencia(e.target.value.toUpperCase())} placeholder="Ej. JUNIO 2026 - JUNIO 2027" className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">📅 Fecha de Elaboración</label>
                      <input type="text" value={electricaDictamenFecha} onChange={e => setElectricaDictamenFecha(e.target.value.toUpperCase())} placeholder="Ej. 15 DE JUNIO DE 2026" className="w-full border rounded p-2 text-sm bg-white dark:bg-gray-750" />
                    </div>
                  </div>
                )}
              </div>

              {/* Especiales */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Instalaciones Especiales</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['bombasAgua', 'ac', 'extractores', 'ventiladores', 'cercaElectrica', 'alarmaGeneral', 'presurizadores'].map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={especiales[key as keyof typeof especiales] as boolean}
                        onChange={e => setEspeciales({ ...especiales, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'no_estructural' && (
            <div className="space-y-6">
              {/* Caer */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Objetos que Pueden Caer</h4>
                <div className="space-y-2">
                  {['lamparas', 'ventiladores', 'pantallas', 'evaporador', 'cristaleria', 'canceles', 'techos', 'plafones', 'repisas', 'cuadros', 'espejos', 'liquidosToxicos', 'liquidosInflamables', 'liquidosCorrosivos'].map(key => {
                    const item = caer[key as keyof typeof caer] as { siNo: boolean; cantidad: number; estado: string };
                    if (!item) return null;
                    return (
                      <div key={key} className="flex flex-col md:flex-row items-baseline justify-between border-b pb-2 text-xs md:text-sm">
                        <label className="flex items-center gap-2 font-semibold capitalize select-none w-48">
                          <input
                            type="checkbox"
                            checked={item.siNo}
                            onChange={e => setCaer({ ...caer, [key]: { ...item, siNo: e.target.checked } })}
                            className="w-4 h-4"
                          />
                          <span>{key}</span>
                        </label>
                        <div className="flex gap-4 mt-2 md:mt-0">
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Cant:</span>
                            <input
                              type="number"
                              value={item.cantidad}
                              disabled={!item.siNo}
                              onChange={e => setCaer({ ...caer, [key]: { ...item, cantidad: parseInt(e.target.value) || 0 } })}
                              className="w-12 border rounded px-1.5 text-center"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Estado:</span>
                            <select
                              value={item.estado}
                              disabled={!item.siNo}
                              onChange={e => setCaer({ ...caer, [key]: { ...item, estado: e.target.value } })}
                              className="border rounded p-0.5 text-xs"
                            >
                              <option value="BUENO">BUENO</option>
                              <option value="REGULAR">REGULAR</option>
                              <option value="MALO">MALO</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deslizarse */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Objetos que Pueden Deslizarse</h4>
                <div className="space-y-2">
                  {['escritorios', 'mesas', 'sillas', 'refrigeradores', 'ruedas'].map(key => {
                    const item = deslizarse[key as keyof typeof deslizarse] as { siNo: boolean; cantidad: number; estado: string };
                    if (!item) return null;
                    return (
                      <div key={key} className="flex flex-col md:flex-row items-baseline justify-between border-b pb-2 text-xs md:text-sm">
                        <label className="flex items-center gap-2 font-semibold capitalize select-none w-48">
                          <input
                            type="checkbox"
                            checked={item.siNo}
                            onChange={e => setDeslizarse({ ...deslizarse, [key]: { ...item, siNo: e.target.checked } })}
                            className="w-4 h-4"
                          />
                          <span>{key}</span>
                        </label>
                        <div className="flex gap-4 mt-2 md:mt-0">
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Cant:</span>
                            <input
                              type="number"
                              value={item.cantidad}
                              disabled={!item.siNo}
                              onChange={e => setDeslizarse({ ...deslizarse, [key]: { ...item, cantidad: parseInt(e.target.value) || 0 } })}
                              className="w-12 border rounded px-1.5 text-center"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Estado:</span>
                            <select
                              value={item.estado}
                              disabled={!item.siNo}
                              onChange={e => setDeslizarse({ ...deslizarse, [key]: { ...item, estado: e.target.value } })}
                              className="border rounded p-0.5 text-xs"
                            >
                              <option value="BUENO">BUENO</option>
                              <option value="REGULAR">REGULAR</option>
                              <option value="MALO">MALO</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Volcar */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Objetos que Pueden Volcar</h4>
                <div className="space-y-2">
                  {['computo', 'libreros', 'roperos', 'lockers', 'archiveros', 'estantes', 'vitrinas', 'tanquesGas', 'subdivisiones'].map(key => {
                    const item = volcar[key as keyof typeof volcar] as { siNo: boolean; cantidad: number; estado: string };
                    if (!item) return null;
                    return (
                      <div key={key} className="flex flex-col md:flex-row items-baseline justify-between border-b pb-2 text-xs md:text-sm">
                        <label className="flex items-center gap-2 font-semibold capitalize select-none w-48">
                          <input
                            type="checkbox"
                            checked={item.siNo}
                            onChange={e => setVolcar({ ...volcar, [key]: { ...item, siNo: e.target.checked } })}
                            className="w-4 h-4"
                          />
                          <span>{key}</span>
                        </label>
                        <div className="flex gap-4 mt-2 md:mt-0">
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Cant:</span>
                            <input
                              type="number"
                              value={item.cantidad}
                              disabled={!item.siNo}
                              onChange={e => setVolcar({ ...volcar, [key]: { ...item, cantidad: parseInt(e.target.value) || 0 } })}
                              className="w-12 border rounded px-1.5 text-center"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Estado:</span>
                            <select
                              value={item.estado}
                              disabled={!item.siNo}
                              onChange={e => setVolcar({ ...volcar, [key]: { ...item, estado: e.target.value } })}
                              className="border rounded p-0.5 text-xs"
                            >
                              <option value="BUENO">BUENO</option>
                              <option value="REGULAR">REGULAR</option>
                              <option value="MALO">MALO</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'otros_internos' && (
            <div className="space-y-6">
              {/* Acabados */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Acabados del Inmueble</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {['lambrinesIncombustibles', 'lambrinesCombustibles', 'pisosDesniveles', 'pisosFalsos', 'losetasAzulejos'].map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm select-none">
                      <input
                        type="checkbox"
                        checked={acabados[key as keyof typeof acabados] as boolean}
                        onChange={e => setAcabados({ ...acabados, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Otros riesgos internos */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Otros Riesgos Internos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Inflamar */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-700 border-b">Inflamables / Explosivos</h5>
                    {['combustibles', 'solventes', 'papelCarton'].map(key => (
                      <label key={key} className="flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={otrosRiesgos.inflamar[key as keyof typeof otrosRiesgos.inflamar] as boolean}
                          onChange={e => setOtrosRiesgos({
                            ...otrosRiesgos,
                            inflamar: { ...otrosRiesgos.inflamar, [key]: e.target.checked }
                          })}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                      </label>
                    ))}
                  </div>

                  {/* Propiciar */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-700 border-b">Propician Fuego</h5>
                    {['cigarros', 'colillas', 'velas', 'instalacionGas', 'cafeteras', 'contactos', 'apagadores', 'cablesMalEstado', 'microondas'].map(key => (
                      <label key={key} className="flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={otrosRiesgos.propiciar[key as keyof typeof otrosRiesgos.propiciar] as boolean}
                          onChange={e => setOtrosRiesgos({
                            ...otrosRiesgos,
                            propiciar: { ...otrosRiesgos.propiciar, [key]: e.target.checked }
                          })}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                      </label>
                    ))}
                  </div>

                  {/* Obstaculizar */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-700 border-b">Obstaculizan Evacuación</h5>
                    {['tapetes', 'macetas', 'archiveros', 'pizarrones', 'muebles', 'equiposLimpieza', 'herramientas', 'puertasCerradas', 'lavadoras', 'bombeo'].map(key => (
                      <label key={key} className="flex items-center justify-between text-xs font-semibold uppercase text-gray-500">
                        <span>{key}</span>
                        <input
                          type="checkbox"
                          checked={otrosRiesgos.obstaculizar[key as keyof typeof otrosRiesgos.obstaculizar] as boolean}
                          onChange={e => setOtrosRiesgos({
                            ...otrosRiesgos,
                            obstaculizar: { ...otrosRiesgos.obstaculizar, [key]: e.target.checked }
                          })}
                          className="w-4 h-4 text-red-600 focus:ring-red-500"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'externos' && (
            <div className="space-y-6">
              {/* Entorno */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Riesgos Externos (Entorno a Evaluar)</h4>
                <div className="space-y-2">
                  {Object.keys(riesgosExternos.entorno).map(key => {
                    const item = riesgosExternos.entorno[key as keyof typeof riesgosExternos.entorno];
                    return (
                      <div key={key} className="flex flex-col md:flex-row items-baseline justify-between border-b pb-2 text-xs md:text-sm">
                        <label className="flex items-center gap-2 font-semibold capitalize select-none w-64">
                          <input
                            type="checkbox"
                            checked={item.siNo}
                            onChange={e => setRiesgosExternos({
                              ...riesgosExternos,
                              entorno: { ...riesgosExternos.entorno, [key]: { ...item, siNo: e.target.checked } }
                            })}
                            className="w-4 h-4"
                          />
                          <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                        </label>
                        <label className="flex items-center gap-2 mt-2 md:mt-0 text-xs text-gray-500">
                          <span>Distancia:</span>
                          <input
                            type="text"
                            value={item.distancia}
                            disabled={!item.siNo}
                            placeholder="ej. 15 MTS"
                            onChange={e => setRiesgosExternos({
                              ...riesgosExternos,
                              entorno: { ...riesgosExternos.entorno, [key]: { ...item, distancia: e.target.value } }
                            })}
                            className="border rounded px-1.5 py-0.5 text-center w-24"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Perturbadores checklist */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-blue-900 uppercase border-b pb-1.5">Agentes Perturbadores Externos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between border-b pb-2 text-sm select-none">
                    <span>Inundación por Lluvia/Mar</span>
                    <input type="checkbox" checked={riesgosExternos.hidrometeorologico.inundacion.lluvia} onChange={e => setRiesgosExternos({
                      ...riesgosExternos,
                      hidrometeorologico: {
                        ...riesgosExternos.hidrometeorologico,
                        inundacion: { ...riesgosExternos.hidrometeorologico.inundacion, lluvia: e.target.checked }
                      }
                    })} className="w-5 h-5 text-blue-600" />
                  </label>
                  <label className="flex items-center justify-between border-b pb-2 text-sm select-none">
                    <span>Huracán / Vientos fuertes</span>
                    <input type="checkbox" checked={riesgosExternos.hidrometeorologico.otros.huracan} onChange={e => setRiesgosExternos({
                      ...riesgosExternos,
                      hidrometeorologico: {
                        ...riesgosExternos.hidrometeorologico,
                        otros: { ...riesgosExternos.hidrometeorologico.otros, huracan: e.target.checked, vientosFuertes: e.target.checked }
                      }
                    })} className="w-5 h-5 text-blue-600" />
                  </label>
                  <label className="flex items-center justify-between border-b pb-2 text-sm select-none">
                    <span>Accidentes de Tránsito / Vehículos</span>
                    <input type="checkbox" checked={riesgosExternos.socioOrganizativo.accidentes.vehiculosParticulares} onChange={e => setRiesgosExternos({
                      ...riesgosExternos,
                      socioOrganizativo: {
                        ...riesgosExternos.socioOrganizativo,
                        accidentes: { ...riesgosExternos.socioOrganizativo.accidentes, vehiculosParticulares: e.target.checked }
                      }
                    })} className="w-5 h-5 text-blue-600" />
                  </label>
                  <label className="flex items-center justify-between border-b pb-2 text-sm select-none">
                    <span>Plagas (Insectos / Roedores)</span>
                    <input type="checkbox" checked={riesgosExternos.sanitario.plaga.siNo} onChange={e => setRiesgosExternos({
                      ...riesgosExternos,
                      sanitario: {
                        ...riesgosExternos.sanitario,
                        plaga: { ...riesgosExternos.sanitario.plaga, siNo: e.target.checked }
                      }
                    })} className="w-5 h-5 text-blue-600" />
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 flex flex-row gap-3">
          <button
            type="button"
            onClick={handleCloseModal}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-bold text-sm min-h-[44px]"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleLimpiar}
            className="flex-1 px-3 py-2 border border-orange-300 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px]"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Limpiar</span>
          </button>

          <button
            type="button"
            onClick={handlePreview}
            disabled={!commercialName.trim()}
            className="flex-1 px-3 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px] disabled:opacity-50"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Visualizar</span>
          </button>

          <button
            type="button"
            onClick={handleDescargar}
            disabled={!commercialName.trim()}
            className="flex-1 px-3 py-2 bg-[#7b1f1c] text-white rounded-lg hover:bg-[#5c1614] transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px] disabled:opacity-50"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Descargar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
