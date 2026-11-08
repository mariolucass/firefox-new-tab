/**
 * Tradução pela API pública do MyMemory (sem chave, com CORS). O texto digitado
 * sai do navegador para api.mymemory.translated.net: só acontece quando a
 * pessoa pede (comando `en` ou botão), nunca em segundo plano.
 */
export type Direction = "pt|en" | "en|pt";

const portugueseHints =
  /[áàâãéêíóôõúç]|\b(que|não|nao|uma?|com|para|por|você|voce|está|esta|isso|muito|obrigad[oa]|bom|boa|dia|de|do|da|em|é|os|as|meu|minha)\b/i;

/** Heurística simples: acentos ou palavras comuns do português → pt→en; senão en→pt. */
export function guessDirection(text: string): Direction {
  return portugueseHints.test(text) ? "pt|en" : "en|pt";
}

export async function translate(text: string, direction: Direction): Promise<string> {
  const clean = text.trim().slice(0, 300);
  if (!clean) throw new Error("Nada para traduzir.");
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${encodeURIComponent(direction)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("O serviço de tradução não respondeu.");
  const data = (await response.json()) as { responseData?: { translatedText?: string } };
  const result = data.responseData?.translatedText?.trim();
  if (!result) throw new Error("Sem tradução para esse texto.");
  return result;
}
