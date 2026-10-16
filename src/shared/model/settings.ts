import { z } from "zod";

export const contexts = [
  "development",
  "academic",
  "career",
  "personal",
] as const;
export type ContextId = (typeof contexts)[number];
export const contextNames: Record<ContextId, string> = {
  development: "Development",
  academic: "Academic",
  career: "Career",
  personal: "Personal",
};

const url = z
  .url()
  .refine(
    (value) => /^https?:$/.test(new URL(value).protocol),
    "Use uma URL http ou https.",
  );
export const shortcutSchema = z.strictObject({
  id: z.string().min(1).max(100),
  label: z.string().trim().min(1).max(60),
  url,
  context: z.enum([...contexts, "global"]),
  keywords: z.array(z.string().trim().max(40)).max(12),
  icon: z.string().trim().max(40).optional(),
  order: z.number().int().min(0),
  favorite: z.boolean(),
});
export const focusItemSchema = z.strictObject({
  id: z.string().min(1).max(100),
  context: z.enum(contexts),
  title: z.string().trim().min(1).max(70),
  description: z.string().trim().max(180).optional(),
  url: url.optional(),
  order: z.number().int().min(0),
});
export const settingsSchema = z
  .strictObject({
    version: z.literal(1),
    activeContext: z.enum(contexts),
    shortcuts: z.array(shortcutSchema).max(250),
    focusItems: z.array(focusItemSchema).max(100),
    showClock: z.boolean(),
    searchProvider: z.enum(["google", "duckduckgo"]),
  })
  .superRefine((value, ctx) => {
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
      if (
        value.focusItems.filter((item) => item.context === context).length > 3
      ) {
        ctx.addIssue({
          code: "custom",
          message: `O contexto ${context} permite até 3 itens de foco.`,
        });
      }
    }
  });

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
