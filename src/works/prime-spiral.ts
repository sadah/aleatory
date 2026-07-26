import p5 from 'p5';
import { createButton, createSlider, createToggle } from '../lib/controls';
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { buildFrame } from '../lib/frame';
import { createSeedUI, makeRng } from '../lib/seed';
import { onLocaleChange, t } from '../lib/i18n';
import { WORKS } from '../works';

const work = WORKS.find((w) => w.slug === 'prime-spiral');
if (!work) {
  throw new Error('Missing work metadata for prime-spiral');
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app root');
}

const { stage, controlsBar, seedSlot, exportSlot } = buildFrame(app, work);

const TAU = Math.PI * 2;
const SIZE = 1080;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 0.44 * SIZE;

const DEFAULT_NMAX = 25000;
const DEFAULT_LINKS = 2;
const DEFAULT_TWIST = 1;
const DEFAULT_SPIN_VALUE = 0.25;
const DEFAULT_SEED = 1;

/**
 * The seed nudges the twist by less than one slider notch (the step is 0.005),
 * so the readout stays honest while each seed still lands on a different
 * rational approximation of 2π — i.e. a different ray structure.
 */
const TWIST_SEED_JITTER = 0.0025;
const LINK_CAP = 0.085;
const BOW = 0.18;
const REVEAL_SECONDS = 11;
const FPS = 60;

/** Twinkle phase buckets — keeps scintillation to NT fills instead of one per star. */
const NT = 4;
const TWINKLE_RATE = TAU / (4 * FPS);
const TWINKLE_DEPTH = 0.22;

/**
 * Star colour comes from the prime gap, normalised by ln(p) — the Cramér "merit"
 * of the gap. Merit is scale-free, so moving the Primes slider does not shift the
 * whole field's colour the way a raw gap would. Typical merit is ~1; the thin
 * tail above 2 is what puts a few hot pixels in an otherwise cool field.
 */
const NC = 12;
const MERIT_MIN = 0.15;
const MERIT_MAX = 3.2;
/** Tuned against the measured merit distribution: ~86% of stars stay cool, ~2% go hot. */
const MERIT_GAMMA = 1.7;

const LINK_STROKE = 'rgba(120,180,255,0.22)';
const LINK_WIDTH = 1.3;
const GRID_STROKE = 'rgba(120,145,210,0.13)';
const GRID_WIDTH = 1.1;
const GRID_RINGS = [0.25, 0.5, 0.75, 1];
const GRID_SPOKES = 12;

interface StarStyle {
  coreRgb: string;
  coreAlpha: number;
  coreRadius: number;
  glowFill: string;
  glowRadius: number;
}

/**
 * Tight pairs stay cool blue-white — the colour the whole field used to be — and
 * only the rare wide gaps warm up. Restraint over saturation: a low-chroma field
 * with a handful of hot stars reads as luminous.
 */
const rampStops: Array<{ x: number; rgb: [number, number, number] }> = [
  { x: 0, rgb: [176, 202, 255] },
  { x: 0.28, rgb: [214, 228, 255] },
  { x: 0.5, rgb: [255, 250, 235] },
  { x: 0.7, rgb: [255, 232, 175] },
  { x: 0.86, rgb: [255, 190, 105] },
  { x: 1, rgb: [255, 140, 70] },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ramp(value: number): [number, number, number] {
  const v = clamp01(value);

  for (let i = 0; i < rampStops.length - 1; i += 1) {
    const a = rampStops[i];
    const b = rampStops[i + 1];
    if (v >= a.x && v <= b.x) {
      const localT = (v - a.x) / (b.x - a.x);
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * localT),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * localT),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * localT),
      ];
    }
  }

  return rampStops[rampStops.length - 1].rgb;
}

const starStyles = Array.from({ length: NC }, (_, c): StarStyle => {
  const ratio = c / (NC - 1);
  const [r, g, b] = ramp(ratio);
  return {
    coreRgb: `${r},${g},${b}`,
    coreAlpha: 0.88 + 0.12 * ratio,
    coreRadius: 2.1 + 1 * ratio,
    glowFill: `rgba(${r},${g},${b},${(0.075 + 0.075 * ratio).toFixed(3)})`,
    glowRadius: 5 + 3 * ratio,
  };
});

let canvasElement: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

let cachedSieveMax = 0;
let cachedPrimes = new Int32Array(0);

let P = 0;
let nx = new Float32Array(0);
let ny = new Float32Array(0);
let twinkleBucket = new Uint8Array(0);
let colorBucket = new Uint8Array(0);

let EC = 0;
let eHi = new Int32Array(0);
let eax = new Float32Array(0);
let eay = new Float32Array(0);
let ebx = new Float32Array(0);
let eby = new Float32Array(0);
let ecx = new Float32Array(0);
let ecy = new Float32Array(0);

