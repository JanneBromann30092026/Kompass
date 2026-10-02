/**
 * Calendar export (RFC 5545) for the iPad calendar: all-day events with a reminder the day
 * before. Pseudonymised by the caller – summary and description must not contain names,
 * contact data, birth dates or free text (see calendarEvents in calendar.ts).
 */

export interface IcsEvent {
  /** Unique and stable, e.g. the reminder id. */
  uid: string;
  /** All-day date "JJJJ-MM-TT". */
  date: string;
  summary: string;
  description?: string;
}

export interface IcsOptions {
  /** Text of the reminder alarm. */
  alarm: string;
  /** Alarm before the start of the day (all-day events start at 00:00): 15 h = 9:00 the day before. */
  alarmHoursBefore?: number;
}

/** Escapes text values (backslash, semicolon, comma, line breaks). */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

/** Folds a content line to at most 75 octets per line without splitting a character. */
export function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // Continuation lines start with a space, which counts towards the 75 octets.
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const compactDate = (date: string) => date.replace(/-/g, '');

function nextDay(date: string): string {
  const [y = 1970, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function stamp(now: Date): string {
  return `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

export function buildIcs(events: readonly IcsEvent[], now: Date, options: IcsOptions): string {
  const hours = options.alarmHoursBefore ?? 15;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kompass//Wiedervorlagen//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}@kompass`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(event.date))}`,
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(options.alarm)}`,
      `TRIGGER:-PT${hours}H`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
