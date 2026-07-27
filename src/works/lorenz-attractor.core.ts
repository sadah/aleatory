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

export interface LorenzParams {
  trail: number;
  stepsPerFrame: number;
  spin: number;
  rho: number;
  /** Camera, owned by the shell's drag handlers. */
  yaw: number;
  pitch: number;
}

export const LORENZ_DEFAULTS: LorenzParams = {
  trail: 7000,
  stepsPerFrame: 8,
  spin: 0.3,
  rho: 28,
  yaw: 0,
  pitch: -0.32,
};

export interface LorenzCore extends WorkCore<LorenzParams> {
  setSeed(seed: number): void;
  /** The resolved ramp, so the shell can paint its legend bar. */
  getLegendGradientCss(): string;
}

const SIGMA = 10;
const BETA = 8 / 3;
const DT = 0.005;
const CZ = 27;
const PERSPECTIVE = 150;
const NB = 16;

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

/**
 * Speed as colour: a deep cool start climbing through white-hot to a warm tip.
 * Lightness and chroma are this piece's own, measured in OKLCH from the RGB it
 * used to hardcode; the palette supplies only the two hue anchors.
 */
const RAMP_PROFILE: RampProfile = [
  { x: 0, side: 'cool', dh: 5.54, l: 0.3818, c: 0.1596 },
  { x: 0.3, side: 'cool', dh: -3.21, l: 0.613, c: 0.1763 },
  { x: 0.55, side: 'cool', dh: -21.76, l: 0.8371, c: 0.0833 },
  { x: 0.74, side: 'hot', dh: 31.58, l: 0.9849, c: 0.0204 },
  { x: 0.88, side: 'hot', dh: 14.27, l: 0.8326, c: 0.1435 },
  { x: 1, side: 'hot', dh: -3.58, l: 0.7513, c: 0.175 },
];

/** The two additive discs at the trajectory head — off-ramp, hand-picked. */
const HEAD_HALO: ColorSpec = { side: 'hot', dh: 17.93, l: 0.8874, c: 0.1011 };
const HEAD_CORE: ColorSpec = { side: 'hot', dh: 30.42, l: 0.9431, c: 0.0736 };

