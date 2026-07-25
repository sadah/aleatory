import p5 from 'p5';
import { createButton, createSlider } from '../lib/controls';
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { buildFrame } from '../lib/frame';
import { createSeedUI, makeRng } from '../lib/seed';
import { onLocaleChange, t } from '../lib/i18n';
import { WORKS } from '../works';

const work = WORKS.find((w) => w.slug === 'lorenz-attractor');
if (!work) {
  throw new Error('Missing work metadata for lorenz-attractor');
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app root');
}

const { stage, controlsBar, seedSlot, exportSlot } = buildFrame(app, work);

const SIZE = 1080;
const SIGMA = 10;
const BETA = 8 / 3;
const DEFAULT_RHO = 28;
const DT = 0.005;
const CZ = 27;
const PERSPECTIVE = 150;
const NB = 16;
const CX = SIZE / 2;
const CY = SIZE * 0.52;
const R = 0.44 * SIZE;
const S = R / 30;
const DEFAULT_TRAIL = 7000;
const DEFAULT_STEPS_PER_FRAME = 8;
const DEFAULT_SPIN_VALUE = 0.3;
const DEFAULT_SEED = 1;
const MIN_PITCH = -1.4;
const MAX_PITCH = 1.4;

interface Point3 {
  x: number;
  y: number;
  z: number;
}

interface ScreenPoint {
  x: number;
  y: number;
}

interface BucketStyle {
  color: string;
  alpha: number;
  width: number;
}

const rampStops: Array<{ x: number; rgb: [number, number, number] }> = [
  { x: 0, rgb: [25, 55, 150] },
  { x: 0.3, rgb: [50, 130, 235] },
  { x: 0.55, rgb: [150, 210, 250] },
  { x: 0.74, rgb: [255, 250, 235] },
  { x: 0.88, rgb: [255, 185, 80] },
  { x: 1, rgb: [255, 140, 30] },
];

const bucketStyles = Array.from({ length: NB }, (_, b): BucketStyle => {
  const ratio = b / (NB - 1);
  const [r, g, blue] = ramp(ratio);
  return {
    color: `${r},${g},${blue}`,
    alpha: 0.32 + 0.5 * ratio,
    width: 0.9 + 1.1 * ratio,
  };
});

let canvasElement: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let xs = new Float32Array(DEFAULT_TRAIL);
let ys = new Float32Array(DEFAULT_TRAIL);
let zs = new Float32Array(DEFAULT_TRAIL);
let sp = new Float32Array(DEFAULT_TRAIL);
let len = DEFAULT_TRAIL;
let idx = 0;
let cur: Point3 = { x: 0, y: 0, z: 0 };
let simFrame = 0;
let frame = 0;
let baseYaw = 0;
let pitch = -0.32;
let rho = DEFAULT_RHO;
let stepsPF = DEFAULT_STEPS_PER_FRAME;
let spinPerFrame = DEFAULT_SPIN_VALUE * 0.01;
let seed = DEFAULT_SEED;
let running = true;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(a: number, b: number, tValue: number): number {
  return a + (b - a) * tValue;
}

function ramp(value: number): [number, number, number] {
  const v = clamp01(value);

  for (let i = 0; i < rampStops.length - 1; i += 1) {
    const a = rampStops[i];
    const b = rampStops[i + 1];
    if (v >= a.x && v <= b.x) {
      const localT = (v - a.x) / (b.x - a.x);
      return [
        Math.round(lerp(a.rgb[0], b.rgb[0], localT)),
        Math.round(lerp(a.rgb[1], b.rgb[1], localT)),
        Math.round(lerp(a.rgb[2], b.rgb[2], localT)),
      ];
    }
  }

  return rampStops[rampStops.length - 1].rgb;
}

function deriv(point: Point3): Point3 {
  return {
    x: SIGMA * (point.y - point.x),
    y: point.x * (rho - point.z) - point.y,
    z: point.x * point.y - BETA * point.z,
  };
}

function addScaled(point: Point3, delta: Point3, scale: number): Point3 {
  return {
    x: point.x + delta.x * scale,
    y: point.y + delta.y * scale,
    z: point.z + delta.z * scale,
  };
}

