/**
 * Dictation through the Web Speech API (Safari: webkitSpeechRecognition, recognition runs
 * through Apple). Optional: without the API the app hides the button and points to the
 * microphone of the iPad keyboard. Nothing is stored here; the text goes to the caller.
 */

interface RecognitionAlternative {
  transcript: string;
}

interface RecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: RecognitionAlternative;
}

export interface RecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  const scope = globalThis as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
}

export function dictationAvailable(): boolean {
  return recognitionConstructor() !== undefined;
}

export interface DictationHandlers {
  /** Recognised text that will not change any more. */
  onFinal: (text: string) => void;
  /** The text of the current sentence while speaking (replaced with every update). */
  onInterim: (text: string) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

export interface Dictation {
  stop(): void;
}

/** Starts German dictation; ends on stop(), after a pause or on an error. */
export function startDictation(handlers: DictationHandlers): Dictation {
  const Constructor = recognitionConstructor();
  if (!Constructor) throw new Error('Speech recognition is not available.');
  const recognition = new Constructor();
  recognition.lang = 'de-DE';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    let interim = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result?.[0]?.transcript.trim() ?? '';
      if (!result || !text) continue;
      if (result.isFinal) handlers.onFinal(text);
      else interim = `${interim} ${text}`.trim();
    }
    handlers.onInterim(interim);
  };
  recognition.onerror = (event) => {
    // "no-speech" and "aborted" are normal ends, not errors worth showing.
    if (event.error !== 'no-speech' && event.error !== 'aborted') handlers.onError(event.error);
  };
  recognition.onend = () => handlers.onEnd();
  recognition.start();
  return { stop: () => recognition.stop() };
}

/** Appends dictated text to a field: new sentence with a space, keeps existing line breaks. */
export function appendDictation(current: string | undefined, text: string): string {
  const base = current ?? '';
  if (!base.trim()) return text;
  return /\s$/.test(base) ? `${base}${text}` : `${base} ${text}`;
}
