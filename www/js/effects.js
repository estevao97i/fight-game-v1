/* =====================================================================
   FIGHT V2 — [EFEITOS] Câmera (parallax + shake + zoom), partículas
   e números de dano flutuantes. Todo o "suco" visual mora aqui.

   PARALLAX: a câmera persegue o offset da esquiva do jogador. Cada
   camada do cenário (céu, torcida, ringue, oponente) se move com um
   fator diferente — quanto mais perto, mais se move. No soco, a câmera
   dá um "lunge" (zoom rápido para frente), vendendo a sensação de
   profundidade em 1ª pessoa.
   ===================================================================== */
const Effects = (() => {
  const camera = {
    x: 0,        // deslocamento horizontal (parallax base)
    y: 0,        // bob vertical sutil
    zoom: 1,     // lunge do soco
    shake: 0,    // intensidade atual do tremor
    shakeX: 0,
    shakeY: 0,
  };

  const particles = [];   // { x, y, vx, vy, life, dur, size, color, kind }
  const floaters = [];    // números de dano { x, y, text, color, life, dur, big }
  let cloudT = 0;         // drift das nuvens

  /* ---------- API de spawn ---------- */

  function addShake(power) {
    camera.shake = Math.max(camera.shake, power);
  }

  // Explosão de estrelas/faíscas no ponto de impacto (estilo cartoon).
  function burst(x, y, color, count = 12, speed = 0.28) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.08,
        life: 0, dur: 380 + Math.random() * 280,
        size: 4 + Math.random() * 7,
        color,
        kind: Math.random() < 0.5 ? "star" : "dot",
      });
    }
  }

  // Anel de impacto que expande (golpe forte).
  function ring(x, y, color) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0, dur: 320, size: 10, color, kind: "ring" });
  }

  // Gotas de suor ao esquivar.
  function sweat(x, y, dir) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x, y: y + (Math.random() - 0.5) * 30,
        vx: dir * (0.15 + Math.random() * 0.2),
        vy: -0.15 + Math.random() * 0.1,
        life: 0, dur: 420,
        size: 3 + Math.random() * 3,
        color: "#bfe9ff",
        kind: "dot",
      });
    }
  }

  // Número de dano flutuante (estilo Clash Royale).
  function damageText(x, y, text, color, big = false) {
    floaters.push({ x, y, text, color, life: 0, dur: 800, big });
  }

  /* ---------- Update ---------- */

  function update(dt) {
    cloudT += dt;

    // Câmera persegue a esquiva (parallax base). Inverte o sinal:
    // jogador vai p/ esquerda -> o mundo desliza p/ direita.
    const targetX = -player.offsetX * 0.55;
    camera.x += (targetX - camera.x) * Math.min(1, dt / 70);

    // Lunge do soco: zoom rápido p/ frente enquanto ataca.
    const punching = player.state === PLAYER_STATE.ATTACKING;
    const targetZoom = punching ? 1.055 : 1.0;
    camera.zoom += (targetZoom - camera.zoom) * Math.min(1, dt / (punching ? 50 : 130));

    // Bob vertical sutil constante (respiração da câmera).
    camera.y = Math.sin(game.clock / 900) * 2;

    // Tremor com decaimento exponencial.
    camera.shake *= Math.pow(0.988, dt);
    if (camera.shake < 0.2) camera.shake = 0;
    camera.shakeX = (Math.random() * 2 - 1) * camera.shake;
    camera.shakeY = (Math.random() * 2 - 1) * camera.shake;

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0006 * dt; // gravidade leve
      if (p.life >= p.dur) particles.splice(i, 1);
    }

    // Números flutuantes
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life += dt;
      f.y -= dt * 0.05;
      if (f.life >= f.dur) floaters.splice(i, 1);
    }

    // Flashes de dano (decaem)
    player.hitFlash = Math.max(0, player.hitFlash - dt / 350);
    opponent.hitFlash = Math.max(0, opponent.hitFlash - dt / 250);

    // Câmera lenta da esquiva perfeita
    if (game.slowmo > 0) game.slowmo = Math.max(0, game.slowmo - dt);
  }

  /* ---------- Render (chamado pelo render.js) ---------- */

  function drawStar(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.lineTo(x + Math.cos(a2) * r * 0.45, y + Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  }

  function renderParticles(ctx) {
    for (const p of particles) {
      const t = p.life / p.dur;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5 * (1 - t);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + t * 70, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "star") {
        drawStar(ctx, p.x, p.y, p.size * (1 - t * 0.5), p.color);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function renderFloaters(ctx) {
    for (const f of floaters) {
      const t = f.life / f.dur;
      const pop = t < 0.18 ? 0.5 + (t / 0.18) * 0.7 : 1.2 - (t - 0.18) * 0.2;
      ctx.save();
      ctx.globalAlpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      ctx.translate(f.x, f.y);
      ctx.scale(pop, pop);
      ctx.font = `900 ${f.big ? 30 : 20}px "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 5;
      ctx.strokeStyle = CONFIG.COLORS.outline;
      ctx.strokeText(f.text, 0, 0);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, 0, 0);
      ctx.restore();
    }
  }

  function reset() {
    particles.length = 0;
    floaters.length = 0;
    camera.x = camera.y = 0;
    camera.zoom = 1;
    camera.shake = 0;
  }

  return {
    camera, cloudT: () => cloudT,
    addShake, burst, ring, sweat, damageText,
    update, renderParticles, renderFloaters, reset,
  };
})();
