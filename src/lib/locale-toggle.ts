import { getLocale, onLocaleChange, toggleLocale } from './i18n';

/**
 * A language switch button: a translate icon plus the English name of the
 * language it switches TO (en -> "Japanese", ja -> "English"). Self-updates on
 * locale change. Shared by the gallery and every work page.
 */
export function createLocaleToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'locale-toggle';

  const icon = document.createElement('i');
  icon.className = 'ti ti-language';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');

  button.append(icon, label);
  button.addEventListener('click', toggleLocale);

  const render = (): void => {
    const target = getLocale() === 'en' ? 'Japanese' : 'English';
    label.textContent = target;
    button.setAttribute('aria-label', `Switch language to ${target}`);
  };
  render();
  onLocaleChange(render);

  return button;
}
