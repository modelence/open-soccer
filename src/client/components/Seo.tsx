/**
 * Renders document `<head>` tags using React 19's native support for hoisting
 * `<title>` / `<meta>` elements out of components — React moves them into the
 * document `<head>` automatically, so no provider or portal is needed.
 *
 * Defaults come from `seoConfig` (see `src/client/seo.config.ts`). Render
 * `<Seo />` once at the app root so every page inherits the site-wide
 * title/description/OG tags; pass the `seo` prop to `<Page />` (or render
 * `<Seo />` again inside a page) to override per route.
 */

import { seoConfig } from '@/client/seo.config';

export interface SeoProps {
  /** Page-specific title; combined with `seoConfig.formatTitle`. */
  title?: string;
  /** Page-specific meta description; falls back to `seoConfig.description`. */
  description?: string;
  /** When true, asks crawlers not to index/follow this page. */
  noindex?: boolean;
}

export function Seo({ title, description, noindex }: SeoProps) {
  const finalTitle = seoConfig.formatTitle(title);
  const finalDescription = description ?? seoConfig.description;

  return (
    <>
      <title>{finalTitle}</title>
      {finalDescription && (
        <meta name="description" content={finalDescription} />
      )}
      <meta property="og:title" content={finalTitle} />
      {finalDescription && (
        <meta property="og:description" content={finalDescription} />
      )}
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      {finalDescription && (
        <meta name="twitter:description" content={finalDescription} />
      )}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </>
  );
}
