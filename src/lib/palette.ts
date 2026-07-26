import type { Locale } from '../types';
import { oklchToSrgbMapped, rgbToTriple, type Rgb } from './oklab';

/**
 * The site's colour theme.
 *
 * The split of concerns is the whole idea here, so it is worth stating plainly:
 *
 * - **The work owns lightness.** Every ramp in this gallery encodes a scalar —
 *   speed, prime gap, activity — as a climb from a dim cool ground through a
 *   white-hot pivot to a warm peak. That climb *is* the reading. If a palette
 *   could change it, a palette could break the piece.
 * - **The palette owns hue and chroma.** It says where "cool" and "hot" point
 *   and how saturated to be, and nothing else.
 *
 * So a work ships a `RampProfile`: per stop, a position, which end it belongs
 * to, a hue offset from that end, and the lightness/chroma measured off the
 * colour the work used to hardcode. `resolveRamp` puts the two halves back
 * together. Under the default palette the result is byte-identical to the
 * literals the works shipped with before this module existed.
 *
 * One thing the profile deliberately does NOT interpolate is hue across the
 * white pivot. Measured in OKLCH, the ramps jump from ~260 deg to ~60 deg there
 * rather than sweeping through green, and the pivot itself is a near-neutral
 * cream. Anchoring each stop to one end or the other reproduces that; a single
 * interpolated hue axis would not.
 */

/** Which end of the temperature axis a colour hangs off. */
export type RampSide = 'cool' | 'hot';

export interface ColorSpec {
  side: RampSide;
  /** Hue offset in degrees from that side's anchor. */
  dh: number;
  /** OKLCH lightness, 0-1. Fixed by the work; a palette never touches it. */
  l: number;
  /** OKLCH chroma before the palette's multiplier. */
  c: number;
}

export interface RampStopSpec extends ColorSpec {
  /** Position along the ramp, 0-1. */
  x: number;
}

export type RampProfile = readonly RampStopSpec[];

export interface RampStop {
  x: number;
  rgb: Rgb;
}

export interface Palette {
  id: string;
  name: Record<Locale, string>;
  /** Anchor hue in degrees for the cool end of every ramp. */
  coolHue: number;
  /** Anchor hue in degrees for the hot end. */
  hotHue: number;
  /** Chroma multiplier applied to cool-side stops. */
  coolChroma: number;
  /** Chroma multiplier applied to hot-side stops. */
  hotChroma: number;
  /** Hue of the near-black ladder the whole site sits on. */
  groundHue: number;
}

export const DEFAULT_PALETTE_ID = 'ember';

/**
 * Chroma multipliers are per-hue, not arbitrary: they were fitted so that no
 * ramp stop loses more than ~0.008 chroma to the sRGB gamut. Beyond that the
 * gamut starts flattening stops that should differ, which is what turns a ramp
 * into a smear. Ember is 1.0/1.0 by construction — it is the palette the works
 * were drawn in.
 *
 * Ember stays first because it is both the default and the palette used to draw
 * the works. The remaining colour presets are spaced so neighbouring swatches
 * never have similar cool anchors (Peony notably separates Aurora from
 * Verdigris). Argent closes the list because its intentional lack of hue reads
 * as the end of the range; the picker appends Custom after it.
 */
export const PALETTES: readonly Palette[] = [
  { id: 'ember', name: { en: 'Ember', ja: '残り火' }, coolHue: 260, hotHue: 60, coolChroma: 1.0, hotChroma: 1.0, groundHue: 274 },
  { id: 'aurora', name: { en: 'Aurora', ja: '極光' }, coolHue: 200, hotHue: 310, coolChroma: 0.46, hotChroma: 0.63, groundHue: 250 },
  { id: 'peony', name: { en: 'Peony', ja: '牡丹' }, coolHue: 350, hotHue: 65, coolChroma: 1.0, hotChroma: 1.0, groundHue: 340 },
  { id: 'verdigris', name: { en: 'Verdigris', ja: '緑青' }, coolHue: 190, hotHue: 95, coolChroma: 0.46, hotChroma: 0.92, groundHue: 205 },
  { id: 'terracotta', name: { en: 'Terracotta', ja: '素焼き' }, coolHue: 55, hotHue: 25, coolChroma: 0.61, hotChroma: 0.57, groundHue: 40 },
  { id: 'argent', name: { en: 'Argent', ja: '銀' }, coolHue: 250, hotHue: 250, coolChroma: 0.22, hotChroma: 0.18, groundHue: 262 },
];

