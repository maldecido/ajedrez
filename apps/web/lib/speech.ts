/**
 * Tipos minimos de la Web Speech API.
 *
 * No estan en lib.dom, y ademas la interfaz sigue siendo experimental: en
 * Chrome y Edge va con prefijo. Se declara solo lo que se usa.
 */

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/**
 * Idioma del reconocimiento. La arquitectura fija espanol (es-CO/es-ES); el
 * parser normaliza acentos, asi que la variante concreta no cambia el
 * resultado.
 */
export const SPEECH_LANG = "es-CO";

/** Devuelve el constructor disponible, o `null` si el navegador no lo trae. */
export function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate =
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor })
      .webkitSpeechRecognition;
  return candidate ?? null;
}
