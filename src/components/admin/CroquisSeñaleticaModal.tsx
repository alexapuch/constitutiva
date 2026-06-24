import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Download, Trash2, Plus, RefreshCw, Layers, Move, Grid, HelpCircle } from 'lucide-react';
import Swal from 'sweetalert2';

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

interface GiroConfig {
  id: string;
  name: string;
  rooms: { name: string; x: number; y: number; w: number; h: number }[];
  walls: { x1: number; y1: number; x2: number; y2: number }[];
  doors: { x: number; y: number; r: number; startAngle: number; endAngle: number; dx: number; dy: number }[];
  anchors: { id: string; name: string; x: number; y: number; allowedTypes: SignType[]; rotation?: number }[];
}

const GIROS_VARIATIONS: Record<string, GiroConfig[]> = {
  restaurante: [
    {
      id: 'restaurante',
      name: 'Restaurante (Estilo A)',
      rooms: [
        { name: 'Cocina', x: 480, y: 50, w: 270, h: 200 },
        { name: 'Almacén', x: 50, y: 50, w: 200, h: 160 },
        { name: 'Baños', x: 50, y: 210, w: 200, h: 160 },
        { name: 'Caja', x: 480, y: 450, w: 120, h: 100 },
        { name: 'Comedor Principal', x: 260, y: 250, w: 490, h: 200 }
      ],
      walls: [
        { x1: 480, y1: 50, x2: 480, y2: 250 },
        { x1: 480, y1: 250, x2: 750, y2: 250 },
        { x1: 50, y1: 210, x2: 250, y2: 210 },
        { x1: 250, y1: 50, x2: 250, y2: 370 },
        { x1: 50, y1: 370, x2: 250, y2: 370 },
        { x1: 480, y1: 450, x2: 480, y2: 550 },
        { x1: 480, y1: 450, x2: 600, y2: 450 }
      ],
      doors: [
        { x: 480, y: 200, r: 40, startAngle: 180, endAngle: 270, dx: -40, dy: 0 },
        { x: 250, y: 150, r: 40, startAngle: 270, endAngle: 360, dx: 0, dy: -40 },
        { x: 250, y: 310, r: 40, startAngle: 0, endAngle: 90, dx: 0, dy: 40 },
        { x: 350, y: 550, r: 60, startAngle: 180, endAngle: 270, dx: -60, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 350, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'salida_emergencia', name: 'Salida de Emergencia', x: 400, y: 55, allowedTypes: ['salida_emergencia', 'ruta_evacuacion'], rotation: 270 },
        { id: 'cocina_gas', name: 'Cocina (Gas)', x: 650, y: 55, allowedTypes: ['valvula_gas', 'extintor', 'detector_humo'], rotation: 270 },
        { id: 'cocina_general', name: 'Cocina (General)', x: 495, y: 180, allowedTypes: ['extintor', 'detector_humo'], rotation: 180 },
        { id: 'caja_recepcion', name: 'Caja / Recepción', x: 540, y: 445, allowedTypes: ['botiquin', 'extintor', 'ruta_evacuacion'], rotation: 270 },
        { id: 'comedor_centro', name: 'Comedor (Centro)', x: 465, y: 320, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'comedor_izq', name: 'Comedor (Izquierda)', x: 265, y: 320, allowedTypes: ['ruta_evacuacion', 'botiquin'], rotation: 90 },
        { id: 'almacen', name: 'Almacén', x: 55, y: 100, allowedTypes: ['extintor', 'detector_humo'], rotation: 90 },
        { id: 'baños', name: 'Baños', x: 55, y: 280, allowedTypes: ['ruta_evacuacion'], rotation: 90 },
        { id: 'tablero_electrico', name: 'Tablero Eléctrico', x: 745, y: 300, allowedTypes: ['riesgo_electrico', 'extintor', 'ruta_evacuacion'], rotation: 90 }
      ]
    },
    {
      id: 'restaurante',
      name: 'Restaurante (Estilo B)',
      rooms: [
        { name: 'Comedor Principal', x: 50, y: 50, w: 430, h: 500 },
        { name: 'Cocina', x: 480, y: 300, w: 270, h: 250 },
        { name: 'Baño Hombres', x: 480, y: 50, w: 130, h: 120 },
        { name: 'Baño Mujeres', x: 610, y: 50, w: 140, h: 120 },
        { name: 'Almacén', x: 480, y: 170, w: 270, h: 130 }
      ],
      walls: [
        { x1: 480, y1: 50, x2: 480, y2: 550 },
        { x1: 480, y1: 170, x2: 750, y2: 170 },
        { x1: 610, y1: 50, x2: 610, y2: 170 },
        { x1: 480, y1: 300, x2: 750, y2: 300 }
      ],
      doors: [
        { x: 480, y: 400, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 480, y: 225, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 540, y: 170, r: 30, startAngle: 0, endAngle: 90, dx: 0, dy: -30 },
        { x: 670, y: 170, r: 30, startAngle: 0, endAngle: 90, dx: 0, dy: -30 },
        { x: 260, y: 550, r: 60, startAngle: 180, endAngle: 270, dx: -60, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 260, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'salida_emergencia', name: 'Salida de Emergencia', x: 400, y: 55, allowedTypes: ['salida_emergencia', 'ruta_evacuacion'], rotation: 270 },
        { id: 'cocina_gas', name: 'Cocina (Gas)', x: 650, y: 310, allowedTypes: ['valvula_gas', 'extintor', 'detector_humo'], rotation: 270 },
        { id: 'cocina_general', name: 'Cocina (General)', x: 495, y: 480, allowedTypes: ['extintor', 'detector_humo'], rotation: 180 },
        { id: 'almacen', name: 'Almacén', x: 495, y: 200, allowedTypes: ['extintor', 'detector_humo'], rotation: 180 },
        { id: 'comedor_centro', name: 'Comedor (Centro)', x: 250, y: 250, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'comedor_izq', name: 'Comedor (Izquierda)', x: 55, y: 250, allowedTypes: ['ruta_evacuacion', 'botiquin'], rotation: 90 },
        { id: 'baños', name: 'Baños', x: 745, y: 100, allowedTypes: ['ruta_evacuacion'], rotation: 180 }
      ]
    }
  ],
  oficina: [
    {
      id: 'oficina',
      name: 'Oficina Administrativa (Estilo A)',
      rooms: [
        { name: 'Recepción', x: 260, y: 380, w: 280, h: 170 },
        { name: 'Sala de Juntas', x: 480, y: 50, w: 270, h: 220 },
        { name: 'Oficina A', x: 50, y: 50, w: 200, h: 160 },
        { name: 'Oficina B', x: 260, y: 50, w: 210, h: 160 },
        { name: 'Site / Tablero', x: 50, y: 210, w: 200, h: 160 },
        { name: 'Baño', x: 50, y: 380, w: 200, h: 170 },
        { name: 'Pasillo Principal', x: 260, y: 220, w: 490, h: 150 }
      ],
      walls: [
        { x1: 260, y1: 50, x2: 260, y2: 370 },
        { x1: 470, y1: 50, x2: 470, y2: 270 },
        { x1: 50, y1: 210, x2: 260, y2: 210 },
        { x1: 50, y1: 370, x2: 260, y2: 370 },
        { x1: 260, y1: 370, x2: 750, y2: 370 },
        { x1: 470, y1: 270, x2: 750, y2: 270 }
      ],
      doors: [
        { x: 260, y: 130, r: 35, startAngle: 270, endAngle: 360, dx: 0, dy: -35 },
        { x: 260, y: 310, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 260, y: 440, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 470, y: 180, r: 40, startAngle: 180, endAngle: 270, dx: -40, dy: 0 },
        { x: 450, y: 370, r: 35, startAngle: 0, endAngle: 90, dx: 35, dy: 0 },
        { x: 380, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 380, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'recepcion', name: 'Recepción', x: 275, y: 440, allowedTypes: ['botiquin', 'extintor'], rotation: 90 },
        { id: 'sala_juntas', name: 'Sala de Juntas', x: 745, y: 120, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 180 },
        { id: 'oficina_a', name: 'Oficina A', x: 55, y: 100, allowedTypes: ['detector_humo', 'extintor'], rotation: 90 },
        { id: 'oficina_b', name: 'Oficina B', x: 455, y: 100, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'site_servidores', name: 'Site / Servidores', x: 55, y: 280, allowedTypes: ['riesgo_electrico', 'extintor', 'detector_humo'], rotation: 90 },
        { id: 'pasillo_comun', name: 'Pasillo Principal', x: 500, y: 355, allowedTypes: ['ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'baño', name: 'Baño', x: 55, y: 450, allowedTypes: ['ruta_evacuacion'], rotation: 90 }
      ]
    },
    {
      id: 'oficina',
      name: 'Oficina Administrativa (Estilo B)',
      rooms: [
        { name: 'Recepción', x: 280, y: 380, w: 240, h: 170 },
        { name: 'Pasillo Central', x: 280, y: 50, w: 240, h: 330 },
        { name: 'Oficina Gerencia', x: 50, y: 50, w: 230, h: 160 },
        { name: 'Oficina Ventas', x: 520, y: 50, w: 230, h: 160 },
        { name: 'Oficina Operativa', x: 50, y: 210, w: 230, h: 170 },
        { name: 'Baño', x: 520, y: 210, w: 230, h: 170 },
        { name: 'Site / Archivo', x: 50, y: 380, w: 230, h: 170 },
        { name: 'Sala de Juntas', x: 520, y: 380, w: 230, h: 170 }
      ],
      walls: [
        { x1: 280, y1: 50, x2: 280, y2: 550 },
        { x1: 520, y1: 50, x2: 520, y2: 550 },
        { x1: 50, y1: 210, x2: 280, y2: 210 },
        { x1: 50, y1: 380, x2: 280, y2: 380 },
        { x1: 520, y1: 210, x2: 750, y2: 210 },
        { x1: 520, y1: 380, x2: 750, y2: 380 }
      ],
      doors: [
        { x: 280, y: 130, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 520, y: 130, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 280, y: 290, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 520, y: 290, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 280, y: 460, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 520, y: 460, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 400, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 400, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'recepcion', name: 'Recepción', x: 350, y: 440, allowedTypes: ['botiquin', 'extintor'], rotation: 90 },
        { id: 'pasillo_central', name: 'Pasillo Central', x: 400, y: 200, allowedTypes: ['ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'oficina_gerencia', name: 'Oficina Gerencia', x: 55, y: 100, allowedTypes: ['detector_humo', 'extintor'], rotation: 90 },
        { id: 'oficina_ventas', name: 'Oficina Ventas', x: 745, y: 100, allowedTypes: ['detector_humo'], rotation: 180 },
        { id: 'oficina_operativa', name: 'Oficina Operativa', x: 55, y: 280, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'baño', name: 'Baño', x: 745, y: 280, allowedTypes: ['ruta_evacuacion'], rotation: 180 },
        { id: 'site_archivo', name: 'Site / Archivo', x: 55, y: 450, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 90 },
        { id: 'sala_juntas', name: 'Sala de Juntas', x: 745, y: 450, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 180 }
      ]
    },
    {
      id: 'oficina',
      name: 'Oficina Administrativa (Estilo C)',
      rooms: [
        { name: 'Recepción y Espera', x: 50, y: 320, w: 260, h: 230 },
        { name: 'Área de Coworking', x: 310, y: 200, w: 440, h: 350 },
        { name: 'Sala de Juntas', x: 50, y: 50, w: 260, h: 270 },
        { name: 'Privado A', x: 310, y: 50, w: 220, h: 150 },
        { name: 'Privado B', x: 530, y: 50, w: 220, h: 150 },
        { name: 'Cocineta / Cafetería', x: 310, y: 430, w: 220, h: 120 },
        { name: 'Baño', x: 530, y: 430, w: 220, h: 120 }
      ],
      walls: [
        { x1: 50, y1: 320, x2: 310, y2: 320 },
        { x1: 310, y1: 50, x2: 310, y2: 550 },
        { x1: 310, y1: 200, x2: 750, y2: 200 },
        { x1: 530, y1: 50, x2: 530, y2: 200 },
        { x1: 310, y1: 430, x2: 750, y2: 430 },
        { x1: 530, y1: 430, x2: 530, y2: 550 }
      ],
      doors: [
        { x: 310, y: 220, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 310, y: 400, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 420, y: 200, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 640, y: 200, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 640, y: 430, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 180, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 180, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'recepcion', name: 'Recepción', x: 100, y: 400, allowedTypes: ['botiquin', 'extintor'], rotation: 90 },
        { id: 'sala_juntas', name: 'Sala de Juntas', x: 55, y: 150, allowedTypes: ['detector_humo', 'extintor'], rotation: 90 },
        { id: 'coworking', name: 'Área de Coworking', x: 745, y: 300, allowedTypes: ['ruta_evacuacion', 'extintor', 'detector_humo'], rotation: 180 },
        { id: 'privado_a', name: 'Privado A', x: 350, y: 100, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'privado_b', name: 'Privado B', x: 700, y: 100, allowedTypes: ['detector_humo'], rotation: 180 },
        { id: 'baño', name: 'Baño', x: 700, y: 480, allowedTypes: ['ruta_evacuacion'], rotation: 180 }
      ]
    },
    {
      id: 'oficina',
      name: 'Oficina Administrativa (Estilo D)',
      rooms: [
        { name: 'Recepción y Espera', x: 50, y: 380, w: 260, h: 170 },
        { name: 'Pasillo L', x: 310, y: 220, w: 440, h: 330 },
        { name: 'Oficina Gerencia', x: 50, y: 50, w: 260, h: 170 },
        { name: 'Oficina Ventas', x: 310, y: 50, w: 220, h: 170 },
        { name: 'Sala de Juntas', x: 530, y: 50, w: 220, h: 170 },
        { name: 'Baño', x: 50, y: 220, w: 260, h: 160 },
        { name: 'Site / Sistemas', x: 580, y: 380, w: 170, h: 170 }
      ],
      walls: [
        { x1: 50, y1: 220, x2: 750, y2: 220 },
        { x1: 310, y1: 50, x2: 310, y2: 220 },
        { x1: 530, y1: 50, x2: 530, y2: 220 },
        { x1: 310, y1: 220, x2: 310, y2: 550 },
        { x1: 50, y1: 380, x2: 310, y2: 380 },
        { x1: 580, y1: 380, x2: 580, y2: 550 },
        { x1: 580, y1: 380, x2: 750, y2: 380 }
      ],
      doors: [
        { x: 180, y: 220, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 310, y: 400, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 180, y: 220, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 420, y: 220, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 640, y: 220, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 580, y: 450, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 180, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 180, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'recepcion', name: 'Recepción', x: 100, y: 440, allowedTypes: ['botiquin', 'extintor'], rotation: 90 },
        { id: 'baño', name: 'Baño', x: 55, y: 280, allowedTypes: ['ruta_evacuacion'], rotation: 90 },
        { id: 'gerencia', name: 'Oficina Gerencia', x: 55, y: 100, allowedTypes: ['detector_humo', 'extintor'], rotation: 90 },
        { id: 'ventas', name: 'Oficina Ventas', x: 350, y: 100, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'juntas', name: 'Sala de Juntas', x: 745, y: 100, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 180 },
        { id: 'pasillo', name: 'Pasillo L', x: 450, y: 350, allowedTypes: ['ruta_evacuacion', 'extintor'], rotation: 270 },
        { id: 'site', name: 'Site / Sistemas', x: 745, y: 450, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 180 }
      ]
    },
    {
      id: 'oficina',
      name: 'Oficina Administrativa (Estilo E)',
      rooms: [
        { name: 'Lobby / Recepción', x: 260, y: 210, w: 280, h: 170 },
        { name: 'Pasillo Norte', x: 50, y: 210, w: 210, h: 50 },
        { name: 'Pasillo Sur', x: 540, y: 330, w: 210, h: 50 },
        { name: 'Oficina Gerente', x: 50, y: 50, w: 210, h: 160 },
        { name: 'Oficina Juntas', x: 540, y: 50, w: 210, h: 160 },
        { name: 'Oficina Común', x: 260, y: 50, w: 280, h: 160 },
        { name: 'Baño', x: 50, y: 380, w: 210, h: 170 },
        { name: 'Site / Redes', x: 540, y: 380, w: 210, h: 170 },
        { name: 'Área Operativa', x: 260, y: 380, w: 280, h: 170 }
      ],
      walls: [
        { x1: 260, y1: 50, x2: 260, y2: 550 },
        { x1: 540, y1: 50, x2: 540, y2: 550 },
        { x1: 50, y1: 210, x2: 750, y2: 210 },
        { x1: 50, y1: 380, x2: 750, y2: 380 }
      ],
      doors: [
        { x: 260, y: 130, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 540, y: 130, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 400, y: 210, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 260, y: 460, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 540, y: 460, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 400, y: 380, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 400, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 400, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'recepcion', name: 'Recepción', x: 400, y: 290, allowedTypes: ['botiquin', 'extintor'], rotation: 270 },
        { id: 'gerente', name: 'Oficina Gerente', x: 55, y: 100, allowedTypes: ['detector_humo', 'extintor'], rotation: 90 },
        { id: 'juntas', name: 'Sala de Juntas', x: 745, y: 100, allowedTypes: ['detector_humo'], rotation: 180 },
        { id: 'baño', name: 'Baño', x: 55, y: 450, allowedTypes: ['ruta_evacuacion'], rotation: 90 },
        { id: 'site', name: 'Site / Redes', x: 745, y: 450, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 180 },
        { id: 'comun', name: 'Oficina Común', x: 350, y: 100, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'operativa', name: 'Área Operativa', x: 350, y: 450, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 270 }
      ]
    }
  ],
  consultorio: [
    {
      id: 'consultorio',
      name: 'Consultorio Médico / Clínica (Estilo A)',
      rooms: [
        { name: 'Recepción y Espera', x: 50, y: 350, w: 700, h: 200 },
        { name: 'Pasillo Central', x: 330, y: 200, w: 140, h: 150 },
        { name: 'Consultorio A', x: 50, y: 50, w: 280, h: 150 },
        { name: 'Consultorio B', x: 470, y: 50, w: 280, h: 150 },
        { name: 'Consultorio C', x: 50, y: 200, w: 280, h: 150 },
        { name: 'Baño', x: 470, y: 200, w: 280, h: 150 }
      ],
      walls: [
        { x1: 330, y1: 50, x2: 330, y2: 350 },
        { x1: 470, y1: 50, x2: 470, y2: 350 },
        { x1: 50, y1: 200, x2: 330, y2: 200 },
        { x1: 470, y1: 200, x2: 750, y2: 200 },
        { x1: 50, y1: 350, x2: 330, y2: 350 },
        { x1: 470, y1: 350, x2: 750, y2: 350 },
        { x1: 400, y1: 50, x2: 400, y2: 200 }
      ],
      doors: [
        { x: 330, y: 120, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 470, y: 120, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 330, y: 280, r: 35, startAngle: 270, endAngle: 360, dx: -35, dy: 0 },
        { x: 470, y: 280, r: 35, startAngle: 180, endAngle: 270, dx: 35, dy: 0 },
        { x: 400, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 400, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'sala_espera', name: 'Sala de Espera', x: 200, y: 450, allowedTypes: ['detector_humo', 'extintor', 'botiquin', 'ruta_evacuacion'], rotation: 90 },
        { id: 'recepcion_desk', name: 'Recepción', x: 600, y: 450, allowedTypes: ['botiquin', 'extintor'], rotation: 270 },
        { id: 'consultorio_1', name: 'Consultorio A', x: 55, y: 120, allowedTypes: ['detector_humo', 'extintor', 'ruta_evacuacion'], rotation: 90 },
        { id: 'consultorio_2', name: 'Consultorio B', x: 745, y: 120, allowedTypes: ['detector_humo'], rotation: 180 },
        { id: 'baño', name: 'Baño', x: 745, y: 280, allowedTypes: ['ruta_evacuacion'], rotation: 180 }
      ]
    },
    {
      id: 'consultorio',
      name: 'Consultorio Médico / Clínica (Estilo B)',
      rooms: [
        { name: 'Recepción y Espera', x: 50, y: 380, w: 700, h: 170 },
        { name: 'Pasillo Horizontal', x: 50, y: 240, w: 700, h: 140 },
        { name: 'Consultorio A', x: 50, y: 50, w: 220, h: 190 },
        { name: 'Consultorio B', x: 270, y: 50, w: 220, h: 190 },
        { name: 'Baño', x: 490, y: 50, w: 100, h: 190 },
        { name: 'Laboratorio', x: 590, y: 50, w: 160, h: 190 }
      ],
      walls: [
        { x1: 50, y1: 240, x2: 750, y2: 240 },
        { x1: 50, y1: 380, x2: 350, y2: 380 },
        { x1: 450, y1: 380, x2: 750, y2: 380 },
        { x1: 270, y1: 50, x2: 270, y2: 240 },
        { x1: 490, y1: 50, x2: 490, y2: 240 },
        { x1: 590, y1: 50, x2: 590, y2: 240 }
      ],
      doors: [
        { x: 160, y: 240, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 380, y: 240, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 540, y: 240, r: 30, startAngle: 0, endAngle: 90, dx: 0, dy: -30 },
        { x: 670, y: 240, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: -35 },
        { x: 400, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Principal', x: 400, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'sala_espera', name: 'Sala de Espera', x: 200, y: 460, allowedTypes: ['detector_humo', 'extintor', 'botiquin', 'ruta_evacuacion'], rotation: 90 },
        { id: 'recepcion_desk', name: 'Recepción', x: 600, y: 460, allowedTypes: ['botiquin', 'extintor'], rotation: 270 },
        { id: 'consultorio_1', name: 'Consultorio A', x: 55, y: 120, allowedTypes: ['detector_humo', 'extintor', 'ruta_evacuacion'], rotation: 90 },
        { id: 'consultorio_2', name: 'Consultorio B', x: 380, y: 120, allowedTypes: ['detector_humo'], rotation: 90 },
        { id: 'baño', name: 'Baño', x: 540, y: 120, allowedTypes: ['ruta_evacuacion'], rotation: 90 },
        { id: 'laboratorio', name: 'Laboratorio', x: 745, y: 120, allowedTypes: ['detector_humo', 'extintor', 'ruta_evacuacion'], rotation: 180 }
      ]
    }
  ],
  bodega: [
    {
      id: 'bodega',
      name: 'Bodega / Almacén (Estilo A)',
      rooms: [
        { name: 'Área de Almacenamiento', x: 50, y: 160, w: 700, h: 390 },
        { name: 'Oficina Adm.', x: 50, y: 50, w: 260, h: 110 },
        { name: 'Baño', x: 310, y: 50, w: 160, h: 110 }
      ],
      walls: [
        { x1: 50, y1: 160, x2: 750, y2: 160 },
        { x1: 310, y1: 50, x2: 310, y2: 160 },
        { x1: 470, y1: 50, x2: 470, y2: 160 }
      ],
      doors: [
        { x: 180, y: 160, r: 35, startAngle: 180, endAngle: 270, dx: -35, dy: 0 },
        { x: 380, y: 160, r: 30, startAngle: 0, endAngle: 90, dx: 0, dy: 30 },
        { x: 350, y: 550, r: 60, startAngle: 180, endAngle: 270, dx: -60, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Portón', x: 350, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'salida_emergencia', name: 'Salida Emergencia', x: 710, y: 55, allowedTypes: ['salida_emergencia', 'ruta_evacuacion'], rotation: 270 },
        { id: 'oficina_adm', name: 'Oficina Adm.', x: 55, y: 90, allowedTypes: ['botiquin', 'extintor', 'detector_humo'], rotation: 90 },
        { id: 'tablero_electrico', name: 'Tablero Eléctrico', x: 745, y: 90, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 180 },
        { id: 'bodega_centro_1', name: 'Almacén Central A', x: 55, y: 350, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 90 },
        { id: 'bodega_centro_2', name: 'Almacén Central B', x: 745, y: 350, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 90 },
        { id: 'bodega_pared_der', name: 'Muro Lateral Derecho', x: 745, y: 480, allowedTypes: ['extintor', 'ruta_evacuacion'], rotation: 90 },
        { id: 'baño', name: 'Baño', x: 455, y: 90, allowedTypes: ['ruta_evacuacion'], rotation: 180 }
      ]
    },
    {
      id: 'bodega',
      name: 'Bodega / Almacén (Estilo B)',
      rooms: [
        { name: 'Área de Carga/Descarga', x: 50, y: 380, w: 700, h: 170 },
        { name: 'Almacenaje Racks A', x: 50, y: 160, w: 340, h: 220 },
        { name: 'Almacenaje Racks B', x: 410, y: 160, w: 340, h: 220 },
        { name: 'Oficina Control', x: 50, y: 50, w: 400, h: 110 },
        { name: 'Baño Personal', x: 450, y: 50, w: 300, h: 110 }
      ],
      walls: [
        { x1: 50, y1: 160, x2: 750, y2: 160 },
        { x1: 50, y1: 380, x2: 750, y2: 380 },
        { x1: 450, y1: 50, x2: 450, y2: 160 },
        { x1: 390, y1: 160, x2: 390, y2: 380 }
      ],
      doors: [
        { x: 200, y: 160, r: 35, startAngle: 180, endAngle: 270, dx: -35, dy: 0 },
        { x: 550, y: 160, r: 30, startAngle: 0, endAngle: 90, dx: 0, dy: 30 },
        { x: 400, y: 550, r: 60, startAngle: 180, endAngle: 270, dx: -60, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Portón', x: 400, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'salida_emergencia', name: 'Salida Emergencia', x: 745, y: 390, allowedTypes: ['salida_emergencia', 'ruta_evacuacion'], rotation: 180 },
        { id: 'oficina_adm', name: 'Oficina Adm.', x: 55, y: 90, allowedTypes: ['botiquin', 'extintor', 'detector_humo'], rotation: 90 },
        { id: 'tablero_electrico', name: 'Tablero Eléctrico', x: 745, y: 90, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 180 },
        { id: 'bodega_centro_1', name: 'Almacén Central A', x: 55, y: 280, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 90 },
        { id: 'bodega_centro_2', name: 'Almacén Central B', x: 745, y: 280, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 90 },
        { id: 'baño', name: 'Baño', x: 465, y: 90, allowedTypes: ['ruta_evacuacion'], rotation: 90 }
      ]
    }
  ],
  comercio: [
    {
      id: 'comercio',
      name: 'Comercio General / Local (Estilo A)',
      rooms: [
        { name: 'Área de Exhibición y Ventas', x: 50, y: 220, w: 700, h: 330 },
        { name: 'Bodega de Mercancía', x: 50, y: 50, w: 420, h: 170 },
        { name: 'Baño / Servicio', x: 470, y: 50, w: 280, h: 170 }
      ],
      walls: [
        { x1: 50, y1: 220, x2: 750, y2: 220 },
        { x1: 470, y1: 50, x2: 470, y2: 220 }
      ],
      doors: [
        { x: 260, y: 220, r: 40, startAngle: 180, endAngle: 270, dx: -40, dy: 0 },
        { x: 580, y: 220, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 380, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Local', x: 380, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'caja_counter', name: 'Caja', x: 485, y: 440, allowedTypes: ['botiquin', 'extintor', 'ruta_evacuacion'], rotation: 90 },
        { id: 'area_ventas', name: 'Área de Ventas', x: 55, y: 350, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 90 },
        { id: 'almacen_back', name: 'Bodega Almacén', x: 55, y: 130, allowedTypes: ['extintor', 'detector_humo'], rotation: 90 },
        { id: 'baño', name: 'Baño', x: 745, y: 130, allowedTypes: ['ruta_evacuacion'], rotation: 180 },
        { id: 'tablero_comercio', name: 'Tablero Eléctrico', x: 745, y: 300, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 90 }
      ]
    },
    {
      id: 'comercio',
      name: 'Comercio General / Local (Estilo B)',
      rooms: [
        { name: 'Piso de Ventas', x: 50, y: 180, w: 700, h: 370 },
        { name: 'Probadores / Bodega', x: 480, y: 50, w: 270, h: 130 },
        { name: 'Caja', x: 50, y: 50, w: 200, h: 130 },
        { name: 'Oficina', x: 250, y: 50, w: 230, h: 130 }
      ],
      walls: [
        { x1: 50, y1: 180, x2: 750, y2: 180 },
        { x1: 250, y1: 50, x2: 250, y2: 180 },
        { x1: 480, y1: 50, x2: 480, y2: 180 }
      ],
      doors: [
        { x: 150, y: 180, r: 35, startAngle: 180, endAngle: 270, dx: -35, dy: 0 },
        { x: 350, y: 180, r: 35, startAngle: 180, endAngle: 270, dx: -35, dy: 0 },
        { x: 600, y: 180, r: 35, startAngle: 0, endAngle: 90, dx: 0, dy: 35 },
        { x: 400, y: 550, r: 50, startAngle: 180, endAngle: 270, dx: -50, dy: 0 }
      ],
      anchors: [
        { id: 'acceso_principal', name: 'Acceso Local', x: 400, y: 540, allowedTypes: ['salida_emergencia', 'ruta_evacuacion', 'extintor'], rotation: 180 },
        { id: 'caja_counter', name: 'Caja', x: 55, y: 100, allowedTypes: ['botiquin', 'extintor', 'ruta_evacuacion'], rotation: 90 },
        { id: 'area_ventas', name: 'Área de Ventas', x: 745, y: 350, allowedTypes: ['detector_humo', 'ruta_evacuacion'], rotation: 180 },
        { id: 'almacen_back', name: 'Bodega Almacén', x: 745, y: 100, allowedTypes: ['extintor', 'detector_humo'], rotation: 180 },
        { id: 'tablero_comercio', name: 'Tablero Eléctrico', x: 55, y: 300, allowedTypes: ['riesgo_electrico', 'extintor'], rotation: 90 }
      ]
    }
  ]
};

const GIROS_METADATA = [
  { id: 'restaurante', name: 'Restaurante' },
  { id: 'oficina', name: 'Oficina Administrativa' },
  { id: 'consultorio', name: 'Consultorio Médico / Clínica' },
  { id: 'bodega', name: 'Bodega / Almacén' },
  { id: 'comercio', name: 'Comercio General / Local' }
];

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

export default function CroquisSeñaleticaModal({ isOpen, onClose }: CroquisSeñaleticaModalProps) {
  const [commercialName, setCommercialName] = useState('MI ESTABLECIMIENTO');
  const [razonSocial, setRazonSocial] = useState('RAZON SOCIAL S.A. DE C.V.');
  const [selectedGiro, setSelectedGiro] = useState<string>('restaurante');
  const [activeVariationIndex, setActiveVariationIndex] = useState<number>(0);
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
  
  const svgRef = useRef<SVGSVGElement>(null);
  const dragInfoRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

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
      // Pick random variation on open
      const vars = GIROS_VARIATIONS[selectedGiro] || [];
      if (vars.length > 0) {
        setActiveVariationIndex(Math.floor(Math.random() * vars.length));
      }
    }
  }, [isOpen]);

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
  }, [selectedGiro, activeVariationIndex, isOpen]);

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
      
      const config = GIROS_VARIATIONS[selectedGiro]?.[activeVariationIndex] || GIROS_VARIATIONS[selectedGiro]?.[0];
      if (config) {
        // Use dynamic anchors to get correct acceso_principal coordinates
        const dynamicAnchors = config.anchors.map(anchor => {
          if (anchor.id === 'acceso_principal') {
            return {
              ...anchor,
              x: doorOrientation === 'S' ? 400 : 740,
              y: doorOrientation === 'S' ? 540 : 300,
              rotation: doorOrientation === 'S' ? 180 : 90
            };
          }
          return anchor;
        });

        const compatibleAnchors = dynamicAnchors.filter(a => a.allowedTypes.includes(type));
        
        let chosenAnchor = compatibleAnchors[0];
        let minOccupied = Infinity;
        
        compatibleAnchors.forEach(anchor => {
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
          if (chosenAnchor.id === 'acceso_principal' || chosenAnchor.id === 'salida_emergencia') {
            offsetX = (offsetIndex - 0.5) * spacing;
            offsetY = chosenAnchor.id === 'acceso_principal' ? -15 : 15;
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
            rotation: type === 'ruta_evacuacion' ? getEvacuationRouteRotation(chosenAnchor.x + offsetX, chosenAnchor.y + offsetY, doorOrientation) : 0
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
    const config = GIROS_VARIATIONS[selectedGiro]?.[activeVariationIndex] || GIROS_VARIATIONS[selectedGiro]?.[0];
    if (!config) return;

    // Create dynamic anchors based on doorOrientation
    const dynamicAnchors = config.anchors.map(anchor => {
      if (anchor.id === 'acceso_principal') {
        return {
          ...anchor,
          x: doorOrientation === 'S' ? 400 : 740,
          y: doorOrientation === 'S' ? 540 : 300,
          rotation: doorOrientation === 'S' ? 180 : 90
        };
      }
      return anchor;
    });

    const newPlaced: PlacedSign[] = [];
    const anchorAssignments: Record<string, SignType[]> = {};

    // Initialize anchor assignment registry
    dynamicAnchors.forEach(a => {
      anchorAssignments[a.id] = [];
    });

    // Map door orientation
    let entranceAnchorId = 'acceso_principal';
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

      // Distribute remaining counts round-robin style over compatible anchors
      let anchorIndex = 0;
      while (countToPlace > 0) {
        const targetAnchor = compatibleAnchors[anchorIndex % compatibleAnchors.length];
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
        if (anchor.id === 'acceso_principal' || anchor.id === 'salida_emergencia') {
          // Horizontal alignment
          offsetX = (index - (N - 1) / 2) * spacing;
          offsetY = anchor.id === 'acceso_principal' ? -15 : 15;
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
          rotation: type === 'ruta_evacuacion' ? getEvacuationRouteRotation(anchor.x + offsetX, anchor.y + offsetY, doorOrientation) : 0
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

  const currentGiroConfig = GIROS_VARIATIONS[selectedGiro]?.[activeVariationIndex] || GIROS_VARIATIONS.restaurante[0];

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
                      const giro = e.target.value;
                      setSelectedGiro(giro);
                      const vars = GIROS_VARIATIONS[giro] || [];
                      const randIdx = Math.floor(Math.random() * vars.length);
                      setActiveVariationIndex(randIdx);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-semibold cursor-pointer"
                  >
                    {GIROS_METADATA.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const vars = GIROS_VARIATIONS[selectedGiro] || [];
                      if (vars.length > 1) {
                        let nextIndex = activeVariationIndex;
                        while (nextIndex === activeVariationIndex) {
                          nextIndex = Math.floor(Math.random() * vars.length);
                        }
                        setActiveVariationIndex(nextIndex);
                      }
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

                {/* Grid Background */}
                {showGrid && <rect width="800" height="600" fill="url(#grid)" />}

                {/* Outer Wall Boundary */}
                <rect
                  x="40"
                  y="40"
                  width="720"
                  height="520"
                  rx="6"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="5"
                  strokeLinecap="round"
                />

                {/* Interior Rooms Layout */}
                {currentGiroConfig.rooms.map((room, idx) => (
                  <g key={`room-${idx}`} className="opacity-90">
                    {/* Room boundary fill for visual separation */}
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.w}
                      height={room.h}
                      fill="#f8fafc"
                      fillOpacity="0.8"
                    />
                    
                    {/* Room Label Pill Container */}
                    <rect
                      x={room.x + room.w / 2 - 70}
                      y={room.y + room.h / 2 - 12}
                      width="140"
                      height="24"
                      rx="12"
                      fill="#ffffff"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                    
                    {/* Room text */}
                    <text
                      x={room.x + room.w / 2}
                      y={room.y + room.h / 2 + 4}
                      fill="#334155"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="system-ui, sans-serif"
                      textAnchor="middle"
                      className="uppercase tracking-wider select-none"
                    >
                      {room.name}
                    </text>
                  </g>
                ))}

                {/* Room divider walls */}
                {currentGiroConfig.walls.map((wall, idx) => (
                  <line
                    key={`wall-${idx}`}
                    x1={wall.x1}
                    y1={wall.y1}
                    x2={wall.x2}
                    y2={wall.y2}
                    stroke="#0f172a"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                ))}

                {/* Swing Doors representation (Blueprint style) */}
                {currentGiroConfig.doors.filter(door => door.y < 500).map((door, idx) => (
                  <g key={`door-${idx}`}>
                    {/* Swing arc */}
                    <path
                      d={`M ${door.x} ${door.y} A ${door.r} ${door.r} 0 0 1 ${door.x + door.dx} ${door.y + door.dy}`}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="2,3"
                    />
                    {/* Door Slab */}
                    <line
                      x1={door.x}
                      y1={door.y}
                      x2={door.x + (door.dx !== 0 ? 0 : door.r * (door.dy < 0 ? -1 : 1))}
                      y2={door.y + (door.dy !== 0 ? 0 : door.r * (door.dx < 0 ? 1 : -1))}
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </g>
                ))}

                {/* Dynamic, High-Visibility Main Entrance Door (South or East) */}
                {doorOrientation === 'S' ? (
                  <g>
                    {/* White cutout to erase the black outer wall */}
                    <rect x="373" y="556" width="54" height="8" fill="white" />
                    
                    {/* Hinge vertical end-posts */}
                    <line x1="375" y1="556" x2="375" y2="564" stroke="#0f172a" strokeWidth="3" />
                    <line x1="425" y1="556" x2="425" y2="564" stroke="#0f172a" strokeWidth="3" />
                    
                    {/* Swing dashed arc */}
                    <path
                      d="M 375 560 A 50 50 0 0 1 425 510"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="2,3"
                    />
                    
                    {/* Door slab (open inwards) */}
                    <line x1="425" y1="560" x2="425" y2="510" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
                  </g>
                ) : (
                  <g>
                    {/* White cutout to erase the right outer wall */}
                    <rect x="756" y="273" width="8" height="54" fill="white" />
                    
                    {/* Hinge horizontal end-posts */}
                    <line x1="756" y1="275" x2="764" y2="275" stroke="#0f172a" strokeWidth="3" />
                    <line x1="756" y1="325" x2="764" y2="325" stroke="#0f172a" strokeWidth="3" />
                    
                    {/* Swing dashed arc */}
                    <path
                      d="M 760 275 A 50 50 0 0 0 710 325"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="2,3"
                    />
                    
                    {/* Door slab (open inwards) */}
                    <line x1="760" y1="325" x2="710" y2="325" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
                  </g>
                )}

                {/* Warehouse Racks Outlines if Bodega selected */}
                {selectedGiro === 'bodega' && (
                  <g opacity="0.4">
                    {/* Rack outlines to populate empty warehouse floor */}
                    <path d="M 80 180 h 80 v 100 h -80 z M 80 300 h 80 v 100 h -80 z M 80 420 h 80 v 100 h -80 z" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                    <path d="M 240 180 h 80 v 100 h -80 z M 240 300 h 80 v 100 h -80 z M 240 420 h 80 v 100 h -80 z" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                    <path d="M 400 180 h 80 v 100 h -80 z M 400 300 h 80 v 100 h -80 z M 400 420 h 80 v 100 h -80 z" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                    <path d="M 560 180 h 80 v 100 h -80 z M 560 300 h 80 v 100 h -80 z M 560 420 h 80 v 100 h -80 z" fill="none" stroke="#cbd5e1" strokeWidth="2" />
                  </g>
                )}

                {/* North arrow coordinate display */}
                <g transform="translate(735, 75)" opacity="0.8">
                  <circle r="20" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <path d="M 0 -13 L 5 -3 L 2 -3 L 2 12 L -2 12 L -2 -3 L -5 -3 Z" fill="#0f172a" />
                  <text x="0" y="-15" textAnchor="middle" fontSize="9" fontWeight="black" fill="#0f172a">N</text>
                </g>

                {/* Scale reference bar */}
                <g transform="translate(620, 535)">
                  <rect width="100" height="4" fill="#475569" />
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="1.5" />
                  <line x1="50" y1="0" x2="50" y2="8" stroke="#475569" strokeWidth="1.5" />
                  <line x1="100" y1="0" x2="100" y2="8" stroke="#475569" strokeWidth="1.5" />
                  <text x="50" y="-5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#475569">Escala: 5m</text>
                </g>



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
