/* ============================================================
   Generador de croquis arquitectónicos por giro de negocio.

   Produce planos coherentes con distribuciones predeterminadas
   (3 variantes por giro) y medidas aleatorizadas dentro de
   rangos razonables: muros, puertas con abatimiento, mobiliario,
   cotas en metros, norte y escala gráfica.

   La salida es un fragmento SVG (string) ya encajado en el
   viewBox 800×600 del lienzo de CroquisSeñaleticaModal, más una
   lista de "anchors" (puntos sugeridos para señaléticas) en esas
   mismas coordenadas, compatible con la colocación automática.

   Unidades internas: metros. Origen: esquina superior izquierda.
   ============================================================ */

export type CroquisSignType =
  | 'extintor' | 'ruta_evacuacion' | 'salida_emergencia' | 'botiquin'
  | 'riesgo_electrico' | 'detector_humo' | 'valvula_gas';

export interface CroquisAnchor {
  id: string;
  name: string;
  x: number;           // px del viewBox 800×600
  y: number;
  allowedTypes: CroquisSignType[];
  rotation?: number;
  role?: string;
}

export interface GeneratedCroquis {
  baseSVG: string;     // fragmento SVG del plano base (sin <svg> exterior)
  anchors: CroquisAnchor[];
  widthM: number;
  heightM: number;
  variant: number;
  variants: number;
  seed: number;
  giroLabel: string;
}

export type DoorSide = 'S' | 'E';

/* ---------- tipos internos ---------- */
type Rng = () => number;

interface Room { x: number; y: number; w: number; h: number; label: string; role: string; }
interface Wall { x1: number; y1: number; x2: number; y2: number; }
interface Door {
  x: number; y: number;
  dir: 'h' | 'v';
  len: number;
  hinge: 0 | 1;
  swing: 1 | -1;
  kind: 'single' | 'double' | 'open' | 'slide';
  entrance?: boolean;
  exteriorExit?: boolean;
}
interface Furn { type: string; x: number; y: number; w: number; h: number; rot: number; opts?: Record<string, unknown>; }

interface Plan {
  w: number; h: number;
  rooms: Room[]; walls: Wall[]; doors: Door[]; furn: Furn[];
  vBands: number[] | null;
}

interface DoorOpt {
  hinge?: 0 | 1;
  swing?: 1 | -1;
  kind?: Door['kind'];
  entrance?: boolean;
  exteriorExit?: boolean;
}

/* ---------- utilidades ---------- */
function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rr = (rng: Rng, a: number, b: number) => a + rng() * (b - a);
const ri = (rng: Rng, a: number, b: number) => Math.floor(rr(rng, a, b + 1));
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const hingeRnd = (rng: Rng): 0 | 1 => (rng() < 0.5 ? 0 : 1);

function newPlan(w: number, h: number): Plan {
  return { w, h, rooms: [], walls: [], doors: [], furn: [], vBands: null };
}
function room(p: Plan, x: number, y: number, w: number, h: number, label: string, role: string): Room {
  const r = { x, y, w, h, label, role };
  p.rooms.push(r);
  return r;
}
function wall(p: Plan, x1: number, y1: number, x2: number, y2: number) {
  p.walls.push({ x1, y1, x2, y2 });
}
function door(p: Plan, x: number, y: number, dir: 'h' | 'v', len: number, opt?: DoorOpt) {
  p.doors.push({ x, y, dir, len, hinge: 0, swing: 1, kind: 'single', ...opt });
}
function opening(p: Plan, x: number, y: number, dir: 'h' | 'v', len: number) {
  door(p, x, y, dir, len, { kind: 'open' });
}
function furn(p: Plan, type: string, x: number, y: number, w: number, h: number, rot = 0, opts?: Record<string, unknown>) {
  p.furn.push({ type, x, y, w, h, rot, opts });
}
function splitTotal(total: number, weights: number[]): number[] {
  const s = weights.reduce((a, b) => a + b, 0);
  return weights.map(w2 => total * w2 / s);
}

/* ============================================================
   BIBLIOTECA DE MOBILIARIO (símbolos en caja local w×h, metros)
   ============================================================ */
const F_STROKE = 0.035;
const F_COLOR = '#4b566b';

const fa = (extra?: string) =>
  `fill="none" stroke="${F_COLOR}" stroke-width="${F_STROKE}" stroke-linecap="round" stroke-linejoin="round" ${extra || ''}`;
const rc = (x: number, y: number, w: number, h: number, rx = 0, extra?: string) =>
  `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" rx="${rx.toFixed(3)}" ${fa(extra)}/>`;
const ln = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}" ${fa()}/>`;
const ci = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" r="${r.toFixed(3)}" ${fa()}/>`;
const el = (cx: number, cy: number, rx: number, ry: number) =>
  `<ellipse cx="${cx.toFixed(3)}" cy="${cy.toFixed(3)}" rx="${rx.toFixed(3)}" ry="${ry.toFixed(3)}" ${fa()}/>`;
const chairAt = (x: number, y: number, s: number) =>
  rc(x, y + s * 0.15, s, s * 0.85, s * 0.12) + ln(x + s * 0.08, y + s * 0.12, x + s * 0.92, y + s * 0.12);

type FurnFn = (w: number, h: number, opts: Record<string, unknown>) => string;

const FURN_LIB: Record<string, FurnFn> = {
  chair: (w, h) => chairAt(0, 0, Math.min(w, h)),

  deskChair: (w, h) => {
    const dh = h * 0.5;
    return rc(0, 0, w, dh, 0.03) + ln(w * 0.12, dh * 0.5, w * 0.4, dh * 0.5) +
           chairAt(w / 2 - 0.22, dh + h * 0.08, 0.44);
  },

  deskPair: (w, h) => {
    const dh = h * 0.32;
    return rc(0, h * 0.5 - dh, w, dh, 0.02) + rc(0, h * 0.5, w, dh, 0.02) +
           chairAt(w / 2 - 0.21, h * 0.5 - dh - 0.5, 0.42) +
           chairAt(w / 2 - 0.21, h * 0.5 + dh + 0.06, 0.42);
  },

  table4: (w, h) => {
    const s = Math.min(w, h); const t = s * 0.52, cs = s * 0.2;
    const cx = w / 2, cy = h / 2;
    return rc(cx - t / 2, cy - t / 2, t, t, 0.02) +
           rc(cx - cs / 2, cy - t / 2 - cs - 0.04, cs, cs, 0.04) +
           rc(cx - cs / 2, cy + t / 2 + 0.04, cs, cs, 0.04) +
           rc(cx - t / 2 - cs - 0.04, cy - cs / 2, cs, cs, 0.04) +
           rc(cx + t / 2 + 0.04, cy - cs / 2, cs, cs, 0.04);
  },

  tableRound: (w, h) => {
    const s = Math.min(w, h); const r = s * 0.28, cs = s * 0.19;
    const cx = w / 2, cy = h / 2;
    return ci(cx, cy, r) +
           rc(cx - cs / 2, cy - r - cs - 0.05, cs, cs, 0.04) +
           rc(cx - cs / 2, cy + r + 0.05, cs, cs, 0.04) +
           rc(cx - r - cs - 0.05, cy - cs / 2, cs, cs, 0.04) +
           rc(cx + r + 0.05, cy - cs / 2, cs, cs, 0.04);
  },

  lowTable: (w, h) => ci(w / 2, h / 2, Math.min(w, h) * 0.42),

  sofa: (w, h) =>
    rc(0, 0, w, h, 0.1) + ln(0.08, h * 0.3, w - 0.08, h * 0.3) +
    ln(0.14, h * 0.3, 0.14, h - 0.08) + ln(w - 0.14, h * 0.3, w - 0.14, h - 0.08),

  waitRow: (w, h, o) => {
    const vert = !!o.vert;
    const len = vert ? h : w, s = vert ? w : h;
    const n = (o.n as number) || Math.max(2, Math.floor(len / 0.58));
    const step = len / n;
    let out = '';
    for (let i = 0; i < n; i++) {
      const off = i * step + (step - Math.min(s, 0.48)) / 2;
      out += vert ? chairAt(0, off, Math.min(s, 0.48)) : chairAt(off, 0, Math.min(s, 0.48));
    }
    return out;
  },

  receptionL: (w, h) =>
    rc(0, h * 0.55, w, h * 0.45, 0.03) + rc(w * 0.7, 0, w * 0.3, h * 0.62, 0.03) +
    ci(w * 0.35, h * 0.3, 0.19) + ln(w * 0.06, h * 0.75, w * 0.3, h * 0.75),

  plant: (w, h) => {
    const r = Math.min(w, h) * 0.42, cx = w / 2, cy = h / 2;
    let out = ci(cx, cy, r);
    for (let a = 0; a < 6; a++) {
      const t = a * Math.PI / 3;
      out += ln(cx, cy, cx + Math.cos(t) * r * 0.8, cy + Math.sin(t) * r * 0.8);
    }
    return out;
  },

  fileCab: (w, h) => rc(0, 0, w, h) + ln(0, h / 2, w, h / 2),
  bigTable: (w, h) => rc(0, 0, w, h, 0.08),

  partition: (w, h) =>
    `<line x1="0" y1="0" x2="${w.toFixed(3)}" y2="${h.toFixed(3)}" stroke="#2b3548" stroke-width="0.06"/>`,

  toilet: (w, h) =>
    rc(w * 0.12, 0, w * 0.76, h * 0.3, 0.03) + el(w / 2, h * 0.62, w * 0.32, h * 0.33),

  sink: (w, h) =>
    rc(0, 0, w, h, 0.05) + el(w / 2, h * 0.55, w * 0.3, h * 0.26) + ln(w / 2, h * 0.12, w / 2, h * 0.28),

  counterSink: (w, h, o) => {
    const n = (o.n as number) || 2;
    let out = rc(0, 0, w, h, 0.02);
    for (let i = 0; i < n; i++) {
      const cx = w * (i + 0.5) / n;
      out += ci(cx, h / 2, Math.min(h * 0.3, 0.17)) + ln(cx, h * 0.14, cx, h * 0.3);
    }
    return out;
  },

  examTable: (w, h) =>
    rc(0, 0, w, h, 0.09) + ln(0.06, h * 0.2, w - 0.06, h * 0.2) +
    ci(w / 2, h * 0.11, Math.min(w * 0.14, 0.08)),

  massage: (w, h) =>
    rc(0, 0, w, h, 0.12) + ci(w / 2, h * 0.12, Math.min(w * 0.16, 0.1)) +
    ln(0.06, h * 0.86, w - 0.06, h * 0.86),

  stool: (w, h) => ci(w / 2, h / 2, Math.min(w, h) * 0.4),

  jacuzzi: (w, h) => {
    let out = rc(0, 0, w, h, 0.15) + el(w / 2, h / 2, w * 0.36, h * 0.34);
    [[0.18, 0.18], [0.82, 0.18], [0.18, 0.82], [0.82, 0.82]].forEach(pt => {
      out += ci(w * pt[0], h * pt[1], 0.045);
    });
    return out;
  },

  saunaBench: (w, h) =>
    rc(0, 0, w, h * 0.34, 0.02) + rc(0, h * 0.34, w * 0.34, h - h * 0.34, 0.02) +
    rc(w * 0.62, h * 0.62, w * 0.34, h * 0.34) +
    ci(w * 0.71, h * 0.71, 0.035) + ci(w * 0.86, h * 0.71, 0.035) + ci(w * 0.785, h * 0.86, 0.035),

  lockers: (w, h, o) => {
    const n = (o.n as number) || 4;
    let out = rc(0, 0, w, h);
    for (let i = 1; i < n; i++) out += ln(w * i / n, 0, w * i / n, h);
    return out;
  },

  benchSeat: (w, h) => rc(0, 0, w, h, 0.04) + ln(0, h / 2, w, h / 2),

  island: (w, h) =>
    rc(0, 0, w, h, 0.1) + rc(w * 0.08, h * 0.22, w * 0.3, h * 0.56, 0.02) +
    ci(w * 0.16, h * 0.4, 0.09) + ci(w * 0.3, h * 0.4, 0.09) +
    ci(w * 0.16, h * 0.66, 0.09) + ci(w * 0.3, h * 0.66, 0.09) +
    ci(w * 0.78, h * 0.5, Math.min(h * 0.25, 0.16)) + ln(w * 0.78, h * 0.2, w * 0.78, h * 0.34),

  stove: (w, h) =>
    rc(0, 0, w, h, 0.02) +
    ci(w * 0.28, h * 0.28, Math.min(w, h) * 0.16) + ci(w * 0.72, h * 0.28, Math.min(w, h) * 0.16) +
    ci(w * 0.28, h * 0.72, Math.min(w, h) * 0.16) + ci(w * 0.72, h * 0.72, Math.min(w, h) * 0.16),

  fridge: (w, h) =>
    rc(0, 0, w, h, 0.02) + ln(0.05, h * 0.18, w - 0.05, h * 0.18) + ln(w * 0.82, h * 0.28, w * 0.82, h * 0.6),

  counter: (w, h) =>
    rc(0, 0, w, h, 0.02) + (w >= h ? ln(0, h * 0.25, w, h * 0.25) : ln(w * 0.25, 0, w * 0.25, h)),

  vitrina: (w, h) => {
    let out = rc(0, 0, w, h, 0.02) + rc(0.05, 0.05, w - 0.1, h - 0.1);
    const n = Math.max(2, Math.round(w / 0.65));
    for (let i = 1; i < n; i++) out += ln(w * i / n, 0.05, w * i / n, h - 0.05);
    return out;
  },

  cashier: (w, h) =>
    rc(0, 0, w, h * 0.5, 0.02) + ln(w * 0.15, h * 0.25, w * 0.45, h * 0.25) +
    ci(w * 0.72, h * 0.75, 0.14) + rc(w * 0.6, h * 0.55, 0.24, 0.06),

  gondola: (w, h) => {
    const horiz = w >= h;
    let out = rc(0, 0, w, h, 0.02);
    if (horiz) {
      out += ln(0, h / 2, w, h / 2);
      const n = Math.max(2, Math.round(w / 0.55));
      for (let i = 1; i < n; i++) out += ln(w * i / n, 0, w * i / n, h);
    } else {
      out += ln(w / 2, 0, w / 2, h);
      const n = Math.max(2, Math.round(h / 0.55));
      for (let i = 1; i < n; i++) out += ln(0, h * i / n, w, h * i / n);
    }
    return out;
  },

  wallShelf: (w, h) => {
    const horiz = w >= h;
    let out = rc(0, 0, w, h);
    const len = horiz ? w : h;
    const n = Math.max(2, Math.round(len / 0.55));
    for (let i = 1; i < n; i++) {
      out += horiz ? ln(len * i / n, 0, len * i / n, h) : ln(0, len * i / n, w, len * i / n);
    }
    return out;
  },

  fridgeRow: (w, h, o) => {
    const n = (o.n as number) || 3;
    let out = '';
    const horiz = w >= h;
    for (let i = 0; i < n; i++) {
      if (horiz) out += rc(w * i / n + 0.03, 0, w / n - 0.06, h, 0.02) + ln(w * i / n + 0.03, h * 0.2, w * (i + 1) / n - 0.03, h * 0.2);
      else out += rc(0, h * i / n + 0.03, w, h / n - 0.06, 0.02) + ln(w * 0.2, h * i / n + 0.03, w * 0.2, h * (i + 1) / n - 0.03);
    }
    return out;
  },

  boxes: (w, h) => {
    const s = Math.min(w, h);
    return rc(0, h - s * 0.62, s * 0.62, s * 0.62) + rc(s * 0.3, h - s, s * 0.55, s * 0.55) +
           ln(0, h - s * 0.31, s * 0.62, h - s * 0.31);
  },

  car: (w, h) =>
    rc(w * 0.06, h * 0.02, w * 0.88, h * 0.96, w * 0.28) + rc(w * 0.18, h * 0.3, w * 0.64, h * 0.42, 0.06) +
    ln(w * 0.18, h * 0.3, w * 0.12, h * 0.18) + ln(w * 0.82, h * 0.3, w * 0.88, h * 0.18) +
    ln(w * 0.18, h * 0.72, w * 0.12, h * 0.84) + ln(w * 0.82, h * 0.72, w * 0.88, h * 0.84),

  liftPosts: (w, h) => {
    const s = Math.min(h, 0.42);
    return rc(0, h / 2 - s / 2, s, s) + rc(w - s, h / 2 - s / 2, s, s) +
           ln(s, h / 2, w * 0.32, h / 2) + ln(w - s, h / 2, w * 0.68, h / 2);
  },

  bench: (w, h) => {
    let out = rc(0, 0, w, h, 0.02);
    const n = Math.max(2, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) out += ln(w * (i + 0.3) / n, h * 0.25, w * (i + 0.7) / n, h * 0.75);
    return out;
  },

  toolCab: (w, h) => rc(0, 0, w, h) + ln(0, h / 3, w, h / 3) + ln(0, h * 2 / 3, w, h * 2 / 3),

  compressor: (w, h) => {
    const r = Math.min(w, h) * 0.34;
    return rc(w * 0.1, h * 0.62, w * 0.8, h * 0.32, 0.03) + ci(w / 2, h * 0.35, r);
  },

  tireStack: (w, h) => {
    const r = Math.min(w, h) * 0.24;
    return ci(w * 0.3, h * 0.35, r) + ci(w * 0.3, h * 0.35, r * 0.45) +
           ci(w * 0.68, h * 0.68, r) + ci(w * 0.68, h * 0.68, r * 0.45);
  },

  mopSink: (w, h) => {
    const s = Math.min(w, h);
    return rc(0, 0, s, s, 0.04) + ci(s / 2, s / 2, s * 0.3);
  },

  washer: (w, h) => {
    const s = Math.min(w, h);
    return rc(0, 0, s, s, 0.04) + ci(s / 2, s / 2, s * 0.32) + ci(s * 0.82, s * 0.16, 0.045);
  },

  forklift: (w, h) =>
    rc(w * 0.2, h * 0.25, w * 0.6, h * 0.55, 0.06) + rc(w * 0.32, h * 0.4, w * 0.36, h * 0.3) +
    ln(w * 0.2, h * 0.18, w * 0.8, h * 0.18) + ln(w * 0.35, h * 0.18, w * 0.35, h * 0.02) +
    ln(w * 0.65, h * 0.18, w * 0.65, h * 0.02),
};

