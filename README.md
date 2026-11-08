# Nexo

Extensão de Nova Aba para o Firefox Developer Edition (funciona também em navegadores Chromium), construída com Next.js (App Router), Tailwind CSS 4 e React. O núcleo funciona offline: atalhos, contextos, foco, busca, notas e preferências ficam no navegador. Nenhuma conta, API ou telemetria é necessária.

A ideia é simples: **abrir uma aba e chegar ao destino (ou começar a trabalhar) em segundos, sem tirar a mão do teclado.**

Planejamento e arquitetura: veja [`docs/`](docs/README.md).

## Rodar e instalar

Requer Node.js 24 e pnpm (no WSL, via mise).

```sh
pnpm install
pnpm dev          # navegador comum, dados em localStorage
pnpm test
pnpm deploy:ext   # build + cópia para o Firefox (abaixo)
```

`pnpm deploy:ext` gera a exportação estática em `out/`, acrescenta ao manifesto o id do Firefox (`nexo-new-tab@local`) e a página inicial (`chrome_settings_overrides.homepage`), e espelha o resultado em `G:\My Drive\08-Workstation\Aplicativos\Firefox Developer Edition\new-tab`. De lá, o `instalar-perfil.ps1` daquela pasta empacota o `.xpi` e o instala no perfil. Feche o Firefox antes de instalar.

Em navegadores Chromium: `pnpm build`, abra `chrome://extensions`, ative o modo de desenvolvedor e carregue a pasta `out/` sem compactação.

### Permissões

| Permissão | Para quê |
| --- | --- |
| `storage` | Preferências, atalhos e foco (`storage.local`). |
| `topSites` | Sites mais visitados, lidos localmente do histórico. |
| `sessions` | Lista de abas fechadas há pouco (grupo "Fechadas há pouco" nos Recentes). |
| `notifications` | Aviso de fim de foco (notificação do sistema; opcional, o selo e o título da aba avisam de qualquer forma). |

Nada sai do navegador. Ao atualizar a extensão com uma permissão nova (`sessions`, `notifications`), o Firefox pode pedir aprovação.

## Visual e movimento

- **Fonte:** Bricolage Grotesque (variável: peso e tamanho óptico), empacotada, sem rede.
- **Vidro líquido:** cápsulas do cabeçalho, busca, painel de resultados, cartões e diálogo usam desfoque saturado, brilho especular no topo, aro de 1px e sombras em camadas. Sem pseudo-elementos nem máscaras, então nada vaza do `border-radius`. O Firefox não refrata (SVG em `backdrop-filter` só funciona no Chromium); o brilho de borda e a luz interna fazem esse papel.
- **Fundo em camadas:** base navy, três halos de cor, grade com máscara, grão e vinheta, tudo em CSS e estático. Mais uma luz ambiente que segue o ponteiro (só `transform`, laço de `requestAnimationFrame` apenas enquanto se move, desligada em telas touch e com movimento reduzido).
- **Cabeçalho fixo, em ilha:** três cápsulas de vidro. O dock de contextos tem polegar líquido (mola em `linear()`), brilho que segue o item em repouso, rótulo que se desdobra onde o ponteiro repousa e se compacta ao rolar (só o contexto ativo fica). Marca e hora recolhem o texto ao rolar.
- **Herói:** saudação pela hora do dia (ícone e cor do céu), título em dois pesos com letras em cascata, o botão **Continuar** (abre a prioridade em foco do contexto) e **Buscar**. Sob a data, o resumo de foco do dia, quando houver.
- **Entradas e interação:** elementos sobem em sequência ao abrir a aba; favoritos e cartões têm brilho que segue o cursor. Só `transform` e `opacity`, uma vez por abertura, tudo desligado com `prefers-reduced-motion`.
- **Rolagem:** a barra nativa fica escondida; um fio de vidro à direita aparece só enquanto se rola. Um fio de progresso de 2 px no topo acompanha a leitura.
- **Movimento com `motion`:** biblioteca carregada em modo enxuto (`LazyMotion` + `domAnimation`, `strict`), com `reducedMotion="user"`. Seções sobem ao entrar na tela (`Reveal`), a saudação sobe mais devagar e esmaece ao rolar (`ScrollDrift`), a marca d'água do fundo faz paralaxe com a rolagem e o ponteiro, e os números do herói contam até o valor (`CountUp`). Atalhos entram em sequência (CSS) e botões respondem ao toque com mola. Tudo só em `transform`/`opacity`.
- **Marca:** o símbolo e o logo de `public/brand` aparecem no cabeçalho, no rodapé, nos estados vazios, nos diálogos, na marca d'água do fundo e nas boas-vindas. As variantes para fundo claro trocam sozinhas com o tema.

