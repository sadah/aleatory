import { createButton } from './controls';
import { onLocaleChange, t } from './i18n';
import { makeRng, randomSeed } from './rng';
import './theme.css';

// Re-exported so every existing `import { createSeedUI, makeRng } from './seed'`
// keeps working. New code that only needs the generator should import from
// './rng' directly — this module pulls in the controls stylesheet.
export { makeRng, randomSeed };

export interface SeedUIOptions {
  initialSeed: number;
  onSeedChange: (seed: number) => void;
}

export interface SeedUIHandle {
  element: HTMLElement;
  getSeed(): number;
  setSeed(seed: number): void;
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