function furnToSVG(it: Furn): string {
  const fn = FURN_LIB[it.type];
  if (!fn) return '';
  const cx = it.w / 2, cy = it.h / 2;
  const rot = it.rot ? ` rotate(${it.rot},${cx.toFixed(3)},${cy.toFixed(3)})` : '';
  return `<g transform="translate(${it.x.toFixed(3)},${it.y.toFixed(3)})${rot}">${fn(it.w, it.h, it.opts || {})}</g>`;
}

/* ============================================================
   AMUEBLADO AUTOMÁTICO POR ROL DE CUARTO
   ============================================================ */
type FurnishFn = (p: Plan, r: Room, rng: Rng) => void;

const FURNISH: Record<string, FurnishFn> = {

  consultorio(p, r) {
    if (r.w < 3 || r.h < 3) return;
    furn(p, 'deskChair', r.x + 0.45, r.y + 0.4, 1.5, 1.2);
    furn(p, 'chair', r.x + 0.6, r.y + 1.95, 0.45, 0.45, 180);
    furn(p, 'chair', r.x + 1.2, r.y + 1.95, 0.45, 0.45, 180);
    furn(p, 'examTable', r.x + r.w - 1.3, r.y + r.h - 2.35, 0.85, 1.95);
    furn(p, 'sink', r.x + r.w - 0.95, r.y + 0.3, 0.55, 0.45);
    if (r.w > 4.2) furn(p, 'fileCab', r.x + 0.35, r.y + r.h - 1.0, 0.45, 0.75);
  },

  bano(p, r) {
    if (r.w >= 2.8 && r.h >= 2.2) {
      const sw = r.w / 2;
      furn(p, 'toilet', r.x + sw * 0.5 - 0.28, r.y + 0.14, 0.56, 0.72);
      furn(p, 'toilet', r.x + sw * 1.5 - 0.28, r.y + 0.14, 0.56, 0.72);
      furn(p, 'partition', r.x + sw, r.y + 0.05, 0, Math.min(1.25, r.h * 0.55));
      const cw = Math.min(1.7, r.w - 1.0);
      furn(p, 'counterSink', r.x + (r.w - cw) / 2, r.y + r.h - 0.72, cw, 0.52, 0, { n: 2 });
    } else {
      furn(p, 'toilet', r.x + r.w / 2 - 0.28, r.y + 0.14, 0.56, 0.72);
      furn(p, 'sink', r.x + 0.22, r.y + r.h - 0.72, 0.5, 0.42);
    }
  },

  laboratorio(p, r) {
    if (r.w < 2.6 || r.h < 2.4) return;
    furn(p, 'counterSink', r.x + 0.25, r.y + 0.18, r.w - 0.5, 0.6, 0, { n: 2 });
    furn(p, 'stool', r.x + r.w * 0.32 - 0.18, r.y + 1.0, 0.36, 0.36);
    furn(p, 'stool', r.x + r.w * 0.65 - 0.18, r.y + 1.0, 0.36, 0.36);
    furn(p, 'wallShelf', r.x + r.w - 0.6, r.y + 1.25, 0.38, Math.max(1, r.h - 1.9));
    furn(p, 'fridge', r.x + 0.3, r.y + r.h - 1.05, 0.7, 0.75);
  },

  archivo(p, r) {
    furn(p, 'wallShelf', r.x + 0.2, r.y + 0.18, r.w - 0.4, 0.4);
    furn(p, 'fileCab', r.x + 0.25, r.y + r.h - 1.0, 0.5, 0.75);
    furn(p, 'fileCab', r.x + 0.85, r.y + r.h - 1.0, 0.5, 0.75);
  },

  recepcion(p, r) {
    if (r.w < 4 || r.h < 3) return;
    furn(p, 'receptionL', r.x + r.w - 2.75, r.y + 0.45, 2.2, 1.55);
    const rowH = Math.min(r.h - 1.6, 3.4);
    furn(p, 'waitRow', r.x + 0.28, r.y + (r.h - rowH) / 2, 0.5, rowH, 0, { vert: true });
    if (r.w > 6.5) {
      furn(p, 'waitRow', r.x + 1.15, r.y + (r.h - rowH) / 2, 0.5, rowH, 0, { vert: true });
      furn(p, 'lowTable', r.x + 2.0, r.y + r.h / 2 - 0.3, 0.6, 0.6);
    }
    furn(p, 'plant', r.x + 0.35, r.y + 0.35, 0.55, 0.55);
    furn(p, 'plant', r.x + r.w - 0.9, r.y + r.h - 0.9, 0.55, 0.55);
  },

  atencion(p, r) {
    if (r.w < 5 || r.h < 3.5) return;
    const vy = r.y + r.h * 0.62;
    furn(p, 'vitrina', r.x + r.w * 0.5 - 2.05, vy, 1.9, 0.68);
    furn(p, 'vitrina', r.x + r.w * 0.5 + 0.15, vy, 1.9, 0.68);
    furn(p, 'cashier', r.x + r.w - 1.75, vy - 0.15, 1.25, 1.0);
    furn(p, 'table4', r.x + 0.55, r.y + 0.5, 1.1, 1.1);
    furn(p, 'table4', r.x + 2.1, r.y + 0.5, 1.1, 1.1);
    if (r.w > 8) furn(p, 'table4', r.x + 3.65, r.y + 0.5, 1.1, 1.1);
    furn(p, 'plant', r.x + 0.3, r.y + r.h - 0.85, 0.55, 0.55);
  },

  comedor(p, r) {
    const mx = 1.05, my = 1.05, cell = 2.15;
    const cols = Math.max(1, Math.floor((r.w - mx * 2) / cell));
    const rows = Math.max(1, Math.floor((r.h - my * 2) / cell));
    const ox = r.x + (r.w - cols * cell) / 2;
    const oy = r.y + (r.h - rows * cell) / 2;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (rows > 2 && j === rows - 1 && i === Math.floor(cols / 2)) continue;
        const kind = (i + j) % 2 ? 'tableRound' : 'table4';
        furn(p, kind, ox + i * cell + 0.42, oy + j * cell + 0.42, 1.3, 1.3);
      }
    }
  },

  barra(p, r) {
    furn(p, 'counter', r.x + 0.3, r.y + 0.25, Math.min(r.w - 0.6, 3.6), 0.6);
    for (let i = 0; i < Math.min(4, Math.floor(r.w / 0.9)); i++) {
      furn(p, 'stool', r.x + 0.55 + i * 0.85, r.y + 1.05, 0.36, 0.36);
    }
  },

  cocina(p, r) {
    if (r.w < 4 || r.h < 3) return;
    furn(p, 'counterSink', r.x + 0.2, r.y + 0.16, r.w * 0.52, 0.62, 0, { n: 1 });
    furn(p, 'stove', r.x + r.w * 0.52 + 0.45, r.y + 0.16, 0.78, 0.66);
    furn(p, 'fridge', r.x + r.w - 0.95, r.y + 0.2, 0.72, 0.78);
    furn(p, 'island', r.x + r.w / 2 - 1.15, r.y + r.h * 0.62 - 0.55, 2.3, 1.1);
    furn(p, 'wallShelf', r.x + r.w - 0.55, r.y + 1.25, 0.36, Math.max(0.9, r.h - 2.1));
  },

  recepProductos(p, r) {
    furn(p, 'wallShelf', r.x + 0.18, r.y + 0.5, 0.42, Math.max(1, r.h - 1.2));
    furn(p, 'boxes', r.x + r.w - 1.35, r.y + r.h - 1.4, 1.1, 1.1);
    if (r.h > 3) furn(p, 'deskChair', r.x + r.w - 1.6, r.y + 0.35, 1.1, 1.0);
  },

  limpieza(p, r) {
    furn(p, 'mopSink', r.x + 0.18, r.y + 0.18, 0.55, 0.55);
    furn(p, 'washer', r.x + r.w - 0.85, r.y + 0.18, 0.65, 0.65);
    furn(p, 'wallShelf', r.x + 0.18, r.y + r.h - 0.55, Math.max(0.9, r.w - 0.36), 0.36);
  },

  bodega(p, r) {
    furn(p, 'wallShelf', r.x + 0.18, r.y + 0.16, Math.max(1, r.w - 0.36), 0.42);
    if (r.h > 2.6) furn(p, 'wallShelf', r.x + 0.16, r.y + 0.85, 0.42, Math.max(0.9, r.h - 1.6));
    furn(p, 'boxes', r.x + r.w - 1.5, r.y + r.h - 1.5, 1.15, 1.15);
    if (r.w > 4.5) furn(p, 'boxes', r.x + r.w * 0.5, r.y + r.h - 1.35, 1.0, 1.0);
  },

  /* nave de almacén con racks industriales */
  almacenRacks(p, r) {
    if (r.w < 6 || r.h < 6) return;
    const topClear = 1.0, botClear = 3.2;
    const rackLen = r.h - topClear - botClear;
    const n = Math.max(2, Math.min(5, Math.floor((r.w - 2.6) / 2.1)));
    const span = r.w - 2.2;
    for (let i = 0; i < n; i++) {
      const gx = r.x + 1.1 + span * (i + 0.5) / n - 0.5;
      furn(p, 'gondola', gx, r.y + topClear, 1.0, rackLen);
    }
    furn(p, 'forklift', r.x + 0.55, r.y + r.h - 2.6, 1.0, 1.9);
    furn(p, 'boxes', r.x + r.w - 1.7, r.y + r.h - 1.8, 1.3, 1.3);
    furn(p, 'boxes', r.x + r.w * 0.45, r.y + r.h - 1.6, 1.1, 1.1);
  },

  ventas(p, r) {
    const topClear = 1.1, botClear = 2.9;
    const gLen = r.h - topClear - botClear;
    if (gLen > 2) {
      const n = Math.max(1, Math.min(4, Math.floor((r.w - 3.4) / 2.0)));
      const span = r.w - 3.0;
      for (let i = 0; i < n; i++) {
        const gx = r.x + 1.7 + span * (i + 0.5) / n - 0.45;
        furn(p, 'gondola', gx, r.y + topClear, 0.9, gLen);
      }
    }
    furn(p, 'fridgeRow', r.x + r.w - 0.85, r.y + 0.9, 0.68, Math.min(3.4, r.h * 0.42), 0, { n: 3 });
    furn(p, 'wallShelf', r.x + 0.18, r.y + 0.9, 0.4, Math.min(3.6, r.h * 0.45));
    furn(p, 'cashier', r.x + 1.0, r.y + r.h - 1.85, 1.3, 1.0);
    if (r.w > 8) furn(p, 'cashier', r.x + 2.9, r.y + r.h - 1.85, 1.3, 1.0);
  },

  mostrador(p, r) {
    furn(p, 'wallShelf', r.x + 0.18, r.y + 0.16, r.w - 0.36, 0.42);
    furn(p, 'wallShelf', r.x + r.w - 0.58, r.y + 0.75, 0.4, Math.max(1, r.h * 0.5));
    furn(p, 'gondola', r.x + r.w * 0.45, r.y + 1.3, 0.9, Math.max(1.6, r.h * 0.38));
    furn(p, 'counter', r.x + 0.35, r.y + r.h - 1.35, Math.min(3, r.w * 0.42), 0.6);
    furn(p, 'cashier', r.x + 0.6, r.y + r.h - 2.35, 1.2, 0.95);
  },

  tallerZona(p, r) {
    if (r.w < 4 || r.h < 5) return;
    const n = Math.max(1, Math.min(3, Math.floor(r.w / 3.4)));
    for (let i = 0; i < n; i++) {
      const cx = r.x + r.w * (i + 0.5) / n;
      furn(p, 'car', cx - 0.95, r.y + r.h - 4.75, 1.9, 4.3);
      if (i === 0) furn(p, 'liftPosts', cx - 1.5, r.y + r.h - 3.1, 3.0, 0.5);
    }
    furn(p, 'bench', r.x + 0.35, r.y + 0.2, Math.min(3.8, r.w - 2.2), 0.62);
    furn(p, 'toolCab', r.x + r.w - 1.35, r.y + 0.25, 1.0, 0.5);
    furn(p, 'compressor', r.x + r.w - 1.15, r.y + 1.1, 0.8, 0.8);
    furn(p, 'tireStack', r.x + 0.3, r.y + 1.15, 1.15, 1.15);
  },

  refacciones(p, r) {
    furn(p, 'wallShelf', r.x + 0.16, r.y + 0.16, Math.max(0.9, r.w - 0.32), 0.4);
    furn(p, 'wallShelf', r.x + 0.16, r.y + r.h - 0.56, Math.max(0.9, r.w - 0.32), 0.4);
    if (r.h > 3.2) furn(p, 'gondola', r.x + r.w / 2 - 0.4, r.y + 1.0, 0.8, r.h - 2.1);
  },

  oficina(p, r) {
    if (r.w < 2.6 || r.h < 2.4) return;
    furn(p, 'deskChair', r.x + r.w / 2 - 0.75, r.y + 0.35, 1.5, 1.2);
    furn(p, 'chair', r.x + r.w / 2 - 0.55, r.y + 1.85, 0.42, 0.42, 180);
    furn(p, 'chair', r.x + r.w / 2 + 0.12, r.y + 1.85, 0.42, 0.42, 180);
    furn(p, 'fileCab', r.x + r.w - 0.72, r.y + r.h - 1.0, 0.48, 0.75);
  },

  operativa(p, r) {
    const cell = 2.5;
    const cols = Math.max(1, Math.floor((r.w - 1.6) / cell));
    const rows = Math.max(1, Math.floor((r.h - 1.6) / cell));
    const ox = r.x + (r.w - cols * cell) / 2;
    const oy = r.y + (r.h - rows * cell) / 2;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        furn(p, 'deskPair', ox + i * cell + 0.55, oy + j * cell + 0.2, 1.4, 2.1);
      }
    }
  },

  juntas(p, r) {
    if (r.w < 3.2 || r.h < 2.6) return;
    const tw = Math.min(2.8, r.w - 1.7), th = Math.min(1.15, r.h - 1.7);
    const tx = r.x + (r.w - tw) / 2, ty = r.y + (r.h - th) / 2;
    furn(p, 'bigTable', tx, ty, tw, th);
    const nSide = Math.max(2, Math.floor(tw / 0.85));
    for (let i = 0; i < nSide; i++) {
      const cx = tx + tw * (i + 0.5) / nSide - 0.21;
      furn(p, 'chair', cx, ty - 0.52, 0.42, 0.42, 180);
      furn(p, 'chair', cx, ty + th + 0.1, 0.42, 0.42);
    }
    furn(p, 'chair', tx - 0.52, ty + th / 2 - 0.21, 0.42, 0.42, 90);
    furn(p, 'chair', tx + tw + 0.1, ty + th / 2 - 0.21, 0.42, 0.42, 270);
  },

  cocineta(p, r) {
    furn(p, 'counterSink', r.x + 0.18, r.y + 0.16, Math.max(1.2, r.w - 1.2), 0.58, 0, { n: 1 });
    furn(p, 'fridge', r.x + r.w - 0.88, r.y + 0.18, 0.68, 0.72);
    if (r.h > 2.8) furn(p, 'tableRound', r.x + r.w / 2 - 0.6, r.y + r.h - 1.6, 1.2, 1.2);
  },

  cabina(p, r) {
    if (r.w < 2.4 || r.h < 2.8) return;
    furn(p, 'massage', r.x + r.w / 2 - 0.45, r.y + (r.h - 2.0) / 2, 0.9, 2.0);
    furn(p, 'stool', r.x + r.w / 2 + 0.65, r.y + r.h / 2 - 0.18, 0.36, 0.36);
    furn(p, 'counter', r.x + 0.2, r.y + 0.16, Math.min(1.4, r.w - 0.4), 0.45);
    furn(p, 'sink', r.x + r.w - 0.75, r.y + 0.18, 0.5, 0.42);
  },

  sauna(p, r) {
    furn(p, 'saunaBench', r.x + 0.18, r.y + 0.18, r.w - 0.36, r.h - 0.36);
  },

  vestidor(p, r) {
    furn(p, 'lockers', r.x + 0.2, r.y + 0.16, Math.min(2.5, r.w - 0.4), 0.5, 0, { n: 5 });
    furn(p, 'benchSeat', r.x + r.w / 2 - 0.7, r.y + r.h / 2, 1.4, 0.35);
  },

  hidro(p, r) {
    if (r.w < 3 || r.h < 3) return;
    furn(p, 'jacuzzi', r.x + r.w / 2 - 1.05, r.y + r.h / 2 - 0.85, 2.1, 1.7);
    furn(p, 'examTable', r.x + 0.3, r.y + r.h - 2.2, 0.75, 1.85);
    if (r.w > 5) furn(p, 'examTable', r.x + r.w - 1.05, r.y + r.h - 2.2, 0.75, 1.85);
  },

  relax(p, r) {
    furn(p, 'sofa', r.x + 0.35, r.y + 0.3, Math.min(2.2, r.w - 0.7), 0.85);
    furn(p, 'lowTable', r.x + r.w / 2 - 0.3, r.y + r.h / 2 - 0.3, 0.6, 0.6);
    furn(p, 'plant', r.x + r.w - 0.85, r.y + 0.3, 0.55, 0.55);
    if (r.h > 3.6) furn(p, 'sofa', r.x + 0.35, r.y + r.h - 1.2, Math.min(2.2, r.w - 0.7), 0.85);
  },

  pasillo() { /* sin mobiliario */ },

  cajas(p, r) {
    furn(p, 'cashier', r.x + r.w * 0.28 - 0.65, r.y + r.h / 2 - 0.5, 1.3, 1.0);
    if (r.w > 5) furn(p, 'cashier', r.x + r.w * 0.62 - 0.65, r.y + r.h / 2 - 0.5, 1.3, 1.0);
  },

  anden(p, r) {
    furn(p, 'boxes', r.x + 0.4, r.y + 0.3, 1.1, 1.1);
    furn(p, 'boxes', r.x + r.w - 1.5, r.y + 0.3, 1.1, 1.1);
  },
};

