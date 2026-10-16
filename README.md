# Personal Command Center

Extensão Chromium de Nova Aba construída com Next.js (App Router), shadcn/ui e Tailwind CSS 4. O núcleo funciona offline: atalhos, contextos, foco, busca local e preferências ficam no navegador. Nenhuma conta, API ou telemetria é necessária.

## Rodar e instalar

Requer Node.js 24 e pnpm 11.

```sh
cd extension
pnpm install
pnpm dev
pnpm test
pnpm build
```

O servidor Next.js serve para desenvolvimento no navegador. O build gera uma exportação estática em `out/` e move os scripts embutidos para arquivos locais, compatíveis com a política de conteúdo de extensões Chromium. Para instalar a extensão, execute o build e abra `chrome://extensions` (ou a página equivalente no Edge/Brave). Ative o modo de desenvolvedor, escolha **Carregar sem compactação** e selecione a pasta `extension/out`. Após alterações, gere outro build e clique em **Atualizar** na página de extensões. O manifesto tem apenas a permissão `storage`.

## Uso

- `Ctrl/Cmd + K`: abrir a busca. `↑`/`↓`: escolher resultado. `Enter`: abrir. `Esc`: fechar.
- Favoritos são globais; o contexto selecionado muda somente as ferramentas secundárias e prioridades.
- **Configurações** permite adicionar, editar, remover e reordenar atalhos, editar até três itens de foco por contexto e escolher relógio e provedor de pesquisa.
- A pesquisa na web só ocorre quando o resultado “Pesquisar” é confirmado.
- **Exportar JSON** cria uma cópia local. **Importar JSON** valida versão, campos, URLs e limites antes de substituir os dados. **Restaurar padrões** pede confirmação.

Os links de Echoes e PurposeBond ficam vazios até você configurá-los. O botão “Continuar” aparece apenas com URL definida. Fontes e ícones da interface são locais; atalhos externos só carregam quando abertos.

## Estrutura FSD

- `src/app`: layout, rota inicial e estilos globais.
- `src/shared/ui`: componentes shadcn/ui locais.
- `src/views/home`: composição da página.
- `src/widgets`: seções visuais e diálogos.
- `src/features`: estado das preferências e filtragem da busca.
- `src/shared`: modelo validado, catálogo padrão, storage e navegação.

## Limitações

As preferências ficam neste perfil do navegador e não sincronizam com outros dispositivos. O modo web usa `localStorage`; a extensão usa `chrome.storage.local`. URLs externas exigem conexão e autenticação próprias. A versão 1 rejeita exportações de versões futuras; não há migração automática entre versões ainda.
