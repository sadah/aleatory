export type Locale = 'en' | 'ja';

export type Label = 'Study' | 'Tribute' | 'Original' | 'Reproduction';

export interface WorkParameter {
  /** Control label or symbol, shown as-is (matches the UI); shared across locales. */
  term: string;
  /** What the parameter means, per locale. */
  desc: Record<Locale, string>;
}

export interface ThumbPreview {
  /** The frame the poster JPEG corresponds to; also the still used on touch. */
  posterFrame: number;
  /** Inclusive frame window the hover playback loops over. */
  window: [number, number];
  /** Frames advanced per rAF tick. 1 = 60 fps real time. */
  rate?: number;
  /** Core params overridden for the small canvas. */
  params: Record<string, number | boolean>;
}

export interface Work {
  /** Drives derived paths: works/<slug>.html, src/works/<slug>.ts, thumbs/<slug>.jpg */
  slug: string;
  label: Label;
  /** ISO 'YYYY-MM-DD' */
  date: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  /** Optional visible "About" prose, one string per paragraph, per locale. */
  about?: Record<Locale, string[]>;
  /** Optional parameter glossary, rendered as a definition list under About. */
  parameters?: WorkParameter[];
  thumbPreview?: ThumbPreview;
  // NOTE: no absolute URLs here. Paths are derived from slug + import.meta.env.BASE_URL at render time.
}