function furnishAll(p: Plan, rng: Rng) {
  p.rooms.forEach(r => { if (FURNISH[r.role]) FURNISH[r.role](p, r, rng); });
}

/* ============================================================
   GENERADORES POR GIRO — 3 topologías cada uno
   ============================================================ */
type GeneratorFn = (rng: Rng, variant: number) => Plan;

function genConsultorio(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* cuartos al fondo + pasillo + recepción al frente */
    const nCons = ri(rng, 2, 3);
    const widths: number[] = [];
    for (let i = 0; i < nCons; i++) widths.push(rr(rng, 3.7, 4.6));
    widths.push(rr(rng, 2.1, 2.6));
    widths.push(rr(rng, 3.0, 3.8));
    const W = widths.reduce((a, b) => a + b, 0);
    const topH = rr(rng, 4.2, 5.0);
    const corH = rr(rng, 1.9, 2.2);
    const recH = rr(rng, 4.0, 5.2);
    const H = topH + corH + recH;
    const p = newPlan(W, H);

    const labels: [string, string][] = [];
    for (let i = 0; i < nCons; i++) labels.push([`CONSULTORIO ${String.fromCharCode(65 + i)}`, 'consultorio']);
    labels.push(['BAÑO', 'bano']);
    labels.push(['LABORATORIO', 'laboratorio']);

    let x = 0;
    widths.forEach((w2, i) => {
      room(p, x, 0, w2, topH, labels[i][0], labels[i][1]);
      if (i < widths.length - 1) wall(p, x + w2, 0, x + w2, topH);
      const cx = x + w2 / 2;
      door(p, cx - 0.45, topH, 'h', 0.9, { hinge: hingeRnd(rng), swing: -1 });
      x += w2;
    });
    wall(p, 0, topH, W, topH);
    room(p, 0, topH, W, corH, 'PASILLO', 'pasillo');
    const gW = rr(rng, 2.6, 3.4), gX = W / 2 - gW / 2;
    wall(p, 0, topH + corH, W, topH + corH);
    opening(p, gX, topH + corH, 'h', gW);
    room(p, 0, topH + corH, W, recH, 'RECEPCIÓN Y ESPERA', 'recepcion');
    const eX = W * rr(rng, 0.42, 0.58);
    door(p, eX - 0.55, H, 'h', 1.1, { hinge: hingeRnd(rng), swing: -1, entrance: true });
    p.vBands = [0, topH, topH + corH, H];
    return p;
  }

  if (variant === 2) {
    /* pasillo vertical, consultorios en columna derecha */
    const leftW = rr(rng, 4.4, 5.4);
    const corW = rr(rng, 1.8, 2.1);
    const rightW = rr(rng, 3.8, 4.6);
    const W = leftW + corW + rightW;
    const nCons = ri(rng, 2, 3);
    const consHs: number[] = [];
    for (let i = 0; i < nCons; i++) consHs.push(rr(rng, 3.5, 4.3));
    const H = consHs.reduce((a, b) => a + b, 0) + (nCons === 2 ? rr(rng, 3.6, 4.4) : 0);
    const rightRooms: [number, string, string][] = consHs.map((h2, i) =>
      [h2, `CONSULTORIO ${String.fromCharCode(65 + i)}`, 'consultorio']);
    if (nCons === 2) rightRooms.push([H - consHs[0] - consHs[1], 'LABORATORIO', 'laboratorio']);

    const banoH = rr(rng, 2.0, 2.5);
    const archH = rr(rng, 2.6, 3.2);
    const recH = H - banoH - archH;

    const p = newPlan(W, H);
    const xr = leftW + corW;
    wall(p, xr, 0, xr, H);
    let y = 0;
    rightRooms.forEach((rm, i) => {
      room(p, xr, y, rightW, rm[0], rm[1], rm[2]);
      if (i < rightRooms.length - 1) wall(p, xr, y + rm[0], W, y + rm[0]);
      door(p, xr, y + rm[0] / 2 - 0.45, 'v', 0.9, { hinge: hingeRnd(rng), swing: 1 });
      y += rm[0];
    });
    wall(p, leftW, 0, leftW, banoH + archH);
    room(p, 0, 0, leftW, banoH, 'BAÑO', 'bano');
    wall(p, 0, banoH, leftW, banoH);
    door(p, leftW, banoH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
    room(p, 0, banoH, leftW, archH, 'ARCHIVO', 'archivo');
    door(p, leftW, banoH + archH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
    wall(p, 0, banoH + archH, leftW, banoH + archH);
    room(p, 0, banoH + archH, leftW + corW, recH, 'RECEPCIÓN\nY ESPERA', 'recepcion');
    room(p, leftW, 0, corW, banoH + archH, 'PASILLO', 'pasillo');
    const eX = rr(rng, 1.2, leftW - 1.6);
    door(p, eX, H, 'h', 1.1, { hinge: 1, swing: -1, entrance: true });
    p.vBands = [0, banoH, banoH + archH, H];
    return p;
  }

  /* V3: pasillo central vertical, dos alas */
  const sideL = rr(rng, 4.0, 4.8);
  const corW = rr(rng, 1.8, 2.1);
  const sideR = rr(rng, 4.0, 4.8);
  const W = sideL + corW + sideR;
  const recH = rr(rng, 4.0, 5.0);
  const labH = rr(rng, 2.7, 3.3);
  const consAH = rr(rng, 3.6, 4.3);
  const topArea = labH + consAH;
  const H = recH + topArea;
  const yRec = topArea;
  const p = newPlan(W, H);
  const xc = sideL, xc2 = sideL + corW;
  wall(p, xc, 0, xc, yRec);
  wall(p, xc2, 0, xc2, yRec);
  room(p, 0, 0, sideL, consAH, 'CONSULTORIO A', 'consultorio');
  wall(p, 0, consAH, xc, consAH);
  door(p, xc, consAH * 0.5 - 0.45, 'v', 0.9, { hinge: 0, swing: -1 });
  room(p, 0, consAH, sideL, topArea - consAH, 'LABORATORIO', 'laboratorio');
  door(p, xc, consAH + (topArea - consAH) * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
  room(p, xc2, 0, sideR, consAH, 'CONSULTORIO B', 'consultorio');
  wall(p, xc2, consAH, W, consAH);
  door(p, xc2, consAH * 0.5 - 0.45, 'v', 0.9, { hinge: 0, swing: 1 });
  room(p, xc2, consAH, sideR, topArea - consAH, 'BAÑO', 'bano');
  door(p, xc2, consAH + (topArea - consAH) * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });
  wall(p, 0, yRec, xc, yRec);
  wall(p, xc2, yRec, W, yRec);
  room(p, 0, yRec, W, recH, 'RECEPCIÓN Y ESPERA', 'recepcion');
  room(p, xc, 0, corW, topArea, 'PASILLO', 'pasillo');
  const eX = W * rr(rng, 0.4, 0.6);
  door(p, eX - 0.55, H, 'h', 1.1, { hinge: hingeRnd(rng), swing: -1, entrance: true });
  p.vBands = [0, consAH, yRec, H];
  return p;
}

function genRestaurante(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* servicios al fondo, cocina en medio, atención al frente */
    const W = rr(rng, 10.5, 12.5);
    const topH = rr(rng, 2.2, 2.6);
    const midH = rr(rng, 3.4, 4.0);
    const frontH = rr(rng, 4.6, 5.6);
    const H = topH + midH + frontH;
    const p = newPlan(W, H);

    const lw = rr(rng, 2.7, 3.2);
    const bw = rr(rng, 3.7, 4.4);
    room(p, 0, 0, lw, topH, 'CUARTO DE\nLIMPIEZA', 'limpieza');
    wall(p, lw, 0, lw, topH);
    wall(p, 0, topH, lw, topH);
    door(p, lw * 0.5 - 0.4, topH, 'h', 0.8, { hinge: 0, swing: -1 });
    room(p, W - bw, 0, bw, topH, 'BAÑOS', 'bano');
    wall(p, W - bw, 0, W - bw, topH);
    wall(p, W - bw, topH, W, topH);
    door(p, W - bw + bw * 0.5 - 0.4, topH, 'h', 0.8, { hinge: 1, swing: -1 });

    const rw = rr(rng, 3.3, 4.0);
    room(p, 0, topH, rw, midH, 'ÁREA DE RECEPCIÓN\nDE PRODUCTOS', 'recepProductos');
    wall(p, rw, topH, rw, topH + midH);
    door(p, rw, topH + midH * 0.5 - 0.45, 'v', 0.9, { hinge: 0, swing: 1 });
    door(p, 0, topH + midH * 0.35 - 0.45, 'v', 0.9, { hinge: 0, swing: 1, exteriorExit: true });
    room(p, rw, topH, W - rw, midH, 'COCINA', 'cocina');

    const yFront = topH + midH;
    wall(p, 0, yFront, W, yFront);
    opening(p, W * rr(rng, 0.12, 0.2), yFront, 'h', 1.5);
    room(p, 0, yFront, W, frontH, 'ZONA DE ATENCIÓN\nAL PÚBLICO', 'atencion');
    door(p, W * rr(rng, 0.35, 0.5) - 0.8, H, 'h', 1.6, { kind: 'double', swing: -1, entrance: true });
    p.vBands = [0, topH, yFront, H];
    return p;
  }

  if (variant === 2) {
    /* comedor amplio + columna de servicio derecha */
    const kw = rr(rng, 4.0, 4.8);
    const W = rr(rng, 8.0, 9.6) + kw;
    const ch = rr(rng, 4.6, 5.4);
    const bh = rr(rng, 2.2, 2.6);
    const colEnd = ch + bh + rr(rng, 1.8, 2.4);
    const H = colEnd + rr(rng, 4.2, 5.2);
    const p = newPlan(W, H);
    const xk = W - kw;

    wall(p, xk, 0, xk, colEnd);
    wall(p, xk, colEnd, W, colEnd);
    room(p, xk, 0, kw, ch, 'COCINA', 'cocina');
    wall(p, xk, ch, W, ch);
    door(p, xk, ch * 0.55 - 0.45, 'v', 0.9, { hinge: 0, swing: -1 });
    room(p, xk, ch, kw, bh, 'BAÑOS', 'bano');
    wall(p, xk, ch + bh, W, ch + bh);
    door(p, xk, ch + bh * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
    room(p, xk, ch + bh, kw, colEnd - ch - bh, 'BODEGA', 'bodega');
    door(p, xk, ch + bh + (colEnd - ch - bh) * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });

    room(p, 0, 0, xk, colEnd, 'COMEDOR', 'comedor');
    room(p, 0, colEnd, W, H - colEnd, 'ACCESO Y BARRA', 'barra');
    door(p, W * rr(rng, 0.3, 0.45) - 0.8, H, 'h', 1.6, { kind: 'double', swing: -1, entrance: true });
    p.vBands = [0, ch, ch + bh, colEnd, H];
    return p;
  }

  /* V3: cocina al fondo, comedor centro, baños al frente */
  const W = rr(rng, 11, 13);
  const kH = rr(rng, 3.6, 4.2);
  const H = kH + rr(rng, 8.2, 9.6);
  const p = newPlan(W, H);

  wall(p, 0, kH, W, kH);
  room(p, 0, 0, W, kH, 'COCINA', 'cocina');
  door(p, W * rr(rng, 0.55, 0.7) - 0.45, kH, 'h', 0.9, { hinge: 0, swing: 1 });
  opening(p, W * 0.2, kH, 'h', 1.3);

  const bw = rr(rng, 2.5, 2.9), bh = rr(rng, 2.3, 2.7);
  room(p, 0, H - bh, bw, bh, 'BAÑOS', 'bano');
  wall(p, bw, H - bh, bw, H);
  wall(p, 0, H - bh, bw, H - bh);
  door(p, bw, H - bh * 0.5 - 0.4, 'v', 0.8, { hinge: 1, swing: 1 });

  room(p, 0, kH, W, H - kH - bh, 'COMEDOR', 'comedor');
  furn(p, 'counter', W - 1.0, kH + 0.6, 0.6, rr(rng, 2.8, 3.6));
  door(p, W * rr(rng, 0.55, 0.7) - 0.8, H, 'h', 1.6, { kind: 'double', swing: -1, entrance: true });
  p.vBands = [0, kH, H - bh, H];
  return p;
}

