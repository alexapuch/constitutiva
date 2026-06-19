import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { X, MapPin, ShieldAlert, AlertCircle, Trash2, Plus, Download, RefreshCw, Compass, Search } from 'lucide-react';
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
    iconSvg: `<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M5 12h14"/>`
  },
  {
    id: 'comercial',
    name: 'Locales varios / zona comercial',
    color: '#1d4ed8', // Blue
    symbolLabel: '🏪',
    iconSvg: `<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M30 7H0"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M14 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/><path d="M6 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"/>`
  },
  {
    id: 'personas',
    name: 'Afluencia de personas',
    color: '#7c3aed', // Purple
    symbolLabel: '👥',
    iconSvg: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`
  },
  {
    id: 'maniobras',
    name: 'Maniobras y accesos',
    color: '#16a34a', // Green
    symbolLabel: '↔️',
    iconSvg: `<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>`
  },
  {
    id: 'habitacional',
    name: 'Zona habitacional / área urbana',
    color: '#4b5563', // Grey
    symbolLabel: '🏠',
    iconSvg: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`
  }
];

interface SavedMarker {
  id: string;
  lat: number;
  lng: number;
  categoryId: string;
  customName?: string;
}

// Function to generate the data URI of the custom marker pin (centered vector)
const createMarkerIcon = (color: string, iconSvg: string) => {
  const encodedSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${color}" stroke="white" stroke-width="2" />
      <g transform="translate(8, 8) scale(0.83)" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${iconSvg}
      </g>
    </svg>`
  );
  return `data:image/svg+xml,${encodedSvg}`;
};

// Native Circle with dimension text label overlay and radius line (acotación)
function MapCircle({ center, radius }: { center: google.maps.LatLngLiteral; radius: number }) {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);
  const labelRef = useRef<google.maps.Marker | null>(null);
  const radiusLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // 1. Draw native Circle (thicker outline and centered)
    const circle = new google.maps.Circle({
      map,
      center,
      radius,
      strokeColor: '#dc2626', // Red
      strokeOpacity: 0.9,
      strokeWeight: 6, // Thicker line
      fillColor: '#dc2626',
      fillOpacity: 0.05,
      clickable: false
    });
    circleRef.current = circle;

    // 2. Calculate North edge position for "200 m" label
    const d2r = Math.PI / 180;
    const rLat = (radius / 6378137) / d2r;
    
    // Position slightly offset to North-East so it is very visible
    const angle = 45 * d2r;
    const labelPos = {
      lat: center.lat + (rLat * Math.sin(angle)),
      lng: center.lng + (rLng => {
        return (rLat / Math.cos(center.lat * d2r)) * Math.cos(angle);
      })()
    };

    const labelMarker = new google.maps.Marker({
      map,
      position: labelPos,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 0 // invisible marker
      },
      label: {
        text: `${radius} m`,
        color: '#dc2626',
        fontWeight: 'bold',
        fontSize: '16px'
      }
    });
    labelRef.current = labelMarker;

    // 3. Draw a dashed radius Polyline (la acotación) from center to label
    const lineSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      scale: 3,
      strokeColor: '#dc2626'
    };

    const radiusLine = new google.maps.Polyline({
      map,
      path: [center, labelPos],
      strokeColor: '#dc2626',
      strokeOpacity: 0,
      strokeWeight: 2,
      icons: [{
        icon: lineSymbol,
        offset: '0',
        repeat: '12px'
      }]
    });
    radiusLineRef.current = radiusLine;

    return () => {
      if (circleRef.current) circleRef.current.setMap(null);
      if (labelRef.current) labelRef.current.setMap(null);
      if (radiusLineRef.current) radiusLineRef.current.setMap(null);
    };
  }, [map, center, radius]);

  return null;
}

// Subcomponent to safely consume useMap and render overlays only after maps script/instance is fully loaded
interface MapContentProps {
  center: google.maps.LatLngLiteral;
  setCenter: (c: google.maps.LatLngLiteral) => void;
  setLat: (lat: string) => void;
  setLng: (lng: string) => void;
  markers: SavedMarker[];
  handleMarkerDragEnd: (id: string, e: google.maps.MapMouseEvent) => void;
  handleMapClick: (lat: number, lng: number) => void;
  onMapReady: (map: google.maps.Map) => void;
  onZoomChanged: (zoom: number) => void;
  handleRemoveMarker: (id: string) => void;
}

function MapContent({ center, setCenter, setLat, setLng, markers, handleMarkerDragEnd, handleMapClick, onMapReady, onZoomChanged, handleRemoveMarker }: MapContentProps) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const zoomListener = map.addListener('zoom_changed', () => {
      const z = map.getZoom();
      if (z !== undefined) {
        onZoomChanged(z);
      }
    });

    return () => {
      google.maps.event.removeListener(zoomListener);
    };
  }, [map, onZoomChanged]);

  // Watch for coordinate center changes from typing/button Centrar to pan map and reset zoom
  useEffect(() => {
    if (!map || typeof google === 'undefined') return;
    const currentMapCenter = map.getCenter();
    if (currentMapCenter) {
      const diffLat = Math.abs(currentMapCenter.lat() - center.lat);
      const diffLng = Math.abs(currentMapCenter.lng() - center.lng);
      // If the difference is larger than a tiny epsilon (meaning user typed/updated via button, not dragged)
      if (diffLat > 0.00001 || diffLng > 0.00001) {
        map.setCenter(center);
        map.setZoom(18);
      }
    }
  }, [map, center]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const dragEndListener = map.addListener('dragend', () => {
      const newCenter = map.getCenter();
      if (newCenter) {
        const nLat = newCenter.lat();
        const nLng = newCenter.lng();
        setCenter({ lat: nLat, lng: nLng });
        setLat(nLat.toString());
        setLng(nLng.toString());
      }
    });

    return () => {
      google.maps.event.removeListener(dragEndListener);
    };
  }, [map, setCenter, setLat, setLng]);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        handleMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, handleMapClick]);

  if (!map || typeof google === 'undefined') return null;

  return (
    <>
      {/* Center Core Marker */}
      <Marker
        position={center}
        title="Punto Central"
        icon={{
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(40, 40)
        }}
      />

      {/* 200m Circle Overlay */}
      <MapCircle center={center} radius={200} />

      {/* Placed Custom Risk Markers */}
      {markers.map(m => {
        const cat = RISK_CATEGORIES.find(c => c.id === m.categoryId);
        return (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            draggable={true}
            onDragend={(e) => handleMarkerDragEnd(m.id, e)}
            onClick={() => {
              Swal.fire({
                title: '¿Eliminar marcador?',
                text: `¿Estás seguro de que deseas eliminar el marcador "${cat?.name || 'Punto'}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                cancelButtonColor: '#4b5563',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
              }).then((result) => {
                if (result.isConfirmed) {
                  handleRemoveMarker(m.id);
                }
              });
            }}
            icon={{
              url: cat ? createMarkerIcon(cat.color, cat.iconSvg) : '',
              size: new google.maps.Size(36, 36),
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 18)
            }}
          />
        );
      })}
    </>
  );
}

