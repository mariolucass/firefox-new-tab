/**
 * Registro único dos atalhos de teclado. A ajuda (?), o rodapé e as dicas nas
 * seções leem daqui, então documentar um atalho novo é acrescentar uma linha.
 * O comportamento mora em views/home/model/use-hotkeys.ts: o `id` liga os dois.
 *
 * Regras: letra solta nunca é atalho (ela vai para a busca); comandos usam Alt,
 * que não colide com o Firefox. Alt + ← / → é "voltar/avançar", por isso fora.
 */
export type HotkeyGroup = "Buscar e abrir" | "Contexto" | "Criar" | "Mover-se";

export type Hotkey = {
  id: string;
  keys: string[];
  label: string;
  group: HotkeyGroup;
};

export const hotkeys: Hotkey[] = [
  { id: "search", keys: ["/"], label: "Buscar (também Ctrl K)", group: "Buscar e abrir" },
  { id: "favorite", keys: ["1", "–", "9"], label: "Abrir o favorito", group: "Buscar e abrir" },
  { id: "ai", keys: ["Alt", "A"], label: "Perguntar a uma IA", group: "Buscar e abrir" },
  { id: "voice", keys: ["Alt", "M"], label: "Ditar a busca em inglês", group: "Buscar e abrir" },

  { id: "context", keys: ["Alt", "1–4"], label: "Trocar de contexto", group: "Contexto" },
  { id: "focus", keys: ["Alt", "F"], label: "Iniciar ou parar foco de 25 min", group: "Contexto" },
  { id: "settings", keys: ["Alt", ","], label: "Configurações", group: "Contexto" },

  { id: "task", keys: ["Alt", "T"], label: "Nova tarefa em Hoje", group: "Criar" },
  { id: "note", keys: ["Alt", "N"], label: "Nova nota", group: "Criar" },
  { id: "english", keys: ["Alt", "I"], label: "Traduzir (inglês)", group: "Criar" },
  { id: "shortcut", keys: ["Alt", "L"], label: "Novo atalho de site", group: "Criar" },

  { id: "next-section", keys: ["Alt", "↓"], label: "Próxima seção", group: "Mover-se" },
  { id: "prev-section", keys: ["Alt", "↑"], label: "Seção anterior", group: "Mover-se" },
  { id: "top", keys: ["Alt", "Home"], label: "Voltar ao topo", group: "Mover-se" },
  { id: "help", keys: ["?"], label: "Mostrar esta ajuda", group: "Mover-se" },
  { id: "escape", keys: ["Esc"], label: "Sair do campo ou fechar", group: "Mover-se" },
];

export const hotkeyGroups: HotkeyGroup[] = ["Buscar e abrir", "Contexto", "Criar", "Mover-se"];

export const keysOf = (id: string): string[] =>
  hotkeys.find((hotkey) => hotkey.id === id)?.keys ?? [];