## Aparência

Em **Configurações → Aparência** (salvo no navegador, entra no backup):

- **Tema:** Sistema (segue o do computador, ao vivo), Escuro ou Claro. Os tokens `--theme-*` e `--theme-fg` (tinta das sobreposições) são trocados no `<html>` antes do primeiro quadro; paletas em `src/shared/config/theme.ts`.
- **Cor de destaque:** azul, índigo, turquesa, rosa, laranja ou verde, com versões para texto e fundo em cada tema.
- **Luz do fundo:** intensidade dos halos atrás da página.

Na primeira abertura aparecem as **boas-vindas** (uma vez), com as teclas que mais valem.

## Busca (o centro da aba)

A busca recebe o teclado ao abrir a aba. `/` ou `Ctrl+K` voltam a ela de qualquer lugar. `↑`/`↓` escolhem, `Enter` abre, `Ctrl+Enter` abre em nova aba, `Esc` limpa (e, vazia, fecha o painel). Com o campo vazio, `1`–`9` abrem os favoritos. `?q=texto` na URL abre a busca já preenchida.

**Ao clicar na barra vazia** (não ao abrir a aba, para não cobrir a página) aparecem:

- **Recentes:** o que você abriu pela busca e os sites mais visitados. `localhost`, IPs, `.local`, logins e a página de busca do Google ficam de fora (digitando, ainda aparecem).
- **Fechadas há pouco:** até 3 abas fechadas recentemente (API `sessions`).
- Chips de **Busca direta**, **Perguntar a** (IAs) e **Comandos**, que inserem o prefixo no campo.

**Ao digitar**, em ordem: comandos, prefixos de IA, busca direta, endereço digitado (`github.com/x`, `localhost:3000` abre direto), atalhos, projetos e sites frequentes, pesquisa na web. Quando nada local casa, as IAs aparecem como opção.

### Busca direta por prefixo

`gh react` pesquisa no GitHub. Prefixos: `gh` GitHub, `yt` YouTube, `mdn` MDN, `npm`, `so` Stack Overflow, `dr` Google Drive, `w` Wikipédia, `maps`, `tr` Tradutor, `img` Google Imagens, `sch` Google Acadêmico. A lista fica em `src/features/search/model/bangs.ts`.

### IAs

Prefixos: `cl` Claude, `gpt` ChatGPT, `gem` Gemini, `gk` Grok, `ds` DeepSeek. `ia texto` usa a IA padrão (Claude). Digitar `cl como funciona X` mostra só as IAs (a escolhida primeiro) e `Enter` envia.

- **ChatGPT, Claude e Grok** abrem **já com a pergunta preenchida** (parâmetro de URL).
- **Gemini e DeepSeek** não têm parâmetro público: a pergunta vai para a área de transferência e basta colar (`Ctrl+V`).
- **`Alt+A`** foca a busca já em modo "perguntar a uma IA".

### Comandos

| Digite | Faz |
| --- | --- |
| `+ comprar café` ou `t comprar café` | Adiciona à lista **Hoje**. |
| `nota ideia de projeto` ou `n ideia` | Salva uma **nota** rápida. |
| `foco` ou `foco 45` | Inicia uma sessão de foco (25 min por padrão). |
| `@` · `@dev` · `@acad` · `@carreira` · `@pessoal` · `ir carreira` | Troca de contexto (o prefixo basta; sem acento também). |

Um aviso rápido confirma cada ação. `@` e não palavras soltas, de propósito: digitar `dev` e apertar Enter deve abrir um site, não trocar o contexto sem avisar.

### Voz

O microfone na busca (ou `Alt+M`) usa o reconhecimento de fala do navegador (pt-BR) e converte a fala na sintaxe acima: "adicionar tarefa comprar café" → `+ comprar café`; "anotar ideia" → `nota ideia`; "foco de 45 minutos" → `foco 45`; "ir para acadêmico" → `ir acadêmico`; "pergunte ao Claude como funciona um closure" → `cl como funciona um closure`; "pesquisar react hooks" → `react hooks`. A IA nunca é acionada sozinha: o resultado fica pronto na busca e `Enter` confirma.

**O Firefox não tem essa API.** Lá o botão mostra o caminho alternativo: o ditado do sistema (`Win+H` no Windows, `Fn` duas vezes no macOS) com a busca focada; o texto ditado passa pelos mesmos comandos. Em Chrome, Edge e Safari o microfone transcreve direto.

