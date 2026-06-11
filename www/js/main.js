/* =====================================================================
   FIGHT V2 — [MAIN] Input (toque + teclado), pause, tutorial, modais,
   fluxo de telas/fases, música de fundo e loop principal.
   ===================================================================== */
(() => {
  const canvas = document.getElementById("game");
  const screenStart = document.getElementById("screen-start");
  const screenOver = document.getElementById("screen-over");
  const overTitle = document.getElementById("over-title");
  const overSub = document.getElementById("over-sub");
  const overStars = document.getElementById("over-stars");
  const btnRestart = document.getElementById("btn-restart");
  const modalPause = document.getElementById("modal-pause");
  const modalControls = document.getElementById("modal-controls");
  const screenTutorial = document.getElementById("screen-tutorial");
  const modalTutDone = document.getElementById("modal-tut-done");
  const tutCanvas = document.getElementById("tut-canvas");

  // Desktop ou touch? Define o conteúdo do modal de controles.
  const IS_TOUCH = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  function vibrate(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
  }

  /* =====================================================================
     GERENCIADOR DE MODAIS — garante uma única modal aberta por vez e
     bloqueia o gameplay enquanto qualquer uma estiver visível.
     ===================================================================== */

  const allModals = [modalPause, modalControls, screenTutorial, modalTutDone];

  function openModal(el) {
    allModals.forEach((m) => m.classList.toggle("hidden", m !== el));
  }

  function closeModals() {
    allModals.forEach((m) => m.classList.add("hidden"));
  }

  function anyModalOpen() {
    return allModals.some((m) => !m.classList.contains("hidden"));
  }

  // Liga um botão DOM: toca som de UI, tira o foco (para Enter/Espaço não
  // re-disparar o clique durante a luta) e executa a ação.
  function bindBtn(id, fn) {
    const el = document.getElementById(id);
    el.addEventListener("click", (e) => {
      SFX.init();
      SFX.uiTap();
      fn(e);
      el.blur();
    });
  }

  /* =====================================================================
     INPUT — toque/mouse no canvas (pointerdown = resposta instantânea)
     ===================================================================== */

  const activePointers = new Map(); // pointerId -> buttonId

  function hitTest(vx, vy) {
    for (const b of Render.buttons) {
      if (vx >= b.x && vx <= b.x + b.w && vy >= b.y && vy <= b.y + b.h) return b;
    }
    return null;
  }

  function inPauseRect(vx, vy) {
    const p = Render.pauseRect;
    return vx >= p.x && vx <= p.x + p.w && vy >= p.y && vy <= p.y + p.h;
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    SFX.init(); // destrava o áudio no primeiro toque (mobile)
    if (game.paused || anyModalOpen()) return;
    if (game.phase !== "FIGHTING") return;

    const { x, y } = Render.toVirtual(e.clientX, e.clientY);

    // botão de pause no canto do HUD
    if (inPauseRect(x, y)) { pauseGame(); return; }

    const btn = hitTest(x, y);
    if (btn) {
      activePointers.set(e.pointerId, btn.id);
      btn.action();
      vibrate(12); // feedback tátil leve
    }
  }, { passive: false });

  // Hover desktop: realça botões do canvas e muda o cursor.
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (game.phase !== "FIGHTING" || game.paused || anyModalOpen()) {
      Render.setHover(null);
      canvas.style.cursor = "default";
      return;
    }
    const { x, y } = Render.toVirtual(e.clientX, e.clientY);
    const id = inPauseRect(x, y) ? "PAUSE" : (hitTest(x, y) || {}).id || null;
    Render.setHover(id);
    canvas.style.cursor = id ? "pointer" : "default";
  });

  function releasePointer(e) { activePointers.delete(e.pointerId); }
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  canvas.addEventListener("pointerleave", (e) => { releasePointer(e); Render.setHover(null); });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  /* =====================================================================
     TECLADO (desktop) — A/D socos, ←/→ esquivas, Esc pausa.
     Sem repetição ao segurar; desabilitado em menus, modais e pause.
     ===================================================================== */

  window.addEventListener("keydown", (e) => {
    if (e.repeat) return; // segurar a tecla NÃO repete a ação

    // Esc: pausa/retoma na luta; fecha o modal de controles no menu.
    if (e.key === "Escape") {
      if (game.paused) { resumeGame(); }
      else if (game.phase === "FIGHTING" && !anyModalOpen()) { pauseGame(); }
      else if (!modalControls.classList.contains("hidden")) { closeModals(); }
      return;
    }

    // Se o foco está num botão DOM, Enter/Espaço pertencem ao botão
    // (evita disparo duplo). Os atalhos de luta seguem funcionando.
    const onButton = document.activeElement && document.activeElement.tagName === "BUTTON";

    // Atalhos de início/recomeço (sem modal aberta e sem foco em botão)
    if ((e.key === " " || e.key === "Enter") && !anyModalOpen() && !onButton) {
      if (game.phase === "START" && !screenStart.classList.contains("hidden")) {
        startFight(); return;
      }
      if (game.phase === "OVER" && !screenOver.classList.contains("hidden")) {
        startFight(); return;
      }
    }

    // Golpes: só durante a luta, sem pause e sem modais.
    if (game.phase !== "FIGHTING" || game.paused || anyModalOpen()) return;

    switch (e.key.toLowerCase()) {
      case "a": e.preventDefault(); playerPunch(SIDE.LEFT); break;
      case "d": e.preventDefault(); playerPunch(SIDE.RIGHT); break;
      case "arrowleft": e.preventDefault(); playerDodge(SIDE.LEFT); break;
      case "arrowright": e.preventDefault(); playerDodge(SIDE.RIGHT); break;
    }
  });

  /* =====================================================================
     PAUSE — congela jogo/IA/timers (updateGame retorna cedo) + modal.
     ===================================================================== */

  function pauseGame() {
    if (game.phase !== "FIGHTING" || game.paused) return;
    game.paused = true;
    SFX.pause();
    SFX.bgmPause();
    Render.setHover(null);
    openModal(modalPause);
  }

  function resumeGame() {
    if (!game.paused) return;
    game.paused = false;
    SFX.resume();
    SFX.bgmPlay();
    closeModals();
  }

  function goToMenu() {
    game.paused = false;
    overShown = false;
    closeModals();
    SFX.bgmStop();
    resetMatch();
    game.phase = "START";
    screenOver.classList.add("hidden");
    screenStart.classList.remove("hidden");
    updateStartScreen();
  }

  bindBtn("btn-resume", resumeGame);
  bindBtn("btn-pause-menu", goToMenu);

  /* =====================================================================
     TELAS E FLUXO DE FASES
     ===================================================================== */

  // Atualiza o subtítulo da tela inicial com a fase/rival atual.
  function updateStartScreen() {
    const label = document.getElementById("start-stage");
    if (!label) return;
    const ch = CHAR();
    label.textContent = game.stage === TOTAL_STAGES
      ? `⚠ FASE FINAL — vs ${ch.name} ⚠`
      : `Fase ${game.stage} de ${TOTAL_STAGES} — vs ${ch.name}`;
  }

  function startFight() {
    game.paused = false;
    overShown = false;
    closeModals();
    resetMatch();
    // Card "FASE X" aparece antes do sino (transição em logic.js).
    game.phase = "INTRO";
    screenStart.classList.add("hidden");
    screenOver.classList.add("hidden");
    SFX.whoosh();
    SFX.bgmPlay(); // dentro do gesto do usuário (regra iOS/Android)
  }

  // Chamado pela lógica quando a luta termina (após a animação de KO).
  // A FASE avança AQUI (não no clique), assim "Voltar ao Menu" preserva
  // o progresso. Vitória < 10 -> próxima | vitória na 10 ou derrota -> 1.
  let overShown = false; // impede múltiplas modais de fim

  window.onMatchOver = () => {
    if (overShown) return;
    overShown = true;

    const won = game.winner === "PLAYER";
    const champion = won && game.stage === TOTAL_STAGES;
    if (won) vibrate(60); else vibrate([40, 60, 40]);

    if (won && !champion) game.stage++;
    else game.stage = 1;
    saveStage();
    updateStartScreen();

    setTimeout(() => {
      if (game.phase !== "OVER") return; // partida já recomeçou? não abre

      if (champion) {
        overTitle.textContent = "CAMPEÃO!";
        overSub.textContent = "Você derrotou o DEMOLIDOR e zerou o jogo! 👑";
        btnRestart.textContent = "JOGAR DE NOVO — FASE 1";
      } else if (won) {
        overTitle.textContent = "Vitória!";
        overSub.textContent = "Você derrotou o adversário!";
        // nome e número do próximo oponente no botão
        btnRestart.textContent = `LUTAR vs ${CHAR().name.toUpperCase()} — FASE ${game.stage}`;
      } else {
        overTitle.textContent = "Derrota!";
        overSub.textContent = "Você foi nocauteado.";
        btnRestart.textContent = "TENTAR NOVAMENTE DA FASE 1";
      }
      overTitle.classList.toggle("lose", !won);
      overStars.classList.toggle("lose", !won);
      screenOver.classList.remove("hidden");
    }, won ? 250 : 900);
  };

  bindBtn("btn-start", startFight);
  bindBtn("btn-restart", startFight); // a fase já foi ajustada no onMatchOver
  bindBtn("btn-over-menu", goToMenu);

  /* =====================================================================
     DIFICULDADE — segmented control (Fácil / Normal / Difícil)
     ===================================================================== */

  const segButtons = [...document.querySelectorAll("#difficulty-seg .seg-opt")];
  const diffDesc = document.getElementById("diff-desc");

  function updateDifficultyUI() {
    segButtons.forEach((b) => {
      const selected = b.dataset.diff === game.difficulty;
      b.classList.toggle("selected", selected);
      b.setAttribute("aria-checked", selected ? "true" : "false");
    });
    diffDesc.textContent = DIFF().desc;
  }

  segButtons.forEach((b) => {
    b.addEventListener("click", () => {
      SFX.init();
      SFX.uiTap();
      setDifficulty(b.dataset.diff);
      updateDifficultyUI();
      vibrate(10);
      b.blur();
    });
  });

  /* =====================================================================
     TUTORIAL INTERATIVO — 4 etapas animadas + modal final
     ===================================================================== */

  const TUT_STEPS = [
    {
      title: "Esquiva",
      text: "Os botões DE BAIXO esquivam. Quando o rival atacar, deslize para a esquerda ou direita para o soco passar batido!",
    },
    {
      title: "Soco",
      text: "Os botões DE CIMA socam (esquerdo e direito). Socos fora de hora dão pouco dano — e cuidado: socar demais no vazio deixa você aberto!",
    },
    {
      title: "Contra-ataque",
      text: "Esquivou do golpe? O rival fica TONTO (estrelas na cabeça). Essa é a hora de ouro: soque na janela e cause DANO PESADO!",
    },
    {
      title: "A combinação completa",
      text: "Viu o \"!\"? ESQUIVE ➜ ele erra e fica tonto ➜ CONTRA-ATAQUE! Repita a receita até o nocaute. Agora é com você!",
    },
  ];

  let tutStep = 1;
  let tutRunning = false;
  let tutStartTime = 0;

  function tutLoop(now) {
    if (!tutRunning) return;
    Render.tutorialScene(tutCanvas, tutStep, now - tutStartTime);
    requestAnimationFrame(tutLoop);
  }

  function showTutStep(n) {
    tutStep = n;
    tutStartTime = performance.now();
    document.getElementById("tut-step-label").textContent = `${n} / ${TUT_STEPS.length}`;
    document.getElementById("tut-title").textContent = TUT_STEPS[n - 1].title;
    document.getElementById("tut-text").textContent = TUT_STEPS[n - 1].text;
    document.getElementById("btn-tut-back").textContent = n === 1 ? "◀ Menu" : "◀ Voltar";
    document.getElementById("btn-tut-next").textContent =
      n === TUT_STEPS.length ? "Concluir ✔" : "Próximo ▶";
  }

  function openTutorial() {
    openModal(screenTutorial);
    showTutStep(1);
    tutRunning = true;
    requestAnimationFrame(tutLoop);
  }

  function closeTutorial() {
    tutRunning = false;
    closeModals();
  }

  bindBtn("btn-tutorial", openTutorial);

  bindBtn("btn-tut-next", () => {
    if (tutStep < TUT_STEPS.length) {
      showTutStep(tutStep + 1);
    } else {
      tutRunning = false;
      openModal(modalTutDone); // "Tudo pronto para lutar!"
    }
  });

  bindBtn("btn-tut-back", () => {
    if (tutStep > 1) showTutStep(tutStep - 1);
    else { closeTutorial(); goToMenu(); }
  });

  bindBtn("btn-tut-menu", () => { closeTutorial(); goToMenu(); });

  bindBtn("btn-tut-fight", () => {
    closeTutorial();
    game.stage = 1; // "Iniciar Fase 1"
    saveStage();
    startFight();
  });

  /* =====================================================================
     MODAL DE CONTROLES — conteúdo conforme o dispositivo
     ===================================================================== */

  function openControls() {
    document.getElementById("controls-desktop").classList.toggle("hidden", IS_TOUCH);
    document.getElementById("controls-mobile").classList.toggle("hidden", !IS_TOUCH);
    openModal(modalControls);
  }

  bindBtn("btn-controls", openControls);
  bindBtn("btn-controls-close", closeModals);

  /* =====================================================================
     LOOP PRINCIPAL — delta-time real, câmera lenta e pause
     ===================================================================== */

  let lastTime = 0;

  function frame(now) {
    if (!lastTime) lastTime = now;
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 50) dt = 50; // evita saltos após aba em segundo plano

    // Câmera lenta da esquiva perfeita: o tempo do MUNDO desacelera.
    const worldDt = game.slowmo > 0 ? dt * 0.35 : dt;

    updateGame(worldDt); // no pause, retorna cedo: tudo congelado
    Render.render(activePointers);

    requestAnimationFrame(frame);
  }

  /* ---------- Boot ---------- */

  function boot() {
    Render.resize();
    Render.rebuildButtons();
    RiveBridge.init();
    SFX.attachUnlock(); // desbloqueio de áudio nos primeiros gestos (mobile)
    resetMatch();
    game.phase = "START";
    updateStartScreen();
    updateDifficultyUI();
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