export const CUSTOM_PALETTE_ID = 'custom';

/**
 * The ramp the picker draws its swatches from.
 *
 * Deliberately NOT one of the works' profiles. A work's ramp is a scalar-mapping
 * curve, so it climbs from a dim cool ground to a white-hot pivot and back down
 * — borrowing Lorenz's ran the swatch from L 0.39 up to 0.96 and back to 0.76,
 * which on a dark popover read as a shadow at the left end and a dark cap at the
 * right rather than as colour. It also misrepresented the other two works, whose
 * ramps start pale rather than dark.
 *
 * A swatch answers one question — what does this palette look like — so the
 * lightness is a shallow symmetric arc and only hue and chroma vary across the
 * bar: cool anchor, through the near-neutral pivot, to the hot anchor.
 *
 * Each chroma sits just under the *worst-case* achievable chroma at that
 * lightness across all 360 hues (0.128 at L 0.75, 0.084 at 0.83, 0.024 at 0.95,
 * 0.074 at 0.85, 0.122 at 0.76). That makes the swatch gamut-exact for any hue
 * pair at any chroma setting, Custom included — so a swatch never quietly shows
 * less saturation than it promises, and this profile needs no entry in
 * `GAMUT_PROBE`.
 */
export const SWATCH_PROFILE: RampProfile = [
  { x: 0, side: 'cool', dh: 0, l: 0.75, c: 0.125 },
  { x: 0.26, side: 'cool', dh: 0, l: 0.83, c: 0.08 },
  { x: 0.5, side: 'hot', dh: 28, l: 0.95, c: 0.022 },
  { x: 0.74, side: 'hot', dh: 10, l: 0.85, c: 0.07 },
  { x: 1, side: 'hot', dh: 0, l: 0.76, c: 0.118 },
];

/**
 * The chroma envelope of everything this site draws — the most demanding stop
 * in each lightness band, across all three works plus the off-ramp colours, the
 * accent, and the gallery placeholder wash.
 *
 * `chromaHeadroom` measures against this rather than against one work's ramp.
 * Using a single profile understates the constraint: the Lorenz ramp alone
 * reports 1.20 of headroom at hue 260 where the real ceiling is 1.06, because
 * the binding stops are the accent and the Prime Spiral link stroke, which sit
 * at a higher lightness carrying nearly the same chroma.
 *
 * A new work with a more saturated stop than anything here belongs in this
 * list. `npm run build` will not catch its absence — the Custom slider will
 * just quietly promise saturation the gamut cannot deliver.
 */
const GAMUT_PROBE: readonly ColorSpec[] = [
  { side: 'cool', dh: 5.54, l: 0.3818, c: 0.1596 },
  { side: 'cool', dh: -3.21, l: 0.613, c: 0.1763 },
  { side: 'cool', dh: 4.64, l: 0.6623, c: 0.1786 },
  { side: 'cool', dh: 0.54, l: 0.7385, c: 0.135 },
  { side: 'cool', dh: -5.38, l: 0.7595, c: 0.1254 },
  { side: 'cool', dh: 3.82, l: 0.7856, c: 0.0922 },
  { side: 'cool', dh: -21.76, l: 0.8371, c: 0.0833 },
  { side: 'cool', dh: 1.66, l: 0.8909, c: 0.053 },
  { side: 'cool', dh: 3.66, l: 0.9167, c: 0.0399 },
  { side: 'cool', dh: 3.19, l: 0.9535, c: 0.0219 },
  { side: 'hot', dh: -3.58, l: 0.7513, c: 0.175 },
  { side: 'hot', dh: -10.59, l: 0.7539, c: 0.1621 },
  { side: 'hot', dh: 1.92, l: 0.8065, c: 0.1383 },
  { side: 'hot', dh: 14.27, l: 0.8326, c: 0.1435 },
  { side: 'hot', dh: 12.01, l: 0.8446, c: 0.1265 },
  { side: 'hot', dh: 17.57, l: 0.8782, c: 0.1091 },
  { side: 'hot', dh: 17.93, l: 0.8874, c: 0.1011 },
  { side: 'hot', dh: 28.6, l: 0.9362, c: 0.077 },
  { side: 'hot', dh: 30.42, l: 0.9431, c: 0.0736 },
  { side: 'hot', dh: 31.58, l: 0.9849, c: 0.0204 },
];

