import type { Work } from '../types';
import { getLocale, onLocaleChange, t, toggleLocale } from './i18n';
import './theme.css';
import './frame.css';

export interface FrameHandles {
  root: HTMLElement;
  stage: HTMLDivElement;
  controlsBar: HTMLElement;
  seedSlot: HTMLElement;
  exportSlot: HTMLElement;
  destroy(): void;
}

function otherLanguageName(): string {
  return getLocale() === 'en' ? '日本語' : 'English';
}

function labelClass(label: string): string {
  return `label-${label.toLowerCase()}`;
}

export function buildFrame(root: HTMLElement, work: Work): FrameHandles {
  root.replaceChildren();
  root.classList.add('work-frame');

  const description = document.createElement('h2');
  description.className = 'sr-only';

  const header = document.createElement('header');
  header.className = 'work-header';

  const backLink = document.createElement('a');
  backLink.className = 'back-link';
  backLink.href = `${import.meta.env.BASE_URL}index.html`;

  const backIcon = document.createElement('i');
  backIcon.className = 'ti ti-arrow-left';
  backIcon.setAttribute('aria-hidden', 'true');

  const backText = document.createElement('span');
  backLink.append(backIcon, backText);

  const titleRow = document.createElement('div');
  titleRow.className = 'work-title-row';

  const title = document.createElement('h1');
  title.className = 'work-title';

  const labelChip = document.createElement('span');
  labelChip.className = `label-chip ${labelClass(work.label)}`;
  labelChip.textContent = work.label;

  titleRow.append(title, labelChip);
  header.append(backLink, titleRow);

  const stageWrap = document.createElement('div');
  stageWrap.className = 'stage-wrap';

  const stage = document.createElement('div');
  stage.className = 'stage';
  stageWrap.append(stage);

  const controlsBar = document.createElement('div');
  controlsBar.className = 'controls-bar';

  const footer = document.createElement('footer');
  footer.className = 'work-footer';

  const seedSlot = document.createElement('div');
  seedSlot.className = 'seed-slot';

  const exportSlot = document.createElement('div');
  exportSlot.className = 'export-slot';

  const localeToggle = document.createElement('button');
  localeToggle.className = 'locale-toggle';
  localeToggle.type = 'button';
  localeToggle.addEventListener('click', toggleLocale);

  footer.append(seedSlot, exportSlot, localeToggle);
  root.append(description, header, stageWrap, controlsBar, footer);

  const renderLocaleText = (): void => {
    const locale = getLocale();
    description.textContent = work.description[locale];
    title.textContent = work.title[locale];
    backText.textContent = t('backToGallery');
    localeToggle.textContent = otherLanguageName();
  };

  renderLocaleText();
  const unsubscribe = onLocaleChange(renderLocaleText);

  return {
    root,
    stage,
    controlsBar,
    seedSlot,
    exportSlot,
    destroy(): void {
      unsubscribe();
      root.replaceChildren();
      root.classList.remove('work-frame');
    },
  };
}
