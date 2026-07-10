import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Download, Trash2, Plus, RefreshCw, Layers, Move, Grid, HelpCircle, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { generateCroquis, CROQUIS_GIROS, type DoorSide, type CroquisAnchor } from '../../utils/croquisGenerator';

type SignType = 'extintor' | 'ruta_evacuacion' | 'salida_emergencia' | 'botiquin' | 'riesgo_electrico' | 'detector_humo' | 'valvula_gas';

interface PlacedSign {
  id: string;
  type: SignType;
  x: number; // coordinates relative to 800x600 viewBox
  y: number;
  label?: string;
  isDragged?: boolean;
  rotation?: number;
}

interface CroquisSeñaleticaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIGN_METADATA: Record<SignType, { label: string; color: string; fallbackText: string }> = {
  extintor: { label: 'Extintor', color: '#dc2626', fallbackText: '🧯' },
  ruta_evacuacion: { label: 'Ruta Evac.', color: '#16a34a', fallbackText: '➡️' },
  salida_emergencia: { label: 'Salida Emerg.', color: '#16a34a', fallbackText: '🚪' },
  botiquin: { label: 'Botiquín', color: '#16a34a', fallbackText: '➕' },
  riesgo_electrico: { label: 'Riesgo Eléc.', color: '#eab308', fallbackText: '⚡' },
  detector_humo: { label: 'Det. Humo', color: '#475569', fallbackText: '⚪' },
  valvula_gas: { label: 'Válvula Gas', color: '#ea580c', fallbackText: '🔧' }
};

const getEvacuationRouteRotation = (x: number, y: number, doorOrientation: 'S' | 'E' | 'N' | 'W'): number => {
  const doorX = doorOrientation === 'S' ? 400 : 760;
  const doorY = doorOrientation === 'S' ? 560 : 300;

  // Check if we are near the right wall (x > 680)
  if (x > 680) {
    if (doorOrientation === 'E' && Math.abs(y - doorY) < 40) {
      return 0; // Point right (exit)
    }
    return doorY > y ? 90 : 270; // 90 points down, 270 points up
  }
  
  // Check if we are near the left wall (x < 150)
  if (x < 150) {
    return doorY > y ? 90 : 270;
  }

  // Check if we are near the bottom wall (y > 480)
  if (y > 480) {
    if (doorOrientation === 'S' && Math.abs(x - doorX) < 40) {
      return 90; // Point down (exit)
    }
    return doorX > x ? 0 : 180; // 0 points right, 180 points left
  }

  // Check if we are near the top wall (y < 120)
  if (y < 120) {
    return doorX > x ? 0 : 180;
  }

  // For middle spaces (fallback), point directly towards the door's coordinate
  const dx = doorX - x;
  const dy = doorY - y;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 0 : 180;
  } else {
    return dy > 0 ? 90 : 270;
  }
};

