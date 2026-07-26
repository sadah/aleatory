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

let active: (() => void) | null = null;

/** Returns a teardown function. */
export function attachThumbPreview(opts: ThumbPreviewOptions): () => void {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const fineHover = matchMedia('(hover: hover) and (pointer: fine)');
  let eligible = false;
  let pointed = false;
  let focused = false;
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
    if (active === stop) active = null;
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
    const [w0, w1] = opts.preview.window;
    const step = opts.preview.rate ?? 1;
    frame = w0 + ((frame - w0 + step) % (w1 - w0 + 1));
    raf = requestAnimationFrame(animate);
  };

  const ensureCanvas = async (play: boolean): Promise<void> => {
    if (disposed || reducedMotion.matches || !eligible) return;
    if (play && active !== stop) {
      active?.();
      active = stop;
    }

    if (core && canvas) {
      window.clearTimeout(releaseTimer);
      releaseTimer = 0;
      render();
      canvas.style.opacity = '1';
      if (play && !raf) raf = requestAnimationFrame(animate);
      return;
    }

    const requestGeneration = ++generation;
    const factory = await opts.loadCore();
    if (
      disposed ||
      reducedMotion.matches ||
      !eligible ||
      requestGeneration !== generation ||
      (play && active !== stop)
    ) {
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
    const [w0, w1] = opts.preview.window;
    frame =
      opts.preview.posterFrame >= w0 && opts.preview.posterFrame <= w1
        ? opts.preview.posterFrame
        : w0;
    opts.host.append(nextCanvas);
    render();
    void nextCanvas.offsetWidth;
    nextCanvas.style.opacity = '1';
    if (play) raf = requestAnimationFrame(animate);
  };

  const reconcile = (): void => {
    if (reducedMotion.matches || !eligible) {
      stop();
      return;
    }
    if (!fineHover.matches) {
      void ensureCanvas(false);
      return;
    }
    if (pointed || focused) {
      void ensureCanvas(true);
    } else {
      stop();
    }
  };

  const onPointerEnter = (): void => {
    pointed = true;
    reconcile();
  };
  const onPointerLeave = (): void => {
    pointed = false;
    reconcile();
  };
  const onFocusIn = (): void => {
    focused = true;
    reconcile();
  };
  const onFocusOut = (): void => {
    focused = false;
    reconcile();
  };
  const onMotionChange = (): void => {
    if (reducedMotion.matches) {
      stop();
      releaseCanvas();
    } else {
      reconcile();
    }
  };
  const onHoverChange = (): void => {
    pointed = false;
    wireHover();
    reconcile();
  };
  const wireHover = (): void => {
    opts.trigger.removeEventListener('pointerenter', onPointerEnter);
    opts.trigger.removeEventListener('pointerleave', onPointerLeave);
    if (fineHover.matches) {
      opts.trigger.addEventListener('pointerenter', onPointerEnter);
      opts.trigger.addEventListener('pointerleave', onPointerLeave);
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
  wireHover();
  opts.trigger.addEventListener('focusin', onFocusIn);
  opts.trigger.addEventListener('focusout', onFocusOut);
  reducedMotion.addEventListener('change', onMotionChange);
  fineHover.addEventListener('change', onHoverChange);

  return () => {
    disposed = true;
    stop();
    releaseCanvas();
    unsubscribePalette();
    reducedMotion.removeEventListener('change', onMotionChange);
    fineHover.removeEventListener('change', onHoverChange);
    opts.trigger.removeEventListener('pointerenter', onPointerEnter);
    opts.trigger.removeEventListener('pointerleave', onPointerLeave);
    opts.trigger.removeEventListener('focusin', onFocusIn);
    opts.trigger.removeEventListener('focusout', onFocusOut);
    observer.unobserve(opts.trigger);
    eligibilityHandlers.delete(opts.trigger);
  };
}
