import p5 from 'p5';
import { createButton, createSlider, createToggle } from '../lib/controls';
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { buildFrame } from '../lib/frame';
import { createSeedUI, makeRng } from '../lib/seed';
import { onLocaleChange, t } from '../lib/i18n';
import {
  makeRamp,
  onPaletteChange,
  resolveChrome,
  resolveColor,
  rgbCsv,
  type ColorSpec,
  type RampProfile,
} from '../lib/palette';
import { WORKS } from '../works';

const work = WORKS.find((w) => w.slug === 'schotter');
if (!work) {
  throw new Error('Missing work metadata for schotter');
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
const USABLE = SIZE * 0.88;

const COLS = 12;
const DEFAULT_ROWS = 22;
const DEFAULT_DISORDER = 1;
const DEFAULT_FALL = 1;
const DEFAULT_DRIFT = 0.35;
const DEFAULT_TRAIL = 3;
const DEFAULT_SEED = 1;

const FPS = 60;
const BASE_COLLAPSE = 420;
const HOLD = 90;
const BASE_REFORM = 210;
const DEFAULT_CYCLE = BASE_COLLAPSE + HOLD + BASE_REFORM;
const RISE = 45;

const PITCH = 48;
const EDGE = PITCH * 0.86;
const HALF_EDGE = EDGE / 2;
const STROKE_WIDTH = 1.55;
const LATTICE_WIDTH = 1;
const GHOST_STEP = 5;
const DRIFT_RATE = TAU / (FPS * 5.5);
/**
 * Reference speed for the colour ramp. Activity scales with the row's own u²
 * amplitude, so this is set low enough that the whole lower third warms while
 * the front is passing through it — at PITCH * 0.03 only the last row or two
 * ever reached the warm stops, and the travelling band read as a flicker.
 */
const ACT_REF = PITCH * 0.019;

/**
 * Break times are mostly ordered by row, but this fuzz keeps the front granular:
 * it descends as gravel rather than as a mechanical wipe.
 */
const FRONT_FUZZ = 0.25;
const NC = 8;

interface Pose {
  x: number;
  y: number;
  a: number;
}

/**
 * Cool at rest, warm where a square is moving fastest. Lightness and chroma are
 * the ones this piece shipped with, measured in OKLCH; the palette supplies the
 * two hue anchors. See src/lib/palette.ts for why the ramp is split by side
 * rather than interpolated across a single hue axis.
 */
const RAMP_PROFILE: RampProfile = [
  { x: 0, side: 'cool', dh: 1.66, l: 0.8909, c: 0.053 },
  { x: 0.28, side: 'cool', dh: 3.19, l: 0.9535, c: 0.0219 },
  { x: 0.54, side: 'hot', dh: 27.54, l: 0.9746, c: 0.0292 },
  { x: 0.78, side: 'hot', dh: 17.57, l: 0.8782, c: 0.1091 },
  { x: 1, side: 'hot', dh: -5.18, l: 0.7702, c: 0.1564 },
];

/** The reference lattice outline behind the collapse. */
const LATTICE_SPEC: ColorSpec = { side: 'cool', dh: 4.05, l: 0.8469, c: 0.0753 };
/** The trail layers, re-evaluated at earlier frames rather than left on canvas. */
const GHOST_SPEC: ColorSpec = { side: 'cool', dh: 3.82, l: 0.7856, c: 0.0922 };

const squarePath = new Path2D();
squarePath.rect(-HALF_EDGE, -HALF_EDGE, EDGE, EDGE);

let canvasElement: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

let rows = DEFAULT_ROWS;
let disorder = DEFAULT_DISORDER;
let fall = DEFAULT_FALL;
let drift = DEFAULT_DRIFT;
let ghosts = DEFAULT_TRAIL;
let showLattice = false;
let seed = DEFAULT_SEED;
let frame = 0;
let running = true;

let count = 0;
let latticeX = new Float32Array(0);
let latticeY = new Float32Array(0);
let rowU = new Float32Array(0);
let ox = new Float32Array(0);
let oy = new Float32Array(0);
let oa = new Float32Array(0);
let tau0 = new Float32Array(0);
let phx = new Float32Array(0);
let phy = new Float32Array(0);
let pha = new Float32Array(0);
let dfr = new Float32Array(0);

let fieldW = COLS * PITCH;
let fieldH = rows * PITCH;
let scale = USABLE / fieldH;
let originX = CX - (fieldW * scale) / 2;
let originY = CY - (fieldH * scale) / 2;
let overlayText = '';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function smoothstep01(value: number): number {
  const tValue = clamp01(value);
  return tValue * tValue * (3 - 2 * tValue);
}

let strokeStyles: Array<{ rgb: string; alpha: number }> = [];
let latticeStroke = '';
let ghostRgb = '';
let groundInner = '';
let groundOuter = '';

/** Re-resolve every palette-derived colour. Cheap; runs once at init and on swap. */
function rebuildPaletteStyles(): void {
  const ramp = makeRamp(RAMP_PROFILE);
  strokeStyles = Array.from({ length: NC }, (_, c) => {
    const ratio = c / (NC - 1);
    const [r, g, b] = ramp(ratio);
    return {
      rgb: `${r},${g},${b}`,
      alpha: 0.62 + 0.28 * ratio,
    };
  });

  latticeStroke = `rgba(${rgbCsv(resolveColor(LATTICE_SPEC))},0.12)`;
  ghostRgb = rgbCsv(resolveColor(GHOST_SPEC));

  const chrome = resolveChrome();
  groundInner = `rgb(${rgbCsv(chrome.ground[3])})`;
  groundOuter = `rgb(${rgbCsv(chrome.ground[1])})`;
}

rebuildPaletteStyles();
onPaletteChange(rebuildPaletteStyles);

let collapseFrames = BASE_COLLAPSE;
let reformFrames = BASE_REFORM;
let cycleFrames = DEFAULT_CYCLE;

function updateCycle(): void {
  collapseFrames = BASE_COLLAPSE / fall;
  reformFrames = BASE_REFORM / fall;
  cycleFrames = collapseFrames + HOLD + reformFrames;
}

function build(): void {
  count = rows * COLS;
  latticeX = new Float32Array(count);
  latticeY = new Float32Array(count);
  rowU = new Float32Array(count);
  ox = new Float32Array(count);
  oy = new Float32Array(count);
  oa = new Float32Array(count);
  tau0 = new Float32Array(count);
  phx = new Float32Array(count);
  phy = new Float32Array(count);
  pha = new Float32Array(count);
  dfr = new Float32Array(count);

  fieldW = COLS * PITCH;
  fieldH = rows * PITCH;
  scale = Math.min(USABLE / fieldW, USABLE / fieldH);
  originX = CX - (fieldW * scale) / 2;
  originY = CY - (fieldH * scale) / 2;

  const rng = makeRng(seed);
  for (let row = 0; row < rows; row += 1) {
    const u = rows > 1 ? row / (rows - 1) : 0;
    for (let col = 0; col < COLS; col += 1) {
      const i = row * COLS + col;
      latticeX[i] = (col + 0.5) * PITCH;
      latticeY[i] = (row + 0.5) * PITCH;
      rowU[i] = u;

      // Fixed consumption order: final x/y/angle, break jitter, drift phases, drift frequency.
      ox[i] = rng() * 2 - 1;
      oy[i] = rng() * 2 - 1;
      oa[i] = rng() * 2 - 1;
      tau0[i] = rng();
      phx[i] = rng() * TAU;
      phy[i] = rng() * TAU;
      pha[i] = rng() * TAU;
      dfr[i] = 0.7 + rng() * 0.6;
    }
  }
}

function gFor(i: number, n: number): number {
  const phi = ((n % cycleFrames) + cycleFrames) % cycleFrames;
  const tau = rowU[i] * (1 - FRONT_FUZZ) + tau0[i] * FRONT_FUZZ;

  /**
   * Break times spread over the phase minus RISE, not the whole phase, so even
   * the last square to go finishes its ramp before the phase ends. Spreading
   * over the full phase leaves the bottom rows mid-ramp when the branch flips,
   * and they snap — once into the hold, and again across the loop seam.
   */
  if (phi < collapseFrames) {
    return smoothstep01((phi - tau * Math.max(1, collapseFrames - RISE)) / RISE);
  }
  if (phi < collapseFrames + HOLD) {
    return 1;
  }

  return 1 - smoothstep01((phi - collapseFrames - HOLD - tau * Math.max(1, reformFrames - RISE)) / RISE);
}

function poseAt(i: number, n: number): Pose {
  const g = gFor(i, n);
  const u = rowU[i];
  /**
   * Nees' rowProgress² amplitude envelope is left untouched. The animation only
   * changes when a square leaves its site, so the original vertical gradient
   * remains the organising force.
   */
  const amp = u * u * disorder;
  const maxOffset = amp * PITCH * 0.45;
  const maxRot = amp * Math.PI * 0.42;
  const wave = n * DRIFT_RATE * dfr[i];
  const driftX = drift * maxOffset * Math.sin(wave + phx[i]);
  const driftY = drift * maxOffset * Math.sin(wave + phy[i]);
  const driftA = drift * maxRot * Math.sin(wave + pha[i]);

  return {
    x: latticeX[i] + (ox[i] * maxOffset + driftX) * g,
    y: latticeY[i] + (oy[i] * maxOffset + driftY) * g,
    a: (oa[i] * maxRot + driftA) * g,
  };
}

function colorBucketFor(i: number, n: number, pose: Pose): number {
  /**
   * Colour follows instantaneous activity, not row position or accumulated
   * disorder, so the collapse front appears only where squares are moving now.
   */
  const prev = poseAt(i, n > 0 ? n - 1 : 0);
  const activity = Math.hypot(pose.x - prev.x, pose.y - prev.y) + Math.abs(pose.a - prev.a) * HALF_EDGE;
  const normalized = clamp01(activity / ACT_REF);
  return Math.min(NC - 1, Math.floor(normalized * NC));
}

function addSquare(path: Path2D, pose: Pose): void {
  path.addPath(squarePath, new DOMMatrix().translateSelf(pose.x, pose.y).rotateSelf((pose.a * 180) / Math.PI));
}

function drawBackground(activeCtx: CanvasRenderingContext2D): void {
  const gradient = activeCtx.createRadialGradient(CX, CY, 0, CX, CY, SIZE * 0.58);
  gradient.addColorStop(0, groundInner);
  gradient.addColorStop(1, groundOuter);
  activeCtx.fillStyle = gradient;
  activeCtx.fillRect(0, 0, SIZE, SIZE);
}

function drawLattice(activeCtx: CanvasRenderingContext2D): void {
  const path = new Path2D();
  for (let i = 0; i < count; i += 1) {
    addSquare(path, { x: latticeX[i], y: latticeY[i], a: 0 });
  }

  activeCtx.strokeStyle = latticeStroke;
  activeCtx.lineWidth = LATTICE_WIDTH / scale;
  activeCtx.stroke(path);
}

function drawGhostLayer(activeCtx: CanvasRenderingContext2D, n: number, k: number): void {
  const past = n - k * GHOST_STEP;
  if (past < 0) {
    return;
  }

  const path = new Path2D();
  for (let i = 0; i < count; i += 1) {
    addSquare(path, poseAt(i, past));
  }

  const tValue = 1 - k / (ghosts + 1);
  const alpha = 0.12 * tValue * tValue;
  activeCtx.strokeStyle = `rgba(${ghostRgb},${alpha.toFixed(3)})`;
  activeCtx.lineWidth = STROKE_WIDTH / scale;
  activeCtx.stroke(path);
}

function drawCurrent(activeCtx: CanvasRenderingContext2D, n: number): void {
  const paths = Array.from({ length: NC }, () => new Path2D());
  const counts = new Uint16Array(NC);

  for (let i = 0; i < count; i += 1) {
    const pose = poseAt(i, n);
    const bucket = colorBucketFor(i, n, pose);
    addSquare(paths[bucket], pose);
    counts[bucket] += 1;
  }

  activeCtx.lineWidth = STROKE_WIDTH / scale;
  for (let c = 0; c < NC; c += 1) {
    if (counts[c] === 0) {
      continue;
    }

    const style = strokeStyles[c];
    activeCtx.strokeStyle = `rgba(${style.rgb},${style.alpha.toFixed(3)})`;
    activeCtx.stroke(paths[c]);
  }
}

function updateOverlayLabel(n: number): void {
  const phi = ((n % cycleFrames) + cycleFrames) % cycleFrames;
  const next = `${rows}x${COLS}  D=${disorder.toFixed(2)}  phi ${(phi / cycleFrames).toFixed(2)}`;

  if (next !== overlayText) {
    overlayText = next;
    overlayLabel.textContent = next;
  }
}

/**
 * Pure in `n`: every square pose, every ghost layer, and the colour activity
 * comparison are analytic evaluations of the frame index and seed-built arrays.
 * No pixels or integration state are carried between calls.
 */
export function renderFrame(n: number): void {
  const activeCtx = ctx;
  if (!activeCtx) {
    return;
  }

  drawBackground(activeCtx);

  activeCtx.save();
  activeCtx.translate(originX, originY);
  activeCtx.scale(scale, scale);

  if (showLattice) {
    drawLattice(activeCtx);
  }

  activeCtx.globalCompositeOperation = 'lighter';
  for (let k = ghosts; k >= 1; k -= 1) {
    drawGhostLayer(activeCtx, n, k);
  }
  drawCurrent(activeCtx, n);

  activeCtx.restore();
  activeCtx.globalCompositeOperation = 'source-over';
  updateOverlayLabel(n);
}

function installOverlay(): HTMLDivElement {
  stage.style.position = 'relative';

  const label = document.createElement('div');
  label.className = 'schotter-overlay-label';
  stage.append(label);

  return label;
}

function installStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .schotter-overlay-label {
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
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Disorder',
  min: 0,
  max: 3,
  step: 0.01,
  value: disorder,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    disorder = value;
  },
});

