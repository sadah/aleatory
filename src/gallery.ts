import './lib/theme.css';
import './gallery.css';
import { WORKS } from './works';
import type { Work } from './types';
import { getLocale, onLocaleChange, t } from './lib/i18n';
import { createLocaleToggle } from './lib/locale-toggle';
import { createPaletteToggle } from './lib/palette-picker';
import { createSiteFooter } from './lib/site-footer';
import {
  attachThumbPreview,
  type ThumbPreviewOptions,
} from './lib/thumb-preview';

const BASE = import.meta.env.BASE_URL;
const CORE_LOADERS: Partial<Record<string, ThumbPreviewOptions['loadCore']>> = {
  schotter: async () => (await import('./works/schotter.core')).createSchotterCore,
  'prime-spiral': async () =>
    (await import('./works/prime-spiral.core')).createPrimeSpiralCore,
  'lorenz-attractor': async () =>
    (await import('./works/lorenz-attractor.core')).createLorenzCore,
};

function workUrl(slug: string): string {
  return `${BASE}works/${slug}.html`;
}

function thumbUrl(slug: string): string {
  return `${BASE}thumbs/${slug}.jpg`;
}

function labelClass(label: string): string {
  return `label-${label.toLowerCase()}`;
}

function createCard(work: Work): HTMLAnchorElement {
  const card = document.createElement('a');
  card.className = 'work-card';
  card.href = workUrl(work.slug);

  const thumb = document.createElement('div');
  thumb.className = 'work-card-thumb is-empty';

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = '';
  img.src = thumbUrl(work.slug);
  // Until a real thumbnail exists (F13), a 404 leaves the themed placeholder.
  img.addEventListener('error', () => {
    img.remove();
  });
  img.addEventListener('load', () => {
    thumb.classList.remove('is-empty');
  });
  thumb.append(img);
  const loadCore = CORE_LOADERS[work.slug];
  if (work.thumbPreview && loadCore) {
    attachThumbPreview({
      host: thumb,
      trigger: card,
      preview: work.thumbPreview,
      loadCore,
    });
  }

  const body = document.createElement('div');
  body.className = 'work-card-body';

  const heading = document.createElement('div');
  heading.className = 'work-card-heading';

  const title = document.createElement('h2');
  title.className = 'work-card-title';

  const chip = document.createElement('span');
  chip.className = `card-label-chip ${labelClass(work.label)}`;
  chip.textContent = work.label;

  heading.append(title, chip);

  const meta = document.createElement('div');
  meta.className = 'work-card-meta';
  const date = document.createElement('span');
  date.textContent = work.date;
  meta.append(date);

  body.append(heading, meta);
  card.append(thumb, body);

  const applyLocale = (): void => {
    title.textContent = work.title[getLocale()];
  };
  applyLocale();
  onLocaleChange(applyLocale);

  return card;
}

function render(root: HTMLElement): void {
  root.replaceChildren();

  const shell = document.createElement('div');
  shell.className = 'gallery-shell';

  const topbar = document.createElement('header');
  topbar.className = 'gallery-topbar';

  const headline = document.createElement('div');
  headline.className = 'gallery-headline';

  const title = document.createElement('h1');
  title.className = 'gallery-title';

  const tagline = document.createElement('p');
  tagline.className = 'gallery-tagline';

  headline.append(title, tagline);

  const localeToggle = createLocaleToggle();
  localeToggle.classList.add('gallery-locale-toggle');

  const topbarControls = document.createElement('div');
  topbarControls.className = 'topbar-controls';
  topbarControls.append(createPaletteToggle(), localeToggle);

  topbar.append(headline, topbarControls);
  shell.append(topbar);

  if (WORKS.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'gallery-empty';
    empty.textContent = 'No works yet.';
    shell.append(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    for (const work of WORKS) {
      grid.append(createCard(work));
    }
    shell.append(grid);
  }

  shell.append(createSiteFooter());
  root.append(shell);

  const applyLocale = (): void => {
    title.textContent = t('galleryTitle');
    tagline.textContent = t('galleryTagline');
  };
  applyLocale();
  onLocaleChange(applyLocale);
}

const root = document.getElementById('gallery');
if (!root) {
  throw new Error('Missing #gallery root');
}
render(root);
