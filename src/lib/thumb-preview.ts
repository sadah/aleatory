import { onPaletteChange } from './palette';
import type { ThumbPreview } from '../types';
import type { WorkCore, WorkCoreOptions } from '../works/core-types';

export interface ThumbPreviewOptions {
  /** The .work-card-thumb element; the canvas is appended over its <img>. */
  host: HTMLElement;
  /** The card's <a>, used for focus/pointer events. */
  trigger: HTMLElement;
  preview: ThumbPreview;
  /** Loads the core factory. Dynamic so the gallery bundle stays small. */
  loadCore: () => Promise<
    (ctx: CanvasRenderingContext2D, opts: WorkCoreOptions<any>) => WorkCore<any>
  >;
  seed?: number;
}

type EligibilityHandler = (eligible: boolean) => void;

const eligibilityHandlers = new Map<Element, EligibilityHandler>();
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      eligibilityHandlers.get(entry.target)?.(
        entry.isIntersecting && entry.intersectionRatio >= 0.25,
      );
    }
  },
  { threshold: 0.25 },
);

/**
 * Returns a teardown function.
 *
 * A card animates whenever it is on screen — no hover required. The gallery is
 * meant to look alive at a glance, and gating on hover meant a still page until
 * you happened to point at something. The IntersectionObserver is what keeps the
 * cost bounded: off-screen cards run nothing at all.
 */
export function attachThumbPreview(opts: ThumbPreviewOptions): () => void {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let eligible = false;
  let canvas: HTMLCanvasElement | null = null;
  let core: WorkCore<any> | null = null;
  let frame = opts.preview.posterFrame;
  let raf = 0;
  let generation = 0;
  let releaseTimer = 0;
  let disposed = false;

  const releaseCanvas = (): void => {
    window.clearTimeout(releaseTimer);
    releaseTimer = 0;
    core?.destroy();
    core = null;
    if (canvas) {
      canvas.width = 0;
      canvas.remove();
      canvas = null;
    }
  };

  const stop = (): void => {
    cancelAnimationFrame(raf);
    raf = 0;
    generation += 1;
    if (!canvas) return;
    canvas.style.opacity = '0';
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(releaseCanvas, 140);
  };

  const render = (): void => {
    core?.renderFrame(frame);
  };

  const animate = (): void => {
    render();
    const step = opts.preview.rate ?? 1;
    if (opts.preview.mode === 'forward') {
      // Never wraps: the piece is either non-periodic or its opening is one-way,
      // so cycling would cut rather than loop.
      frame += step;
    } else {
      const [w0, w1] = opts.preview.window;
      frame = w0 + ((frame - w0 + step) % (w1 - w0 + 1));
    }
    raf = requestAnimationFrame(animate);
  };

  const ensureCanvas = async (): Promise<void> => {
    if (disposed || reducedMotion.matches || !eligible) return;

    if (core && canvas) {
      window.clearTimeout(releaseTimer);
      releaseTimer = 0;
      render();
      canvas.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(animate);
      return;
    }

    const requestGeneration = ++generation;
    const factory = await opts.loadCore();
    if (disposed || reducedMotion.matches || !eligible || requestGeneration !== generation) {
      return;
    }

    const nextCanvas = document.createElement('canvas');
    const cssSize = opts.host.clientWidth;
    const size = Math.round(cssSize * Math.min(devicePixelRatio, 1.5));
    nextCanvas.width = size;
    nextCanvas.height = size;
    nextCanvas.style.opacity = '0';
    const ctx = nextCanvas.getContext('2d');
    if (!ctx) {
      nextCanvas.width = 0;
      return;
    }

    const nextCore = factory(ctx, {
      size,
      seed: opts.seed ?? 1,
      params: opts.preview.params,
    });
    canvas = nextCanvas;
    core = nextCore;
    // `forward` always begins at its start frame, so scrolling a card back into
    // view replays the opening. `loop` picks up at the poster frame when that
    // falls inside the window, so the first painted frame matches the JPEG it
    // is fading over.
    if (opts.preview.mode === 'forward') {
      frame = opts.preview.startFrame ?? 0;
    } else {
      const [w0, w1] = opts.preview.window;
      const poster = opts.preview.posterFrame;
      frame = poster >= w0 && poster <= w1 ? poster : w0;
    }
    opts.host.append(nextCanvas);
    render();
    void nextCanvas.offsetWidth;
    nextCanvas.style.opacity = '1';
    raf = requestAnimationFrame(animate);
  };

  const reconcile = (): void => {
    if (reducedMotion.matches || !eligible) {
      stop();
      return;
    }
    void ensureCanvas();
  };

  const onMotionChange = (): void => {
    if (reducedMotion.matches) {
      stop();
      releaseCanvas();
    } else {
      reconcile();
    }
  };
  const unsubscribePalette = onPaletteChange(() => {
    if (!core) return;
    core.refreshPalette();
    render();
  });

  eligibilityHandlers.set(opts.trigger, (nextEligible) => {
    eligible = nextEligible;
    reconcile();
  });
  observer.observe(opts.trigger);
  reducedMotion.addEventListener('change', onMotionChange);

  return () => {
    disposed = true;
    stop();
    releaseCanvas();
    unsubscribePalette();
    reducedMotion.removeEventListener('change', onMotionChange);
    observer.unobserve(opts.trigger);
    eligibilityHandlers.delete(opts.trigger);
  };
}