let nMax = DEFAULT_NMAX;
let kLinks = DEFAULT_LINKS;
let twistBase = DEFAULT_TWIST;
let twistEps = 0;
let angle0 = 0;
let revRate = 1;
let spinPerFrame = DEFAULT_SPIN_VALUE * 0.004;
let baseRotation = 0;
let showGrid = true;
let seed = DEFAULT_SEED;
let frame = 0;
let running = true;
let dragging = false;
let lastPointerX = 0;

/**
 * Geometry is fixed per build, so the star and link paths only change while the
 * reveal front K is moving. Cached on K, they cost nothing once it reaches P.
 */
let cachedK = -1;
let edgePath: Path2D | null = null;
/** One glow path per colour bucket; cores split again by twinkle phase. */
let glowPaths: Path2D[] = [];
let glowCounts = new Int32Array(NC);
let corePaths: Path2D[] = [];
let coreCounts = new Int32Array(NC * NT);
let overlayText = '';

function primesFor(limit: number): Int32Array {
  if (limit === cachedSieveMax) {
    return cachedPrimes;
  }

  const composite = new Uint8Array(limit + 1);
  const found: number[] = [];

  for (let i = 2; i <= limit; i += 1) {
    if (!composite[i]) {
      found.push(i);
      for (let j = i * i; j <= limit; j += i) {
        composite[j] = 1;
      }
    }
  }

  cachedSieveMax = limit;
  cachedPrimes = Int32Array.from(found);
  return cachedPrimes;
}

function allocEdges(count: number): void {
  EC = count;
  eHi = new Int32Array(count);
  eax = new Float32Array(count);
  eay = new Float32Array(count);
  ebx = new Float32Array(count);
  eby = new Float32Array(count);
  ecx = new Float32Array(count);
  ecy = new Float32Array(count);
}

function buildLinks(): void {
  if (kLinks <= 0 || P === 0) {
    allocEdges(0);
    return;
  }

  const cell = LINK_CAP;
  const cap2 = LINK_CAP * LINK_CAP;
  const cols = Math.ceil(2 / cell) + 1;
  const buckets: Array<number[] | undefined> = new Array(cols * cols);

  for (let i = 0; i < P; i += 1) {
    const key = (((ny[i] + 1) / cell) | 0) * cols + (((nx[i] + 1) / cell) | 0);
    const existing = buckets[key];
    if (existing) {
      existing.push(i);
    } else {
      buckets[key] = [i];
    }
  }

  // k nearest neighbours by insertion into a k-sized sorted window (k <= 3).
  const bestD = new Float64Array(kLinks);
  const bestJ = new Int32Array(kLinks);
  const seen = new Set<number>();
  const pairLo: number[] = [];
  const pairHi: number[] = [];

  for (let i = 0; i < P; i += 1) {
    const gx = ((nx[i] + 1) / cell) | 0;
    const gy = ((ny[i] + 1) / cell) | 0;
    let found = 0;

    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dw = -1; dw <= 1; dw += 1) {
        const gridX = gx + dz;
        const gridY = gy + dw;
        if (gridX < 0 || gridY < 0 || gridX >= cols || gridY >= cols) {
          continue;
        }

        const bucket = buckets[gridY * cols + gridX];
        if (!bucket) {
          continue;
        }

        for (let q = 0; q < bucket.length; q += 1) {
          const j = bucket[q];
          if (j === i) {
            continue;
          }

          const ddx = nx[i] - nx[j];
          const ddy = ny[i] - ny[j];
          const d = ddx * ddx + ddy * ddy;
          if (d > cap2 || (found === kLinks && d >= bestD[kLinks - 1])) {
            continue;
          }

          let pos = Math.min(found, kLinks - 1);
          while (pos > 0 && bestD[pos - 1] > d) {
            bestD[pos] = bestD[pos - 1];
            bestJ[pos] = bestJ[pos - 1];
            pos -= 1;
          }
          bestD[pos] = d;
          bestJ[pos] = j;
          if (found < kLinks) {
            found += 1;
          }
        }
      }
    }

    for (let s = 0; s < found; s += 1) {
      const j = bestJ[s];
      const lo = i < j ? i : j;
      const hi = i < j ? j : i;
      const key = lo * P + hi;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairLo.push(lo);
      pairHi.push(hi);
    }
  }

  // Sorting by the higher endpoint makes the reveal an O(revealed) early exit.
  const order = new Int32Array(pairLo.length);
  for (let e = 0; e < order.length; e += 1) {
    order[e] = e;
  }
  order.sort((u, v) => pairHi[u] - pairHi[v]);

  allocEdges(order.length);

  for (let o = 0; o < EC; o += 1) {
    const e = order[o];
    const a = pairLo[e];
    const b = pairHi[e];
    const ax = nx[a];
    const ay = ny[a];
    const bx = nx[b];
    const by = ny[b];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy) || 1e-6;
    const bow = BOW * length;

    eax[o] = ax;
    eay[o] = ay;
    ebx[o] = bx;
    eby[o] = by;
    ecx[o] = (ax + bx) / 2 - (dy / length) * bow;
    ecy[o] = (ay + by) / 2 + (dx / length) * bow;
    eHi[o] = b;
  }
}

