/* =====================================================================
   FIGHT V2 — [RIVE] Ponte entre a máquina de estados (JS) e o Rive.
   O JS é o CÉREBRO do jogo; o Rive é só a camada visual.

   COMO ATIVAR no futuro:
     1. Crie player.riv e opponent.riv no editor Rive com as State
        Machines "PlayerSM" e "OppSM" e os inputs listados abaixo.
     2. Coloque os arquivos em www/assets/.
     3. Mude USE_RIVE para true.
   Enquanto USE_RIVE=false, a arte cartoon nativa do canvas é usada e
   TODAS as chamadas viram no-op — o jogo nunca quebra.

   CONTRATO DE INPUTS (triggers/bools/numbers a criar no editor Rive):
     player.riv  (SM "PlayerSM"):
       triggers: idle, punchL, punchR, dodgeL, dodgeR, getHit
       bool:     vulnerable          number: health
     opponent.riv (SM "OppSM"):
       triggers: idle, prepareL, prepareR, attackL, attackR, dodge,
                 stun, getHit
       bool:     vulnerable          number: health
   ===================================================================== */
const RiveBridge = (() => {
  const USE_RIVE = false; // <— interruptor mestre

  const SLOTS_CFG = {
    opponent: {
      src: "assets/opponent.riv",
      sm: "OppSM",
      rect: { x: CONFIG.VW / 2 - 95, y: 130, w: 190, h: 250 },
      quality: 3,
    },
    player: {
      src: "assets/player.riv",
      sm: "PlayerSM",
      rect: { x: CONFIG.VW / 2 - 135, y: 380, w: 270, h: 250 },
      quality: 3,
    },
  };

  const slots = {}; // nome -> { cfg, canvas, rive, inputs, loaded, failed }

  function createSlot(name, cfg) {
    const off = document.createElement("canvas");
    off.style.cssText =
      "position:fixed; left:-99999px; top:0; pointer-events:none; " +
      `width:${Math.round(cfg.rect.w * cfg.quality)}px; ` +
      `height:${Math.round(cfg.rect.h * cfg.quality)}px;`;
    document.body.appendChild(off);

    const slot = { cfg, canvas: off, rive: null, inputs: {}, loaded: false, failed: false };
    slots[name] = slot;

    try {
      slot.rive = new rive.Rive({
        src: cfg.src,
        canvas: off,
        autoplay: true,
        stateMachines: cfg.sm,
        layout: new rive.Layout({ fit: rive.Fit.contain, alignment: rive.Alignment.center }),
        onLoad: () => {
          slot.rive.resizeDrawingSurfaceToCanvas();
          slot.loaded = true;
          try {
            const arr = slot.rive.stateMachineInputs(cfg.sm);
            if (arr) arr.forEach((i) => { slot.inputs[i.name] = i; });
          } catch (e) { /* sem inputs -> no-op */ }
        },
        onLoadError: () => { slot.failed = true; },
      });
    } catch (e) {
      slot.failed = true;
    }
  }

  function trig(slotName, inputName) {
    const i = slots[slotName] && slots[slotName].inputs[inputName];
    if (i && typeof i.fire === "function") i.fire();
  }
  function bool(slotName, inputName, v) {
    const i = slots[slotName] && slots[slotName].inputs[inputName];
    if (i) i.value = !!v;
  }
  function num(slotName, inputName, v) {
    const i = slots[slotName] && slots[slotName].inputs[inputName];
    if (i) i.value = v;
  }

  return {
    get enabled() { return USE_RIVE; },

    init() {
      if (!USE_RIVE || typeof window.rive === "undefined") return;
      for (const name in SLOTS_CFG) createSlot(name, SLOTS_CFG[name]);
    },

    resize() {
      for (const n in slots) {
        const s = slots[n];
        if (s.loaded && !s.failed && s.rive) {
          try { s.rive.resizeDrawingSurfaceToCanvas(); } catch (e) {}
        }
      }
    },

    // Mapeamento estado JS -> inputs do Rive
    animPlayer(state) {
      if (!USE_RIVE) return;
      switch (state) {
        case PLAYER_STATE.IDLE:
          bool("player", "vulnerable", false); trig("player", "idle"); break;
        case PLAYER_STATE.ATTACKING:
          trig("player", player.lastPunchSide === SIDE.LEFT ? "punchL" : "punchR"); break;
        case PLAYER_STATE.DODGING_LEFT:  trig("player", "dodgeL"); break;
        case PLAYER_STATE.DODGING_RIGHT: trig("player", "dodgeR"); break;
        case PLAYER_STATE.VULNERABLE:    bool("player", "vulnerable", true); break;
        case PLAYER_STATE.HIT:           trig("player", "getHit"); break;
      }
    },

    animOpponent(state) {
      if (!USE_RIVE) return;
      switch (state) {
        case OPP_STATE.IDLE:
          bool("opponent", "vulnerable", false); trig("opponent", "idle"); break;
        case OPP_STATE.PREPARING_ATTACK:
          trig("opponent", opponent.attackSide === SIDE.LEFT ? "prepareL" : "prepareR"); break;
        case OPP_STATE.ATTACKING:
          trig("opponent", opponent.attackSide === SIDE.LEFT ? "attackL" : "attackR"); break;
        case OPP_STATE.DODGING:    trig("opponent", "dodge"); break;
        case OPP_STATE.VULNERABLE: bool("opponent", "vulnerable", true); trig("opponent", "stun"); break;
        case OPP_STATE.HIT:        trig("opponent", "getHit"); break;
      }
    },

    // Empurra a vida (number inputs) a cada frame.
    sync() {
      if (!USE_RIVE) return;
      num("opponent", "health", opponent.hp);
      num("player", "health", player.hp);
    },

    // Composita um slot no canvas principal. Retorna true se desenhou
    // (a arte canvas nativa é pulada nesse caso).
    draw(ctx, name, extraOffsetX) {
      if (!USE_RIVE) return false;
      const s = slots[name];
      if (!s || !s.loaded || s.failed) return false;
      const r = s.cfg.rect;
      ctx.drawImage(s.canvas, r.x + (extraOffsetX || 0), r.y, r.w, r.h);
      return true;
    },
  };
})();
