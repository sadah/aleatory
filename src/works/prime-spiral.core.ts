import { makeRng } from '../lib/rng';
import {
  makeRamp,
  rampGradientCss,
  resolveChrome,
  resolveColor,
  resolveRamp,
  rgbCsv,
  type ColorSpec,
  type RampProfile,
} from '../lib/palette';
import type { WorkCore, WorkCoreOptions } from './core-types';

export interface PrimeSpiralParams {
  nMax: number;
  kLinks: number;
  twistBase: number;
  /**
   * Radians per frame — **not** the 0..1 slider value. The shell's Spin slider
   * maps `value * 0.004` and is capped at 1, so the UI can only reach 0.004. The
   * gallery preview needs TAU/720 = 0.0087266 to close its loop, which is 2.18x
   * that, so the core takes the raw radian value and is not boxed in by a UI range.
   */
  spinPerFrame: number;
  showGrid: boolean;
  /** Accumulated drag rotation. The shell owns the pointer maths. */
  baseRotation: number;
}

export const PRIME_SPIRAL_DEFAULTS: PrimeSpiralParams = {
  nMax: 25000,
  kLinks: 2,
  twistBase: 1,
  spinPerFrame: 0.25 * 0.004,
  showGrid: true,
  baseRotation: 0,
};

export interface PrimeSpiralCore extends WorkCore<PrimeSpiralParams> {
  setSeed(seed: number): void;
  /**
   * The resolved ramp as a `linear-gradient` body, so the shell can paint its
   * legend bar from the same stops the canvas is using.
   */
  getLegendGradientCss(): string;
}

const TAU = Math.PI * 2;
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

