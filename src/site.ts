export interface SiteLink {
  label: string;
  href: string;
  icon: string;
}

export const SITE_AUTHOR = 'sadah';
export const SITE_COPYRIGHT = `© 2026 ${SITE_AUTHOR}`;

export const PROFILE_BIO = [
  'Taking a career break. Ex-AWS, Ex-Mercari',
  "📍 🇯🇵 → 🇵🇭 Jun '26 → 🇩🇰 DK Aug '26 - Jun '27 Folkehøjskole",
  'All opinions are my own.',
  'すきなこと寝ること。きらいなこと起きること。',
] as const;

export const SITE_LINKS: SiteLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/sadah',
    icon: 'ti-brand-github',
  },
  {
    label: 'X',
    href: 'https://x.com/sada_h/',
    icon: 'ti-brand-x',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/sadah/',
    icon: 'ti-brand-instagram',
  },
  {
    label: 'sadah.dev',
    href: 'https://sadah.dev',
    icon: 'ti-world',
  },
];
