/**
 * Stable UUID (version 4 layout) from a text, e.g. for demo records: loading the demo data
 * twice yields the same ids, which makes the import idempotent. Not for anything secret.
 */
export function deterministicUuid(seed: string): string {
  // Four 32-bit FNV-1a hashes with different offsets give 128 bits.
  const words = [0x811c9dc5, 0x01000193, 0x5bd1e995, 0x27d4eb2f].map((offset) => {
    let hash = offset >>> 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  });
  const hex = words.join('');
  const variant = ((parseInt(hex.charAt(16), 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
