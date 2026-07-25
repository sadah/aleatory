import type { Work } from './types';

export const WORKS: Work[] = [
  {
    slug: 'lorenz-attractor',
    label: 'Study',
    date: '2026-07-23',
    animated: true,
    title: { en: 'Lorenz Attractor', ja: 'ローレンツ・アトラクター' },
    description: {
      en: 'A rotating 3D Lorenz strange attractor traced as a glowing ribbon, colored by instantaneous speed.',
      ja: '速度に応じて色づく発光リボンとして描いた、回転する3Dローレンツ・アトラクター。',
    },
    tags: ['strange-attractor', 'chaos', 'rk4', 'glow'],
  },
];