function genComercio(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* bodega al fondo, piso de ventas con góndolas, cajas al frente */
    const W = rr(rng, 11, 13);
    const bodH = rr(rng, 2.8, 3.4);
    const H = bodH + rr(rng, 8.2, 9.8);
    const p = newPlan(W, H);

    wall(p, 0, bodH, W, bodH);
    const bnW = rr(rng, 1.8, 2.1);
    const bnH = Math.min(2.0, bodH - 0.8);
    room(p, bnW + 0.1, 0, W - bnW - 0.1, bodH, 'BODEGA', 'bodega');
    door(p, W * rr(rng, 0.55, 0.75) - 0.6, bodH, 'h', 1.2, { kind: 'double', swing: 1 });
    room(p, 0, 0, bnW, bnH, 'BAÑO', 'bano');
    wall(p, bnW, 0, bnW, bnH);
    wall(p, 0, bnH, bnW, bnH);
    door(p, bnW * 0.5 - 0.35, bnH, 'h', 0.7, { hinge: 0, swing: -1 });

    room(p, 0, bodH, W, H - bodH, 'ÁREA DE VENTAS', 'ventas');
    door(p, W * rr(rng, 0.55, 0.7) - 0.9, H, 'h', 1.8, { kind: 'slide', entrance: true });
    p.vBands = [0, bodH, H];
    return p;
  }

  if (variant === 2) {
    /* bodega y oficina en columna derecha */
    const colW = rr(rng, 3.4, 4.2);
    const W = rr(rng, 8.5, 10) + colW;
    const ofH = rr(rng, 2.6, 3.2);
    const bnH = rr(rng, 1.9, 2.2);
    const bodH = rr(rng, 4.6, 5.8);
    const H = bodH + ofH + bnH + rr(rng, 2.6, 3.2);
    const p = newPlan(W, H);
    const xc = W - colW;

    wall(p, xc, 0, xc, H);
    room(p, xc, 0, colW, bodH, 'BODEGA', 'bodega');
    wall(p, xc, bodH, W, bodH);
    door(p, xc, bodH * 0.5 - 0.55, 'v', 1.1, { kind: 'double', swing: -1 });
    room(p, xc, bodH, colW, ofH, 'OFICINA', 'oficina');
    wall(p, xc, bodH + ofH, W, bodH + ofH);
    door(p, xc, bodH + ofH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
    room(p, xc, bodH + ofH, colW, bnH, 'BAÑO', 'bano');
    wall(p, xc, bodH + ofH + bnH, W, bodH + ofH + bnH);
    door(p, xc, bodH + ofH + bnH * 0.5 - 0.35, 'v', 0.7, { hinge: 0, swing: -1 });
    room(p, xc, bodH + ofH + bnH, colW, H - bodH - ofH - bnH, 'CAJAS', 'cajas');

    room(p, 0, 0, xc, H, 'ÁREA DE VENTAS', 'ventas');
    door(p, W * rr(rng, 0.32, 0.45) - 0.9, H, 'h', 1.8, { kind: 'slide', entrance: true });
    p.vBands = [0, bodH, bodH + ofH, bodH + ofH + bnH, H];
    return p;
  }

  /* V3: tienda chica de mostrador */
  const W = rr(rng, 8, 9.5);
  const bodW = rr(rng, 2.8, 3.4);
  const bodHh = rr(rng, 2.6, 3.2);
  const H = rr(rng, 9, 10.5);
  const p = newPlan(W, H);

  room(p, 0, 0, bodW, bodHh, 'BODEGA', 'bodega');
  wall(p, bodW, 0, bodW, bodHh);
  wall(p, 0, bodHh, bodW, bodHh);
  door(p, bodW * 0.5 - 0.45, bodHh, 'h', 0.9, { hinge: 0, swing: -1 });
  const bnW = rr(rng, 1.7, 2.0);
  const bnH = Math.min(2.0, bodHh - 0.4);
  room(p, bodW, 0, bnW, bnH, 'BAÑO', 'bano');
  wall(p, bodW + bnW, 0, bodW + bnW, bnH);
  wall(p, bodW, bnH, bodW + bnW, bnH);
  door(p, bodW + bnW * 0.5 - 0.35, bnH, 'h', 0.7, { hinge: 1, swing: -1 });

  room(p, 0, bodHh, W, H - bodHh, 'TIENDA', 'mostrador');
  door(p, W * rr(rng, 0.55, 0.72) - 0.6, H, 'h', 1.2, { hinge: 0, swing: -1, entrance: true });
  p.vBands = [0, bodHh, H];
  return p;
}

