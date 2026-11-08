/**
 * Registro das seções da página inicial. Para criar uma nova seção: acrescente
 * o id aqui, renderize-a em home-page.tsx atrás de `show(id)` e ela já ganha o
 * interruptor em Configurações → Seções.
 */
export const sections = [
  { id: "favorites", name: "Favoritos", note: "Blocos com as teclas 1–9" },
  {
    id: "drive",
    name: "Google Drive",
    note: "Pasta Inbox, busca e arquivos novos",
  },
  { id: "focus", name: "Em foco", note: "Pilha de prioridades do contexto" },
  { id: "today", name: "Hoje", note: "Lista de tarefas do dia" },
  { id: "notes", name: "Notas", note: "Anotações rápidas (comando: nota)" },
  {
    id: "english",
    name: "Inglês",
    note: "Palavra do dia, prática, tradutor e vocabulário",
  },
  {
    id: "shortcuts",
    name: "Atalhos do contexto",
    note: "Lista do contexto ativo",
  },
  { id: "frequent", name: "Mais visitados", note: "Do histórico do navegador" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