/**
 * The near-black ladder, as OKLCH lightness/chroma pairs. Rung meanings:
 *
 * 0 stage interior | 1 page background, sketch gradient outer, video letterbox
 * 2 surface | 3 sketch gradient inner | 4 raised surface | 5 button hover
 *
 * These were measured from the six near-blacks the site used to carry as
 * separate literals. They all sat on essentially one hue already (267-276 deg),
 * so hue 274 reproduces every one of them exactly.
 */
const GROUND_LADDER: ReadonlyArray<{ l: number; c: number }> = [
  { l: 0.0887, c: 0.0241 },
  { l: 0.1093, c: 0.0181 },
  { l: 0.1257, c: 0.0195 },
  { l: 0.15, c: 0.0307 },
  { l: 0.159, c: 0.0257 },
  { l: 0.1947, c: 0.0385 },
];

/** The UI accent, as an offset from `coolHue`. */
const ACCENT_SPEC: ColorSpec = { side: 'cool', dh: 4.64, l: 0.6623, c: 0.1786 };

/** The two-point wash behind a gallery card that has no thumbnail yet. */
const PLACEHOLDER_COOL: ColorSpec = { side: 'cool', dh: 0.54, l: 0.7385, c: 0.135 };
const PLACEHOLDER_HOT: ColorSpec = { side: 'hot', dh: 1.92, l: 0.8065, c: 0.1383 };

