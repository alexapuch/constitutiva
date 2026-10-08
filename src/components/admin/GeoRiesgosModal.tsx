import { useState, useEffect } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { X, MapPin, ShieldAlert, AlertCircle, Map as MapIcon } from 'lucide-react';
import { RiskData } from '../../types';

const HEADER_COLORS = [
  { name: 'Guinda (Defecto)', value: '#7b1f1c' },
  { name: 'Azul Seprisa', value: '#0B152A' },
  { name: 'Azul Marino', value: '#1e3a8a' },
  { name: 'Verde Seguridad', value: '#16a34a' },
  { name: 'Amarillo Cuidado', value: '#ca8a04' },
  { name: 'Púrpura', value: '#6b21a8' },
  { name: 'Negro', value: '#000000' }
];
export interface EvaluatedCandidate {
  rawPlace: any;
  name: string;
  types: string[];
  lat: number;
  lng: number;
  distanceMeters: number;
  isGasStation: boolean;
  isHighImpact: boolean;
  isFood: boolean;
  isPlaza: boolean;
  isConsultorioOrOffice: boolean;
  score: number;
}

export function evaluatePlaceCandidate(
  rawPlace: any,
  center: { lat: number; lng: number },
  geometryLib: any
): EvaluatedCandidate | null {
  if (!rawPlace || !rawPlace.location) return null;

  const distanceMeters = Math.round(geometryLib.spherical.computeDistanceBetween(center, rawPlace.location));
  // Limitar estrictamente dentro de ~260m (250m con pequeña tolerancia de GPS)
  if (distanceMeters > 260) return null;

  const name = rawPlace.displayName || 'Establecimiento desconocido';
  const types: string[] = rawPlace.types || [];
  const normName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Detección de consultorios privados / doctores / psicólogos / oficinas administrativas
  // En Protección Civil mexicana estos son giros de BAJO RIESGO ordinario (sin Gas LP, sin químicos, sin flama abierta, afluencia mínima).
  // Google Places suele clasificarlos bajo 'hospital' o 'health', lo que provocaba falsos positivos de alto impacto.
  const isConsultorioOrOffice =
    /psicolog|psiquiatr|dentist|dental|consultorio|dr\b|dra\b|doctor\b|doctora\b|nutriolog|podolog|terapia|optica|pediatra|ginecolog|cardiolog|dermatolog|homeopat|notaria|despacho|abogad|contador/i.test(normName) &&
    !/hospital|sanatorio|cruz\s*roja|urgencias|centro\s*medico|clinica\s*de\s*especialidades|clinica\s*hospital/i.test(normName);

  // 2. Gasolinera / Combustibles / Gas L.P. / Subestaciones (Máximo riesgo tecnológico en Protección Civil)
  const isGasStation = types.includes('gas_station') ||
    /gasolinera|gasolin|combustible|pemex|oxxo\s*gas|bp\b|shell\b|mobil\b|g500|hidrosina|totalenergies|gas\s*lp|gasera|estacion\s*de\s*servicio|subestacion/i.test(normName);

  // 3. Plazas Comerciales / Centros Comerciales / Malls (Alto riesgo socio-organizativo, evacuación masiva, subestación y gas central)
  const isPlaza = (types.includes('shopping_mall') ||
    /plaza\b|plazita|centro\s*comercial|mall\b|galeria|galerias|pabellon|pasaje\s*comercial|gran\s*plaza|macroplaza|paseo\b|portal\b/i.test(normName)) &&
    !isConsultorioOrOffice;

  // 4. Restaurantes / Comida rápida / Taquerías / Alimentos (Riesgo Químico-Tecnológico e Incendio por líneas de Gas L.P., freidoras, campanas y flama abierta)
  const isFood = (types.some(t => [
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
  ].includes(t)) ||
    /restaurante|cocina|fonda|taqueria|pizzeria|panaderia|cafe|mariscos|asador|carnitas|burguer|burger|tacos|comida|alitas|papas|subway|domino|kfc|pizza|mcdonald|chostic|tortas|antojitos|hamburgues/i.test(normName)) &&
    !isConsultorioOrOffice;

  // 5. Verdaderos Hospitales / Clínicas con hospitalización / Urgencias (Población vulnerable / Evacuación compleja)
  const isTrueHospital = types.includes('hospital') &&
    !isConsultorioOrOffice &&
    /hospital|sanatorio|cruz\s*roja|urgencias|centro\s*medico|clinica\s*de\s*especialidades|clinica\s*hospital|imss|issste/i.test(normName);

  // 6. Gran afluencia / Alto Impacto: Plazas, Supermercados, Hospitales reales, Escuelas, Talleres mecánicos, Ferreterías
  const isHighImpact = isPlaza || isTrueHospital ||
    types.some(t => ['supermarket', 'school', 'car_repair', 'hardware_store'].includes(t)) ||
    (!isConsultorioOrOffice && /supermercado|bodega\s*aurrera|walmart|soriana|chedraui|taller|mecanic|hojalater|soldadur|ferreter|maderer|colegio|escuela|instituto|universidad/i.test(normName));

  // Ponderación de Riesgo según Normatividad de Protección Civil:
  let hazardBonus = 50; // Comercio / retail general base
  if (isGasStation) {
    hazardBonus = 800; // Máxima prioridad técnica (Riesgo Químico-Tecnológico)
  } else if (isPlaza) {
    hazardBonus = 420; // Concentración masiva socio-organizativa
  } else if (isFood) {
    // Restaurantes: gran carga de fuego y Gas LP comercial.
    // Si es colindante inmediato (< 35m, ej. Burger King a 5m), el riesgo de propagación e incendio es crítico
    if (distanceMeters <= 35) {
      hazardBonus = 460;
    } else {
      hazardBonus = 320;
    }
  } else if (isHighImpact) {
    hazardBonus = 260;
  } else if (isConsultorioOrOffice) {
    // Consultorios privados / psicólogos / doctores individuales:
    // Riesgo bajo ordinario. Se mantiene un puntaje mínimo (15 pts) para que NUNCA desplacen riesgos reales.
    hazardBonus = 15;
  }

  // Factor de cercanía estricto: la distancia inmediata (5m-30m) pondera fuertemente
  // (250 - d) * 3 pts
  const proximityScore = Math.max(0, 250 - distanceMeters) * 3;
  const score = hazardBonus + proximityScore;

  return {
    rawPlace,
    name,
    types,
    lat: rawPlace.location.lat(),
    lng: rawPlace.location.lng(),
    distanceMeters,
    isGasStation,
    isHighImpact,
    isFood,
    isPlaza,
    isConsultorioOrOffice,
    score
  };
}

