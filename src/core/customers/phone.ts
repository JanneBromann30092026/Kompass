/**
 * Phone numbers: normalised to the international format when saving, so calls and
 * WhatsApp links work ("0151 123 4567" → "+49 151 123 4567").
 */

/** Default country code for numbers with a national prefix (0…). */
export const DEFAULT_COUNTRY_CODE = '49';

/**
 * International format with the user's grouping kept. Numbers without "+", "00" or "0"
 * stay as typed (the country cannot be guessed).
 */
export function normalizePhone(input: string, countryCode = DEFAULT_COUNTRY_CODE): string {
  let value = input
    .trim()
    // "+49 (0)151 …": the optional national zero must go.
    .replace(/\(0\)/g, ' ')
    .replace(/[^\d+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return '';
  if (value.startsWith('00')) value = `+${value.slice(2).trimStart()}`;
  else if (value.startsWith('0')) value = `+${countryCode} ${value.slice(1).trimStart()}`;
  // A "+" only belongs at the start.
  value = value.charAt(0) + value.slice(1).replace(/\+/g, '');
  return value.replace(/^\+\s+/, '+');
}

/** Digits with a leading "+" (for tel: links), e.g. "+491511234567". */
export function phoneDial(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return phone.trim().startsWith('+') ? `+${digits}` : digits;
}

export function isInternationalPhone(phone: string): boolean {
  return /^\+\d{6,}$/.test(phoneDial(phone));
}

export function telHref(phone: string): string {
  return `tel:${phoneDial(phone)}`;
}

/** WhatsApp click-to-chat needs the international number without "+" (null if unknown). */
export function whatsappHref(phone: string): string | null {
  if (!isInternationalPhone(phone)) return null;
  return `https://wa.me/${phoneDial(phone).slice(1)}`;
}

export function mailtoHref(email: string): string {
  return `mailto:${email.trim()}`;
}
