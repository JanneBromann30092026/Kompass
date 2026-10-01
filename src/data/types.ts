import type { EncryptedPayload } from '@/core/crypto/format';

/** Technical app setting (theme, developer mode …). Never personal data. */
export interface Setting {
  key: string;
  value: unknown;
}

/** Technical key-value entry (vault parameters, customer counter, failed attempts). */
export interface MetaEntry {
  key: string;
  value: unknown;
}

/**
 * Stored row of an encrypted table. Only technical fields stay readable; everything
 * personal is inside the AES-GCM payload.
 */
export interface EncryptedRow {
  id: string;
  /** Foreign key for records that belong to a customer. */
  customerId?: string;
  updatedAt: string;
  payload: EncryptedPayload;
}

/** Encrypted secret, e.g. the optional API key (step 10). */
export interface SecretRow {
  key: string;
  updatedAt: string;
  payload: EncryptedPayload;
}

/** Encrypted snapshot of all data (backups, step 12). */
export interface SnapshotRow {
  id: string;
  createdAt: string;
  payload: EncryptedPayload;
}

/** Encrypted error log entry (error messages can contain personal data). */
export interface ErrorLogRow {
  id: string;
  at: string;
  payload: EncryptedPayload;
}
