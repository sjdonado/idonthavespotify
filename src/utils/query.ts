/**
 * Cleans a search query by removing problematic typographic characters
 * while preserving valid content (including emojis, $, !, etc.)
 */
export function cleanSearchQuery(query: string): string {
  return (
    query
      // Remove special quotation marks (German „", French «», Asian 『』, etc.)
      // U+201E „ U+201C " U+201D " U+00AB « U+00BB » U+2039 ‹ U+203A › U+300E 『 U+300F 』 U+300C 「 U+300D 」
      .replace(
        /[\u201E\u201C\u201D\u00AB\u00BB\u2039\u203A\u300E\u300F\u300C\u300D]/g,
        ''
      )
      // Normalize fancy apostrophes to standard apostrophe
      // U+2018 ' U+2019 ' U+201A ‚ U+201B ‛
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      // Normalize fancy double quotes to nothing (remove them)
      // U+201C " U+201D "
      .replace(/[\u201C\u201D]/g, '')
      // Remove middle dot (often used as metadata separator, not part of titles)
      // U+00B7 ·
      .replace(/\u00B7/g, ' ')
      // Normalize various dash types to standard hyphen
      // U+2013 – U+2014 — U+2015 ―
      .replace(/[\u2013\u2014\u2015]/g, '-')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Collapse multiple spaces and trim
      .replace(/\s+/g, ' ')
      .trim()
  );
}