export interface Chrome {
  /** Six near-blacks, dark to light. */
  ground: Rgb[];
  accent: Rgb;
  placeholderCool: Rgb;
  placeholderHot: Rgb;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function anchorHue(palette: Palette, side: RampSide): number {
  return side === 'cool' ? palette.coolHue : palette.hotHue;
}

function chromaScale(palette: Palette, side: RampSide): number {
  return side === 'cool' ? palette.coolChroma : palette.hotChroma;
}

export function resolveColor(spec: ColorSpec, palette: Palette = getPalette()): Rgb {
  return oklchToSrgbMapped(
    spec.l,
    spec.c * chromaScale(palette, spec.side),
    anchorHue(palette, spec.side) + spec.dh,
  ).rgb;
}

export function resolveRamp(profile: RampProfile, palette: Palette = getPalette()): RampStop[] {
  return profile.map((stop) => ({ x: stop.x, rgb: resolveColor(stop, palette) }));
}

/**
 * The largest chroma multiplier this hue can carry before the gamut starts
 * flattening the reference ramp. Used to give the Custom chroma slider a
 * meaningful full-scale at every hue instead of a dead zone at saturated ends.
 */
const headroomCache = new Map<string, number>();
export function chromaHeadroom(hue: number, side: RampSide): number {
  const key = `${side}:${Math.round(hue)}`;
  const hit = headroomCache.get(key);
  if (hit !== undefined) {
    return hit;
  }

  const stops = GAMUT_PROBE.filter((s) => s.side === side);
  let lo = 0.05;
  let hi = 1.6;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    const worst = Math.max(...stops.map((s) => oklchToSrgbMapped(s.l, s.c * mid, hue + s.dh).chromaLoss));
    if (worst <= 0.008) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  headroomCache.set(key, lo);
  return lo;
}

export function resolveChrome(palette: Palette = getPalette()): Chrome {
  return {
    ground: GROUND_LADDER.map((rung) => oklchToSrgbMapped(rung.l, rung.c, palette.groundHue).rgb),
    accent: resolveColor(ACCENT_SPEC, palette),
    placeholderCool: resolveColor(PLACEHOLDER_COOL, palette),
    placeholderHot: resolveColor(PLACEHOLDER_HOT, palette),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Build the piecewise-linear sampler the sketches use to fill their per-bucket
 * style tables. The stops are resolved once, here — callers rebuild by calling
 * this again from their `onPaletteChange` handler.
 */
export function makeRamp(profile: RampProfile, palette: Palette = getPalette()): (value: number) => Rgb {
  const stops = resolveRamp(profile, palette);

  return (value: number): Rgb => {
    const v = clamp01(value);

    for (let i = 0; i < stops.length - 1; i += 1) {
      const a = stops[i];
      const b = stops[i + 1];
      if (v >= a.x && v <= b.x) {
        const t = (v - a.x) / (b.x - a.x);
        return [
          Math.round(lerp(a.rgb[0], b.rgb[0], t)),
          Math.round(lerp(a.rgb[1], b.rgb[1], t)),
          Math.round(lerp(a.rgb[2], b.rgb[2], t)),
        ];
      }
    }

    return stops[stops.length - 1].rgb;
  };
}

/** `linear-gradient` body for a legend bar or a picker swatch. */
export function rampGradientCss(stops: RampStop[]): string {
  return stops.map((s) => `rgb(${s.rgb.join(',')}) ${(s.x * 100).toFixed(0)}%`).join(', ');
}

/** `"r,g,b"` — the form the sketches interpolate into `rgba(...)` strings. */
export function rgbCsv(rgb: Rgb): string {
  return rgb.join(',');
}

export function rgbHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

// ---------------------------------------------------------------------------
// State. Mirrors i18n.ts: one storage key, a Set of subscribers, and an
// unsubscribe returned from the subscribe call.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'aleatory:palette';
const CUSTOM_STORAGE_KEY = 'aleatory:palette-custom';

export interface CustomKnobs {
  coolHue: number;
  hotHue: number;
  /** 0-1, as a fraction of the chroma the chosen hues can actually carry. */
  chroma: number;
}

/** Custom starts where the default palette is, so the first drag is continuous. */
export const CUSTOM_DEFAULTS: CustomKnobs = customKnobsFrom(
  findPreset(DEFAULT_PALETTE_ID) ?? PALETTES[0],
);

const subscribers = new Set<(palette: Palette) => void>();

function findPreset(id: string | null): Palette | undefined {
  return PALETTES.find((p) => p.id === id);
}

function readStoredCustom(): CustomKnobs {
  if (typeof localStorage === 'undefined') {
    return { ...CUSTOM_DEFAULTS };
  }

  const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
  if (!raw) {
    return { ...CUSTOM_DEFAULTS };
  }

  const parts = raw.split(',').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return { ...CUSTOM_DEFAULTS };
  }

  return {
    coolHue: ((parts[0] % 360) + 360) % 360,
    hotHue: ((parts[1] % 360) + 360) % 360,
    chroma: clamp01(parts[2]),
  };
}

let customKnobs: CustomKnobs = readStoredCustom();

/**
 * A Custom palette is the knobs plus the gamut: the chroma slider reads as a
 * fraction of what the chosen hues can carry, so it stays useful across the
 * whole wheel rather than going dead wherever sRGB happens to be narrow.
 */
function buildCustom(knobs: CustomKnobs): Palette {
  return {
    id: CUSTOM_PALETTE_ID,
    name: { en: 'Custom', ja: 'カスタム' },
    coolHue: knobs.coolHue,
    hotHue: knobs.hotHue,
    coolChroma: knobs.chroma * chromaHeadroom(knobs.coolHue, 'cool'),
    hotChroma: knobs.chroma * chromaHeadroom(knobs.hotHue, 'hot'),
    // A ground that leans towards the cool end reads as "the dark the piece
    // sits in" rather than as a separate colour.
    groundHue: (knobs.coolHue + 14) % 360,
  };
}

function readInitialPalette(): Palette {
  // A `?palette=` link should show what the sender saw, but it is a view of
  // someone else's choice — it must not overwrite the visitor's own.
  if (typeof location !== 'undefined' && location.search) {
    const fromUrl = new URLSearchParams(location.search).get('palette');
    if (fromUrl === CUSTOM_PALETTE_ID) {
      return buildCustom(customKnobs);
    }
    const preset = findPreset(fromUrl);
    if (preset) {
      return preset;
    }
  }

  if (typeof localStorage === 'undefined') {
    return findPreset(DEFAULT_PALETTE_ID) ?? PALETTES[0];
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === CUSTOM_PALETTE_ID) {
    return buildCustom(customKnobs);
  }

  return findPreset(stored) ?? findPreset(DEFAULT_PALETTE_ID) ?? PALETTES[0];
}

let current: Palette = readInitialPalette();

export function getPalette(): Palette {
  return current;
}

export function getCustomKnobs(): CustomKnobs {
  return { ...customKnobs };
}

/** The Custom palette as the knobs currently stand, without activating it. */
export function getCustomPalette(): Palette {
  return buildCustom(customKnobs);
}

function persist(key: string, value: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
}

function notify(): void {
  applyPaletteTokens(current);
  for (const subscriber of subscribers) {
    subscriber(current);
  }
}

export function setPalette(id: string): void {
  const next = id === CUSTOM_PALETTE_ID ? buildCustom(customKnobs) : findPreset(id);
  if (!next || next.id === current.id) {
    return;
  }

  current = next;
  persist(STORAGE_KEY, next.id);
  notify();
}

export function setCustomKnobs(knobs: Partial<CustomKnobs>): void {
  customKnobs = {
    coolHue: knobs.coolHue ?? customKnobs.coolHue,
    hotHue: knobs.hotHue ?? customKnobs.hotHue,
    chroma: knobs.chroma ?? customKnobs.chroma,
  };
  persist(CUSTOM_STORAGE_KEY, `${customKnobs.coolHue},${customKnobs.hotHue},${customKnobs.chroma}`);

  current = buildCustom(customKnobs);
  persist(STORAGE_KEY, CUSTOM_PALETTE_ID);
  notify();
}

/**
 * Seed the Custom knobs from a preset so switching to Custom starts from
 * wherever the eye already is, rather than snapping back to a default.
 */
export function customKnobsFrom(palette: Palette): CustomKnobs {
  return {
    coolHue: palette.coolHue,
    hotHue: palette.hotHue,
    chroma: clamp01(palette.coolChroma / chromaHeadroom(palette.coolHue, 'cool')),
  };
}

export function onPaletteChange(cb: (palette: Palette) => void): () => void {
  subscribers.add(cb);

  return () => {
    subscribers.delete(cb);
  };
}

// ---------------------------------------------------------------------------
// CSS token layer
// ---------------------------------------------------------------------------

/**
 * Push the palette into the custom properties `theme.css` and friends read.
 *
 * Inline properties on the root element rather than a generated `<style>`:
 * setProperty is idempotent, wins the cascade without an ordering question, and
 * costs no CSS parse when the Custom sliders are being dragged.
 *
 * Chips are deliberately absent. They are a categorical set that says what kind
 * of work this is, and rotating them with the theme made "Study" read teal
 * under Aurora and orange under Terracotta — distinguishable, but no longer
 * learnable. They stay fixed in theme.css.
 */
export function applyPaletteTokens(palette: Palette = current): void {
  if (typeof document === 'undefined') {
    return;
  }

  const chrome = resolveChrome(palette);
  const root = document.documentElement.style;

  chrome.ground.forEach((rgb, i) => {
    root.setProperty(`--ground-${i}-rgb`, rgbToTriple(rgb));
  });
  root.setProperty('--accent-rgb', rgbToTriple(chrome.accent));
  root.setProperty('--ramp-cool-rgb', rgbToTriple(chrome.placeholderCool));
  root.setProperty('--ramp-hot-rgb', rgbToTriple(chrome.placeholderHot));
}

applyPaletteTokens(current);
