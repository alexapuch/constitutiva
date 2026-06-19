import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { X, MapPin, ShieldAlert, AlertCircle, Trash2, Plus, Download, RefreshCw, Compass } from 'lucide-react';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';

// Categories definitions with colors, names, and icons
interface RiskCategory {
  id: string;
  name: string;
  color: string;
  iconSvg: string;
  symbolLabel: string;
}

const RISK_CATEGORIES: RiskCategory[] = [
  {
    id: 'trafico',
    name: 'Tráfico vehicular',
    color: '#f97316', // Orange
    symbolLabel: '🚗',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-car"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M5 12h14"/></svg>`
  },
  {
    id: 'comercial',
    name: 'Locales varios / zona comercial',
    color: '#1d4ed8', // Blue
    symbolLabel: '🏪',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M30 7H0"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M14 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M6 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/></svg>`
  },
  {
    id: 'personas',
    name: 'Afluencia de personas',
    color: '#7c3aed', // Purple
    symbolLabel: '👥',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  },
  {
    id: 'maniobras',
    name: 'Maniobras y accesos',
    color: '#16a34a', // Green
    symbolLabel: '↔️',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-right"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`
  },
  {
    id: 'habitacional',
    name: 'Zona habitacional / área urbana',
    color: '#4b5563', // Grey
    symbolLabel: '🏠',
    iconSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`
  }
];

interface SavedMarker {
  id: string;
  lat: number;
  lng: number;
  categoryId: string;
  customName?: string;
}

// Function to generate the data URI of the custom marker pin
const createMarkerIcon = (color: string, iconSvg: string) => {
  const encodedSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2" />
      <g transform="translate(8, 8) scale(0.83)">
        ${iconSvg}
      </g>
    </svg>`
  );
  return `data:image/svg+xml,${encodedSvg}`;
};

// Dashed Circle Overlay using Polyline
function DashedCircle({ center, radius }: { center: google.maps.LatLngLiteral; radius: number }) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Calculate circular path points (360 degrees)
    const points: google.maps.LatLngLiteral[] = [];
    const d2r = Math.PI / 180;
    // Earth radius in meters
    const rLat = (radius / 6378137) / d2r;
    const rLng = rLat / Math.cos(center.lat * d2r);

    for (let i = 0; i <= 360; i += 2) {
      const theta = i * d2r;
      points.push({
        lat: center.lat + (rLat * Math.sin(theta)),
        lng: center.lng + (rLng * Math.cos(theta))
      });
    }

    const lineSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 2,
      strokeColor: '#dc2626' // Red
    };

    const polyline = new google.maps.Polyline({
      map,
      path: points,
      strokeColor: '#dc2626',
      strokeOpacity: 0,
      icons: [{
        icon: lineSymbol,
        offset: '0',
        repeat: '10px'
      }]
    });

    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [map, center, radius]);

  return null;
}

// 200m text label overlay
function CircleLabel({ center, radius }: { center: google.maps.LatLngLiteral; radius: number }) {
  const map = useMap();
  const overlayRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Calculate position for text label on the edge of the circle (e.g. North-East)
    const d2r = Math.PI / 180;
    const rLat = (radius / 6378137) / d2r;
    const rLng = rLat / Math.cos(center.lat * d2r);
    
    // 45 degrees for North-East placement
    const angle = 45 * d2r;
    const labelPos = {
      lat: center.lat + (rLat * Math.sin(angle)),
      lng: center.lng + (rLng * Math.cos(angle))
    };

    const labelMarker = new google.maps.Marker({
      map,
      position: labelPos,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 0 // invisible marker point
      },
      label: {
        text: '200 m',
        color: '#dc2626',
        fontWeight: 'bold',
        fontSize: '15px',
        className: 'circle-label-text'
      }
    });

    overlayRef.current = labelMarker;

    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }
    };
  }, [map, center, radius]);

  return null;
}

