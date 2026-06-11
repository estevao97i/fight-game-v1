/* =====================================================================
   FIGHT V2 — [RENDER] Toda a arte cartoon desenhada em canvas.
   Visual: cores saturadas, contornos grossos, gradientes com brilho —
   inspirado em Clash Royale. Cada camada do cenário tem um fator de
   PARALLAX diferente (quanto mais perto, mais se move com a câmera).
   ===================================================================== */
const Render = (() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const C = CONFIG.COLORS;

  /* ---------- Escala / viewport (resolução virtual 9:16 + DPR) ---------- */

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const targetAspect = CONFIG.VW / CONFIG.VH;

    let cssW = winW;
    let cssH = winW / targetAspect;
    if (cssH > winH) { cssH = winH; cssW = winH * targetAspect; }

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    const renderScale = (cssW / CONFIG.VW) * dpr;
    canvas.width = Math.round(CONFIG.VW * renderScale);
    canvas.height = Math.round(CONFIG.VH * renderScale);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

    // Overlays DOM (start/game over) casam com a área do canvas.
    const rect = canvas.getBoundingClientRect();
    document.querySelectorAll(".screen").forEach((s) => {
      s.style.width = rect.width + "px";
      s.style.height = rect.height + "px";
      s.style.left = rect.left + "px";
      s.style.top = rect.top + "px";
    });

    RiveBridge.resize();
  }

  function toVirtual(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CONFIG.VW,
      y: ((clientY - rect.top) / rect.height) * CONFIG.VH,
    };
  }

  /* ---------- Utilidades de desenho ---------- */

  function rr(x, y, w, h, r) {
    const v = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + v, y);
    ctx.arcTo(x + w, y, x + w, y + h, v);
    ctx.arcTo(x + w, y + h, x, y + h, v);
    ctx.arcTo(x, y + h, x, y, v);
    ctx.arcTo(x, y, x + w, y, v);
    ctx.closePath();
  }

  function lgrad(x0, y0, x1, y1, c0, c1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    return g;
  }

  // Luva de boxe cartoon (gradiente + brilho + contorno).
  function drawGlove(x, y, r, colorA, colorB, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r * 1.15);
    g.addColorStop(0, colorA);
    g.addColorStop(1, colorB);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    // polegar
    ctx.beginPath(); ctx.arc(r * 0.62, r * 0.3, r * 0.38, 0, Math.PI * 2); ctx.fill();
    // contorno cartoon
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.strokeStyle = C.outline;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    // brilho
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.42, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* =====================================================================
     CENÁRIO COM PARALLAX — cada camada usa Effects.camera.x * fator.
     ===================================================================== */

  function layer(factor, drawFn) {
    const cam = Effects.camera;
    ctx.save();
    ctx.translate(cam.x * factor, cam.y * factor * 0.6);
    drawFn();
    ctx.restore();
  }

  function renderSky() {
    // céu fixo (gradiente) + sol + nuvens com drift e parallax leve
    ctx.fillStyle = lgrad(0, 0, 0, 300, C.skyTop, C.skyBottom);
    ctx.fillRect(-40, -20, CONFIG.VW + 80, 330);

    layer(0.12, () => {
      // sol
      ctx.fillStyle = "rgba(255, 240, 160, 0.9)";
      ctx.beginPath(); ctx.arc(300, 60, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255, 240, 160, 0.25)";
      ctx.beginPath(); ctx.arc(300, 60, 42, 0, Math.PI * 2); ctx.fill();

      // nuvens (drift lento)
      const t = Effects.cloudT() / 1000;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      drawCloud(((t * 6) % 480) - 80, 55, 1);
      drawCloud(((t * 4 + 240) % 480) - 80, 95, 0.7);
    });
  }

  function drawCloud(x, y, s) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.arc(18, -6, 20, 0, Math.PI * 2);
    ctx.arc(40, 0, 15, 0, Math.PI * 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Torcida: duas fileiras de "cabecinhas" coloridas que pulam.
  function renderCrowd() {
    layer(0.3, () => {
      ctx.fillStyle = C.crowdFar;
      ctx.fillRect(-40, 128, CONFIG.VW + 80, 60);
      drawCrowdRow(140, 14, 0.35, ["#ffd64d", "#ff8a7a", "#8ad4ff", "#c9a2ff", "#a8e6a1"]);
    });
    layer(0.45, () => {
      ctx.fillStyle = C.crowdNear;
      ctx.fillRect(-40, 168, CONFIG.VW + 80, 50);
      drawCrowdRow(182, 18, 0.5, ["#ff9a3c", "#7dd0ff", "#ffd64d", "#ff7b9a", "#9affd0"]);
    });
  }

  function drawCrowdRow(y, r, speed, colors) {
    for (let i = -2; i < 16; i++) {
      const x = i * 28 + 10;
      const jump = Math.abs(Math.sin(game.clock / 400 * speed * 2 + i * 1.7)) * 6;
      ctx.fillStyle = colors[((i % colors.length) + colors.length) % colors.length];
      ctx.beginPath(); ctx.arc(x, y - jump, r * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.arc(x, y - jump, r * 0.55, -0.4, Math.PI * 0.9); ctx.fill();
    }
  }

  // Ringue: postes, cordas e lona em perspectiva.
  function renderRing() {
    layer(0.6, () => {
      // postes
      ctx.fillStyle = C.post;
      rr(-14, 150, 22, 120, 8); ctx.fill();
      rr(CONFIG.VW - 8, 150, 22, 120, 8); ctx.fill();
      ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.arc(-3, 150, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(CONFIG.VW + 3, 150, 9, 0, Math.PI * 2); ctx.fill();

      // cordas (curvas levinhas, balançam com a câmera)
      const sway = Math.sin(game.clock / 800) * 2;
      drawRope(170 + sway, C.ropes);
      drawRope(196 - sway, "#ffffff");
      drawRope(224 + sway * 0.5, C.ropes2);
    });

    layer(0.78, () => {
      // lona do ringue (trapézio em perspectiva)
      ctx.fillStyle = lgrad(0, 240, 0, 470, C.ringFloorTop, C.ringFloorBottom);
      ctx.beginPath();
      ctx.moveTo(-50, 240);
      ctx.lineTo(CONFIG.VW + 50, 240);
      ctx.lineTo(CONFIG.VW + 90, 470);
      ctx.lineTo(-90, 470);
      ctx.closePath(); ctx.fill();

      // linhas de perspectiva da lona
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        const x0 = 40 + i * 70, x1 = -40 + i * 110;
        ctx.beginPath(); ctx.moveTo(x0, 240); ctx.lineTo(x1, 470); ctx.stroke();
      }
      // logo central da lona
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.ellipse(CONFIG.VW / 2, 380, 95, 32, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawRope(y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-30, y);
    ctx.quadraticCurveTo(CONFIG.VW / 2, y + 6, CONFIG.VW + 30, y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-30, y + 2);
    ctx.quadraticCurveTo(CONFIG.VW / 2, y + 8, CONFIG.VW + 30, y + 2);
    ctx.stroke();
  }

  /* =====================================================================
     OPONENTE — boxeador cartoon "3D-like" (gradientes, contornos, squash).
     ===================================================================== */

  function renderOpponent() {
    layer(1.0, () => {
      if (RiveBridge.draw(ctx, "opponent", opponent.offsetX)) return;

      const a = oppAnchor();
      const st = opponent.state;
      const cx = a.cx;

      // sombra no chão
      ctx.fillStyle = "rgba(10, 40, 80, 0.30)";
      ctx.beginPath();
      ctx.ellipse(cx, 372, 70, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // inclinação do tronco (hit = para trás; vulnerável = balança tonto)
      let tilt = 0;
      if (st === OPP_STATE.HIT) tilt = -0.22 * Math.sin(Math.min(1, opponent.stateTime / 120) * Math.PI / 2 + Math.PI / 2 * 0) - 0.18;
      if (st === OPP_STATE.VULNERABLE) tilt = Math.sin(game.clock / 180) * 0.08;

      ctx.save();
      ctx.translate(cx, 360);
      ctx.rotate(tilt);
      ctx.translate(-cx, -360);

      // ---- tronco (camiseta) ----
      const bodyG = lgrad(cx - 60, a.bodyY - 60, cx + 60, a.bodyY + 60, C.oppShirt, "#5a35b0");
      ctx.fillStyle = bodyG;
      rr(cx - 58, a.bodyY - 58, 116, 132, 34); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
      // calção
      ctx.fillStyle = C.oppShorts;
      rr(cx - 56, a.bodyY + 40, 112, 36, 14); ctx.fill();
      ctx.strokeStyle = C.outline; ctx.stroke();
      ctx.fillStyle = C.gold;
      rr(cx - 56, a.bodyY + 38, 112, 10, 5); ctx.fill();
      // brilho do tronco
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(cx - 24, a.bodyY - 28, 22, 38, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // ---- cabeça ----
      drawOppHead(cx, a.headY, st);

      ctx.restore();

      // ---- luvas (fora do tilt para mirarem na câmera) ----
      drawOppGloves(cx, a, st);

      // flash branco ao levar dano
      if (opponent.hitFlash > 0) {
        ctx.save();
        ctx.globalAlpha = opponent.hitFlash * 0.55;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(cx, a.headY, 46, 0, Math.PI * 2); ctx.fill();
        rr(cx - 58, a.bodyY - 58, 116, 132, 34); ctx.fill();
        ctx.restore();
      }

      // estrelinhas de tontura na janela vulnerável
      if (st === OPP_STATE.VULNERABLE) {
        const t = game.clock / 240;
        for (let i = 0; i < 3; i++) {
          const ang = t + (i * Math.PI * 2) / 3;
          const sx = cx + Math.cos(ang) * 44;
          const sy = a.headY - 48 + Math.sin(ang) * 10;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.translate(sx, sy);
          ctx.rotate(ang);
          ctx.fillStyle = C.gold;
          ctx.font = "900 20px Arial";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("★", 0, 0);
          ctx.restore();
        }
      }

      // "!" de aviso durante o telegraph (no lado da luva que vai bater)
      if (st === OPP_STATE.PREPARING_ATTACK) {
        const blink = 0.75 + 0.25 * Math.sin(opponent.stateTime / 70);
        const grow = 1 + 0.15 * Math.sin(opponent.stateTime / 90);
        const dir = opponent.attackSide === SIDE.LEFT ? 1 : -1;
        ctx.save();
        ctx.globalAlpha = blink;
        ctx.translate(cx + dir * 70, a.headY - 58);
        ctx.scale(grow, grow);
        // balão de aviso
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();
        ctx.font = "900 28px 'Arial Black', sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = C.telegraph;
        ctx.fillText("!", 0, 1);
        ctx.restore();
      }
    });
  }

  function drawOppHead(cx, headY, st) {
    const r = 38;
    // orelhas
    ctx.fillStyle = C.oppSkinB;
    ctx.beginPath(); ctx.arc(cx - r + 2, headY + 4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r - 2, headY + 4, 9, 0, Math.PI * 2); ctx.fill();

    // rosto
    const g = ctx.createRadialGradient(cx - 12, headY - 14, 6, cx, headY, r * 1.2);
    g.addColorStop(0, C.oppSkinA);
    g.addColorStop(1, C.oppSkinB);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, headY, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = C.outline; ctx.stroke();

    // cabelo (franja)
    ctx.fillStyle = C.oppHair;
    ctx.beginPath();
    ctx.arc(cx, headY - 6, r - 2, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(cx + 18, headY - 26, cx + 2, headY - 22);
    ctx.quadraticCurveTo(cx - 14, headY - 30, cx - 30, headY - 18);
    ctx.closePath(); ctx.fill();

    // expressão por estado
    const hurt = st === OPP_STATE.HIT;
    const dizzy = st === OPP_STATE.VULNERABLE;
    const angry = st === OPP_STATE.PREPARING_ATTACK || st === OPP_STATE.ATTACKING;

    // olhos
    if (hurt || dizzy) {
      // olhos em X
      ctx.strokeStyle = C.outline; ctx.lineWidth = 3.5;
      for (const ex of [-14, 14]) {
        ctx.beginPath();
        ctx.moveTo(cx + ex - 5, headY - 8); ctx.lineTo(cx + ex + 5, headY + 2);
        ctx.moveTo(cx + ex + 5, headY - 8); ctx.lineTo(cx + ex - 5, headY + 2);
        ctx.stroke();
      }
    } else {
      // olhos que acompanham a sua esquiva (vida!)
      const look = -player.offsetX * 0.06;
      for (const ex of [-14, 14]) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.ellipse(cx + ex, headY - 4, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#23304f";
        ctx.beginPath(); ctx.arc(cx + ex + look, headY - 2, 4, 0, Math.PI * 2); ctx.fill();
      }
      // sobrancelhas bravas
      ctx.strokeStyle = C.oppHair; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 22, headY - (angry ? 18 : 15));
      ctx.lineTo(cx - 6, headY - (angry ? 12 : 16));
      ctx.moveTo(cx + 22, headY - (angry ? 18 : 15));
      ctx.lineTo(cx + 6, headY - (angry ? 12 : 16));
      ctx.stroke();
    }

    // boca
    ctx.strokeStyle = C.outline; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath();
    if (hurt) {
      ctx.ellipse(cx, headY + 18, 7, 9, 0, 0, Math.PI * 2); // "oh!" de dor
      ctx.stroke();
    } else if (dizzy) {
      ctx.moveTo(cx - 10, headY + 20);
      ctx.quadraticCurveTo(cx, headY + 14, cx + 10, headY + 20); // boca mole
      ctx.stroke();
    } else if (angry) {
      ctx.moveTo(cx - 10, headY + 16);
      ctx.quadraticCurveTo(cx, headY + 22, cx + 10, headY + 16); // careta
      ctx.stroke();
    } else {
      ctx.moveTo(cx - 9, headY + 15);
      ctx.quadraticCurveTo(cx, headY + 22, cx + 9, headY + 15); // sorrisinho confiante
      ctx.stroke();
    }
  }

  function drawOppGloves(cx, a, st) {
    const guardL = { x: cx - 56, y: a.bodyY - 16 };
    const guardR = { x: cx + 56, y: a.bodyY - 16 };

    // Qual luva está agindo? (LEFT do oponente aparece à DIREITA da tela —
    // espelhado — e pede a SUA esquiva para a ESQUERDA.)
    const dir = opponent.attackSide === SIDE.LEFT ? 1 : -1;
    const active = dir === 1 ? guardR : guardL;
    const idle = dir === 1 ? guardL : guardR;

    let activePos = { ...active }, activeR = 20;

    if (st === OPP_STATE.PREPARING_ATTACK) {
      // luva recua e "carrega" (pulso vermelho crescente = leia e esquive!)
      const t = Math.min(1, opponent.stateTime / CONFIG.TELEGRAPH_MS);
      activePos.x = active.x + dir * 16;
      activePos.y = active.y - 26 - t * 8;
      activeR = 20 + t * 7;
      // aura de aviso
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(opponent.stateTime / 60);
      ctx.fillStyle = C.telegraph;
      ctx.beginPath(); ctx.arc(activePos.x, activePos.y, activeR + 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (st === OPP_STATE.ATTACKING) {
      // luva voa na direção da CÂMERA: cresce muito (profundidade 1ª pessoa)
      const t = Math.min(1, opponent.stateTime / CONFIG.OPP_STRIKE_ANIM_MS);
      const out = Math.sin(t * Math.PI);
      const targetX = CONFIG.VW / 2 + dir * CONFIG.OPP_PUNCH_AIM_OFFSET - Effects.camera.x;
      activePos.x = active.x + (targetX - active.x) * out;
      activePos.y = active.y + (430 - active.y) * out;
      activeR = 20 + out * 78;
    } else if (st === OPP_STATE.VULNERABLE) {
      // guarda aberta: luvas caídas (o convite para o seu soco)
      guardL.y += 52; guardR.y += 52;
      guardL.x -= 10; guardR.x += 10;
      activePos = dir === 1 ? guardR : guardL;
    }

    // braço da luva ativa (liga o ombro à luva)
    ctx.strokeStyle = C.oppShirt;
    ctx.lineWidth = 16; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + dir * 40, a.bodyY - 30);
    ctx.lineTo(activePos.x, activePos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - dir * 40, a.bodyY - 30);
    ctx.lineTo(idle.x, idle.y);
    ctx.stroke();

    drawGlove(idle.x, idle.y, 20, C.oppGloveA, C.oppGloveB, dir === 1 ? -0.4 : 0.4);
    drawGlove(activePos.x, activePos.y, activeR, C.oppGloveA, C.oppGloveB, dir * 0.3);
  }

  /* =====================================================================
     JOGADOR — 1ª pessoa: braços e luvas gigantes na base da tela.
     ===================================================================== */

  function renderPlayer() {
    if (RiveBridge.draw(ctx, "player", player.offsetX)) return;

    const st = player.state;
    const cx = CONFIG.VW / 2 + player.offsetX * 0.9;
    const bobL = Math.sin(game.clock / 420) * 5;
    const bobR = Math.sin(game.clock / 420 + Math.PI) * 5;

    // leve rotação da "câmera" na esquiva
    const tilt = -player.offsetX * 0.0035;

    ctx.save();
    ctx.translate(CONFIG.VW / 2, 560);
    ctx.rotate(tilt);
    ctx.translate(-CONFIG.VW / 2, -560);

    const pProg = st === PLAYER_STATE.ATTACKING
      ? player.stateTime / CONFIG.PLAYER_PUNCH_MS : 0;

    for (const side of [SIDE.LEFT, SIDE.RIGHT]) {
      const dir = side === SIDE.LEFT ? -1 : 1;
      const isPunching = st === PLAYER_STATE.ATTACKING && player.lastPunchSide === side;
      const bob = side === SIDE.LEFT ? bobL : bobR;

      let gx = cx + dir * 95;
      let gy = 432 + bob;
      let gr = 38;

      if (isPunching) {
        const gp = playerGlovePunch(side, pProg);
        gx = gp.x; gy = gp.y; gr = 40 * gp.scale * 0.62;
      } else if (st === PLAYER_STATE.HIT) {
        // guarda quebrada: luvas abrem
        gx += dir * 34; gy += 26;
      } else if (st === PLAYER_STATE.VULNERABLE) {
        gy += 30; // luvas caídas
      } else if (st === PLAYER_STATE.DODGING_LEFT || st === PLAYER_STATE.DODGING_RIGHT) {
        gy += 10;
      }

      // braço (vai do canto inferior até a luva)
      ctx.strokeStyle = C.playerArm;
      ctx.lineWidth = 34;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + dir * 150, 620);
      ctx.lineTo(gx + dir * 6, gy + 14);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 38;
      ctx.beginPath();
      ctx.moveTo(cx + dir * 152, 630);
      ctx.lineTo(gx + dir * 8, gy + 22);
      ctx.stroke();

      // rastro de movimento do soco (motion blur cartoon)
      if (isPunching && pProg > 0.15 && pProg < 0.75) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        const gpPrev = playerGlovePunch(side, Math.max(0, pProg - 0.18));
        drawGlove(gpPrev.x, gpPrev.y, 40 * gpPrev.scale * 0.55, C.playerGloveA, C.playerGloveB, dir * 0.2);
        ctx.restore();
      }

      drawGlove(gx, gy, gr, C.playerGloveA, C.playerGloveB, dir * 0.25);
    }

    ctx.restore();
  }

  /* =====================================================================
     HUD — barras de vida estilo CR + nomes + combo.
     ===================================================================== */

  function renderHUD() {
    // painel superior
    ctx.fillStyle = C.hudPanel;
    rr(6, 8, CONFIG.VW - 12, 58, 14); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2; ctx.stroke();

    drawHpBar(16, 36, 150, 18, player.hp, CONFIG.PLAYER_MAX_HP, C.hpMineA, C.hpMineB, false);
    drawHpBar(CONFIG.VW - 166, 36, 150, 18, opponent.hp, CONFIG.OPP_MAX_HP, C.hpOppA, C.hpOppB, true);

    ctx.font = "900 12px 'Arial Black', sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 3; ctx.strokeStyle = C.outline;
    ctx.textAlign = "left";
    ctx.strokeText("VOCÊ", 16, 28);
    ctx.fillStyle = C.text; ctx.fillText("VOCÊ", 16, 28);
    ctx.textAlign = "right";
    ctx.strokeText("RIVAL", CONFIG.VW - 16, 28);
    ctx.fillStyle = C.text; ctx.fillText("RIVAL", CONFIG.VW - 16, 28);

    // VS central
    ctx.textAlign = "center";
    ctx.font = "900 18px 'Arial Black', sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeText("VS", CONFIG.VW / 2, 48);
    ctx.fillStyle = C.gold;
    ctx.fillText("VS", CONFIG.VW / 2, 48);

    // combo
    if (game.combo > 1) {
      const pulse = 1 + Math.sin(game.clock / 110) * 0.06;
      ctx.save();
      ctx.translate(CONFIG.VW / 2, 92);
      ctx.scale(pulse, pulse);
      ctx.font = "900 20px 'Arial Black', sans-serif";
      ctx.lineWidth = 5;
      ctx.strokeText(`COMBO x${game.combo}`, 0, 0);
      ctx.fillStyle = C.gold;
      ctx.fillText(`COMBO x${game.combo}`, 0, 0);
      ctx.restore();
    }
  }

  function drawHpBar(x, y, w, h, hp, maxHp, ca, cb, rightToLeft) {
    const ratio = Math.max(0, hp / maxHp);
    ctx.fillStyle = C.hpEmpty;
    rr(x, y, w, h, h / 2); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = C.hpBorder; ctx.stroke();

    if (ratio > 0.02) {
      const fw = Math.max(h, w * ratio);
      const fx = rightToLeft ? x + (w - fw) : x;
      ctx.save();
      rr(x, y, w, h, h / 2); ctx.clip();
      ctx.fillStyle = lgrad(0, y, 0, y + h, ca, cb);
      rr(fx, y, fw, h, h / 2); ctx.fill();
      // gloss
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      rr(fx + 3, y + 2, fw - 6, h * 0.4, h * 0.2); ctx.fill();
      ctx.restore();
    }
  }

  /* =====================================================================
     BOTÕES — 2 de soco em cima, 2 de esquiva embaixo, estilo chunky.
     ===================================================================== */

  function buildButtons() {
    const pad = 12;
    const areaTop = 462;
    const areaH = CONFIG.VH - areaTop;
    const colW = (CONFIG.VW - pad * 3) / 2;
    const rowH = (areaH - pad * 3) / 2;
    const xL = pad, xR = pad * 2 + colW;
    const yTop = areaTop + pad, yBot = yTop + rowH + pad;

    return [
      { id: "PUNCH_L", x: xL, y: yTop, w: colW, h: rowH, kind: "punch", side: SIDE.LEFT,  action: () => playerPunch(SIDE.LEFT) },
      { id: "PUNCH_R", x: xR, y: yTop, w: colW, h: rowH, kind: "punch", side: SIDE.RIGHT, action: () => playerPunch(SIDE.RIGHT) },
      { id: "DODGE_L", x: xL, y: yBot, w: colW, h: rowH, kind: "dodge", side: SIDE.LEFT,  action: () => playerDodge(SIDE.LEFT) },
      { id: "DODGE_R", x: xR, y: yBot, w: colW, h: rowH, kind: "dodge", side: SIDE.RIGHT, action: () => playerDodge(SIDE.RIGHT) },
    ];
  }

  function renderButtons(activePointers) {
    const locked = !playerCanAct();

    // Durante o telegraph, o botão de esquiva CORRETO pisca em dourado —
    // ensina o jogador e deixa a luta fácil de ler.
    const telegraphing = opponent.state === OPP_STATE.PREPARING_ATTACK;
    const correctDodgeId = opponent.attackSide === SIDE.LEFT ? "DODGE_L" : "DODGE_R";

    for (const b of Render.buttons) {
      const pressed = [...activePointers.values()].includes(b.id);
      const press = pressed ? 4 : 0;
      const highlight = telegraphing && b.id === correctDodgeId && !locked;

      if (highlight) {
        const pulse = 0.5 + 0.5 * Math.sin(game.clock / 80);
        ctx.save();
        ctx.globalAlpha = 0.45 + 0.4 * pulse;
        ctx.lineWidth = 8;
        ctx.strokeStyle = C.gold;
        rr(b.x - 4, b.y - 4, b.w + 8, b.h + 8, 22);
        ctx.stroke();
        ctx.restore();
      }

      let ca, cb, shadow;
      if (locked) { ca = C.btnLockedA; cb = C.btnLockedB; shadow = C.btnLockedShadow; }
      else if (b.kind === "punch") { ca = C.btnPunchA; cb = C.btnPunchB; shadow = C.btnPunchShadow; }
      else { ca = C.btnDodgeA; cb = C.btnDodgeB; shadow = C.btnDodgeShadow; }

      // sombra 3D do botão
      ctx.fillStyle = shadow;
      rr(b.x, b.y + 6, b.w, b.h, 18); ctx.fill();
      // corpo
      ctx.fillStyle = lgrad(0, b.y + press, 0, b.y + b.h, ca, cb);
      rr(b.x, b.y + press, b.w, b.h - 4, 18); ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      rr(b.x + 3, b.y + press + 3, b.w - 6, b.h - 10, 14); ctx.stroke();

      // ícone + rótulo
      const cxB = b.x + b.w / 2, cyB = b.y + press + b.h / 2 - 8;
      const dir = b.side === SIDE.LEFT ? -1 : 1;

      if (b.kind === "punch") {
        drawGlove(cxB + dir * 0, cyB - 2, 17, "#ffffff", "#ffd0c0", dir * 0.4);
      } else {
        // seta de esquiva
        ctx.save();
        ctx.translate(cxB, cyB);
        ctx.scale(dir, 1);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = C.outline;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(-2, -13); ctx.lineTo(-2, -5);
        ctx.lineTo(-14, -5); ctx.lineTo(-14, 5); ctx.lineTo(-2, 5);
        ctx.lineTo(-2, 13); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      ctx.font = "900 12px 'Arial Black', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 3; ctx.strokeStyle = C.outline;
      const label = b.kind === "punch"
        ? (b.side === SIDE.LEFT ? "SOCO ESQ" : "SOCO DIR")
        : (b.side === SIDE.LEFT ? "ESQUIVA ESQ" : "ESQUIVA DIR");
      ctx.strokeText(label, cxB, b.y + press + b.h - 16);
      ctx.fillStyle = locked ? C.textDim : C.text;
      ctx.fillText(label, cxB, b.y + press + b.h - 16);
    }
  }

  /* ---------- Banner central / vinheta de dano ---------- */

  function renderBanner() {
    if (!game.banner) return;
    const b = game.banner;
    const t = b.time / b.dur;
    const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    ctx.translate(CONFIG.VW / 2, 235);
    ctx.scale(pop, pop);
    ctx.font = "900 24px 'Arial Black', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.outline;
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }

  function renderHitVignette() {
    if (player.hitFlash <= 0) return;
    const g = ctx.createRadialGradient(
      CONFIG.VW / 2, CONFIG.VH / 2, CONFIG.VH * 0.25,
      CONFIG.VW / 2, CONFIG.VH / 2, CONFIG.VH * 0.62
    );
    g.addColorStop(0, "rgba(255,30,40,0)");
    g.addColorStop(1, `rgba(255,30,40,${0.5 * player.hitFlash})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
  }

  /* ---------- Render mestre ---------- */

  function render(activePointers) {
    const cam = Effects.camera;

    ctx.clearRect(0, 0, CONFIG.VW, CONFIG.VH);

    // câmera: shake + lunge de zoom no soco (em volta do centro da arena)
    ctx.save();
    ctx.translate(CONFIG.VW / 2 + cam.shakeX, 300 + cam.shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-CONFIG.VW / 2, -300);

    renderSky();
    renderCrowd();
    renderRing();
    renderOpponent();
    layer(1.0, () => Effects.renderParticles(ctx));
    renderPlayer();

    ctx.restore();

    // camadas de tela (sem câmera)
    renderHitVignette();
    renderHUD();
    renderButtons(activePointers);
    renderBanner();
    Effects.renderFloaters(ctx);

    // flash dourado de câmera lenta (esquiva perfeita)
    if (game.slowmo > 0) {
      ctx.fillStyle = `rgba(255, 214, 77, ${0.10 * (game.slowmo / 380)})`;
      ctx.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
    }
  }

  const api = { resize, toVirtual, render, buttons: buildButtons() };
  api.rebuildButtons = () => { api.buttons = buildButtons(); };
  return api;
})();
