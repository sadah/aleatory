import p5 from 'p5';
import { createButton, createSlider } from '../lib/controls';
import { createPngButton } from '../lib/export-image';
import { createRecordButton } from '../lib/export-video';
import { buildFrame } from '../lib/frame';
import { onLocaleChange, t } from '../lib/i18n';
import { onPaletteChange } from '../lib/palette';
import { createSeedUI } from '../lib/seed';
import { WORKS } from '../works';
import {
  createLorenzCore,
  LORENZ_DEFAULTS,
  type LorenzCore,
} from './lorenz-attractor.core';

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
const DEFAULT_SEED = 1;
const MIN_PITCH = -1.4;
const MAX_PITCH = 1.4;

let canvasElement: HTMLCanvasElement | null = null;
let core: LorenzCore | null = null;
let seed = DEFAULT_SEED;
let frame = 0;
let running = true;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let yaw = LORENZ_DEFAULTS.yaw;
let pitch = LORENZ_DEFAULTS.pitch;
let overlayText = '';
let legendBar: HTMLDivElement | null = null;

/** The fixed-timestep hook (CLAUDE.md invariant 2), delegated to the core. */
export function renderFrame(n: number): void {
  core?.renderFrame(n);
}

onPaletteChange(() => {
  core?.refreshPalette();
  /**
   * The legend lives in this shell's DOM but comes from the same resolved ramp
   * the canvas draws, so there is no second hardcoded copy to drift out of sync.
   */
  if (core && legendBar) {
    legendBar.style.background = `linear-gradient(90deg, ${core.getLegendGradientCss()})`;
  }
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
    yaw += dx * 0.006;
    pitch = clamp(pitch + dy * 0.006, MIN_PITCH, MAX_PITCH);
    core?.setParams({ yaw, pitch });
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

function installOverlay(): HTMLDivElement {
  stage.style.position = 'relative';

  const label = document.createElement('div');
  label.className = 'lorenz-overlay-label';

  const legend = document.createElement('div');
  legend.className = 'lorenz-legend';

  const bar = document.createElement('div');
  bar.className = 'lorenz-legend-bar';
  bar.style.background = `linear-gradient(90deg, ${core?.getLegendGradientCss() ?? ''})`;
  legendBar = bar;

  const text = document.createElement('div');
  text.className = 'lorenz-legend-text';
  text.innerHTML = '<span>slow</span><span>fast</span>';

  legend.append(bar, text);
  stage.append(label, legend);

  return label;
}

function installStyles(): void {
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
      box-shadow: 0 0 16px rgb(var(--accent-rgb) / 0.22);
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
  label: 'Trail',
  min: 2000,
  max: 14000,
  step: 500,
  value: LORENZ_DEFAULTS.trail,
  format: (value) => String(Math.round(value)),
  onInput: (value) => {
    core?.setParams({ trail: Math.round(value) });
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Speed',
  min: 2,
  max: 20,
  step: 1,
  value: LORENZ_DEFAULTS.stepsPerFrame,
  format: (value) => String(Math.round(value)),
  onInput: (value) => {
    core?.setParams({ stepsPerFrame: Math.round(value) });
  },
});

createSlider(controlsBar, {
  label: 'Spin',
  min: 0,
  max: 1,
  step: 0.01,
  value: LORENZ_DEFAULTS.spin,
  format: (value) => value.toFixed(2),
  onInput: (value) => {
    core?.setParams({ spin: value });
  },
});

createSlider(controlsBar, {
  label: 'ρ',
  min: 14,
  max: 45,
  step: 0.5,
  value: LORENZ_DEFAULTS.rho,
  format: (value) => value.toFixed(1),
  onInput: (value) => {
    core?.setParams({ rho: value });
    frame = 0;
  },
});

onLocaleChange(() => {
  playPauseButton.setLabel(t(running ? 'pause' : 'play'));
  resetButton.setLabel(t('reset'));
});

createSeedUI(seedSlot, {
  initialSeed: seed,
  onSeedChange: (nextSeed) => {
    seed = nextSeed;
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
    const ctx = p.drawingContext as CanvasRenderingContext2D;
    core = createLorenzCore(ctx, {
      size: SIZE,
      seed,
      params: LORENZ_DEFAULTS,
    });
    if (legendBar) {
      legendBar.style.background =
        `linear-gradient(90deg, ${core.getLegendGradientCss()})`;
    }
    installPointerHandlers(canvas);
  };

  p.draw = () => {
    if (!core) {
      return;
    }
    if (running && !dragging) {
      frame += 1;
    }
    core.renderFrame(frame);
    const next = core.getStatusText(frame);
    if (next !== overlayText) {
      overlayText = next;
      overlayLabel.textContent = next;
    }
  };
});
