import { notifyFocusDone, primeNotifications } from "./notify";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

export type FocusSession = {
  /** Item de foco a que a sessão pertence (null = foco livre). */
  itemId: string | null;
  title: string;
  endsAt: number;
  total: number;
  state: "running" | "done";
};

const key = "nt-focus-session";
const statsKey = "nt-focus-stats";

export type FocusStats = { sessions: number; minutes: number };
const today = () => new Date().toLocaleDateString("sv-SE");

function readStats(): FocusStats {
  try {
    const raw = JSON.parse(localStorage.getItem(statsKey) ?? "null") as
      (FocusStats & { day?: string }) | null;
    return raw && raw.day === today()
      ? {
          sessions: Number(raw.sessions) || 0,
          minutes: Number(raw.minutes) || 0,
        }
      : { sessions: 0, minutes: 0 };
  } catch {
    return { sessions: 0, minutes: 0 };
  }
}
function addStats(minutes: number): FocusStats {
  const next = readStats();
  next.sessions += 1;
  next.minutes += minutes;
  try {
    localStorage.setItem(statsKey, JSON.stringify({ day: today(), ...next }));
  } catch {
    // Sem localStorage: o resumo vale só nesta aba.
  }
  return next;
}
const useBeforePaint =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function read(): FocusSession | null {
  try {
    const raw = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as FocusSession | null;
    if (!raw || typeof raw.endsAt !== "number" || typeof raw.total !== "number")
      return null;
    return {
      itemId: typeof raw.itemId === "string" ? raw.itemId : null,
      title: String(raw.title ?? "Foco").slice(0, 70),
      endsAt: raw.endsAt,
      total: raw.total,
      state: raw.state === "done" ? "done" : "running",
    };
  } catch {
    return null;
  }
}
function write(session: FocusSession | null) {
  try {
    if (session) localStorage.setItem(key, JSON.stringify(session));
    else localStorage.removeItem(key);
  } catch {
    // Sem localStorage: a sessão vale só nesta aba.
  }
}

/** mm:ss, com horas só quando passa de 59 min. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Sessão de foco (pomodoro). O fim é um instante (`endsAt`) guardado no
 * localStorage, então vale em qualquer aba nova, sobrevive ao fechar a aba e
 * sincroniza entre abas pelo evento `storage`. O relógio só corre (1 Hz)
 * enquanto há sessão em andamento; sem sessão, nenhum timer existe.
 */
export function useFocusTimer() {
  const [session, setSession] = useState<FocusSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [stats, setStats] = useState<FocusStats>({ sessions: 0, minutes: 0 });

  useBeforePaint(() => {
    setSession(read());
    setStats(readStats());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) setSession(read());
      if (event.key === statsKey) setStats(readStats());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const running = session?.state === "running";
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  // Acabou: marca como concluída uma única vez.
  useEffect(() => {
    if (session?.state === "running" && now >= session.endsAt) {
      const done = { ...session, state: "done" as const };
      // Outra aba pode ter encerrado a mesma sessão: conta uma única vez.
      if (read()?.state === "running") {
        setStats(addStats(Math.round(session.total / 60_000)));
        notifyFocusDone(session.title);
      }
      write(done);
      setSession(done);
    }
  }, [session, now]);

  const remaining =
    session?.state === "running" ? Math.max(0, session.endsAt - now) : 0;

  // O título da aba mostra o tempo: dá para acompanhar de qualquer aba.
  useEffect(() => {
    document.title =
      session?.state === "running"
        ? `${formatRemaining(remaining)} · ${session.title}`
        : session?.state === "done"
          ? "Foco concluído · Nexo"
          : "Nexo";
  }, [session, remaining]);

  const start = useCallback(
    (target: { id: string | null; title: string }, minutes: number) => {
      const total = Math.min(Math.max(Math.round(minutes), 1), 180) * 60_000;
      const next: FocusSession = {
        itemId: target.id,
        title: target.title,
        endsAt: Date.now() + total,
        total,
        state: "running",
      };
      primeNotifications();
      write(next);
      setSession(next);
      setNow(Date.now());
    },
    [],
  );

  const stop = useCallback(() => {
    write(null);
    setSession(null);
  }, []);

  return { session, remaining, stats, start, stop };
}
