import type { Locale } from '../types';

const STORAGE_KEY = 'aleatory:locale';
const DEFAULT_LOCALE: Locale = 'en';

export const UI_STRINGS: Record<string, Record<Locale, string>> = {
  backToGallery: {
    en: 'Back to gallery',
    ja: 'ギャラリーへ戻る',
  },
  aboutHeading: {
    en: 'About this work',
    ja: 'この作品について',
  },
  parametersHeading: {
    en: 'Parameters',
    ja: 'パラメーター',
  },
  play: {
    en: 'Play',
    ja: '再生',
  },
  pause: {
    en: 'Pause',
    ja: '一時停止',
  },
  reset: {
    en: 'Reset',
    ja: 'リセット',
  },
  seed: {
    en: 'Seed',
    ja: 'シード',
  },
  newSeed: {
    en: 'New seed',
    ja: '新しいシード',
  },
  applySeed: {
    en: 'Apply seed',
    ja: 'シードを適用',
  },
  seedInputLabel: {
    en: 'Seed value',
    ja: 'シード値',
  },
  downloadPng: {
    en: 'Download PNG',
    ja: 'PNGを保存',
  },
  record: {
    en: 'Record',
    ja: '録画',
  },
  stopRecording: {
    en: 'Stop recording',
    ja: '録画を停止',
  },
  videoChromeOnly: {
    en: 'Video export: desktop Chrome only.',
    ja: '動画書き出しはデスクトップ版Chromeのみ対応です。',
  },
  palette: {
    en: 'Palette',
    ja: 'パレット',
  },
  paletteDialogLabel: {
    en: 'Colour palette',
    ja: 'カラーパレット',
  },
  paletteCustom: {
    en: 'Custom',
    ja: 'カスタム',
  },
  paletteCoolHue: {
    en: 'Cool hue',
    ja: '寒色の色相',
  },
  paletteHotHue: {
    en: 'Hot hue',
    ja: '暖色の色相',
  },
  paletteChroma: {
    en: 'Chroma',
    ja: '彩度',
  },
  galleryTitle: {
    en: 'aleatory',
    ja: 'aleatory',
  },
  galleryTagline: {
    en: 'Generative studies in chance, motion, and light.',
    ja: '偶然、動き、光をめぐるジェネラティブ・スタディ。',
  },
  galleryLink: {
    en: 'Gallery',
    ja: 'ギャラリー',
  },
  aboutLink: {
    en: 'About',
    ja: 'プロフィール',
  },
  footerNavigation: {
    en: 'Site and social links',
    ja: 'サイトとソーシャルリンク',
  },
  aboutProfile: {
    en: 'About',
    ja: 'プロフィール',
  },
  profileLinks: {
    en: 'Find me online',
    ja: '外部リンク',
  },
  profileImageAlt: {
    en: 'sadah sitting on a rock above a mountain landscape.',
    ja: '山々を望む岩の上に座る sadah。',
  },
};

const subscribers = new Set<(locale: Locale) => void>();

let currentLocale = readStoredLocale();
applyDocumentLocale(currentLocale);

function isLocale(value: string | null): value is Locale {
  return value === 'en' || value === 'ja';
}

function readStoredLocale(): Locale {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

function persistLocale(locale: Locale): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale);
  }
}

function applyDocumentLocale(locale: Locale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  persistLocale(locale);
  applyDocumentLocale(locale);

  for (const subscriber of subscribers) {
    subscriber(locale);
  }
}

export function toggleLocale(): void {
  setLocale(currentLocale === 'en' ? 'ja' : 'en');
}

export function t(key: string): string {
  const entry = UI_STRINGS[key];
  if (!entry) {
    return key;
  }

  return entry[currentLocale] ?? key;
}

export function onLocaleChange(cb: (locale: Locale) => void): () => void {
  subscribers.add(cb);

  return () => {
    subscribers.delete(cb);
  };
}