/** The arc web between near neighbours. */
const LINK_SPEC: ColorSpec = { side: 'cool', dh: -5.38, l: 0.7595, c: 0.1254 };
/** The polar reference grid. */
const GRID_SPEC: ColorSpec = { side: 'cool', dh: 7.54, l: 0.6638, c: 0.1013 };
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
const RAMP_PROFILE: RampProfile = [
  { x: 0, side: 'cool', dh: 4.34, l: 0.8382, c: 0.0799 },
  { x: 0.28, side: 'cool', dh: 3.66, l: 0.9167, c: 0.0399 },
  { x: 0.5, side: 'hot', dh: 31.58, l: 0.9849, c: 0.0204 },
  { x: 0.7, side: 'hot', dh: 28.6, l: 0.9362, c: 0.077 },
  { x: 0.86, side: 'hot', dh: 12.01, l: 0.8446, c: 0.1265 },
  { x: 1, side: 'hot', dh: -10.59, l: 0.7539, c: 0.1621 },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createPrimeSpiralCore(
  ctx: CanvasRenderingContext2D,
  opts: WorkCoreOptions<PrimeSpiralParams>,
): PrimeSpiralCore {
  const size = opts.size;
  const cx = size / 2;
  const cy = size / 2;
  const R = 0.44 * size;

  /**
   * There is no `ctx.scale` here — star positions are pre-multiplied by `R`, so
   * the field scales with the canvas while radii and line widths are consumed as
   * raw device pixels. Left alone they would balloon relative to a smaller field
   * and the spiral would read as a blob, so they scale too, with floors so a
   * thumbnail does not lose them to sub-pixel widths. At size 1080 `k` is 1 and
   * every value below is exactly what the piece shipped with.
   */
  const k = size / 1080;
  const linkWidth = Math.max(0.5, 1.3 * k);
  const gridWidth = Math.max(0.5, 1.1 * k);

  let params = { ...PRIME_SPIRAL_DEFAULTS, ...opts.params };
  let seed = opts.seed;

  let starStyles: StarStyle[] = [];
  let linkStroke = '';
  let gridStroke = '';
  let groundInner = '';
  let groundOuter = '';

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

  let twistEps = 0;
  let angle0 = 0;
  let revRate = 1;

  /**
   * Geometry is fixed per build, so the star and link paths only change while the
   * reveal front K is moving. Cached on K, they cost nothing once it reaches P.
   */
  let cachedK = -1;
  let edgePath: Path2D | null = null;
  let glowPaths: Path2D[] = [];
  let glowCounts = new Int32Array(NC);
  let corePaths: Path2D[] = [];
  let coreCounts = new Int32Array(NC * NT);

  /**
   * The trailing `cachedK = -1` is load-bearing: `coreRadius` and `glowRadius` are
   * baked into Path2D geometry, which normally only rebuilds while the reveal
   * front moves. Without invalidating it, a palette swap on a settled field would
   * leave the stars their old colour indefinitely.
   */
  function refreshPalette(): void {
    const ramp = makeRamp(RAMP_PROFILE);
    starStyles = Array.from({ length: NC }, (_, c): StarStyle => {
      const ratio = c / (NC - 1);
      const [r, g, b] = ramp(ratio);
      return {
        coreRgb: `${r},${g},${b}`,
        coreAlpha: 0.88 + 0.12 * ratio,
        coreRadius: Math.max(0.7, (2.1 + 1 * ratio) * k),
        glowFill: `rgba(${r},${g},${b},${(0.075 + 0.075 * ratio).toFixed(3)})`,
        glowRadius: Math.max(1.4, (5 + 3 * ratio) * k),
      };
    });

    linkStroke = `rgba(${rgbCsv(resolveColor(LINK_SPEC))},0.22)`;
    gridStroke = `rgba(${rgbCsv(resolveColor(GRID_SPEC))},0.13)`;

    const chrome = resolveChrome();
    groundInner = `rgb(${rgbCsv(chrome.ground[3])})`;
    groundOuter = `rgb(${rgbCsv(chrome.ground[1])})`;

    cachedK = -1;
  }

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
  if (params.kLinks <= 0 || P === 0) {
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
  const bestD = new Float64Array(params.kLinks);
  const bestJ = new Int32Array(params.kLinks);
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
          if (d > cap2 || (found === params.kLinks && d >= bestD[params.kLinks - 1])) {
            continue;
          }

          let pos = Math.min(found, params.kLinks - 1);
          while (pos > 0 && bestD[pos - 1] > d) {
            bestD[pos] = bestD[pos - 1];
            bestJ[pos] = bestJ[pos - 1];
            pos -= 1;
          }
          bestD[pos] = d;
          bestJ[pos] = j;
          if (found < params.kLinks) {
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
  const primes = primesFor(params.nMax);
  P = primes.length;

  const rng = makeRng(seed);
  twistEps = (rng() * 2 - 1) * TWIST_SEED_JITTER;
  angle0 = rng() * TAU;

  const theta = params.twistBase + twistEps;
  nx = new Float32Array(P);
  ny = new Float32Array(P);
  twinkleBucket = new Uint8Array(P);
  colorBucket = new Uint8Array(P);

  for (let i = 0; i < P; i += 1) {
    const p = primes[i];
    const r = p / params.nMax;
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
  const gradient = activeCtx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
  gradient.addColorStop(0, groundInner);
  gradient.addColorStop(1, groundOuter);
  activeCtx.fillStyle = gradient;
  activeCtx.fillRect(0, 0, size, size);
}

function drawGrid(activeCtx: CanvasRenderingContext2D): void {
  activeCtx.save();
  activeCtx.translate(cx, cy);
  activeCtx.strokeStyle = gridStroke;
  activeCtx.lineWidth = gridWidth;

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

function getStatusText(n: number): string {
  const theta = (params.twistBase + twistEps).toFixed(4);
  const K = P === 0 ? 0 : Math.min(P, Math.floor(n * revRate));
  return `θ=${theta}  n≤${params.nMax.toLocaleString('en-US')}  ${K.toLocaleString('en-US')} / ${P.toLocaleString('en-US')}`;
}

/**
 * Pure in `n`: the reveal front and the camera are both functions of the frame
 * index alone, so this can be called for any `n` in any order — including
 * backwards, which the Lorenz piece cannot do.
 */
function renderFrame(n: number): void {
  const activeCtx = ctx;

  const K = P === 0 ? 0 : Math.min(P, Math.floor(n * revRate));
  if (K !== cachedK) {
    rebuildPaths(K);
  }

  const angle = angle0 + params.baseRotation + params.spinPerFrame * n;

  drawBackground(activeCtx);
  if (params.showGrid) {
    drawGrid(activeCtx);
  }

  activeCtx.save();
  activeCtx.translate(cx, cy);
  activeCtx.rotate(angle);
  activeCtx.globalCompositeOperation = 'lighter';

  if (edgePath) {
    activeCtx.strokeStyle = linkStroke;
    activeCtx.lineWidth = linkWidth;
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
}


  /**
   * Only the three params that change the geometry force a rebuild. Spin, grid and
   * drag rotation are read per frame, so changing them must not throw away the
   * sieve and the paths.
   */
  function setParams(next: Partial<PrimeSpiralParams>): void {
    const rebuild =
      (next.nMax !== undefined && next.nMax !== params.nMax) ||
      (next.kLinks !== undefined && next.kLinks !== params.kLinks) ||
      (next.twistBase !== undefined && next.twistBase !== params.twistBase);

    params = { ...params, ...next };

    if (rebuild) {
      build();
    }
  }

  function setSeed(nextSeed: number): void {
    seed = nextSeed;
    build();
  }

  function getLegendGradientCss(): string {
    return rampGradientCss(resolveRamp(RAMP_PROFILE));
  }

  function destroy(): void {
    cachedSieveMax = 0;
    cachedPrimes = new Int32Array(0);
    P = 0;
    nx = new Float32Array(0);
    ny = new Float32Array(0);
    twinkleBucket = new Uint8Array(0);
    colorBucket = new Uint8Array(0);
    allocEdges(0);
    edgePath = null;
    glowPaths = [];
    glowCounts = new Int32Array(0);
    corePaths = [];
    coreCounts = new Int32Array(0);
    starStyles = [];
  }

  refreshPalette();
  build();

  return {
    build,
    renderFrame,
    setParams,
    setSeed,
    refreshPalette,
    getStatusText,
    getCycleFrames: () => 720,
    getLegendGradientCss,
    destroy,
  };
}
