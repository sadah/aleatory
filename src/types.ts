export type Locale = 'en' | 'ja';

export type Label = 'Study' | 'Tribute' | 'Original' | 'Reproduction';

export interface WorkParameter {
  /** Control label or symbol, shown as-is (matches the UI); shared across locales. */
  term: string;
  /** What the parameter means, per locale. */
  desc: Record<Locale, string>;
}

interface ThumbPreviewBase {
  /** The frame the poster JPEG corresponds to; also the still under reduced motion. */
  posterFrame: number;
  /** Frames advanced per rAF tick. 1 = 60 fps real time. */
  rate?: number;
  /** Core params overridden for the small canvas. */
  params: Record<string, number | boolean>;
}

/**
 * How a card's preview plays.
 *
 * `loop` cycles a window forever, and is only honest for a piece whose motion is
 * genuinely periodic over exactly that window — otherwise the wrap is a cut.
 * `forward` runs on from a start frame and never wraps: the right choice when a
 * piece is non-periodic, or when its one-way opening is the thing worth
 * watching. Forward playback restarts each time the card re-enters the viewport,
 * so the opening is not a one-time event a visitor can miss.
 *
 * A union rather than one shape with an unused field, so a `forward` entry cannot
 * carry a window that nothing reads.
 */
export type ThumbPreview =
  | (ThumbPreviewBase & { mode: 'loop'; window: [number, number] })
  | (ThumbPreviewBase & { mode: 'forward'; startFrame?: number });

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
