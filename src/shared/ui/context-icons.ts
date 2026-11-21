import { Briefcase, Code, GraduationCap, User } from "lucide-react";
import type { ContextId } from "@shared/model/settings";

/** Ícone de cada contexto: o mesmo no cabeçalho, na dobra e no título da seção. */
export const contextIcons = {
  development: Code,
  academic: GraduationCap,
  career: Briefcase,
  personal: User,
} satisfies Record<ContextId, unknown>;
