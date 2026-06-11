/* =====================================================================
   FIGHT V2 — [MAIN] Input, loop principal e gerenciamento de telas.
   ===================================================================== */
(() => {
  const canvas = document.getElementById("game");
  const screenStart = document.getElementById("screen-start");
  const screenOver = document.getElementById("screen-over");
  const overTitle = document.getElementById("over-title");
  const overSub = document.getElementById("over-sub");
  const overStars = document.getElementById("over-stars");

  /* ---------- Input (pointerdown = resposta instantânea no mobile) ---------- */

  const activePointers = new Map(); // pointerId -> buttonId

  function hitTest(vx, vy) {
    for (const b of Render.buttons) {
      if (vx >= b.x && vx <= b.x + b.w && vy >= b.y && vy <= b.y + b.h) return b;
    }
    return null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    SFX.init(); // destrava o áudio no primeiro toque
    if (game.phase !== "FIGHTING") return;
    const { x, y } = Render.toVirtual(e.clientX, e.clientY);
    const btn = hitTest(x, y);
    if (btn) {
      activePointers.set(e.pointerId, btn.id);
      btn.action();
      vibrate(12); // feedback tátil leve
    }
  }, { passive: false });

  function releasePointer(e) { activePointers.delete(e.pointerId); }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", releasePointer);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // Bônus desktop p/ testes: A/D = socos, setas = esquivas.
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (game.phase === "START" && (e.key === " " || e.key === "Enter")) { startFight(); return; }
    if (game.phase === "OVER" && (e.key === " " || e.key === "Enter")) { startFight(); return; }
    switch (e.key.toLowerCase()) {
      case "a": playerPunch(SIDE.LEFT); break;
      case "d": playerPunch(SIDE.RIGHT); break;
      case "arrowleft": playerDodge(SIDE.LEFT); break;
      case "arrowright": playerDodge(SIDE.RIGHT); break;
    }
  });

  function vibrate(ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* ---------- Telas ---------- */

  function startFight() {
    SFX.init();
    resetMatch();
    game.phase = "FIGHTING";
    screenStart.classList.add("hidden");
    screenOver.classList.add("hidden");
    SFX.bell();
    showBanner("LUTE!", CONFIG.COLORS.gold, 1100);
  }

  // Chamado pela lógica quando alguém zera o HP (pausa dramática antes da tela).
  window.onMatchOver = () => {
    const won = game.winner === "PLAYER";
    if (won) vibrate(60); else vibrate([40, 60, 40]);
    setTimeout(() => {
      overTitle.textContent = won ? "VITÓRIA!" : "DERROTA";
      overTitle.classList.toggle("lose", !won);
      overStars.classList.toggle("lose", !won);
      overSub.textContent = won
        ? "Você nocauteou o rival! 🏆"
        : "Levante-se, campeão. Tente de novo!";
      // reinicia a animação das estrelas
      screenOver.classList.remove("hidden");
    }, 900);
  };

  document.getElementById("btn-start").addEventListener("click", startFight);
  document.getElementById("btn-restart").addEventListener("click", startFight);

  /* ---------- Loop principal (delta-time real + câmera lenta) ---------- */

  let lastTime = 0;

  function frame(now) {
    if (!lastTime) lastTime = now;
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 50) dt = 50; // evita saltos após aba em segundo plano

    // Câmera lenta da esquiva perfeita: o tempo do MUNDO desacelera,
    // mas o relógio dos efeitos continua (o flash dura de verdade).
    const worldDt = game.slowmo > 0 ? dt * 0.35 : dt;

    updateGame(worldDt);
    Render.render(activePointers);

    requestAnimationFrame(frame);
  }

  /* ---------- Boot ---------- */

  function boot() {
    Render.resize();
    Render.rebuildButtons();
    RiveBridge.init();
    resetMatch();
    game.phase = "START";
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => { Render.resize(); Render.rebuildButtons(); });
  window.addEventListener("orientationchange", () => { Render.resize(); Render.rebuildButtons(); });

  // No Cordova esperamos o deviceready; no navegador, boot direto.
  if (window.cordova) {
    document.addEventListener("deviceready", boot, false);
  } else {
    boot();
  }
})();