const getAnchorPriority = (anchor: CroquisAnchor, type: SignType): number => {
  const role = anchor.role || '';
  const id = anchor.id;

  switch (type) {
    case 'extintor':
      if (id === 'tablero_electrico' || role === 'tablero_electrico') return 100;
      if (id === 'cocina_gas' || role === 'cocina_gas') return 90;
      if (role === 'cocina' || role === 'cocineta') return 85;
      if (id === 'acceso_principal_izq' || role === 'acceso_principal_izq') return 80;
      if (id === 'acceso_principal_der' || role === 'acceso_principal_der') return 40;
      if (id === 'salida_emergencia' || role === 'salida_emergencia') return 75;
      if (role === 'pasillo' || id.includes('pasillo')) return 70;
      if (['tallerZona', 'almacenRacks', 'operativa', 'laboratorio', 'refacciones'].includes(role)) return 60;
      if (['recepcion', 'mostrador', 'ventas', 'comedor', 'barra', 'cajas', 'atencion'].includes(role)) return 55;
      if (['oficina', 'consultorio', 'juntas'].includes(role)) return 40;
      if (['limpieza', 'recepProductos', 'bodega'].includes(role)) return 30;
      return 10;

    case 'ruta_evacuacion':
      if (role === 'pasillo' || id.includes('pasillo')) return 100;
      if (id === 'acceso_principal_izq' || id === 'acceso_principal_der' || role === 'acceso_principal_izq' || role === 'acceso_principal_der') return 90;
      if (id === 'salida_emergencia' || role === 'salida_emergencia') return 85;
      if (['recepcion', 'mostrador', 'ventas', 'comedor', 'barra', 'cajas', 'atencion', 'anden'].includes(role)) return 70;
      if (['tallerZona', 'almacenRacks', 'operativa'].includes(role)) return 60;
      if (['oficina', 'consultorio', 'juntas', 'relax'].includes(role)) return 40;
      if (role === 'bano' || id.includes('bano')) return 10;
      return 20;

    case 'botiquin':
      if (['recepcion', 'mostrador', 'cajas', 'atencion'].includes(role)) return 100;
      if (['operativa', 'tallerZona', 'almacenRacks', 'laboratorio'].includes(role)) return 80;
      if (role === 'cocina' || role === 'cocineta' || role === 'comedor') return 70;
      if (['oficina', 'consultorio', 'juntas'].includes(role)) return 60;
      if (role === 'pasillo' || id.includes('pasillo')) return 40;
      return 10;

    case 'detector_humo':
      if (id === 'cocina_gas' || role === 'cocina_gas' || role === 'cocina' || role === 'cocineta') return 100;
      if (['bodega', 'almacenRacks', 'refacciones', 'archivo'].includes(role)) return 90;
      if (id === 'tablero_electrico' || role === 'tablero_electrico' || role === 'site_servidores') return 85;
      if (['laboratorio', 'tallerZona', 'operativa'].includes(role)) return 80;
      if (['recepcion', 'mostrador', 'ventas', 'oficina', 'juntas', 'comedor', 'atencion'].includes(role)) return 60;
      if (role === 'pasillo' || id.includes('pasillo')) return 50;
      return 20;

    case 'salida_emergencia':
      if (id === 'acceso_principal_der') return 100;
      if (id === 'acceso_principal_izq') return 50;
      if (id === 'salida_emergencia') return 95;
      if (role === 'pasillo' || id.includes('pasillo')) return 70;
      return 10;

    case 'valvula_gas':
      if (id === 'cocina_gas') return 100;
      if (role === 'cocina' || role === 'cocineta') return 90;
      return 10;

    case 'riesgo_electrico':
      if (id === 'tablero_electrico') return 100;
      if (role === 'site_servidores') return 90;
      if (['tallerZona', 'operativa', 'laboratorio'].includes(role)) return 70;
      return 10;

    default:
      return 0;
  }
};

