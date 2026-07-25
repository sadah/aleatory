export type Locale = 'en' | 'ja';

export type Label = 'Study' | 'Tribute' | 'Original' | 'Reproduction';

export interface WorkParameter {
  /** Control label or symbol, shown as-is (matches the UI); shared across locales. */
  term: string;
  /** What the parameter means, per locale. */
  desc: Record<Locale, string>;
}

export interface Work {
  /** Drives derived paths: works/<slug>.html, src/works/<slug>.ts, thumbs/<slug>.png */
  slug: string;
  label: Label;
  /** ISO 'YYYY-MM-DD' */
  date: string;
  /** true -> video export enabled; false -> PNG only */
  animated: boolean;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  /** Optional visible "About" prose, one string per paragraph, per locale. */
  about?: Record<Locale, string[]>;
  /** Optional parameter glossary, rendered as a definition list under About. */
  parameters?: WorkParameter[];
  tags: string[];
  // NOTE: no absolute URLs here. Paths are derived from slug + import.meta.env.BASE_URL at render time.
}