function build(): void {
  const primes = primesFor(nMax);
  P = primes.length;

  const rng = makeRng(seed);
  twistEps = (rng() * 2 - 1) * TWIST_SEED_JITTER;
  angle0 = rng() * TAU;

  const theta = twistBase + twistEps;
  nx = new Float32Array(P);
  ny = new Float32Array(P);
  twinkleBucket = new Uint8Array(P);
  colorBucket = new Uint8Array(P);

  for (let i = 0; i < P; i += 1) {
    const p = primes[i];
    const r = p / nMax;
    const a = p * theta;
    nx[i] = r * Math.cos(a);
    ny[i] = r * Math.sin(a);
    twinkleBucket[i] = Math.min(NT - 1, Math.floor(rng() * NT));

    const merit = (p - (i > 0 ? primes[i - 1] : 1)) / Math.log(p);
    const shaped = Math.pow(clamp01((merit - MERIT_MIN) / (MERIT_MAX - MERIT_MIN)), MERIT_GAMMA);
    colorBucket[i] = Math.min(NC - 1, Math.floor(shaped * NC));
  }

  buildLinks();
  revRate = P / (REVEAL_SECONDS * FPS);
  cachedK = -1;
}

function rebuildPaths(K: number): void {
  const edges = new Path2D();
  for (let e = 0; e < EC && eHi[e] < K; e += 1) {
    edges.moveTo(eax[e] * R, eay[e] * R);
    edges.quadraticCurveTo(ecx[e] * R, ecy[e] * R, ebx[e] * R, eby[e] * R);
  }

  const glows = Array.from({ length: NC }, () => new Path2D());
  const cores = Array.from({ length: NC * NT }, () => new Path2D());
  const glowN = new Int32Array(NC);
  const coreN = new Int32Array(NC * NT);

  for (let i = 0; i < K; i += 1) {
    const x = nx[i] * R;
    const y = ny[i] * R;
    const c = colorBucket[i];
    const style = starStyles[c];

    glows[c].moveTo(x + style.glowRadius, y);
    glows[c].arc(x, y, style.glowRadius, 0, TAU);
    glowN[c] += 1;

    const slot = c * NT + twinkleBucket[i];
    cores[slot].moveTo(x + style.coreRadius, y);
    cores[slot].arc(x, y, style.coreRadius, 0, TAU);
    coreN[slot] += 1;
  }

  edgePath = edges;
  glowPaths = glows;
  glowCounts = glowN;
  corePaths = cores;
  coreCounts = coreN;
  cachedK = K;
}

function drawBackground(activeCtx: CanvasRenderingContext2D): void {
  const gradient = activeCtx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.25);
  gradient.addColorStop(0, '#070918');
  gradient.addColorStop(1, '#03040b');
  activeCtx.fillStyle = gradient;
  activeCtx.fillRect(0, 0, SIZE, SIZE);
}

function drawGrid(activeCtx: CanvasRenderingContext2D): void {
  activeCtx.save();
  activeCtx.translate(CX, CY);
  activeCtx.strokeStyle = GRID_STROKE;
  activeCtx.lineWidth = GRID_WIDTH;

  for (const f of GRID_RINGS) {
    activeCtx.beginPath();
    activeCtx.arc(0, 0, R * f, 0, TAU);
    activeCtx.stroke();
  }

  for (let s = 0; s < GRID_SPOKES; s += 1) {
    const a = (s * TAU) / GRID_SPOKES;
    activeCtx.beginPath();
    activeCtx.moveTo(0, 0);
    activeCtx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    activeCtx.stroke();
  }

  activeCtx.restore();
}

function updateOverlayLabel(K: number): void {
  const theta = (twistBase + twistEps).toFixed(4);
  const next = `θ=${theta}  n≤${nMax.toLocaleString('en-US')}  ${K.toLocaleString(
    'en-US',
  )} / ${P.toLocaleString('en-US')}`;

  if (next !== overlayText) {
    overlayText = next;
    overlayLabel.textContent = next;
  }
}

/**
 * Pure in `n`: the reveal front and the camera are both functions of the frame
 * index alone, so this can be called for any `n` in any order — including
 * backwards, which the Lorenz piece cannot do.
 */