## Seções da página

Cada seção liga e desliga em **Configurações → Seções da página** (salvo no navegador, fora do JSON exportado).

- **Favoritos:** blocos com as teclas `1`–`9`. Arraste para reordenar (ou `Alt+setas` com o foco no item).
- **Drive:** a pasta de entrada (`00-Inbox`, trocável pelo lápis) em destaque, com **Nova aba** e **Copiar link**; busca dentro do Drive; atalhos para Meu Drive, Recentes, Compartilhados e Com estrela; criação de Documento, Planilha, Apresentação e Formulário em branco. São só links (sem API, token ou permissão). Os links também entram na busca ("inbox", "drive", "planilha").
- **Em foco:** pilha de cartões rolante com até 3 prioridades por contexto, cada uma com sua cor. Rola por botões, setas, deslizando ou tocando num cartão de trás. Cada cartão tem o botão **Focar** (15, 25, 45 ou 60 min):
  - Com a sessão rodando, o cartão mostra o tempo e uma barra que se esgota sozinha (animação CSS); o tempo aparece também no cabeçalho e no título da aba.
  - O fim é um instante guardado no `localStorage`: vale em qualquer aba nova, sobrevive ao fechar a aba e sincroniza entre abas abertas. Ao terminar, o cartão pulsa em verde e oferece "Mais N min".
  - O herói resume o dia: "3 sessões · 75 min de foco".
  - Ao terminar, toca um sinal curto e mostra uma notificação do sistema (se permitida). O aviso depende da aba estar aberta: o cronômetro roda na própria página.
- **Hoje:** lista de tarefas do dia (até 12). Cada tarefa pode ter **data** (fica em "Próximas" até o dia chegar; atrasada ganha etiqueta) e **repetição** (todo dia, dias úteis ou toda semana: a concluída volta pendente quando a regra vale no novo dia). O que foi concluído, sem repetição, some na virada do dia; o pendente continua. A regra é aplicada ao carregar a aba.
- **Notas:** anotações rápidas (até 50) pela busca (`nota …`) ou pelo campo da seção; copiar e remover por nota.
- **Atalhos do contexto:** lista do contexto ativo, com **Abrir tudo (n)**: abre até 12 atalhos em abas de fundo.
- **Mais visitados:** sites frequentes que ainda não são atalhos; o alfinete fixa um com nome e endereço preenchidos.

Clique direito num atalho edita. **Configurações** adiciona, edita e remove atalhos e itens de foco, escolhe relógio e provedor de pesquisa, e liga/desliga seções. **Dados → Exportar backup** baixa um `.json` com as configurações e os dados locais (notas, tarefas, vocabulário, inglês, Drive, foco, seções ocultas, aparência); **Restaurar backup** valida formato, versão, campos, URLs e limites antes de tocar em qualquer dado, mostra um resumo, pede confirmação e recarrega. Caches (frequentes, favicons, ícones) ficam de fora. **Restaurar padrões** pede confirmação.

## Ícones

~5.800 ícones sob demanda: ~3.500 marcas com a cor oficial (`simple-icons`) e ~2.300 ícones de linha (`lucide`, o mesmo traço da interface). Ordem de resolução de cada atalho:

1. chave antiga do catálogo (imediato);
2. ícone escolhido no seletor (`si:github`, `lu:Inbox`);
3. **marca automática pelo endereço do site** (`drive.google.com` → Google Drive, `github.com` → GitHub);
4. favicon do navegador (`topSites`);
5. monograma colorido.

No editor de atalho, o campo **Ícone** abre um seletor com busca e sugestões; dá para voltar ao "Automático" ou usar até duas letras. No build, `scripts/generate-brand-catalog.mjs` transforma as marcas em 64 arquivos JSON locais. A aba consulta apenas o índice e os grupos dos sites necessários; Lucide só carrega ao abrir o seletor. Cada ícone resolvido também fica em `localStorage`. O desenho é montado a partir de nós estruturados com tags e atributos de uma lista fechada, nunca HTML do cache.

## Catálogo padrão

`src/shared/model/defaults.ts` foi montado a partir do histórico real (60 dias até 07/11/2026), ordenado por **em quantos dias diferentes** cada site foi aberto. Na leitura, quem ainda tem só os atalhos de fábrica antigos (nome e URL idênticos aos de `legacy-catalog.ts`) recebe o catálogo novo automaticamente, mantendo contexto, focos e preferências. Se houver qualquer atalho próprio ou editado, nada muda.

## Performance

