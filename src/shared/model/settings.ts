import * as z from "zod/mini";

export const contexts = [
  "development",
  "academic",
  "career",
  "personal",
] as const;
export type ContextId = (typeof contexts)[number];
// Só os rótulos mudam de idioma: os ids continuam em inglês, então
// exportações antigas e dados salvos seguem válidos.
export const contextNames: Record<ContextId, string> = {
  development: "Desenvolvimento",
  academic: "Acadêmico",
  career: "Carreira",
  personal: "Pessoal",
};

// zod/mini: a mesma validação com API funcional e uma fração do tamanho —
// o Zod clássico pesava ~250 KB no pacote que cada nova aba interpreta.
const url = z.url().check(
  z.refine((value) => /^https?:$/.test(new URL(value).protocol), "Use uma URL http ou https."),
);
const text = (min: number, max: number) => z.string().check(z.trim(), z.minLength(min), z.maxLength(max));
const order = z.int().check(z.minimum(0));

export const shortcutSchema = z.strictObject({
  id: z.string().check(z.minLength(1), z.maxLength(100)),
  label: text(1, 60),
  url,
  context: z.enum([...contexts, "global"]),
  keywords: z.array(text(0, 40)).check(z.maxLength(12)),
  icon: z.optional(text(0, 40)),
  order,
  favorite: z.boolean(),
});
export const focusItemSchema = z.strictObject({
  id: z.string().check(z.minLength(1), z.maxLength(100)),
  context: z.enum(contexts),
  title: text(1, 70),
  description: z.optional(text(0, 180)),
  url: z.optional(url),
  /** Repositório do GitHub ("owner/nome"): de lá vêm descrição, linguagem, estrelas e o link do deploy. */
  repo: z.optional(text(0, 100)),
  /** Endereço do deploy (produção). Sem ele, vale o "homepage" do repositório. */
  deploy: z.optional(url),
  order,
});
export const settingsSchema = z
  .strictObject({
    version: z.literal(1),
    activeContext: z.enum(contexts),
    shortcuts: z.array(shortcutSchema).check(z.maxLength(250)),
    focusItems: z.array(focusItemSchema).check(z.maxLength(100)),
    showClock: z.boolean(),
    searchProvider: z.enum(["google", "duckduckgo"]),
  })
  .check(
    z.superRefine((value, ctx) => {
      for (const [name, items] of [
        ["shortcuts", value.shortcuts],
        ["focusItems", value.focusItems],
      ] as const) {
        const ids = new Set<string>();
        for (const item of items) {
          if (ids.has(item.id))
            ctx.addIssue({
              code: "custom",
              message: `ID duplicado em ${name}: ${item.id}`,
            });
          ids.add(item.id);
        }
      }
      for (const context of contexts) {
        if (value.focusItems.filter((item) => item.context === context).length > 3) {
          ctx.addIssue({
            code: "custom",
            message: `O contexto ${context} permite até 3 itens de foco.`,
          });
        }
      }
    }),
  );

export type Shortcut = z.infer<typeof shortcutSchema>;
export type FocusItem = z.infer<typeof focusItemSchema>;
export type Settings = z.infer<typeof settingsSchema>;

export function parseSettings(input: unknown): Settings {
  return settingsSchema.parse(input);
}

export function validUrl(input: string): string | null {
  const result = url.safeParse(input.trim());
  return result.success ? result.data : null;
}