function genTaller(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* columna de servicios izquierda, nave de trabajo derecha */
    const colW = rr(rng, 3.6, 4.2);
    const W = colW + rr(rng, 8.5, 10.5);
    const H = rr(rng, 10, 12);
    const p = newPlan(W, H);
    const ofH = rr(rng, 3.0, 3.6);
    const refH = rr(rng, 3.0, 3.6);

    wall(p, colW, 0, colW, H);
    room(p, 0, H - ofH, colW, ofH, 'OFICINA', 'oficina');
    wall(p, 0, H - ofH, colW, H - ofH);
    door(p, colW, H - ofH * 0.5 - 0.45, 'v', 0.9, { hinge: 1, swing: 1 });
    door(p, colW * 0.5 - 0.45, H, 'h', 0.9, { hinge: 0, swing: -1 });
    room(p, 0, H - ofH - refH, colW, refH, 'REFACCIONES', 'refacciones');
    wall(p, 0, H - ofH - refH, colW, H - ofH - refH);
    door(p, colW, H - ofH - refH * 0.5 - 0.45, 'v', 0.9, { hinge: 0, swing: 1 });
    room(p, 0, 0, colW, H - ofH - refH, 'BAÑO Y\nVESTIDOR', 'bano');
    door(p, colW, (H - ofH - refH) * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });

    room(p, colW, 0, W - colW, H, 'ZONA DE TRABAJO', 'tallerZona');
    const gW = rr(rng, 4.8, 6.0);
    door(p, colW + (W - colW) / 2 - gW / 2, H, 'h', gW, { kind: 'slide', entrance: true });
    p.vBands = [0, H - ofH - refH, H - ofH, H];
    return p;
  }

  if (variant === 2) {
    /* servicios al fondo en fila, nave al frente */
    const W = rr(rng, 12, 15);
    const backH = rr(rng, 3.2, 3.8);
    const H = backH + rr(rng, 7.5, 9);
    const p = newPlan(W, H);
    const parts = splitTotal(W, [rr(rng, 1, 1.3), rr(rng, 1, 1.3), rr(rng, 0.6, 0.75)]);
    const rooms: [string, string][] = [['OFICINA', 'oficina'], ['REFACCIONES', 'refacciones'], ['BAÑO', 'bano']];
    let x = 0;
    wall(p, 0, backH, W, backH);
    parts.forEach((w2, i) => {
      room(p, x, 0, w2, backH, rooms[i][0], rooms[i][1]);
      if (i < parts.length - 1) wall(p, x + w2, 0, x + w2, backH);
      door(p, x + w2 / 2 - 0.45, backH, 'h', 0.9, { hinge: hingeRnd(rng), swing: 1 });
      x += w2;
    });
    room(p, 0, backH, W, H - backH, 'ZONA DE TRABAJO', 'tallerZona');
    const gW = rr(rng, 5.5, 7);
    door(p, W / 2 - gW / 2, H, 'h', gW, { kind: 'slide', entrance: true });
    door(p, W - 1.35, H, 'h', 0.9, { hinge: 1, swing: -1, exteriorExit: true });
    p.vBands = [0, backH, H];
    return p;
  }

  /* V3: recepción de clientes al frente-izquierda, nave en L */
  const W = rr(rng, 12.5, 14.5);
  const H = rr(rng, 10.5, 12);
  const p = newPlan(W, H);
  const rw = rr(rng, 3.8, 4.4);
  const rh = rr(rng, 3.2, 3.8);
  const refH = rr(rng, 3.0, 3.6);
  const bnH = rr(rng, 1.9, 2.2);

  room(p, 0, H - rh, rw, rh, 'RECEPCIÓN\nDE CLIENTES', 'recepcion');
  wall(p, rw, H - rh, rw, H);
  wall(p, 0, H - rh, rw, H - rh);
  door(p, rw * 0.5 - 0.5, H, 'h', 1.0, { hinge: 0, swing: -1 });
  door(p, rw, H - rh * 0.5 - 0.45, 'v', 0.9, { hinge: 1, swing: 1 });

  wall(p, rw, 0, rw, refH + bnH);
  room(p, 0, 0, rw, refH, 'REFACCIONES', 'refacciones');
  wall(p, 0, refH, rw, refH);
  door(p, rw, refH * 0.5 - 0.45, 'v', 0.9, { hinge: 0, swing: 1 });
  room(p, 0, refH, rw, bnH, 'BAÑO', 'bano');
  wall(p, 0, refH + bnH, rw, refH + bnH);
  door(p, rw, refH + bnH * 0.5 - 0.35, 'v', 0.7, { hinge: 0, swing: 1 });

  room(p, rw, 0, W - rw, H, 'ZONA DE TRABAJO', 'tallerZona');
  const gW = rr(rng, 5, 6.5);
  door(p, rw + (W - rw) / 2 - gW / 2, H, 'h', gW, { kind: 'slide', entrance: true });
  p.vBands = [0, refH, refH + bnH, H - rh, H];
  return p;
}

function genSpa(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* pasillo central, cabinas izquierda, servicios derecha */
    const lW = rr(rng, 3.6, 4.2);
    const corW = rr(rng, 1.8, 2.0);
    const rW = rr(rng, 3.6, 4.2);
    const W = lW + corW + rW;
    const recH = rr(rng, 3.8, 4.6);
    const vesH = rr(rng, 2.6, 3.2);
    const sauH = rr(rng, 2.5, 3.0);
    const bnH = rr(rng, 2.0, 2.4);
    const backH = vesH + sauH + bnH;
    const H = recH + backH;
    const p = newPlan(W, H);
    const xc = lW, xc2 = lW + corW;

    wall(p, xc, 0, xc, backH);
    wall(p, xc2, 0, xc2, backH);
    const cabH = backH / 2;
    room(p, 0, 0, lW, cabH, 'CABINA 1', 'cabina');
    wall(p, 0, cabH, xc, cabH);
    door(p, xc, cabH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
    room(p, 0, cabH, lW, backH - cabH, 'CABINA 2', 'cabina');
    door(p, xc, cabH + (backH - cabH) * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });
    room(p, xc2, 0, rW, sauH, 'SAUNA', 'sauna');
    wall(p, xc2, sauH, W, sauH);
    door(p, xc2, sauH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });
    room(p, xc2, sauH, rW, vesH, 'VESTIDORES', 'vestidor');
    wall(p, xc2, sauH + vesH, W, sauH + vesH);
    door(p, xc2, sauH + vesH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });
    room(p, xc2, sauH + vesH, rW, bnH, 'BAÑO', 'bano');
    door(p, xc2, sauH + vesH + bnH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });

    wall(p, 0, backH, xc, backH);
    wall(p, xc2, backH, W, backH);
    room(p, 0, backH, W, recH, 'RECEPCIÓN Y ESPERA', 'recepcion');
    room(p, xc, 0, corW, backH, 'PASILLO', 'pasillo');
    door(p, W * rr(rng, 0.4, 0.6) - 0.55, H, 'h', 1.1, { hinge: 0, swing: -1, entrance: true });
    p.vBands = [0, sauH, sauH + vesH, backH, H];
    return p;
  }

  if (variant === 2) {
    /* cabinas al fondo en fila + pasillo + frente dividido */
    const nCab = ri(rng, 2, 3);
    const widths: number[] = [];
    for (let i = 0; i < nCab; i++) widths.push(rr(rng, 3.0, 3.7));
    widths.push(rr(rng, 2.8, 3.4));
    widths.push(rr(rng, 2.4, 3.0));
    const W = widths.reduce((a, b) => a + b, 0);
    const topH = rr(rng, 3.6, 4.3);
    const corH = rr(rng, 1.8, 2.1);
    const frontH = rr(rng, 4.0, 5.0);
    const H = topH + corH + frontH;
    const p = newPlan(W, H);

    const defs: [string, string][] = [];
    for (let i = 0; i < nCab; i++) defs.push([`CABINA ${i + 1}`, 'cabina']);
    defs.push(['SAUNA', 'sauna']);
    defs.push(['VESTIDOR', 'vestidor']);
    let x = 0;
    widths.forEach((w2, i) => {
      room(p, x, 0, w2, topH, defs[i][0], defs[i][1]);
      if (i < widths.length - 1) wall(p, x + w2, 0, x + w2, topH);
      door(p, x + w2 / 2 - 0.4, topH, 'h', 0.8, { hinge: hingeRnd(rng), swing: -1 });
      x += w2;
    });
    wall(p, 0, topH, W, topH);
    room(p, 0, topH, W, corH, 'PASILLO', 'pasillo');
    wall(p, 0, topH + corH, W, topH + corH);
    opening(p, W * 0.5 - 1.4, topH + corH, 'h', 2.8);
    const splitX = W * rr(rng, 0.52, 0.6);
    room(p, 0, topH + corH, splitX, frontH, 'RECEPCIÓN', 'recepcion');
    wall(p, splitX, topH + corH, splitX, H);
    opening(p, splitX, topH + corH + frontH * 0.5 - 0.7, 'v', 1.4);
    room(p, splitX, topH + corH, W - splitX, frontH, 'SALA DE\nRELAJACIÓN', 'relax');
    door(p, splitX * rr(rng, 0.4, 0.6) - 0.55, H, 'h', 1.1, { hinge: 0, swing: -1, entrance: true });
    p.vBands = [0, topH, topH + corH, H];
    return p;
  }

  /* V3: cabinas en columna izquierda, hidroterapia al fondo derecha */
  const colW = rr(rng, 3.4, 4.0);
  const W = colW + rr(rng, 6.5, 7.8);
  const nCab = 3;
  const cabH = rr(rng, 3.0, 3.5);
  const H = nCab * cabH + rr(rng, 3.8, 4.6);
  const p = newPlan(W, H);
  const recH = H - nCab * cabH;

  wall(p, colW, 0, colW, H - recH);
  for (let i = 0; i < nCab; i++) {
    room(p, 0, i * cabH, colW, cabH, `CABINA ${i + 1}`, 'cabina');
    if (i < nCab - 1) wall(p, 0, (i + 1) * cabH, colW, (i + 1) * cabH);
    door(p, colW, i * cabH + cabH / 2 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });
  }
  const hidW = rr(rng, 4.2, 5.0);
  const hidH = rr(rng, 3.6, 4.2);
  room(p, W - hidW, 0, hidW, hidH, 'HIDROTERAPIA', 'hidro');
  wall(p, W - hidW, 0, W - hidW, hidH);
  wall(p, W - hidW, hidH, W, hidH);
  door(p, W - hidW, hidH * 0.5 - 0.45, 'v', 0.9, { hinge: 1, swing: -1 });
  const vesH2 = rr(rng, 2.2, 2.7);
  room(p, colW, H - recH - vesH2, W - colW, vesH2, 'VESTIDORES Y BAÑO', 'vestidor');
  wall(p, colW, H - recH - vesH2, W, H - recH - vesH2);
  door(p, colW + (W - colW) * 0.5 - 0.45, H - recH - vesH2, 'h', 0.9, { hinge: 0, swing: -1 });
  room(p, colW, hidH, W - colW, H - recH - vesH2 - hidH, 'CIRCULACIÓN', 'pasillo');
  wall(p, 0, H - recH, W, H - recH);
  opening(p, W * 0.5 - 1.3, H - recH, 'h', 2.6);
  room(p, 0, H - recH, W, recH, 'RECEPCIÓN Y ESPERA', 'recepcion');
  door(p, W * rr(rng, 0.4, 0.6) - 0.55, H, 'h', 1.1, { hinge: 0, swing: -1, entrance: true });
  p.vBands = [0, hidH, H - recH, H];
  return p;
}

