/** Accent- and case-insensitive text search (German): "ä" matches "a" and "ae", "ß" "ss". */

export function normalizeSearchText(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Spelling without umlauts: "ä" → "a" (users often type "unfahig" for "unfähig"). */
function plainSearchText(text: string): string {
  return text
    .toLocaleLowerCase('de-DE')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Both spellings of a text: with "ae" for "ä" and with plain "a". */
function searchForms(text: string): string[] {
  const forms = [normalizeSearchText(text), plainSearchText(text)];
  return forms[0] === forms[1] ? [forms[0] ?? ''] : forms;
}

export interface SearchDocument {
  /** Strongest field: name. */
  title: string;
  /** Alternative names, short names. */
  aliases?: readonly string[];
  /** Everything else that should be findable. */
  text?: readonly string[];
}

/**
 * Relevance of a document for a query (0 = no match). Every word of the query must occur;
 * matches in the title count most, then aliases, then the text.
 */
export function searchScore(document: SearchDocument, query: string): number {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const title = searchForms(document.title);
  const aliases = (document.aliases ?? []).flatMap(searchForms);
  const text = (document.text ?? []).flatMap(searchForms);
  let score = 0;
  for (const word of words) {
    const variants = searchForms(word);
    const has = (fields: string[], test: (field: string, v: string) => boolean) =>
      variants.some((v) => fields.some((field) => test(field, v)));
    const contains = (field: string, v: string) => field.includes(v);
    if (has(title, (field, v) => field.startsWith(v))) score += 12;
    else if (has(title, contains)) score += 8;
    else if (has(aliases, contains)) score += 6;
    else if (has(text, contains)) score += 2;
    else return 0;
  }
  return score;
}

/** Documents matching the query, best first (stable for equal scores). */
export function searchDocuments<T extends SearchDocument>(
  documents: readonly T[],
  query: string,
): T[] {
  return documents
    .map((document, index) => ({ document, index, score: searchScore(document, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.document);
}

/**
 * The text part that explains a match best (most query words), shortened for result
 * previews; undefined if only the title or an alias matched.
 */
export function searchSnippet(
  document: SearchDocument,
  query: string,
  maxLength = 160,
): string | undefined {
  const words = query.trim().split(/\s+/).filter(Boolean).map(searchForms);
  let best: { text: string; hits: number } | undefined;
  for (const text of document.text ?? []) {
    const forms = searchForms(text);
    const hits = words.filter((variants) =>
      variants.some((v) => forms.some((form) => form.includes(v))),
    ).length;
    if (hits > (best?.hits ?? 0)) best = { text, hits };
  }
  if (!best) return undefined;
  return best.text.length > maxLength
    ? `${best.text.slice(0, maxLength - 1).trimEnd()}…`
    : best.text;
}
