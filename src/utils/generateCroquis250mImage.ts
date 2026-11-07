import { RiskData } from '../types';

export const ESTABLISHMENT_PALETTE = [
  '#16a34a', // 1. Verde vibrante
  '#1d4ed8', // 2. Azul fuerte
  '#dc2626', // 3. Rojo vivo
  '#f59e0b', // 4. Ámbar / Naranja
  '#7c3aed'  // 5. Morado / Violeta
];

const RISK_CATEGORIES = [
  {
    id: 'trafico',
    name: 'Tráfico vehicular',
    color: '#f97316',
    symbolLabel: '🚗'
  },
  {
    id: 'personas',
    name: 'Afluencia de personas',
    color: '#7c3aed',
    symbolLabel: '👥'
  },
  {
    id: 'habitacional',
    name: 'Zona habitacional / área urbana',
    color: '#4b5563',
    symbolLabel: '🏠'
  },
  {
    id: 'comercial',
    name: 'Locales y comercios generales',
    color: '#1d4ed8',
    symbolLabel: '🏪'
  }
];

function mapTypesToCategory(types: string[] = [], name: string = ''): (typeof RISK_CATEGORIES)[number] {
  const norm = name.toLowerCase();
  if (
    types.some((t) =>
      ['bus_station', 'transit_station', 'gas_station', 'intersection', 'subway_station', 'train_station'].includes(t)
    ) ||
    /gasolinera|pemex|combustible|terminal|paradero/.test(norm)
  ) {
    return RISK_CATEGORIES[0]; // trafico
  }
  if (
    types.some((t) =>
      [
        'school',
        'park',
        'church',
        'place_of_worship',
        'tourist_attraction',
        'museum',
        'university',
        'stadium',
        'event_venue',
        'shopping_mall',
        'supermarket'
      ].includes(t)
    ) ||
    /plaza|supermercado|walmart|soriana|chedraui|aurrera|escuela|colegio|hospital/.test(norm)
  ) {
    return RISK_CATEGORIES[1]; // personas
  }
  if (
    types.some((t) =>
      ['lodging', 'hotel', 'real_estate_agency', 'condominium', 'apartment_building', 'neighborhood'].includes(t)
    ) ||
    /hotel|condominio|residencial|departamentos/.test(norm)
  ) {
    return RISK_CATEGORIES[2]; // habitacional
  }
  return RISK_CATEGORIES[3]; // comercial
}

/**
 * Carga una imagen desde cualquier URL (usando /api/proxy-image si es externa) y devuelve un HTMLImageElement listo para dibujar en canvas.
 */
export async function loadCrossOriginImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return null;

  const tryLoad = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return await tryLoad(url);
  }

  // 1. Usar el proxy del backend para evitar bloqueos CORS y convertir a Blob URL local
  const proxyUrl =
    url.startsWith('http://') || url.startsWith('https://')
      ? `/api/proxy-image?url=${encodeURIComponent(url)}`
      : url;

  try {
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const img = await tryLoad(objUrl);
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
      if (img) return img;
    }
  } catch {
    // ignore
  }

  // 2. Fallback directo
  return await tryLoad(url);
}

/**
 * Convierte cualquier foto de un establecimiento (o respalda con Street View / Satélite si falla)
 * en un DataURL JPEG cuadrado (object-fit: cover) garantizado para jsPDF.
 */