function genOficina(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* privados al fondo, operativa al centro, recepción al frente */
    const W = rr(rng, 13, 15.5);
    const backH = rr(rng, 3.4, 4.0);
    const midH = rr(rng, 4.5, 5.5);
    const frontH = rr(rng, 3.2, 4.0);
    const H = backH + midH + frontH;
    const p = newPlan(W, H);

    const parts = splitTotal(W, [rr(rng, 1.3, 1.55), rr(rng, 1.0, 1.2), rr(rng, 0.6, 0.7), rr(rng, 0.75, 0.9)]);
    const rooms: [string, string][] = [['SALA DE JUNTAS', 'juntas'], ['PRIVADO', 'oficina'], ['BAÑO', 'bano'], ['COCINETA', 'cocineta']];
    let x = 0;
    wall(p, 0, backH, W, backH);
    parts.forEach((w2, i) => {
      room(p, x, 0, w2, backH, rooms[i][0], rooms[i][1]);
      if (i < parts.length - 1) wall(p, x + w2, 0, x + w2, backH);
      door(p, x + w2 / 2 - 0.45, backH, 'h', 0.9, { hinge: hingeRnd(rng), swing: 1 });
      x += w2;
    });

    room(p, 0, backH, W, midH, 'ÁREA OPERATIVA', 'operativa');
    const yF = backH + midH;
    wall(p, 0, yF, W, yF);
    opening(p, W * 0.32, yF, 'h', 1.6);
    opening(p, W * 0.62, yF, 'h', 1.6);
    room(p, 0, yF, W, frontH, 'RECEPCIÓN Y ESPERA', 'recepcion');
    door(p, W * rr(rng, 0.42, 0.58) - 0.55, H, 'h', 1.1, { hinge: 0, swing: -1, entrance: true });
    p.vBands = [0, backH, yF, H];
    return p;
  }

  if (variant === 2) {
    /* privados en columna izquierda, operativa derecha */
    const colW = rr(rng, 3.6, 4.2);
    const W = colW + rr(rng, 8, 9.5);
    const nPriv = ri(rng, 2, 3);
    const privH = rr(rng, 2.9, 3.4);
    const junH = rr(rng, 3.2, 3.8);
    const H = nPriv * privH + junH + rr(rng, 1.9, 2.4);
    const p = newPlan(W, H);

    wall(p, colW, 0, colW, H);
    let y = 0;
    for (let i = 0; i < nPriv; i++) {
      room(p, 0, y, colW, privH, `PRIVADO ${i + 1}`, 'oficina');
      wall(p, 0, y + privH, colW, y + privH);
      door(p, colW, y + privH / 2 - 0.45, 'v', 0.9, { hinge: 0, swing: 1 });
      y += privH;
    }
    room(p, 0, y, colW, junH, 'SALA DE JUNTAS', 'juntas');
    wall(p, 0, y + junH, colW, y + junH);
    door(p, colW, y + junH / 2 - 0.45, 'v', 0.9, { hinge: 0, swing: 1 });
    y += junH;
    room(p, 0, y, colW, H - y, 'BAÑO', 'bano');
    door(p, colW, y + (H - y) / 2 - 0.4, 'v', 0.8, { hinge: 0, swing: 1 });

    const recH = rr(rng, 3.4, 4.2);
    wall(p, colW, H - recH, W, H - recH);
    opening(p, colW + (W - colW) * 0.5 - 1.2, H - recH, 'h', 2.4);
    room(p, colW, 0, W - colW, H - recH, 'ÁREA OPERATIVA', 'operativa');
    room(p, colW, H - recH, W - colW, recH, 'RECEPCIÓN', 'recepcion');
    door(p, colW + (W - colW) * rr(rng, 0.35, 0.6) - 0.55, H, 'h', 1.1, { hinge: 0, swing: -1, entrance: true });
    p.vBands = [0, H - recH, H];
    return p;
  }

  /* V3: operativa al frente, servicios al fondo */
  const W = rr(rng, 12, 14);
  const backH = rr(rng, 3.2, 3.8);
  const H = backH + rr(rng, 7.5, 9);
  const p = newPlan(W, H);

  const parts = splitTotal(W, [rr(rng, 1.0, 1.2), rr(rng, 1.0, 1.2), rr(rng, 0.55, 0.65), rr(rng, 0.8, 0.95)]);
  const rooms: [string, string][] = [['PRIVADO 1', 'oficina'], ['PRIVADO 2', 'oficina'], ['BAÑO', 'bano'], ['BODEGA', 'bodega']];
  let x = 0;
  wall(p, 0, backH, W, backH);
  parts.forEach((w2, i) => {
    room(p, x, 0, w2, backH, rooms[i][0], rooms[i][1]);
    if (i < parts.length - 1) wall(p, x + w2, 0, x + w2, backH);
    door(p, x + w2 / 2 - 0.45, backH, 'h', 0.9, { hinge: hingeRnd(rng), swing: 1 });
    x += w2;
  });
  room(p, 0, backH, W, H - backH, 'ÁREA OPERATIVA\nY COWORKING', 'operativa');
  furn(p, 'receptionL', W - 3.0, H - 2.2, 2.2, 1.5);
  door(p, W * rr(rng, 0.25, 0.4) - 0.65, H, 'h', 1.3, { kind: 'double', swing: -1, entrance: true });
  p.vBands = [0, backH, H];
  return p;
}

function genBodega(rng: Rng, variant: number): Plan {
  if (variant === 1) {
    /* oficina y baño al fondo, nave de racks, andén de carga al frente */
    const W = rr(rng, 13, 16);
    const backH = rr(rng, 2.8, 3.4);
    const H = backH + rr(rng, 9, 11);
    const p = newPlan(W, H);
    const ofW = rr(rng, 3.6, 4.4);
    const bnW = rr(rng, 2.0, 2.4);

    wall(p, 0, backH, ofW + bnW, backH);
    room(p, 0, 0, ofW, backH, 'OFICINA ADM.', 'oficina');
    wall(p, ofW, 0, ofW, backH);
    door(p, ofW * 0.5 - 0.45, backH, 'h', 0.9, { hinge: 0, swing: 1 });
    room(p, ofW, 0, bnW, backH, 'BAÑO', 'bano');
    wall(p, ofW + bnW, 0, ofW + bnW, backH);
    door(p, ofW + bnW * 0.5 - 0.35, backH, 'h', 0.7, { hinge: 1, swing: 1 });

    room(p, 0, backH, W, H - backH, 'ÁREA DE ALMACENAMIENTO', 'almacenRacks');
    room(p, 0, H - 2.2, W, 2.2, 'ANDÉN DE CARGA Y DESCARGA', 'anden');
    const gW = rr(rng, 5.5, 7.5);
    door(p, W / 2 - gW / 2, H, 'h', gW, { kind: 'slide', entrance: true });
    door(p, W - 1.4, H, 'h', 0.9, { hinge: 1, swing: -1, exteriorExit: true });
    p.vBands = [0, backH, H];
    return p;
  }

  if (variant === 2) {
    /* oficinas en columna derecha, nave con racks horizontales */
    const colW = rr(rng, 3.6, 4.2);
    const W = colW + rr(rng, 9.5, 11.5);
    const ofH = rr(rng, 3.0, 3.6);
    const bnH = rr(rng, 2.0, 2.4);
    const vesH = rr(rng, 2.4, 2.9);
    const H = ofH + bnH + vesH + rr(rng, 3.5, 4.5);
    const p = newPlan(W, H);
    const xc = W - colW;

    wall(p, xc, 0, xc, ofH + bnH + vesH);
    room(p, xc, 0, colW, ofH, 'OFICINA ADM.', 'oficina');
    wall(p, xc, ofH, W, ofH);
    door(p, xc, ofH * 0.5 - 0.45, 'v', 0.9, { hinge: 0, swing: -1 });
    room(p, xc, ofH, colW, bnH, 'BAÑO', 'bano');
    wall(p, xc, ofH + bnH, W, ofH + bnH);
    door(p, xc, ofH + bnH * 0.5 - 0.35, 'v', 0.7, { hinge: 0, swing: -1 });
    room(p, xc, ofH + bnH, colW, vesH, 'VESTIDOR', 'vestidor');
    wall(p, xc, ofH + bnH + vesH, W, ofH + bnH + vesH);
    door(p, xc, ofH + bnH + vesH * 0.5 - 0.4, 'v', 0.8, { hinge: 0, swing: -1 });

    room(p, 0, 0, xc, H, 'ÁREA DE ALMACENAMIENTO', 'almacenRacks');
    const gW = rr(rng, 5, 6.5);
    door(p, xc * 0.5 - gW / 2, H, 'h', gW, { kind: 'slide', entrance: true });
    door(p, W - 1.4, H, 'h', 0.9, { hinge: 1, swing: -1, exteriorExit: true });
    p.vBands = [0, ofH, ofH + bnH, ofH + bnH + vesH, H];
    return p;
  }

  /* V3: bodega chica con recepción de material al frente */
  const W = rr(rng, 10, 12);
  const recH = rr(rng, 2.6, 3.2);
  const H = recH + rr(rng, 7.5, 9);
  const p = newPlan(W, H);
  const ofW = rr(rng, 3.2, 3.8);

  room(p, 0, 0, W, H - recH, 'ÁREA DE ALMACENAMIENTO', 'almacenRacks');
  wall(p, 0, H - recH, W, H - recH);
  opening(p, W * rr(rng, 0.3, 0.5), H - recH, 'h', 2.2);
  room(p, 0, H - recH, ofW, recH, 'OFICINA', 'oficina');
  wall(p, ofW, H - recH, ofW, H);
  door(p, ofW, H - recH * 0.5 - 0.4, 'v', 0.8, { hinge: 1, swing: 1 });
  const bnW = rr(rng, 1.9, 2.2);
  room(p, W - bnW, H - recH, bnW, recH, 'BAÑO', 'bano');
  wall(p, W - bnW, H - recH, W - bnW, H);
  door(p, W - bnW, H - recH * 0.5 - 0.35, 'v', 0.7, { hinge: 0, swing: -1 });
  room(p, ofW, H - recH, W - ofW - bnW, recH, 'RECEPCIÓN DE MATERIAL', 'anden');
  const gW = rr(rng, 3.5, 4.5);
  door(p, ofW + (W - ofW - bnW) / 2 - gW / 2, H, 'h', gW, { kind: 'slide', entrance: true });
  p.vBands = [0, H - recH, H];
  return p;
}

const GIRO_DEFS: Record<string, { label: string; gen: GeneratorFn; variants: number }> = {
  restaurante: { label: 'Restaurante', gen: genRestaurante, variants: 3 },
  oficina:     { label: 'Oficina Administrativa', gen: genOficina, variants: 3 },
  consultorio: { label: 'Consultorio Médico / Clínica', gen: genConsultorio, variants: 3 },
  bodega:      { label: 'Bodega / Almacén', gen: genBodega, variants: 3 },
  comercio:    { label: 'Comercio General / Local', gen: genComercio, variants: 3 },
  taller:      { label: 'Taller Mecánico', gen: genTaller, variants: 3 },
  spa:         { label: 'Spa / Estética', gen: genSpa, variants: 3 },
};

