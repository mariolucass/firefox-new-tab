# Nexo (Firefox New Tab)

Nova aba para o Firefox (e Chromium), feita em Next.js com exportação estática, React, Tailwind 4 e Motion. Funciona offline: atalhos, contextos, foco, busca e notas ficam no navegador. Responda em português. Leia também o `README.md` e `docs/arquitetura.md` ao entrar.

## Comandos

- `pnpm dev` (servidor), `pnpm test` (vitest), `pnpm typecheck`, `pnpm lint`, `pnpm build` (gera `out/`), `pnpm deploy:ext` (copia para o Firefox, ver README). Tarefas `mise`: `setup`, `dev`, `lint`, `test`.
- Ao terminar uma mudança, rode `pnpm typecheck && pnpm test` e `npx next build`. Sem erro de tipo e testes verdes antes de dizer que está pronto.
- Não commitar nem dar push sem o pedido explícito do dono. Repositórios novos são privados.

## Estrutura (FSD)

`src/shared` (config, lib, model, ui) → `src/features` (regras por assunto: search, today, drive, github, frequent, timer, log…) → `src/widgets` (blocos de tela) → `src/views/home` (a página). Quem está acima importa de baixo, nunca o contrário. Estilo em um único `src/app/globals.css` (as seções novas entram no fim, com um comentário de cabeçalho que explica a regra).

## Como verificar visualmente (obrigatório em mudança de UI)

Não afirme que algo "ficou bom" sem olhar. Fluxo que funciona aqui:

1. `npx next build` e servir `out/` (`python3 -m http.server 4599` dentro de `out/`).
2. Playwright (Chromium) vem do `portfolio`: `…/portfolio/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs`. Injetar `localStorage['nt-welcomed']='true'` e, se preciso, `nt-settings-cache` / `nt-topsites-cache` / `nt-gh-<owner/repo>`.
3. **Medir antes de opinar**: `getBoundingClientRect`, centros, larguras por quadro durante animações, `scrollWidth - clientWidth` (overflow). Para alinhamento óptico, medir tinta em captura 2× (PIL funciona).
4. Dizer com clareza o que foi visto e o que não: o Chromium de teste não é o Firefox, esconde barras de rolagem sobrepostas e não roda a extensão (`topSites`, `history`, `clipboardRead` só existem dentro dela).

## Preferências visuais do dono (ele é exigente e itera muito)

- **Grade de 8pt** em espaço e tamanho (meios de 4 só em detalhes). Dobra com duas medidas: `--gs` (≈16, mesmo grupo) e `--gl` (≈3×, entre grupos), nunca valores soltos.
- Alinhar **bordas** (busca, dicas, favoritos compartilham a coluna de 768) e o **centro óptico** (tracking negativo, fonte que assenta a linha de base baixa). O que é centralizado tem que ser medido centralizado.
- Texto não pode ser "muito pequeno": rótulos ≥ 12px, corpo 15–16px, números de destaque 20px+. Dicas e legendas não podem ficar apagadas (opacidade cheia).
- Premium = vidro (`--glass-*`), aro de 1px, relevo nas teclas (`kbd`), seções com título sans semibold + fio que se dissolve. Sem mono espaçado em caixa alta para títulos.
- Preferir menos ruído: informação repetida sai (ex.: chips de contexto/semana no hero), o que muda com o contexto fica colado à dobra, o que é fixo vem depois.

## Movimento (regras que custaram caro)

