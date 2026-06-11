/* =====================================================================
   FIGHT V2 — [SFX + BGM] Sistema de áudio com compatibilidade mobile.

   ESTRATÉGIA (replicada do projeto "bichinhos", comprovada no iPhone):
   • MÚSICA (arquivo)  -> HTMLAudioElement, com play() disparado DENTRO
     do gesto do usuário. É o método mais confiável em iOS/Android e
     toca mesmo com o aparelho no modo silencioso.
   • EFEITOS (síntese) -> WebAudio criado sob demanda + resume() em cada
     gesto + truque do buffer mudo para destravar o iOS. Se o WebAudio
     não existir ou falhar, os efeitos viram no-op silencioso — o jogo
     nunca quebra e nada aparece no console.

   MÚSICA DE FUNDO: coloque o arquivo em  assets/audio/bgm-fight.mp3
   (loop, estilo luta/arcade). Sem o arquivo, o jogo roda normalmente.
   ===================================================================== */
const SFX = (() => {
  let ctx = null;
  let unlocked = false;

  /* ================= WebAudio (efeitos sintetizados) ================= */

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;                  // sem WebAudio -> efeitos no-op
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  // Destrava o áudio dentro de um gesto do usuário (obrigatório no mobile):
  // resume() + um buffer MUDO de 1 amostra (truque clássico do iOS Safari).
  function unlock() {
    const c = ensure();
    if (c && !unlocked) {
      try {
        const buf = c.createBuffer(1, 1, 22050);
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        src.start(0);
        unlocked = true;
      } catch (e) {}
    }
    bgmRetry(); // se a música ficou pendente, este gesto a libera
  }

  // Chame UMA vez no boot: registra o destravamento nos primeiros gestos
  // e re-ativa o contexto quando o app volta do segundo plano.
  function attachUnlock() {
    const evs = ["pointerdown", "touchend", "keydown"];
    evs.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { ensure(); bgmRetry(); }
    });
  }

  // Rajada de ruído com filtro — base de socos e whooshes.
  function noise(dur, freq, type, gainV, when = 0) {
    const c = ensure(); if (!c) return;
    try {
      const t = c.currentTime + when;
      const len = Math.ceil(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(gainV, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + dur);
    } catch (e) {}
  }

  // Tom com queda de frequência — "thud" e notas.
  function tone(f0, f1, dur, type, gainV, when = 0) {
    const c = ensure(); if (!c) return;
    try {
      const t = c.currentTime + when;
      const o = c.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(gainV, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) {}
  }

  /* ================= BGM (HTMLAudio — método bichinhos) ================= */

  const BGM_SRC = "assets/audio/bgm-fight.mp3";
  const BGM_VOLUME = 0.1; // ~10% do volume máximo
  let bgmEl = null;
  let bgmOk = null;      // null = desconhecido | true = carregou | false = sem asset
  let bgmWanted = false; // a música DEVERIA estar tocando agora?

  function bgmEnsure() {
    if (bgmEl) return;
    try {
      bgmEl = new Audio(BGM_SRC);
      bgmEl.loop = true;
      bgmEl.volume = BGM_VOLUME;
      bgmEl.preload = "auto";
      // Sem o arquivo (404) ou formato não suportado: desliga sem erro.
      bgmEl.addEventListener("error", () => { bgmOk = false; });
      bgmEl.addEventListener("canplaythrough", () => {
        if (bgmOk === null) bgmOk = true;
      });
    } catch (e) { bgmOk = false; }
  }

  // Toca (ou retoma). Deve ser chamada DENTRO de um gesto do usuário na
  // primeira vez — startFight/continuar já garantem isso.
  function bgmPlay() {
    bgmWanted = true;
    bgmEnsure();
    if (!bgmEl || bgmOk === false) return;
    bgmEl.play().catch(() => { /* autoplay bloqueado: bgmRetry resolve no próximo gesto */ });
  }

  function bgmPause() {
    bgmWanted = false;
    if (bgmEl) { try { bgmEl.pause(); } catch (e) {} }
  }

  function bgmStop() {
    bgmWanted = false;
    if (bgmEl) {
      try { bgmEl.pause(); bgmEl.currentTime = 0; } catch (e) {}
    }
  }

  // Re-tenta tocar quando um novo gesto/retorno do background acontece.
  function bgmRetry() {
    if (bgmWanted && bgmEl && bgmEl.paused && bgmOk !== false) {
      bgmEl.play().catch(() => {});
    }
  }

  /* ================= API pública ================= */

  return {
    // compat: chamado nos gestos antigos; também destrava tudo
    init() { unlock(); },
    attachUnlock,

    // --- música de fundo ---
    bgmPlay, bgmPause, bgmStop,

    // --- efeitos ---
    whoosh()    { noise(0.12, 900, "bandpass", 0.25); },
    jab()       { tone(180, 60, 0.10, "square", 0.30); noise(0.06, 1800, "highpass", 0.15); },
    bigHit()    { tone(140, 40, 0.22, "square", 0.45); noise(0.18, 500, "lowpass", 0.5); },
    playerHit() { tone(110, 35, 0.25, "sawtooth", 0.4); noise(0.2, 300, "lowpass", 0.5); },
    dodge()     { noise(0.16, 1400, "bandpass", 0.2); },
    telegraph() { tone(620, 880, 0.12, "sine", 0.12); },
    bell()      { tone(880, 870, 0.7, "triangle", 0.3); tone(1320, 1310, 0.5, "sine", 0.15, 0.02); },
    pause()     { tone(440, 330, 0.12, "sine", 0.18); },
    resume()    { tone(330, 440, 0.12, "sine", 0.18); },
    uiTap()     { tone(520, 480, 0.06, "sine", 0.15); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, "triangle", 0.25, i * 0.14));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.25, "sawtooth", 0.18, i * 0.18));
    },
  };
})();