// Inner logic component
function CroquisEditor({ apiKey }: { apiKey: string }) {
  const [lat, setLat] = useState('20.650283395825614');
  const [lng, setLng] = useState('-87.06150292348663');
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({ lat: 20.650283395825614, lng: -87.06150292348663 });
  
  const [activeCategory, setActiveCategory] = useState<string>('trafico');
  const [markers, setMarkers] = useState<SavedMarker[]>([]);
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(18);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const captureAreaRef = useRef<HTMLDivElement>(null);
  
  const placesLib = useMapsLibrary('places');
  const geometryLib = useMapsLibrary('geometry');

  const handleZoomChange = (z: number) => {
    const parsedZoom = Math.max(10, Math.min(21, z));
    setZoomLevel(parsedZoom);
    if (mapInstance) {
      mapInstance.setZoom(parsedZoom);
    }
  };

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
  const handleMapClick = (plat: number, plng: number) => {
    const newMarker: SavedMarker = {
      id: Date.now().toString(),
      lat: plat,
      lng: plng,
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

  // Helper to space out markers if they overlap
  const adjustOverlap = (plat: number, plng: number, existing: { lat: number; lng: number }[]) => {
    let newLat = plat;
    let newLng = plng;
    let attempts = 0;
    const minDistance = 0.00018; // approx 15-20 meters spacing

    while (attempts < 15) {
      const isTooClose = existing.some(m => {
        const dLat = m.lat - newLat;
        const dLng = m.lng - newLng;
        return Math.sqrt(dLat * dLat + dLng * dLng) < minDistance;
      });

      if (!isTooClose) break;

      // Shift radially by a tiny bit
      const angle = Math.random() * Math.PI * 2;
      newLat += Math.cos(angle) * 0.00016;
      newLng += Math.sin(angle) * 0.00016;
      attempts++;
    }

    return { lat: newLat, lng: newLng };
  };

  // Automatic marker detection using Places API
  const handleAutoLoad = async () => {
    if (!placesLib || !geometryLib) {
      Swal.fire('Error', 'Las librerías de Google Maps no están listas.', 'error');
      return;
    }
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      Swal.fire('Error', 'Por favor ingresa coordenadas válidas.', 'error');
      return;
    }

    setLoadingAuto(true);

    try {
      const centerPos = { lat: parsedLat, lng: parsedLng };
      
      const { places } = await placesLib.Place.searchNearby({
        fields: ['displayName', 'location', 'types'],
        locationRestriction: {
          center: centerPos,
          radius: 200,
        },
        maxResultCount: 20,
      });

      if (!places || places.length === 0) {
        Swal.fire('Info', 'No se encontraron establecimientos en un radio de 200m.', 'info');
        setLoadingAuto(false);
        return;
      }

      // Limit commercial markers to 6 to prevent overcrowding
      const limitedPlaces = places.slice(0, 6);
      const newMarkers: SavedMarker[] = [];
      
      limitedPlaces.forEach(p => {
        if (!p.location) return;

        const pLat = p.location.lat();
        const pLng = p.location.lng();

        // Calculate distance from center to make sure it is within 200m
        const distance = geometryLib.spherical.computeDistanceBetween(centerPos, p.location);
        if (distance > 200) return;

        const types = p.types || [];
        let categoryId = 'comercial'; // default to commercial

        // Mapping logic based on types
        if (types.some(t => ['bus_station', 'transit_station', 'gas_station', 'intersection', 'subway_station', 'train_station'].includes(t))) {
          categoryId = 'trafico';
        } else if (types.some(t => ['school', 'park', 'church', 'place_of_worship', 'tourist_attraction', 'museum', 'hospital', 'university'].includes(t))) {
          categoryId = 'personas';
        } else if (types.some(t => ['parking', 'warehouse', 'car_repair', 'storage'].includes(t))) {
          categoryId = 'maniobras';
        } else if (types.some(t => ['lodging', 'real_estate_agency', 'condominium', 'apartment_building', 'neighborhood'].includes(t))) {
          categoryId = 'habitacional';
        } else if (types.some(t => ['store', 'restaurant', 'food', 'cafe', 'bar', 'shopping_mall', 'bakery', 'convenience_store', 'supermarket', 'pharmacy'].includes(t))) {
          categoryId = 'comercial';
        }

        // Apply spacing/de-cluttering relative to existing newMarkers
        const adjusted = adjustOverlap(pLat, pLng, [...newMarkers]);

        newMarkers.push({
          id: `auto-${p.displayName || 'place'}-${Math.random()}`,
          lat: adjusted.lat,
          lng: adjusted.lng,
          categoryId
        });
      });

      const programmaticMarkers: SavedMarker[] = [];
      const baseProgrammatic = [
        // Tráfico vehicular (Orange) - Placed along major avenues or streets
        { lat: centerPos.lat + 0.0006, lng: centerPos.lng + 0.0006, categoryId: 'trafico' },
        { lat: centerPos.lat - 0.0006, lng: centerPos.lng - 0.0006, categoryId: 'trafico' },
        // Zona habitacional (Grey) - Placed inside residential blocks
        { lat: centerPos.lat + 0.0008, lng: centerPos.lng - 0.0008, categoryId: 'habitacional' },
        { lat: centerPos.lat - 0.0008, lng: centerPos.lng + 0.0008, categoryId: 'habitacional' },
        // Afluencia de personas (Purple) - Placed near corners/domos
        { lat: centerPos.lat - 0.0003, lng: centerPos.lng + 0.0009, categoryId: 'personas' },
        // Maniobras y accesos (Green) - Placed near streets/driveways
        { lat: centerPos.lat + 0.0004, lng: centerPos.lng - 0.0003, categoryId: 'maniobras' }
      ];

      baseProgrammatic.forEach((bp, index) => {
        // Space out relative to commercial AND previous programmatic markers
        const adjusted = adjustOverlap(bp.lat, bp.lng, [...newMarkers, ...programmaticMarkers]);
        programmaticMarkers.push({
          id: `auto-prog-${index}-${Math.random()}`,
          lat: adjusted.lat,
          lng: adjusted.lng,
          categoryId: bp.categoryId
        });
      });

      setMarkers(prev => {
        // Merge without repeating coordinates
        const filtered = prev.filter(m => !m.id.startsWith('auto-'));
        return [...filtered, ...newMarkers, ...programmaticMarkers];
      });

      Swal.fire({
        title: 'Riesgos Detectados',
        text: `Se ubicaron ${newMarkers.length + programmaticMarkers.length} riesgos automáticamente en un radio de 200m.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Ocurrió un error al buscar establecimientos cercanos.', 'error');
    } finally {
      setLoadingAuto(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 flex flex-col gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">1. Coordenadas Centrales</h3>
          <div className="flex gap-2 mb-2">
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
          <button
            onClick={handleAutoLoad}
            disabled={loadingAuto || !placesLib}
            className="w-full bg-[#7b1f1c] hover:bg-[#5c1614] text-white py-2 rounded-lg font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 h-[36px] disabled:opacity-50"
          >
            {loadingAuto ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            DETECTAR RIESGOS CERCANOS
          </button>
        </div>

        {/* Zoom Controls */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">2. Nivel de Zoom</h3>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-700 p-2.5 rounded-lg border border-gray-200 dark:border-gray-650 justify-between shadow-sm">
            <button
              onClick={() => handleZoomChange(zoomLevel - 1)}
              className="bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 text-gray-800 dark:text-white px-3 py-1 rounded font-black text-sm select-none transition-colors border border-gray-300 dark:border-gray-500"
            >
              -
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase">Zoom:</span>
              <input
                type="number"
                min="10"
                max="21"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseInt(e.target.value) || 18)}
                className="w-12 text-center bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded px-1.5 py-1 text-sm font-black text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => handleZoomChange(zoomLevel + 1)}
              className="bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 text-gray-800 dark:text-white px-3 py-1 rounded font-black text-sm select-none transition-colors border border-gray-300 dark:border-gray-500"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">3. Selecciona Tipo de Riesgo</h3>
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
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={{ __html: category.iconSvg }} />
                </div>
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
      </div>

      {/* Main Map Presentation Layout to Capture */}
      <div className="flex-1 bg-white p-4 rounded-xl border border-gray-200 overflow-auto flex items-center justify-center min-h-[500px] w-full">
        
        {/* Responsive scaling container to avoid clipping */}
        <div className="scale-[0.55] sm:scale-[0.65] md:scale-[0.75] lg:scale-[0.8] xl:scale-95 origin-center transition-transform shrink-0">
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
                defaultCenter={center}
                defaultZoom={18}
                onClick={handleMapClick}
                mapTypeId="hybrid"
                gestureHandling="cooperative"
                disableDefaultUI={true}
                className="w-full h-full"
              >
                <MapContent
                  center={center}
                  setCenter={setCenter}
                  setLat={setLat}
                  setLng={setLng}
                  markers={markers}
                  handleMarkerDragEnd={handleMarkerDragEnd}
                  handleMapClick={handleMapClick}
                  onMapReady={setMapInstance}
                  onZoomChanged={setZoomLevel}
                  handleRemoveMarker={handleRemoveMarker}
                />
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
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={{ __html: cat.iconSvg }} />
                      </div>
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
          <div className="flex items-center justify-between px-6 py-4 bg-[#0B152A] border-b-4 border-red-700 shrink-0 gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
              <span className="text-white font-extrabold text-base sm:text-xl tracking-wide uppercase leading-tight">Croquis de Riesgos Circundantes</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0">
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
