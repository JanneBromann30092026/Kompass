/**
 * Change history of customer records: which field changed, old → new. Pure and
 * framework-free; values are plain JSON data (decrypted records).
 */

export interface FieldChange {
  /** Dotted path, e.g. "occupation" or "contracts.bu". */
  path: string;
  from?: unknown;
  to?: unknown;
}

/** Fields that change with every write and say nothing about the content. */
export const HISTORY_IGNORED_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Arrays and other values compare by content (records are plain JSON).
  return JSON.stringify(a) === JSON.stringify(b);
}

function collect(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix: string,
  ignored: ReadonlySet<string>,
  changes: FieldChange[],
): void {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (ignored.has(path)) continue;
    const from = before[key];
    const to = after[key];
    if (isPlainObject(from) && isPlainObject(to)) {
      collect(from, to, path, ignored, changes);
      continue;
    }
    if (isPlainObject(from) && to === undefined) {
      collect(from, {}, path, ignored, changes);
      continue;
    }
    if (from === undefined && isPlainObject(to)) {
      collect({}, to, path, ignored, changes);
      continue;
    }
    if (sameValue(from, to)) continue;
    const change: FieldChange = { path };
    if (from !== undefined) change.from = from;
    if (to !== undefined) change.to = to;
    changes.push(change);
  }
}

/** Changes from `before` to `after`; nested objects are compared field by field. */
export function diffRecords(
  before: object,
  after: object,
  ignored: readonly string[] = HISTORY_IGNORED_FIELDS,
): FieldChange[] {
  const changes: FieldChange[] = [];
  collect(
    before as Record<string, unknown>,
    after as Record<string, unknown>,
    '',
    new Set(ignored),
    changes,
  );
  return changes;
}
