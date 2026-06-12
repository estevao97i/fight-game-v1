/* =====================================================================
   FIGHT V2 — [LÓGICA + COLISÃO] Ações do jogador, IA do oponente e o
   sistema de colisão geométrica (hitbox/hurtbox por círculos).

   COLISÃO — como funciona:
   • O soco do JOGADOR move uma hitbox circular (a luva) da posição de
     guarda até o rosto do oponente. Durante os "frames ativos" do soco
     ela é testada contra as hurtboxes do oponente (cabeça + tronco),
     que se movem junto com a esquiva dele. Encostou = acertou.
   • O soco do OPONENTE mira um ponto deslocado do centro da tela. A sua
     "cabeça" (câmera) é uma hurtbox que desliza com a esquiva. Se a
     distância entre o ponto do soco e a sua cabeça for maior que o raio,
     o golpe passa raspando — esquiva!
   ===================================================================== */

/* ---------- Geometria compartilhada (lógica + render usam) ---------- */

// Âncora do oponente (centro, com esquiva + ginga do idle).
// O personagem é desenhado com escala `s` ancorada no chão (y=360);
// headY/bodyY já saem em coordenadas de MUNDO (pós-escala), para a
// colisão e os efeitos baterem com o desenho.
function oppAnchor() {
  const s = CHAR().look.scale || 1;
  const idleBob = opponent.state === OPP_STATE.IDLE ? Math.sin(game.clock / 290) * 5 : 0;
  const sway = opponent.state === OPP_STATE.IDLE ? Math.sin(game.clock / 530) * 6 : 0;
  return {
    cx: CONFIG.VW / 2 + opponent.offsetX + sway,
    headY: 360 - (360 - (188 + idleBob)) * s,
    bodyY: 360 - (360 - (282 + idleBob * 0.5)) * s,
    bob: idleBob,
    s,
  };
}

// Posição/escala da luva do jogador durante o soco (p = progresso 0..1).
// Saída em curva de seno: vai e volta, com pico no meio do golpe.
function playerGlovePunch(side, p) {
  const out = Math.sin(Math.min(1, Math.max(0, p)) * Math.PI); // 0->1->0
  const a = oppAnchor();
  const dir = side === SIDE.LEFT ? -1 : 1;
  const restX = CONFIG.VW / 2 + player.offsetX + dir * 95;
  const restY = 432;
  const targetX = a.cx + dir * 14;
  const targetY = a.headY + 8;
  return {
    x: restX + (targetX - restX) * out,
    y: restY + (targetY - restY) * out,
    scale: 1 + out * 0.55, // luva "cresce" indo para o fundo (profundidade)
    out,
  };
}

function circlesOverlap(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2, dy = y1 - y2;
  return dx * dx + dy * dy <= (r1 + r2) * (r1 + r2);
}

// Stats efetivos do oponente = personagem da fase × dificuldade global.
function oppDamage() {
  return Math.max(1, Math.round(CHAR().stats.dmg * DIFF().oppDmgMult));
}

function oppTelegraph() {
  return Math.max(200, Math.round(CHAR().stats.telegraph * DIFF().telegraphMult));
}

/* ---------- Ações do JOGADOR (disparadas pelo input) ---------- */

let attackHitDone = false; // o soco atual já registrou colisão?

function playerPunch(side) {
  if (!playerCanAct()) return;

  player.lastPunchSide = side;
  attackHitDone = false;
  setPlayerState(PLAYER_STATE.ATTACKING, CONFIG.PLAYER_PUNCH_MS);
  SFX.whoosh();

  // Slow Motion Revenge: na janela de escolha, este soco é o contra-golpe
  // da chain (liga o slow motion e dá ao rival a chance de desviar).
  if (typeof Revenge !== "undefined") Revenge.onPlayerPunch();

  // Detecção de spam (bem tolerante: 5 socos em 1,3s).
  player.recentPunches.push(game.clock);
  player.recentPunches = player.recentPunches.filter(
    (t) => game.clock - t <= CONFIG.SPAM_WINDOW_MS
  );
  const isSpam = player.recentPunches.length >= CONFIG.SPAM_COUNT;

  if (isSpam && opponent.state !== OPP_STATE.VULNERABLE && opponent.state !== OPP_STATE.HIT) {
    // Punição leve: ele esquiva e devolve um contra fraco.
    setOpponentState(OPP_STATE.DODGING, CONFIG.OPP_DODGE_MS);
    opponent.counterTimer = CONFIG.OPP_COUNTER_DELAY_MS;
    setPlayerState(PLAYER_STATE.VULNERABLE, CONFIG.PLAYER_VULN_MS);
    showBanner("ELE ESQUIVOU!", CONFIG.COLORS.bad);
    player.recentPunches = [];
    return;
  }

  // Às vezes o oponente esquiva um jab "no vazio" (sem punição).
  // A chance cresce a cada fase — rivais avançados escapam muito mais.
  if (opponent.state === OPP_STATE.IDLE && Math.random() < CHAR().stats.dodgeChance) {
    setOpponentState(OPP_STATE.DODGING, CONFIG.OPP_DODGE_MS);
  }
}

