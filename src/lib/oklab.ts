/**
 * sRGB <-> OKLab / OKLCH, dependency-free.
 *
 * OKLab (Björn Ottosson, 2020) is the colour space the palette system reasons
 * in. The reason is specific to this site: a palette swap must rotate *hue*
 * while leaving *lightness* alone, because the works' ramps encode a scalar
 * (speed, prime gap, activity) as a lightness climb from a dim cool ground to a
 * white-hot peak. Rotating hue in sRGB or HSL shifts perceived lightness badly
 * enough to break that reading — a blue and a yellow at the same HSL lightness
 * differ by roughly a factor of three in perceived brightness. OKLab does not
 * have that problem, which is the whole reason it exists.
 */

/** A colour as three 0-255 integer channels. */
export type Rgb = [number, number, number];

export interface Oklch {
  /** Perceptual lightness, 0 (black) to 1 (white). */
  l: number;
  /** Chroma. 0 is achromatic; the sRGB gamut tops out near 0.32. */
  c: number;
  /** Hue angle in degrees, 0-360. Meaningless (and reported as 0) when c ~ 0. */
  h: number;
}

export interface MappedRgb {
  rgb: Rgb;
  /** The chroma actually achieved after gamut mapping. */
  chroma: number;
  /** requested - achieved. Non-zero means the request left the sRGB gamut. */
  chromaLoss: number;
}

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** sRGB electro-optical transfer function: 0-1 encoded -> 0-1 linear light. */
function toLinear(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** The inverse: 0-1 linear light -> 0-1 encoded. */
function fromLinear(channel: number): number {
  return channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function cbrt(value: number): number {
  return Math.cbrt(value);
}

/** Linear-light sRGB (0-1 each) -> OKLab. */
function linearToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = cbrt(l);
  const m_ = cbrt(m);
  const s_ = cbrt(s);

  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

/** OKLab -> linear-light sRGB (0-1 each, may fall outside on out-of-gamut input). */
function oklabToLinear(bigL: number, a: number, b: number): [number, number, number] {
  const l_ = bigL + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = bigL - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = bigL - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** True when every linear channel sits inside [0, 1] with a hair of slack. */
function inGamut(linear: [number, number, number]): boolean {
  const eps = 1e-7;
  return (
    linear[0] >= -eps &&
    linear[0] <= 1 + eps &&
    linear[1] >= -eps &&
    linear[1] <= 1 + eps &&
    linear[2] >= -eps &&
    linear[2] <= 1 + eps
  );
}

/**
 * Measure an existing colour. Used to derive the works' `RampProfile`s from the
 * RGB literals they ship with today, so the default palette reproduces them.
 */
export function srgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(clamp(rgb[0], 0, 255) / 255);
  const g = toLinear(clamp(rgb[1], 0, 255) / 255);
  const b = toLinear(clamp(rgb[2], 0, 255) / 255);

  const [bigL, aa, bb] = linearToOklab(r, g, b);
  const c = Math.hypot(aa, bb);

  // Below this the hue angle is numerical noise, so report a stable 0 rather
  // than whatever atan2 makes of two near-zero components.
  if (c < 1e-6) {
    return { l: bigL, c: 0, h: 0 };
  }

  let h = Math.atan2(bb, aa) * DEG;
  if (h < 0) {
    h += 360;
  }

  return { l: bigL, c, h };
}

/**
 * Render an OKLCH request as sRGB, reducing chroma until it fits the gamut.
 *
 * The reduction matters. Clamping the RGB channels instead — the obvious
 * shortcut — moves the hue, so a palette rotated towards orange can come back
 * visibly green at the saturated end. Bisecting on chroma holds lightness and
 * hue exactly and gives up only the thing that did not fit. 24 iterations
 * resolve chroma far below one 8-bit step.
 */
export function oklchToSrgbMapped(l: number, c: number, h: number): MappedRgb {
  const bigL = clamp(l, 0, 1);
  const requested = Math.max(0, c);
  const rad = h * RAD;
  const cosH = Math.cos(rad);
  const sinH = Math.sin(rad);

  const linearAt = (chroma: number): [number, number, number] =>
    oklabToLinear(bigL, chroma * cosH, chroma * sinH);

  let achieved = requested;
  let linear = linearAt(requested);

  if (!inGamut(linear)) {
    // lo is always in gamut (chroma 0 is a grey, and greys are), hi never is.
    let lo = 0;
    let hi = requested;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(linearAt(mid))) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    achieved = lo;
    linear = linearAt(lo);
  }

  const rgb: Rgb = [
    Math.round(clamp(fromLinear(clamp(linear[0], 0, 1)), 0, 1) * 255),
    Math.round(clamp(fromLinear(clamp(linear[1], 0, 1)), 0, 1) * 255),
    Math.round(clamp(fromLinear(clamp(linear[2], 0, 1)), 0, 1) * 255),
  ];

  return { rgb, chroma: achieved, chromaLoss: requested - achieved };
}

/** `oklchToSrgbMapped` when the caller only wants the pixels. */
export function oklchToSrgb(l: number, c: number, h: number): Rgb {
  return oklchToSrgbMapped(l, c, h).rgb;
}

export function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

/** `"12 34 56"` — the channel-triple form the CSS custom properties expect. */
export function rgbToTriple(rgb: Rgb): string {
  return rgb.map((v) => clamp(Math.round(v), 0, 255)).join(' ');
}
