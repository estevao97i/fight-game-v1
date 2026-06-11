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

  // Explosão de quadrinhos ("POW!", "BAM!") com estrela espinhosa atrás.
  const COMIC_WORDS = ["POW!", "BAM!", "PÁ!", "BOOM!", "CRACK!"];
  function comic(x, y, text) {
    particles.push({
      x, y, vx: 0, vy: -0.02,
      life: 0, dur: 560,
      size: 34,
      color: CONFIG.COLORS.gold,
      kind: "comic",
      text: text || COMIC_WORDS[(Math.random() * COMIC_WORDS.length) | 0],
      rot: (Math.random() - 0.5) * 0.5,
    });
  }

  // Chuva de confete (vitória / nocaute).
  const CONFETTI_COLORS = ["#ffd64d", "#ff5b6e", "#5fd7ff", "#7dff6e", "#c95bff", "#ff9a3c"];
  function confetti(x, y, count = 50) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 0.12 + Math.random() * 0.3;
      particles.push({
        x: x + (Math.random() - 0.5) * 120,
        y: y + (Math.random() - 0.5) * 60,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 0.22,
        life: 0, dur: 1300 + Math.random() * 700,
        size: 4 + Math.random() * 4,
        color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        kind: "confetti",
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.02,
      });
    }
  }

  // Brasa da aura do chefão (sobe e some, atrás de tudo).
  function ember(x, y, color) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.04,
      vy: -0.05 - Math.random() * 0.07,
      life: 0, dur: 800 + Math.random() * 500,
      size: 3 + Math.random() * 5,
      color,
      kind: "ember",
    });
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

    // Spawns contínuos ligados ao estado do jogo:
    const inAction = game.phase === "FIGHTING" || game.phase === "INTRO" || game.phase === "KO";
    if (inAction && typeof CHAR === "function" && typeof oppAnchor === "function") {
      const look = CHAR().look;
      // aura do chefão: brasas subindo atrás dele
      if (look.aura && Math.random() < dt / 70) {
        const a = oppAnchor();
        ember(a.cx + (Math.random() - 0.5) * 150, 372, look.aura);
      }
      // rival muito machucado pinga suor
      const hurtRatio = 1 - opponent.hp / opponent.maxHp;
      if (game.phase === "FIGHTING" && hurtRatio > 0.35 && Math.random() < dt / 700) {
        const a = oppAnchor();
        sweat(a.cx + (Math.random() < 0.5 ? -34 : 34) * a.s, a.headY, Math.random() < 0.5 ? -1 : 1);
      }
    }
    // faíscas douradas acompanhando a luva durante o SEU soco (brilho!)
    if (player.state === PLAYER_STATE.ATTACKING && typeof playerGlovePunch === "function") {
      const pr = player.stateTime / CONFIG.PLAYER_PUNCH_MS;
      if (pr > 0.1 && pr < 0.8 && Math.random() < 0.6) {
        const g = playerGlovePunch(player.lastPunchSide, pr);
        particles.push({
          x: g.x + (Math.random() - 0.5) * 30,
          y: g.y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          life: 0, dur: 260,
          size: 3 + Math.random() * 4,
          color: Math.random() < 0.5 ? "#ffffff" : CONFIG.COLORS.gold,
          kind: "star",
        });
      }
    }

    // Partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "ember") p.vy -= 0.00015 * dt;       // brasa flutua p/ cima
      else if (p.kind !== "comic") p.vy += 0.0006 * dt;   // gravidade leve
      if (p.rot !== undefined && p.vr) p.rot += p.vr * dt;
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

  // Estrela "espinhosa" de quadrinhos (12 pontas irregulares).
  function drawSpiky(ctx, x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i * 2 * Math.PI) / 12;
      const a2 = a + Math.PI / 12;
      const rOut = r * (i % 2 === 0 ? 1 : 0.85);
      ctx.lineTo(x + Math.cos(a) * rOut, y + Math.sin(a) * rOut);
      ctx.lineTo(x + Math.cos(a2) * r * 0.55, y + Math.sin(a2) * r * 0.55);
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
      } else if (p.kind === "comic") {
        // estrela espinhosa + palavra de impacto, com "pop" de escala
        const pop = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) * 0.25;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(pop, pop);
        drawSpiky(ctx, 0, 0, p.size + 14, p.color);
        drawSpiky(ctx, 0, 0, p.size + 4, "#ffffff");
        ctx.font = "900 22px 'Arial Black', sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 5; ctx.strokeStyle = CONFIG.COLORS.outline;
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = "#ff4d3a";
        ctx.fillText(p.text, 0, 0);
      } else if (p.kind === "confetti") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.kind === "ember") {
        const r = p.size * (1 - t * 0.7);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffd64d";
        ctx.globalAlpha = (1 - t) * 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
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
    addShake, burst, ring, sweat, damageText, comic, confetti, ember,
    update, renderParticles, renderFloaters, reset,
  };
})();
