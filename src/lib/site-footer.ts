import { onLocaleChange, t } from './i18n';
import { SITE_COPYRIGHT, SITE_LINKS } from '../site';
import './site-footer.css';

function createFooterLink(
  label: string,
  href: string,
  iconClass?: string,
): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'site-footer-link';
  link.href = href;

  if (iconClass) {
    const icon = document.createElement('i');
    icon.className = `ti ${iconClass}`;
    icon.setAttribute('aria-hidden', 'true');
    link.append(icon);
  }

  const text = document.createElement('span');
  text.textContent = label;
  link.append(text);
  return link;
}

export function createSiteFooter(): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';

  const inner = document.createElement('div');
  inner.className = 'site-footer-inner';

  const nav = document.createElement('nav');
  nav.className = 'site-footer-nav';

  const galleryLink = createFooterLink(
    '',
    `${import.meta.env.BASE_URL}index.html`,
  );
  const aboutLink = createFooterLink(
    '',
    `${import.meta.env.BASE_URL}about.html`,
  );
  nav.append(galleryLink, aboutLink);

  for (const siteLink of SITE_LINKS) {
    nav.append(createFooterLink(siteLink.label, siteLink.href, siteLink.icon));
  }

  const copyright = document.createElement('p');
  copyright.className = 'site-footer-copyright';
  copyright.textContent = SITE_COPYRIGHT;

  inner.append(nav, copyright);
  footer.append(inner);

  const renderLocale = (): void => {
    nav.setAttribute('aria-label', t('footerNavigation'));
    galleryLink.querySelector('span')!.textContent = t('galleryLink');
    aboutLink.querySelector('span')!.textContent = t('aboutLink');
  };
  renderLocale();
  onLocaleChange(renderLocale);

  return footer;
}
