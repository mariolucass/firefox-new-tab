/**
 * Idioma do ditado. É inglês de propósito: falar a busca em voz alta é prática.
 * Para voltar ao português, troque para "pt-BR" (os comandos em português
 * continuam entendidos abaixo).
 */
export const voiceLang = "en-US";

/**
 * Converte a fala transcrita (inglês ou pt-BR) na sintaxe de comandos da busca, para o
 * ditado e o teclado usarem o mesmo caminho:
 *   "adicionar tarefa comprar café"     → "+ comprar café"
 *   "anotar ideia de projeto"           → "nota ideia de projeto"
 *   "foco de 45 minutos"                → "foco 45"
 *   "ir para acadêmico"                 → "ir acadêmico"
 *   "pergunte ao Claude como funciona…" → "cl como funciona…"
 *   "pesquisar react hooks"             → "react hooks"
 * Em inglês:
 *   "add task buy coffee"               → "+ buy coffee"
 *   "note project idea"                 → "nota project idea"
 *   "focus 45" / "start focus for 45 minutes" → "foco 45"
 *   "go to personal"                    → "ir personal"
 *   "ask Claude how hooks work"         → "cl how hooks work"
 *   "search react hooks"                → "react hooks"
 * Qualquer outra frase vira o texto da busca, como foi dita.
 */
const aiKeys: Record<string, string> = {
  claude: "cl",
  gpt: "gpt",
  chatgpt: "gpt",
  gemini: "gem",
  grok: "gk",
  deepseek: "ds",
  ia: "ia",
};

const aiName = "(claude|chat\\s?gpt|gpt|gemini|grok|deep\\s?seek|ia)";

export function normalizeVoice(raw: string): string {
  const text = raw.trim().replace(/[.!?]+$/, "");
  let match: RegExpExecArray | null;

  // Inglês (o ditado é em inglês; ver voiceLang).
  if ((match = /^(?:add|create|new)\s+(?:a\s+|an\s+)?(?:task|to-?do|reminder)[:,]?\s+(.+)$/i.exec(text)))
    return `+ ${match[1]}`;
  if ((match = /^(?:take\s+a\s+note|write\s+down|save\s+a\s+note|note)[:,]?\s+(.+)$/i.exec(text)))
    return `nota ${match[1]}`;
  if (
    (match =
      /^(?:start\s+|begin\s+)?(?:focus|pomodoro)(?:\s+(?:for\s+)?(\d{1,3}))?(?:\s+minutes?)?$/i.exec(text))
  )
    return match[1] ? `foco ${match[1]}` : "foco";
  if (
    (match =
      /^(?:go\s+to|open|switch\s+to)\s+(?:the\s+)?(?:context\s+)?(development|dev|academic|career|personal)$/i.exec(text))
  )
    return `ir ${match[1]}`;
  if ((match = /^(?:search(?:\s+for)?|look\s+up|google)\s+(.+)$/i.exec(text)))
    return match[1];

  if (
    (match =
      /^(?:adicion\w+|cri\w+|nova)\s+(?:uma\s+)?tarefa[:,]?\s+(.+)$/i.exec(
        text,
      ))
  )
    return `+ ${match[1]}`;
  if (
    (match = /^(?:anot\w+|salv\w+\s+(?:uma\s+)?nota|nota)[:,]?\s+(.+)$/i.exec(
      text,
    ))
  )
    return `nota ${match[1]}`;
  if (
    (match =
      /^(?:inici\w+\s+|come[cç]\w+\s+)?(?:foco|pomodoro)(?:\s+(?:de\s+)?(\d{1,3}))?(?:\s+minutos?)?$/i.exec(
        text,
      ))
  )
    return match[1] ? `foco ${match[1]}` : "foco";
  if (
    (match =
      /^(?:ir\s+para|abrir|trocar\s+para|mudar\s+para)\s+(?:o\s+)?(?:contexto\s+)?(desenvolvimento|dev|acad[eê]mico|carreira|pessoal)$/i.exec(
        text,
      ))
  )
    return `ir ${match[1]}`;
  if (
    (match = new RegExp(
      `^(?:pergunt\\w+|ask|diga|fale)\\s+(?:ao|à|a|para\\s+o|pro|pra)?\\s*${aiName}[,:]?\\s+(.+)$`,
      "i",
    ).exec(text))
  )
    return `${aiKeys[match[1].toLowerCase().replace(/\s+/g, "")]} ${match[2]}`;
  if ((match = new RegExp(`^${aiName}[,:]\\s*(.+)$`, "i").exec(text)))
    return `${aiKeys[match[1].toLowerCase().replace(/\s+/g, "")]} ${match[2]}`;
  if (
    (match = /^(?:pesquis\w+|busc\w+|procur\w+)\s+(?:por\s+)?(.+)$/i.exec(text))
  )
    return match[1];
  return text;
}
