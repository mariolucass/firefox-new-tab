# Planejamento

Objetivo do produto: **chegar ao destino, ou começar a trabalhar, em segundos, sem tirar a mão do teclado**, com tudo local e sem conta. Toda decisão abaixo é medida contra isso.

## Princípios

1. **Teclado primeiro.** Toda ação nova existe como comando de busca antes de existir como botão.
2. **Rápido de abrir, sempre.** A aba nova é aberta dezenas de vezes por dia: nada novo no caminho crítico (ver orçamento).
3. **Local e privado por padrão.** Rede, contas e telemetria só como opção explícita, desligada de fábrica.
4. **Dados em dados, não em código.** Prefixos, IAs, seções e ícones são tabelas; estender é acrescentar uma linha.
5. **Seguro para o usuário.** Nenhuma ação destrutiva ou que envie conteúdo (IA, abrir muitas abas) acontece sem um gesto explícito.
6. **Degradar bem.** Cada recurso diz o que faz onde não é suportado (Firefox sem voz, sem `sessions`, fora de extensão).

## Estado atual (base)

Busca com prefixos, comandos, IAs e voz (onde há suporte); seções Favoritos, Drive, Em foco (pilha + cronômetro), Hoje, Notas, Atalhos do contexto e Mais visitados, todas ligáveis; ícones sob demanda (~5.800); vidro, fundo em camadas e movimento; reordenação por arrastar; 29 testes de regras (sem teste de componente nem visual).

## Orçamento de performance (a ser medido e travado na Fase 0)

| Métrica | Meta |
| --- | --- |
| Primeiro quadro útil (busca visível e focada) | ≤ 100 ms em máquina de referência |
| JS executado na abertura | ≤ 600 KB (hoje: não medido depois das mudanças recentes) |
| Deslocamento de layout (CLS) ao montar | 0 |
| `backdrop-filter` simultâneos | ≤ 6 |
| Trabalho por quadro com a aba parada | 0 (nenhum timer/animação infinita, exceto sessão de foco a 1 Hz e microfone ativo) |
| Bibliotecas pesadas no bundle inicial | nenhuma (ícones e, no futuro, voz local, por `import()`) |

Como medir: Firefox Profiler (gravar a abertura da aba), `performance.mark` em pontos fixos (script inicial, 1º render, busca focada), contagem de bytes do `out/` por chunk no `prepare-extension.mjs`. Resultado vai para o PR e quebra o build se passar do teto.

## Roadmap

Cada fase termina com um critério de pronto verificável. Fases 0 e 1 são pré-requisito das demais; de 2 em diante a ordem pode mudar conforme o uso.

### Fase 0 — Estabilizar e medir
Por que primeiro: o visual novo foi validado por tipos e testes, não por olhos nem por máquina.
- Teste visual e de fumaça com **Playwright** (Chromium e Firefox) sobre `pnpm dev`: abrir a página, screenshots do herói, busca aberta, dock em repouso/compactado, pilha de foco, Drive, diálogo de configurações, em 1280 e 400 px. Comparar com *baselines*.
- Testes de componente (Vitest + Testing Library) para busca (teclado, linhas, comandos), pilha de foco, Hoje e Notas.
- Corrigir `pnpm lint` (ESLint 10, globais do Node) e rodar `lint + typecheck + test + build` em CI (GitHub Actions) a cada push.
- Script de orçamento (tabela acima) no `prepare-extension.mjs`.
- Higiene do repositório: revisar o que está sem commit, commitar em fatias (tema, busca, seções, ícones, docs) e adotar *Conventional Commits*.
- **Pronto quando:** CI verde, baselines versionadas, orçamento medido e travado.

### Fase 1 — Dados: um só modelo, versionado e sincronizável
Hoje há dois mundos (configurações no `storage.local` + chaves `nt-*`), e o que está em `nt-*` não é exportado nem sincroniza.
- Camada única de **store** em `shared/lib` (`get/set/subscribe`, validação zod por chave, migração por versão), substituindo as leituras soltas de `localStorage`.
- **Schema v2**: inclui tarefas, notas, seções ocultas, Inbox do Drive, IA padrão, estatísticas de foco. Migração v1→v2 sem perda, com teste.
- Exportar/importar o conjunto completo; validação de tamanho e versão (já existe para v1).
- **Sincronização opcional** por `storage.sync` do Firefox (limite ~100 KB: separar o que sincroniza do que é cache) com resolução de conflito por carimbo de tempo por chave.
- **Pronto quando:** mesmos dados em duas máquinas; exportação inclui tudo; migração testada com dados reais anteriores.

### Fase 2 — Alcance: o Nexo além da aba nova
- **Script de fundo** (MV3 no Firefox) e **atalho global** de extensão (`commands`): abre o Nexo de qualquer aba com a busca focada.
- **Palavra-chave na barra de endereços** (`omnibox`, ex.: `b`) para usar os mesmos prefixos, comandos e IAs de fora da aba nova.
- **Menu de contexto**: "Salvar no Inbox / como nota / em Hoje" a partir de qualquer página ou seleção.
- Notificação ao fim do foco (permissão `notifications`, opcional e justificada).
- **Pronto quando:** salvar e perguntar a uma IA sem abrir uma aba nova.