// Inner logic component
function CroquisEditor({ apiKey }: { apiKey: string }) {
  const [lat, setLat] = useState('20.650283395825614');
  const [lng, setLng] = useState('-87.06150292348663');
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({ lat: 20.650283395825614, lng: -87.06150292348663 });
  
  const [activeCategory, setActiveCategory] = useState<string>('trafico');
  const [markers, setMarkers] = useState<SavedMarker[]>([]);
  const [exporting, setExporting] = useState(false);

  const captureAreaRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Parse coords helper
  const handleCoordsInput = (val: string) => {
    if (val.includes(',')) {
      const [latitude, longitude] = val.split(',').map(s => s.trim());
      if (latitude && longitude) {
        setLat(latitude);
        setLng(longitude);
        const parsedLat = parseFloat(latitude);
        const parsedLng = parseFloat(longitude);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setCenter({ lat: parsedLat, lng: parsedLng });
        }
      }
    } else {
      setLat(val);
    }
  };

  const handleUpdateCenter = () => {
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      setCenter({ lat: parsedLat, lng: parsedLng });
    } else {
      Swal.fire('Error', 'Por favor ingresa coordenadas válidas.', 'error');
    }
  };

  // Add marker on map click
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const newMarker: SavedMarker = {
      id: Date.now().toString(),
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
      categoryId: activeCategory
    };
    setMarkers(prev => [...prev, newMarker]);
  };

  // Update marker position on drag
  const handleMarkerDragEnd = (id: string, e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const newLat = e.latLng.lat();
    const newLng = e.latLng.lng();
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, lat: newLat, lng: newLng } : m));
  };

  const handleRemoveMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  // Export layout to PDF/Image using html2canvas
  const handleExport = async () => {
    if (!captureAreaRef.current) return;
    setExporting(true);
    
    // Short sleep to ensure style updates are completed
    await new Promise(r => setTimeout(r, 600));

    try {
      const canvas = await html2canvas(captureAreaRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // Scale up for maximum resolution and sharpness
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `RIESGOS_CIRCUNDANTES_${lat}_${lng}.png`;
      link.href = imgData;
      link.click();
      
      Swal.fire({
        title: '¡Exportado!',
        text: 'El croquis ha sido exportado e instalado en tus descargas.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'No se pudo exportar el croquis.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">1. Coordenadas Centrales</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Lat, Lng o Latitud"
              value={`${lat}${lng ? ', ' + lng : ''}`}
              onChange={(e) => handleCoordsInput(e.target.value)}
              className="flex-1 min-w-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleUpdateCenter}
              className="bg-blue-900 hover:bg-blue-800 text-white p-2 rounded-lg transition-colors"
              title="Centrar Mapa"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">2. Selecciona Tipo de Riesgo</h3>
          <p className="text-xs text-gray-500 mb-3">Haz clic en una categoría y luego haz clic sobre el mapa para colocar el marcador.</p>
          <div className="flex flex-col gap-2">
            {RISK_CATEGORIES.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${activeCategory === category.id ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-650'}`}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm"
                  style={{ backgroundColor: category.color }}
                  dangerouslySetInnerHTML={{ __html: category.iconSvg }}
                />
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[160px] overflow-hidden">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center justify-between">
            <span>Marcadores Añadidos ({markers.length})</span>
            {markers.length > 0 && (
              <button onClick={() => setMarkers([])} className="text-xs text-red-600 hover:underline">Limpiar</button>
            )}
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {markers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs italic">
                Ningún marcador colocado. Haz clic en el mapa.
              </div>
            ) : (
              markers.map((m, i) => {
                const cat = RISK_CATEGORIES.find(c => c.id === m.categoryId);
                return (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px]" style={{ backgroundColor: cat?.color || '#333' }}>
                        {cat?.symbolLabel}
                      </div>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">
                        Punto #{i + 1} ({cat?.name})
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveMarker(m.id)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-[#1e3a8a] hover:bg-blue-900 text-white py-3 rounded-lg font-bold shadow-md transition-colors flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50"
        >
          {exporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>EXPORTAR CROQUIS</span>
            </>
          )}
        </button>
      </div>

      {/* Main Map Presentation Layout to Capture */}
      <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 overflow-hidden flex flex-col justify-center items-center">
        
        {/* Document Frame precisely matching the User's PDF Layout */}
        <div 
          ref={captureAreaRef}
          id="croquis-capture-area"
          className="w-[900px] h-[675px] bg-[#0c1a30] text-white flex flex-col relative overflow-hidden shrink-0 border border-black shadow-lg"
          style={{ width: '900px', height: '675px' }} // Lock dimensions for canvas generation quality consistency
        >
          {/* Header Banner */}
          <div className="bg-[#0B152A] py-3 text-center border-b-4 border-red-700 shrink-0 z-10">
            <h2 className="text-2xl font-black tracking-widest text-white uppercase">
              RIESGOS CIRCUNDANTES A 200 M A LA REDONDA
            </h2>
          </div>

          {/* Map & Legend Flex Layout */}
          <div className="flex-1 flex min-h-0 relative">
            
            {/* Map Container */}
            <div className="flex-1 relative h-full bg-gray-900">
              <Map
                center={center}
                zoom={18}
                onClick={handleMapClick}
                mapTypeId="hybrid"
                gestureHandling="cooperative"
                disableDefaultUI={true}
                className="w-full h-full"
                onDragend={(e) => {
                  if (mapRef.current) {
                    const centerLatLng = mapRef.current.getCenter();
                    if (centerLatLng) {
                      setCenter({ lat: centerLatLng.lat(), lng: centerLatLng.lng() });
                      setLat(centerLatLng.lat().toString());
                      setLng(centerLatLng.lng().toString());
                    }
                  }
                }}
              >
                {/* Center Core Marker */}
                <Marker
                  position={center}
                  title="Punto Central"
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: new google.maps.Size(40, 40)
                  }}
                />

                {/* 200m Dashed Circle Overlay */}
                <DashedCircle center={center} radius={200} />
                <CircleLabel center={center} radius={200} />

                {/* Placed Custom Risk Markers */}
                {markers.map(m => {
                  const cat = RISK_CATEGORIES.find(c => c.id === m.categoryId);
                  return (
                    <Marker
                      key={m.id}
                      position={{ lat: m.lat, lng: m.lng }}
                      draggable={true}
                      onDragend={(e) => handleMarkerDragEnd(m.id, e)}
                      icon={{
                        url: cat ? createMarkerIcon(cat.color, cat.iconSvg) : '',
                        scaledSize: new google.maps.Size(36, 36),
                        anchor: new google.maps.Point(18, 18)
                      }}
                    />
                  );
                })}
              </Map>

              {/* Compass / North Overlay Arrow */}
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm border border-white/20 p-2.5 rounded-lg flex flex-col items-center gap-1 z-10 pointer-events-none">
                <Compass className="w-7 h-7 text-white animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-white leading-none">N</span>
              </div>
            </div>

            {/* Simbología Panel */}
            <div className="w-[260px] bg-white text-gray-900 border-l-4 border-red-700 p-5 flex flex-col justify-start gap-4 shrink-0 z-10">
              <div className="border-2 border-blue-900 rounded-xl p-3 flex flex-col gap-4 shadow-sm h-full">
                <h3 className="text-center font-black text-xl text-blue-950 uppercase border-b-2 border-blue-900 pb-2 tracking-wide shrink-0">
                  SIMBOLOGÍA
                </h3>
                
                <div className="flex-1 flex flex-col justify-around py-2 gap-3 overflow-hidden">
                  {RISK_CATEGORIES.map(cat => (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md text-white border-2 border-white"
                        style={{ backgroundColor: cat.color }}
                        dangerouslySetInnerHTML={{ __html: cat.iconSvg }}
                      />
                      <span className="text-xs font-extrabold text-blue-950 leading-snug">
                        {cat.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Footer Coordinates Banner */}
          <div className="bg-[#0B152A] py-3 text-center border-t-4 border-red-700 shrink-0 z-10 font-mono tracking-wider font-extrabold text-base text-blue-200">
            COORDENADAS: {center.lat.toFixed(15)}, {center.lng.toFixed(15)}
          </div>

        </div>

      </div>
    </div>
  );
}

interface CroquisRiesgosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CroquisRiesgosModal({ isOpen, onClose }: CroquisRiesgosModalProps) {
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
      {/* Background Blur Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" onClick={onClose} />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-[1300px] flex flex-col h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#0B152A] border-b-4 border-red-700 shrink-0">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <span className="text-white font-extrabold text-xl tracking-wide uppercase">Croquis de Riesgos Circundantes</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 bg-gray-100 dark:bg-gray-950">
            {loadingKey ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !apiKey || apiKey === 'YOUR_API_KEY' ? (
              <div className="text-center py-16 space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                <h3 className="text-xl font-bold text-gray-950 dark:text-white">Google Maps API Key Requerida</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Por favor configure la variable de entorno `GOOGLE_MAPS_PLATFORM_KEY` en el archivo `.env` del servidor.
                </p>
              </div>
            ) : (
              <APIProvider apiKey={apiKey} version="weekly">
                <CroquisEditor apiKey={apiKey} />
              </APIProvider>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