function advance(): void {
  const k1 = deriv(cur);
  const k2 = deriv(addScaled(cur, k1, DT * 0.5));
  const k3 = deriv(addScaled(cur, k2, DT * 0.5));
  const k4 = deriv(addScaled(cur, k3, DT));

  cur = {
    x: cur.x + (DT / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: cur.y + (DT / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: cur.z + (DT / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  };

  const speed = deriv(cur);
  xs[idx] = cur.x;
  ys[idx] = cur.y;
  zs[idx] = cur.z;
  sp[idx] = Math.hypot(speed.x, speed.y, speed.z);
  idx = (idx + 1) % len;
}

function updateOverlayLabel(): void {
  overlayLabel.textContent = `σ=10  ρ=${rho.toFixed(1)}  β=8/3`;
}

function build(): void {
  xs = new Float32Array(len);
  ys = new Float32Array(len);
  zs = new Float32Array(len);
  sp = new Float32Array(len);

  const rng = makeRng(seed);
  cur = {
    x: -7.5 + (rng() - 0.5),
    y: -7.5 + (rng() - 0.5),
    z: 25 + (rng() - 0.5),
  };

  idx = 0;
  for (let i = 0; i < len; i += 1) {
    advance();
  }
  idx = 0;
  simFrame = 0;
}

function projectPoint(pointIndex: number, yaw: number): ScreenPoint {
  const px = xs[pointIndex];
  const py = ys[pointIndex];
  const pz = zs[pointIndex] - CZ;
  const ca = Math.cos(yaw);
  const sa = Math.sin(yaw);
  const cb = Math.cos(pitch);
  const sb = Math.sin(pitch);
  const rx = px * ca - py * sa;
  const ry = px * sa + py * ca;
  const ry2 = ry * cb - pz * sb;
  const rz2 = ry * sb + pz * cb;
  const scaleP = PERSPECTIVE / (PERSPECTIVE + ry2);

  return {
    x: CX + rx * S * scaleP,
    y: CY - rz2 * S * scaleP,
  };
}

function speedRange(): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < len; i += 1) {
    const value = sp[i];
    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }

  return { min, max };
}

function bucketForSpeed(speed: number, min: number, max: number): number {
  const denom = max - min;
  const normalized = denom > 0 ? (speed - min) / denom : 0;
  const shaped = Math.pow(clamp01(normalized), 0.85);
  return Math.min(NB - 1, Math.floor(shaped * NB));
}

function drawBackground(activeCtx: CanvasRenderingContext2D): void {
  const gradient = activeCtx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.3);
  gradient.addColorStop(0, '#070a18');
  gradient.addColorStop(1, '#02030a');
  activeCtx.fillStyle = gradient;
  activeCtx.fillRect(0, 0, SIZE, SIZE);
}

function drawHead(activeCtx: CanvasRenderingContext2D, head: ScreenPoint): void {
  activeCtx.globalCompositeOperation = 'lighter';
  activeCtx.fillStyle = 'rgba(255,210,140,0.25)';
  activeCtx.beginPath();
  activeCtx.arc(head.x, head.y, 14, 0, Math.PI * 2);
  activeCtx.fill();

  activeCtx.fillStyle = 'rgba(255,235,180,0.9)';
  activeCtx.beginPath();
  activeCtx.arc(head.x, head.y, 6.4, 0, Math.PI * 2);
  activeCtx.fill();
}

export function renderFrame(n: number): void {
  const activeCtx = ctx;
  if (!activeCtx) {
    return;
  }

  if (n > simFrame) {
    const stepsToAdvance = (n - simFrame) * stepsPF;
    for (let i = 0; i < stepsToAdvance; i += 1) {
      advance();
    }
    simFrame = n;
  }

  const yaw = baseYaw + spinPerFrame * n;
  const paths = Array.from({ length: NB }, () => new Path2D());
  const { min, max } = speedRange();
  let previous: ScreenPoint | null = null;
  let head: ScreenPoint | null = null;

  for (let j = 0; j < len; j += 1) {
    const pointIndex = (idx + j) % len;
    const projected = projectPoint(pointIndex, yaw);
    if (previous) {
      const bucket = bucketForSpeed(sp[pointIndex], min, max);
      const path = paths[bucket];
      path.moveTo(previous.x, previous.y);
      path.lineTo(projected.x, projected.y);
    }
    previous = projected;
    head = projected;
  }

  drawBackground(activeCtx);
  activeCtx.globalCompositeOperation = 'lighter';
  activeCtx.lineCap = 'round';

  for (let b = 0; b < NB; b += 1) {
    const style = bucketStyles[b];
    activeCtx.strokeStyle = `rgba(${style.color},${style.alpha})`;
    activeCtx.lineWidth = style.width;
    activeCtx.stroke(paths[b]);
  }

  if (head) {
    drawHead(activeCtx, head);
  }

  activeCtx.globalCompositeOperation = 'source-over';
}

function installPointerHandlers(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return;
    }

    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    baseYaw += dx * 0.006;
    pitch = clamp(pitch + dy * 0.006, MIN_PITCH, MAX_PITCH);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  });

  const endDrag = (event: PointerEvent): void => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}

