/* =====================================================================
   FIGHT V2 — [SFX] Sons sintetizados via WebAudio (zero assets).
   Cada som é gerado na hora: socos, esquivas, sino, vitória, derrota.
   No mobile o contexto só "destrava" após o primeiro toque (initAudio).
   ===================================================================== */
const SFX = (() => {
  let ctx = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Rajada de ruído com filtro — base de socos e whooshes.
  function noise(dur, freq, type, gainV, when = 0) {
    const c = ensure(); if (!c) return;
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
  }

  // Tom com queda de frequência — "thud" e notas.
  function tone(f0, f1, dur, type, gainV, when = 0) {
    const c = ensure(); if (!c) return;
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
  }

  return {
    // chame no primeiro pointerdown para destravar o áudio no mobile
    init() { ensure(); },

    whoosh()    { noise(0.12, 900, "bandpass", 0.25); },
    jab()       { tone(180, 60, 0.10, "square", 0.30); noise(0.06, 1800, "highpass", 0.15); },
    bigHit()    { tone(140, 40, 0.22, "square", 0.45); noise(0.18, 500, "lowpass", 0.5); },
    playerHit() { tone(110, 35, 0.25, "sawtooth", 0.4); noise(0.2, 300, "lowpass", 0.5); },
    dodge()     { noise(0.16, 1400, "bandpass", 0.2); },
    telegraph() { tone(620, 880, 0.12, "sine", 0.12); },
    bell()      { tone(880, 870, 0.7, "triangle", 0.3); tone(1320, 1310, 0.5, "sine", 0.15, 0.02); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, "triangle", 0.25, i * 0.14));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.97, 0.25, "sawtooth", 0.18, i * 0.18));
    },
  };
})();