- Só `opacity` e `transform` nas entradas. **Nada de `filter`/`transform` em ancestral de `backdrop-filter`** (apaga o vidro) e nada de `filter: blur` em itens dentro de contêiner de vidro (no Firefox viram caixas quadradas).
- **Abertura única**: `useIntroStageState` em `shared/ui/motion.tsx` → `data-stage="wait|play|done"` no `.app-shell`. Tudo espera dados, fontes e medidas e entra por uma coreografia só (`--o`/`--i` no CSS, curva `--ease-expo`). Não crie animações de entrada soltas.
- Tamanhos (largura/altura) usam molas **superamortecidas** (sem overshoot); overshoot só em escala de ícones. Posição e tamanho animam **por bordas** (esquerda/direita), nunca x + largura separados (estoura o contêiner).
- `Reveal`: estado inicial fixado na montagem (`useState(stage)`); mudar `initial` depois deixa o bloco invisível. Detectar "chegou" por topo < 90% da janela com listener de scroll (IntersectionObserver perde blocos pulados).
- Rolagem programática com `glideTo` (`shared/lib/glide.ts`), calculando o destino por `offsetTop` (transforms de `Reveal` enganam `getBoundingClientRect`).
- Respeitar `prefers-reduced-motion` em tudo (CSS e JS).

## Cabeçalho (ilha)

- No topo: barra em grade (`min(100%,1152px)`); rolando: ilha `fit-content` centralizada. A troca é uma **animação de largura (WAAPI)**: topo lê a largura direto; ilha mede um **clone** `.bar-measure` sem transições. Medir o clone no topo dá 48px a mais em janelas estreitas.
- Rolagem com histerese (liga > 48px, desliga < 12px). Transições só ligam depois de `data-settled`.
- Dock: na ilha recolhida só o ativo mostra o nome; hover não desdobra rótulo (empurra o alvo). Brilho de repouso só após 480 ms da abertura. Fechar tem atraso de 320 ms.

## Busca (paleta de comandos)

- `search-bar.tsx` monta `rows` tipadas (`result | address | web | bang | ai | command | calc | hint`), agrupadas por `sectionOf`. Prefixo digitado sozinho (`gh`, `cl`, `+`, `nota`) mostra linhas de dica antes dos resultados normais.
- Cursor de seleção em `search-cursor.tsx` (molas do Motion, aura, pressão), posição medida por `offsetLeft/Top` da linha **somados ao deslocamento da lista**. A lista rolável usa margem negativa + preenchimento (barra visível fora da largura das linhas) e folga nos quatro lados, senão o brilho do cursor é cortado.
- Ícones de marca: `simple-icons` pela biblioteca (`shared/lib/icon-library.ts`); logos de IA em `shared/ui/ai-logos.ts` (Lobe Icons, MIT). Painel abre colado ao campo via `--field-h`.
- Título da aba reage ao que se digita (`views/home/ui/document-title.tsx`, evento `nexo:query`).

## Dados e integrações

- Configurações: schema **estrito** (zod/mini) em `shared/model/settings.ts`; campo novo entra **opcional** e o backup antigo continua válido. Mudança em padrão de fábrica que o usuário já salvou precisa de migração em `shared/lib/storage.ts` (só troca o valor exatamente igual ao antigo).
- Frequentes: ranking vem do **histórico** (`history`, visitas + digitadas×3, 60 dias), `topSites` só dá favicon e bônus. Há cache local.
- GitHub (cartões de Em foco): API REST anônima (60/h) com cache de 6 h em `nt-gh-*`; repositório privado só mostra links. Repo é deduzido do link do GitHub quando o campo está vazio.
- Feriados BR em `shared/lib/holidays-br.ts` (fixos + Páscoa/Carnaval/Sexta Santa/Corpus Christi; os dois últimos tipos "ponto facultativo"). Semana começa no domingo.
- Classroom de fábrica abre em `https://classroom.google.com/u/1/h/st` (conta /u/1 com as aulas).
- Permissões do manifesto: `storage`, `topSites`, `sessions`, `notifications`, `history`, `clipboardRead`.

## Armadilhas

- `useSettings` lê o cache de `localStorage` antes da primeira pintura; o resto vem do `chrome.storage`. Tudo que aparece cedo depende disso para não "pular".
- Seções numeram por contador CSS na ordem do DOM; "Seu dia" (`dayBlock`) fica depois do bloco que muda com o contexto.
- A busca tem `overscroll-behavior: auto` de propósito: a roda deve continuar na página.
- Centro óptico: o campo de busca usa `padding-bottom: 0.18em` para centralizar a tinta; não remover.
