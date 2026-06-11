/* =====================================================================
   FIGHT V2 — [CONFIG] Balanceamento, layout e paleta de cores.
   Todos os tempos em MILISSEGUNDOS. Ajuste a dificuldade aqui.
   ===================================================================== */

const CONFIG = {
  
  // Resolução virtual (vertical, mobile-first). Tudo é desenhado nessas
  // coordenadas e escalado para o tamanho real do dispositivo.
  VW: 360,
  VH: 640,

  // Vida — oponente tem menos HP para a vitória vir mais rápido.
  PLAYER_MAX_HP: 100,
  OPP_MAX_HP: 90,

  // --- Janelas de tempo (ms) — afinadas para ser FÁCIL de vencer ---
  TELEGRAPH_MS: 750,        // aviso longo antes do soco do oponente (reage com calma)
  OPP_STRIKE_ANIM_MS: 300,  // duração visual do soco do oponente
  OPP_VULN_MS: 1300,        // janela GENEROSA para contra-atacar após esquiva
  OPP_VULN_PERFECT_MS: 1700,// janela ainda maior se a esquiva foi "perfeita"
  PERFECT_DODGE_MS: 280,    // esquiva iniciada até X ms antes do golpe = perfeita
  OPP_HIT_STUN_MS: 360,     // atordoamento do oponente ao levar dano
  OPP_DODGE_MS: 320,        // duração da esquiva do oponente
  OPP_COUNTER_DELAY_MS: 300,// atraso até o contra-ataque (punição de spam)

  PLAYER_PUNCH_MS: 240,     // duração do soco do jogador
  PLAYER_DODGE_MS: 480,     // duração da esquiva (cobre o strike do oponente)
  PLAYER_VULN_MS: 420,      // travamento curto após punição de spam
  PLAYER_HIT_STUN_MS: 280,  // travamento ao tomar dano

  IDLE_MIN_MS: 1300,        // espera mínima do oponente entre ataques
  IDLE_MAX_MS: 2800,        // espera máxima

  // --- Dano ---
  DMG_OPP_PUNCH: 8,         // dano do oponente em você (baixo = mais fácil)
  DMG_COUNTER: 6,           // dano do contra-ataque de punição
  DMG_PLAYER_JAB: 6,        // dano de "chip" quando você soca fora da janela
  DMG_PLAYER_VULN_HIT: 25,  // dano forte na janela de vulnerabilidade

  // --- Colisão (raios das hitboxes em coordenadas virtuais) ---
  HIT_GLOVE_R: 26,          // raio da luva do jogador durante o soco
  HIT_OPP_HEAD_R: 38,       // hurtbox da cabeça do oponente
  HIT_OPP_BODY_R: 52,       // hurtbox do tronco do oponente
  HIT_PLAYER_HEAD_R: 50,    // hurtbox da "câmera" (sua cabeça)
  OPP_PUNCH_AIM_OFFSET: 25, // quanto o soco do oponente mira fora do centro
  DODGE_OFFSET: 60,         // deslocamento lateral da esquiva do jogador
  OPP_DODGE_OFFSET: 70,     // deslocamento da esquiva do oponente

  // --- Anti-spam (bem tolerante) ---
  SPAM_WINDOW_MS: 1300,
  SPAM_COUNT: 5,            // só pune quem soca 5x seguidas no vazio

  // Chance do oponente esquivar um jab fora da janela (mantém o jogo vivo
  // sem punir — você ainda ganha no chip damage se preferir só socar).
  OPP_JAB_DODGE_CHANCE: 0.3,

  // --- Paleta (Clash Royale vibes: azul céu, dourado, cores saturadas) ---
  COLORS: {
    skyTop: "#39a8ff",
    skyBottom: "#9adcff",
    crowdFar: "#2f6db8",
    crowdNear: "#2858a0",
    ringFloorTop: "#4fc0e8",
    ringFloorBottom: "#2e8fc7",
    ringMat: "#56c8f0",
    ropes: "#ff5b6e",
    ropes2: "#ffd64d",
    post: "#3b6fd4",

    hudPanel: "rgba(16, 38, 78, 0.85)",
    hpMineA: "#7dff6e",
    hpMineB: "#27c93f",
    hpOppA: "#ff8a7a",
    hpOppB: "#ff3b4d",
    hpEmpty: "#15244a",
    hpBorder: "#0c1733",

    oppSkinA: "#ffd9a8",
    oppSkinB: "#f0a86b",
    oppHair: "#5a3a22",
    oppShirt: "#7a4fe0",
    oppShorts: "#ff4d6a",
    oppGloveA: "#ff6b5b",
    oppGloveB: "#d42f3f",
    telegraph: "#ff3b3b",
    vulnGlow: "#ffe24d",

    playerGloveA: "#ff5b4d",
    playerGloveB: "#c0273f",
    playerArm: "#3aa0e8",

    btnPunchA: "#ffc93c",
    btnPunchB: "#f5862a",
    btnPunchShadow: "#a85a00",
    btnDodgeA: "#5fd7ff",
    btnDodgeB: "#2e8fd4",
    btnDodgeShadow: "#1a4f8a",
    btnLockedA: "#7c87a3",
    btnLockedB: "#525d78",
    btnLockedShadow: "#343d52",

    outline: "#1a2a55",
    text: "#ffffff",
    textDim: "#cfe0ff",
    good: "#7dff6e",
    bad: "#ff5b5b",
    gold: "#ffd64d",
  },
};

// Estados possíveis (constantes para evitar erros de digitação)
const PLAYER_STATE = {
  IDLE: "IDLE",
  ATTACKING: "ATTACKING",
  DODGING_LEFT: "DODGING_LEFT",
  DODGING_RIGHT: "DODGING_RIGHT",
  VULNERABLE: "VULNERABLE",
  HIT: "HIT",
};

const OPP_STATE = {
  IDLE: "IDLE",
  PREPARING_ATTACK: "PREPARING_ATTACK",
  ATTACKING: "ATTACKING",
  DODGING: "DODGING",
  VULNERABLE: "VULNERABLE",
  HIT: "HIT",
};

const SIDE = { LEFT: "LEFT", RIGHT: "RIGHT" };