export function selectTopRisks(candidates: EvaluatedCandidate[], limit = 5): EvaluatedCandidate[] {
  if (candidates.length <= limit) {
    return [...candidates].sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  // Ordenar todos los candidatos por puntaje de riesgo descendente
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  const selected: EvaluatedCandidate[] = [];
  const selectedKeys = new Set<string>();

  const addCandidate = (c: EvaluatedCandidate) => {
    const key = c.name.toLowerCase().trim();
    if (!selectedKeys.has(key)) {
      selected.push(c);
      selectedKeys.add(key);
      return true;
    }
    return false;
  };

  // Regla 1: Si hay CUALQUIER gasolinera dentro de los 250m, incluir obligatoriamente la más cercana (riesgo químico-tecnológico crítico)
  const gasStations = sorted.filter(c => c.isGasStation).sort((a, b) => a.distanceMeters - b.distanceMeters);
  if (gasStations.length > 0) {
    addCandidate(gasStations[0]);
  }

  // Regla 2: Si el inmueble está en o colindante a una Plaza Comercial / Centro Comercial, incluir obligatoriamente la plaza más cercana
  const plazas = sorted.filter(c => c.isPlaza).sort((a, b) => a.distanceMeters - b.distanceMeters);
  if (plazas.length > 0 && selected.length < limit) {
    addCandidate(plazas[0]);
  }

  // Regla 3: Si hay restaurantes o establecimientos de comida con Gas L.P. inmediatos (< 60m, ej. Burger King contiguo), asegurar el más cercano
  const closeFood = sorted.filter(c => c.isFood && c.distanceMeters <= 60).sort((a, b) => a.distanceMeters - b.distanceMeters);
  if (closeFood.length > 0 && selected.length < limit) {
    addCandidate(closeFood[0]);
  }

  // Regla 4: Llenar los lugares restantes por mayor puntaje, priorizando riesgos reales (comercios, restaurantes, talleres, plazas)
  // sobre consultorios privados o despachos administrativos
  let foodCount = selected.filter(s => s.isFood).length;

  for (const cand of sorted) {
    if (selected.length >= limit) break;
    if (selectedKeys.has(cand.name.toLowerCase().trim())) continue;

    // Si es un consultorio/oficina de bajo riesgo, sólo tomarlo si no hay otros establecimientos disponibles
    if (cand.isConsultorioOrOffice) {
      const remainingRealRisks = sorted.filter(c => !c.isConsultorioOrOffice && !selectedKeys.has(c.name.toLowerCase().trim()));
      if (remainingRealRisks.length > 0) {
        continue; // Dejar para el final
      }
    }

    // Limitar restaurantes a máximo 2 a menos que no haya otros comercios en la zona
    if (cand.isFood && foodCount >= 2) {
      const remainingNonFood = sorted.filter(c => !c.isFood && !c.isConsultorioOrOffice && !selectedKeys.has(c.name.toLowerCase().trim()));
      if (remainingNonFood.length > 0) {
        continue;
      }
    }

    if (addCandidate(cand)) {
      if (cand.isFood) foodCount++;
    }
  }

  // Respaldo de llenado si aún faltan cupos para llegar a 5
  if (selected.length < limit) {
    for (const cand of sorted) {
      if (selected.length >= limit) break;
      addCandidate(cand);
    }
  }

  // Presentación final: ordenados de menor a mayor distancia (el más cercano primero)
  return selected.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

// GeoAnalyzer inside modal
function GeoAnalyzer({ apiKey, onOpenCroquis }: { apiKey: string; onOpenCroquis?: () => void }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [headerColor, setHeaderColor] = useState('#7b1f1c');

  const handleLatChange = (val: string) => {
    if (val.includes(',')) {
      const [latitude, longitude] = val.split(',').map(s => s.trim());
      setLat(latitude || '');
      setLng(longitude || '');
    } else {
      setLat(val);
    }
  };

  const handleLngChange = (val: string) => {
    if (val.includes(',')) {
      const [latitude, longitude] = val.split(',').map(s => s.trim());
      setLat(latitude || '');
      setLng(longitude || '');
    } else {
      setLng(val);
    }
  };
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [myEstablishment, setMyEstablishment] = useState('');
  const [risks, setRisks] = useState<RiskData[]>([]);
  const [error, setError] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const placesLib = useMapsLibrary('places');
  const geometryLib = useMapsLibrary('geometry');

  const handleAnalyze = async () => {
    if (!lat || !lng) {
      setError('Por favor ingresa latitud y longitud.');
      return;
    }
    if (!placesLib || !geometryLib) {
      setError('Librerías de Google Maps no están listas. Intenta en un momento.');
      return;
    }

    setLoading(true);
    setProgress(5);
    setError('');
    setImageErrors({});
    
    try {
      const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
      setProgress(15);
      
      const distanceRank = (placesLib.SearchNearbyRankPreference && placesLib.SearchNearbyRankPreference.DISTANCE) || 'DISTANCE';

      // 1. Búsqueda específica de Riesgos Críticos de Protección Civil (gasolineras, plazas, talleres, escuelas, hospitales)
      let criticalPlaces: any[] = [];
      try {
        const critRes = await placesLib.Place.searchNearby({
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
          maxResultCount: 20,
        });
        criticalPlaces = critRes.places || [];
      } catch (e) {
        console.warn('Búsqueda de tipos específicos omitida:', e);
      }

      setProgress(20);

      // 2. Búsqueda prioritaria de Restaurantes y Alimentos (Riesgo de Gas L.P., freidoras, campanas y flama abierta)
      let foodPlaces: any[] = [];
      try {
        const foodRes = await placesLib.Place.searchNearby({
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
          maxResultCount: 20,
        });
        foodPlaces = foodRes.places || [];
      } catch (e) {
        console.warn('Búsqueda de alimentos omitida:', e);
      }

      setProgress(30);

      // 3. Búsqueda general para capturar establecimientos vecinos inmediatos
      let generalPlaces: any[] = [];
      try {
        const genRes = await placesLib.Place.searchNearby({
          fields: ['displayName', 'location', 'photos', 'types'],
          locationRestriction: { center, radius: 250 },
          rankPreference: distanceRank,
          maxResultCount: 20,
        });
        generalPlaces = genRes.places || [];
      } catch (e) {
        console.warn('Búsqueda general omitida:', e);
      }

      // 4. Búsquedas de respaldo por texto: gasolineras y plazas comerciales
      let textGasPlaces: any[] = [];
      let textPlazaPlaces: any[] = [];
      try {
        if (typeof placesLib.Place.searchByText === 'function') {
          const textRes = await placesLib.Place.searchByText({
            textQuery: 'gasolinera',
            locationBias: { center, radius: 250 },
            fields: ['displayName', 'location', 'photos', 'types'],
            maxResultCount: 5,
          });
          textGasPlaces = textRes.places || [];
        }
      } catch (e) {
        console.warn('Búsqueda por texto gasolinera omitida:', e);
      }

      try {
        if (typeof placesLib.Place.searchByText === 'function') {
          const plazaRes = await placesLib.Place.searchByText({
            textQuery: 'plaza comercial',
            locationBias: { center, radius: 250 },
            fields: ['displayName', 'location', 'photos', 'types'],
            maxResultCount: 5,
          });
          textPlazaPlaces = plazaRes.places || [];
        }
      } catch (e) {
        console.warn('Búsqueda por texto plaza omitida:', e);
      }

      // Consolidar y deduplicar todos los candidatos encontrados
      const mergedMap = new globalThis.Map<string, any>();
      [...criticalPlaces, ...foodPlaces, ...textGasPlaces, ...textPlazaPlaces, ...generalPlaces].forEach(p => {
        if (!p || !p.location) return;
        const key = `${(p.displayName || '').toLowerCase().trim()}_${p.location.lat().toFixed(4)}_${p.location.lng().toFixed(4)}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, p);
        }
      });
      const combinedPlaces = Array.from(mergedMap.values());

      if (combinedPlaces.length === 0) {
        throw new Error('No se encontraron establecimientos cerca de estas coordenadas.');
      }

      // Filtrar el propio negocio del usuario si se especificó
      let filteredPlaces = combinedPlaces;
      if (myEstablishment.trim()) {
        const query = myEstablishment.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        filteredPlaces = combinedPlaces.filter(p => {
          const name = (p.displayName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return !name.includes(query) && !query.includes(name);
        });
      }

      if (filteredPlaces.length === 0) {
        throw new Error('No se encontraron establecimientos circundantes después de filtrar tu negocio.');
      }

      setProgress(40);

      // Evaluar y ponderar todos los candidatos con la fórmula de cercanía y riesgo
      const evaluatedCandidates = filteredPlaces
        .map(p => evaluatePlaceCandidate(p, center, geometryLib))
        .filter((c): c is EvaluatedCandidate => c !== null);

      if (evaluatedCandidates.length === 0) {
        throw new Error('No se encontraron establecimientos dentro del radio de 250 metros.');
      }

      // Seleccionar los 5 mejores riesgos (priorizando gasolineras, plazas y vecinos más cercanos)
      const selectedCandidates = selectTopRisks(evaluatedCandidates, 5);

      setProgress(55);

      // Obtener fotografías ÚNICAMENTE para los 5 establecimientos seleccionados
      const totalSelected = selectedCandidates.length;
      let photoProcessed = 0;

      const placesData = await Promise.all(selectedCandidates.map(async (c) => {
        let photoUri: string | undefined = undefined;

        // A. Fotografía subida a Google Places
        if (c.rawPlace.photos && c.rawPlace.photos.length > 0) {
          try {
            photoUri = c.rawPlace.photos[0].getURI({ maxWidth: 400 });
          } catch (e) {
            photoUri = undefined;
          }
        }

        // B. Respaldo Street View (Exterior)
        if (!photoUri) {
          try {
            const metaResOutdoor = await fetch(
              `https://maps.googleapis.com/maps/api/streetview/metadata?location=${c.lat},${c.lng}&radius=120&source=outdoor&key=${apiKey}`
            );
            const metaDataOutdoor = await metaResOutdoor.json();
            if (metaDataOutdoor.status === 'OK') {
              photoUri = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${c.lat},${c.lng}&radius=120&source=outdoor&key=${apiKey}`;
            } else {
              // Respaldo Street View sin restricción
              const metaResDefault = await fetch(
                `https://maps.googleapis.com/maps/api/streetview/metadata?location=${c.lat},${c.lng}&radius=120&key=${apiKey}`
              );
              const metaDataDefault = await metaResDefault.json();
              if (metaDataDefault.status === 'OK') {
                photoUri = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${c.lat},${c.lng}&radius=120&key=${apiKey}`;
              }
            }
          } catch (e) {
            photoUri = undefined;
          }
        }

        // C. Respaldo Satelital: Evita que ningún establecimiento quede sin imagen
        if (!photoUri) {
          photoUri = `https://maps.googleapis.com/maps/api/staticmap?center=${c.lat},${c.lng}&zoom=19&size=400x400&maptype=satellite&markers=color:red%7C${c.lat},${c.lng}&key=${apiKey}`;
        }

        photoProcessed++;
        const pct = 55 + Math.round((photoProcessed / totalSelected) * 20);
        setProgress(pct);

        return {
          name: c.name,
          distance: `${c.distanceMeters} MTS`,
          types: c.types,
          lat: c.lat,
          lng: c.lng,
          photoUri: photoUri || undefined
        };
      }));


      setProgress(75);

      const response = await fetch('/api/analyze-risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: placesData }),
      });

      setProgress(90);

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al analizar los riesgos.');
      }

      // Re-attach exact coordinates & types to each risk item
      const enrichedResults = (data.results || []).map((r: any) => {
        const matched = placesData.find(p => p.name === r.name);
        return {
          ...r,
          lat: matched?.lat,
          lng: matched?.lng,
          types: matched?.types || r.types || []
        };
      });

      setProgress(100);
      setRisks(enrichedResults);

      // Save exact analysis data to localStorage for Croquis synchronization
      try {
        localStorage.setItem('circundantes_places_cache', JSON.stringify({
          center: { lat: parseFloat(lat), lng: parseFloat(lng) },
          establishment: myEstablishment,
          places: enrichedResults,
          updatedAt: Date.now()
        }));
      } catch (e) {
        console.error('Error caching circundantes places', e);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-red-700" />
          Ingreso de Coordenadas
        </h3>
        <div className="space-y-3">
          <div className="space-y-1 w-full">
            <label className="text-xs font-bold text-gray-500 uppercase">Nombre de mi negocio (Opcional - Excluir del análisis)</label>
            <input
              type="text"
              value={myEstablishment}
              onChange={(e) => setMyEstablishment(e.target.value)}
              placeholder="Ej. Claro de Luna"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 space-y-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase">Latitud</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => handleLatChange(e.target.value)}
                placeholder="Ej. 20.6280"
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 space-y-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase">Longitud</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => handleLngChange(e.target.value)}
                placeholder="Ej. -87.0736"
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          <button
            onClick={handleAnalyze}
            disabled={loading || !placesLib}
            className="w-full sm:w-auto bg-[#7b1f1c] hover:bg-[#5c1614] text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center h-[42px] disabled:opacity-50 min-w-[140px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{progress}%</span>
              </div>
            ) : (
              "VISUALIZAR"
            )}
          </button>
        </div>
        </div>
        {loading && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-3">
            <div 
              className="bg-[#7b1f1c] h-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 font-bold mt-2">{error}</p>
        )}
      </div>

      {/* Results */}
      {risks.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-black uppercase text-gray-800 dark:text-gray-200 underline underline-offset-4 decoration-2">
                RIESGOS CIRCUNDANTES
              </h3>
              {onOpenCroquis && (
                <button
                  onClick={onOpenCroquis}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-colors"
                  title="Abrir estos lugares directamente en el croquis"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  Ver en Croquis de Riesgos
                </button>
              )}
            </div>
            
            {/* Color Picker circles */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Color cabecera:</span>
              <div className="flex items-center gap-1.5">
                {HEADER_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setHeaderColor(color.value)}
                    className={`w-5 h-5 rounded-full border transition-all duration-150 ${headerColor === color.value ? 'border-black dark:border-white scale-110 shadow-md ring-2 ring-blue-500/20' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-black rounded-lg">
            <table className="w-full border-collapse bg-white text-xs md:text-sm text-left">
              <thead>
                <tr className="text-white text-sm border-b border-black" style={{ backgroundColor: headerColor }}>
                  <th className="py-2 px-3 text-center w-36 font-bold border-r border-black uppercase">FOTO</th>
                  <th className="py-2 px-3 text-center w-24 font-bold border-r border-black uppercase">DISTANCIA</th>
                  <th className="py-2 px-3 text-center w-auto font-bold uppercase">RIESGO</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((risk, index) => (
                  <tr key={index} className="border-b border-black last:border-0">
                    <td className="p-2 text-center align-middle bg-white w-36 border-r border-black">
                      {risk.photoUri && !imageErrors[index] ? (
                        <div className="w-28 h-28 mx-auto overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center rounded">
                          <img
                            src={risk.photoUri}
                            alt={`Foto de ${risk.name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 mx-auto bg-gray-200 flex items-center justify-center border border-gray-300 text-gray-500 italic text-xs rounded text-center p-1">
                          Sin foto disponible
                        </div>
                      )}
                      <p className="text-[11px] font-bold mt-1 text-[#7b1f1c] leading-tight max-w-[130px] mx-auto">{risk.name}</p>
                    </td>
                    <td className="p-2 text-center align-middle font-bold text-gray-800 bg-white border-r border-black">
                      {risk.distance}
                    </td>
                    <td className="p-3 align-top text-black bg-white text-xs leading-relaxed text-justify" style={{ textAlign: 'justify' }}>
                      <p className="mb-1">
                        <span className="font-bold">Nivel de riesgo:</span> {risk.riskLevel}.
                      </p>
                      <p>
                        <span className="font-bold">Riesgo:</span> {risk.riskDescription}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

interface GeoRiesgosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCroquis?: () => void;
}

export default function GeoRiesgosModal({ isOpen, onClose, onOpenCroquis }: GeoRiesgosModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/maps-key')
        .then(res => res.json())
        .then(data => {
          setApiKey(data.key);
          setLoadingKey(false);
        })
        .catch((e) => {
          console.error(e);
          setLoadingKey(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onMouseDown={onClose} />

      {/* Modal Box */}
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4" 
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-blue-900 rounded-t-xl shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">Riesgos Circundantes</span>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-blue-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-900">
            {loadingKey ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-950 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !apiKey || apiKey === 'YOUR_API_KEY' ? (
              <div className="text-center py-8 space-y-3">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Google Maps API Key Requerida</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Por favor configure la variable de entorno `GOOGLE_MAPS_PLATFORM_KEY` en el archivo `.env` del servidor.
                </p>
              </div>
            ) : (
              <APIProvider apiKey={apiKey} version="weekly">
                <GeoAnalyzer apiKey={apiKey} onOpenCroquis={onOpenCroquis} />
              </APIProvider>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
