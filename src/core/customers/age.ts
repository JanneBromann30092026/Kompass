/**
 * Age, minority and birthdays from the birth date – or only the birth year, if that is all
 * the user knows. Calendar dates are "JJJJ-MM-TT" strings (local time).
 */
import { ageOn, daysBetween } from '../dates';

export interface BirthFacts {
  birthDate?: string;
  birthYear?: number;
}

/**
 * yes/no: certain. maybe: only the birth year is known and the 18th birthday falls into
 * this year (treated like a minor until the date is checked). unknown: no birth data.
 */
export type MinorStatus = 'yes' | 'no' | 'maybe' | 'unknown';

export interface AgeInfo {
  /** Age in whole years; with only the birth year the age this year (may be one less). */
  age?: number;
  /** True if derived from the birth year only. */
  approximate: boolean;
  minor: MinorStatus;
}

export const ADULT_AGE = 18;

export function ageInfo(person: BirthFacts, today: string): AgeInfo {
  if (person.birthDate) {
    const age = ageOn(person.birthDate, today);
    return { age, approximate: false, minor: age < ADULT_AGE ? 'yes' : 'no' };
  }
  if (person.birthYear) {
    // Age after this year's birthday; before it, one year less.
    const age = Number(today.slice(0, 4)) - person.birthYear;
    const minor = age < ADULT_AGE ? 'yes' : age === ADULT_AGE ? 'maybe' : 'no';
    return { age, approximate: true, minor };
  }
  return { approximate: false, minor: 'unknown' };
}

/** Minors and possible minors need the parents' consent (advice, contracts, marketing). */
export function needsParentalConsent(person: BirthFacts, today: string): boolean {
  const { minor } = ageInfo(person, today);
  return minor === 'yes' || minor === 'maybe';
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The birthday in a given year; 29 February is celebrated on 28 February in other years. */
export function birthdayInYear(birthDate: string, year: number): string {
  const monthDay = birthDate.slice(5);
  const day = monthDay === '02-29' && !isLeapYear(year) ? '02-28' : monthDay;
  return `${String(year).padStart(4, '0')}-${day}`;
}

/** Next birthday on or after today. */
export function nextBirthday(birthDate: string, today: string): string {
  const year = Number(today.slice(0, 4));
  const thisYear = birthdayInYear(birthDate, year);
  return thisYear >= today ? thisYear : birthdayInYear(birthDate, year + 1);
}

/** Days until the next birthday (0 = today). */
export function daysUntilBirthday(birthDate: string, today: string): number {
  return daysBetween(today, nextBirthday(birthDate, today));
}