- Preferências, frequentes, lista de hoje, notas, seções e sessão de foco têm leitura síncrona do `localStorage`, aplicada antes do primeiro quadro (`useLayoutEffect`). O `chrome.storage` continua sendo a fonte de verdade das preferências.
- Carregamento sob demanda: painel de configurações (`React.lazy`, com pré-carga ociosa), grupos locais de marcas e catálogo Lucide apenas no seletor. Seções sem mudanças evitam renderizações causadas pelo cronômetro.
- Frequentes ficam no fim da página; se chegarem depois do primeiro quadro, não empurram nada.
- Movimento só em `transform`/`opacity`. O cabeçalho detecta rolagem com `IntersectionObserver`; o trilho de rolagem usa um listener passivo com uma escrita por quadro; a luz do fundo só roda enquanto se move; o cronômetro só tem timer (1 Hz) com sessão em andamento; a barra de progresso do foco é uma animação CSS.
- Backdrop-filter só em superfícies grandes e poucas (cabeçalho, busca, painel, diálogo, cartões); os blocos de favoritos usam vidro "leve", sem desfoque.
- O orçamento e a medição estão em [`docs/planejamento.md`](docs/planejamento.md).

## Dados e armazenamento

| Onde | Chave | O quê |
| --- | --- | --- |
| `storage.local` (+ cópia síncrona) | configurações | atalhos, focos, contexto ativo, relógio, provedor (validado por zod, exportável) |
| `localStorage` | `nt-today` | tarefas de hoje |
| `localStorage` | `nt-notes` | notas |
| `localStorage` | `nt-focus-session`, `nt-focus-stats` | sessão de foco e resumo do dia |
| `localStorage` | `nt-hidden-sections` | seções ocultas |
| `localStorage` | `nt-appearance` | tema, cor de destaque e luz do fundo |
| `localStorage` | `nt-welcomed` | boas-vindas já vistas |
| `localStorage` | `nt-vocab`, `nt-english` | vocabulário e metas de inglês |
| `localStorage` | `nt-drive-inbox` | pasta Inbox do Drive |
| `localStorage` | `nt-recent-opened`, `nt-topsites-cache` | recentes e cópia dos frequentes |
| `localStorage` | `nt-icons-v1`, `nt-icons-auto-v1`, `nt-favicon-dark` | cache de ícones |

Todas as chaves de dados do usuário (lista em `src/shared/lib/backup.ts`) entram no backup; chave nova de dado do usuário precisa ser somada lá. Ver o planejamento para a proposta de unificar e sincronizar.

## Estrutura FSD

- `src/app`: layout, rota inicial e estilos globais.
- `src/views/home`: composição da página e registro de seções (`model/sections.ts`).
- `src/widgets`: cabeçalho, busca, herói, fundo, trilho de rolagem, favoritos/listas, Em foco, Hoje, Notas, Drive, frequentes e configurações (com seletor de ícones).
- `src/features`: preferências, busca (filtro, prefixos, IAs, comandos, voz, recentes), frequentes, fechadas, drive, notas, hoje e cronômetro de foco.
- `src/shared`: tokens de tema, modelo validado, catálogos, storage, navegação, biblioteca de ícones, reordenação, spotlight e componentes base.

## Testes

`pnpm test` (Vitest) cobre: backup (validação e chaves permitidas), tarefas recorrentes e com data, filtro e endereço digitado, modelo de configurações, migração do catálogo, storage, frequentes e ruído (`localhost`), prefixos de busca direta, comandos, normalização de voz e reordenação.

## Limitações conhecidas

- As preferências ficam neste perfil do navegador e não sincronizam entre dispositivos.
- Ditado por voz embutido não existe no Firefox (ver "Voz").
- Gemini e DeepSeek dependem da área de transferência para receber a pergunta.
- O vidro não refrata no Firefox; é aproximado por brilho e luz interna.
- A barra de rolagem nativa foi substituída por um fio não arrastável.
- A versão 1 do formato rejeita exportações de versões futuras.
- `pnpm lint` precisa de ajuste após a atualização de dependências (ESLint 10) e do arquivo `scripts/deploy-extension.mjs` (globais do Node).
- O tema claro e as cores de destaque foram feitos por tokens e checados por tipos, testes e build, mas ainda não por verificação visual; vale conferir vidro, notas e contraste nas cores laranja e verde.
- A virada do dia com a aba aberta só reavalia as tarefas recorrentes ao recarregar.
- O visual novo (vidro, dock, pilha, herói, Drive) foi construído e checado por tipos e testes, mas ainda não passou por verificação visual automatizada (ver Fase 0 do planejamento).
