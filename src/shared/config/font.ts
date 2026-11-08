/**
 * Famílias tipográficas do app. Três papéis, todas variáveis e empacotadas com
 * a extensão (sem rede, sem troca de fonte ao abrir a aba). Os arquivos CSS
 * correspondentes são importados em app/layout.tsx.
 *
 *  - sans:  texto e interface (Familjen Grotesk)
 *  - serif: títulos e destaques editoriais (Brygada 1918)
 *  - mono:  código, teclas, atalhos e números (JetBrains Mono)
 *
 * Para trocar uma fonte: instale o pacote @fontsource-variable/…, troque o
 * import no layout e o nome da família aqui.
 */
export const fonts = {
  sans: '"Familjen Grotesk Variable", "Familjen Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
  serif:
    '"Brygada 1918 Variable", "Brygada 1918", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, "SF Mono", Consolas, monospace',
} as const;

export type FontToken = keyof typeof fonts;
