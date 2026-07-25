import { createButton } from './controls';
import { onLocaleChange, t } from './i18n';
import './theme.css';

export function makeRng(seed: number): () => number {
  const seedHash = xmur3(String(seed));
  return mulberry32(seedHash());
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000);
}

export interface SeedUIOptions {
  initialSeed: number;
  onSeedChange: (seed: number) => void;
}

export interface SeedUIHandle {
  element: HTMLElement;
  getSeed(): number;
  setSeed(seed: number): void;
}

function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;

  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeedUI(parent: HTMLElement, opts: SeedUIOptions): SeedUIHandle {
  let currentSeed = opts.initialSeed;

  const element = document.createElement('div');
  element.className = 'seed-ui';
  element.style.display = 'flex';
  element.style.alignItems = 'center';
  element.style.justifyContent = 'center';
  element.style.flexWrap = 'wrap';
  element.style.gap = 'var(--space-2)';

  const seedLabel = document.createElement('span');
  seedLabel.style.color = 'var(--color-text-secondary)';

  const seedValue = document.createElement('span');
  seedValue.style.fontFamily = 'var(--font-mono)';
  seedValue.style.color = 'var(--color-text-primary)';

  const inputLabel = document.createElement('label');
  inputLabel.className = 'sr-only';

  const input = document.createElement('input');
  input.type = 'number';
  input.step = '1';
  input.inputMode = 'numeric';
  input.style.width = '11rem';

  inputLabel.append(input);

  const setSeed = (seed: number): void => {
    currentSeed = Math.trunc(seed);
    seedValue.textContent = String(currentSeed);
    input.value = String(currentSeed);
  };

  const fireSeedChange = (seed: number): void => {
    setSeed(seed);
    opts.onSeedChange(currentSeed);
  };

  const newSeedButton = createButton(element, {
    label: t('newSeed'),
    iconClass: 'ti-dice',
    onClick: () => {
      fireSeedChange(randomSeed());
    },
  });

  const applyButton = createButton(element, {
    label: t('applySeed'),
    onClick: () => {
      const parsed = input.valueAsNumber;
      if (Number.isFinite(parsed)) {
        fireSeedChange(parsed);
      }
    },
  });

  const renderLocaleText = (): void => {
    seedLabel.textContent = `${t('seed')}:`;
    inputLabel.setAttribute('aria-label', t('seedInputLabel'));
    input.setAttribute('aria-label', t('seedInputLabel'));
    newSeedButton.setLabel(t('newSeed'));
    applyButton.setLabel(t('applySeed'));
  };

  element.prepend(seedLabel, seedValue);
  element.insertBefore(inputLabel, applyButton.button);

  setSeed(currentSeed);
  renderLocaleText();
  onLocaleChange(renderLocaleText);

  parent.append(element);

  return {
    element,
    getSeed(): number {
      return currentSeed;
    },
    setSeed,
  };
}
