/**
 * Calculadora da busca: "1250*0,15", "(3+4)^2", "20% de 350", "2.500 / 3".
 * Analisador próprio (descida recursiva), sem eval. Só responde quando o
 * texto é claramente uma conta: tem um operador e só números/operadores.
 */
const ALLOWED = /^[\d\s.,+\-*/x×÷^%()]+$/i;

export function calculate(input: string): number | null {
  // "=" na frente força a conta (útil para começar com número na aba nova).
  let text = input.trim().toLowerCase().replace(/^=\s*/, "");
  if (!text) return null;
  // "20% de 350" → 20/100*350
  const percentOf = /^(\d+(?:[.,]\d+)?)\s*%\s*(?:de|of)\s*(\d+(?:[.,]\d+)?)$/.exec(text);
  if (percentOf) return (num(percentOf[1]) / 100) * num(percentOf[2]);
  if (!ALLOWED.test(text) || !/\d/.test(text) || !/[+\-*/x×÷^%]/.test(text.replace(/^-/, ""))) return null;
  text = text.replace(/×|x/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  // Milhar com ponto (2.500) vira 2500; vírgula decimal vira ponto.
  text = text.replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2").replace(/,/g, ".");

  let at = 0;
  const peek = () => text[at];
  function expression(): number {
    let value = term();
    while (peek() === "+" || peek() === "-") value = text[at++] === "+" ? value + term() : value - term();
    return value;
  }
  function term(): number {
    let value = power();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = text[at++];
      const right = power();
      value = op === "*" ? value * right : op === "/" ? value / right : value % right;
    }
    return value;
  }
  function power(): number {
    const base = unary();
    if (peek() === "^") {
      at++;
      return base ** power();
    }
    return base;
  }
  function unary(): number {
    if (peek() === "-") {
      at++;
      return -unary();
    }
    if (peek() === "+") {
      at++;
      return unary();
    }
    return atom();
  }
  function atom(): number {
    if (peek() === "(") {
      at++;
      const value = expression();
      if (text[at++] !== ")") throw new Error("parêntese");
      return value;
    }
    const match = /^\d+(\.\d+)?/.exec(text.slice(at));
    if (!match) throw new Error("número");
    at += match[0].length;
    return Number(match[0]);
  }
  try {
    const value = expression();
    return at === text.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function num(value: string): number {
  return Number(value.replace(",", "."));
}

const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 10 });
/** 187.5 → "187,5" (o formato de quem digita em pt-BR). */
export const formatResult = (value: number) => format.format(value);
