import React, { useState, useEffect } from 'react';
import { X, Trash2, Eye, Download, ShieldAlert, Sparkles, Loader2, ClipboardCheck } from 'lucide-react';
import { DocumentInfo } from '../../types';
import { generateIncendioPDF } from '../../utils/generateIncendioPDF';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  onPreview: (url: string, name: string) => void;
}

export default function ManualIncendioModal({ isOpen, onClose, documents, onPreview }: Props) {
  // Selection state
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  
  // General Info
  const [companyName, setCompanyName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [commercialName, setCommercialName] = useState('');
  const [giro, setGiro] = useState('');
  const [fecha, setFecha] = useState('');

  // Address
  const [direccion, setDireccion] = useState('');

  // Inmueble levels
  const [sotanoSi, setSotanoSi] = useState(false);
  const [sotanoM2, setSotanoM2] = useState('');
  const [nivel1Si, setNivel1Si] = useState(true);
  const [nivel1M2, setNivel1M2] = useState('');
  const [nivel2Si, setNivel2Si] = useState(false);
  const [nivel2M2, setNivel2M2] = useState('');
  const [nivel3Si, setNivel3Si] = useState(false);
  const [nivel3M2, setNivel3M2] = useState('');
  const [azoteaSi, setAzoteaSi] = useState(false);
  const [azoteaM2, setAzoteaM2] = useState('');

  const [m2Construccion, setM2Construccion] = useState('50');
  const [m2Superficie, setM2Superficie] = useState('50');
  
  const [antiguedad, setAntiguedad] = useState('N.D.');
  const [poblacionFija, setPoblacionFija] = useState('1');
  const [poblacionFlotante, setPoblacionFlotante] = useState('3');

  // Inventories
  const [gasesInflamables, setGasesInflamables] = useState('0');
  const [liquidosInflamables, setLiquidosInflamables] = useState('0');
  const [liquidosCombustibles, setLiquidosCombustibles] = useState('0');
  const [solidosCombustibles, setSolidosCombustibles] = useState('100');
  const [materialesPiroforicos, setMaterialesPiroforicos] = useState('0');

  // UI state
  const [loadingAi, setLoadingAi] = useState(false);
  const [businessCategory, setBusinessCategory] = useState<string>('comercio');
  const [numNiveles, setNumNiveles] = useState('1');

  const handleNivelesChange = (val: string) => {
    setNumNiveles(val);
    const n = parseInt(val) || 1;
    setNivel1Si(n >= 1);
    setNivel2Si(n >= 2);
    setNivel3Si(n >= 3);
  };

  const handlePreFillLocal = () => {
    // Detect category from giro
    const cat = detectCategoryFromGiro(giro);
    setBusinessCategory(cat);
    
    // Set level states based on numNiveles
    const n = parseInt(numNiveles) || 1;
    setNivel1Si(n >= 1);
    setNivel2Si(n >= 2);
    setNivel3Si(n >= 3);

    // Apply values to level inputs
    setNivel1M2(m2Construccion);
    setNivel2M2(n >= 2 ? m2Construccion : '');
    setNivel3M2(n >= 3 ? m2Construccion : '');

    applyLocalEstimates(cat, m2Construccion);

    Swal.fire({
      icon: 'success',
      title: 'Pre-llenado Local Exitoso',
      text: `Se estimaron los inventarios de riesgo para el giro "${giro || 'comercio'}" y ${numNiveles} nivel(es).`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Local rule-based estimation logic (does not use AI)
  // Local rule-based estimation logic (does not use AI)
  const detectCategoryFromGiro = (giroText: string): string => {
    const norm = (giroText || '').toLowerCase();

    // Renta de Vehículos / Alquiler de Grúas y Maquinaria
    if (
      norm.includes('grua') || norm.includes('grúa') || 
      norm.includes('renta de auto') || norm.includes('renta de coche') || 
      norm.includes('alquiler de auto') || norm.includes('alquiler de coche') || 
      norm.includes('alquiler de grua') || norm.includes('alquiler de grúa') || 
      norm.includes('renta de vehiculo') || norm.includes('renta de vehículo') || 
      norm.includes('arrendamiento de veh') || norm.includes('renta de maquinaria') ||
      norm.includes('alquiler de maquinaria')
    ) {
      return 'renta_vehiculos';
    }

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
      norm.includes('escuela') || norm.includes('educacion') || norm.includes('educativ') || norm.includes('guarderia') || 
      norm.includes('colegio') || norm.includes('academia') || norm.includes('universidad') || 
      norm.includes('kinder') || norm.includes('preescolar') || norm.includes('primaria') || 
      norm.includes('secundaria') || norm.includes('preparatoria') || norm.includes('institu') || norm.includes('intitu')
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
    if (norm.includes('minisuper') || norm.includes('abarrotes') || norm.includes('tiendita') || /\bsuper\b/.test(norm)) {
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

  const applyLocalEstimates = (category: string, m2Str: string) => {
    const m2 = parseFloat(m2Str) || 50;
    
    let gases = 0;
    let liqInf = 0;
    let liqComb = 0;
    let solidos = 100;
    let flotante = 3;

    switch (category) {
      case 'restaurante':
        gases = m2 <= 50 ? 50 : m2 <= 120 ? 100 : 200;
        liqComb = m2 <= 50 ? 5 : m2 <= 120 ? 10 : 20; // Aceite
        solidos = Math.round(m2 * 15);
        flotante = Math.ceil(m2 / 10);
        break;
      case 'cafeteria':
        gases = m2 <= 50 ? 20 : m2 <= 120 ? 45 : 90;
        liqComb = m2 <= 50 ? 2 : m2 <= 120 ? 5 : 10;
        solidos = Math.round(m2 * 12);
        flotante = Math.ceil(m2 / 8);
        break;
      case 'panaderia':
        gases = m2 <= 50 ? 90 : m2 <= 120 ? 200 : 400;
        liqComb = m2 <= 50 ? 5 : m2 <= 120 ? 10 : 20;
        solidos = Math.round(m2 * 20);
        flotante = Math.ceil(m2 / 12);
        break;
      case 'bar':
        liqInf = m2 <= 50 ? 50 : m2 <= 120 ? 150 : 400;
        solidos = Math.round(m2 * 12);
        flotante = Math.ceil(m2 / 4);
        break;
      case 'tortilleria':
        gases = m2 <= 50 ? 200 : m2 <= 120 ? 400 : 800;
        solidos = Math.round(m2 * 8);
        flotante = Math.ceil(m2 / 15);
        break;
      case 'centros_recreativos':
        liqInf = m2 <= 100 ? 10 : m2 <= 500 ? 50 : 150;
        liqComb = m2 <= 100 ? 20 : m2 <= 500 ? 100 : 400;
        solidos = Math.round(m2 * 25);
        flotante = Math.ceil(m2 / 5);
        break;
      case 'oficina':
        solidos = Math.round(m2 * 6);
        flotante = Math.ceil(m2 / 20);
        break;
      case 'despacho':
        solidos = Math.round(m2 * 5);
        flotante = Math.ceil(m2 / 25);
        break;
      case 'consultorio_medico':
        liqInf = m2 <= 50 ? 5 : m2 <= 120 ? 15 : 30;
        solidos = Math.round(m2 * 8);
        flotante = Math.ceil(m2 / 15);
        break;
      case 'consultorio_dental':
        liqInf = m2 <= 50 ? 3 : m2 <= 120 ? 10 : 20;
        solidos = Math.round(m2 * 6);
        flotante = Math.ceil(m2 / 15);
        break;
      case 'taller_mecanico':
        gases = m2 <= 50 ? 30 : 50;
        liqInf = m2 <= 50 ? 10 : 30;
        liqComb = m2 <= 50 ? 50 : 150;
        solidos = Math.round(m2 * 25);
        flotante = 4;
        break;
      case 'bodega':
        liqInf = m2 <= 100 ? 20 : 100;
        liqComb = m2 <= 100 ? 50 : 200;
        solidos = Math.round(m2 * 40);
        flotante = Math.ceil(m2 / 50);
        break;
      case 'plaza_comercial':
        gases = m2 <= 100 ? 45 : m2 <= 500 ? 200 : 600;
        liqInf = m2 <= 100 ? 15 : m2 <= 500 ? 60 : 150;
        liqComb = m2 <= 100 ? 30 : m2 <= 500 ? 150 : 400;
        solidos = Math.round(m2 * 18);
        flotante = Math.ceil(m2 / 5);
        break;
      case 'escuela':
        solidos = Math.round(m2 * 14);
        flotante = Math.ceil(m2 / 4);
        break;
      case 'gimnasio':
        solidos = Math.round(m2 * 7);
        flotante = Math.ceil(m2 / 8);
        break;
      case 'spa':
        gases = m2 <= 100 ? 45 : 90;
        liqComb = m2 <= 50 ? 10 : m2 <= 120 ? 20 : 55;
        solidos = Math.round(m2 * 8);
        flotante = Math.ceil(m2 / 10);
        break;
      case 'estetica':
        liqInf = m2 <= 50 ? 10 : m2 <= 120 ? 20 : 40;
        solidos = Math.round(m2 * 7);
        flotante = Math.ceil(m2 / 10);
        break;
      case 'farmacia':
        liqInf = m2 <= 50 ? 10 : m2 <= 120 ? 30 : 70;
        solidos = Math.round(m2 * 8);
        flotante = Math.ceil(m2 / 10);
        break;
      case 'zapateria':
        solidos = Math.round(m2 * 12);
        flotante = Math.ceil(m2 / 12);
        break;
      case 'minisuper':
        liqInf = m2 <= 50 ? 2 : m2 <= 120 ? 10 : 30;
        liqComb = m2 <= 50 ? 5 : m2 <= 120 ? 20 : 55;
        solidos = Math.round(m2 * 15);
        flotante = Math.ceil(m2 / 8);
        break;
      case 'veterinaria':
        liqInf = m2 <= 50 ? 5 : 15;
        solidos = Math.round(m2 * 10);
        flotante = Math.ceil(m2 / 15);
        break;
      case 'renta_vehiculos':
        liqInf = m2 <= 100 ? 50 : m2 <= 500 ? 200 : 500;
        liqComb = m2 <= 100 ? 100 : m2 <= 500 ? 400 : 1000;
        solidos = Math.round(m2 * 10);
        flotante = Math.ceil(m2 / 20);
        break;
      case 'hotel':
        gases = m2 <= 100 ? 90 : m2 <= 500 ? 300 : 800;
        liqInf = m2 <= 100 ? 5 : m2 <= 500 ? 20 : 50;
        liqComb = m2 <= 100 ? 10 : m2 <= 500 ? 100 : 300;
        solidos = Math.round(m2 * 20);
        flotante = Math.ceil(m2 / 15);
        break;
      case 'venta_productos_general':
        liqInf = m2 <= 50 ? 5 : m2 <= 120 ? 15 : 40;
        solidos = Math.round(m2 * 12);
        flotante = Math.ceil(m2 / 12);
        break;
      case 'lavanderia':
        gases = m2 <= 50 ? 200 : m2 <= 120 ? 400 : 800;
        liqInf = m2 <= 50 ? 15 : m2 <= 120 ? 40 : 80;
        liqComb = m2 <= 50 ? 30 : m2 <= 120 ? 60 : 150;
        solidos = Math.round(m2 * 10);
        flotante = Math.ceil(m2 / 12);
        break;
      case 'tienda_pinturas':
        liqInf = m2 <= 50 ? 200 : m2 <= 120 ? 500 : 1200;
        liqComb = m2 <= 50 ? 100 : m2 <= 120 ? 300 : 650;
        solidos = Math.round(m2 * 15);
        flotante = Math.ceil(m2 / 15);
        break;
      case 'comercio':
      default:
        solidos = Math.round(m2 * 10);
        flotante = Math.ceil(m2 / 15);
        break;
    }

    setGasesInflamables(String(gases));
    setLiquidosInflamables(String(liqInf));
    setLiquidosCombustibles(String(liqComb));
    setSolidosCombustibles(String(solidos));
    setMaterialesPiroforicos('0');
    setPoblacionFlotante(String(Math.max(1, flotante)));
    setAntiguedad('N.D.');
  };

  // Set default date to today
  useEffect(() => {
    if (isOpen && !fecha) {
      const today = new Date();
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
      const formattedDate = today.toLocaleDateString('es-MX', options).toUpperCase();
      setFecha(formattedDate);
    }
  }, [isOpen, fecha]);

  // Handle company selection change
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
      setFecha(doc.date || '');
      
      // Auto mapping fixed/floating populations and levels from database fields if they exist
      setPoblacionFija(doc.usuarios ? String(doc.usuarios) : '1');
      setPoblacionFlotante(doc.visitantes ? String(doc.visitantes) : '3');
      
      setSotanoSi((doc.sotanos || 0) > 0);
      setSotanoM2((doc.sotanos || 0) > 0 ? '50' : '');
      
      const sup = doc.superiores || 1;
      setNumNiveles(String(sup));
      setNivel1Si(sup >= 1);
      setNivel2Si(sup >= 2);
      setNivel3Si(sup >= 3);
      
      // Try to estimate address structure if we don't use AI
      setDireccion(doc.address || '');

      // Fetch employees to set fixed population dynamically
      fetch(`/api/documents/${doc.id}/employees`)
        .then(res => res.json())
        .then(emps => {
          if (Array.isArray(emps)) {
            setPoblacionFija(String(emps.length || 1));
          }
        })
        .catch(err => console.error('Error fetching employees count:', err));

      // Detect category and apply local estimates instantly
      const cat = detectCategoryFromGiro(doc.activity || '');
      setBusinessCategory(cat);
      applyLocalEstimates(cat, m2Construccion);
    }
  };

  // Trigger Gemini AI suggestion
  const handleGetAiSuggestions = async () => {
    setLoadingAi(true);
    try {
      const selectedDoc = documents.find(d => String(d.id) === selectedDocId);
      const res = await fetch('/api/generate-fire-risk-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName || selectedDoc?.company_name,
          commercial_name: commercialName || selectedDoc?.commercial_name,
          address: selectedDoc?.address || direccion,
          activity: giro || selectedDoc?.activity,
          m2: m2Construccion,
          usuarios: parseInt(poblacionFija) || undefined,
          visitantes: parseInt(poblacionFlotante) || undefined
        })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('El servidor retornó una respuesta que no es JSON válido. Verifica la consola.');
      }
      
      if (!res.ok) throw new Error(data.error || 'Error al conectar con la IA.');

      setDireccion(data.direccion || '');
      setAntiguedad('N.D.');
      setPoblacionFija(String(data.poblacionFija || 1));
      setPoblacionFlotante(String(data.poblacionFlotante || 3));
      setGasesInflamables(String(data.gasesInflamables || 0));
      setLiquidosInflamables(String(data.liquidosInflamables || 0));
      setLiquidosCombustibles(String(data.liquidosCombustibles || 0));
      setSolidosCombustibles(String(data.solidosCombustibles || 100));
      setMaterialesPiroforicos(String(data.materialesPiroforicos || 0));

      Swal.fire({
        icon: 'success',
        title: '¡Sugerencias aplicadas!',
        text: 'Los campos se han rellenado usando lógica de IA basada en tu negocio.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error de IA',
        text: err.message || 'No se pudo obtener la estimación de la IA.',
        confirmButtonColor: '#722F37'
      });
    } finally {
      setLoadingAi(false);
    }
  };

  const handleLimpiar = () => {
    setSelectedDocId('');
    setCompanyName('');
    setRepresentativeName('');
    setCommercialName('');
    setGiro('');
    setDireccion('');
    setSotanoSi(false);
    setSotanoM2('');
    setNivel1Si(true);
    setNivel1M2('');
    setNivel2Si(false);
    setNivel2M2('');
    setNivel3Si(false);
    setNivel3M2('');
    setAzoteaSi(false);
    setAzoteaM2('');
    setM2Construccion('50');
    setM2Superficie('50');
    setAntiguedad('N.D.');
    setPoblacionFija('1');
    setPoblacionFlotante('3');
    setGasesInflamables('0');
    setLiquidosInflamables('0');
    setLiquidosCombustibles('0');
    setSolidosCombustibles('100');
    setMaterialesPiroforicos('0');
  };

  const handleClose = () => {
    handleLimpiar();
    onClose();
  };

  // Calculations for live factor preview
  const m2ConstNum = parseFloat(m2Construccion) || 0;
  const gasNum = parseFloat(gasesInflamables) || 0;
  const liqInfNum = parseFloat(liquidosInflamables) || 0;
  const liqCombNum = parseFloat(liquidosCombustibles) || 0;
  const solCombNum = parseFloat(solidosCombustibles) || 0;
  const fixedPopNum = parseInt(poblacionFija) || 0;
  const piroforicosNum = parseFloat(materialesPiroforicos) || 0;

  const f1 = parseFloat((m2ConstNum / 3000).toFixed(2));
  const f2 = parseFloat((gasNum / 3000).toFixed(2));
  const f3 = parseFloat((liqInfNum / 1400).toFixed(2));
  const f4 = parseFloat((liqCombNum / 2000).toFixed(2));
  const solidWeightTotal = solCombNum + (fixedPopNum * 60);
  const f5 = parseFloat((solidWeightTotal / 15000).toFixed(2));
  const f6 = parseFloat((piroforicosNum / 15000).toFixed(2));

  const totalGrado = parseFloat((f1 + f2 + f3 + f4 + f5 + f6).toFixed(2));
  const esRiesgoAlto = totalGrado >= 1.0;

  const getPDFData = (): any => ({
    companyName: companyName.trim().toUpperCase(),
    representativeName: representativeName.trim().toUpperCase() || companyName.trim().toUpperCase(),
    commercialName: commercialName.trim().toUpperCase(),
    giro: giro.trim().toUpperCase(),
    fecha: fecha.trim().toUpperCase(),
    direccion,
    sotanoSi,
    sotanoM2: sotanoSi ? (sotanoM2 || m2Construccion) : '',
    nivel1Si,
    nivel1M2: nivel1Si ? (nivel1M2 || m2Construccion) : '',
    nivel2Si,
    nivel2M2: nivel2Si ? (nivel2M2 || m2Construccion) : '',
    nivel3Si,
    nivel3M2: nivel3Si ? (nivel3M2 || m2Construccion) : '',
    azoteaSi,
    azoteaM2: azoteaSi ? (azoteaM2 || m2Construccion) : '',
    m2Construccion,
    m2Superficie,
    antiguedad,
    poblacionFija,
    poblacionFlotante,
    gasesInflamables,
    liquidosInflamables,
    liquidosCombustibles,
    solidosCombustibles,
    materialesPiroforicos
  });

  const handlePreview = async () => {
    if (!commercialName.trim()) return;
    const url = await generateIncendioPDF(getPDFData(), true);
    if (url) onPreview(url as string, `ANALISIS INCENDIO - ${commercialName.toUpperCase()}`);
  };

  const handleDescargar = async () => {
    if (!commercialName.trim()) return;
    await generateIncendioPDF(getPDFData(), false);
  };

  // Sync construction total on level change if empty
  useEffect(() => {
    let sum = 0;
    if (sotanoSi) sum += parseFloat(sotanoM2) || 0;
    if (nivel1Si) sum += parseFloat(nivel1M2) || 0;
    if (nivel2Si) sum += parseFloat(nivel2M2) || 0;
    if (nivel3Si) sum += parseFloat(nivel3M2) || 0;
    if (azoteaSi) sum += parseFloat(azoteaM2) || 0;
    
    if (sum > 0) {
      setM2Construccion(String(sum));
      setM2Superficie(String(sum));
    }
  }, [sotanoSi, sotanoM2, nivel1Si, nivel1M2, nivel2Si, nivel2M2, nivel3Si, nivel3M2, azoteaSi, azoteaM2]);

  // Sync estimates whenever category or m2 changes
  useEffect(() => {
    applyLocalEstimates(businessCategory, m2Construccion);
  }, [businessCategory, m2Construccion]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center md:p-4 z-50 animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 shadow-2xl w-full h-full md:h-auto md:max-h-[95vh] md:max-w-4xl md:rounded-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Safe area offset for mobile devices */}
        <div className="bg-[#7b1f1c] shrink-0 md:hidden" style={{ height: 'env(safe-area-inset-top)' }} />
        
        {/* Modal Header */}
        <div className="bg-[#7b1f1c] px-6 py-5 text-white flex justify-between items-center shrink-0">
          <h3 className="font-black flex items-center gap-2 text-lg uppercase tracking-wider">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            Análisis de Riesgo de Incendio
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors rounded-full w-10 h-10 text-white"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-600 outline-none"
              >
                <option value="">-- Manual (Sin cargar acta) --</option>
                {documents.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.commercial_name}</option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-64">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Giro Estimación (Manual/Auto)
              </label>
              <select
                value={businessCategory}
                onChange={e => {
                  const val = e.target.value;
                  setBusinessCategory(val);
                  applyLocalEstimates(val, m2Construccion);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-600 outline-none font-bold text-xs uppercase"
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
                <option value="renta_vehiculos">Renta de Vehículos / Alquiler de Grúas</option>
                <option value="hotel">Hotel / Hospedaje</option>
              </select>
            </div>
            
            <div className="w-full md:w-28">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Niveles / Pisos
              </label>
              <input
                type="number"
                min="1"
                value={numNiveles}
                onChange={e => handleNivelesChange(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-600 outline-none font-bold"
              />
            </div>
            
            <div className="w-full md:w-36">
              <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                Metros Cuadrados *
              </label>
              <input
                type="number"
                value={m2Construccion}
                onChange={e => {
                  const val = e.target.value;
                  setM2Construccion(val);
                  setM2Superficie(val);
                  if (nivel1Si) setNivel1M2(val);
                  applyLocalEstimates(businessCategory, val);
                }}
                placeholder="m²"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-red-600 outline-none font-bold"
              />
            </div>

            {loadingAi ? (
              <button
                type="button"
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-2 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 h-[42px] disabled:opacity-50"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Estimando...</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: General Info and Address */}
            <div className="space-y-5 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <h4 className="font-extrabold text-sm text-[#7b1f1c] uppercase tracking-wider border-b pb-1.5">Datos Generales</h4>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Razón Social</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Razón Social"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-white uppercase text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    value={commercialName}
                    onChange={e => setCommercialName(e.target.value)}
                    placeholder="Nombre Comercial"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-white uppercase text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Representante Legal (Opcional)</label>
                  <input
                    type="text"
                    value={representativeName}
                    onChange={e => setRepresentativeName(e.target.value)}
                    placeholder="Igual que Razón Social si queda vacío"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-white uppercase text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giro Comercial</label>
                  <input
                    type="text"
                    value={giro}
                    onChange={e => {
                      const val = e.target.value;
                      setGiro(val);
                      const cat = detectCategoryFromGiro(val);
                      setBusinessCategory(cat);
                      applyLocalEstimates(cat, m2Construccion);
                    }}
                    placeholder="Giro Comercial"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-gray-50 dark:bg-gray-700 dark:text-white uppercase text-sm"
                  />
                </div>
              </div>

              <h4 className="font-extrabold text-sm text-[#7b1f1c] uppercase tracking-wider border-b pb-1.5 pt-4">Dirección</h4>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dirección Completa</label>
                  <textarea
                    rows={3}
                    value={direccion}
                    onChange={e => setDireccion(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white uppercase text-sm outline-none focus:ring-2 focus:ring-red-600 resize-none"
                    placeholder="Calle, Número, Colonia, C.P., Municipio, Estado"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Inmueble, Population & Risk Inventories */}
            <div className="space-y-5">
              {/* Inmueble levels */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-[#7b1f1c] uppercase tracking-wider border-b pb-1.5">Distribución Inmueble (m²)</h4>
                
                <div className="grid grid-cols-3 gap-2 font-bold text-xs uppercase text-gray-500 mb-1">
                  <span>Nivel</span>
                  <span className="text-center">Activo</span>
                  <span className="text-right">m²</span>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-sm font-medium">Sótano</span>
                    <input type="checkbox" checked={sotanoSi} onChange={e => { setSotanoSi(e.target.checked); if (e.target.checked && !sotanoM2) setSotanoM2('50'); }} className="mx-auto w-4 h-4 rounded text-red-600 focus:ring-red-600" />
                    <input type="number" disabled={!sotanoSi} value={sotanoM2} onChange={e => setSotanoM2(e.target.value)} className="w-full border rounded px-2 py-1 text-right text-xs" placeholder="0" />
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-sm font-medium">1er. Nivel</span>
                    <input type="checkbox" checked={nivel1Si} onChange={e => { setNivel1Si(e.target.checked); if (e.target.checked && !nivel1M2) setNivel1M2(m2Construccion); }} className="mx-auto w-4 h-4 rounded text-red-600 focus:ring-red-600" />
                    <input type="number" disabled={!nivel1Si} value={nivel1M2} onChange={e => setNivel1M2(e.target.value)} className="w-full border rounded px-2 py-1 text-right text-xs" placeholder="0" />
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-sm font-medium">2do. Nivel</span>
                    <input type="checkbox" checked={nivel2Si} onChange={e => { setNivel2Si(e.target.checked); if (e.target.checked && !nivel2M2) setNivel2M2(m2Construccion); }} className="mx-auto w-4 h-4 rounded text-red-600 focus:ring-red-600" />
                    <input type="number" disabled={!nivel2Si} value={nivel2M2} onChange={e => setNivel2M2(e.target.value)} className="w-full border rounded px-2 py-1 text-right text-xs" placeholder="0" />
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-sm font-medium">3er. Nivel</span>
                    <input type="checkbox" checked={nivel3Si} onChange={e => { setNivel3Si(e.target.checked); if (e.target.checked && !nivel3M2) setNivel3M2(m2Construccion); }} className="mx-auto w-4 h-4 rounded text-red-600 focus:ring-red-600" />
                    <input type="number" disabled={!nivel3Si} value={nivel3M2} onChange={e => setNivel3M2(e.target.value)} className="w-full border rounded px-2 py-1 text-right text-xs" placeholder="0" />
                  </div>
                  <div className="grid grid-cols-3 items-center">
                    <span className="text-sm font-medium">Azotea</span>
                    <input type="checkbox" checked={azoteaSi} onChange={e => { setAzoteaSi(e.target.checked); if (e.target.checked && !azoteaM2) setAzoteaM2('50'); }} className="mx-auto w-4 h-4 rounded text-red-600 focus:ring-red-600" />
                    <input type="number" disabled={!azoteaSi} value={azoteaM2} onChange={e => setAzoteaM2(e.target.value)} className="w-full border rounded px-2 py-1 text-right text-xs" placeholder="0" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Antigüedad (Años)</label>
                    <input type="text" value={antiguedad} onChange={e => setAntiguedad(e.target.value)} className="w-full border rounded px-2.5 py-1 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Pob. Fija</label>
                    <input type="number" value={poblacionFija} onChange={e => setPoblacionFija(e.target.value)} className="w-full border rounded px-2.5 py-1 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase">Pob. Flotante</label>
                    <input type="number" value={poblacionFlotante} onChange={e => setPoblacionFlotante(e.target.value)} className="w-full border rounded px-2.5 py-1 text-xs font-semibold" />
                  </div>
                </div>
              </div>

              {/* Inventories */}
              <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-[#7b1f1c] uppercase tracking-wider border-b pb-1.5">Inventarios de Riesgo</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gases Inflamables (L)</label>
                    <input type="number" value={gasesInflamables} onChange={e => setGasesInflamables(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Líquidos Inflamables (L)</label>
                    <input type="number" value={liquidosInflamables} onChange={e => setLiquidosInflamables(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Líquidos Combustibles (L)</label>
                    <input type="number" value={liquidosCombustibles} onChange={e => setLiquidosCombustibles(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sólidos Combustibles (kg)</label>
                    <input type="number" value={solidosCombustibles} onChange={e => setSolidosCombustibles(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pirofóricos / Explosivos (kg)</label>
                    <input type="number" value={materialesPiroforicos} onChange={e => setMaterialesPiroforicos(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha Determinación</label>
                    <input type="text" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full border rounded px-3 py-1.5 text-sm uppercase" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Calculations Section */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-gray-700 dark:text-gray-300 uppercase tracking-wider">Cálculo del Grado de Incendio (Tiempo Real)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                <p className="text-gray-400 font-bold">Superficie</p>
                <p className="text-base font-extrabold text-gray-800 dark:text-gray-200">{f1.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                <p className="text-gray-400 font-bold">Gases</p>
                <p className="text-base font-extrabold text-gray-800 dark:text-gray-200">{f2.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                <p className="text-gray-400 font-bold">Liq. Inf.</p>
                <p className="text-base font-extrabold text-gray-800 dark:text-gray-200">{f3.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                <p className="text-gray-400 font-bold">Liq. Comb.</p>
                <p className="text-base font-extrabold text-gray-800 dark:text-gray-200">{f4.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                <p className="text-gray-400 font-bold">Sólidos</p>
                <p className="text-base font-extrabold text-gray-800 dark:text-gray-200">{f5.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded border">
                <p className="text-gray-400 font-bold">Pirofóricos</p>
                <p className="text-base font-extrabold text-gray-800 dark:text-gray-200">{f6.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
              <div>
                <span className="text-xs uppercase font-bold text-gray-400">Total Grado de Incendio</span>
                <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{totalGrado.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-bold text-gray-400">Riesgo de Incendio</span>
                <p className={`text-xl font-black px-4 py-1.5 rounded-lg border ${esRiesgoAlto ? 'bg-red-600 text-white border-red-700' : 'bg-green-600 text-white border-green-700'}`}>
                  {esRiesgoAlto ? 'ALTO' : 'BAJO'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 flex flex-row gap-3">
          <button
            type="button"
            onClick={handleClose}
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
            className="flex-1 px-3 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>Visualizar</span>
          </button>

          <button
            type="button"
            onClick={handleDescargar}
            disabled={!commercialName.trim()}
            className="flex-1 px-3 py-2 bg-[#7b1f1c] text-white rounded-lg hover:bg-[#5c1614] transition-colors font-bold flex items-center justify-center gap-1.5 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Descargar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
