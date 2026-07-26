import { makeRng } from '../lib/rng';
import {
  makeRamp,
  resolveChrome,
  resolveColor,
  rgbCsv,
  type ColorSpec,
  type RampProfile,
} from '../lib/palette';
import type { WorkCore, WorkCoreOptions } from './core-types';

export interface SchotterParams {
  rows: number;
  disorder: number;
  fall: number;
  drift: number;
  ghosts: number;
  lattice: boolean;
}

export const SCHOTTER_DEFAULTS: SchotterParams = {
  rows: 22,
  disorder: 1,
  fall: 1,
  drift: 0.35,
  ghosts: 3,
  lattice: false,
};

export interface SchotterCore extends WorkCore<SchotterParams> {
  setSeed(seed: number): void;
}

const TAU = Math.PI * 2;
const COLS = 12;
const FPS = 60;
const BASE_COLLAPSE = 420;
const HOLD = 90;
const BASE_REFORM = 210;
const DEFAULT_CYCLE = BASE_COLLAPSE + HOLD + BASE_REFORM;
const RISE = 45;
const PITCH = 48;
const EDGE = PITCH * 0.86;
const HALF_EDGE = EDGE / 2;
const GHOST_STEP = 5;
const DRIFT_RATE = TAU / (FPS * 5.5);
const ACT_REF = PITCH * 0.019;
const FRONT_FUZZ = 0.25;
const NC = 8;

interface Pose {
  x: number;
  y: number;
  a: number;
}

const RAMP_PROFILE: RampProfile = [
  { x: 0, side: 'cool', dh: 1.66, l: 0.8909, c: 0.053 },
  { x: 0.28, side: 'cool', dh: 3.19, l: 0.9535, c: 0.0219 },
  { x: 0.54, side: 'hot', dh: 27.54, l: 0.9746, c: 0.0292 },
  { x: 0.78, side: 'hot', dh: 17.57, l: 0.8782, c: 0.1091 },
  { x: 1, side: 'hot', dh: -5.18, l: 0.7702, c: 0.1564 },
];

const LATTICE_SPEC: ColorSpec = { side: 'cool', dh: 4.05, l: 0.8469, c: 0.0753 };
const GHOST_SPEC: ColorSpec = { side: 'cool', dh: 3.82, l: 0.7856, c: 0.0922 };

