import './palette-picker.css';
import { createSlider, type SliderHandle } from './controls';
import { getLocale, onLocaleChange, t } from './i18n';
import {
  CUSTOM_PALETTE_ID,
  PALETTES,
  SWATCH_PROFILE,
  getCustomKnobs,
  getCustomPalette,
  getPalette,
  onPaletteChange,
  rampGradientCss,
  resolveRamp,
  setCustomKnobs,
  setPalette,
  type Palette,
} from './palette';

const RADIO_GROUP = 'aleatory-palette';

/**
 * The palette switch: a swatch list of presets plus a Custom mode with hue and
 * chroma sliders. Lives in the topbar next to the language toggle on the gallery
 * and on every work page.
 *
 * A standalone module rather than a fourth factory in `controls.ts`: those three
 * are deliberately state-free primitives, whereas this owns app state and a
 * popover. `locale-toggle.ts` is the precedent for a self-updating topbar
 * control. It does reuse `createSlider` for the Custom knobs.
 *
 * Returns a wrapper, not the button, because the popover needs a positioning
 * context and neither caller should have to know that.
 */
export function createPaletteToggle(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'palette-toggle';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'palette-toggle-button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');

  const icon = document.createElement('i');
  icon.className = 'ti ti-palette';
  icon.setAttribute('aria-hidden', 'true');
  const buttonLabel = document.createElement('span');
  button.append(icon, buttonLabel);

  const popover = document.createElement('div');
  popover.className = 'palette-popover';
  popover.setAttribute('role', 'dialog');
  popover.hidden = true;

  // A real fieldset of real radios: arrow-key roving focus and correct group
  // semantics come for free, where a div soup would need both hand-built.
  const fieldset = document.createElement('fieldset');
  fieldset.className = 'palette-presets';
  const legend = document.createElement('legend');
  legend.className = 'sr-only';
  fieldset.append(legend);

  interface Row {
    id: string;
    input: HTMLInputElement;
    swatch: HTMLSpanElement;
    name: HTMLSpanElement;
    palette: Palette | null;
  }
  const rows: Row[] = [];

  function addRow(id: string, palette: Palette | null): void {
    const row = document.createElement('label');
    row.className = 'palette-option';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = RADIO_GROUP;
    input.value = id;
    input.className = 'sr-only';

    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch';
    swatch.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'palette-option-name';

    row.append(input, swatch, name);
    fieldset.append(row);
    rows.push({ id, input, swatch, name, palette });

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      setPalette(id);
    });
  }

  for (const preset of PALETTES) {
    addRow(preset.id, preset);
  }
  addRow(CUSTOM_PALETTE_ID, null);

  const custom = document.createElement('div');
  custom.className = 'palette-custom';

  const knobs = getCustomKnobs();
  const coolSlider: SliderHandle = createSlider(custom, {
    label: t('paletteCoolHue'),
    min: 0,
    max: 359,
    step: 1,
    value: knobs.coolHue,
    format: (v) => `${Math.round(v)}°`,
    onInput: (v) => setCustomKnobs({ coolHue: v }),
  });
  const hotSlider: SliderHandle = createSlider(custom, {
    label: t('paletteHotHue'),
    min: 0,
    max: 359,
    step: 1,
    value: knobs.hotHue,
    format: (v) => `${Math.round(v)}°`,
    onInput: (v) => setCustomKnobs({ hotHue: v }),
  });
  // 0-100% of the chroma the chosen hues can actually carry, so the slider stays
  // meaningful all the way round the wheel instead of going dead wherever sRGB
  // happens to be narrow. See `chromaHeadroom` in palette.ts.
  const chromaSlider: SliderHandle = createSlider(custom, {
    label: t('paletteChroma'),
    min: 0,
    max: 1,
    step: 0.02,
    value: knobs.chroma,
    format: (v) => `${Math.round(v * 100)}%`,
    onInput: (v) => setCustomKnobs({ chroma: v }),
  });

  popover.append(fieldset, custom);
  wrap.append(button, popover);

  // --- open / close ---------------------------------------------------------

  let onDocPointerDown: ((e: PointerEvent) => void) | null = null;

  function close(): void {
    if (popover.hidden) {
      return;
    }
    popover.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (onDocPointerDown) {
      document.removeEventListener('pointerdown', onDocPointerDown);
      onDocPointerDown = null;
    }
  }

  function open(): void {
    popover.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const checked = rows.find((r) => r.input.checked);
    checked?.input.focus();

    onDocPointerDown = (event: PointerEvent): void => {
      if (!wrap.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('pointerdown', onDocPointerDown);
  }

  button.addEventListener('click', () => {
    if (popover.hidden) {
      open();
    } else {
      close();
    }
  });

  wrap.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !popover.hidden) {
      event.stopPropagation();
      close();
      button.focus();
    }
  });

  // --- rendering -----------------------------------------------------------

  function renderSwatches(): void {
    for (const row of rows) {
      // Custom always previews wherever its knobs currently sit. Showing a
      // hatched placeholder instead read as one broken row in a column of colour
      // bars, and the knobs always have values, so there is always something to
      // show.
      const shown = row.palette ?? getCustomPalette();
      row.swatch.style.background =
        `linear-gradient(90deg, ${rampGradientCss(resolveRamp(SWATCH_PROFILE, shown))})`;
    }
  }

  function renderNames(): void {
    const locale = getLocale();
    buttonLabel.textContent = t('palette');
    button.setAttribute('aria-label', t('paletteDialogLabel'));
    legend.textContent = t('paletteDialogLabel');
    for (const row of rows) {
      row.name.textContent = row.palette ? row.palette.name[locale] : t('paletteCustom');
    }
    // createSlider's row is <label><span>name</span><input><span class="…-value">.
    const nameSpan = (h: SliderHandle): HTMLSpanElement | null =>
      h.row.querySelector('span:not(.control-slider-value)');
    const cool = nameSpan(coolSlider);
    if (cool) cool.textContent = t('paletteCoolHue');
    const hot = nameSpan(hotSlider);
    if (hot) hot.textContent = t('paletteHotHue');
    const chroma = nameSpan(chromaSlider);
    if (chroma) chroma.textContent = t('paletteChroma');
  }

  function renderSelection(): void {
    const active = getPalette();
    for (const row of rows) {
      row.input.checked = row.id === active.id;
    }
    // The sliders always show the Custom knobs, never the active preset's hues.
    // They sit inside the Custom section and its swatch previews exactly these
    // values, so syncing them to a preset would make the swatch and the sliders
    // disagree. What the Custom swatch shows is what clicking Custom gives you.
    const knobs = getCustomKnobs();
    coolSlider.setValue(knobs.coolHue);
    hotSlider.setValue(knobs.hotHue);
    chromaSlider.setValue(knobs.chroma);
  }

  renderNames();
  renderSwatches();
  renderSelection();

  onLocaleChange(renderNames);
  onPaletteChange(() => {
    renderSelection();
    renderSwatches();
  });

  return wrap;
}