/* Giros disponibles, para poblar el selector del modal */
export const CROQUIS_GIROS = Object.entries(GIRO_DEFS).map(([id, d]) => ({ id, name: d.label }));

/* ============================================================
   ROTACIÓN DEL PLANO (para entrada en muro Este)
   Rota 90° antihorario: el muro sur pasa a ser el muro este.
   ============================================================ */
function rotatePlanEast(p: Plan): Plan {
  const W = p.w;
  const out = newPlan(p.h, p.w);
  p.rooms.forEach(r => {
    out.rooms.push({ x: r.y, y: W - r.x - r.w, w: r.h, h: r.w, label: r.label, role: r.role });
  });
  p.walls.forEach(w2 => {
    out.walls.push({ x1: w2.y1, y1: W - w2.x1, x2: w2.y2, y2: W - w2.x2 });
  });
  p.doors.forEach(d => {
    if (d.dir === 'h') {
      out.doors.push({ ...d, dir: 'v', x: d.y, y: W - d.x - d.len, hinge: d.hinge === 0 ? 1 : 0 });
    } else {
      out.doors.push({ ...d, dir: 'h', x: d.y, y: W - d.x, swing: (d.swing * -1) as 1 | -1 });
    }
  });
  p.furn.forEach(f => {
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    const ncx = cy, ncy = W - cx;
    out.furn.push({ ...f, x: ncx - f.w / 2, y: ncy - f.h / 2, rot: f.rot - 90 });
  });
  out.vBands = null;   // las cotas por bandas ya no aplican tras rotar
  return out;
}

/* ============================================================
   RENDER SVG (encajado en el viewBox 800×600)
   ============================================================ */
const VIEW_W = 800, VIEW_H = 600;
const WALL_T = 0.16;
const WALL_COLOR = '#0f172a';
const LABEL_COLOR = '#334155';
const DIM_COLOR = '#64748b';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function doorSVG(d: Door): string {
  const punchW = WALL_T + 0.06;
  let out = '';
  if (d.dir === 'h') {
    out += `<rect x="${d.x.toFixed(3)}" y="${(d.y - punchW / 2).toFixed(3)}" width="${d.len.toFixed(3)}" height="${punchW.toFixed(3)}" fill="#ffffff" stroke="none"/>`;
  } else {
    out += `<rect x="${(d.x - punchW / 2).toFixed(3)}" y="${d.y.toFixed(3)}" width="${punchW.toFixed(3)}" height="${d.len.toFixed(3)}" fill="#ffffff" stroke="none"/>`;
  }
  if (d.kind === 'open') return out;

  if (d.kind === 'slide') {
    if (d.dir === 'h') {
      out += `<line x1="${d.x.toFixed(3)}" y1="${d.y.toFixed(3)}" x2="${(d.x + d.len).toFixed(3)}" y2="${d.y.toFixed(3)}" stroke="${WALL_COLOR}" stroke-width="0.045" stroke-dasharray="0.22 0.14"/>` +
             `<rect x="${(d.x + 0.08).toFixed(3)}" y="${(d.y - 0.2).toFixed(3)}" width="${(d.len * 0.55).toFixed(3)}" height="0.09" fill="${WALL_COLOR}"/>`;
    } else {
      out += `<line x1="${d.x.toFixed(3)}" y1="${d.y.toFixed(3)}" x2="${d.x.toFixed(3)}" y2="${(d.y + d.len).toFixed(3)}" stroke="${WALL_COLOR}" stroke-width="0.045" stroke-dasharray="0.22 0.14"/>` +
             `<rect x="${(d.x - 0.2).toFixed(3)}" y="${(d.y + 0.08).toFixed(3)}" width="0.09" height="${(d.len * 0.55).toFixed(3)}" fill="${WALL_COLOR}"/>`;
    }
    return out;
  }

  const leaves = d.kind === 'double'
    ? [{ len: d.len / 2, hingeAt: 0 }, { len: d.len / 2, hingeAt: 1 }]
    : [{ len: d.len, hingeAt: d.hinge }];

  leaves.forEach(L => {
    let hx: number, hy: number, jx: number, jy: number;
    if (d.dir === 'h') {
      hx = L.hingeAt === 0 ? d.x : d.x + d.len;
      jx = L.hingeAt === 0 ? hx + L.len : hx - L.len;
      hy = jy = d.y;
    } else {
      hy = L.hingeAt === 0 ? d.y : d.y + d.len;
      jy = L.hingeAt === 0 ? hy + L.len : hy - L.len;
      hx = jx = d.x;
    }
    let tx: number, ty: number;
    if (d.dir === 'h') { tx = hx; ty = hy + d.swing * L.len; }
    else { tx = hx + d.swing * L.len; ty = hy; }

    const sweep = ((jx - hx) * (ty - hy) - (jy - hy) * (tx - hx)) > 0 ? 1 : 0;
    out += `<line x1="${hx.toFixed(3)}" y1="${hy.toFixed(3)}" x2="${tx.toFixed(3)}" y2="${ty.toFixed(3)}" stroke="${WALL_COLOR}" stroke-width="0.05"/>` +
           `<path d="M ${jx.toFixed(3)} ${jy.toFixed(3)} A ${L.len.toFixed(3)} ${L.len.toFixed(3)} 0 0 ${sweep} ${tx.toFixed(3)} ${ty.toFixed(3)}" fill="none" stroke="${DIM_COLOR}" stroke-width="0.028" stroke-dasharray="0.1 0.08"/>`;
  });
  return out;
}

function labelSVG(r: Room): string {
  const lines = r.label.split('\n');
  const maxChars = Math.max(6, Math.floor(r.w / 0.19));
  const final: string[] = [];
  lines.forEach(l => {
    if (l.length > maxChars && l.includes(' ')) {
      const words = l.split(' ');
      let a = '', b = '';
      words.forEach(w2 => {
        if ((a + w2).length <= l.length / 2 || !a) a += (a ? ' ' : '') + w2;
        else b += (b ? ' ' : '') + w2;
      });
      final.push(a); if (b) final.push(b);
    } else final.push(l);
  });

  const small = r.role === 'pasillo' || Math.min(r.w, r.h) < 2.3;
  const fs = small ? 0.24 : 0.3;
  const lh = fs * 1.35;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 - (final.length - 1) * lh / 2;
  let out = '';
  final.forEach((l, i) => {
    out += `<text x="${cx.toFixed(3)}" y="${(cy + i * lh).toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="600" letter-spacing="0.03" fill="${LABEL_COLOR}" stroke="#ffffff" stroke-width="0.09" paint-order="stroke" font-family="system-ui, sans-serif">${esc(l)}</text>`;
  });
  return out;
}

function dimsSVG(plan: Plan): string {
  let out = '';
  const dx = plan.w + 0.5;
  const c = DIM_COLOR;
  if (plan.vBands && plan.vBands.length > 1) {
    const ys = plan.vBands;
    out += `<line x1="${dx}" y1="${ys[0]}" x2="${dx}" y2="${ys[ys.length - 1]}" stroke="${c}" stroke-width="0.025"/>`;
    ys.forEach(y => {
      out += `<line x1="${(dx - 0.12).toFixed(3)}" y1="${(y + 0.12).toFixed(3)}" x2="${(dx + 0.12).toFixed(3)}" y2="${(y - 0.12).toFixed(3)}" stroke="${c}" stroke-width="0.03"/>` +
             `<line x1="${plan.w.toFixed(3)}" y1="${y.toFixed(3)}" x2="${dx.toFixed(3)}" y2="${y.toFixed(3)}" stroke="${c}" stroke-width="0.018" stroke-dasharray="0.07 0.07"/>`;
    });
    for (let i = 0; i < ys.length - 1; i++) {
      const mid = (ys[i] + ys[i + 1]) / 2;
      out += `<text x="${(dx + 0.24).toFixed(3)}" y="${mid.toFixed(3)}" text-anchor="middle" dominant-baseline="middle" font-size="0.26" fill="${c}" font-family="system-ui, sans-serif" transform="rotate(-90 ${(dx + 0.24).toFixed(3)} ${mid.toFixed(3)})">${(ys[i + 1] - ys[i]).toFixed(2)}</text>`;
    }
  }
  const dy = plan.h + 0.5;
  out += `<line x1="0" y1="${dy}" x2="${plan.w}" y2="${dy}" stroke="${c}" stroke-width="0.025"/>` +
         `<line x1="-0.12" y1="${(dy + 0.12).toFixed(3)}" x2="0.12" y2="${(dy - 0.12).toFixed(3)}" stroke="${c}" stroke-width="0.03"/>` +
         `<line x1="${(plan.w - 0.12).toFixed(3)}" y1="${(dy + 0.12).toFixed(3)}" x2="${(plan.w + 0.12).toFixed(3)}" y2="${(dy - 0.12).toFixed(3)}" stroke="${c}" stroke-width="0.03"/>` +
         `<text x="${(plan.w / 2).toFixed(3)}" y="${(dy - 0.12).toFixed(3)}" text-anchor="middle" font-size="0.26" fill="${c}" font-family="system-ui, sans-serif">${plan.w.toFixed(2)} m</text>`;
  return out;
}

function renderBase(plan: Plan, giroLabel: string, variant: number, scalePx: number, tx: number, ty: number): string {
  const t = WALL_T;
  let inner = '';

  /* piso blanco */
  inner += `<rect x="${-t / 2}" y="${-t / 2}" width="${plan.w + t}" height="${plan.h + t}" fill="#ffffff" stroke="none"/>`;
  /* mobiliario */
  inner += `<g>${plan.furn.map(furnToSVG).join('')}</g>`;
  /* muros */
  let walls = `<rect x="0" y="0" width="${plan.w}" height="${plan.h}" fill="none" stroke="${WALL_COLOR}" stroke-width="${t}"/>`;
  plan.walls.forEach(w2 => {
    walls += `<line x1="${w2.x1.toFixed(3)}" y1="${w2.y1.toFixed(3)}" x2="${w2.x2.toFixed(3)}" y2="${w2.y2.toFixed(3)}" stroke="${WALL_COLOR}" stroke-width="${t}" stroke-linecap="square"/>`;
  });
  inner += `<g>${walls}</g>`;
  /* puertas */
  inner += `<g>${plan.doors.map(doorSVG).join('')}</g>`;
  /* etiquetas */
  inner += `<g>${plan.rooms.map(labelSVG).join('')}</g>`;
  /* cotas */
  inner += `<g>${dimsSVG(plan)}</g>`;

  const group = `<g transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${scalePx.toFixed(4)})">${inner}</g>`;

  /* anotaciones en px (norte, escala gráfica, pie) */
  const nx = 34, ny = VIEW_H - 34;
  const north =
    `<g transform="translate(${nx},${ny})" opacity="0.85">` +
    `<circle r="15" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>` +
    `<path d="M 0 -9 L 4 4 L 0 1 L -4 4 Z" fill="${WALL_COLOR}"/>` +
    `<text y="-19" text-anchor="middle" font-size="9" font-weight="bold" fill="${DIM_COLOR}" font-family="system-ui, sans-serif">N</text></g>`;

  const barM = 5;
  const barPx = barM * scalePx;
  const sbx = VIEW_W - 80 - barPx, sby = VIEW_H - 18;
  let scaleBar = `<g>`;
  for (let i = 0; i < 5; i++) {
    scaleBar += `<rect x="${(sbx + i * barPx / 5).toFixed(1)}" y="${sby}" width="${(barPx / 5).toFixed(1)}" height="5" fill="${i % 2 ? '#ffffff' : '#475569'}" stroke="#475569" stroke-width="0.75"/>`;
  }
  scaleBar += `<text x="${(sbx + barPx / 2).toFixed(1)}" y="${sby - 5}" text-anchor="middle" font-size="9" font-weight="bold" fill="#475569" font-family="system-ui, sans-serif">Escala: ${barM} m</text></g>`;

  const foot = `<text x="${nx + 26}" y="${VIEW_H - 30}" font-size="9" fill="${DIM_COLOR}" letter-spacing="0.6" font-family="system-ui, sans-serif">${esc(giroLabel.toUpperCase())} · DISTRIBUCIÓN ${variant}</text>`;

  return group + north + scaleBar + foot;
}

/* ============================================================
   ANCLAS DE SEÑALÉTICAS (derivadas del plano)
   ============================================================ */