export function createSchotterCore(
  ctx: CanvasRenderingContext2D,
  opts: WorkCoreOptions<SchotterParams>,
): SchotterCore {
  const size = opts.size;
  const cx = size / 2;
  const cy = size / 2;
  const usable = size * 0.88;
  const strokeWidth = Math.max(0.75, 1.55 * size / 1080);
  const latticeWidth = Math.max(0.5, 1.0 * size / 1080);

  let params: SchotterParams = { ...SCHOTTER_DEFAULTS, ...opts.params };
  let seed = opts.seed;
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
  let fieldH = params.rows * PITCH;
  let scale = usable / fieldH;
  let originX = cx - (fieldW * scale) / 2;
  let originY = cy - (fieldH * scale) / 2;
  let collapseFrames = BASE_COLLAPSE;
  let reformFrames = BASE_REFORM;
  let cycleFrames = DEFAULT_CYCLE;
  let strokeStyles: Array<{ rgb: string; alpha: number }> = [];
  let latticeStroke = '';
  let ghostRgb = '';
  let groundInner = '';
  let groundOuter = '';
  let squarePath: Path2D | null = new Path2D();
  squarePath.rect(-HALF_EDGE, -HALF_EDGE, EDGE, EDGE);

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

  function refreshPalette(): void {
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

  function updateCycle(): void {
    collapseFrames = BASE_COLLAPSE / params.fall;
    reformFrames = BASE_REFORM / params.fall;
    cycleFrames = collapseFrames + HOLD + reformFrames;
  }

  function build(): void {
    count = params.rows * COLS;
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
    fieldH = params.rows * PITCH;
    scale = Math.min(usable / fieldW, usable / fieldH);
    originX = cx - (fieldW * scale) / 2;
    originY = cy - (fieldH * scale) / 2;

    const rng = makeRng(seed);
    for (let row = 0; row < params.rows; row += 1) {
      const u = params.rows > 1 ? row / (params.rows - 1) : 0;
      for (let col = 0; col < COLS; col += 1) {
        const i = row * COLS + col;
        latticeX[i] = (col + 0.5) * PITCH;
        latticeY[i] = (row + 0.5) * PITCH;
        rowU[i] = u;
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
    if (phi < collapseFrames) {
      return smoothstep01((phi - tau * Math.max(1, collapseFrames - RISE)) / RISE);
    }
    if (phi < collapseFrames + HOLD) {
      return 1;
    }
    return 1 - smoothstep01(
      (phi - collapseFrames - HOLD - tau * Math.max(1, reformFrames - RISE)) / RISE,
    );
  }

  function poseAt(i: number, n: number): Pose {
    const g = gFor(i, n);
    const u = rowU[i];
    const amp = u * u * params.disorder;
    const maxOffset = amp * PITCH * 0.45;
    const maxRot = amp * Math.PI * 0.42;
    const wave = n * DRIFT_RATE * dfr[i];
    const driftX = params.drift * maxOffset * Math.sin(wave + phx[i]);
    const driftY = params.drift * maxOffset * Math.sin(wave + phy[i]);
    const driftA = params.drift * maxRot * Math.sin(wave + pha[i]);

    return {
      x: latticeX[i] + (ox[i] * maxOffset + driftX) * g,
      y: latticeY[i] + (oy[i] * maxOffset + driftY) * g,
      a: (oa[i] * maxRot + driftA) * g,
    };
  }

  function colorBucketFor(i: number, n: number, pose: Pose): number {
    const prev = poseAt(i, n > 0 ? n - 1 : 0);
    const activity = Math.hypot(pose.x - prev.x, pose.y - prev.y)
      + Math.abs(pose.a - prev.a) * HALF_EDGE;
    const normalized = clamp01(activity / ACT_REF);
    return Math.min(NC - 1, Math.floor(normalized * NC));
  }

  function addSquare(path: Path2D, pose: Pose): void {
    if (!squarePath) {
      return;
    }
    path.addPath(
      squarePath,
      new DOMMatrix().translateSelf(pose.x, pose.y).rotateSelf((pose.a * 180) / Math.PI),
    );
  }

  function drawBackground(): void {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.58);
    gradient.addColorStop(0, groundInner);
    gradient.addColorStop(1, groundOuter);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  function drawLattice(): void {
    const path = new Path2D();
    for (let i = 0; i < count; i += 1) {
      addSquare(path, { x: latticeX[i], y: latticeY[i], a: 0 });
    }
    ctx.strokeStyle = latticeStroke;
    ctx.lineWidth = latticeWidth / scale;
    ctx.stroke(path);
  }

  function drawGhostLayer(n: number, k: number): void {
    const past = n - k * GHOST_STEP;
    if (past < 0) {
      return;
    }
    const path = new Path2D();
    for (let i = 0; i < count; i += 1) {
      addSquare(path, poseAt(i, past));
    }
    const tValue = 1 - k / (params.ghosts + 1);
    const alpha = 0.12 * tValue * tValue;
    ctx.strokeStyle = `rgba(${ghostRgb},${alpha.toFixed(3)})`;
    ctx.lineWidth = strokeWidth / scale;
    ctx.stroke(path);
  }

  function drawCurrent(n: number): void {
    const paths = Array.from({ length: NC }, () => new Path2D());
    const counts = new Uint16Array(NC);
    for (let i = 0; i < count; i += 1) {
      const pose = poseAt(i, n);
      const bucket = colorBucketFor(i, n, pose);
      addSquare(paths[bucket], pose);
      counts[bucket] += 1;
    }
    ctx.lineWidth = strokeWidth / scale;
    for (let c = 0; c < NC; c += 1) {
      if (counts[c] === 0) {
        continue;
      }
      const style = strokeStyles[c];
      ctx.strokeStyle = `rgba(${style.rgb},${style.alpha.toFixed(3)})`;
      ctx.stroke(paths[c]);
    }
  }

  function renderFrame(n: number): void {
    drawBackground();
    ctx.save();
    ctx.translate(originX, originY);
    ctx.scale(scale, scale);
    if (params.lattice) {
      drawLattice();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let k = params.ghosts; k >= 1; k -= 1) {
      drawGhostLayer(n, k);
    }
    drawCurrent(n);
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
  }

  function setParams(next: Partial<SchotterParams>): void {
    const rowsChanged = next.rows !== undefined && next.rows !== params.rows;
    const fallChanged = next.fall !== undefined && next.fall !== params.fall;
    params = { ...params, ...next };
    if (fallChanged) {
      updateCycle();
    }
    if (rowsChanged) {
      build();
    }
  }

  function setSeed(nextSeed: number): void {
    seed = nextSeed;
    build();
  }

  function getStatusText(n: number): string {
    const phi = ((n % cycleFrames) + cycleFrames) % cycleFrames;
    return `${params.rows}x${COLS}  D=${params.disorder.toFixed(2)}  phi ${(phi / cycleFrames).toFixed(2)}`;
  }

  function destroy(): void {
    count = 0;
    latticeX = new Float32Array(0);
    latticeY = new Float32Array(0);
    rowU = new Float32Array(0);
    ox = new Float32Array(0);
    oy = new Float32Array(0);
    oa = new Float32Array(0);
    tau0 = new Float32Array(0);
    phx = new Float32Array(0);
    phy = new Float32Array(0);
    pha = new Float32Array(0);
    dfr = new Float32Array(0);
    strokeStyles = [];
    squarePath = null;
  }

  updateCycle();
  refreshPalette();
  build();

  return {
    build,
    renderFrame,
    setParams,
    setSeed,
    refreshPalette,
    getStatusText,
    getCycleFrames: () => cycleFrames,
    destroy,
  };
}
