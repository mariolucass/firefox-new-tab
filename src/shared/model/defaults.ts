import type { ContextId, Settings, Shortcut } from "./settings";

/**
 * Catálogo padrão, montado a partir do histórico real do Firefox Developer
 * Edition (60 dias até 07/11/2026). Ordem dos favoritos = em quantos dias
 * diferentes o site foi aberto, não o total de visitas (recarregar uma página
 * em desenvolvimento infla visitas, não hábito). Os nove primeiros abrem com as
 * teclas 1–9. Sites com 0 visitas em quatro meses saíram (MDN, Prisma, Tailwind,
 * Next.js, Scholar, arXiv, Gupy, Wellfound, Remote OK, LeetCode, roadmap.sh,
 * Dev.to, Keep, Docker Hub). WhatsApp e Discord ficam no Ferdium.
 *
 * Só domínios e páginas iniciais: nada de caminhos com dados pessoais.
 * Sites que mudarem de hábito aparecem sozinhos em "Frequentes" (topSites).
 */
type Entry = [
  label: string,
  url: string,
  icon: string,
  context: Shortcut["context"],
  favorite: boolean,
  keywords: string[],
];

const entries: Entry[] = [
  // Favoritos (1–9 pelas teclas), do mais frequente ao menos.
  [
    "Q-Acadêmico",
    "https://novo.qacademico.ifce.edu.br/",
    "QA",
    "academic",
    true,
    ["ifce", "notas", "faltas", "academico"],
  ],
  [
    "Gemini",
    "https://gemini.google.com/app",
    "gemini",
    "development",
    true,
    ["google", "ia"],
  ],
  [
    "YouTube",
    "https://www.youtube.com",
    "youtube",
    "personal",
    true,
    ["videos"],
  ],
  [
    "GitHub",
    "https://github.com",
    "github",
    "development",
    true,
    ["git", "repositorio", "codigo"],
  ],
  [
    "Gmail",
    "https://mail.google.com",
    "gmail",
    "global",
    true,
    ["email", "caixa"],
  ],
  [
    "ChatGPT",
    "https://chatgpt.com",
    "AI",
    "development",
    true,
    ["openai", "ia"],
  ],
  [
    "Classroom",
    "https://classroom.google.com",
    "google-classroom",
    "academic",
    true,
    ["aulas", "turmas", "google"],
  ],
  [
    "Claude",
    "https://claude.ai",
    "claude",
    "development",
    true,
    ["anthropic", "ia"],
  ],
  [
    "Google Docs",
    "https://docs.google.com/document/",
    "google-docs",
    "global",
    true,
    ["documentos", "texto"],
  ],
  [
    "Google Drive",
    "https://drive.google.com",
    "google-drive",
    "global",
    true,
    ["arquivos"],
  ],
  [
    "LinkedIn",
    "https://www.linkedin.com",
    "IN",
    "career",
    true,
    ["rede", "vagas"],
  ],
  [
    "Trello",
    "https://trello.com",
    "trello",
    "global",
    true,
    ["tarefas", "kanban"],
  ],

  // Desenvolvimento
  [
    "localhost:3000",
    "http://localhost:3000",
    "3000",
    "development",
    false,
    ["local", "dev", "servidor"],
  ],
  [
    "localhost:3001",
    "http://localhost:3001",
    "3001",
    "development",
    false,
    ["local", "dev", "servidor"],
  ],
  [
    "Meus repositórios",
    "https://github.com/mariolucass?tab=repositories",
    "github",
    "development",
    false,
    ["git", "projetos"],
  ],
  ["Vercel", "https://vercel.com", "vercel", "development", false, ["deploy"]],
  [
    "Neon",
    "https://console.neon.tech",
    "neon",
    "development",
    false,
    ["postgres", "banco"],
  ],
  [
    "Tailscale",
    "https://login.tailscale.com/admin/machines",
    "tailscale",
    "development",
    false,
    ["vpn", "maquinas", "rede"],
  ],

  // Acadêmico
  [
    "Repositório CECAPE",
    "https://repositorio.faculdadececape.edu.br",
    "RC",
    "academic",
    false,
    ["faculdade", "publicacoes", "cecape"],
  ],
  [
    "Moodle PEX (UFPB)",
    "https://pex.sead.ufpb.br",
    "PX",
    "academic",
    false,
    ["curso", "ufpb", "moodle"],
  ],
  [
    "Portal IFCE",
    "https://portal.ifce.edu.br",
    "IF",
    "academic",
    false,
    ["ifce", "sistemas", "formularios"],
  ],
  [
    "Wikipédia",
    "https://pt.wikipedia.org",
    "wikipedia",
    "academic",
    false,
    ["pesquisa", "enciclopedia"],
  ],
  [
    "Google Tradutor",
    "https://translate.google.com",
    "google-translate",
    "academic",
    false,
    ["traduzir", "ingles"],
  ],
  [
    "iLovePDF",
    "https://www.ilovepdf.com",
    "ilovepdf",
    "academic",
    false,
    ["pdf", "converter", "juntar"],
  ],
  [
    "Excalidraw",
    "https://excalidraw.com",
    "excalidraw",
    "academic",
    false,
    ["diagramas", "desenho"],
  ],

  // Carreira
  [
    "PSS Crato",
    "https://pss.crato.ce.gov.br",
    "PS",
    "career",
    false,
    ["seletivo", "concurso", "crato"],
  ],
  [
    "Canva",
    "https://www.canva.com",
    "CV",
    "career",
    false,
    ["design", "curriculo", "slides"],
  ],

  // Pessoal
  [
    "Instagram",
    "https://www.instagram.com",
    "instagram",
    "personal",
    false,
    ["fotos", "social"],
  ],
  [
    "YouTube Music",
    "https://music.youtube.com",
    "youtube-music",
    "personal",
    false,
    ["musica"],
  ],
  [
    "Reddit",
    "https://www.reddit.com",
    "reddit",
    "personal",
    false,
    ["forum", "social"],
  ],
  ["X", "https://x.com", "x", "personal", false, ["twitter", "social"]],
  [
    "F5 Cariri",
    "https://www.f5cariri.com.br",
    "F5",
    "personal",
    false,
    ["noticias", "cariri"],
  ],
  ["Amazon", "https://www.amazon.com.br", "AZ", "personal", false, ["compras"]],
  [
    "FamilySearch",
    "https://www.familysearch.org",
    "FS",
    "personal",
    false,
    ["familia", "genealogia"],
  ],
];

export const defaultSettings: Settings = {
  version: 1,
  activeContext: "development",
  shortcuts: entries.map(
    ([label, url, icon, context, favorite, keywords], order) => ({
      id: `default-${order}`,
      label,
      url,
      icon,
      context,
      favorite,
      keywords,
      order,
    }),
  ),
  focusItems: [
    {
      id: "echoes",
      context: "development" as ContextId,
      title: "Echoes",
      description: "Defina o link para continuar o projeto.",
      order: 0,
    },
    {
      id: "purposebond",
      context: "development" as ContextId,
      title: "PurposeBond",
      description: "Defina o link para continuar o projeto.",
      order: 1,
    },
  ],
  showClock: true,
  searchProvider: "google",
};