### Fase 3 — Central de IAs
- Registro de IAs **configurável** (adicionar/remover/ordenar, URL com `{q}`), IA padrão escolhida em Configurações.
- **Histórico de perguntas** (local, com limite e opção de apagar): repetir a mesma pergunta em outra IA para comparar.
- **Voz que funciona no Firefox**, em ordem de preferência: (a) transcrição com Whisper por chave do usuário (opt-in, aviso claro de que o áudio sai do navegador); (b) modelo local por WebAssembly carregado sob demanda (alguns dezenas de MB, só quando ligado). Mantém o ditado do sistema como padrão.
- Modos de pergunta: "colar seleção/área de transferência" como contexto da pergunta.
- **Pronto quando:** falar uma pergunta e vê-la numa IA em dois gestos, em Firefox e Chromium.

### Fase 4 — Seções como módulos
- Contrato de seção: `{ id, name, note, load(): Promise<Component>, defaultOn, contexts? }`, com carregamento preguiçoso e *error boundary* por seção (uma seção quebrada não derruba a página).
- **Ordem e visibilidade por contexto**: reordenar seções por arrastar; cada contexto com a sua composição.
- Novas seções candidatas, em ordem de valor: calendário do dia (leitura de `.ics` local), PRs/issues do GitHub (token opt-in), feeds RSS, clima.
- **Pronto quando:** criar uma seção exige só um arquivo de widget e um registro, e ela respeita contexto e ordem.

### Fase 5 — Personalização e acessibilidade
- Tokens de tema em **dois esquemas** (escuro e claro) e densidade (compacta/confortável); respeitar `prefers-color-scheme` e `prefers-reduced-transparency` (já tratado para vidro).
- Fundo configurável (halos, grade, grão; ou cor sólida) e opção "modo leve" que desliga vidro e luz ambiente.
- Auditoria de acessibilidade: foco visível em tudo, rótulos, contraste ≥ 4,5:1 sobre o vidro, navegação do dock e da pilha por teclado, leitores de tela nas ações da busca.
- Internacionalização: textos fora dos componentes (`pt-BR` primeiro, `en` depois).
- **Pronto quando:** tema claro completo, modo leve, auditoria sem pendências críticas.

### Fase 6 — Qualidade contínua
- Medição **local** de abertura da aba (`performance.mark`) mostrada em Configurações → Diagnóstico, sem enviar nada a lugar algum.
- *Error boundary* global com tela de recuperação (exportar dados, restaurar).
- Versionamento da extensão (SemVer) com notas de versão e empacotamento `.xpi` automatizado.
- Revisão trimestral do catálogo padrão a partir do histórico real.

## Refatorações previstas

| Tema | Hoje | Alvo |
| --- | --- | --- |
| Busca | um arquivo concentra tipos de linha, montagem e render | registro de fontes de resultado (`match` + `render`), barra só orquestra |
| Estilos | `globals.css` único, sobreposição por ordem | CSS por widget/camada, protegido por teste visual |
| Dados | `settings` + chaves `nt-*` | store único e versionado (Fase 1) |
| Comandos | `parseCommands` + ramos no `search-bar` e no `home-page` | tabela de comandos `{ parse, row, run }` |
| Seções | lista simples + `show(id)` | contrato com `load()` e *error boundary* (Fase 4) |

## Riscos e mitigação

| Risco | Efeito | Mitigação |
| --- | --- | --- |
| Vidro/desfoque pesar em máquinas fracas | quadros perdidos, bateria | orçamento de `backdrop-filter`, modo leve (Fase 5), medição (Fase 0) |
| Permissões novas | usuário precisa reaprovar a cada atualização | acrescentar poucas, justificar no README, preferir opcionais |
| Sincronização com conflito | perda de dados | carimbo por chave, backup antes de aplicar, exportação sempre disponível |
| Voz enviando áudio a terceiros | privacidade | só opt-in, aviso explícito, local como alternativa |
| Dependências sobem de versão em bloco | quebras silenciosas (ex.: ESLint, TypeScript 7) | CI na Fase 0, atualização em PR separado, `pnpm.overrides` quando preciso |
| Crescimento do `globals.css` | regressões visuais | teste visual + divisão por widget |

## Decisões em aberto

1. **Voz no Firefox:** Whisper por chave do usuário ou modelo local? (custo e privacidade vs. peso e velocidade).
2. **Sincronizar:** `storage.sync` (simples, limitado) ou arquivo no Drive (sem limite, exige OAuth)?
3. **IA padrão:** continua o Claude, ou aprende da última usada?
4. **Contexto automático por horário:** vale como opção desligada por padrão?
5. **Tema claro:** prioridade real ou só se houver outros usuários além do autor?

## Como priorizar o que vem depois

Pontue cada ideia de 1 a 5 em **frequência de uso** (quantas vezes por dia), **atrito removido** (quantos cliques/segundos economiza) e **custo** (esforço + peso na abertura). Faça primeiro o que tem frequência × atrito alto e custo baixo; ideias que pioram a abertura da aba só entram com um jeito de carregar sob demanda.
