/**
 * Smart token-based fuzzy/substring search match function.
 * 
 * Features:
 * - Trims leading & trailing whitespace automatically (preventing loss of results when pressing space).
 * - Splits search query into individual search tokens (e.g. "philosophy quote" -> ["philosophy", "quote"]).
 * - Strips leading '#' or '@' symbols so searching "#dev" or "dev" matches both tags and body text.
 * - Requires EVERY token to match at least one of the item's text fields (AND-matching).
 */
export function smartSearchMatch(
  fields: (string | null | undefined | (string | null | undefined)[])[],
  query: string
): boolean {
  if (!query || !query.trim()) return true;

  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/^[#@]+/, '').trim())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const searchableTexts: string[] = [];

  fields.forEach((field) => {
    if (!field) return;
    if (Array.isArray(field)) {
      field.forEach((f) => {
        if (f) searchableTexts.push(f.toLowerCase());
      });
    } else {
      searchableTexts.push(field.toLowerCase());
    }
  });

  const combinedText = searchableTexts.join(' ');

  return tokens.every((token) => combinedText.includes(token));
}
