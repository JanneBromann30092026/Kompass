import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchDocuments, searchScore, searchSnippet } from './search';

const docs = [
  { title: 'Berufsunfähigkeitsversicherung', aliases: ['BU'], text: ['Rente bei Krankheit'] },
  { title: 'Hausratversicherung', aliases: ['Hausrat'], text: ['Einbruch, Leitungswasser'] },
  {
    title: '18. Geburtstag',
    aliases: ['Volljährigkeit'],
    text: ['Werbeeinwilligung neu einholen'],
  },
];

describe('search', () => {
  it('normalizes umlauts, ß, case and whitespace', () => {
    expect(normalizeSearchText('  Größe  Übung ')).toBe('groesse uebung');
  });

  it('finds words regardless of umlaut spelling', () => {
    expect(searchDocuments(docs, 'volljahrigkeit')[0]?.title).toBe('18. Geburtstag');
    expect(searchDocuments(docs, 'volljaehrigkeit')[0]?.title).toBe('18. Geburtstag');
    expect(searchDocuments(docs, 'unfähig')[0]?.title).toBe('Berufsunfähigkeitsversicherung');
    expect(searchDocuments(docs, 'unfahig')[0]?.title).toBe('Berufsunfähigkeitsversicherung');
  });

  it('requires every word and ranks title matches first', () => {
    expect(searchDocuments(docs, 'bu krankheit')).toHaveLength(1);
    expect(searchDocuments(docs, 'bu einbruch')).toHaveLength(0);
    expect(searchScore(docs[1]!, 'hausrat')).toBeGreaterThan(searchScore(docs[1]!, 'einbruch'));
    expect(searchDocuments(docs, '')).toEqual([]);
  });

  it('picks the text part with the most query words as snippet', () => {
    const document = {
      title: 'BU',
      text: ['Zahlt eine Rente.', 'Nachversicherung ohne Gesundheitsprüfung möglich.'],
    };
    expect(searchSnippet(document, 'gesundheitsprufung nachvers')).toBe(
      'Nachversicherung ohne Gesundheitsprüfung möglich.',
    );
    expect(searchSnippet(document, 'bu')).toBeUndefined();
    expect(searchSnippet({ title: 'X', text: ['a'.repeat(200)] }, 'a', 20)).toHaveLength(20);
  });
});
