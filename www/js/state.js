/* =====================================================================
   FIGHT V2 — [ESTADO] Dados puros do jogo + helpers de troca de estado.
   Nada aqui desenha; a render lê estes objetos a cada frame.
   ===================================================================== */

const player = {
  hp: CONFIG.PLAYER_MAX_HP,
  state: PLAYER_STATE.IDLE,
  stateTime: 0,        // ms acumulados no estado atual
  stateDur: 0,         // duração-alvo (0 = sem expiração automática)
  offsetX: 0,          // deslocamento visual da esquiva (suavizado)
  recentPunches: [],   // timestamps p/ detecção de spam
  lastPunchSide: SIDE.LEFT,
  lastDodgeAt: -99999, // para detectar "esquiva perfeita"
  hitFlash: 0,         // vinheta vermelha ao tomar dano (0..1)
};

const opponent = {
  hp: CONFIG.OPP_MAX_HP,
  maxHp: CONFIG.OPP_MAX_HP, // definido por personagem em resetMatch()
  state: OPP_STATE.IDLE,
  stateTime: 0,
  stateDur: 0,
  attackSide: SIDE.LEFT, // lado telegrafado (LEFT => esquive p/ ESQUERDA)
  counterTimer: 0,       // >0 = contra-ataque agendado (punição de spam)
  pendingVuln: 0,        // ms de vulnerabilidade agendada após errar o soco
  offsetX: 0,
  hitFlash: 0,           // flash branco ao levar soco
  punchLanded: false,    // colisão do soco atual já registrada?
};

const game = {
  phase: "START",      // START | INTRO | FIGHTING | KO | OVER
  winner: null,        // "PLAYER" | "OPPONENT"
  banner: null,        // { text, color, time, dur }
  clock: 0,            // relógio global (ms)
  combo: 0,            // acertos consecutivos na janela vulnerável
  slowmo: 0,           // ms restantes de câmera lenta (esquiva perfeita)
  stage: 1,            // fase atual (1..TOTAL_STAGES) — carregada abaixo
  introTime: 0,        // ms do card "FASE X" antes da luta
  koTime: 0,           // ms da animação de nocaute
};

/* ---------- Progresso de fases (persistido no aparelho) ---------- */

function loadStage() {
  try {
    const s = parseInt(localStorage.getItem("fightv2_stage"), 10);
    if (s >= 1 && s <= TOTAL_STAGES) return s;
  } catch (e) {}
  return 1;
}

function saveStage() {
  try { localStorage.setItem("fightv2_stage", String(game.stage)); } catch (e) {}
}

game.stage = loadStage();

/* ---------- Dificuldade (Fácil / Normal / Difícil) ----------
   facil   -> o botão de esquiva correto brilha (dica visual)
   normal  -> sem dica; você lê o golpe do oponente sozinho
   dificil -> sem dica + golpes do rival mais rápidos e mais fortes  */
const DIFFICULTIES = {
  facil:   { label: "Fácil",   hint: true,  telegraphMult: 1.0,  oppDmgMult: 1.0,
             desc: "O botão certo de esquiva brilha em dourado" },
  normal:  { label: "Normal",  hint: false, telegraphMult: 1.0,  oppDmgMult: 1.0,
             desc: "Sem dicas — leia a luva erguida do rival" },
  dificil: { label: "Difícil", hint: false, telegraphMult: 0.85, oppDmgMult: 1.25,
             desc: "Sem dicas, golpes mais rápidos e mais fortes" },
};

function DIFF() {
  return DIFFICULTIES[game.difficulty] || DIFFICULTIES.facil;
}

function setDifficulty(key) {
  if (!DIFFICULTIES[key]) key = "facil";
  game.difficulty = key;
  game.showDodgeHint = DIFFICULTIES[key].hint; // o render lê esta flag
  try { localStorage.setItem("fightv2_diff", key); } catch (e) {}
}

function loadDifficulty() {
  try {
    const d = localStorage.getItem("fightv2_diff");
    if (DIFFICULTIES[d]) return d;
    // migração da opção antiga (brilho ligado/desligado)
    if (localStorage.getItem("fightv2_hint") === "0") return "normal";
  } catch (e) {}
  return "facil";
}

setDifficulty(loadDifficulty());

// Pause: congela gameplay, timers, IA e efeitos (ver main.js / updateGame).
game.paused = false;

/* ---------- Helpers ---------- */

function setPlayerState(state, dur = 0) {
  player.state = state;
  player.stateTime = 0;
  player.stateDur = dur;
  RiveBridge.animPlayer(state); // espelha na camada Rive (no-op sem .riv)
}

function setOpponentState(state, dur = 0) {
  opponent.state = state;
  opponent.stateTime = 0;
  opponent.stateDur = dur;
  if (state === OPP_STATE.ATTACKING) opponent.punchLanded = false;
  RiveBridge.animOpponent(state);
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function showBanner(text, color, dur = 750) {
  game.banner = { text, color, time: 0, dur };
}

function damage(target, amount) {
  target.hp = Math.max(0, target.hp - amount);
}

function opponentEnterIdle() {
  const s = CHAR().stats;
  setOpponentState(OPP_STATE.IDLE, randRange(s.idleMin, s.idleMax));
  opponent.counterTimer = 0;
}

function playerCanAct() {
  return game.phase === "FIGHTING" && !game.paused && player.state === PLAYER_STATE.IDLE;
}

function resetMatch() {
  player.hp = CONFIG.PLAYER_MAX_HP;
  opponent.maxHp = CHAR().stats.hp;
  opponent.hp = opponent.maxHp;
  player.recentPunches = [];
  player.offsetX = 0;
  player.hitFlash = 0;
  player.lastDodgeAt = -99999;
  opponent.offsetX = 0;
  opponent.hitFlash = 0;
  opponent.pendingVuln = 0;
  game.winner = null;
  game.banner = null;
  game.combo = 0;
  game.slowmo = 0;
  game.introTime = 0;
  game.koTime = 0;
  setPlayerState(PLAYER_STATE.IDLE);
  opponentEnterIdle();
  Effects.reset();
}
