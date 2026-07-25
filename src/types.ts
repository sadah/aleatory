export type Locale = 'en' | 'ja';

export type Label = 'Study' | 'Tribute' | 'Original' | 'Reproduction';

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
  tags: string[];
  // NOTE: no absolute URLs here. Paths are derived from slug + import.meta.env.BASE_URL at render time.
}
