/* =====================================================================
   FIGHT V2 — [SLOW MOTION REVENGE] Modo opcional de contra-ataques
   encadeados em câmera lenta (Punch-Out × Sifu × Matrix).

   FLUXO:
     inimigo ataca → você esquiva → COUNTER_CHOICE (barra ~800ms para
     escolher soco ESQ/DIR) → REVENGE_CHAIN (slow motion global) →
     o inimigo pode DESVIAR do seu soco → ele revida → você esquiva →
     loop... A cada troca: chain++, janela de reação menor, dano maior,
     luvas mais brilhantes. A chain acaba quando um golpe conecta
     (dano × multiplicador) ou quando você não escolhe a tempo.

   DESLIGADO (padrão), o jogo se comporta EXATAMENTE como antes: todos
   os hooks externos retornam cedo / multiplicador 1 / timeScale 1.

   INTEGRAÇÃO (hooks únicos, sem lógica espalhada):
     logic.js  → onDodgeSuccess() | onPlayerPunch() | onPlayerLanded()
                 | onPlayerWasHit() | damageMultiplier()
     main.js   → update(realDt) | timeScale() | reset()
     render.js → render(ctx) | gloveGlow(ctx,…) | choiceActive()
   ===================================================================== */
const Revenge = (() => {

  /* ---------------- CONFIG (tudo ajustável aqui) ---------------- */
  const CFG = {
    STORAGE_KEY: "fightv2_revenge",
    TIME_SCALE: 0.35,            // câmera lenta global durante a chain
    // Janela de reação (ms REAIS) por chain — escolha do soco e
    // telegraph do revide do inimigo. Último valor = mínimo.
    REACTION_MS: [900, 800, 700, 600, 500],
    PERFECT_BONUS_MS: 150,       // esquiva perfeita dá um respiro extra
    // Multiplicador de dano por chain (vale para os DOIS lados).
    DMG_MULT: [1.0, 1.25, 1.5, 1.75, 2.0, 2.5],
    // Chance do inimigo desviar do seu contra-golpe (cresce por chain).
    OPP_DODGE_BASE: 0.45,
    OPP_DODGE_PER_CHAIN: 0.06,
    OPP_DODGE_MAX: 0.8,
    HOLD_MS: 999999,             // "segura" estados enquanto o módulo decide
    FAILSAFE_MS: 4000,           // qualquer etapa travada > isto → aborta limpo
    GLOW_MAX_LEVEL: 5,
  };

  // Estados internos do módulo (a luta continua usando PLAYER/OPP_STATE).
  const ST = {
    INACTIVE: "INACTIVE",
    WAIT_OPEN: "WAIT_OPEN",           // espera o soco errado do rival terminar
    COUNTER_CHOICE: "COUNTER_CHOICE", // barra: escolha soco ESQ/DIR
    PLAYER_STRIKE: "PLAYER_STRIKE",   // seu soco viaja em slow motion
    OPP_RESPONSE: "OPP_RESPONSE",     // ele desviou e revida — esquive!
  };

  let enabled = loadEnabled();
  let state = ST.INACTIVE;
  let chain = 0;          // revengeChainCount
  let slow = false;       // slow motion ligado (a partir da escolha)
  let timer = 0;          // tempo restante da etapa atual (ms reais)
  let choiceDur = 1;      // duração total da barra (p/ desenhar a fração)
  let stepAge = 0;        // failsafe: idade da etapa atual (ms reais)
  let pendingPerfect = false;

  function loadEnabled() {
    try { return localStorage.getItem(CFG.STORAGE_KEY) === "1"; } catch (e) {}
    return false;
  }

  function reactionMs(c) {
    return CFG.REACTION_MS[Math.min(c, CFG.REACTION_MS.length - 1)];
  }

  function multiplier(c) {
    return CFG.DMG_MULT[Math.min(c, CFG.DMG_MULT.length - 1)];
  }

  function oppDodgeChance(c) {
    return Math.min(CFG.OPP_DODGE_MAX, CFG.OPP_DODGE_BASE + c * CFG.OPP_DODGE_PER_CHAIN);
  }

  function setState(s) { state = s; stepAge = 0; }

  // Encerra a sequência e devolve o combate ao ritmo normal.
  function endChain() {
    setState(ST.INACTIVE);
    chain = 0;
    slow = false;
    pendingPerfect = false;
  }

  /* ---------------- Transições internas ---------------- */

  function enterCounterChoice() {
    setPlayerState(PLAYER_STATE.IDLE); // libera os botões de soco
    timer = reactionMs(chain) + (pendingPerfect ? CFG.PERFECT_BONUS_MS : 0);
    pendingPerfect = false;
    choiceDur = timer;
    setState(ST.COUNTER_CHOICE);
    SFX.telegraph();
  }

  function enterOppResponse() {
    chain++; // troca bem sucedida (ele escapou do seu soco)
    opponent.attackSide = Math.random() < 0.5 ? SIDE.LEFT : SIDE.RIGHT;
    // Duração em ms de JOGO ≈ reação real desejada × timeScale.
    const telegraphGameMs = Math.max(120, Math.round(reactionMs(chain) * CFG.TIME_SCALE));
    setOpponentState(OPP_STATE.PREPARING_ATTACK, telegraphGameMs);
    setState(ST.OPP_RESPONSE);
    SFX.telegraph();
    showBanner("ELE REVIDOU!", CONFIG.COLORS.bad, 600);
  }

  /* ---------------- HOOKS chamados pela lógica ---------------- */

  // resolveOpponentStrike(), ramo de esquiva BEM SUCEDIDA.
  // Retorna true se o Revenge assumir o fluxo (pula a janela normal).
  function onDodgeSuccess(perfect) {
    if (!enabled || game.phase !== "FIGHTING") return false;

    if (state === ST.OPP_RESPONSE) {
      chain++; // troca bem sucedida (você escapou do revide dele)
      showBanner(`REVENGE x${chain}!`, CONFIG.COLORS.gold, 600);
    } else if (state === ST.INACTIVE) {
      chain = 0;
      slow = false;
      showBanner(perfect ? "ESQUIVA PERFEITA!" : "REVANCHE!", CONFIG.COLORS.gold, 700);
    } else {
      return false; // estado inesperado: deixa o fluxo normal agir
    }

    pendingPerfect = perfect;
    // O soco errado dele termina a animação e o deixa "aberto"
    // (o ramo ATTACKING→VULNERABLE de updateOpponent já faz isso).
    opponent.pendingVuln = CFG.HOLD_MS;
    setState(ST.WAIT_OPEN);
    return true;
  }

  // playerPunch(), logo após passar pelo playerCanAct().
  function onPlayerPunch() {
    if (state !== ST.COUNTER_CHOICE) return;

    slow = true; // ETAPA 3: slow motion global a partir da escolha
    setState(ST.PLAYER_STRIKE);

    // O inimigo pode reagir ao seu contra-ataque: rola a esquiva AGORA.
    if (Math.random() < oppDodgeChance(chain)) {
      // duração cobre o soco inteiro (em ms de jogo, já desacelerados)
      opponent.attackSide = Math.random() < 0.5 ? SIDE.LEFT : SIDE.RIGHT;
      setOpponentState(OPP_STATE.DODGING, CONFIG.PLAYER_PUNCH_MS + 160);
    }
    // Se ele NÃO desviar, continua VULNERABLE: a colisão normal acerta
    // e o dano multiplicado sai em onPlayerLanded().
  }

  // logic.js, golpe forte conectou no oponente (janela vulnerável).
  function onPlayerLanded(ix, iy) {
    if (state === ST.INACTIVE) return;
    // Impacto cresce com a chain (shake/explosão extras além dos normais).
    Effects.addShake(6 + chain * 3);
    Effects.burst(ix, iy, CONFIG.COLORS.gold, 8 + chain * 5, 0.3 + chain * 0.04);
    Effects.ring(ix, iy, "#ffffff");
    if (chain > 0) {
      showBanner(`REVENGE x${chain} — FINAL!`, CONFIG.COLORS.gold, 1000);
    }
    endChain();
  }

  // resolveOpponentStrike(), ramo em que VOCÊ levou o soco.
  function onPlayerWasHit() {
    if (state === ST.INACTIVE) return;
    Effects.addShake(4 + chain * 2);
    endChain();
  }

  // Multiplicador aplicado ao dano dos DOIS lados durante a chain.
  function damageMultiplier() {
    return state === ST.INACTIVE ? 1 : multiplier(chain);
  }

  /* ---------------- Update (dt REAL, chamado pelo main) ---------------- */

  function update(realDt) {
    if (state === ST.INACTIVE) return;

    // Qualquer interrupção externa (KO, fim, menu) aborta limpo.
    if (game.phase !== "FIGHTING") { endChain(); return; }
    if (game.paused) return;

    stepAge += realDt;
    if (stepAge > CFG.FAILSAFE_MS) { endChain(); return; } // nunca travar

    switch (state) {
      case ST.WAIT_OPEN:
        // o soco errado dele terminou? (updateOpponent o deixou aberto)
        if (opponent.state === OPP_STATE.VULNERABLE) enterCounterChoice();
        break;

      case ST.COUNTER_CHOICE:
        timer -= realDt;
        if (timer <= 0) {
          // Tempo esgotado: a chance foi desperdiçada.
          showBanner("CHANCE PERDIDA!", CONFIG.COLORS.bad, 700);
          endChain();
          opponentEnterIdle();
        }
        break;

      case ST.PLAYER_STRIKE: {
        // brilho extra: faíscas acompanham a luva no slow motion
        if (player.state === PLAYER_STATE.ATTACKING && chain > 0 && Math.random() < 0.5) {
          const p = player.stateTime / CONFIG.PLAYER_PUNCH_MS;
          const g = playerGlovePunch(player.lastPunchSide, p);
          Effects.burst(g.x, g.y, chain >= 4 ? "#ffffff" : CONFIG.COLORS.gold, 2, 0.12);
        }
        // soco terminou sem acertar (ele desviou) → ele revida
        if (player.state !== PLAYER_STATE.ATTACKING) {
          if (opponent.state === OPP_STATE.DODGING || opponent.state === OPP_STATE.IDLE) {
            enterOppResponse();
          }
          // se conectou, onPlayerLanded já encerrou a chain
        }
        break;
      }

      case ST.OPP_RESPONSE:
        // resolveOpponentStrike decide: esquivou → onDodgeSuccess (loop);
        // levou → onPlayerWasHit. Aqui só vigiamos o failsafe.
        break;
    }
  }

  /* ---------------- HUD + efeitos visuais ---------------- */

  function rrPath(c, x, y, w, h, r) {
    const v = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + v, y);
    c.arcTo(x + w, y, x + w, y + h, v);
    c.arcTo(x + w, y + h, x, y + h, v);
    c.arcTo(x, y + h, x, y, v);
    c.arcTo(x, y, x + w, y, v);
    c.closePath();
  }

  // Cor do "nível de energia" das luvas/HUD conforme a chain.
  function glowColor() {
    const lvl = Math.min(chain, CFG.GLOW_MAX_LEVEL);
    if (lvl >= 5) return "#c95bff"; // super mode
    if (lvl >= 4) return "#ff4d3a";
    if (lvl >= 2) return "#ff9a3c";
    return CONFIG.COLORS.gold;
  }

  // Halo progressivo atrás das luvas do jogador (bloom fake em camadas).
  function gloveGlow(c, x, y, r) {
    const lvl = state === ST.INACTIVE ? 0 : Math.min(chain, CFG.GLOW_MAX_LEVEL);
    if (lvl <= 0) return;
    const pulse = 1 + 0.08 * Math.sin(game.clock / 90);
    const col = glowColor();
    c.save();
    for (let i = 1; i <= Math.min(3, lvl); i++) {
      c.globalAlpha = (0.16 - i * 0.035) * lvl * pulse;
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, r * (1 + 0.22 * i * pulse), 0, Math.PI * 2);
      c.fill();
    }
    if (lvl >= 5) { // quase "super mode": núcleo branco
      c.globalAlpha = 0.25 * pulse;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(x, y, r * 1.1, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // Desenhado pelo render master em espaço de tela (sem câmera).
  function render(c) {
    if (state === ST.INACTIVE) return;

    // Clima cinematográfico durante o slow motion: letterbox + tom frio.
    if (slow) {
      c.fillStyle = "rgba(8, 14, 34, 0.85)";
      c.fillRect(0, 0, CONFIG.VW, 16);
      c.fillRect(0, CONFIG.VH - 16, CONFIG.VW, 16);
      c.fillStyle = "rgba(80, 140, 255, 0.06)";
      c.fillRect(0, 0, CONFIG.VW, CONFIG.VH);
    }

    // Indicador discreto da chain.
    const label = `REVENGE x${chain}`;
    const pulse = 1 + 0.05 * Math.sin(game.clock / 110);
    c.save();
    c.translate(CONFIG.VW / 2, 116);
    c.scale(pulse, pulse);
    c.font = "900 15px 'Arial Black', sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.lineWidth = 4;
    c.strokeStyle = CONFIG.COLORS.outline;
    c.strokeText(label, 0, 0);
    c.fillStyle = glowColor();
    c.fillText(label, 0, 0);
    c.restore();

    // Barra de escolha do contra-ataque (topo, abaixo do HUD).
    if (state === ST.COUNTER_CHOICE) {
      const frac = Math.max(0, timer / choiceDur);
      const bx = 40, bw = CONFIG.VW - 80, by = 134, bh = 16;

      c.save();
      // fundo
      c.fillStyle = "rgba(10, 20, 45, 0.85)";
      rrPath(c, bx - 3, by - 3, bw + 6, bh + 6, 10);
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = "rgba(255,255,255,0.4)";
      c.stroke();
      // preenchimento esvaziando (dourado → vermelho no fim)
      const col = frac < 0.35 ? "#ff4d3a" : CONFIG.COLORS.gold;
      c.fillStyle = col;
      rrPath(c, bx, by, Math.max(6, bw * frac), bh, 8);
      c.fill();
      // brilho
      c.fillStyle = "rgba(255,255,255,0.35)";
      rrPath(c, bx + 2, by + 2, Math.max(2, bw * frac - 4), bh * 0.4, 4);
      c.fill();
      // instrução piscando
      const blink = 0.7 + 0.3 * Math.sin(game.clock / 80);
      c.globalAlpha = blink;
      c.font = "900 14px 'Arial Black', sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 4;
      c.strokeStyle = CONFIG.COLORS.outline;
      c.strokeText("CONTRA-ATAQUE! 👊 ESQ ou DIR", CONFIG.VW / 2, by + bh + 16);
      c.fillStyle = "#ffffff";
      c.fillText("CONTRA-ATAQUE! 👊 ESQ ou DIR", CONFIG.VW / 2, by + bh + 16);
      c.restore();
    }
  }

  /* ---------------- API pública ---------------- */

  return {
    // toggle do menu
    isEnabled() { return enabled; },
    setEnabled(v) {
      enabled = !!v;
      try { localStorage.setItem(CFG.STORAGE_KEY, enabled ? "1" : "0"); } catch (e) {}
      if (!enabled) endChain();
    },

    // estado para o resto do jogo
    timeScale() { return slow ? CFG.TIME_SCALE : 1; },
    damageMultiplier,
    active() { return state !== ST.INACTIVE; },
    choiceActive() { return state === ST.COUNTER_CHOICE; },
    chainCount() { return chain; },

    // hooks da lógica
    onDodgeSuccess, onPlayerPunch, onPlayerLanded, onPlayerWasHit,

    // ciclo de vida
    update,
    reset() { endChain(); },

    // visual
    render, gloveGlow,
  };
})();
