/**
 * Pronúncia pela síntese de voz do navegador (speechSynthesis). Funciona no
 * Firefox, offline, desde que o sistema tenha uma voz em inglês instalada.
 */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function englishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((voice) => voice.lang === "en-US") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
  );
}

/** Fala o texto em inglês. `slow` desacelera para treinar o ouvido. */
export function speak(text: string, slow = false): boolean {
  if (!canSpeak() || !text.trim()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  const voice = englishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = slow ? 0.65 : 0.95;
  synth.speak(utterance);
  return true;
}

export function hasEnglishVoice(): boolean {
  return canSpeak() && englishVoice() !== undefined;
}