function playerDodge(direction) {
  if (!playerCanAct()) return;
  player.lastDodgeAt = game.clock;

  // Se o oponente está telegrafando, a esquiva dura até o golpe passar —
  // esquivar CEDO nunca falha (deixa o jogo justo e fácil de aprender).
  let dur = CONFIG.PLAYER_DODGE_MS;
  if (opponent.state === OPP_STATE.PREPARING_ATTACK) {
    const remaining = opponent.stateDur - opponent.stateTime;
    dur = Math.max(dur, remaining + 200);
  }

  setPlayerState(
    direction === SIDE.LEFT ? PLAYER_STATE.DODGING_LEFT : PLAYER_STATE.DODGING_RIGHT,
    dur
  );
  SFX.dodge();
  Effects.sweat(
    CONFIG.VW / 2 + (direction === SIDE.LEFT ? 60 : -60), 480,
    direction === SIDE.LEFT ? 1 : -1
  );
}

/* ---------- Colisão do soco do jogador (testada a cada frame) ---------- */

function updatePlayerPunchCollision() {
  if (player.state !== PLAYER_STATE.ATTACKING || attackHitDone) return;

  const p = player.stateTime / CONFIG.PLAYER_PUNCH_MS;
  if (p < 0.3 || p > 0.7) return; // frames ativos do golpe

  const glove = playerGlovePunch(player.lastPunchSide, p);
  const a = oppAnchor();
  const r = CONFIG.HIT_GLOVE_R * glove.scale * 0.7;

  // Hurtboxes escalam com o tamanho do personagem (chefão é maior).
  const hitHead = circlesOverlap(glove.x, glove.y, r, a.cx, a.headY, CONFIG.HIT_OPP_HEAD_R * a.s);
  const hitBody = circlesOverlap(glove.x, glove.y, r, a.cx, a.bodyY, CONFIG.HIT_OPP_BODY_R * a.s);
  if (!hitHead && !hitBody) return; // passou raspando (ele esquivou)

  attackHitDone = true;
  const ix = glove.x, iy = glove.y; // ponto de impacto p/ efeitos
  const def = CHAR().stats.def;     // defesa: rivais avançados perdem menos vida

  if (opponent.state === OPP_STATE.VULNERABLE) {
    // GOLPE FORTE — janela de contra-ataque aproveitada!
    // No Revenge, o golpe final da chain sai multiplicado.
    game.combo++;
    const revMult = typeof Revenge !== "undefined" ? Revenge.damageMultiplier() : 1;
    const dmg = Math.max(1, Math.round(CONFIG.DMG_PLAYER_VULN_HIT * def * revMult));
    damage(opponent, dmg);
    setOpponentState(OPP_STATE.HIT, CONFIG.OPP_HIT_STUN_MS);
    opponent.hitFlash = 1;
    SFX.bigHit();
    Effects.addShake(9);
    Effects.burst(ix, iy, CONFIG.COLORS.gold, 16, 0.34);
    Effects.ring(ix, iy, "#ffffff");
    Effects.comic(ix, iy - 10); // "POW!" de quadrinhos
    Effects.damageText(a.cx, a.headY - 60, "-" + dmg, CONFIG.COLORS.gold, true);
    showBanner(game.combo > 1 ? `COMBO x${game.combo}!` : "ACERTOU!", CONFIG.COLORS.good);
    if (typeof Revenge !== "undefined") Revenge.onPlayerLanded(ix, iy);
    checkGameOver();
  } else if (opponent.state !== OPP_STATE.DODGING && opponent.state !== OPP_STATE.HIT) {
    // JAB de chip damage — dano pequeno, sem punição.
    const dmg = Math.max(1, Math.round(CONFIG.DMG_PLAYER_JAB * def));
    damage(opponent, dmg);
    opponent.hitFlash = 0.6;
    SFX.jab();
    Effects.addShake(3);
    Effects.burst(ix, iy, "#ffffff", 6, 0.2);
    Effects.damageText(a.cx, a.headY - 55, "-" + dmg, "#ffffff", false);
    checkGameOver();
  }
}

/* ---------- Resolução do soco do OPONENTE (fim do telegraph) ---------- */

