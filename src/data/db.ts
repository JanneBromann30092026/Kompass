import { Dexie, type EntityTable } from 'dexie';
import type {
  EncryptedRow,
  ErrorLogRow,
  MetaEntry,
  SecretRow,
  Setting,
  SnapshotRow,
} from './types';

/** Own name: Synapse runs on the same origin (GitHub Pages) and uses "synapse". */
export const DB_NAME = 'kompass';

/** Tables with customer data (decrypted into the in-memory store after unlocking). */
export const DATA_TABLES = [
  'customers',
  'needs',
  'reminders',
  'lifeEvents',
  'conversations',
  'campaigns',
  'history',
] as const;
export type DataTable = (typeof DATA_TABLES)[number];

export class KompassDb extends Dexie {
  settings!: EntityTable<Setting, 'key'>;
  meta!: EntityTable<MetaEntry, 'key'>;
  customers!: EntityTable<EncryptedRow, 'id'>;
  needs!: EntityTable<EncryptedRow, 'id'>;
  reminders!: EntityTable<EncryptedRow, 'id'>;
  lifeEvents!: EntityTable<EncryptedRow, 'id'>;
  conversations!: EntityTable<EncryptedRow, 'id'>;
  campaigns!: EntityTable<EncryptedRow, 'id'>;
  history!: EntityTable<EncryptedRow, 'id'>;
  secrets!: EntityTable<SecretRow, 'key'>;
  snapshots!: EntityTable<SnapshotRow, 'id'>;
  errorLog!: EntityTable<ErrorLogRow, 'id'>;

  constructor(name = DB_NAME) {
    super(name);

    /*
     * Migrations: never change an existing version. Every schema change is a new
     * `this.version(n + 1).stores({...changed tables only}).upgrade(tx => ...)`.
     * Only indexed fields are listed; all other fields are stored anyway.
     * Personal data only ever lives in the encrypted `payload` of a row; readable are
     * only technical fields (ids, foreign keys, timestamps).
     */

    // Step 1: technical settings only (theme, motion, developer mode). Unencrypted on
    // purpose: they contain no personal data and are needed before the app is unlocked.
    this.version(1).stores({
      settings: 'key',
    });

    // Step 2: vault parameters and the encrypted tables (new tables, nothing to migrate).
    this.version(2).stores({
      meta: 'key',
      customers: 'id, updatedAt',
      needs: 'id, customerId, updatedAt',
      reminders: 'id, customerId, updatedAt',
      lifeEvents: 'id, customerId, updatedAt',
      conversations: 'id, customerId, updatedAt',
      campaigns: 'id, updatedAt',
      history: 'id, customerId, updatedAt',
      secrets: 'key',
      snapshots: 'id, createdAt',
      errorLog: 'id, at',
    });
  }
}

export const db = new KompassDb();

export type DbOpenErrorReason = 'unavailable' | 'quota' | 'version' | 'unknown';

export type DbOpenResult = { ok: true } | { ok: false; reason: DbOpenErrorReason };

function errorNames(error: unknown): string[] {
  const names: string[] = [];
  let current: unknown = error;
  // Dexie wraps the native error (e.g. OpenFailedError → inner QuotaExceededError).
  for (let depth = 0; depth < 5 && current instanceof Error; depth += 1) {
    names.push(current.name);
    current = (current as Error & { inner?: unknown }).inner;
  }
  return names;
}

export function classifyOpenError(error: unknown): DbOpenErrorReason {
  const names = errorNames(error);
  if (names.includes('QuotaExceededError')) return 'quota';
  if (names.includes('VersionError')) return 'version';
  if (
    names.includes('MissingAPIError') ||
    names.includes('InvalidStateError') ||
    names.includes('SecurityError') ||
    names.includes('UnknownError')
  ) {
    // No IndexedDB (private mode, disabled storage) or the browser refused access.
    return 'unavailable';
  }
  return 'unknown';
}

/** Opens the database once at startup. Never throws; the UI shows the reason on failure. */
export async function openDatabase(database: KompassDb = db): Promise<DbOpenResult> {
  try {
    await database.open();
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, reason: classifyOpenError(error) };
  }
}