export async function resolveRiskPhotoAsJpegDataUrl(
  risk: RiskData,
  mapsApiKey: string,
  fallbackLat: number,
  fallbackLng: number
): Promise<string | null> {
  const lat = typeof risk.lat === 'number' && !isNaN(risk.lat) ? risk.lat : fallbackLat;
  const lng = typeof risk.lng === 'number' && !isNaN(risk.lng) ? risk.lng : fallbackLng;

  let img: HTMLImageElement | null = null;

  // 1. Intentar con risk.photoUri si existe
  if (risk.photoUri) {
    img = await loadCrossOriginImage(risk.photoUri);
  }

  // 2. Si no cargó (ej. token expirado de Google Places), usar Street View o Satélite con la API key
  if (!img && mapsApiKey && !isNaN(lat) && !isNaN(lng)) {
    try {
      const metaRes = await fetch(
        `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=120&source=outdoor&key=${mapsApiKey}`
      );
      const metaData = await metaRes.json();
      if (metaData?.status === 'OK') {
        const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&radius=120&source=outdoor&key=${mapsApiKey}`;
        img = await loadCrossOriginImage(svUrl);
      } else {
        const metaResDef = await fetch(
          `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=120&key=${mapsApiKey}`
        );
        const metaDataDef = await metaResDef.json();
        if (metaDataDef?.status === 'OK') {
          const svUrlDef = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&radius=120&key=${mapsApiKey}`;
          img = await loadCrossOriginImage(svUrlDef);
        }
      }
    } catch {
      // ignore
    }

    if (!img) {
      const satUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=400x400&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${mapsApiKey}`;
      img = await loadCrossOriginImage(satUrl);
    }
  }

  if (!img) return null;

  // Renderizar en un canvas cuadrado 300x300 con object-fit: cover y exportar siempre como JPEG válido
  const size = 300;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const iw = img.naturalWidth || img.width || size;
  const ih = img.naturalHeight || img.height || size;
  const scale = Math.max(size / iw, size / ih);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Calcula la distancia en metros entre dos coordenadas GPS (Fórmula de Haversine).
 */
export function computeDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Asegura que la librería Google Maps JS (places) esté cargada en el navegador.
 */
async function ensureGooglePlacesLibrary(mapsApiKey: string): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  const w = window as any;

  if (w.google?.maps?.importLibrary) {
    try {
      return await w.google.maps.importLibrary('places');
    } catch {
      // continue to script fallback
    }
  }

  if (w.google?.maps?.places?.Place) {
    return w.google.maps.places;
  }

  // Inyectar script de Google Maps JS si aún no se ha cargado
  await new Promise<void>((resolve) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      let checks = 0;
      const timer = setInterval(() => {
        checks++;
        if (w.google?.maps?.importLibrary || w.google?.maps?.places || checks > 40) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      mapsApiKey
    )}&libraries=places,geometry&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });

  if (w.google?.maps?.importLibrary) {
    try {
      return await w.google.maps.importLibrary('places');
    } catch {
      // ignore
    }
  }
  return w.google?.maps?.places || null;
}

/**
 * Busca y evalúa automáticamente los 5 establecimientos circundantes reales en un radio de 250 m
 * para las coordenadas indicadas (usando Google Places + análisis de Protección Civil / IA),
 * y actualiza la caché local para mantener sincronizados todos los modales.
 */
export async function discoverSurroundingRisksForCoords(
  lat: number,
  lng: number,
  mapsApiKey: string,
  excludeEstablishmentName?: string
): Promise<RiskData[]> {
  if (isNaN(lat) || isNaN(lng) || !mapsApiKey) return [];

  try {
    const placesLib = await ensureGooglePlacesLibrary(mapsApiKey);
    const center = { lat, lng };
    const rawPlaces: any[] = [];

    if (placesLib?.Place?.searchNearby) {
      const distanceRank =
        (placesLib.SearchNearbyRankPreference && placesLib.SearchNearbyRankPreference.DISTANCE) ||
        'DISTANCE';

      const [critRes, foodRes, genRes] = await Promise.allSettled([
        placesLib.Place.searchNearby({
          fields: ['displayName', 'location', 'photos', 'types'],
          locationRestriction: { center, radius: 250 },
          rankPreference: distanceRank,
          includedTypes: [
            'gas_station',
            'shopping_mall',
            'supermarket',
            'department_store',
            'school',
            'hospital',
            'car_repair',
            'hardware_store'
          ],
          maxResultCount: 20
        }),
        placesLib.Place.searchNearby({
          fields: ['displayName', 'location', 'photos', 'types'],
          locationRestriction: { center, radius: 250 },
          rankPreference: distanceRank,
          includedTypes: [
            'restaurant',
            'fast_food_restaurant',
            'meal_takeaway',
            'bakery',
            'cafe',
            'bar'
          ],
          maxResultCount: 20
        }),
        placesLib.Place.searchNearby({
          fields: ['displayName', 'location', 'photos', 'types'],
          locationRestriction: { center, radius: 250 },
          rankPreference: distanceRank,
          maxResultCount: 20
        })
      ]);

      if (critRes.status === 'fulfilled' && critRes.value?.places) {
        rawPlaces.push(...critRes.value.places);
      }
      if (foodRes.status === 'fulfilled' && foodRes.value?.places) {
        rawPlaces.push(...foodRes.value.places);
      }
      if (genRes.status === 'fulfilled' && genRes.value?.places) {
        rawPlaces.push(...genRes.value.places);
      }

      if (typeof placesLib.Place.searchByText === 'function') {
        const [gasText, plazaText] = await Promise.allSettled([
          placesLib.Place.searchByText({
            textQuery: 'gasolinera',
            locationBias: { center, radius: 250 },
            fields: ['displayName', 'location', 'photos', 'types'],
            maxResultCount: 5
          }),
          placesLib.Place.searchByText({
            textQuery: 'plaza comercial',
            locationBias: { center, radius: 250 },
            fields: ['displayName', 'location', 'photos', 'types'],
            maxResultCount: 5
          })
        ]);
        if (gasText.status === 'fulfilled' && gasText.value?.places) {
          rawPlaces.push(...gasText.value.places);
        }
        if (plazaText.status === 'fulfilled' && plazaText.value?.places) {
          rawPlaces.push(...plazaText.value.places);
        }
      }
    }

    // Deduplicar candidatos y calcular puntaje de Protección Civil
    const mergedMap = new Map<string, any>();
    rawPlaces.forEach((p) => {
      if (!p || !p.location) return;
      const pLat = typeof p.location.lat === 'function' ? p.location.lat() : p.location.lat;
      const pLng = typeof p.location.lng === 'function' ? p.location.lng() : p.location.lng;
      if (typeof pLat !== 'number' || typeof pLng !== 'number') return;
      const nameStr = (p.displayName || '').toString().trim();
      if (!nameStr) return;
      const key = `${nameStr.toLowerCase()}_${pLat.toFixed(4)}_${pLng.toFixed(4)}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { raw: p, name: nameStr, lat: pLat, lng: pLng, types: p.types || [] });
      }
    });

    const excludeNorm = (excludeEstablishmentName || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    interface ScoredCandidate {
      raw: any;
      name: string;
      lat: number;
      lng: number;
      types: string[];
      distanceMeters: number;
      isGasStation: boolean;
      isPlaza: boolean;
      isFood: boolean;
      isHighImpact: boolean;
      isConsultorioOrOffice: boolean;
      score: number;
    }

    const candidates: ScoredCandidate[] = [];
    mergedMap.forEach((item) => {
      const normName = item.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (excludeNorm && (normName.includes(excludeNorm) || excludeNorm.includes(normName))) {
        return;
      }

      const distanceMeters = computeDistanceMeters(lat, lng, item.lat, item.lng);
      if (distanceMeters > 260) return;

      const types: string[] = item.types || [];
      const isConsultorioOrOffice =
        /psicolog|psiquiatr|dentist|dental|consultorio|dr\b|dra\b|doctor\b|doctora\b|nutriolog|podolog|terapia|optica|pediatra|ginecolog|cardiolog|dermatolog|homeopat|notaria|despacho|abogad|contador/i.test(
          normName
        ) &&
        !/hospital|sanatorio|cruz\s*roja|urgencias|centro\s*medico|clinica\s*de\s*especialidades|clinica\s*hospital/i.test(
          normName
        );

      const isGasStation =
        types.includes('gas_station') ||
        /gasolinera|gasolin|combustible|pemex|oxxo\s*gas|bp\b|shell\b|mobil\b|g500|hidrosina|totalenergies|gas\s*lp|gasera|estacion\s*de\s*servicio|subestacion/i.test(
          normName
        );

      const isPlaza =
        (types.includes('shopping_mall') ||
          /plaza\b|plazita|centro\s*comercial|mall\b|galeria|galerias|pabellon|pasaje\s*comercial|gran\s*plaza|macroplaza|paseo\b|portal\b/i.test(
            normName
          )) &&
        !isConsultorioOrOffice;

      const isFood =
        (types.some((t) =>
          [
            'restaurant',
            'fast_food_restaurant',
            'hamburger_restaurant',
            'pizza_restaurant',
            'mexican_restaurant',
            'bakery',
            'cafe',
            'bar',
            'meal_takeaway',
            'meal_delivery',
            'food_court'
          ].includes(t)
        ) ||
          /restaurante|cocina|fonda|taqueria|pizzeria|panaderia|cafe|mariscos|asador|carnitas|burguer|burger|tacos|comida|alitas|papas|subway|domino|kfc|pizza|mcdonald|tortas|antojitos|hamburgues/i.test(
            normName
          )) &&
        !isConsultorioOrOffice;

      const isHighImpact =
        isPlaza ||
        types.some((t) => ['supermarket', 'school', 'car_repair', 'hardware_store', 'hospital'].includes(t)) ||
        (!isConsultorioOrOffice &&
          /supermercado|bodega\s*aurrera|walmart|soriana|chedraui|taller|mecanic|hojalater|soldadur|ferreter|maderer|colegio|escuela|instituto|universidad|hospital/i.test(
            normName
          ));

      let hazardBonus = 50;
      if (isGasStation) hazardBonus = 800;
      else if (isPlaza) hazardBonus = 420;
      else if (isFood) hazardBonus = distanceMeters <= 35 ? 460 : 320;
      else if (isHighImpact) hazardBonus = 260;
      else if (isConsultorioOrOffice) hazardBonus = 15;

      const score = hazardBonus + Math.max(0, 250 - distanceMeters) * 3;
      candidates.push({
        raw: item.raw,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        types,
        distanceMeters,
        isGasStation,
        isPlaza,
        isFood,
        isHighImpact,
        isConsultorioOrOffice,
        score
      });
    });

    if (candidates.length === 0) return [];

    // Seleccionar los 5 principales riesgos igual que en GeoRiesgosModal
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const selected: ScoredCandidate[] = [];
    const usedNames = new Set<string>();
    const addCand = (c: ScoredCandidate) => {
      const k = c.name.toLowerCase().trim();
      if (!usedNames.has(k)) {
        selected.push(c);
        usedNames.add(k);
        return true;
      }
      return false;
    };

    const gas = sorted.filter((c) => c.isGasStation).sort((a, b) => a.distanceMeters - b.distanceMeters);
    if (gas.length > 0) addCand(gas[0]);

    const plz = sorted.filter((c) => c.isPlaza).sort((a, b) => a.distanceMeters - b.distanceMeters);
    if (plz.length > 0 && selected.length < 5) addCand(plz[0]);

    const closeFood = sorted
      .filter((c) => c.isFood && c.distanceMeters <= 60)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
    if (closeFood.length > 0 && selected.length < 5) addCand(closeFood[0]);

    let foodCount = selected.filter((s) => s.isFood).length;
    for (const c of sorted) {
      if (selected.length >= 5) break;
      if (usedNames.has(c.name.toLowerCase().trim())) continue;
      if (c.isFood && foodCount >= 2) {
        const hasNonFood = sorted.some(
          (o) => !o.isFood && !o.isConsultorioOrOffice && !usedNames.has(o.name.toLowerCase().trim())
        );
        if (hasNonFood) continue;
      }
      if (addCand(c) && c.isFood) foodCount++;
    }
    for (const c of sorted) {
      if (selected.length >= 5) break;
      addCand(c);
    }

    const finalSelected = selected.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Resolver foto y descripción técnica para cada uno de los 5 lugares
    const placesPayload = await Promise.all(
      finalSelected.map(async (c) => {
        let photoUri: string | undefined;
        if (c.raw?.photos && c.raw.photos.length > 0) {
          try {
            photoUri = c.raw.photos[0].getURI({ maxWidth: 400 });
          } catch {
            photoUri = undefined;
          }
        }
        if (!photoUri) {
          photoUri = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${c.lat},${c.lng}&radius=120&source=outdoor&key=${mapsApiKey}`;
        }

        // Respaldo técnico determinista por si la IA tarda o no responde
        let fallbackLevel: 'Alto' | 'Medio' | 'Bajo' = 'Bajo';
        let fallbackDesc = `Establecimiento comercial ubicado a ${c.distanceMeters} metros con afluencia moderada de personas y riesgo eléctrico ordinario por instalaciones comerciales.`;
        if (c.isGasStation) {
          fallbackLevel = 'Alto';
          fallbackDesc = `Riesgo químico-tecnológico alto por almacenamiento y despacho de hidrocarburos a ${c.distanceMeters} metros, con potencial de fuga, incendio o explosión y flujo vehicular constante.`;
        } else if (c.isPlaza || c.isHighImpact) {
          fallbackLevel = c.distanceMeters <= 40 ? 'Alto' : 'Medio';
          fallbackDesc = `Riesgo socio-organizativo y de tránsito vehicular a ${c.distanceMeters} metros por concentración de personas, carga de fuego comercial e instalaciones eléctricas de media capacidad.`;
        } else if (c.isFood) {
          fallbackLevel = c.distanceMeters <= 30 ? 'Alto' : 'Medio';
          fallbackDesc = `Riesgo químico-tecnológico de incendio o fuga a ${c.distanceMeters} metros por uso de instalaciones de Gas L.P. comercial, cocción a flama abierta y equipos térmicos.`;
        }

        return {
          name: c.name,
          distance: `${c.distanceMeters} MTS`,
          types: c.types,
          lat: c.lat,
          lng: c.lng,
          photoUri,
          riskLevel: fallbackLevel,
          riskDescription: fallbackDesc
        };
      })
    );

    // Consultar /api/analyze-risks para enriquecer las descripciones con IA
    let enriched: RiskData[] = placesPayload;
    try {
      const res = await fetch('/api/analyze-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: placesPayload })
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          enriched = placesPayload.map((base, idx) => {
            const matched =
              data.results.find(
                (r: any) => (r.name || '').toLowerCase().trim() === base.name.toLowerCase().trim()
              ) || data.results[idx];
            return {
              ...base,
              riskLevel: matched?.riskLevel || base.riskLevel,
              riskDescription: matched?.riskDescription || base.riskDescription
            };
          });
        }
      }
    } catch {
      // Usa el respaldo determinista ya calculado
    }

    // Guardar en localStorage para mantener sincronizado GeoRiesgos, Croquis y PIPC
    try {
      localStorage.setItem(
        'circundantes_places_cache',
        JSON.stringify({
          center: { lat, lng },
          establishment: excludeEstablishmentName || '',
          places: enriched,
          updatedAt: Date.now()
        })
      );
    } catch {
      // ignore
    }

    return enriched;
  } catch (err) {
    console.warn('Error en discoverSurroundingRisksForCoords:', err);
    return [];
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Genera el diseño oficial "RIESGOS CIRCUNDANTES A 250 M A LA REDONDA" (idéntico a CroquisRiesgosModal)
 * en un DataURL JPEG de alta resolución (1960x1480).
 */
export async function generateCroquis250mDataUrl(params: {
  lat: number;
  lng: number;
  places: RiskData[];
  mapsApiKey: string;
}): Promise<string | null> {
  const { lat, lng, places, mapsApiKey } = params;
  if (isNaN(lat) || isNaN(lng) || !mapsApiKey) return null;

  const W = 980;
  const H = 740;
  const SCALE = 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  // Fondo general
  ctx.fillStyle = '#0c1a30';
  ctx.fillRect(0, 0, W, H);

  const headerH = 52;
  const footerH = 48;
  const bodyY = headerH;
  const bodyH = H - headerH - footerH; // 640
  const panelW = 330;
  const mapW = W - panelW; // 650

  // 1. Descargar el mapa satelital híbrido de Google Static Maps (zoom 16 para cubrir los 250m a la redonda con claridad)
  const zoom = 16;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${mapW}x${bodyH}&scale=2&maptype=hybrid&key=${mapsApiKey}`;
  const mapImg = await loadCrossOriginImage(staticMapUrl);

  // Área del mapa
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, bodyY, mapW, bodyH);
  ctx.clip();

  if (mapImg) {
    ctx.drawImage(mapImg, 0, bodyY, mapW, bodyH);
  } else {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, bodyY, mapW, bodyH);
  }

  const mapCenterX = mapW / 2;
  const mapCenterY = bodyY + bodyH / 2;

  // Escala Web Mercator en metros por píxel CSS para este zoom y latitud
  const d2r = Math.PI / 180;
  const metersPerPx = (156543.03392 * Math.cos(lat * d2r)) / Math.pow(2, zoom);
  const radiusMeters = 250;
  const radiusPx = radiusMeters / metersPerPx;

  // Función para proyectar (lat, lng) a coordenadas (x, y) dentro del mapa
  const latLngToPoint = (pLat: number, pLng: number) => {
    const dLatM = (pLat - lat) * 111320;
    const dLngM = (pLng - lng) * 111320 * Math.cos(lat * d2r);
    return {
      x: mapCenterX + dLngM / metersPerPx,
      y: mapCenterY - dLatM / metersPerPx
    };
  };

  // 2. Círculo rojo de 250m a la redonda
  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY, radiusPx, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(220, 38, 38, 0.07)';
  ctx.fill();
  ctx.lineWidth = 5.5;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();

  // 3. Línea punteada de acotación (radio a 45° Noreste) + etiqueta "250 m"
  const angleRad = 45 * d2r;
  const edgeX = mapCenterX + radiusPx * Math.cos(angleRad);
  const edgeY = mapCenterY - radiusPx * Math.sin(angleRad);

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([7, 6]);
  ctx.moveTo(mapCenterX, mapCenterY);
  ctx.lineTo(edgeX, edgeY);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();
  ctx.restore();

  // Etiqueta "250 m" con borde blanco para máxima legibilidad sobre satélite
  ctx.font = '900 16px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('250 m', edgeX + 10, edgeY - 10);
  ctx.fillStyle = '#dc2626';
  ctx.fillText('250 m', edgeX + 10, edgeY - 10);

  // Helper para dibujar el ícono vectorial blanco (SVG Path2D de 24x24) de Simbología de Riesgos
  const drawCategoryVectorIcon = (
    cx: number,
    cy: number,
    catId: string,
    scaleFactor = 0.65
  ) => {
    ctx.save();
    ctx.translate(cx - 12 * scaleFactor, cy - 12 * scaleFactor);
    ctx.scale(scaleFactor, scaleFactor);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (catId === 'trafico') {
      const p1 = new Path2D(
        'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2 M9 17h6 M5 12h14'
      );
      ctx.stroke(p1);
      ctx.beginPath();
      ctx.arc(7, 17, 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(17, 17, 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (catId === 'personas') {
      const p1 = new Path2D(
        'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75'
      );
      ctx.stroke(p1);
      ctx.beginPath();
      ctx.arc(9, 7, 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (catId === 'habitacional') {
      const p1 = new Path2D('m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10');
      ctx.stroke(p1);
    } else {
      // comercial
      const p1 = new Path2D(
        'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7 M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4 M2 7h20'
      );
      ctx.stroke(p1);
    }
    ctx.restore();
  };

  // Helper para dibujar un marcador de Simbología de Riesgos (círculo + ícono vectorial blanco)
  const drawRiskSymbolMarker = (mx: number, my: number, color: string, catId: string, r = 13) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    drawCategoryVectorIcon(mx, my, catId, (r / 13) * 0.62);
  };

  // Helper para dibujar los PUNTITOS / CÍRCULOS DE COLOR de los Establecimientos Circundantes
  const drawEstablishmentColorDot = (mx: number, my: number, color: string, r = 13) => {
    ctx.save();
    // Halo exterior oscuro para contraste sobre cualquier techo o calle satelital
    ctx.beginPath();
    ctx.arc(mx, my, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  };

  // Resolver lista de establecimientos verificando que realmente pertenezcan a estas coordenadas (radio <= 450m)
  const isNearTarget = (p: RiskData) => {
    if (typeof p.lat === 'number' && typeof p.lng === 'number' && !isNaN(p.lat) && !isNaN(p.lng)) {
      return computeDistanceMeters(lat, lng, p.lat, p.lng) <= 450;
    }
    return true;
  };

  let effectivePlaces: RiskData[] = Array.isArray(places)
    ? places.filter(isNearTarget).slice(0, 5)
    : [];

  if (effectivePlaces.length === 0) {
    try {
      const cachedRaw = localStorage.getItem('circundantes_places_cache');
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        const cacheLat = Number(parsed?.center?.lat);
        const cacheLng = Number(parsed?.center?.lng);
        const cacheNear =
          !isNaN(cacheLat) &&
          !isNaN(cacheLng) &&
          computeDistanceMeters(lat, lng, cacheLat, cacheLng) <= 450;
        if (cacheNear && Array.isArray(parsed?.places) && parsed.places.length > 0) {
          effectivePlaces = parsed.places.filter(isNearTarget).slice(0, 5);
        }
      }
    } catch {
      // ignore
    }
  }

  // Si las coordenadas son nuevas y no hay establecimientos de esta zona, buscarlos automáticamente en Google Places
  if (effectivePlaces.length === 0) {
    effectivePlaces = await discoverSurroundingRisksForCoords(lat, lng, mapsApiKey);
  }
  const topPlaces = effectivePlaces.slice(0, 5);

  // 4. Marcadores programáticos de Simbología de Riesgos (Tráfico, Zona habitacional, Afluencia)
  const progMarkers = [
    { lat: lat + 0.00065, lng: lng + 0.00065, cat: RISK_CATEGORIES[0] },
    { lat: lat - 0.00065, lng: lng - 0.00065, cat: RISK_CATEGORIES[0] },
    { lat: lat + 0.00085, lng: lng - 0.00085, cat: RISK_CATEGORIES[2] },
    { lat: lat - 0.00085, lng: lng + 0.00085, cat: RISK_CATEGORIES[2] },
    { lat: lat - 0.00035, lng: lng + 0.00095, cat: RISK_CATEGORIES[1] }
  ];

  const occupiedPoints: { x: number; y: number }[] = [];
  progMarkers.forEach((pm) => {
    const pt = latLngToPoint(pm.lat, pm.lng);
    occupiedPoints.push(pt);
    drawRiskSymbolMarker(pt.x, pt.y, pm.cat.color, pm.cat.id, 13);
  });

  // 5. Puntitos / Círculos de color de los Establecimientos Circundantes (hasta 5)
  // Siempre garantizados DENTRO del círculo rojo de 250m (entre 38px y 80% del radio) y bien separados
  const defaultAngles = [-65, 15, 95, 165, -145].map((deg) => deg * d2r);
  const defaultRadii = [44, 58, 48, 64, 52];
  const placedDots: { x: number; y: number }[] = [];
  const maxAllowedRadius = Math.max(68, radiusPx * 0.78);
  const minAllowedRadius = 38;

  topPlaces.forEach((place, idx) => {
    const color = ESTABLISHMENT_PALETTE[idx % ESTABLISHMENT_PALETTE.length];

    let angle = defaultAngles[idx % defaultAngles.length];
    let targetDist = Math.min(maxAllowedRadius, defaultRadii[idx % defaultRadii.length]);

    if (
      typeof place.lat === 'number' &&
      typeof place.lng === 'number' &&
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng)
    ) {
      const rawPt = latLngToPoint(place.lat, place.lng);
      const dx = rawPt.x - mapCenterX;
      const dy = rawPt.y - mapCenterY;
      const rawDist = Math.hypot(dx, dy);

      // Si las coordenadas del lugar pertenecen a esta misma zona (dentro de ~300m del centro),
      // usamos su orientación real y ajustamos la distancia para que quede dentro del círculo y lejos del pin central
      if (rawDist >= 3 && rawDist <= radiusPx * 1.25) {
        angle = Math.atan2(dy, dx);
        targetDist = Math.max(minAllowedRadius, Math.min(maxAllowedRadius, rawDist));
      }
    }

    let pt = {
      x: mapCenterX + Math.cos(angle) * targetDist,
      y: mapCenterY + Math.sin(angle) * targetDist
    };

    // Evitar que dos círculos de color de establecimientos se encimen entre sí o con un ícono de riesgo
    let attempts = 0;
    while (attempts < 24) {
      const collidesWithDot = placedDots.some(
        (other) => Math.hypot(other.x - pt.x, other.y - pt.y) < 30
      );
      const collidesWithProg = occupiedPoints.some(
        (other) => Math.hypot(other.x - pt.x, other.y - pt.y) < 28
      );
      if (!collidesWithDot && !collidesWithProg) break;

      attempts++;
      const shiftAngle = angle + attempts * 0.48;
      const shiftRadius = Math.min(
        maxAllowedRadius,
        minAllowedRadius + ((targetDist - minAllowedRadius + attempts * 6) % (maxAllowedRadius - minAllowedRadius))
      );
      pt = {
        x: mapCenterX + Math.cos(shiftAngle) * shiftRadius,
        y: mapCenterY + Math.sin(shiftAngle) * shiftRadius
      };
    }

    placedDots.push({ x: pt.x, y: pt.y });
    drawEstablishmentColorDot(pt.x, pt.y, color, 13);
  });

  // 6. Pin central rojo del establecimiento evaluado
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#dc2626';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY - 12, 9, Math.PI, 0, false);
  ctx.lineTo(mapCenterX, mapCenterY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(mapCenterX, mapCenterY - 12, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#7f1d1d';
  ctx.fill();
  ctx.restore();

  // 7. Rosa de los vientos / Norte (Esquina superior derecha del mapa)
  const compX = mapW - 58;
  const compY = bodyY + 16;
  const compW = 42;
  const compH = 52;
  ctx.save();
  drawRoundedRect(ctx, compX, compY, compW, compH, 8);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();

  // Círculo de brújula
  const ccx = compX + compW / 2;
  const ccy = compY + 20;
  ctx.beginPath();
  ctx.arc(ccx, ccy, 11, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  // Aguja norte
  ctx.beginPath();
  ctx.moveTo(ccx, ccy - 7);
  ctx.lineTo(ccx + 4, ccy + 4);
  ctx.lineTo(ccx, ccy + 1);
  ctx.lineTo(ccx - 4, ccy + 4);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('N', ccx, compY + 42);
  ctx.restore();

  ctx.restore(); // Fin clip mapa

  // =========================================================================
  // PANEL DERECHO: ESTABLECIMIENTOS (250 M) + SIMBOLOGÍA DE RIESGOS
  // =========================================================================
  const panelX = mapW;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(panelX, bodyY, panelW, bodyH);

  // Borde rojo vertical izquierdo del panel
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(panelX, bodyY, 4, bodyH);

  const pad = 12;
  const innerX = panelX + 4 + pad;
  const innerW = panelW - 4 - pad * 2; // 302

  // --- Caja 1: ESTABLECIMIENTOS (250 M) ---
  const box1Y = bodyY + 12;
  const itemH = 46;
  const box1H = 44 + Math.max(1, topPlaces.length) * (itemH + 6) + 8;

  drawRoundedRect(ctx, innerX, box1Y, innerW, box1H, 8);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1e3a8a';
  ctx.stroke();

  // Encabezado Caja 1
  ctx.font = '900 12px Arial, sans-serif';
  ctx.fillStyle = '#172554';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ESTABLECIMIENTOS (250 M)', innerX + 10, box1Y + 20);

  // Pill contador
  const countStr = String(topPlaces.length);
  drawRoundedRect(ctx, innerX + innerW - 34, box1Y + 11, 24, 18, 9);
  ctx.fillStyle = '#1e3a8a';
  ctx.fill();
  ctx.font = '900 10px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(countStr, innerX + innerW - 22, box1Y + 20);

  // Línea divisoria azul Caja 1
  ctx.beginPath();
  ctx.moveTo(innerX + 10, box1Y + 34);
  ctx.lineTo(innerX + innerW - 10, box1Y + 34);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1e3a8a';
  ctx.stroke();

  // Lista de establecimientos
  let curItemY = box1Y + 42;
  topPlaces.forEach((place, idx) => {
    const color = ESTABLISHMENT_PALETTE[idx % ESTABLISHMENT_PALETTE.length];
    const cat = mapTypesToCategory(place.types, place.name);

    drawRoundedRect(ctx, innerX + 8, curItemY, innerW - 16, itemH, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#dbeafe';
    ctx.stroke();

    // Círculo sólido del color del establecimiento (idéntico al puntito de color en el mapa)
    const cx = innerX + 26;
    const cy = curItemY + itemH / 2;
    drawEstablishmentColorDot(cx, cy, color, 11);

    // Nombre truncado si es muy largo
    ctx.font = '900 11.5px Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    const maxTextW = innerW - 62;
    let title = place.name || `Establecimiento ${idx + 1}`;
    while (ctx.measureText(title).width > maxTextW && title.length > 4) {
      title = title.slice(0, -2) + '…';
    }
    ctx.fillText(title, innerX + 44, curItemY + 16);

    // Subtítulo categoría + distancia
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillStyle = '#6b7280';
    const distClean = (place.distance || '').replace(/MTS/i, 'm');
    const sub = `${cat.name}${distClean ? ` • ${distClean}` : ''}`;
    let subTrunc = sub;
    while (ctx.measureText(subTrunc).width > maxTextW && subTrunc.length > 4) {
      subTrunc = subTrunc.slice(0, -2) + '…';
    }
    ctx.fillText(subTrunc, innerX + 44, curItemY + 32);

    curItemY += itemH + 6;
  });

  // --- Caja 2: SIMBOLOGÍA DE RIESGOS ---
  const box2Y = box1Y + box1H + 12;
  const box2H = bodyY + bodyH - box2Y - 12;

  drawRoundedRect(ctx, innerX, box2Y, innerW, box2H, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1e3a8a';
  ctx.stroke();

  ctx.font = '900 12px Arial, sans-serif';
  ctx.fillStyle = '#172554';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SIMBOLOGÍA DE RIESGOS', innerX + innerW / 2, box2Y + 22);

  ctx.beginPath();
  ctx.moveTo(innerX + 12, box2Y + 36);
  ctx.lineTo(innerX + innerW - 12, box2Y + 36);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1e3a8a';
  ctx.stroke();

  const availCatH = box2H - 46;
  const catStep = availCatH / RISK_CATEGORIES.length;

  RISK_CATEGORIES.forEach((cat, idx) => {
    const cy = box2Y + 46 + catStep * idx + catStep / 2;
    const cx = innerX + 26;

    drawRiskSymbolMarker(cx, cy, cat.color, cat.id, 14);

    ctx.font = '800 11.5px Arial, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat.name, innerX + 48, cy);
  });

  // =========================================================================
  // BANNER SUPERIOR E INFERIOR
  // =========================================================================
  // Banner Superior
  ctx.fillStyle = '#0B152A';
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, headerH - 4, W, 4);

  ctx.font = '900 23px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RIESGOS CIRCUNDANTES A 250 M A LA REDONDA', W / 2, (headerH - 4) / 2 + 1);

  // Banner Inferior (Coordenadas)
  const footY = H - footerH;
  ctx.fillStyle = '#0B152A';
  ctx.fillRect(0, footY, W, footerH);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, footY, W, 4);

  ctx.font = 'bold 15.5px "Courier New", monospace';
  ctx.fillStyle = '#bfdbfe';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`COORDENADAS: ${lat.toFixed(15)}, ${lng.toFixed(15)}`, W / 2, footY + 4 + (footerH - 4) / 2);

  // Borde exterior negro
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(0, 0, W, H);

  return canvas.toDataURL('image/jpeg', 0.92);
}