export default function CroquisSeñaleticaModal({ isOpen, onClose }: CroquisSeñaleticaModalProps) {
  const [commercialName, setCommercialName] = useState('MI ESTABLECIMIENTO');
  const [razonSocial, setRazonSocial] = useState('RAZON SOCIAL S.A. DE C.V.');
  const [selectedGiro, setSelectedGiro] = useState<string>('restaurante');
  const [planSeed, setPlanSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));
  const [widthMeters, setWidthMeters] = useState<number | string>(10);
  const [lengthMeters, setLengthMeters] = useState<number | string>(15);
  const [doorOrientation, setDoorOrientation] = useState<'N' | 'S' | 'E' | 'W'>('S');
  // Counts of each sign type to auto-place
  const [counts, setCounts] = useState<Record<SignType, number>>({
    extintor: 0,
    ruta_evacuacion: 0,
    salida_emergencia: 0,
    botiquin: 0,
    riesgo_electrico: 0,
    detector_humo: 0,
    valvula_gas: 0
  });

  const [placedSigns, setPlacedSigns] = useState<PlacedSign[]>([]);
  const [selectedSignId, setSelectedSignId] = useState<string | null>(null);
  const [activePlacementTool, setActivePlacementTool] = useState<SignType | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [base64Images, setBase64Images] = useState<Record<string, string>>({});
  const [bgImage, setBgImage] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const dragInfoRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plano base generado proceduralmente (distribución predeterminada + medidas aleatorias)
  const generated = useMemo(
    () => generateCroquis(selectedGiro, planSeed, (doorOrientation === 'E' ? 'E' : 'S') as DoorSide),
    [selectedGiro, planSeed, doorOrientation]
  );

  // Refleja las medidas reales del plano generado en los campos informativos
  useEffect(() => {
    setWidthMeters(Math.round(generated.widthM));
    setLengthMeters(Math.round(generated.heightM));
  }, [generated]);

  // Pre-load images as Base64 to enable tainted-free canvas PNG download
  useEffect(() => {
    const loadImages = async () => {
      const signalTypes: SignType[] = ['extintor', 'ruta_evacuacion', 'salida_emergencia', 'botiquin', 'riesgo_electrico', 'detector_humo', 'valvula_gas'];
      const dict: Record<string, string> = {};
      for (const type of signalTypes) {
        try {
          const response = await fetch(`/senales/${type}.png`);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          const reader = new FileReader();
          await new Promise<void>((resolve) => {
            reader.onloadend = () => {
              dict[type] = reader.result as string;
              resolve();
            };
            reader.readAsDataURL(blob);
          });
        } catch {
          // Keep empty - fallback will render SVG/Text representation
          console.warn(`No se pudo cargar la imagen para ${type}, se usará fallback.`);
        }
      }
      setBase64Images(dict);
    };

    if (isOpen) {
      loadImages();
      // Keep canvas and counters completely blank initially
      setPlacedSigns([]);
      setCounts({
        extintor: 0,
        ruta_evacuacion: 0,
        salida_emergencia: 0,
        botiquin: 0,
        riesgo_electrico: 0,
        detector_humo: 0,
        valvula_gas: 0
      });
      setSelectedSignId(null);
      // Nueva variación aleatoria al abrir
      setPlanSeed(Math.floor(Math.random() * 1e9));
    }
  }, [isOpen]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                setBgImage(ev.target.result as string);
                Swal.fire({
                  toast: true,
                  position: 'bottom-end',
                  icon: 'success',
                  title: 'Imagen pegada con éxito',
                  showConfirmButton: false,
                  timer: 2000
                });
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    if (isOpen) {
      window.addEventListener('paste', handlePaste);
    }
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      Swal.fire('Error', 'Por favor, sube un archivo de imagen (PNG, JPG, JPEG).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setBgImage(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset canvas and counters when changing Giro or layout variation
  useEffect(() => {
    if (isOpen) {
      setPlacedSigns([]);
      setCounts({
        extintor: 0,
        ruta_evacuacion: 0,
        salida_emergencia: 0,
        botiquin: 0,
        riesgo_electrico: 0,
        detector_humo: 0,
        valvula_gas: 0
      });
      setSelectedSignId(null);
    }
  }, [selectedGiro, planSeed, isOpen]);

  // Re-align evacuation routes and shift entrance signs when doorOrientation changes
  useEffect(() => {
    if (!isOpen) return;
    
    const oldX = doorOrientation === 'S' ? 740 : 400;
    const oldY = doorOrientation === 'S' ? 300 : 540;
    const newX = doorOrientation === 'S' ? 400 : 740;
    const newY = doorOrientation === 'S' ? 540 : 300;

    setPlacedSigns(prev => prev.map(s => {
      // 1. Shift entrance signs
      const dist = Math.sqrt((s.x - oldX) ** 2 + (s.y - oldY) ** 2);
      if (dist < 35) {
        return {
          ...s,
          x: newX,
          y: newY,
          rotation: s.type === 'ruta_evacuacion'
            ? getEvacuationRouteRotation(newX, newY, doorOrientation)
            : (s.rotation || 0)
        };
      }
      // 2. Re-align all other evacuation routes to point to the new door
      if (s.type === 'ruta_evacuacion') {
        return {
          ...s,
          rotation: getEvacuationRouteRotation(s.x, s.y, doorOrientation)
        };
      }
      return s;
    }));
  }, [doorOrientation, isOpen]);

  const handleCountChange = (type: SignType, delta: number) => {
    if (delta > 0) {
      // User clicked "+": add a sign of this type
      setCounts(prev => ({ ...prev, [type]: prev[type] + 1 }));
      
      {
        // Anclas del plano generado (ya reflejan la orientación de la puerta)
        const dynamicAnchors = generated.anchors;

        const compatibleAnchors = dynamicAnchors.filter(a => a.allowedTypes.includes(type));
        
        // Sort compatible anchors by logical priority (highest first)
        const sortedCompatible = [...compatibleAnchors].sort((a, b) => {
          return getAnchorPriority(b, type) - getAnchorPriority(a, type);
        });
        
        let chosenAnchor = sortedCompatible[0];
        let minOccupied = Infinity;
        
        sortedCompatible.forEach(anchor => {
          const occupiedCount = placedSigns.filter(s => {
            const dx = s.x - anchor.x;
            const dy = s.y - anchor.y;
            return Math.sqrt(dx*dx + dy*dy) < 25;
          }).length;
          
          if (occupiedCount < minOccupied) {
            minOccupied = occupiedCount;
            chosenAnchor = anchor;
          }
        });

        const offsetIndex = minOccupied;
        const spacing = 32;
        let offsetX = 0;
        let offsetY = 0;

        if (chosenAnchor) {
          if (chosenAnchor.id.includes('acceso_principal') || chosenAnchor.id === 'salida_emergencia') {
            offsetX = (offsetIndex - 0.5) * spacing;
            offsetY = chosenAnchor.id.includes('acceso_principal_izq') ? -15 : 15;
          } else if (chosenAnchor.id.includes('wall') || chosenAnchor.id === 'tablero_electrico' || chosenAnchor.id === 'bodega_pared_der') {
            offsetY = (offsetIndex - 0.5) * spacing;
            offsetX = -12;
          } else {
            offsetX = (offsetIndex - 0.5) * spacing;
          }
          
          const newSign: PlacedSign = {
            id: `manual-sidebar-${type}-${Date.now()}-${Math.random()}`,
            type,
            x: Math.max(20, Math.min(780, chosenAnchor.x + offsetX)),
            y: Math.max(20, Math.min(580, chosenAnchor.y + offsetY)),
            rotation: type === 'ruta_evacuacion'
              ? (chosenAnchor.rotation !== undefined ? chosenAnchor.rotation : getEvacuationRouteRotation(chosenAnchor.x + offsetX, chosenAnchor.y + offsetY, doorOrientation))
              : 0
          };
          setPlacedSigns(prev => [...prev, newSign]);
        } else {
          // Fallback if no compatible anchor: place in the center
          const newSign: PlacedSign = {
            id: `manual-sidebar-${type}-${Date.now()}-${Math.random()}`,
            type,
            x: 400 + (Math.random() - 0.5) * 60,
            y: 300 + (Math.random() - 0.5) * 60,
            rotation: type === 'ruta_evacuacion' ? getEvacuationRouteRotation(400, 300, doorOrientation) : 0
          };
          setPlacedSigns(prev => [...prev, newSign]);
        }
      }
    } else {
      // User clicked "-": remove the most recently added sign of this type
      setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
      
      setPlacedSigns(prev => {
        const signsOfType = prev.filter(s => s.type === type);
        if (signsOfType.length === 0) return prev;
        const lastSign = signsOfType[signsOfType.length - 1];
        return prev.filter(s => s.id !== lastSign.id);
      });
    }
  };

  const handleAutoPlace = () => {
    // Anclas del plano generado (ya reflejan la orientación de la puerta)
    const dynamicAnchors = generated.anchors;

    const newPlaced: PlacedSign[] = [];
    const anchorAssignments: Record<string, SignType[]> = {};

    // Initialize anchor assignment registry
    dynamicAnchors.forEach(a => {
      anchorAssignments[a.id] = [];
    });

    // Map door orientation
    let entranceAnchorId = 'acceso_principal_der';
    let emergencyAnchorId = 'salida_emergencia';

    // Distribute signs to compatible anchors
    const signTypesOrdered: SignType[] = [
      'salida_emergencia',
      'valvula_gas',
      'riesgo_electrico',
      'botiquin',
      'extintor',
      'detector_humo',
      'ruta_evacuacion'
    ];

    signTypesOrdered.forEach(type => {
      let countToPlace = counts[type];
      if (countToPlace <= 0) return;

      // Find compatible anchors for this type
      const compatibleAnchors = dynamicAnchors.filter(a => a.allowedTypes.includes(type));
      if (compatibleAnchors.length === 0) return;

      // Special routing prioritization
      if (type === 'salida_emergencia') {
        // Primary emergency exit goes to the entrance door (acceso_principal)
        const primary = compatibleAnchors.find(a => a.id === entranceAnchorId) || compatibleAnchors[0];
        anchorAssignments[primary.id].push(type);
        countToPlace--;
        
        if (countToPlace > 0 && compatibleAnchors.length > 1) {
          // Secondary emergency exit goes to the back door (salida_emergencia) if available
          const secondary = compatibleAnchors.find(a => a.id === emergencyAnchorId) || compatibleAnchors.find(a => a.id !== primary.id);
          if (secondary) {
            anchorAssignments[secondary.id].push(type);
            countToPlace--;
          }
        }
      } else if (type === 'valvula_gas') {
        const primary = compatibleAnchors.find(a => a.id === 'cocina_gas') || compatibleAnchors[0];
        anchorAssignments[primary.id].push(type);
        countToPlace--;
      } else if (type === 'riesgo_electrico') {
        const primary = compatibleAnchors.find(a => a.id === 'tablero_electrico' || a.id === 'tablero_comercio' || a.id === 'site_servidores') || compatibleAnchors[0];
        anchorAssignments[primary.id].push(type);
        countToPlace--;
      }

      // Sort compatible anchors by priority (highest first)
      const sortedAnchors = [...compatibleAnchors].sort((a, b) => {
        return getAnchorPriority(b, type) - getAnchorPriority(a, type);
      });

      // Distribute remaining counts round-robin style over sorted compatible anchors
      let anchorIndex = 0;
      while (countToPlace > 0) {
        const targetAnchor = sortedAnchors[anchorIndex % sortedAnchors.length];
        anchorAssignments[targetAnchor.id].push(type);
        countToPlace--;
        anchorIndex++;
      }
    });

    // Translate anchor assignments to placed items with physical spacing/offset offsets (Anti-Collision)
    dynamicAnchors.forEach(anchor => {
      const assigned = anchorAssignments[anchor.id];
      if (!assigned || assigned.length === 0) return;

      const N = assigned.length;
      const spacing = 32; // Offset spacing in pixels

      assigned.forEach((type, index) => {
        // Calculate offset centered around the anchor coordinate
        let offsetX = 0;
        let offsetY = 0;

        // If the anchor is near walls or entrances, we shift horizontally or vertically
        if (anchor.id.includes('acceso_principal') || anchor.id === 'salida_emergencia') {
          // Horizontal alignment
          offsetX = (index - (N - 1) / 2) * spacing;
          offsetY = anchor.id.includes('acceso_principal_izq') ? -15 : 15;
        } else if (anchor.id.includes('wall') || anchor.id === 'tablero_electrico' || anchor.id === 'bodega_pared_der') {
          // Vertical stack next to the wall
          offsetY = (index - (N - 1) / 2) * spacing;
          offsetX = -12;
        } else {
          // Radial offset grouping
          offsetX = (index - (N - 1) / 2) * spacing;
        }

        newPlaced.push({
          id: `auto-${anchor.id}-${type}-${index}-${Math.random()}`,
          type,
          x: Math.max(20, Math.min(780, anchor.x + offsetX)),
          y: Math.max(20, Math.min(580, anchor.y + offsetY)),
          rotation: type === 'ruta_evacuacion'
            ? (anchor.rotation !== undefined ? anchor.rotation : getEvacuationRouteRotation(anchor.x + offsetX, anchor.y + offsetY, doorOrientation))
            : 0
        });
      });
    });

    setPlacedSigns(newPlaced);
    setSelectedSignId(null);
  };

  // SVG Mouse Drag Handlers
  const handleSVGMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const signId = target.getAttribute('data-sign-id');
    if (!signId) {
      setSelectedSignId(null);
      
      // If we have an active manual tool, place the sign at click point
      if (activePlacementTool && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const clickX = ((e.clientX - rect.left) / rect.width) * 800;
        const clickY = ((e.clientY - rect.top) / rect.height) * 600;
        
        const newSign: PlacedSign = {
          id: `manual-${Date.now()}-${Math.random()}`,
          type: activePlacementTool,
          x: Math.round(clickX),
          y: Math.round(clickY),
          rotation: activePlacementTool === 'ruta_evacuacion' ? getEvacuationRouteRotation(clickX, clickY, doorOrientation) : 0
        };
        
        setPlacedSigns(prev => [...prev, newSign]);
        // Update user inputs counter
        setCounts(prev => ({
          ...prev,
          [activePlacementTool]: prev[activePlacementTool] + 1
        }));
        
        // Deactivate tool if Shift is not held down
        if (!e.shiftKey) {
          setActivePlacementTool(null);
        }
      }
      return;
    }

    e.preventDefault();
    setSelectedSignId(signId);
    
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 800;
      const clickY = ((e.clientY - rect.top) / rect.height) * 600;
      
      const sign = placedSigns.find(s => s.id === signId);
      if (sign) {
        dragInfoRef.current = {
          id: signId,
          startX: clickX - sign.x,
          startY: clickY - sign.y
        };
        setPlacedSigns(prev => prev.map(s => s.id === signId ? { ...s, isDragged: true } : s));
      }
    }
  };

  const handleSVGMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragInfoRef.current || !svgRef.current) return;
    
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    const clickX = ((clientX - rect.left) / rect.width) * 800;
    const clickY = ((clientY - rect.top) / rect.height) * 600;
    
    const { id, startX, startY } = dragInfoRef.current;
    
    const newX = Math.max(15, Math.min(785, clickX - startX));
    const newY = Math.max(15, Math.min(585, clickY - startY));
    
    setPlacedSigns(prev => prev.map(s => s.id === id ? { ...s, x: Math.round(newX), y: Math.round(newY) } : s));
  };

  const handleSVGMouseUp = () => {
    if (dragInfoRef.current) {
      const id = dragInfoRef.current.id;
      setPlacedSigns(prev => prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            isDragged: false,
            rotation: s.type === 'ruta_evacuacion'
              ? getEvacuationRouteRotation(s.x, s.y, doorOrientation)
              : (s.rotation || 0)
          };
        }
        return s;
      }));
      dragInfoRef.current = null;
    }
  };

  // Touch handlers for mobile/tablets support
  const handleSVGTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const signId = target.getAttribute('data-sign-id');
    if (!signId) return;

    e.preventDefault();
    setSelectedSignId(signId);
    
    if (svgRef.current && e.touches.length > 0) {
      const rect = svgRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const clickX = ((touch.clientX - rect.left) / rect.width) * 800;
      const clickY = ((touch.clientY - rect.top) / rect.height) * 600;
      
      const sign = placedSigns.find(s => s.id === signId);
      if (sign) {
        dragInfoRef.current = {
          id: signId,
          startX: clickX - sign.x,
          startY: clickY - sign.y
        };
        setPlacedSigns(prev => prev.map(s => s.id === signId ? { ...s, isDragged: true } : s));
      }
    }
  };

  const handleSVGTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!dragInfoRef.current || !svgRef.current || e.touches.length === 0) return;
    
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    
    const clickX = ((touch.clientX - rect.left) / rect.width) * 800;
    const clickY = ((touch.clientY - rect.top) / rect.height) * 600;
    
    const { id, startX, startY } = dragInfoRef.current;
    
    const newX = Math.max(15, Math.min(785, clickX - startX));
    const newY = Math.max(15, Math.min(585, clickY - startY));
    
    setPlacedSigns(prev => prev.map(s => s.id === id ? { ...s, x: Math.round(newX), y: Math.round(newY) } : s));
  };

  const handleRemoveSign = (id: string) => {
    const sign = placedSigns.find(s => s.id === id);
    if (!sign) return;
    setPlacedSigns(prev => prev.filter(s => s.id !== id));
    setSelectedSignId(null);
    
    // Decrement the corresponding sidebar counter
    setCounts(prev => ({
      ...prev,
      [sign.type]: Math.max(0, prev[sign.type] - 1)
    }));
  };

  const handleRotateSign = (id: string) => {
    setPlacedSigns(prev => prev.map(s => {
      if (s.id === id) {
        const currentRot = s.rotation || 0;
        return { ...s, rotation: (currentRot + 90) % 360 };
      }
      return s;
    }));
  };

  const handleClearAll = () => {
    Swal.fire({
      title: '¿Limpiar todo?',
      text: 'Se eliminarán todas las señaléticas colocadas en el plano.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(r => {
      if (r.isConfirmed) {
        setPlacedSigns([]);
        setSelectedSignId(null);
        setCounts({
          extintor: 0,
          ruta_evacuacion: 0,
          salida_emergencia: 0,
          botiquin: 0,
          riesgo_electrico: 0,
          detector_humo: 0,
          valvula_gas: 0
        });
      }
    });
  };

  // Convert SVG node structure to base64 canvas and download as PNG
  const handleExportPNG = () => {
    if (!svgRef.current) return;

    Swal.fire({
      title: 'Generando Croquis',
      text: 'Preparando imagen de alta calidad...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600; // Double resolution export
        canvas.height = 1200;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#ffffff'; // White background for export
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, 1600, 1200);
          
          const png = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = png;
          downloadLink.download = `CROQUIS_SENALETICA_${commercialName.trim().replace(/\s+/g, '_').toUpperCase()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          URL.revokeObjectURL(blobURL);
          Swal.close();
        }
      };
      image.src = blobURL;
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'No se pudo exportar el croquis como imagen.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 text-slate-100 shadow-2xl w-full max-w-6xl rounded-2xl border border-slate-700 overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Header Banner */}
        <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-wide uppercase text-white leading-tight">
                Diseñador de Croquis y Distribución de Señalética
              </h3>
              <p className="text-xs text-slate-400">Generador de planos arquitectónicos interactivos y de seguridad</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center bg-slate-800 hover:bg-slate-700 transition-colors rounded-full w-9 h-9 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace Panels */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          
          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 bg-slate-950 p-5 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto flex flex-col gap-5 shrink-0 select-none">
            
            {/* Business Info */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Datos del Establecimiento</span>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={commercialName}
                  onChange={e => setCommercialName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Giro / Actividad</label>
                <div className="flex gap-2">
                  <select
                    value={selectedGiro}
                    onChange={e => {
                      setSelectedGiro(e.target.value);
                      setPlanSeed(Math.floor(Math.random() * 1e9));
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
                  >
                    {CROQUIS_GIROS.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setPlanSeed(Math.floor(Math.random() * 1e9));
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-750 px-2 rounded-lg transition-colors flex items-center justify-center h-[32px] cursor-pointer"
                    title="Variar distribución del plano"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ubicación de Puerta Principal</label>
                <select
                  value={doorOrientation}
                  onChange={e => {
                    const val = e.target.value as 'S' | 'E';
                    setDoorOrientation(val);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
                >
                  <option value="S">Abajo en medio (Muro Sur)</option>
                  <option value="E">Derecha en medio (Muro Este)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ancho (m)</label>
                  <input
                    type="number"
                    min="4"
                    max="50"
                    value={widthMeters}
                    onChange={e => {
                      const val = e.target.value;
                      setWidthMeters(val === '' ? '' : parseInt(val) || 0);
                    }}
                    onBlur={() => {
                      const val = Math.max(4, Math.min(50, parseInt(String(widthMeters)) || 10));
                      setWidthMeters(val);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Largo (m)</label>
                  <input
                    type="number"
                    min="4"
                    max="50"
                    value={lengthMeters}
                    onChange={e => {
                      const val = e.target.value;
                      setLengthMeters(val === '' ? '' : parseInt(val) || 0);
                    }}
                    onBlur={() => {
                      const val = Math.max(4, Math.min(50, parseInt(String(lengthMeters)) || 15));
                      setLengthMeters(val);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none text-center"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-850 my-1" />

            {/* Custom Background Upload */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fondo Personalizado</span>
              <div className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {!bgImage ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Subir Imagen de Plano
                  </button>
                ) : (
                  <button
                    onClick={() => setBgImage(null)}
                    className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 rounded-lg text-xs font-semibold border border-red-900/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Quitar Imagen
                  </button>
                )}
                <p className="text-[9px] text-slate-500 leading-tight text-center">
                  O presiona <kbd className="bg-slate-800 px-1 rounded">Ctrl</kbd> + <kbd className="bg-slate-800 px-1 rounded">V</kbd> para pegar.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-850 my-1" />

            {/* Counts selection */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Cantidades de Señalética</span>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {(Object.keys(counts) as SignType[]).map(type => (
                  <div key={type} className="flex items-center justify-between bg-slate-900 border border-slate-850 p-2 rounded-lg text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-slate-850 flex items-center justify-center text-sm font-semibold select-none">
                        {base64Images[type] ? (
                          <img src={base64Images[type]} alt={type} className="w-5 h-5 object-contain" />
                        ) : (
                          SIGN_METADATA[type].fallbackText
                        )}
                      </div>
                      <span className="font-semibold text-slate-300">{SIGN_METADATA[type].label}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCountChange(type, -1)}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold text-white text-xs">{counts[type]}</span>
                      <button
                        onClick={() => handleCountChange(type, 1)}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAutoPlace}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-2 rounded-lg font-bold text-[11px] shadow-sm transition-all flex items-center justify-center gap-1.5 h-[34px] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  AUTO-DISTRIBUIR
                </button>
                
                <button
                  onClick={handleClearAll}
                  className="bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300 border border-slate-750 px-2.5 rounded-lg transition-colors flex items-center justify-center h-[34px] cursor-pointer"
                  title="Limpiar croquis"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-slate-850 my-1" />

            {/* Manual Placing Tool */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">3. Colocación Manual</span>
              <p className="text-[10px] text-slate-500 leading-tight">Activa una herramienta y haz clic en el plano para colocar una señal extra.</p>
              
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(counts) as SignType[]).map(type => (
                  <button
                    key={`tool-${type}`}
                    onClick={() => setActivePlacementTool(activePlacementTool === type ? null : type)}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left text-[10px] font-semibold transition-all ${
                      activePlacementTool === type
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/20'
                        : 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <span className="shrink-0">{SIGN_METADATA[type].fallbackText}</span>
                    <span className="truncate">{SIGN_METADATA[type].label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Helper tips */}
            <div className="mt-auto bg-slate-900/50 border border-slate-850/80 p-2.5 rounded-lg text-[10px] text-slate-500 space-y-1">
              <div className="flex gap-1 items-start">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-400">Instrucciones:</span>
                  <ul className="list-disc pl-3 space-y-0.5 mt-0.5">
                    <li>Arrastra las señales con el cursor/dedo para moverlas libremente.</li>
                    <li>Selecciona una señal en el croquis y pulsa "Eliminar" abajo para quitarla.</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>

          {/* Canvas Display Viewport */}
          <div className="flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex flex-col items-center justify-center min-h-[450px]">
            
            {/* View controls */}
            <div className="w-full max-w-[800px] flex items-center justify-between mb-3 text-xs text-slate-400 select-none">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={e => setShowGrid(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-800 text-emerald-600 focus:ring-offset-slate-950"
                  />
                  <span>Mostrar cuadrícula</span>
                </label>
                <span>|</span>
                <span>Área: <strong className="text-slate-200">{((parseInt(String(widthMeters)) || 10) * (parseInt(String(lengthMeters)) || 15)).toFixed(0)} m²</strong> ({widthMeters || 0}x{lengthMeters || 0}m)</span>
              </div>
              <div className="flex items-center gap-2">
                {activePlacementTool && (
                  <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                    Modo Colocación: {SIGN_METADATA[activePlacementTool].label} activo
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-mono">Res. SVG: 800x600</span>
              </div>
            </div>

            {/* Interactive SVG Blueprint Canvas */}
            <div className="relative border border-slate-300 shadow-2xl rounded-lg overflow-hidden bg-white select-none">
              <svg
                ref={svgRef}
                viewBox="0 0 800 600"
                className="w-full max-w-[800px] h-auto aspect-[4/3] touch-none"
                style={{ width: '800px', height: '600px' }}
                onMouseDown={handleSVGMouseDown}
                onMouseMove={handleSVGMouseMove}
                onMouseUp={handleSVGMouseUp}
                onMouseLeave={handleSVGMouseUp}
                onTouchStart={handleSVGTouchStart}
                onTouchMove={handleSVGTouchMove}
                onTouchEnd={handleSVGMouseUp}
              >
                {/* Patterns Definitions */}
                <defs>
                  {/* Architectural grid pattern */}
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                  </pattern>
                </defs>

                {/* Background Image (User Uploaded) or Default Architectural Canvas */}
                {bgImage ? (
                  <image href={bgImage} x="0" y="0" width="800" height="600" preserveAspectRatio="xMidYMid meet" />
                ) : (
                  <>
                    {/* Grid Background */}
                    {showGrid && <rect width="800" height="600" fill="url(#grid)" />}

                    {/* Plano base generado proceduralmente:
                        muros, puertas con abatimiento, mobiliario, cotas, norte y escala */}
                    <g dangerouslySetInnerHTML={{ __html: generated.baseSVG }} />
              </>
            )}

            {/* Render Placed Sign Icons */}
                {placedSigns.map((sign) => {
                  const meta = SIGN_METADATA[sign.type];
                  const hasImage = !!base64Images[sign.type];
                  
                  return (
                    <g
                      key={sign.id}
                      transform={`translate(${sign.x}, ${sign.y}) rotate(${sign.rotation || 0})`}
                      className="cursor-pointer"
                    >
                      {/* Interactive Drag/Click Area Boundary (Bigger than visible icon for easy touch target) */}
                      <circle
                        r="24"
                        fill="white"
                        fillOpacity="0"
                        style={{ cursor: 'pointer' }}
                        pointerEvents="all"
                        data-sign-id={sign.id}
                      />
                      
                      {/* Selection Aura */}
                      {selectedSignId === sign.id && (
                        <circle
                          r="18"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2"
                          strokeDasharray="3,3"
                          className="animate-spin pointer-events-none"
                          pointerEvents="none"
                          style={{ animationDuration: '6s' }}
                        />
                      )}

                      {/* Icon representation */}
                      {hasImage ? (
                        <image
                          href={base64Images[sign.type]}
                          x="-14"
                          y="-14"
                          width="28"
                          height="28"
                          data-sign-id={sign.id}
                          className="pointer-events-none"
                          pointerEvents="none"
                        />
                      ) : (
                        // Fallback SVG graphic shape if PNG is missing
                        <g data-sign-id={sign.id} className="pointer-events-none" pointerEvents="none">
                          <circle r="14" fill={meta.color} stroke="#ffffff" strokeWidth="1.5" pointerEvents="none" />
                          <text
                            y="4"
                            textAnchor="middle"
                            fontSize="11"
                            fill="#ffffff"
                            fontWeight="bold"
                            fontFamily="system-ui"
                            pointerEvents="none"
                          >
                            {meta.fallbackText}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              </svg>

              {/* Selection action Overlay inside Canvas */}
              {selectedSignId && !placedSigns.some(s => s.isDragged) && (() => {
                const sign = placedSigns.find(s => s.id === selectedSignId);
                if (!sign) return null;
                return (
                  <div
                    className="absolute bg-slate-950/95 border border-slate-800 px-3 py-2 rounded-lg flex items-center gap-3 shadow-xl z-20 pointer-events-auto"
                    style={{
                      left: `${(sign.x / 800) * 100}%`,
                      top: `${(sign.y / 600) * 100 + 4}%`,
                      transform: 'translate(-50%, 10px)'
                    }}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                      {SIGN_METADATA[sign.type].label}
                    </span>
                    <button
                      onClick={() => handleRotateSign(sign.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded px-2 py-1 text-[10px] font-bold flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer h-[26px]"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-400" />
                      Rotar 90°
                    </button>
                    <button
                      onClick={() => handleRemoveSign(sign.id)}
                      className="bg-red-650/80 hover:bg-red-650 text-white rounded p-1 text-[10px] font-bold flex items-center gap-1 transition-colors border-0 cursor-pointer"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                      Eliminar
                    </button>
                  </div>
                );
              })()}

            </div>

            {/* Quick Actions Footer under canvas */}
            <div className="w-full max-w-[800px] flex justify-between items-center mt-4 shrink-0">
              <span className="text-[10px] text-slate-500 italic">
                * Consejo: Puedes arrastrar y soltar las señales para ajustar su colocación exacta sobre los muros y divisiones.
              </span>
              <button
                onClick={handleExportPNG}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer h-[34px]"
              >
                <Download className="w-4 h-4 text-emerald-500" />
                Descargar PNG de Plano
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
