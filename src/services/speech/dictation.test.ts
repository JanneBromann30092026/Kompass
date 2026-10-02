import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appendDictation,
  dictationAvailable,
  startDictation,
  type RecognitionResultEvent,
} from './dictation';

class FakeRecognition {
  static last: FakeRecognition | undefined;
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {}
}

function result(transcript: string, isFinal: boolean) {
  return Object.assign([{ transcript }], { isFinal });
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
});

describe('dictation', () => {
  it('is hidden without the API', () => {
    expect(dictationAvailable()).toBe(false);
    expect(() =>
      startDictation({ onFinal() {}, onInterim() {}, onEnd() {}, onError() {} }),
    ).toThrow();
  });

  it('German, continuous, final and interim text, normal ends are no errors', () => {
    (globalThis as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    expect(dictationAvailable()).toBe(true);
    const handlers = { onFinal: vi.fn(), onInterim: vi.fn(), onEnd: vi.fn(), onError: vi.fn() };
    const dictation = startDictation(handlers);
    const fake = FakeRecognition.last!;
    expect(fake).toMatchObject({
      lang: 'de-DE',
      continuous: true,
      interimResults: true,
      started: true,
    });

    const results = [result('BU besprochen', true), result('Angebot', false)];
    fake.onresult?.({ resultIndex: 0, results: Object.assign(results, { length: 2 }) });
    expect(handlers.onFinal).toHaveBeenCalledWith('BU besprochen');
    expect(handlers.onInterim).toHaveBeenLastCalledWith('Angebot');

    fake.onerror?.({ error: 'no-speech' });
    expect(handlers.onError).not.toHaveBeenCalled();
    fake.onerror?.({ error: 'not-allowed' });
    expect(handlers.onError).toHaveBeenCalledWith('not-allowed');

    dictation.stop();
    expect(handlers.onEnd).toHaveBeenCalled();
  });

  it('appends to the field', () => {
    expect(appendDictation(undefined, 'Hallo')).toBe('Hallo');
    expect(appendDictation('  ', 'Hallo')).toBe('Hallo');
    expect(appendDictation('Erster Satz.', 'Zweiter')).toBe('Erster Satz. Zweiter');
    expect(appendDictation('Liste:\n', 'Punkt')).toBe('Liste:\nPunkt');
  });
});
