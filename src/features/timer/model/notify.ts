/**
 * Aviso de fim de foco: notificação do sistema (quando permitida) e um sinal
 * sonoro curto. Tudo opcional e à prova de falha: sem permissão ou sem áudio,
 * o selo no cabeçalho e o título da aba continuam avisando.
 */

/** Pede a permissão no clique que inicia o foco (precisa de gesto do usuário). */
export function primeNotifications(): void {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default")
      void Notification.requestPermission();
  } catch {
    // Navegador sem a API.
  }
}

function chime(): void {
  try {
    const Ctx = window.AudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [659.25, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + index * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.95);
    });
    window.setTimeout(() => void ctx.close(), 1500);
  } catch {
    // Áudio bloqueado até haver interação: sem som, sem problema.
  }
}

export function notifyFocusDone(title: string): void {
  chime();
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const note = new Notification("Foco concluído", {
      body: title,
      icon: "brand/icon-192.png",
      tag: "nexo-focus",
    });
    note.onclick = () => {
      window.focus();
      note.close();
    };
  } catch {
    // idem
  }
}
