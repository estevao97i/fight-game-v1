/* =====================================================================
   FIGHT V2 — [PERSONAGENS] Elenco das 10 fases + curva de dificuldade.

   Cada fase tem um personagem com:
   • stats  — dificuldade (vida, defesa, dano, tempo de reação que ELE
              te dá, frequência de ataque, esquiva, combos encadeados)
   • look   — visual cartoon (pele, cabelo, acessórios, cores, escala)

   CURVA (fase 1 -> 10):
   hp        sobe   75 -> 220   (chefão aguenta muito mais)
   def       desce  1.0 -> 0.62 (ele PERDE MENOS vida por soco seu)
   dmg       sobe   5 -> 16     (ele te machuca mais)
   telegraph desce  850 -> 390  (SEU tempo de reação diminui)
   vuln      desce  1500 -> 720 (janela de contra-ataque encolhe)
   dodge     sobe   0.10 -> 0.70(ele esquiva muito mais dos seus jabs)
   chain     sobe   0 -> 0.50   (chance de emendar outro soco na hora)
   ===================================================================== */

const CHARACTERS = [
  {
    name: "Zé Soneca", title: "O Dorminhoco",
    stats: { hp: 75,  def: 1.00, dmg: 5,  telegraph: 850, vuln: 1500, idleMin: 1600, idleMax: 3000, dodgeChance: 0.10, chain: 0.00 },
    look: {
      scale: 0.92, skinA: "#ffd9a8", skinB: "#f0a86b",
      hair: { style: "messy", color: "#6b4a2c" },
      sleepy: true,
      shirt: "#58c472", shirtB: "#2e9550", shorts: "#3a7d4d",
      gloveA: "#ff8a5b", gloveB: "#d45a2f",
    },
  },
  {
    name: "Tonhão", title: "O Brutamontes da Feira",
    stats: { hp: 90,  def: 1.00, dmg: 6,  telegraph: 780, vuln: 1400, idleMin: 1500, idleMax: 2800, dodgeChance: 0.18, chain: 0.00 },
    look: {
      scale: 1.05, skinA: "#e8b88a", skinB: "#c98e55",
      hair: { style: "bald", color: "#5a3a22" },
      headband: "#e03a3a", mustache: "#4a2f1a",
      shirt: "#ff9a3c", shirtB: "#e06a10", shorts: "#a04a10",
      gloveA: "#ff6b5b", gloveB: "#d42f3f",
    },
  },
  {
    name: "Gilete", title: "O Punk do Bairro",
    stats: { hp: 100, def: 0.95, dmg: 7,  telegraph: 720, vuln: 1300, idleMin: 1400, idleMax: 2600, dodgeChance: 0.25, chain: 0.10 },
    look: {
      scale: 0.98, skinA: "#ffd9a8", skinB: "#f0a86b",
      hair: { style: "mohawk", color: "#b13fe0" },
      earring: true,
      shirt: "#2a2f3f", shirtB: "#15181f", shorts: "#b13fe0",
      gloveA: "#c95bff", gloveB: "#7a2fb0",
    },
  },
  {
    name: "Marreta", title: "O Pedreiro de Ferro",
    stats: { hp: 110, def: 0.90, dmg: 8,  telegraph: 660, vuln: 1200, idleMin: 1300, idleMax: 2400, dodgeChance: 0.30, chain: 0.15 },
    look: {
      scale: 1.08, skinA: "#e8b88a", skinB: "#c98e55",
      hair: { style: "buzz", color: "#2f2a25" },
      mustache: "#2f2a25",
      shirt: "#ffd23c", shirtB: "#e0a010", shorts: "#3a5fd4",
      gloveA: "#ff6b5b", gloveB: "#d42f3f",
    },
  },
  {
    name: "Pantera", title: "A Sombra do Ringue",
    stats: { hp: 120, def: 0.85, dmg: 9,  telegraph: 600, vuln: 1100, idleMin: 1200, idleMax: 2200, dodgeChance: 0.40, chain: 0.20 },
    look: {
      scale: 0.96, skinA: "#a8744a", skinB: "#7d5232",
      hair: { style: "bald", color: "#000" },
      mask: "#ff4d8a",
      shirt: "#23283a", shirtB: "#101420", shorts: "#ff4d8a",
      gloveA: "#ff5bd0", gloveB: "#b02f8a",
    },
  },
  {
    name: "Mestre Ginga", title: "O Capoeirista",
    stats: { hp: 130, def: 0.85, dmg: 10, telegraph: 560, vuln: 1000, idleMin: 1100, idleMax: 2000, dodgeChance: 0.55, chain: 0.22 },
    look: {
      scale: 1.00, skinA: "#9a6a42", skinB: "#6f4a2a",
      hair: { style: "bald", color: "#ddd" },
      beard: "#e8e8e8",
      shirt: "#f5f2e8", shirtB: "#d8d0ba", shorts: "#f5f2e8",
      gloveA: "#ffd23c", gloveB: "#e09a10",
    },
  },
  {
    name: "Sgt. Rocha", title: "O Tanque de Guerra",
    stats: { hp: 145, def: 0.80, dmg: 11, telegraph: 520, vuln: 950,  idleMin: 1000, idleMax: 1900, dodgeChance: 0.55, chain: 0.28 },
    look: {
      scale: 1.10, skinA: "#e8b88a", skinB: "#c98e55",
      hair: { style: "buzz", color: "#4a4438" },
      scar: true,
      shirt: "#5a7a3a", shirtB: "#3a5224", shorts: "#43492f",
      gloveA: "#7a8a5a", gloveB: "#4a5a32",
    },
  },
  {
    name: "Vovô Trovão", title: "O Lendário",
    stats: { hp: 160, def: 0.75, dmg: 13, telegraph: 480, vuln: 880,  idleMin: 950,  idleMax: 1700, dodgeChance: 0.60, chain: 0.32 },
    look: {
      scale: 1.02, skinA: "#f0c8a0", skinB: "#d0a070",
      hair: { style: "sides", color: "#e8e8e8" },
      beard: "#e8e8e8",
      shirt: "#5a7ab8", shirtB: "#3a5288", shorts: "#374668",
      gloveA: "#8ab4ff", gloveB: "#4a6ab8",
    },
  },
  {
    name: "Barão Dourado", title: "O Milionário",
    stats: { hp: 175, def: 0.70, dmg: 14, telegraph: 440, vuln: 820,  idleMin: 900,  idleMax: 1600, dodgeChance: 0.65, chain: 0.36 },
    look: {
      scale: 1.04, skinA: "#ffd9a8", skinB: "#f0a86b",
      hair: { style: "crown", color: "#6b4a2c" },
      monocle: true, mustache: "#6b4a2c",
      shirt: "#7a4fe0", shirtB: "#4a2f9a", shorts: "#3a2470",
      gloveA: "#ffe24d", gloveB: "#d4a010",
    },
  },
  {
    name: "DEMOLIDOR", title: "O Chefão Final",
    stats: { hp: 220, def: 0.62, dmg: 16, telegraph: 390, vuln: 720,  idleMin: 750,  idleMax: 1400, dodgeChance: 0.70, chain: 0.50 },
    look: {
      scale: 1.18, skinA: "#b9c0cf", skinB: "#828ca6",
      hair: { style: "flame", color: "#ff4020" },
      scar: true, redEyes: true,
      shirt: "#2a1015", shirtB: "#160608", shorts: "#8a1020",
      gloveA: "#ff3b2f", gloveB: "#8a0f1a",
      aura: "#ff4020",
    },
  },
];

// Personagem da fase atual (game.stage é 1-based).
function CHAR() {
  return CHARACTERS[Math.min(CHARACTERS.length, Math.max(1, game.stage)) - 1];
}

const TOTAL_STAGES = CHARACTERS.length;
