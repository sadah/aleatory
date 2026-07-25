import './theme.css';
import './controls.css';

export interface SliderHandle {
  row: HTMLLabelElement;
  input: HTMLInputElement;
  setValue(v: number): void;
}

export interface ButtonHandle {
  button: HTMLButtonElement;
  setLabel(text: string): void;
  setIconClass(tablerClass: string): void;
  setDisabled(d: boolean): void;
}

export interface ToggleHandle {
  row: HTMLLabelElement;
  input: HTMLInputElement;
  setChecked(c: boolean): void;
}

export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format?: (v: number) => string;
  onInput?: (v: number) => void;
}

export interface ButtonOptions {
  label: string;
  iconClass?: string;
  onClick?: () => void;
}

export interface ToggleOptions {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

function defaultFormat(v: number): string {
  return String(v);
}

export function createSlider(parent: HTMLElement, opts: SliderOptions): SliderHandle {
  const format = opts.format ?? defaultFormat;

  const row = document.createElement('label');
  row.className = 'control-slider';

  const labelText = document.createElement('span');
  labelText.textContent = opts.label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(opts.min);
  input.max = String(opts.max);
  input.step = String(opts.step);

  const readout = document.createElement('span');
  readout.className = 'control-slider-value';

  const setValue = (v: number): void => {
    input.value = String(v);
    readout.textContent = format(v);
  };

  input.addEventListener('input', () => {
    const value = input.valueAsNumber;
    readout.textContent = format(value);
    opts.onInput?.(value);
  });

  setValue(opts.value);
  row.append(labelText, input, readout);
  parent.append(row);

  return { row, input, setValue };
}

export function createButton(parent: HTMLElement, opts: ButtonOptions): ButtonHandle {
  const button = document.createElement('button');
  button.type = 'button';

  let icon: HTMLElement | null = null;
  const label = document.createElement('span');

  const setIconClass = (tablerClass: string): void => {
    if (!icon) {
      icon = document.createElement('i');
      icon.setAttribute('aria-hidden', 'true');
      button.prepend(icon);
    }

    icon.className = `ti ${tablerClass}`;
  };

  const setLabel = (text: string): void => {
    label.textContent = text;
  };

  const setDisabled = (d: boolean): void => {
    button.disabled = d;
  };

  setLabel(opts.label);
  if (opts.iconClass) {
    setIconClass(opts.iconClass);
  }
  button.append(label);

  if (opts.onClick) {
    button.addEventListener('click', opts.onClick);
  }

  parent.append(button);

  return { button, setLabel, setIconClass, setDisabled };
}

export function createToggle(parent: HTMLElement, opts: ToggleOptions): ToggleHandle {
  const row = document.createElement('label');
  row.className = 'control-toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = opts.checked ?? false;

  const label = document.createElement('span');
  label.textContent = opts.label;

  input.addEventListener('change', () => {
    opts.onChange?.(input.checked);
  });

  const setChecked = (c: boolean): void => {
    input.checked = c;
  };

  row.append(input, label);
  parent.append(row);

  return { row, input, setChecked };
}