function installLorenzOverlays(): HTMLDivElement {
  stage.style.position = 'relative';

  const label = document.createElement('div');
  label.className = 'lorenz-overlay-label';

  const legend = document.createElement('div');
  legend.className = 'lorenz-legend';

  const legendBar = document.createElement('div');
  legendBar.className = 'lorenz-legend-bar';

  const legendText = document.createElement('div');
  legendText.className = 'lorenz-legend-text';
  legendText.innerHTML = '<span>slow</span><span>fast</span>';

  legend.append(legendBar, legendText);
  stage.append(label, legend);

  return label;
}

function installLorenzStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .lorenz-overlay-label {
      position: absolute;
      top: clamp(10px, 2.4vw, 18px);
      left: clamp(10px, 2.4vw, 18px);
      z-index: 2;
      pointer-events: none;
      padding: 6px 8px;
      border: 1px solid rgba(185, 210, 255, 0.18);
      border-radius: 6px;
      background: rgba(4, 7, 18, 0.58);
      color: rgba(235, 243, 255, 0.78);
      font-family: var(--font-mono);
      font-size: clamp(10px, 1.8vw, 13px);
      line-height: 1.2;
      backdrop-filter: blur(8px);
    }

    .lorenz-legend {
      position: absolute;
      left: clamp(10px, 2.4vw, 18px);
      bottom: clamp(10px, 2.4vw, 18px);
      z-index: 2;
      width: min(180px, 35%);
      pointer-events: none;
    }

    .lorenz-legend-bar {
      height: 7px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgb(25, 55, 150), rgb(50, 130, 235), rgb(150, 210, 250), rgb(255, 250, 235), rgb(255, 185, 80), rgb(255, 140, 30));
      box-shadow: 0 0 16px rgba(100, 170, 255, 0.22);
    }

    .lorenz-legend-text {
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
      color: rgba(235, 243, 255, 0.6);
      font-family: var(--font-mono);
      font-size: clamp(9px, 1.55vw, 11px);
      line-height: 1;
    }
  `;
  document.head.append(style);
}

installLorenzStyles();
const overlayLabel = installLorenzOverlays();
updateOverlayLabel();

let playPauseButton = createButton(controlsBar, {
  label: t('pause'),
  iconClass: 'ti-player-pause',
  onClick: () => {
    running = !running;
    playPauseButton.setLabel(t(running ? 'pause' : 'play'));
    playPauseButton.setIconClass(running ? 'ti-player-pause' : 'ti-player-play');
  },
});

const resetButton = createButton(controlsBar, {
  label: t('reset'),
  iconClass: 'ti-refresh',
  onClick: () => {
    build();
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Trail',
  min: 2000,
  max: 14000,
  step: 500,
  value: len,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    len = Math.round(value);
    build();
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Speed',
  min: 2,
  max: 20,
  step: 1,
  value: stepsPF,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    stepsPF = Math.round(value);
  },
});

createSlider(controlsBar, {
  label: 'Spin',
  min: 0,
  max: 1,
  step: 0.01,
  value: DEFAULT_SPIN_VALUE,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    spinPerFrame = value * 0.01;
  },
});

createSlider(controlsBar, {
  label: 'ρ',
  min: 14,
  max: 45,
  step: 0.5,
  value: rho,
  format: (v) => v.toFixed(1),
  onInput: (value) => {
    rho = value;
    updateOverlayLabel();
    build();
    frame = 0;
  },
});

onLocaleChange(() => {
  playPauseButton.setLabel(t(running ? 'pause' : 'play'));
  resetButton.setLabel(t('reset'));
});

createSeedUI(seedSlot, {
  initialSeed: seed,
  onSeedChange: (s) => {
    seed = s;
    build();
    frame = 0;
  },
});

createPngButton({
  parent: exportSlot,
  getCanvas: () => {
    if (!canvasElement) {
      throw new Error('Canvas is not ready for PNG export');
    }
    return canvasElement;
  },
  getFilename: () => `aleatory_lorenz-attractor_${seed}.png`,
});

createRecordButton({
  parent: exportSlot,
  getSourceCanvas: () => {
    if (!canvasElement) {
      throw new Error('Canvas is not ready for video export');
    }
    return canvasElement;
  },
  getFilename: () => `aleatory_lorenz-attractor_${seed}.webm`,
});

new p5((p) => {
  p.setup = () => {
    const c = p.createCanvas(SIZE, SIZE);
    c.parent(stage);
    p.pixelDensity(1);
    const canvas = c.elt;
    canvasElement = canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    ctx = p.drawingContext as CanvasRenderingContext2D;
    installPointerHandlers(canvas);
    build();
  };

  p.draw = () => {
    if (running && !dragging) {
      frame += 1;
    }
    renderFrame(frame);
  };
});
