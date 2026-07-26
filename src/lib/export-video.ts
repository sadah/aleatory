import { createButton, type ButtonHandle } from './controls';
import { onLocaleChange, t } from './i18n';
import { onPaletteChange, resolveChrome, rgbHex } from './palette';

const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1920;
const SOURCE_SIZE = 1080;
const SOURCE_Y = (VIDEO_HEIGHT - SOURCE_SIZE) / 2;
const DEFAULT_FPS = 30;
const DEFAULT_DURATION_MS = 12_000;
const MIME_TYPE_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const;

/**
 * The letterbox fill for the 1080x1920 export — the page background the square
 * art already sits on. Held at module level and refreshed on palette change:
 * capturing it per button would go stale the moment the palette moved.
 */
let paletteBackground = rgbHex(resolveChrome().ground[1]);
onPaletteChange(() => {
  paletteBackground = rgbHex(resolveChrome().ground[1]);
});

let compositeCanvas: HTMLCanvasElement | null = null;

function getCompositeCanvas(): HTMLCanvasElement {
  if (compositeCanvas) {
    return compositeCanvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  compositeCanvas = canvas;
  return canvas;
}

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  for (const mimeType of MIME_TYPE_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}

function isDesktopChromeLike(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const isChrome = /\bChrome\//.test(userAgent) || /\bChromium\//.test(userAgent);
  const isOtherChromiumShell = /\bEdg\/|\bOPR\/|\bBrave\//.test(userAgent);

  return !isMobile && isChrome && !isOtherChromiumShell;
}

/** True only when MediaRecorder can produce a WebM (Chromium). Safari emits mp4/H.264, not WebM -> false. */
export function isVideoExportSupported(): boolean {
  return isDesktopChromeLike() && getSupportedMimeType() !== null;
}

export interface RecordButtonOptions {
  parent: HTMLElement;
  getSourceCanvas: () => HTMLCanvasElement;
  getFilename: () => string;
  fps?: number;
  durationMs?: number;
  backgroundColor?: string;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Record button. When supported: click starts recording, label switches to t('stopRecording');
 * auto-stops after durationMs, or click again to stop early; on stop, downloads the WebM.
 * When NOT supported: button rendered disabled with title/tooltip = t('videoChromeOnly').
 */
export function createRecordButton(opts: RecordButtonOptions): ButtonHandle {
  const fps = opts.fps ?? DEFAULT_FPS;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
  const mimeType = getSupportedMimeType();

  let isRecording = false;
  let recorder: MediaRecorder | null = null;
  let animationFrameId: number | null = null;
  let stopTimeoutId: number | null = null;

  const stopPump = (): void => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const clearStopTimeout = (): void => {
    if (stopTimeoutId !== null) {
      window.clearTimeout(stopTimeoutId);
      stopTimeoutId = null;
    }
  };

  const renderFrame = (source: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void => {
    ctx.fillStyle = opts.backgroundColor ?? paletteBackground;
    ctx.fillRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
    ctx.drawImage(source, 0, SOURCE_Y, SOURCE_SIZE, SOURCE_SIZE);
  };

  const startPump = (source: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void => {
    const pump = (): void => {
      renderFrame(source, ctx);
      animationFrameId = requestAnimationFrame(pump);
    };

    pump();
  };

  const setIdleUi = (handle: ButtonHandle): void => {
    isRecording = false;
    handle.setLabel(t('record'));
    handle.setIconClass('ti-video');
  };

  const stopRecording = (): void => {
    const activeRecorder = recorder;
    if (!activeRecorder || activeRecorder.state === 'inactive') {
      return;
    }

    activeRecorder.stop();
  };

  const handle = createButton(opts.parent, {
    label: t('record'),
    iconClass: 'ti-video',
    onClick: () => {
      if (isRecording) {
        stopRecording();
        return;
      }

      if (!mimeType) {
        return;
      }

      const source = opts.getSourceCanvas();
      const canvas = getCompositeCanvas();
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      const chunks: Blob[] = [];
      const stream = canvas.captureStream(fps);
      const nextRecorder = new MediaRecorder(stream, { mimeType });

      recorder = nextRecorder;
      isRecording = true;
      handle.setLabel(t('stopRecording'));
      handle.setIconClass('ti-player-stop');

      nextRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });

      nextRecorder.addEventListener('stop', () => {
        stopPump();
        clearStopTimeout();
        setIdleUi(handle);
        recorder = null;

        if (chunks.length === 0) {
          return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        downloadBlob(blob, opts.getFilename());
      });

      startPump(source, ctx);
      nextRecorder.start();
      stopTimeoutId = window.setTimeout(stopRecording, durationMs);
    },
  });

  if (!isVideoExportSupported()) {
    handle.setDisabled(true);
    handle.button.title = t('videoChromeOnly');
  }

  onLocaleChange(() => {
    if (isVideoExportSupported()) {
      handle.button.title = '';
      handle.setLabel(isRecording ? t('stopRecording') : t('record'));
      return;
    }

    handle.setLabel(t('record'));
    handle.setDisabled(true);
    handle.button.title = t('videoChromeOnly');
  });

  return handle;
}
