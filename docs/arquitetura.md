# Arquitetura e pontos de extensão

## Camadas (FSD)

```
app → views → widgets → features → shared
```

Uma camada só importa das de baixo. Aliases: `@app`, `@views`, `@widgets`, `@features`, `@shared`.

- **`shared`**: tema (`config/theme.ts`), modelo validado com zod (`model/settings.ts`), catálogos, storage, navegação, biblioteca de ícones, hooks utilitários (`use-reorder`, `use-spotlight`).
- **`features`**: regras de uma capacidade, sem JSX de página. Ex.: `search/model/*` (filtro, `bangs`, `ai-providers`, `commands`, `voice`, `recent`), `timer`, `today`, `notes`, `drive`, `closed`, `frequent`, `preferences`.
- **`widgets`**: blocos de interface que juntam features (cabeçalho, busca, herói, pilha de foco, Drive, Hoje, Notas, configurações).
- **`views/home`**: compõe a página e decide o que aparece (`model/sections.ts`).

## Fluxo de dados

| Dado | Fonte da verdade | Leitura no 1º quadro |
| --- | --- | --- |
| Configurações (atalhos, focos, contexto, relógio, provedor) | `storage.local`, validado por zod | cópia síncrona no `localStorage` |
| Tarefas, notas, seções ocultas, Inbox, sessão e resumo de foco | `localStorage` | `useLayoutEffect` (antes de pintar) |
| Recentes, frequentes, ícones, brilho de favicon | `localStorage` (cache) | idem |
| Frequentes, fechadas | API da extensão (`topSites`, `sessions`) | consulta depois do 1º quadro |

Regra: **nada novo entra no caminho crítico** da abertura da aba. Leitura síncrona só de `localStorage` e de coisas pequenas; o resto carrega depois (ociosidade, `import()` dinâmico ou ao abrir a busca).

## Como estender

### Nova seção da página
1. Acrescente `{ id, name, note }` em `src/views/home/model/sections.ts`.
2. Crie o widget em `src/widgets/<nome>/ui/` (e o hook em `src/features/<nome>/model/`, se tiver estado).
3. Renderize em `src/views/home/ui/home-page.tsx` atrás de `show("<id>")`.
O interruptor em Configurações → Seções da página nasce sozinho.

### Novo prefixo de busca direta
Uma linha em `src/features/search/model/bangs.ts` (`key`, `name`, `url(texto)`). A busca e os chips leem dessa lista. Cubra com um caso em `bangs.test.ts`.

### Nova IA
Uma entrada em `src/features/search/model/ai-providers.ts`: `url(pergunta)`, `prefill` (a URL aceita o texto?) e `keys` (prefixos). Sem `prefill`, a pergunta vai para a área de transferência. Para mudar a IA padrão de `ia texto`, altere `defaultAiId`.

### Novo comando de busca
1. Tipo e regra em `src/features/search/model/commands.ts` (`parseCommands`) + teste em `commands.test.ts`.
2. Linha (ícone, título, detalhe) no `search-bar.tsx`, no ramo `kind === "command"`.
3. Execução em `runCommand`, em `home-page.tsx`.
4. Se fizer sentido por voz, frase equivalente em `voice.ts` + teste.

### Novo ícone ou fonte de ícones
Chaves da biblioteca são `si:<slug>` (marcas) e `lu:<Nome>` (Lucide), resolvidas em `src/shared/lib/icon-library.ts`. O script `scripts/generate-brand-catalog.mjs` gera os arquivos de marcas em `public/icon-data/` antes de `dev` e `build`; a pasta gerada não entra no Git. Para uma nova fonte, converta seus dados em `IconEntry` (nós estruturados, nunca HTML) e inclua o prefixo na resolução e em `searchIcons()`. Apelidos de host para marca ficam em `hostAlias`.

### Novo dado salvo
- Dado de usuário que deve ser exportado/sincronizado → **schema de configurações** (`settings.ts`, versão e migração; ver Fase 1 do planejamento).
- Dado de layout ou leve, só deste navegador → chave `nt-*` no `localStorage`, com leitura em `useLayoutEffect`, `try/catch` e filtragem do que lê (nunca confie no formato).
- Documente a chave na tabela do README.

### Nova permissão
`public/manifest.json` + tabela de permissões do README, com a razão. Toda permissão nova pede aprovação do usuário ao atualizar a extensão: só acrescente se não houver alternativa.

## Regras de performance e de visual

- Movimento só em `transform` e `opacity`; entradas rodam uma vez por abertura (`animation-fill-mode: backwards`); tudo desligado com `prefers-reduced-motion`.
- `backdrop-filter` só em superfícies grandes e poucas (hoje: cabeçalho, busca, painel de resultados, diálogo, cartões de foco, aviso). Itens repetidos (favoritos, tarefas) usam vidro leve, sem desfoque.
- Sem `background-attachment: fixed`, sem listener de scroll por quadro (use `IntersectionObserver` ou um listener passivo com `requestAnimationFrame`), sem `setInterval` ocioso.
- Texto com `background-clip: text` não vale para filhos animados (some); use cor sólida.
- Vidro: sem pseudo-elementos nem máscaras nas superfícies com `border-radius` grande (vazavam do raio).
- Bibliotecas grandes (ícones, voz local no futuro) nunca no bundle inicial.

## Dívida técnica conhecida

- `widgets/search-bar/ui/search-bar.tsx` concentra tipos de linha, montagem e renderização (~500 linhas). Próximo passo: um registro de **fontes de resultado** (`address`, `bang`, `ai`, `command`, `result`…), cada uma com `match(query)` e `render(row)`, e a barra só orquestra teclado e painel.
- `globals.css` é um arquivo único e longo, com blocos que se sobrepõem por ordem. Dividir por widget (CSS por camada) quando houver teste visual que proteja.
- `ESLint` precisa de ajuste após a atualização de dependências, e o `scripts/*.mjs` precisa dos globais do Node.
- Preferências (zod, `storage.local`) e dados leves (`nt-*`) vivem em dois mundos; ver Fase 1.