function resolveOpponentStrike() {
  // Ponto que o soco dele mira (deslocado do centro conforme o lado).
  const dir = opponent.attackSide === SIDE.LEFT ? 1 : -1;
  const targetX = CONFIG.VW / 2 + dir * CONFIG.OPP_PUNCH_AIM_OFFSET;
  const headX = CONFIG.VW / 2 + player.offsetX; // sua "cabeça" (câmera)

  // Esquiva lógica correta OU distância geométrica suficiente = desviou.
  const correctState =
    opponent.attackSide === SIDE.LEFT ? PLAYER_STATE.DODGING_LEFT : PLAYER_STATE.DODGING_RIGHT;
  const dodgedByState = player.state === correctState;
  const dodgedByGeometry = Math.abs(headX - targetX) > CONFIG.HIT_PLAYER_HEAD_R;

  setOpponentState(OPP_STATE.ATTACKING, CONFIG.OPP_STRIKE_ANIM_MS);

  if (dodgedByState || dodgedByGeometry) {
    // ESQUIVOU! Abre a janela de contra-ataque (encolhe a cada fase).
    const sinceDodge = game.clock - player.lastDodgeAt;
    const perfect = sinceDodge <= CONFIG.PERFECT_DODGE_MS;

    // Modo Slow Motion Revenge: se ativo, ele assume o fluxo a partir
    // daqui (COUNTER_CHOICE em vez da janela vulnerável normal).
    if (typeof Revenge !== "undefined" && Revenge.onDodgeSuccess(perfect)) {
      SFX.dodge();
      return;
    }

    const baseVuln = CHAR().stats.vuln;
    const vulnMs = perfect ? Math.round(baseVuln * 1.35) : baseVuln;

    // Agenda a vulnerabilidade para depois da animação do soco dele.
    opponent.pendingVuln = vulnMs;

    if (perfect) {
      game.slowmo = 380; // câmera lenta dramática
      showBanner("ESQUIVA PERFEITA!", CONFIG.COLORS.gold, 900);
    } else {
      showBanner("ESQUIVOU! BATA AGORA!", CONFIG.COLORS.good, 900);
    }
    SFX.dodge();
  } else {
    // Tomou o soco — o dano sobe a cada fase (e com a dificuldade).
    // Na chain do Revenge o golpe que conecta vem multiplicado.
    const revMult = typeof Revenge !== "undefined" ? Revenge.damageMultiplier() : 1;
    damage(player, Math.round(oppDamage() * revMult));
    if (typeof Revenge !== "undefined") Revenge.onPlayerWasHit();
    player.hitFlash = 1;
    game.combo = 0;
    if (
      player.state === PLAYER_STATE.IDLE ||
      player.state === PLAYER_STATE.ATTACKING ||
      player.state === PLAYER_STATE.DODGING_LEFT ||
      player.state === PLAYER_STATE.DODGING_RIGHT
    ) {
      setPlayerState(PLAYER_STATE.HIT, CONFIG.PLAYER_HIT_STUN_MS);
    }
    SFX.playerHit();
    Effects.addShake(11);
    Effects.damageText(CONFIG.VW / 2, 420, "-" + Math.round(oppDamage() * revMult), CONFIG.COLORS.bad, true);
    showBanner("VOCÊ TOMOU O SOCO!", CONFIG.COLORS.bad);
    checkGameOver();
  }
}

/* ---------- Máquinas de estado (update por frame) ---------- */

function updatePlayer(dt) {
  player.stateTime += dt;

  // Deslocamento suave da esquiva.
  const targetOffset =
    player.state === PLAYER_STATE.DODGING_LEFT ? -CONFIG.DODGE_OFFSET :
    player.state === PLAYER_STATE.DODGING_RIGHT ? CONFIG.DODGE_OFFSET : 0;
  player.offsetX += (targetOffset - player.offsetX) * Math.min(1, dt / 55);

  updatePlayerPunchCollision();

  // Expiração de estados temporários -> volta para IDLE.
  if (player.stateDur > 0 && player.stateTime >= player.stateDur) {
    switch (player.state) {
      case PLAYER_STATE.ATTACKING:
      case PLAYER_STATE.DODGING_LEFT:
      case PLAYER_STATE.DODGING_RIGHT:
      case PLAYER_STATE.VULNERABLE:
      case PLAYER_STATE.HIT:
        setPlayerState(PLAYER_STATE.IDLE);
        break;
    }
  }
}