createSlider(controlsBar, {
  label: 'Rows',
  min: 5,
  max: 40,
  step: 1,
  value: rows,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    rows = Math.round(value);
    build();
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Fall',
  min: 0.2,
  max: 2,
  step: 0.05,
  value: fall,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    fall = value;
    updateCycle();
  },
});

createSlider(controlsBar, {
  label: 'Drift',
  min: 0,
  max: 1,
  step: 0.01,
  value: drift,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    drift = value;
  },
});

createSlider(controlsBar, {
  label: 'Trail',
  min: 0,
  max: 6,
  step: 1,
  value: ghosts,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    ghosts = Math.round(value);
  },
});

createToggle(controlsBar, {
  label: 'Lattice',
  checked: showLattice,
  onChange: (checked) => {
    showLattice = checked;
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
  getFilename: () => `aleatory_schotter_${seed}.png`,
});

createRecordButton({
  parent: exportSlot,
  getSourceCanvas: () => {
    if (!canvasElement) {
      throw new Error('Canvas is not ready for video export');
    }
    return canvasElement;
  },
  getFilename: () => `aleatory_schotter_${seed}.webm`,
  durationMs: (DEFAULT_CYCLE / FPS) * 1000,
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
    build();
  };

  p.draw = () => {
    if (running) {
      frame += 1;
    }
    renderFrame(frame);
  };
});
