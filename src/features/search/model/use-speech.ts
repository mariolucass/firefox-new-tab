import { useCallback, useEffect, useRef, useState } from "react";

type Alternative = { transcript: string };
type Result = ArrayLike<Alternative> & { isFinal: boolean };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult:
    | ((event: { resultIndex: number; results: ArrayLike<Result> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionConstructor = new () => Recognition;

function constructorOf(): RecognitionConstructor | null {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

/**
 * Ditado pelo reconhecimento de fala do navegador (Web Speech API). O Firefox
 * não tem essa API: lá `supported` é false e quem chama mostra o caminho
 * alternativo (ditado do sistema). Parcial vai chegando em `onText(texto,
 * false)`; a frase final, em `onText(texto, true)`.
 */
export function useSpeech(
  onText: (text: string, final: boolean) => void,
  lang = "en-US",
) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const callback = useRef(onText);
  callback.current = onText;

  useEffect(() => {
    setSupported(constructorOf() !== null);
    return () => recognition.current?.abort();
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = constructorOf();
    if (!Ctor) return false;
    setError(null);
    const next = new Ctor();
    next.lang = lang;
    next.interimResults = true;
    next.continuous = false;
    next.maxAlternatives = 1;
    next.onresult = (event) => {
      let text = "";
      let final = false;
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        text += event.results[index][0].transcript;
        final = final || event.results[index].isFinal;
      }
      callback.current(text, final);
    };
    next.onerror = (event) => {
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "O navegador bloqueou o microfone."
          : event.error === "no-speech"
            ? "Não ouvi nada."
            : "O ditado falhou.",
      );
    };
    next.onend = () => setListening(false);
    recognition.current = next;
    setListening(true);
    try {
      next.start();
    } catch {
      setListening(false);
    }
    return true;
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return true;
    }
    return start();
  }, [listening, start, stop]);

  return { supported, listening, error, toggle };
}
