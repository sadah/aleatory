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
  createSchotterCore,
  SCHOTTER_DEFAULTS,
  type SchotterCore,
} from './schotter.core';

const work = WORKS.find((w) => w.slug === 'schotter');
if (!work) {
  throw new Error('Missing work metadata for schotter');
}

const app = document.getElementById('app');
if (!app) {
  throw new Error('Missing #app root');
}

const { stage, controlsBar, seedSlot, exportSlot } = buildFrame(app, work);
const SIZE = 1080;
const DEFAULT_SEED = 1;
const FPS = 60;
const DEFAULT_CYCLE = 720;

let canvasElement: HTMLCanvasElement | null = null;
let core: SchotterCore | null = null;
let seed = DEFAULT_SEED;
let frame = 0;
let running = true;
let overlayText = '';

export function renderFrame(n: number): void {
  core?.renderFrame(n);
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
  value: SCHOTTER_DEFAULTS.disorder,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    core?.setParams({ disorder: value });
  },
});

createSlider(controlsBar, {
  label: 'Rows',
  min: 5,
  max: 40,
  step: 1,
  value: SCHOTTER_DEFAULTS.rows,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    core?.setParams({ rows: Math.round(value) });
    frame = 0;
  },
});

createSlider(controlsBar, {
  label: 'Fall',
  min: 0.2,
  max: 2,
  step: 0.05,
  value: SCHOTTER_DEFAULTS.fall,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    core?.setParams({ fall: value });
  },
});

createSlider(controlsBar, {
  label: 'Drift',
  min: 0,
  max: 1,
  step: 0.01,
  value: SCHOTTER_DEFAULTS.drift,
  format: (v) => v.toFixed(2),
  onInput: (value) => {
    core?.setParams({ drift: value });
  },
});

createSlider(controlsBar, {
  label: 'Trail',
  min: 0,
  max: 6,
  step: 1,
  value: SCHOTTER_DEFAULTS.ghosts,
  format: (v) => String(Math.round(v)),
  onInput: (value) => {
    core?.setParams({ ghosts: Math.round(value) });
  },
});

createToggle(controlsBar, {
  label: 'Lattice',
  checked: SCHOTTER_DEFAULTS.lattice,
  onChange: (checked) => {
    core?.setParams({ lattice: checked });
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

onPaletteChange(() => core?.refreshPalette());

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
    core = createSchotterCore(ctx, {
      size: SIZE,
      seed,
      params: SCHOTTER_DEFAULTS,
    });
  };

  p.draw = () => {
    if (!core) {
      return;
    }
    if (running) {
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
