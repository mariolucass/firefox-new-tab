/**
 * Feriados nacionais do Brasil (lei 14.759/2023 incluiu 20/11) e os pontos
 * facultativos que a maioria trata como folga: Carnaval e Corpus Christi.
 * Os móveis saem da Páscoa (algoritmo de Meeus/Jones/Butcher). Feriados
 * estaduais e municipais ficam de fora: dependem de onde se mora.
 */

/** Domingo de Páscoa do ano (calendário gregoriano). */
export function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export type Holiday = {
  name: string;
  /** Por que é feriado, em uma frase. */
  why: string;
  /** Ponto facultativo (Carnaval, Corpus Christi): a maioria folga, mas não é feriado nacional. */
  optional: boolean;
};

const fixed: Record<string, Holiday> = {
  "01-01": { name: "Confraternização Universal", why: "Início do ano civil.", optional: false },
  "04-21": {
    name: "Tiradentes",
    why: "Homenagem a Joaquim José da Silva Xavier, enforcado em 21/04/1792 por liderar a Inconfidência Mineira.",
    optional: false,
  },
  "05-01": { name: "Dia do Trabalhador", why: "Celebra as conquistas e a luta dos trabalhadores.", optional: false },
  "09-07": { name: "Independência do Brasil", why: "Marca a Independência, proclamada em 7/09/1822.", optional: false },
  "10-12": { name: "Nossa Senhora Aparecida", why: "Dia da padroeira do Brasil.", optional: false },
  "11-02": { name: "Finados", why: "Dia de lembrar e homenagear quem já partiu.", optional: false },
  "11-15": { name: "Proclamação da República", why: "Fim da monarquia: o Brasil virou república em 15/11/1889.", optional: false },
  "11-20": {
    name: "Consciência Negra",
    why: "Lembra Zumbi dos Palmares, morto em 20/11/1695, e a resistência do povo negro. Feriado nacional desde 2024.",
    optional: false,
  },
  "12-25": { name: "Natal", why: "Celebra o nascimento de Jesus Cristo.", optional: false },
};

const key = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const shift = (base: Date, days: number) => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return key(next);
};

const movable = new Map<number, Record<string, Holiday>>();
function movableOf(year: number): Record<string, Holiday> {
  let found = movable.get(year);
  if (!found) {
    const base = easter(year);
    const carnival: Holiday = {
      name: "Carnaval",
      why: "Festa popular que antecede a Quaresma. Ponto facultativo: a maioria folga, mas não é feriado nacional.",
      optional: true,
    };
    found = {
      [shift(base, -48)]: carnival,
      [shift(base, -47)]: carnival,
      [shift(base, -2)]: { name: "Sexta-feira Santa", why: "Lembra a paixão e a morte de Jesus Cristo, na semana da Páscoa.", optional: false },
      [shift(base, 60)]: {
        name: "Corpus Christi",
        why: "Celebra a Eucaristia, 60 dias depois da Páscoa. Ponto facultativo.",
        optional: true,
      },
    };
    movable.set(year, found);
  }
  return found;
}

/** O feriado em `date` (nome, motivo e se é ponto facultativo), ou null. */
export function holidayInfo(date: Date): Holiday | null {
  const id = key(date);
  return fixed[id] ?? movableOf(date.getFullYear())[id] ?? null;
}

/** Nome do feriado em `date`, ou null se for um dia comum. */
export function holidayOn(date: Date): string | null {
  const info = holidayInfo(date);
  if (!info) return null;
  return info.optional ? `${info.name} (ponto facultativo)` : info.name;
}

/** Próximo feriado depois de `from` (até 400 dias à frente) e quantos dias faltam. */
export function nextHoliday(from: Date): { date: Date; info: Holiday; days: number } | null {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let days = 1; days <= 400; days += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + days);
    const info = holidayInfo(date);
    if (info) return { date, info, days };
  }
  return null;
}
