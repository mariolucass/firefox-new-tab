export type AiProvider = {
  id: string;
  name: string;
  /** Endereço de abertura. `prefill`: aceita o texto na própria URL. */
  url: (query: string) => string;
  prefill: boolean;
  /** Prefixos da busca: "cl como funciona…" pergunta ao Claude. */
  keys: string[];
};

/**
 * Chats de IA que recebem a pergunta direto. ChatGPT, Claude e Grok aceitam o
 * texto por parâmetro de URL. Gemini e DeepSeek não têm parâmetro público: o
 * texto vai para a área de transferência e basta colar (Ctrl+V) lá.
 */
export const aiProviders: AiProvider[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: (q) => `https://chatgpt.com/?q=${encodeURIComponent(q)}`,
    prefill: true,
    keys: ["gpt", "chatgpt"],
  },
  {
    id: "claude",
    name: "Claude",
    url: (q) => `https://claude.ai/new?q=${encodeURIComponent(q)}`,
    prefill: true,
    keys: ["cl", "claude"],
  },
  {
    id: "grok",
    name: "Grok",
    url: (q) => `https://grok.com/?q=${encodeURIComponent(q)}`,
    prefill: true,
    keys: ["gk", "grok"],
  },
  {
    id: "gemini",
    name: "Gemini",
    url: () => "https://gemini.google.com/app",
    prefill: false,
    keys: ["gem", "gemini"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: () => "https://chat.deepseek.com/",
    prefill: false,
    keys: ["ds", "deepseek"],
  },
];

/** IA usada por "ia texto" (sem dizer qual). */
export const defaultAiId = "claude";

/** "cl pergunta", "gpt pergunta", "ia pergunta" → IA e texto; qualquer outra coisa → null. */
export function parseAiPrefix(
  query: string,
): { provider: AiProvider; text: string } | null {
  const match = /^(\S+)\s+(\S.*)$/.exec(query.trim());
  if (!match) return null;
  const key = match[1].toLowerCase();
  const provider =
    key === "ia"
      ? aiProviders.find((item) => item.id === defaultAiId)
      : aiProviders.find((item) => item.keys.includes(key));
  return provider ? { provider, text: match[2].trim() } : null;
}
