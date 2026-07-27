import './lib/theme.css';
import './about.css';
import { getLocale, onLocaleChange, t } from './lib/i18n';
import { createLocaleToggle } from './lib/locale-toggle';
import { createPaletteToggle } from './lib/palette-picker';
import { createSiteFooter } from './lib/site-footer';
import { PROFILE_BIO, SITE_AUTHOR, SITE_LINKS } from './site';

function createProfileLink(
  label: string,
  href: string,
  iconClass: string,
): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'profile-link';
  link.href = href;

  const icon = document.createElement('i');
  icon.className = `ti ${iconClass}`;
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = label;
  link.append(icon, text);
  return link;
}

function render(root: HTMLElement): void {
  root.replaceChildren();

  const shell = document.createElement('div');
  shell.className = 'about-shell';

  const topbar = document.createElement('header');
  topbar.className = 'about-topbar';

  const backLink = document.createElement('a');
  backLink.className = 'back-link';
  backLink.href = `${import.meta.env.BASE_URL}index.html`;

  const backIcon = document.createElement('i');
  backIcon.className = 'ti ti-arrow-left';
  backIcon.setAttribute('aria-hidden', 'true');

  const backText = document.createElement('span');
  backLink.append(backIcon, backText);

  const topbarControls = document.createElement('div');
  topbarControls.className = 'topbar-controls';
  topbarControls.append(createPaletteToggle(), createLocaleToggle());
  topbar.append(backLink, topbarControls);

  const profile = document.createElement('article');
  profile.className = 'profile';

  const portrait = document.createElement('img');
  portrait.className = 'profile-portrait';
  portrait.src = `${import.meta.env.BASE_URL}profile/sadah.jpg`;
  portrait.width = 400;
  portrait.height = 400;

  const content = document.createElement('div');
  content.className = 'profile-content';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'profile-eyebrow';

  const heading = document.createElement('h1');
  heading.className = 'profile-name';
  heading.textContent = SITE_AUTHOR;

  const bio = document.createElement('div');
  bio.className = 'profile-bio';
  bio.append(
    ...PROFILE_BIO.map((line) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line;
      return paragraph;
    }),
  );

  const linksHeading = document.createElement('h2');
  linksHeading.className = 'sr-only';

  const links = document.createElement('div');
  links.className = 'profile-links';
  for (const siteLink of SITE_LINKS) {
    links.append(
      createProfileLink(siteLink.label, siteLink.href, siteLink.icon),
    );
  }

  content.append(eyebrow, heading, bio, linksHeading, links);
  profile.append(portrait, content);
  shell.append(topbar, profile, createSiteFooter());
  root.append(shell);

  const renderLocale = (): void => {
    const locale = getLocale();
    backText.textContent = t('backToGallery');
    eyebrow.textContent = t('aboutProfile');
    linksHeading.textContent = t('profileLinks');
    portrait.alt = t('profileImageAlt');
    document.title =
      locale === 'en' ? 'About sadah · aleatory' : 'sadah について · aleatory';
  };
  renderLocale();
  onLocaleChange(renderLocale);
}

const root = document.getElementById('about');
if (!root) {
  throw new Error('Missing #about root');
}
render(root);