const ROLE_ANCHOR_TYPES: Record<string, CroquisSignType[]> = {
  recepcion: ['botiquin', 'extintor', 'detector_humo'],
  atencion: ['botiquin', 'extintor', 'detector_humo', 'ruta_evacuacion'],
  mostrador: ['botiquin', 'extintor', 'detector_humo', 'ruta_evacuacion'],
  bano: ['ruta_evacuacion'],
  laboratorio: ['detector_humo', 'extintor'],
  comedor: ['detector_humo', 'ruta_evacuacion', 'botiquin'],
  barra: ['extintor', 'detector_humo'],
  ventas: ['detector_humo', 'ruta_evacuacion', 'extintor', 'botiquin'],
  operativa: ['detector_humo', 'ruta_evacuacion', 'extintor', 'botiquin'],
  tallerZona: ['extintor', 'detector_humo', 'ruta_evacuacion', 'botiquin'],
  almacenRacks: ['extintor', 'detector_humo', 'ruta_evacuacion', 'botiquin'],
  relax: ['detector_humo', 'ruta_evacuacion'],
  oficina: ['detector_humo', 'botiquin'],
  juntas: ['detector_humo'],
  cabina: ['detector_humo'],
  vestidor: ['detector_humo'],
  sauna: ['detector_humo'],
  hidro: ['detector_humo'],
  archivo: ['detector_humo', 'extintor'],
  consultorio: ['detector_humo', 'extintor'],
  pasillo: ['ruta_evacuacion', 'extintor'],
  limpieza: ['extintor', 'detector_humo'],
  recepProductos: ['extintor', 'detector_humo'],
  refacciones: ['extintor', 'detector_humo'],
  bodega: ['extintor', 'detector_humo'],
  cocineta: ['extintor', 'detector_humo'],
  cocina: ['extintor', 'detector_humo'],
  cajas: ['botiquin', 'extintor'],
  anden: ['extintor', 'ruta_evacuacion'],
};

function getRoomExitRotation(r: Room, doors: Door[]): number {
  const margin = 0.15; // margin in meters
  const door = doors.find(d => {
    if (d.dir === 'v') {
      const matchesLeft = Math.abs(d.x - r.x) < margin;
      const matchesRight = Math.abs(d.x - (r.x + r.w)) < margin;
      if (matchesLeft || matchesRight) {
        return d.y >= r.y - margin && d.y <= r.y + r.h + margin;
      }
    } else {
      const matchesTop = Math.abs(d.y - r.y) < margin;
      const matchesBottom = Math.abs(d.y - (r.y + r.h)) < margin;
      if (matchesTop || matchesBottom) {
        return d.x >= r.x - margin && d.x <= r.x + r.w + margin;
      }
    }
    return false;
  });

  if (door) {
    if (door.dir === 'v') {
      if (Math.abs(door.x - r.x) < margin) return 180; // Left door -> exit left (180)
      return 0; // Right door -> exit right (0)
    } else {
      if (Math.abs(door.y - r.y) < margin) return 270; // Top door -> exit up (270)
      return 90; // Bottom door -> exit down (90)
    }
  }

  return r.x > 4 ? 180 : 0;
}

function buildAnchors(plan: Plan, toPx: (x: number, y: number) => [number, number], doorSide: DoorSide): CroquisAnchor[] {
  const anchors: CroquisAnchor[] = [];
  const usedIds = new Set<string>();
  const uid = (base: string) => {
    let id = base, i = 2;
    while (usedIds.has(id)) id = `${base}_${i++}`;
    usedIds.add(id);
    return id;
  };

  /* acceso principal en la pared al lado de la puerta y al centro para el cartel de Salida */
  const entrance = plan.doors.find(d => d.entrance);
  if (entrance) {
    const isHorizontal = entrance.dir === 'h';
    
    // 1. Acceso Principal Centro (Directo arriba de la puerta, exclusivo para cartel 'salida_emergencia')
    const ecx = isHorizontal ? entrance.x + entrance.len / 2 : entrance.x;
    const ecy = isHorizontal ? entrance.y : entrance.y + entrance.len / 2;
    const [pcx, pcy] = toPx(ecx, ecy);
    anchors.push({
      id: 'acceso_principal_centro', name: 'Acceso Principal (Centro Puerta)',
      x: pcx, y: pcy,
      allowedTypes: ['salida_emergencia'],
      rotation: doorSide === 'S' ? 180 : 90,
      role: 'acceso_principal_centro',
    });
    usedIds.add('acceso_principal_centro');

    // 2. Acceso Principal Izquierda (Pared al lado, para extintores y flechas)
    const elx = isHorizontal ? entrance.x - 0.45 : entrance.x;
    const ely = isHorizontal ? entrance.y : entrance.y - 0.45;
    const [plx, ply] = toPx(elx, ely);
    anchors.push({
      id: 'acceso_principal_izq', name: 'Acceso Principal (Izquierda)',
      x: plx, y: ply,
      allowedTypes: ['ruta_evacuacion', 'extintor'],
      rotation: doorSide === 'S' ? 180 : 90,
      role: 'acceso_principal_izq',
    });
    usedIds.add('acceso_principal_izq');

    // 3. Acceso Principal Derecha (Pared al lado, para flechas)
    const erx = isHorizontal ? entrance.x + entrance.len + 0.45 : entrance.x;
    const ery = isHorizontal ? entrance.y : entrance.y + entrance.len + 0.45;
    const [prx, pry] = toPx(erx, ery);
    anchors.push({
      id: 'acceso_principal_der', name: 'Acceso Principal (Derecha)',
      x: prx, y: pry,
      allowedTypes: ['ruta_evacuacion'],
      rotation: doorSide === 'S' ? 180 : 90,
      role: 'acceso_principal_der',
    });
    usedIds.add('acceso_principal_der');
  }

  /* salida de emergencia secundaria */
  const exit = plan.doors.find(d => d.exteriorExit);
  if (exit) {
    const isHorizontal = exit.dir === 'h';
    
    // 1. Salida de Emergencia Centro (Directo arriba de la puerta, exclusivo para cartel 'salida_emergencia')
    const ecx = isHorizontal ? exit.x + exit.len / 2 : exit.x;
    const ecy = isHorizontal ? exit.y : exit.y + exit.len / 2;
    const [pcx, pcy] = toPx(ecx, ecy);
    anchors.push({
      id: 'salida_emergencia_centro', name: 'Salida de Emergencia (Centro Puerta)',
      x: pcx, y: pcy,
      allowedTypes: ['salida_emergencia'],
      role: 'salida_emergencia_centro',
    });
    usedIds.add('salida_emergencia_centro');

    // 2. Salida de Emergencia Pared (Al lado de la puerta, para flechas)
    const elx = isHorizontal ? exit.x - 0.45 : exit.x;
    const ely = isHorizontal ? exit.y : exit.y - 0.45;
    const [px, py] = toPx(elx, ely);
    anchors.push({
      id: 'salida_emergencia', name: 'Salida de Emergencia (Pared)',
      x: px, y: py,
      allowedTypes: ['ruta_evacuacion'],
      role: 'salida_emergencia',
    });
  } else {
    // Find the main public/open room to place the emergency exit sign at its back wall (avoid private offices)
    const publicRoles = ['operativa', 'comedor', 'ventas', 'tallerZona', 'almacenRacks', 'pasillo', 'barra'];
    const mainRoom = plan.rooms.find(r => publicRoles.includes(r.role)) || plan.rooms[0];
    
    // Place at the top-middle of this main room
    const mx = mainRoom.x + mainRoom.w * 0.5;
    const my = mainRoom.y + 0.35;
    const [px, py] = toPx(mx, my);
    anchors.push({
      id: 'salida_emergencia', name: 'Salida de Emergencia (Fondo)',
      x: px, y: py,
      allowedTypes: ['salida_emergencia', 'ruta_evacuacion'],
      rotation: 270,
      role: 'salida_emergencia',
    });
  }
  usedIds.add('salida_emergencia');

  /* tablero eléctrico sugerido en el muro poniente */
  {
    const [px, py] = toPx(0.35, plan.h * 0.4);
    anchors.push({
      id: 'tablero_electrico', name: 'Tablero Eléctrico',
      x: px, y: py,
      allowedTypes: ['riesgo_electrico', 'extintor'],
      rotation: 90,
      role: 'tablero_electrico',
    });
    usedIds.add('tablero_electrico');
  }

  /* un ancla por cuarto según su rol, distribuidas físicamente por tipo */
  plan.rooms.forEach(r => {
    const types = ROLE_ANCHOR_TYPES[r.role];
    if (!types) return;
    const slug = r.label.split('\n')[0].toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // 1. Detector de humo - Centro del cuarto
    if (types.includes('detector_humo')) {
      const [px, py] = toPx(r.x + r.w / 2, r.y + r.h / 2);
      anchors.push({
        id: uid(`${slug}_humo`),
        name: `${r.label.replace('\n', ' ')} (Humo)`,
        x: px, y: py,
        allowedTypes: ['detector_humo'],
        role: r.role,
      });
    }

    // 2. Extintor - Muro izquierdo del cuarto
    if (types.includes('extintor')) {
      const [px, py] = toPx(r.x + 0.35, r.y + r.h * 0.6);
      anchors.push({
        id: uid(`${slug}_extintor`),
        name: `${r.label.replace('\n', ' ')} (Extintor)`,
        x: px, y: py,
        allowedTypes: ['extintor'],
        role: r.role,
      });
    }

    // 3. Botiquín - Muro derecho del cuarto
    if (types.includes('botiquin')) {
      const [px, py] = toPx(r.x + r.w - 0.35, r.y + r.h * 0.4);
      anchors.push({
        id: uid(`${slug}_botiquin`),
        name: `${r.label.replace('\n', ' ')} (Botiquín)`,
        x: px, y: py,
        allowedTypes: ['botiquin'],
        role: r.role,
      });
    }

    // 4. Ruta de evacuación - Salida o muro inferior
    if (types.includes('ruta_evacuacion')) {
      const [px, py] = toPx(r.x + r.w / 2, r.y + r.h - 0.4);
      anchors.push({
        id: uid(`${slug}_ruta`),
        name: `${r.label.replace('\n', ' ')} (Ruta)`,
        x: px, y: py,
        allowedTypes: ['ruta_evacuacion'],
        role: r.role,
        rotation: getRoomExitRotation(r, plan.doors),
      });
    }

    // 5. Salida de emergencia interna (si aplica)
    if (types.includes('salida_emergencia')) {
      const [px, py] = toPx(r.x + r.w / 2, r.y + r.h - 0.2);
      anchors.push({
        id: uid(`${slug}_salida`),
        name: `${r.label.replace('\n', ' ')} (Salida)`,
        x: px, y: py,
        allowedTypes: ['salida_emergencia'],
        role: r.role,
      });
    }

    /* la cocina además lleva un ancla de gas junto a la estufa */
    if (r.role === 'cocina') {
      const [gx, gy] = toPx(r.x + r.w * 0.62, r.y + 0.55);
      anchors.push({
        id: uid('cocina_gas'), name: 'Cocina (Gas)',
        x: gx, y: gy,
        allowedTypes: ['valvula_gas'],
        role: 'cocina_gas',
      });
    }
  });

  return anchors;
}

/* ============================================================
   API PRINCIPAL
   ============================================================ */
export function generateCroquis(
  giroId: string,
  seed?: number,
  doorSide: DoorSide = 'S',
  forceVariant?: number,
): GeneratedCroquis {
  const def = GIRO_DEFS[giroId] || GIRO_DEFS.restaurante;
  const s = seed === undefined || seed === null ? Math.floor(Math.random() * 1e9) : seed;
  const rng = mulberry32(s);
  const variant = forceVariant && forceVariant >= 1 && forceVariant <= def.variants
    ? forceVariant
    : ri(rng, 1, def.variants);

  let plan = def.gen(rng, variant);
  furnishAll(plan, rng);
  if (doorSide === 'E') plan = rotatePlanEast(plan);

  /* encaje en el viewBox 800×600 */
  const ml = 16, mt = 16, mr = 60, mb = 46;
  const scalePx = Math.min((VIEW_W - ml - mr) / plan.w, (VIEW_H - mt - mb) / plan.h);
  const tx = ml + ((VIEW_W - ml - mr) - plan.w * scalePx) / 2;
  const ty = mt + ((VIEW_H - mt - mb) - plan.h * scalePx) / 2;
  const toPx = (x: number, y: number): [number, number] => [tx + x * scalePx, ty + y * scalePx];

  return {
    baseSVG: renderBase(plan, def.label, variant, scalePx, tx, ty),
    anchors: buildAnchors(plan, toPx, doorSide),
    widthM: plan.w,
    heightM: plan.h,
    variant,
    variants: def.variants,
    seed: s,
    giroLabel: def.label,
  };
}
