"use client";

import { useEffect, useState } from "react";
import { parseAiPrefix } from "@features/search/model/ai-providers";
import { parseBang } from "@features/search/model/bangs";
import { calculate, formatResult } from "@features/search/model/calc";

/** A busca avisa o que está sendo digitado por este evento (sem render da página). */
export const queryEvent = "nexo:query";

const short = (text: string) => (text.length > 36 ? `${text.slice(0, 35)}…` : text);

/** Título a partir do que foi digitado; null quando o campo está vazio. */
export function titleForQuery(query: string): string | null {
  const text = query.trim();
  if (!text) return null;
  const ai = parseAiPrefix(text);
  if (ai) return ai.text ? `${ai.provider.name}: ${short(ai.text)} — Nexo` : `Perguntar ao ${ai.provider.name} — Nexo`;
  const calc = calculate(text);
  if (calc !== null) return `${text} = ${formatResult(calc)} — Nexo`;
  const bang = parseBang(text);
  if (bang) return `${bang.bang.name}: ${short(bang.text)} — Nexo`;
  if (/^(\+|nota\s|foco\s|@)/i.test(text)) return `Comando: ${short(text)} — Nexo`;
  if (/^(https?:\/\/|[\w-]+(\.[\w-]+)+(\/|$))/i.test(text)) return `Abrir ${short(text.replace(/^https?:\/\//i, ""))} — Nexo`;
  return `Buscando “${short(text)}” — Nexo`;
}

/**
 * Título da aba, que conta o que importa sem abrir a página:
 * - digitando na busca: "GitHub: react — Nexo", "Claude: como… — Nexo",
 *   "2+2*8 = 18 — Nexo", "Buscando “git” — Nexo" (tem prioridade);
 * - foco rodando: "⏱ 24:10 · Foco — Nexo" (a aba vira o cronômetro);
 * - foco concluído: "✓ Foco concluído — Nexo";
 * - senão: "Nexo · Desenvolvimento", com as tarefas de hoje que faltam à frente,
 *   "(3) Nexo · Desenvolvimento".
 * Só este componente renderiza a cada tecla; a página não.
 */
export function DocumentTitle({
  contextName,
  pending,
  focus,
}: {
  contextName: string;
  pending: number;
  focus: { label: string; done: boolean } | null;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onQuery = (event: Event) => setQuery((event as CustomEvent<string>).detail ?? "");
    window.addEventListener(queryEvent, onQuery);
    return () => window.removeEventListener(queryEvent, onQuery);
  }, []);
  const typed = titleForQuery(query);
  const label = focus?.label;
  const done = focus?.done;
  const running = Boolean(focus);
  useEffect(() => {
    document.title =
      typed ??
      (running
        ? done
          ? "✓ Foco concluído — Nexo"
          : `⏱ ${label} · Foco — Nexo`
        : `${pending > 0 ? `(${pending}) ` : ""}Nexo · ${contextName}`);
  }, [typed, running, done, label, pending, contextName]);
  return null;
}

