import { createButton, type ButtonHandle } from './controls';
import { onLocaleChange, t } from './i18n';

/** Trigger a browser download of the canvas as PNG. Works in all browsers. */
export function saveCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

export interface PngButtonOptions {
  parent: HTMLElement;
  getCanvas: () => HTMLCanvasElement;
  getFilename: () => string;
}

/** Button labeled t('downloadPng') with a Tabler camera icon; downloads current canvas on click. Relabels on locale change. */
export function createPngButton(opts: PngButtonOptions): ButtonHandle {
  const handle = createButton(opts.parent, {
    label: t('downloadPng'),
    iconClass: 'ti-camera',
    onClick: () => {
      saveCanvasPng(opts.getCanvas(), opts.getFilename());
    },
  });

  onLocaleChange(() => {
    handle.setLabel(t('downloadPng'));
  });

  return handle;
}