export function createLorenzCore(
  ctx: CanvasRenderingContext2D,
  opts: WorkCoreOptions<LorenzParams>,
): LorenzCore {
  const size = opts.size;
  const cx = size / 2;
  const cy = size * 0.52;
  const radius = 0.44 * size;
  const scale = radius / 30;

  /**
   * Projected positions already land in device pixels through `scale`; there is
   * no `ctx.scale`. Stroke widths and head radii are raw device pixels, so they
   * scale separately, with floors that keep the thumbnail legible. At 1080,
   * `k` is exactly 1 and these expressions reproduce the original dimensions.
   */
  const k = size / 1080;
  const headHaloRadius = Math.max(2.5, 14 * k);
  const headCoreRadius = Math.max(1.2, 6.4 * k);

  let params: LorenzParams = { ...LORENZ_DEFAULTS, ...opts.params };
  let seed = opts.seed;
  let bucketStyles: BucketStyle[] = [];
  let headHaloFill = '';
  let headCoreFill = '';
  let groundInner = '';
  let groundOuter = '';
  let xs = new Float32Array(params.trail);
  let ys = new Float32Array(params.trail);
  let zs = new Float32Array(params.trail);
  let speeds = new Float32Array(params.trail);
  let idx = 0;
  let current: Point3 = { x: 0, y: 0, z: 0 };
  let simFrame = 0;

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  function clamp01(value: number): number {
    return clamp(value, 0, 1);
  }

  function deriv(point: Point3): Point3 {
    return {
      x: SIGMA * (point.y - point.x),
      y: point.x * (params.rho - point.z) - point.y,
      z: point.x * point.y - BETA * point.z,
    };
  }

  function addScaled(point: Point3, delta: Point3, amount: number): Point3 {
    return {
      x: point.x + delta.x * amount,
      y: point.y + delta.y * amount,
      z: point.z + delta.z * amount,
    };
  }

  function advance(): void {
    const k1 = deriv(current);
    const k2 = deriv(addScaled(current, k1, DT * 0.5));
    const k3 = deriv(addScaled(current, k2, DT * 0.5));
    const k4 = deriv(addScaled(current, k3, DT));

    current = {
      x: current.x + (DT / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: current.y + (DT / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: current.z + (DT / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
    };

    const speed = deriv(current);
    xs[idx] = current.x;
    ys[idx] = current.y;
    zs[idx] = current.z;
    speeds[idx] = Math.hypot(speed.x, speed.y, speed.z);
    idx = (idx + 1) % params.trail;
  }

  function refreshPalette(): void {
    const ramp = makeRamp(RAMP_PROFILE);
    bucketStyles = Array.from({ length: NB }, (_, bucket): BucketStyle => {
      const ratio = bucket / (NB - 1);
      const [r, g, blue] = ramp(ratio);
      return {
        color: `${r},${g},${blue}`,
        alpha: 0.32 + 0.5 * ratio,
        width: Math.max(0.6, (0.9 + 1.1 * ratio) * k),
      };
    });

    headHaloFill = `rgba(${rgbCsv(resolveColor(HEAD_HALO))},0.25)`;
    headCoreFill = `rgba(${rgbCsv(resolveColor(HEAD_CORE))},0.9)`;

    const chrome = resolveChrome();
    groundInner = `rgb(${rgbCsv(chrome.ground[3])})`;
    groundOuter = `rgb(${rgbCsv(chrome.ground[1])})`;
  }

  function build(): void {
    xs = new Float32Array(params.trail);
    ys = new Float32Array(params.trail);
    zs = new Float32Array(params.trail);
    speeds = new Float32Array(params.trail);

    const rng = makeRng(seed);
    current = {
      x: -7.5 + (rng() - 0.5),
      y: -7.5 + (rng() - 0.5),
      z: 25 + (rng() - 0.5),
    };

    idx = 0;
    for (let i = 0; i < params.trail; i += 1) {
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
    const cb = Math.cos(params.pitch);
    const sb = Math.sin(params.pitch);
    const rx = px * ca - py * sa;
    const ry = px * sa + py * ca;
    const ry2 = ry * cb - pz * sb;
    const rz2 = ry * sb + pz * cb;
    const perspectiveScale = PERSPECTIVE / (PERSPECTIVE + ry2);

    return {
      x: cx + rx * scale * perspectiveScale,
      y: cy - rz2 * scale * perspectiveScale,
    };
  }

  function speedRange(): { min: number; max: number } {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < params.trail; i += 1) {
      const value = speeds[i];
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

  function drawBackground(): void {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.3);
    gradient.addColorStop(0, groundInner);
    gradient.addColorStop(1, groundOuter);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  function drawHead(head: ScreenPoint): void {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = headHaloFill;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headHaloRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = headCoreFill;
    ctx.beginPath();
    ctx.arc(head.x, head.y, headCoreRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Forward-only by design: integration advances from `simFrame` and does not
   * seek backwards. Call `build()` for a deterministic restart at frame zero.
   */
  function renderFrame(n: number): void {
    if (n > simFrame) {
      const stepsToAdvance = (n - simFrame) * params.stepsPerFrame;
      for (let i = 0; i < stepsToAdvance; i += 1) {
        advance();
      }
      simFrame = n;
    }

    const yaw = params.yaw + params.spin * 0.01 * n;
    const paths = Array.from({ length: NB }, () => new Path2D());
    const { min, max } = speedRange();
    let previous: ScreenPoint | null = null;
    let head: ScreenPoint | null = null;

    for (let j = 0; j < params.trail; j += 1) {
      const pointIndex = (idx + j) % params.trail;
      const projected = projectPoint(pointIndex, yaw);
      if (previous) {
        const bucket = bucketForSpeed(speeds[pointIndex], min, max);
        const path = paths[bucket];
        path.moveTo(previous.x, previous.y);
        path.lineTo(projected.x, projected.y);
      }
      previous = projected;
      head = projected;
    }

    drawBackground();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    for (let bucket = 0; bucket < NB; bucket += 1) {
      const style = bucketStyles[bucket];
      ctx.strokeStyle = `rgba(${style.color},${style.alpha})`;
      ctx.lineWidth = style.width;
      ctx.stroke(paths[bucket]);
    }

    if (head) {
      drawHead(head);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  function setParams(next: Partial<LorenzParams>): void {
    const rebuild =
      (next.trail !== undefined && next.trail !== params.trail) ||
      (next.rho !== undefined && next.rho !== params.rho);

    params = { ...params, ...next };

    if (rebuild) {
      build();
    }
  }

  function setSeed(nextSeed: number): void {
    seed = nextSeed;
    build();
  }

  function getStatusText(_n: number): string {
    return `σ=10  ρ=${params.rho.toFixed(1)}  β=8/3`;
  }

  function getLegendGradientCss(): string {
    return rampGradientCss(resolveRamp(RAMP_PROFILE));
  }

  function destroy(): void {
    xs = new Float32Array(0);
    ys = new Float32Array(0);
    zs = new Float32Array(0);
    speeds = new Float32Array(0);
    bucketStyles = [];
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
    getCycleFrames: () => null,
    getLegendGradientCss,
    destroy,
  };
}