export function renderFrame(n: number): void {
  const activeCtx = ctx;
  if (!activeCtx) {
    return;
  }

  const K = P === 0 ? 0 : Math.min(P, Math.floor(n * revRate));
  if (K !== cachedK) {
    rebuildPaths(K);
  }

  const angle = angle0 + baseRotation + spinPerFrame * n;

  drawBackground(activeCtx);
  if (showGrid) {
    drawGrid(activeCtx);
  }

  activeCtx.save();
  activeCtx.translate(CX, CY);
  activeCtx.rotate(angle);
  activeCtx.globalCompositeOperation = 'lighter';

  if (edgePath) {
    activeCtx.strokeStyle = LINK_STROKE;
    activeCtx.lineWidth = LINK_WIDTH;
    activeCtx.stroke(edgePath);
  }

  for (let c = 0; c < glowPaths.length; c += 1) {
    if (glowCounts[c] === 0) {
      continue;
    }
    activeCtx.fillStyle = starStyles[c].glowFill;
    activeCtx.fill(glowPaths[c]);
  }

  const twinkle: number[] = [];
  for (let tw = 0; tw < NT; tw += 1) {
    const wave = 0.5 + 0.5 * Math.sin((tw / NT) * TAU + n * TWINKLE_RATE);
    twinkle.push(1 - TWINKLE_DEPTH + TWINKLE_DEPTH * wave);
  }

  for (let c = 0; c < NC; c += 1) {
    const style = starStyles[c];
    for (let tw = 0; tw < NT; tw += 1) {
      const slot = c * NT + tw;
      if (coreCounts[slot] === 0) {
        continue;
      }
      const alpha = style.coreAlpha * twinkle[tw];
      activeCtx.fillStyle = `rgba(${style.coreRgb},${alpha.toFixed(3)})`;
      activeCtx.fill(corePaths[slot]);
    }
  }

  activeCtx.restore();
  activeCtx.globalCompositeOperation = 'source-over';
  updateOverlayLabel(K);
}

function installPointerHandlers(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastPointerX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) {
      return;
    }

    baseRotation += (event.clientX - lastPointerX) * 0.005;
    lastPointerX = event.clientX;
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

function installOverlay(): HTMLDivElement {
  stage.style.position = 'relative';

  const label = document.createElement('div');
  label.className = 'prime-spiral-overlay-label';

  const legend = document.createElement('div');
  legend.className = 'prime-spiral-legend';

  const bar = document.createElement('div');
  bar.className = 'prime-spiral-legend-bar';
  bar.style.background = `linear-gradient(90deg, ${rampStops
    .map((s) => `rgb(${s.rgb.join(',')}) ${(s.x * 100).toFixed(0)}%`)
    .join(', ')})`;

  const text = document.createElement('div');
  text.className = 'prime-spiral-legend-text';
  text.innerHTML = '<span>tight</span><span>isolated</span>';

  legend.append(bar, text);
  stage.append(label, legend);

  return label;
}

function installStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .prime-spiral-overlay-label {
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
      white-space: nowrap;
      backdrop-filter: blur(8px);
    }

    .prime-spiral-legend {
      position: absolute;
      left: clamp(10px, 2.4vw, 18px);
      bottom: clamp(10px, 2.4vw, 18px);
      z-index: 2;
      width: min(180px, 35%);
      pointer-events: none;
    }

    .prime-spiral-legend-bar {
      height: 7px;
      border-radius: 999px;
      box-shadow: 0 0 16px rgba(255, 200, 130, 0.18);
    }

    .prime-spiral-legend-text {
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

installStyles();
const overlayLabel = installOverlay();

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
  label: 'Primes',
  min: 4000,
  max: 60000,
  step: 1000,
  value: nMax,
  format: (v) => Math.round(v).toLocaleString('en-US'),
  onInput: (value) => {
    nMax = Math.round(value);
    build();
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Links',
  min: 0,
  max: 3,
  step: 1,
  value: kLinks,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    kLinks = Math.round(value);
    build();
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Twist',
  min: 0.9,
  max: 1.1,
  step: 0.005,
  value: twistBase,
  format: (v) => v.toFixed(3),
  onInput: (value) => {
    twistBase = value;
    build();
    frame = 0;
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
    spinPerFrame = value * 0.004;
  },
});

createToggle(controlsBar, {
  label: 'Grid',
  checked: showGrid,
  onChange: (checked) => {
    showGrid = checked;
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
  getFilename: () => `aleatory_prime-spiral_${seed}.png`,
});

createRecordButton({
  parent: exportSlot,
  getSourceCanvas: () => {
    if (!canvasElement) {
      throw new Error('Canvas is not ready for video export');
    }
    return canvasElement;
  },
  getFilename: () => `aleatory_prime-spiral_${seed}.webm`,
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
