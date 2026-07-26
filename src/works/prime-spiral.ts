import p5 from 'p5';
import { createButton, createSlider, createToggle } from '../lib/controls';
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { buildFrame } from '../lib/frame';
import { onLocaleChange, t } from '../lib/i18n';
import { onPaletteChange } from '../lib/palette';
import { createSeedUI } from '../lib/seed';
import { WORKS } from '../works';
import {
  createPrimeSpiralCore,
  PRIME_SPIRAL_DEFAULTS,
  type PrimeSpiralCore,
} from './prime-spiral.core';

const work = WORKS.find((w) => w.slug === 'prime-spiral');
if (!work) {
  throw new Error('Missing work metadata for prime-spiral');
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app root');
}

const { stage, controlsBar, seedSlot, exportSlot } = buildFrame(app, work);

const SIZE = 1080;
const DEFAULT_SEED = 1;
/** The slider's 0..1 value; the core takes radians, mapped at the callback. */
const DEFAULT_SPIN_VALUE = 0.25;

let canvasElement: HTMLCanvasElement | null = null;
let core: PrimeSpiralCore | null = null;
let seed = DEFAULT_SEED;
let frame = 0;
let running = true;
let dragging = false;
let lastPointerX = 0;
let baseRotation = PRIME_SPIRAL_DEFAULTS.baseRotation;
let overlayText = '';
let legendBar: HTMLDivElement | null = null;

/** The fixed-timestep hook (CLAUDE.md invariant 2), delegated to the core. */
export function renderFrame(n: number): void {
  core?.renderFrame(n);
}

onPaletteChange(() => {
  core?.refreshPalette();
  // The legend lives in this shell's DOM but must come from the same resolved
  // ramp the canvas draws, so it is repainted from the core rather than stored.
  if (core && legendBar) {
    legendBar.style.background = `linear-gradient(90deg, ${core.getLegendGradientCss()})`;
  }
});

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
    core?.setParams({ baseRotation });
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
  bar.style.background = `linear-gradient(90deg, ${core?.getLegendGradientCss() ?? ''})`;
  legendBar = bar;

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
    core?.build();
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Primes',
  min: 4000,
  max: 60000,
  step: 1000,
  value: PRIME_SPIRAL_DEFAULTS.nMax,
  format: (v) => Math.round(v).toLocaleString('en-US'),
  onInput: (value) => {
    core?.setParams({ nMax: Math.round(value) });
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Links',
  min: 0,
  max: 3,
  step: 1,
  value: PRIME_SPIRAL_DEFAULTS.kLinks,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    core?.setParams({ kLinks: Math.round(value) });
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Twist',
  min: 0.9,
  max: 1.1,
  step: 0.005,
  value: PRIME_SPIRAL_DEFAULTS.twistBase,
  format: (v) => v.toFixed(3),
  onInput: (value) => {
    core?.setParams({ twistBase: value });
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
    core?.setParams({ spinPerFrame: value * 0.004 });
  },
});

createToggle(controlsBar, {
  label: 'Grid',
  checked: PRIME_SPIRAL_DEFAULTS.showGrid,
  onChange: (checked) => {
    core?.setParams({ showGrid: checked });
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
    core?.setSeed(seed);
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
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    core = createPrimeSpiralCore(ctx, { size: SIZE, seed, params: PRIME_SPIRAL_DEFAULTS });
    if (legendBar) legendBar.style.background = `linear-gradient(90deg, ${core.getLegendGradientCss()})`;
    installPointerHandlers(canvas);
  };

  p.draw = () => {
    if (running && !dragging) {
      frame += 1;
    }
    renderFrame(frame);
    const next = core?.getStatusText(frame) ?? '';
    if (next !== overlayText) { overlayText = next; overlayLabel.textContent = next; }
  };
});