function updateOpponent(dt) {
  opponent.stateTime += dt;

  // Contra-ataque agendado (punição de spam) — escala com o personagem.
  if (opponent.counterTimer > 0) {
    opponent.counterTimer -= dt;
    if (opponent.counterTimer <= 0) {
      opponent.counterTimer = 0;
      const counterDmg = Math.max(4, Math.round(oppDamage() * 0.6));
      setOpponentState(OPP_STATE.ATTACKING, CONFIG.OPP_STRIKE_ANIM_MS);
      damage(player, counterDmg);
      player.hitFlash = 0.8;
      game.combo = 0;
      SFX.playerHit();
      Effects.addShake(7);
      Effects.damageText(CONFIG.VW / 2, 420, "-" + counterDmg, CONFIG.COLORS.bad, false);
      showBanner("CONTRA-ATAQUE!", CONFIG.COLORS.bad);
      checkGameOver();
    }
  }

  // Deslocamento suave da esquiva do oponente.
  const oppTarget =
    opponent.state === OPP_STATE.DODGING
      ? (opponent.attackSide === SIDE.LEFT ? -1 : 1) * CONFIG.OPP_DODGE_OFFSET
      : 0;
  opponent.offsetX += (oppTarget - opponent.offsetX) * Math.min(1, dt / 60);

  switch (opponent.state) {
    case OPP_STATE.IDLE:
      if (opponent.stateTime >= opponent.stateDur) {
        opponent.attackSide = Math.random() < 0.5 ? SIDE.LEFT : SIDE.RIGHT;
        // O telegraph encolhe a cada fase (e na dificuldade Difícil)
        // = menos tempo de reação para você.
        setOpponentState(OPP_STATE.PREPARING_ATTACK, oppTelegraph());
        SFX.telegraph();
      }
      break;

    case OPP_STATE.PREPARING_ATTACK:
      if (opponent.stateTime >= opponent.stateDur) resolveOpponentStrike();
      break;

    case OPP_STATE.ATTACKING:
      if (opponent.stateTime >= opponent.stateDur) {
        if (opponent.pendingVuln) {
          // Errou o soco -> fica aberto para o seu contra-ataque.
          setOpponentState(OPP_STATE.VULNERABLE, opponent.pendingVuln);
          opponent.pendingVuln = 0;
        } else if (Math.random() < CHAR().stats.chain) {
          // COMBO DELE: emenda outro soco na hora, com aviso mais curto.
          // (Marca registrada das fases altas e do chefão.)
          opponent.attackSide = Math.random() < 0.5 ? SIDE.LEFT : SIDE.RIGHT;
          setOpponentState(OPP_STATE.PREPARING_ATTACK, Math.round(oppTelegraph() * 0.85));
          SFX.telegraph();
          showBanner("OLHA O COMBO!", CONFIG.COLORS.bad, 500);
        } else {
          opponentEnterIdle();
        }
      }
      break;

    case OPP_STATE.DODGING:
      if (opponent.stateTime >= opponent.stateDur) {
        if (opponent.counterTimer <= 0) opponentEnterIdle();
        else setOpponentState(OPP_STATE.IDLE, 99999); // segura até o contra
      }
      break;

    case OPP_STATE.VULNERABLE:
      if (opponent.stateTime >= opponent.stateDur) {
        game.combo = 0; // janela perdida zera o combo
        opponentEnterIdle();
      }
      break;

    case OPP_STATE.HIT:
      if (opponent.stateTime >= opponent.stateDur) opponentEnterIdle();
      break;
  }
}

function checkGameOver() {
  if (game.phase !== "FIGHTING") return;
  if (player.hp <= 0 || opponent.hp <= 0) {
    game.winner = opponent.hp <= 0 ? "PLAYER" : "OPPONENT";
    if (game.winner === "PLAYER") {
      // Sequência de NOCAUTE: o rival cai, chove confete, "NOCAUTE!" na
      // tela — só depois a tela de vitória aparece (ver updateGame).
      game.phase = "KO";
      game.koTime = 0;
      const a = oppAnchor();
      SFX.bigHit(); SFX.bell(); SFX.win();
      Effects.addShake(14);
      Effects.ring(a.cx, a.headY, CONFIG.COLORS.gold);
      Effects.confetti(CONFIG.VW / 2, 200, 70);
    } else {
      game.phase = "OVER";
      SFX.lose();
      if (typeof onMatchOver === "function") onMatchOver();
    }
  }
}

/* ---------- Update mestre ---------- */

function updateGame(dt) {
  // PAUSE: congela tudo — relógio, IA, timers, cooldowns e partículas.
  if (game.paused) return;

  game.clock += dt;

  if (game.banner) {
    game.banner.time += dt;
    if (game.banner.time >= game.banner.dur) game.banner = null;
  }

  Effects.update(dt);

  // Card "FASE X" antes da luta começar.
  if (game.phase === "INTRO") {
    game.introTime += dt;
    if (game.introTime >= 1800) {
      game.phase = "FIGHTING";
      SFX.bell();
      showBanner("LUTE!", CONFIG.COLORS.gold, 1100);
    }
    return;
  }

  // Animação de nocaute: o rival cai antes da tela de vitória.
  if (game.phase === "KO") {
    game.koTime += dt;
    if (game.koTime >= 2100) {
      game.phase = "OVER";
      if (typeof onMatchOver === "function") onMatchOver();
    }
    return;
  }

  if (game.phase !== "FIGHTING") return;

  updatePlayer(dt);
  updateOpponent(dt);
  RiveBridge.sync();
}
