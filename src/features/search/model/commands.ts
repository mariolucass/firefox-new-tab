import { contextNames, contexts, type ContextId } from "@shared/model/settings";

export type Command =
  | { type: "task"; text: string }
  | { type: "note"; text: string }
  | { type: "focus"; minutes: number }
  | { type: "context"; context: ContextId }
  | { type: "settings" }
  | { type: "shortcut" }
  | { type: "stop-focus" }
  | { type: "help" }
  | { type: "translate"; text: string }
  | { type: "say"; text: string };

/** Título e dica de cada comando na lista de resultados da busca. */
export function describeCommand(command: Command): { title: string; hint: string } {
  switch (command.type) {
    case "task":
      return { title: command.text, hint: "Adicionar à lista de Hoje" };
    case "note":
      return { title: command.text, hint: "Salvar como nota" };
    case "focus":
      return { title: `Foco de ${command.minutes} min`, hint: "Iniciar sessão de foco" };
    case "context":
      return { title: `Ir para ${contextNames[command.context]}`, hint: "Trocar de contexto" };
    case "settings":
      return { title: "Configurações", hint: "Abrir o painel (Alt ,)" };
    case "shortcut":
      return { title: "Novo atalho", hint: "Adicionar um site (Alt L)" };
    case "stop-focus":
      return { title: "Parar o foco", hint: "Encerrar a sessão em andamento" };
    case "help":
      return { title: "Atalhos de teclado", hint: "Mostrar a ajuda (?)" };
    case "translate":
      return { title: command.text, hint: "Traduzir, ouvir e salvar no vocabulário" };
    case "say":
      return { title: command.text, hint: "Ouvir a pronúncia em inglês" };
  }
}

/** Apelidos de cada contexto para o comando "@". */
const contextAliases: Record<ContextId, string[]> = {
  development: ["dev", "desenvolvimento", "development", "code"],
  academic: ["acad", "academico", "acadêmico", "estudo", "faculdade"],
  career: ["carreira", "career", "trabalho", "job"],
  personal: ["pessoal", "personal", "casa"],
};

const plain = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * A busca também é uma linha de comando. Devolve os comandos que o texto
 * dispara (lista vazia = busca normal):
 *   "+ comprar café" ou "t comprar café"  → tarefa em Hoje
 *   "nota ideia" ou "n ideia"             → nota rápida
 *   "foco" ou "foco 45"                    → sessão de foco (25 min por padrão)
 *   "@" ou "@dev" ou "ir carreira"         → trocar de contexto (prefixo basta)
 *   "en bom dia" / "say good morning"      → traduzir+ouvir+salvar / só ouvir
 *   "config", "atalho", "parar", "ajuda"   → painéis e controles, sem mouse
 */
export function parseCommands(query: string): Command[] {
  const text = query.trim();
  const task = /^(?:\+|t)\s+(\S.*)$/i.exec(text);
  if (task) return [{ type: "task", text: task[1].trim().slice(0, 120) }];

  const translate = /^(?:en|trad)\s+(\S.*)$/i.exec(text);
  if (translate) return [{ type: "translate", text: translate[1].trim().slice(0, 300) }];

  const say = /^(?:say|dizer)\s+(\S.*)$/i.exec(text);
  if (say) return [{ type: "say", text: say[1].trim().slice(0, 300) }];

  const note = /^(?:nota|n)\s+(\S.*)$/i.exec(text);
  if (note) return [{ type: "note", text: note[1].trim().slice(0, 500) }];

  const focus = /^(?:foco|focus|pomodoro)(?:\s+(\d{1,3}))?$/i.exec(text);
  if (focus) {
    const minutes = focus[1] ? Number(focus[1]) : 25;
    return minutes >= 1 && minutes <= 180 ? [{ type: "focus", minutes }] : [];
  }

  const plainText = plain(text);
  const simple: Array<[string[], Command]> = [
    [["config", "configuracoes", "configuracao", "ajustes", "settings"], { type: "settings" }],
    [["atalho", "novo atalho", "novo site"], { type: "shortcut" }],
    [["parar", "parar foco"], { type: "stop-focus" }],
    [["ajuda", "atalhos", "teclas", "help"], { type: "help" }],
  ];
  const match = simple.find(([words]) => words.includes(plainText));
  if (match) return [match[1]];

  const target = /^(?:@|ir\s+)(\S*)$/i.exec(text);
  if (target) {
    const wanted = plain(target[1]);
    return contexts
      .filter(
        (context) =>
          !wanted ||
          plain(contextNames[context]).startsWith(wanted) ||
          contextAliases[context].some((alias) =>
            plain(alias).startsWith(wanted),
          ),
      )
      .map((context) => ({ type: "context", context }) as Command);
  }
  return [];
}
