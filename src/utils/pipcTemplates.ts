import { DocumentInfo } from '../types';
import { RiesgosPDFData } from './generateRiesgosPDF';
import { IncendioPDFData } from './generateIncendioPDF';
import { ACTIVITIES_LIST } from './generateCalendarioPDF';

export interface InternalRiskItem {
  title: string;
  description: string;
  measures: string[];
}

export interface InternalRisksSection {
  items: InternalRiskItem[];
  conclusion: string;
}

export function classifyGiroCategory(giroText: string): string {
  const norm = (giroText || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (norm.includes('cenote') || norm.includes('ecoturismo') || norm.includes('ecotour') || norm.includes('caverna') || norm.includes('gruta') || norm.includes('subterraneo')) return 'cenotes';
  if (norm.includes('grua') || norm.includes('renta de auto') || norm.includes('renta de coche') || norm.includes('alquiler de auto') || norm.includes('renta de vehiculo') || norm.includes('arrendamiento de veh') || norm.includes('renta de maquinaria')) return 'renta_vehiculos';
  if (norm.includes('recreativo') || norm.includes('balneario') || norm.includes('parque') || norm.includes('club') || norm.includes('alberca') || norm.includes('piscina') || norm.includes('salon de fiestas') || norm.includes('salon de eventos') || norm.includes('juegos') || norm.includes('trampolines') || norm.includes('ludoteca') || norm.includes('inflables')) return 'centros_recreativos';
  if (
    norm.includes('restaurante') || norm.includes('fondita') || norm.includes('comida') || norm.includes('hamburguesa') ||
    norm.includes('marisco') || norm.includes('grill') || norm.includes('sushi') || norm.includes('bistro') ||
    norm.includes('pizzeria') || norm.includes('taqueria') || norm.includes('tacos') ||
    norm.includes('loncheria') || norm.includes('cenaduria') || norm.includes('snack') || norm.includes('cocina') || norm.includes('alimento')
  ) return 'restaurante';
  if (norm.includes('cafeteria') || norm.includes('creperia') || norm.includes('heladeria') || norm.includes('paleteria')) return 'cafeteria';
  if (norm.includes('panaderia') || norm.includes('pasteleria')) return 'panaderia';
  if (/\bbar(es)?\b/i.test(norm) || norm.includes('antro') || norm.includes('cantina')) return 'bar';
  if (norm.includes('tortilleria') || norm.includes('tortilla') || norm.includes('molino') || norm.includes('nixtamal')) return 'tortilleria';
  if (norm.includes('lavanderia') || norm.includes('tintoreria') || norm.includes('planchaduria') || norm.includes('lavamatica')) return 'lavanderia';
  if (norm.includes('muebler') || norm.includes('mueble') || norm.includes('carpinteri')) return 'taller_muebleria';
  if (norm.includes('pintura') || norm.includes('barniz') || norm.includes('ferreteria') || norm.includes('tlapaleria')) return 'tienda_pinturas';
  if (norm.includes('taller') || norm.includes('mecanico') || norm.includes('hojalateria') || norm.includes('automotriz') || norm.includes('vulcanizadora') || norm.includes('llanteria')) return 'taller_mecanico';
  if (norm.includes('bodega') || norm.includes('almacen') || norm.includes('deposito')) return 'bodega';
  if (norm.includes('plaza') || norm.includes('centro comercial') || norm.includes('mall') || norm.includes('galerias')) return 'plaza_comercial';
  if (norm.includes('despacho') || norm.includes('bufete') || norm.includes('abogado') || norm.includes('contable') || norm.includes('juridico')) return 'despacho';
  if (norm.includes('consultorio dental') || norm.includes('dentista') || norm.includes('dental')) return 'consultorio_dental';
  if (norm.includes('consultorio') || norm.includes('clinica') || norm.includes('medico')) return 'consultorio_medico';
  if (norm.includes('veterinaria') || norm.includes('mascota') || norm.includes('canina')) return 'veterinaria';
  if (norm.includes('oficina') || norm.includes('corporativo') || norm.includes('administrativo')) return 'oficina';
  if (norm.includes('gimnasio') || norm.includes('gym') || norm.includes('fitness') || norm.includes('crossfit')) return 'gimnasio';
  if (norm.includes('spa') || norm.includes('masaje') || norm.includes('vapor')) return 'spa';
  if (norm.includes('estetica') || norm.includes('peluqueria') || norm.includes('barberia') || norm.includes('belleza')) return 'estetica';
  if (norm.includes('escuela') || norm.includes('educacion') || norm.includes('colegio') || norm.includes('guarderia') || norm.includes('academia') || norm.includes('universidad') || norm.includes('kinder') || norm.includes('primaria') || norm.includes('secundaria') || norm.includes('preparatoria')) return 'escuela';
  if (norm.includes('farmacia') || norm.includes('drogueria') || norm.includes('botica')) return 'farmacia';
  if (norm.includes('zapateria') || norm.includes('zapato') || norm.includes('calzado')) return 'zapateria';
  if (norm.includes('abarrote') || norm.includes('minisuper') || norm.includes('tiendita') || norm.includes('tienda de conveniencia') || norm.includes('supermercado') || /\bsuper\b/.test(norm)) return 'minisuper';
  if (norm.includes('hotel') || norm.includes('motel') || norm.includes('hostal') || norm.includes('hospedaje')) return 'hotel';
  if (norm.includes('productos en general') || norm.includes('articulos en general') || norm.includes('comercio general') || norm.includes('comercio en general')) return 'venta_productos_general';
  if (norm.includes('artesania') || norm.includes('artesanal') || norm.includes('souvenir') || norm.includes('recuerdo') || norm.includes('galeria de arte')) return 'artesanias';
  return 'comercio';
}

/**
 * Genera automáticamente el texto de Actividad Económica (Página 45) según el giro del establecimiento.
 */
export function generateActividadEconomicaText(giro: string, commercialName?: string): string {
  const cat = classifyGiroCategory(giro);
  const giroClean = (giro || 'COMERCIO AL POR MENOR').toUpperCase().trim();

  switch (cat) {
    case 'restaurante':
    case 'cafeteria':
    case 'panaderia':
    case 'bar':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, DEDICÁNDOSE A LA PREPARACIÓN, ELABORACIÓN Y VENTA DE ALIMENTOS Y BEBIDAS PARA CONSUMO INMEDIATO. EL LOCAL REALIZA OPERACIONES QUE ABARCAN DESDE LA RECEPCIÓN Y ALMACENAMIENTO DE INSUMOS ALIMENTICIOS, SU PROCESAMIENTO Y COCCIÓN EN ÁREA DE COCINA, HASTA EL SERVICIO Y ATENCIÓN DIRECTA A LOS COMENSALES. LOS INGRESOS PROVIENEN DE LAS VENTAS REALIZADAS AL PÚBLICO EN GENERAL, MIENTRAS QUE LOS EGRESOS CORRESPONDEN A LA ADQUISICIÓN DE MATERIA PRIMA, RENTA DEL LOCAL, PAGO DE SERVICIOS BÁSICOS, SUELDOS DEL PERSONAL Y MANTENIMIENTO DE EQUIPOS. ESTA ACTIVIDAD MANTIENE UN FLUJO CONSTANTE DE CLIENTES Y CUMPLE CON LAS MEDIDAS DE HIGIENE Y SEGURIDAD OPERATIVA.`;

    case 'minisuper':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, OFRECIENDO AL PÚBLICO EN GENERAL UNA AMPLIA VARIEDAD DE PRODUCTOS DE PRIMERA NECESIDAD, ABARROTES, BEBIDAS, LÁCTEOS Y ARTÍCULOS DE USO COTIDIANO. LAS OPERACIONES ABARCAN DESDE LA RECEPCIÓN DE PROVEEDORES, CONTROL DE INVENTARIO, REFRIGERACIÓN Y ACOMODO EN ANAQUELES HASTA EL COBRO Y ATENCIÓN DIRECTA EN CAJA. LOS INGRESOS PROVIENEN DE LAS VENTAS DIARIAS AL MENUDEO, MIENTRAS QUE LOS EGRESOS CORRESPONDEN AL RESURTIDO DE MERCANCÍA, RENTA DEL LOCAL, ENERGÍA ELÉCTRICA, SERVICIOS Y GASTOS ADMINISTRATIVOS.`;

    case 'farmacia':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, DEDICÁNDOSE A LA COMERCIALIZACIÓN Y DISPENSACIÓN DE MEDICAMENTOS, MATERIAL DE CURACIÓN, PRODUCTOS DE HIGIENE PERSONAL Y ARTÍCULOS PARA EL CUIDADO DE LA SALUD. LAS OPERACIONES INCLUYEN LA RECEPCIÓN CONTROLADA DE INSUMOS FARMACÉUTICOS, SU CLASIFICACIÓN Y RESGUARDO EN ESTANTERÍAS BAJO CONDICIONES ADECUADAS DE CONSERVACIÓN, HASTA LA ATENCIÓN DIRECTA AL PÚBLICO. LOS INGRESOS DERIVAN DE LA VENTA AL MENUDEO Y LOS EGRESOS CORRESPONDEN A LA REPOSICIÓN DE INVENTARIO, RENTA, SERVICIOS Y SUELDOS.`;

    case 'consultorio':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, BRINDANDO SERVICIOS PROFESIONALES DE ATENCIÓN, CONSULTA, VALORACIÓN Y TRATAMIENTO EN MATERIA DE SALUD A LOS PACIENTES QUE ACUDEN AL INMUEBLE. LAS OPERACIONES COMPRENDEN LA RECEPCIÓN DE PACIENTES EN SALA DE ESPERA, ATENCIÓN EN CONSULTORIO, MANEJO DE INSTRUMENTAL E INSUMOS MÉDICOS Y GESTIÓN DE EXPEDIENTES. LOS INGRESOS PROVIENEN DE LOS SERVICIOS Y CONSULTAS OTORGADAS, MIENTRAS QUE LOS EGRESOS CORRESPONDEN A INSUMOS CLÍNICOS, RENTA DEL LOCAL, SERVICIOS, MANTENIMIENTO Y GASTOS OPERATIVOS.`;

    case 'oficina':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, LLEVANDO A CABO ACTIVIDADES ADMINISTRATIVAS, DE GESTIÓN, ASESORÍA Y ATENCIÓN A CLIENTES Y PROVEEDORES. LAS OPERACIONES SE DESARROLLAN MEDIANTE EQUIPOS DE CÓMPUTO, ARCHIVO DOCUMENTAL Y SALAS DE TRABAJO, BRINDANDO SERVICIOS PROFESIONALES ESPECIALIZADOS. LOS INGRESOS PROVIENEN DE LA PRESTACIÓN DE SERVICIOS PROFESIONALES, MIENTRAS QUE LOS EGRESOS CORRESPONDEN A RENTA DEL INMUEBLE, SERVICIOS DE TELECOMUNICACIONES Y ENERGÍA ELÉCTRICA, PAPELERÍA, SUELDOS Y GASTOS ADMINISTRATIVOS.`;

    case 'estetica':
    case 'spa':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, OFRECIENDO SERVICIOS DE CUIDADO PERSONAL, BELLEZA, ESTILISMO Y BIENESTAR A SUS CLIENTES. LAS OPERACIONES ABARCAN LA RECEPCIÓN DE USUARIOS, APLICACIÓN DE TRATAMIENTOS Y SERVICIOS CON EQUIPO Y PRODUCTOS COSMÉTICOS ESPECIALIZADOS, ASÍ COMO LA VENTA DE PRODUCTOS AFINES. LOS INGRESOS PROVIENEN DE LOS SERVICIOS REALIZADOS AL PÚBLICO, MIENTRAS QUE LOS EGRESOS CORRESPONDEN A LA ADQUISICIÓN DE INSUMOS, RENTA DEL LOCAL, SERVICIOS, SUELDOS Y GASTOS ADMINISTRATIVOS.`;

    case 'taller_mecanico':
    case 'taller_muebleria':
    case 'tienda_pinturas':
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}, REALIZANDO TRABAJOS TÉCNICOS, MANEJO DE HERRAMIENTAS, INSUMOS ESPECIALIZADOS Y ATENCIÓN A CLIENTES. LAS OPERACIONES ABARCAN LA RECEPCIÓN DE MATERIALES O UNIDADES, EJECUCIÓN DE SERVICIOS O COMERCIALIZACIÓN DE PRODUCTOS TÉCNICOS Y ENTREGA FINAL AL CLIENTE. LOS INGRESOS PROVIENEN DE LAS VENTAS Y SERVICIOS REALIZADOS, MIENTRAS QUE LOS EGRESOS CORRESPONDEN A COMPRA DE INSUMOS, REFACCIONES, RENTA DEL LOCAL, SERVICIOS, SUELDOS Y GASTOS OPERATIVOS.`;

    default:
      return `LA ACTIVIDAD ECONÓMICA DE ESTE ESTABLECIMIENTO SE CENTRA EN EL GIRO DE ${giroClean}. EL LOCAL OFRECE UNA AMPLIA VARIEDAD DE PRODUCTOS Y ARTÍCULOS COMERCIALES, LOS CUALES SE ADQUIEREN A TRAVÉS DE PROVEEDORES MAYORISTAS O DISTRIBUIDORES ESPECIALIZADOS. LAS OPERACIONES ABARCAN DESDE LA GESTIÓN DEL INVENTARIO Y EXHIBICIÓN DE PRODUCTOS HASTA LA ATENCIÓN DIRECTA AL CLIENTE. LOS INGRESOS PROVIENEN DE LAS VENTAS REALIZADAS AL PÚBLICO EN GENERAL, MIENTRAS QUE LOS EGRESOS CORRESPONDEN A LA REPOSICIÓN DE MERCANCÍA, RENTA DEL LOCAL, SERVICIOS, SUELDOS Y GASTOS ADMINISTRATIVOS. ESTA ACTIVIDAD PERMITE UNA ALTA ROTACIÓN DE PRODUCTOS Y SE ADAPTA CON FACILIDAD A LAS TENDENCIAS DEL MERCADO, PROMOVIENDO UNA OFERTA ATRACTIVA Y DINÁMICA PARA DIVERSOS TIPOS DE CONSUMIDORES.`;
  }
}

/**
 * Genera automáticamente los 5 Riesgos Internos y la Conclusión (Página 46) según el giro.
 */
export function generateRiesgosInternosSection(giro: string): InternalRisksSection {
  const cat = classifyGiroCategory(giro);
  const giroLower = (giro || 'establecimiento comercial').toLowerCase();

  if (cat === 'restaurante' || cat === 'cafeteria' || cat === 'panaderia' || cat === 'tortilleria' || cat === 'bar') {
    return {
      items: [
        {
          title: '1. Riesgo de incendio o fuga por uso de Gas L.P. y equipos de cocción',
          description: 'El uso continuo de estufas, hornos, freidoras o calentadores conlleva riesgo de fugas de gas o inflamación de grasas acumuladas.',
          measures: [
            'Realizar revisiones periódicas en tuberías, reguladores y conexiones con agua jabonosa.',
            'Mantener limpias las campanas de extracción y trampas de grasa.',
            'Contar con extintores tipo ABC y tipo K vigentes y de fácil acceso.',
            'Cerrar la válvula de paso de gas al finalizar la jornada laboral.'
          ]
        },
        {
          title: '2. Riesgo eléctrico por uso de equipos de refrigeración y electrodomésticos',
          description: 'La operación simultánea de refrigeradores, congeladores, licuadoras y hornos puede generar sobrecarga en los circuitos eléctricos.',
          measures: [
            'Evitar el uso de extensiones domésticas o multicontactos sobrecargados.',
            'Mantener los tableros eléctricos señalizados y con tapa protectora.',
            'Realizar mantenimiento preventivo periódico a las instalaciones eléctricas.'
          ]
        },
        {
          title: '3. Riesgo de resbalones, caídas o quemaduras en área de preparación',
          description: 'La presencia de líquidos, humedad o grasa en el piso, así como el manejo de recipientes calientes, representa riesgo para el personal.',
          measures: [
            'Secar y limpiar de inmediato cualquier derrame de líquidos o aceite.',
            'Utilizar calzado cerrado con suela antiderrapante.',
            'Mantener los pasillos de circulación y rutas de evacuación libres de obstáculos.'
          ]
        },
        {
          title: '4. Riesgo de cortes o lesiones por manejo de utensilios y maquinaria',
          description: 'El uso cotidiano de cuchillos, rebanadoras o cristalería puede ocasionar heridas si no se manipulan con precaución.',
          measures: [
            'Almacenar cuchillos y objetos punzocortantes en lugares seguros y designados.',
            'Contar con un botiquín de primeros auxilios abastecido y señalizado.',
            'Recoger cristalería rota utilizando herramientas adecuadas y nunca directamente con las manos.'
          ]
        },
        {
          title: '5. Riesgo ergonómico y fatiga térmica del personal',
          description: 'Permanecer de pie durante la jornada y la exposición al calor de la cocina pueden generar fatiga física en los trabajadores.',
          measures: [
            'Mantener una adecuada ventilación o extracción de aire en el establecimiento.',
            'Fomentar la hidratación constante y pausas activas entre turnos.',
            'Adoptar posturas adecuadas al levantar insumos o cajas pesadas.'
          ]
        }
      ],
      conclusion: `Debido a la naturaleza operativa del giro (${giroLower}), el control preventivo en las instalaciones de gas y electricidad, el orden en las áreas de servicio y la disponibilidad de extintores y botiquín garantizan la seguridad tanto de los trabajadores como de los clientes.`
    };
  }

  if (cat === 'oficina' || cat === 'consultorio' || cat === 'farmacia') {
    return {
      items: [
        {
          title: '1. Riesgo de corto circuito por equipos de cómputo, climatización e iluminación',
          description: 'El uso continuo de computadoras, impresoras, aires acondicionados o equipos electrónicos puede generar calentamiento en contactos.',
          measures: [
            'Utilizar reguladores de voltaje o No-Break para equipos sensibles.',
            'Evitar saturar un mismo contacto con múltiples adaptadores.',
            'Desconectar equipos no esenciales al término de la jornada.',
            'Contar con extintor vigente y señalizado.'
          ]
        },
        {
          title: '2. Riesgo de caída de objetos en archiveros, estantes o mobiliario',
          description: 'El almacenamiento de expedientes, insumos o cajas en partes altas puede provocar caídas de material si se sobrecargan los estantes.',
          measures: [
            'Fijar estanterías y archiveros a la pared para evitar volcaduras.',
            'Colocar los objetos más pesados en los niveles inferiores.',
            'No obstruir pasillos con cajas o mobiliario.'
          ]
        },
        {
          title: '3. Riesgo de tropiezos o caídas a un mismo nivel',
          description: 'La presencia de cables sueltos en áreas de paso o pisos húmedos durante la limpieza puede ocasionar tropiezos a usuarios y personal.',
          measures: [
            'Canalizar y sujetar los cables eléctricos y de red lejos de los pasillos.',
            'Mantener las rutas de evacuación y salidas despejadas en todo momento.',
            'Realizar la limpieza de pisos en horarios de menor afluencia o señalizar el área.'
          ]
        },
        {
          title: '4. Riesgo sanitario o biológico en la atención a usuarios',
          description: 'El flujo constante de clientes o pacientes en espacios cerrados y climatizados requiere medidas de higiene permanentes.',
          measures: [
            'Mantener limpieza y desinfección diaria de superficies de contacto y mobiliario.',
            'Dar mantenimiento periódico a los filtros de aire acondicionado.',
            'Contar con botiquín de primeros auxilios completo y accesible.'
          ]
        },
        {
          title: '5. Riesgo ergonómico por posturas prolongadas',
          description: 'El trabajo continuo frente a mostradores o equipos de cómputo puede ocasionar fatiga visual o muscular en el personal.',
          measures: [
            'Utilizar mobiliario ergonómico y mantener una iluminación adecuada.',
            'Realizar pausas breves de estiramiento durante la jornada laboral.',
            'Evitar cargar cajas o insumos pesados sin la postura correcta.'
          ]
        }
      ],
      conclusion: `Aunque las actividades del establecimiento (${giroLower}) se consideran de riesgo ordinario bajo, mantener las instalaciones eléctricas en buen estado, los pasillos despejados y el equipo de emergencia vigente asegura un entorno seguro para el personal y visitantes.`
    };
  }

  // Default: Comercio general / tienda de ropa / regalos / novedades / etc. (idéntico al machote)
  return {
    items: [
      {
        title: '1. Riesgo de incendio por sobrecarga eléctrica o uso de extensiones',
        description: 'Dado el tamaño reducido del local, es común utilizar múltiples conexiones eléctricas para vitrinas, luces decorativas, ventiladores o cajas registradoras, lo que puede provocar sobrecargas.',
        measures: [
          'Evitar el uso de múltiples extensiones o conexiones improvisadas.',
          'Revisar periódicamente el sistema eléctrico.',
          'Contar con un extintor tipo ABC y señalética visible.',
          'No colocar productos inflamables cerca de enchufes o focos.'
        ]
      },
      {
        title: '2. Riesgo de caída de objetos por mala organización o sobrecarga de estanterías',
        description: 'El espacio reducido puede llevar a colocar mercancía en altura o de forma inestable, lo que representa riesgo para clientes y personal.',
        measures: [
          'Distribuir los productos con equilibrio y estabilidad.',
          'Asegurar estanterías a la pared si es posible.',
          'Evitar sobrecargar repisas o vitrinas.'
        ]
      },
      {
        title: '3. Riesgo de tropiezos por pasillos estrechos o cajas mal ubicadas',
        description: 'La limitada superficie puede dificultar el paso o generar tropiezos si no se mantiene despejado.',
        measures: [
          'Mantener los pasillos libres de obstáculos.',
          'Colocar cajas o productos únicamente en zonas permitidas.',
          'Hacer limpieza constante y reorganización diaria del área.'
        ]
      },
      {
        title: '4. Riesgo de robo hormiga o extravío de mercancía',
        description: 'Al tratarse de productos pequeños y atractivos, existe el riesgo de hurtos discretos si no se cuenta con suficiente visibilidad.',
        measures: [
          'Instalar espejos o cámaras de vigilancia.',
          'Organizar la tienda de forma que todo sea visible desde el punto de venta.',
          'Atender personalmente a cada cliente para reducir riesgo.'
        ]
      },
      {
        title: '5. Riesgo ergonómico para el personal',
        description: 'Permanecer muchas horas de pie o en espacios reducidos puede afectar la salud del personal.',
        measures: [
          'Permitir pausas activas o turnos para el descanso.',
          'Usar calzado cómodo y tener un área pequeña de descanso si es posible.',
          'Evitar posiciones forzadas al limpiar o acomodar mercancía.'
        ]
      }
    ],
    conclusion: `Aunque el establecimiento (${giroLower}) no maneje materiales peligrosos de alto impacto, su operación y el tipo de productos requieren medidas preventivas específicas. La organización adecuada, el orden, la prevención de incendios y el control del espacio aseguran la seguridad y funcionalidad del establecimiento.`
  };
}

/**
 * Construye automáticamente los datos de Análisis de Riesgos (Págs. 38-42) a partir del documento y m2.
 */
export function buildDefaultRiesgosData(
  docInfo: DocumentInfo,
  m2Num: number,
  empCount: number,
  floatPopOverride?: number
): RiesgosPDFData {
  const category = classifyGiroCategory(docInfo.activity || '');
  const m2Val = Math.max(10, m2Num || 50);
  const fixedPop = Math.max(1, empCount || docInfo.usuarios || 1);
  const floatPop = Math.max(1, floatPopOverride || docInfo.visitantes || 3);
  const numNiveles = Math.max(1, docInfo.superiores || 1);

  const rawAddress = docInfo.address || '';
  const addrParts = rawAddress.split('|');
  const baseAddress = addrParts[0] ? addrParts[0].trim() : '';
  const municipio = addrParts[1]?.trim().toUpperCase() || 'PLAYA DEL CARMEN';

  const isFood = category === 'restaurante' || category === 'cafeteria' || category === 'bar' || category === 'panaderia' || category === 'tortilleria';
  const isSpecialGas = isFood || category === 'lavanderia' || category === 'spa' || category === 'hotel';
  const isOffice = category === 'oficina' || category === 'despacho' || category === 'consultorio_medico' || category === 'consultorio_dental' || category === 'consultorio' || category === 'escuela';
  const isComercio = category === 'comercio' || category === 'artesanias' || category === 'tienda_pinturas' || category === 'farmacia' || category === 'zapateria' || category === 'minisuper' || category === 'estetica' || category === 'veterinaria' || category === 'venta_productos_general' || category === 'renta_vehiculos';
  const isWoodWorkshop = category === 'taller_muebleria';
  const isIndustrial = category === 'taller_mecanico' || category === 'bodega' || isWoodWorkshop;

  const hasStairs = numNiveles > 1;
  const hasEmergStairs =
    numNiveles >= 3 ||
    (m2Val > 300 && numNiveles > 1) ||
    (category === 'plaza_comercial' && numNiveles > 1) ||
    (category === 'hotel' && numNiveles > 1) ||
    (category === 'centros_recreativos' && numNiveles > 1);

  let gasCapacity = 'N/A';
  if (category === 'tortilleria') gasCapacity = '300 L';
  else if (category === 'lavanderia') gasCapacity = '500 L';
  else if (category === 'spa') gasCapacity = '300 L';
  else if (category === 'hotel') gasCapacity = '1000 L';
  else if (category === 'restaurante') gasCapacity = m2Val >= 100 ? '120 L' : '30 KG';
  else if (category === 'cafeteria') gasCapacity = '30 KG';
  else if (category === 'bar') gasCapacity = '30 KG';
  else if (category === 'panaderia') gasCapacity = '120 L';

  const gasTanqueEstacionario = isSpecialGas && (m2Val >= 80 || category === 'lavanderia' || category === 'tortilleria' || category === 'spa' || category === 'hotel');
  const gasTanqueMovil = isSpecialGas && m2Val < 80 && category !== 'lavanderia' && category !== 'tortilleria' && category !== 'spa' && category !== 'hotel';
  const isLarge = m2Val >= 250 || category === 'plaza_comercial';

  // Cantidades proporcionales a m2 y giro (idénticas a ManualRiesgosModal)
  const cantLamps =
    category === 'cenotes'
      ? Math.max(8, Math.min(200, Math.round(m2Val / 12)))
      : Math.max(4, Math.min(300, Math.round((m2Val / 5.5) * numNiveles)));
  const cantFans = Math.max(0, Math.min(6, Math.round((m2Val / 45) * numNiveles)));
  const cantScreens =
    isFood || category === 'bar'
      ? Math.min(6, Math.max(1, Math.round(m2Val / 35)))
      : isOffice
      ? Math.min(3, Math.max(1, Math.round(m2Val / 40)))
      : 1;
  const cantAC = Math.max(1, Math.min(6, Math.round((m2Val / 50) * numNiveles)));

  const hasEvaporador =
    category === 'oficina' ||
    category === 'despacho' ||
    category === 'consultorio_medico' ||
    category === 'consultorio_dental' ||
    category === 'consultorio' ||
    category === 'plaza_comercial' ||
    category === 'hotel' ||
    category === 'spa' ||
    category === 'restaurante' ||
    category === 'cafeteria' ||
    category === 'veterinaria' ||
    category === 'centros_recreativos';
  const hasCristaleria = isFood || category === 'farmacia' || category === 'estetica';
  const hasCanceles = isComercio || isFood || category === 'plaza_comercial';
  const hasPlafones = isOffice || category === 'plaza_comercial';
  const hasRepisas = isOffice || isComercio || category === 'tienda_pinturas' || category === 'farmacia';
  const hasCuadros = isOffice;
  const hasEspejos = category === 'gimnasio' || category === 'estetica' || category === 'spa' || category === 'centros_recreativos';
  const hasToxicos =
    category === 'tienda_pinturas' ||
    category === 'taller_mecanico' ||
    isWoodWorkshop ||
    category === 'lavanderia' ||
    category === 'estetica' ||
    category === 'centros_recreativos' ||
    category === 'renta_vehiculos';
  const hasInflamables =
    category === 'tienda_pinturas' ||
    category === 'taller_mecanico' ||
    isWoodWorkshop ||
    isFood ||
    category === 'spa' ||
    category === 'centros_recreativos' ||
    category === 'renta_vehiculos' ||
    category === 'cenotes';

  const cantMesas =
    category === 'cenotes'
      ? 2
      : isFood
      ? Math.max(2, Math.min(25, Math.round(m2Val / 7)))
      : isOffice
      ? Math.min(4, Math.max(1, Math.round(m2Val / 25)))
      : 2;
  const cantSillas =
    category === 'cenotes'
      ? Math.max(8, Math.min(60, Math.round(floatPop * 0.4)))
      : isFood
      ? Math.max(8, Math.min(100, Math.round(m2Val / 1.8)))
      : isOffice
      ? fixedPop * 2
      : 4;

  return {
    companyName: docInfo.company_name || '',
    representativeName: docInfo.company_name || '',
    commercialName: docInfo.commercial_name || '',
    giro: docInfo.activity || 'COMERCIO AL POR MENOR',
    fecha: docInfo.date || 'FECHA',
    direccion: baseAddress,
    municipio,
    niveles: String(numNiveles),
    m2Construccion: String(m2Val),
    m2Superficie: String(m2Val),
    antiguedad: 'N.D.',
    poblacionFija: String(fixedPop),
    poblacionFlotante: String(floatPop),
    gasDictamenVigencia: isSpecialGas ? 'ENERO 2026 - ENERO 2027' : '',
    gasDictamenFecha: isSpecialGas ? '15 DE ENERO DE 2026' : '',
    electricaDictamenVigencia: 'ENERO 2026 - ENERO 2027',
    electricaDictamenFecha: '15 DE ENERO DE 2026',
    croquis: {
      norteGeografico: true,
      riesgosInternos: true,
      zonasAltoRiesgo: isSpecialGas || category === 'taller_mecanico' || category === 'tienda_pinturas' || isWoodWorkshop,
      equiposEmergencia: true,
      rutasEvacuacion: true,
      zonaConteo: true
    },
    estructural: {
      inclinacion: false,
      separacion: false,
      deformacion: false,
      grietasMuros: false,
      hundimiento: false,
      grietasPiso: false,
      filtracion: false,
      danosEscaleras: false
    },
    escalerasServicio: {
      homogeneas: hasStairs,
      barandal: hasStairs,
      pasamanos: hasStairs,
      cinta: hasStairs,
      iluminacion: hasStairs,
      estado: 'BUENO'
    },
    escalerasEmergencia: {
      homogeneas: hasEmergStairs,
      barandal: hasEmergStairs,
      pasamanos: hasEmergStairs,
      cinta: hasEmergStairs,
      iluminacion: hasEmergStairs,
      estado: 'BUENO'
    },
    instalaciones: {
      hidrosanitaria: {
        cisterna:
          m2Val > 70 ||
          category === 'lavanderia' ||
          category === 'plaza_comercial' ||
          category === 'spa' ||
          category === 'hotel' ||
          category === 'gimnasio' ||
          category === 'escuela' ||
          category === 'restaurante',
        tinaco: true,
        danosTuberia: false,
        danosLlaves: false,
        dictamenTecnico: m2Val > 300 || category === 'hotel' || category === 'plaza_comercial'
      },
      gas: {
        tanqueEstacionario: gasTanqueEstacionario,
        tanqueMovil: gasTanqueMovil,
        calentadorAgua: isSpecialGas || category === 'lavanderia' || category === 'spa' || category === 'hotel' || category === 'gimnasio',
        dictamenTecnico: isSpecialGas,
        capacidad: gasCapacity,
        fugas: false,
        estado: 'BUENO',
        recomendaciones: isSpecialGas
          ? 'REALIZAR PRUEBAS DE HERMETICIDAD ANUALES Y MANTENER VÁLVULAS LIBRES.'
          : 'NO APLICA AL GIRO COMERCIAL.'
      },
      electrica: {
        subestacion:
          isLarge &&
          (category === 'taller_mecanico' ||
            isWoodWorkshop ||
            category === 'plaza_comercial' ||
            category === 'lavanderia' ||
            category === 'hotel' ||
            category === 'gimnasio' ||
            category === 'centros_recreativos'),
        tableros: true,
        cableado: true,
        contactos: true,
        interruptores: true,
        lamparas: true,
        lamparasEmergencia: true,
        plantaEmergencia: isLarge || category === 'hotel' || category === 'plaza_comercial' || category === 'cenotes',
        transformador:
          isLarge &&
          (category === 'taller_mecanico' ||
            isWoodWorkshop ||
            category === 'plaza_comercial' ||
            category === 'hotel' ||
            category === 'gimnasio' ||
            category === 'centros_recreativos'),
        dictamenTecnico: true,
        recomendaciones:
          category === 'cenotes'
            ? 'PROTEGER EL CABLEADO Y LÁMPARAS CONTRA LA HUMEDAD CONSTANTE CON PROTECCIÓN IP65/IP68 EN CAVERNAS. MANTENER PLANTA DE EMERGENCIA OPERATIVA.'
            : isWoodWorkshop
            ? 'MANTENER TABLEROS SEÑALIZADOS, CON DIRECTORIO Y CON TAPA PROTECTORA. CONECTAR MAQUINARIA DE CARPINTERÍA A TIERRA FÍSICA.'
            : 'MANTENER TABLEROS SEÑALIZADOS, CON DIRECTORIO Y CON TAPA PROTECTORA.',
        estado: 'BUENO'
      },
      especiales: {
        bombasAgua:
          m2Val > 70 ||
          category === 'lavanderia' ||
          category === 'plaza_comercial' ||
          category === 'spa' ||
          category === 'hotel' ||
          category === 'gimnasio' ||
          category === 'centros_recreativos' ||
          category === 'cenotes',
        ac: category !== 'bodega' && category !== 'cenotes',
        extractores:
          isFood ||
          category === 'taller_mecanico' ||
          isWoodWorkshop ||
          category === 'lavanderia' ||
          category === 'spa' ||
          category === 'gimnasio' ||
          category === 'centros_recreativos',
        ventiladores: true,
        cercaElectrica: false,
        alarmaGeneral:
          m2Val > 150 ||
          category === 'plaza_comercial' ||
          category === 'escuela' ||
          category === 'hotel' ||
          category === 'centros_recreativos' ||
          category === 'cenotes',
        presurizadores: category === 'hotel' || category === 'spa' || m2Val > 250,
        recomendaciones:
          category === 'cenotes'
            ? 'SE RECOMIENDA MANTENIMIENTO PREVENTIVO A BOMBAS DE AGUA, MOTO-BOMBAS Y SISTEMAS DE ILUMINACIÓN DE CAVERNA.'
            : isWoodWorkshop
            ? 'SE RECOMIENDA MANTENIMIENTO PREVENTIVO PERIÓDICO A LOS SISTEMAS DE EXTRACCIÓN DE POLVO Y AIRE ACONDICIONADO.'
            : 'SE RECOMIENDA MANTENIMIENTO PREVENTIVO PERIÓDICO A LOS EQUIPOS DE AIRE ACONDICIONADO.'
      }
    },
    caer: {
      lamparas: { siNo: true, cantidad: cantLamps, estado: 'BUENO' },
      ventiladores: { siNo: cantFans > 0 && category !== 'cenotes', cantidad: category === 'cenotes' ? 0 : cantFans, estado: 'BUENO' },
      pantallas: { siNo: cantScreens > 0 && category !== 'cenotes', cantidad: category === 'cenotes' ? 0 : cantScreens, estado: 'BUENO' },
      evaporador: { siNo: hasEvaporador, cantidad: hasEvaporador ? cantAC : 0, estado: 'BUENO' },
      cristaleria: { siNo: hasCristaleria, cantidad: hasCristaleria ? (isFood ? Math.min(25, Math.round(m2Val / 5)) : 5) : 0, estado: 'BUENO' },
      canceles: { siNo: hasCanceles, cantidad: hasCanceles ? (category === 'plaza_comercial' ? 6 : 2) : 0, estado: 'BUENO' },
      techos: { siNo: false, cantidad: 0, estado: 'BUENO' },
      plafones: { siNo: hasPlafones, cantidad: hasPlafones ? Math.max(2, Math.min(20, Math.round(m2Val / 20))) : 0, estado: 'BUENO' },
      repisas: {
        siNo: hasRepisas || isWoodWorkshop,
        cantidad: hasRepisas || isWoodWorkshop ? (category === 'tienda_pinturas' ? 6 : isWoodWorkshop ? 4 : 2) : 0,
        estado: 'BUENO'
      },
      cuadros: { siNo: hasCuadros, cantidad: hasCuadros ? Math.min(4, Math.max(1, Math.round(m2Val / 40))) : 0, estado: 'BUENO' },
      espejos: {
        siNo: hasEspejos,
        cantidad: hasEspejos ? (category === 'estetica' ? 4 : category === 'gimnasio' ? 4 : 2) : 0,
        estado: 'BUENO'
      },
      liquidosToxicos: {
        siNo: hasToxicos,
        cantidad: hasToxicos ? (category === 'tienda_pinturas' ? 12 : isWoodWorkshop ? 6 : 2) : 0,
        estado: 'BUENO'
      },
      liquidosInflamables: {
        siNo: hasInflamables,
        cantidad: hasInflamables
          ? category === 'cenotes'
            ? 2
            : category === 'tienda_pinturas'
            ? 20
            : category === 'taller_mecanico'
            ? 10
            : isWoodWorkshop
            ? 12
            : 2
          : 0,
        estado: 'BUENO'
      },
      liquidosCorrosivos: {
        siNo: isIndustrial || category === 'tienda_pinturas',
        cantidad: isIndustrial || category === 'tienda_pinturas' ? 2 : 0,
        estado: 'BUENO'
      },
      otros: { siNo: false, cantidad: 0, estado: 'BUENO' },
      recomendaciones:
        category === 'cenotes'
          ? 'ASEGURAR REFLECTORES Y LÁMPARAS DE CAVERNA Y SENDEROS, ASÍ COMO EL EQUIPO DE RESCATE Y CHALECOS SALVAVIDAS.'
          : 'ASEGURAR LA CRISTALERÍA Y ELEMENTOS COLGANTES PARA EVITAR CAÍDAS EN CASO DE SISMO.'
    },
    deslizarse: {
      escritorios: {
        siNo: isOffice || isWoodWorkshop || isComercio,
        cantidad: isOffice || isWoodWorkshop ? Math.min(fixedPop, Math.max(1, Math.round(m2Val / 18))) : isComercio ? 1 : 0,
        estado: 'BUENO'
      },
      mesas: {
        siNo: isOffice || isFood || category === 'escuela' || isWoodWorkshop || category === 'cenotes',
        cantidad: cantMesas,
        estado: 'BUENO'
      },
      sillas: { siNo: true, cantidad: cantSillas, estado: 'BUENO' },
      refrigeradores: {
        siNo: isFood || category === 'farmacia' || category === 'minisuper',
        cantidad: isFood ? 2 : category === 'minisuper' ? 3 : 1,
        estado: 'BUENO'
      },
      ruedas: { siNo: isIndustrial || category === 'bodega', cantidad: isIndustrial || category === 'bodega' ? 2 : 0, estado: 'BUENO' },
      recomendaciones:
        category === 'cenotes'
          ? 'MANTENER LAS SILLAS Y BANCAS DE LA SALA DE ESPERA Y ÁREA DE CHALECOS ACOMODADAS SIN OBSTRUIR SENDEROS.'
          : 'MANTENER LAS SILLAS, MESAS Y BANCOS DE TRABAJO ACOMODADOS SIN OBSTRUIR PASILLOS.'
    },
    volcar: {
      computo: {
        siNo: isOffice || isComercio || category === 'plaza_comercial' || category === 'escuela' || isWoodWorkshop || category === 'cenotes',
        cantidad:
          isOffice || category === 'plaza_comercial' || category === 'escuela' || isWoodWorkshop
            ? Math.min(fixedPop, Math.max(1, Math.round(m2Val / 15)))
            : 1,
        estado: 'BUENO'
      },
      libreros: { siNo: isOffice || category === 'escuela', cantidad: isOffice || category === 'escuela' ? 2 : 0, estado: 'BUENO' },
      roperos: { siNo: category === 'hotel', cantidad: category === 'hotel' ? Math.min(10, Math.round(m2Val / 20)) : 0, estado: 'BUENO' },
      lockers: {
        siNo:
          category === 'gimnasio' ||
          category === 'escuela' ||
          category === 'taller_mecanico' ||
          isWoodWorkshop ||
          category === 'centros_recreativos' ||
          category === 'cenotes',
        cantidad:
          category === 'cenotes'
            ? Math.max(8, Math.min(50, Math.round(m2Val / 15)))
            : category === 'gimnasio' ||
              category === 'escuela' ||
              category === 'taller_mecanico' ||
              isWoodWorkshop ||
              category === 'centros_recreativos'
            ? 3
            : 0,
        estado: 'BUENO'
      },
      archiveros: {
        siNo: isOffice || isWoodWorkshop,
        cantidad: isOffice || isWoodWorkshop ? Math.max(1, Math.round(fixedPop / 2)) : 0,
        estado: 'BUENO'
      },
      estantes: {
        siNo:
          isComercio ||
          isFood ||
          category === 'bodega' ||
          category === 'farmacia' ||
          category === 'centros_recreativos' ||
          isWoodWorkshop ||
          category === 'cenotes',
        cantidad:
          category === 'cenotes'
            ? 4
            : isComercio ||
              isFood ||
              category === 'bodega' ||
              category === 'farmacia' ||
              category === 'centros_recreativos' ||
              isWoodWorkshop
            ? category === 'tienda_pinturas'
              ? 6
              : category === 'bodega'
              ? 10
              : isWoodWorkshop
              ? 5
              : 3
            : 0,
        estado: 'BUENO'
      },
      vitrinas: {
        siNo: isComercio || category === 'farmacia' || isWoodWorkshop,
        cantidad: isComercio || category === 'farmacia' || isWoodWorkshop ? 2 : 0,
        estado: 'BUENO'
      },
      tanquesGas: { siNo: isFood && gasTanqueMovil, cantidad: isFood && gasTanqueMovil ? 2 : 0, estado: 'BUENO' },
      subdivisiones: { siNo: isOffice, cantidad: isOffice ? 2 : 0, estado: 'BUENO' },
      recomendaciones:
        category === 'cenotes'
          ? 'FIJAR LOS ESTANTES DE CHALECOS SALVAVIDAS Y LOCKERS DE VISITANTES A LOS MUROS PARA EVITAR VOLCADURAS.'
          : 'FIJAR LOS ESTANTES, VITRINAS Y MUEBLES EXHIBIDOS PESADOS A LOS MUROS PARA EVITAR SU VOLCADURA.'
    },
    acabados: {
      lambrinesIncombustibles: false,
      lambrinesCombustibles: isWoodWorkshop,
      pisosDesniveles: false,
      pisosFalsos: isOffice || category === 'plaza_comercial',
      losetasAzulejos: true,
      cantidadM2: Math.round(m2Val),
      estado: 'BUENO',
      recomendaciones: 'MANTENER LOS ACABADOS LIMPIOS Y EN BUEN ESTADO FÍSICO.'
    },
    equiposEmergencia: {
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
      zonasSeguridad: { siNo: false, cantidad: 0, estado: 'BUENO' }
    },
    otrosRiesgos: {
      inflamar: {
        combustibles:
          category === 'taller_mecanico' ||
          isWoodWorkshop ||
          category === 'tienda_pinturas' ||
          isFood ||
          category === 'centros_recreativos' ||
          category === 'renta_vehiculos' ||
          category === 'bodega',
        solventes:
          category === 'taller_mecanico' ||
          isWoodWorkshop ||
          category === 'tienda_pinturas' ||
          category === 'centros_recreativos' ||
          category === 'renta_vehiculos',
        papelCarton: isOffice || isComercio || category === 'bodega' || isWoodWorkshop,
        recomendaciones: isWoodWorkshop
          ? 'ALMACENAR SOLVENTES Y BARNICES EN GABINETES METÁLICOS Y REALIZAR LIMPIEZA DIARIA DE ASERRÍN Y VIRUTA DE MADERA.'
          : 'MANTENER EL CARTÓN Y PAPEL EN CONTENEDORES CERRADOS.'
      },
      propiciar: {
        cigarros: false,
        colillas: false,
        velas: category === 'spa' || category === 'restaurante',
        instalacionGas: isSpecialGas,
        cafeteras: isOffice || category === 'gimnasio' || isFood,
        contactos: true,
        apagadores: true,
        cablesMalEstado: false,
        microondas: isOffice || isFood || category === 'plaza_comercial',
        recomendaciones: isWoodWorkshop
          ? 'DESCONECTAR MAQUINARIA DE CORTE Y HERRAMIENTAS ELÉCTRICAS AL FINALIZAR LA JORNADA.'
          : 'DESCONECTAR APARATOS ELÉCTRICOS AL CIERRE DE LA JORNADA.'
      },
      obstaculizar: {
        tapetes: isOffice || category === 'hotel',
        macetas: false,
        archiveros: false,
        pizarrones: category === 'escuela',
        muebles: isWoodWorkshop || isComercio,
        equiposLimpieza: false,
        herramientas: isIndustrial,
        puertasCerradas: false,
        lavadoras: category === 'lavanderia',
        bombeo: false,
        recomendaciones: isWoodWorkshop
          ? 'MANTENER RUTAS DE EVACUACIÓN LIBRES DE MUEBLES EN EXHIBICIÓN, MADERA Y HERRAMIENTAS.'
          : 'MANTENER LIBRES LAS RUTAS DE EVACUACIÓN Y SALIDAS DE EMERGENCIA.'
      }
    },
    riesgosExternos: {
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
        tallerSolventes: {
          siNo:
            category === 'tienda_pinturas' ||
            category === 'taller_mecanico' ||
            category === 'taller_muebleria' ||
            category === 'renta_vehiculos',
          distancia:
            category === 'tienda_pinturas' ||
            category === 'taller_mecanico' ||
            category === 'taller_muebleria' ||
            category === 'renta_vehiculos'
              ? '10 MTS'
              : ''
        }
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
    }
  };
}

/**
 * Construye automáticamente los datos de Análisis de Incendio NOM-002 (Pág. 43) basados en m2 y giro.
 */
export function buildDefaultIncendioData(
  docInfo: DocumentInfo,
  m2Num: number,
  empCount: number,
  floatPopOverride?: number
): IncendioPDFData {
  const category = classifyGiroCategory(docInfo.activity || '');
  const m2 = Math.max(10, m2Num || 50);
  const fixedPop = Math.max(1, empCount || docInfo.usuarios || 1);
  const numNiveles = Math.max(1, docInfo.superiores || 1);

  const rawAddress = docInfo.address || '';
  const addrParts = rawAddress.split('|');
  const baseAddress = addrParts[0] ? addrParts[0].trim() : '';
  const cityPart = addrParts[1]?.trim().toUpperCase() || 'PLAYA DEL CARMEN';

  let gases = 0;
  let liqInf = 0;
  let liqComb = 0;
  let solidos = 100;
  let flotante = 3;

  switch (category) {
    case 'restaurante':
      gases = m2 <= 50 ? 50 : m2 <= 120 ? 100 : 200;
      liqComb = m2 <= 50 ? 5 : m2 <= 120 ? 10 : 20;
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
    case 'cenotes':
      liqInf = m2 <= 100 ? 10 : m2 <= 500 ? 30 : 100;
      liqComb = m2 <= 100 ? 20 : m2 <= 500 ? 80 : 250;
      solidos = Math.round(m2 * 12);
      flotante = Math.ceil(m2 / 6);
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
    case 'consultorio':
      liqInf = m2 <= 50 ? 5 : m2 <= 120 ? 15 : 30;
      solidos = Math.round(m2 * 8);
      flotante = Math.ceil(m2 / 15);
      break;
    case 'consultorio_dental':
      liqInf = m2 <= 50 ? 3 : m2 <= 120 ? 10 : 20;
      solidos = Math.round(m2 * 6);
      flotante = Math.ceil(m2 / 15);
      break;
    case 'taller_muebleria':
      gases = 0;
      liqInf = m2 <= 50 ? 40 : m2 <= 120 ? 100 : 250;
      liqComb = m2 <= 50 ? 20 : m2 <= 120 ? 50 : 120;
      solidos = Math.round(m2 * 35);
      flotante = Math.ceil(m2 / 12);
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
    case 'artesanias':
      solidos = Math.round(m2 * 18);
      flotante = Math.ceil(m2 / 8);
      break;
    case 'comercio':
    default:
      solidos = Math.round(m2 * 10);
      flotante = Math.ceil(m2 / 15);
      break;
  }

  let nivel1M2 = String(m2);
  let nivel2M2 = '';
  let nivel3M2 = '';
  if (numNiveles > 1) {
    const porNivel = parseFloat((m2 / numNiveles).toFixed(2));
    const sumaOtros = porNivel * (numNiveles - 1);
    const primerNivel = parseFloat((m2 - sumaOtros).toFixed(2));
    nivel1M2 = String(primerNivel);
    if (numNiveles >= 2) nivel2M2 = String(porNivel);
    if (numNiveles >= 3) nivel3M2 = String(porNivel);
  }

  return {
    companyName: docInfo.company_name || '',
    representativeName: docInfo.company_name || '',
    commercialName: docInfo.commercial_name || '',
    giro: docInfo.activity || 'COMERCIO AL POR MENOR',
    fecha: docInfo.date || '1 DE JUNIO DE 2026',
    direccion: `${baseAddress} | ${cityPart}`,
    sotanoSi: (docInfo.sotanos || 0) > 0,
    sotanoM2: (docInfo.sotanos || 0) > 0 ? String(Math.round(m2 * 0.2)) : '',
    nivel1Si: true,
    nivel1M2,
    nivel2Si: numNiveles >= 2,
    nivel2M2,
    nivel3Si: numNiveles >= 3,
    nivel3M2,
    azoteaSi: false,
    azoteaM2: '',
    m2Construccion: String(m2),
    m2Superficie: String(m2),
    antiguedad: 'N.D.',
    poblacionFija: String(fixedPop),
    poblacionFlotante: String(floatPopOverride || Math.max(1, flotante)),
    gasesInflamables: String(gases),
    liquidosInflamables: String(liqInf),
    liquidosCombustibles: String(liqComb),
    solidosCombustibles: String(solidos),
    materialesPiroforicos: '0'
  };
}

/**
 * Construye automáticamente la matriz de Calendario de Actividades (Pág. 56).
 */
export function buildDefaultCalendarioGrid(dateStr?: string): boolean[][] {
  let docMonth = 0; // Enero por defecto
  if (dateStr && dateStr !== 'UNKNOWN') {
    const dateUpper = dateStr.toUpperCase();
    const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const foundIndex = meses.findIndex(m => dateUpper.includes(m));
    if (foundIndex !== -1) docMonth = foundIndex;
  }

  const grid: boolean[][] = [];
  for (let r = 0; r < ACTIVITIES_LIST.length; r++) {
    const row: boolean[] = new Array(12).fill(false);
    const activity = ACTIVITIES_LIST[r];
    if (activity === 'RENOVACIÓN POLIZA DE SEGURO') {
      row[docMonth] = true;
    } else if (activity.includes('(MENSUAL)') || activity.includes('(DIARIO)')) {
      row.fill(true);
    } else if (
      activity.includes('RECORRIDO DE SEGURIDAD EN EL INMUEBLE (BIMESTRAL)') ||
      activity.includes('PLÁTICAS Y ACCIONES DE DIFUSIÓN REFERENTES A LA PROTECCIÓN CIVIL')
    ) {
      [0, 2, 4, 6, 8, 10].forEach(m => (row[m] = true));
    } else if (activity.includes('SEMESTRAL')) {
      row[docMonth] = true;
      row[(docMonth + 6) % 12] = true;
    } else {
      row[docMonth] = true;
    }
    grid.push(row);
  }
  return grid;
}
