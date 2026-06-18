import { useState, useEffect } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { X, MapPin, ShieldAlert, AlertCircle } from 'lucide-react';
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

// GeoAnalyzer inside modal
function GeoAnalyzer({ apiKey }: { apiKey: string }) {
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
    
    try {
      const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
      setProgress(15);
      
      const { places } = await placesLib.Place.searchNearby({
        fields: ['displayName', 'location', 'photos', 'types'],
        locationRestriction: {
          center,
          radius: 200,
        },
        maxResultCount: 5,
      });

      if (!places || places.length === 0) {
        throw new Error('No se encontraron establecimientos cerca de estas coordenadas.');
      }

      // Filter out user's own business if name is provided
      let filteredPlaces = places;
      if (myEstablishment.trim()) {
        const query = myEstablishment.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        filteredPlaces = places.filter(p => {
          const name = (p.displayName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return !name.includes(query) && !query.includes(name);
        });
      }

      const finalPlaces = filteredPlaces.slice(0, 4);

      if (finalPlaces.length === 0) {
        throw new Error('No se encontraron establecimientos circundantes después de filtrar tu negocio.');
      }

      setProgress(40);

      const placesData = await Promise.all(finalPlaces.map(async p => {
        let distanceMeters = 0;
        if (p.location) {
          distanceMeters = geometryLib.spherical.computeDistanceBetween(center, p.location);
        }
        
        let placePhoto = undefined;
        if (p.photos && p.photos.length > 0) {
          placePhoto = p.photos[0].getURI({ maxWidth: 400 });
        }

        let photoUri = undefined;
        if (p.location) {
          const plat = p.location.lat();
          const plng = p.location.lng();
          try {
            const metaRes = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${plat},${plng}&radius=120&key=${apiKey}`);
            const metaData = await metaRes.json();
            
            if (metaData.status === 'OK') {
              photoUri = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${plat},${plng}&radius=120&source=outdoor&key=${apiKey}`;
            } else {
              photoUri = placePhoto;
            }
          } catch (e) {
            photoUri = placePhoto;
          }
        } else {
          photoUri = placePhoto;
        }

        // Increment progress for each checked place
        const stepPct = Math.round(30 / finalPlaces.length);
        setProgress(prev => Math.min(70, prev + stepPct));

        return {
          name: p.displayName || 'Establecimiento desconocido',
          distance: `${Math.round(distanceMeters)} MTS`,
          types: p.types || [],
          photoUri
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

      setProgress(100);
      setRisks(data.results);
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
            <h3 className="text-lg font-black uppercase text-gray-800 dark:text-gray-200 underline underline-offset-4 decoration-2">
              RIESGOS CIRCUNDANTES
            </h3>
            
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
                      {risk.photoUri ? (
                        <div className="w-28 h-28 mx-auto overflow-hidden border border-gray-300 bg-gray-50 flex items-center justify-center rounded">
                          <img
                            src={risk.photoUri}
                            alt={`Foto de ${risk.name}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-28 h-28 mx-auto bg-gray-200 flex items-center justify-center border border-gray-300 text-gray-500 italic text-xs rounded">
                          Sin foto
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
}

export default function GeoRiesgosModal({ isOpen, onClose }: GeoRiesgosModalProps) {
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
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onClose} />

      {/* Modal Box */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-blue-900 rounded-t-xl shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">Analizador de GeoRiesgos</span>
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
                <GeoAnalyzer apiKey={apiKey} />
              </APIProvider>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
