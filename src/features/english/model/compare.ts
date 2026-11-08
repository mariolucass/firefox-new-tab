/** Compara o que a pessoa disse ou digitou com a frase-alvo, palavra por palavra. */
const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

export type WordResult = { word: string; ok: boolean };

/**
 * Cada palavra da frase-alvo é marcada como acertada se aparece, na ordem, no
 * que foi dito (subsequência comum mais longa). `score` é a fração acertada.
 */
export function compare(target: string, spoken: string): { score: number; result: WordResult[] } {
  const a = target.replace(/[’]/g, "'").split(/\s+/).filter(Boolean);
  const aKeys = a.map((word) => words(word).join(" "));
  const b = words(spoken);
  const table = Array.from({ length: aKeys.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = aKeys.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        aKeys[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ok = new Array<boolean>(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < aKeys.length && j < b.length) {
    if (aKeys[i] === b[j]) {
      ok[i] = true;
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  const result = a.map((word, index) => ({ word, ok: ok[index] }));
  return { score: a.length ? ok.filter(Boolean).length / a.length : 0, result };
}
