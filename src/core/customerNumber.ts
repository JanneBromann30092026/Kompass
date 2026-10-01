/** Customer numbers "K-0001": sequential, never reused (the counter lives in meta). */

export const CUSTOMER_NUMBER_PATTERN = /^K-\d{4,}$/;

export function formatCustomerNumber(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Invalid customer sequence: ${sequence}`);
  }
  return `K-${String(sequence).padStart(4, '0')}`;
}

/** Sequence of a customer number, or null for anything else. */
export function parseCustomerNumber(value: string): number | null {
  return CUSTOMER_NUMBER_PATTERN.test(value) ? Number(value.slice(2)) : null;
}
