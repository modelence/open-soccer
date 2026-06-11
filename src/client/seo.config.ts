/**
 * Single source of truth for the site's <title>, meta description, and
 * Open Graph defaults.
 *
 * Per-page overrides go through the `<Seo />` component or the `seo` prop on
 * `<Page />`. The static fallback in `src/client/index.html` should mirror
 * `siteName` so non-JS crawlers and the first paint show the right title.
 *
 * IMPORTANT: update `siteName` and `description` here as soon as the real
 * product name and pitch are known. The defaults below are intentionally
 * generic placeholders — leaving them shipped will hurt SEO and social
 * previews.
 */

export interface SeoConfig {
  siteName: string;
  /**
   * Site-wide default meta description used when a page does not provide one.
   * Aim for 70–160 characters of plain prose (no marketing fluff, no emojis).
   */
  description: string;
  /** Renders the final <title>. Receives the per-page title (if any). */
  formatTitle: (title?: string) => string;
}

const siteName = 'PitchKick';

const description =
  'PitchKick is a fast, arcade browser football game. Grab the ball, beat the keeper, and score against the CPU using classic keyboard controls.';

export const seoConfig: SeoConfig = {
  siteName,
  description,
  formatTitle: (title) => (title ? `${title} · ${siteName}` : siteName),
};
