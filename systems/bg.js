/* Planet Star – Shared Background (canvas)
   - Stars: denser, slight size variation (calm, high-quality)
   - Orbs (menu only): in-game look (purple core + larger transparent circle), NO glow
   - Mode switching:
       menu  -> stars + orbs
       stars -> stars only
     Default: menu, but:
       - if canvas has data-bg-mode="stars" -> stars
       - if body has data-bg-mode="stars"   -> stars
       - auto: when game emits planetstar:state PLAYING -> stars
*/
(() => {
  "use strict";

  function start() {
    const canvas = document.getElementById("bgCanvas");
    if (!canvas) return;

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = canvas.getContext("2d", { alpha: true });

    let w = 0, h = 0, dpr = 1;

    // --- MODE ---------------------------------------------------------------
    let mode = "menu"; // "menu" | "stars"

    function readInitialMode() {
      const fromCanvas = canvas.getAttribute("data-bg-mode");
      const fromBody = document.body && document.body.getAttribute("data-bg-mode");
      const m = (fromCanvas || fromBody || "").trim();
      if (m === "stars") mode = "stars";
    }

    function setMode(next) {
      const n = next === "stars" ? "stars" : "menu";
      if (mode === n) return;
      mode = n;

      // if switching to stars-only: no need to animate continuously
      // if switching to menu: start animation loop (if allowed)
      draw(performance.now());
      if (!reduceMotion && mode === "menu" && !rafId) rafId = requestAnimationFrame(loop);
      if (mode !== "menu" && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    // Listen to game state changes (index.html)
    window.addEventListener("planetstar:state", (e) => {
      const st = e?.detail?.state;
      // Ingame: stars only
      if (st === "PLAYING") setMode("stars");
      // Everything else: menu background can show orbs
      if (st === "MENU") setMode("menu");
      // Keep stars-only for PAUSED/WIN to avoid distraction
    });

    // --- STARS --------------------------------------------------------------
    const stars = [];
    const rand = (a, b) => a + Math.random() * (b - a);

    function buildStars() {
      stars.length = 0;

      // Density tuned for calm look on mobile/tablet
      const area = w * h;
      const count = Math.max(160, Math.min(620, Math.round(area * 0.00062)));

      for (let i = 0; i < count; i++) {
        const t = Math.random();
        const r =
          t < 0.78 ? rand(0.6, 1.2) :
          t < 0.98 ? rand(1.3, 1.9) :
                     rand(2.1, 2.7);

        stars.push({
          x: rand(0, w),
          y: rand(0, h),
          r,
          a: rand(0.18, 0.85) * (r > 2 ? 0.9 : 1),
        });
      }
    }

    function drawStars() {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,1)";

      for (const s of stars) {
        ctx.globalAlpha = s.a;

        if (s.r <= 1.05) {
          ctx.fillRect(s.x, s.y, 1, 1);
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // --- ORBS (menu only) ---------------------------------------------------
    const ORB_COUNT = 18;
    const PLANET_R0 = 7; // match spawn feel
    const orbs = [];

    function initOrbs() {
      orbs.length = 0;
      for (let i = 0; i < ORB_COUNT; i++) {
        const baseR = rand(PLANET_R0 - 1.5, PLANET_R0 + 5.5);
        const x = rand(-baseR, w + baseR);
        const y = rand(-baseR, h + baseR);
        const speed = rand(0.010, 0.026);
        const ang = rand(0, Math.PI * 2);

        orbs.push({
          x,
          y,
          r: baseR,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          phase: rand(0, Math.PI * 2),
          pulseSpd: rand(0.0018, 0.0042),
          alpha: rand(0.26, 0.44),
          hue: rand(268, 284),
        });
      }
    }

    function fillCircle(x, y, r, color, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawOrb(o, nowMs) {
      const t = nowMs * 0.002;
      const pulse = reduceMotion ? 1 : 1 + Math.sin(t + o.phase) * 0.04;

      const haloR = o.r * 2.1;
      const coreR = o.r * pulse;
      const col = `hsla(${o.hue}, 80%, 72%, 1)`;

      // transparent bigger circle (no glow)
      fillCircle(o.x, o.y, haloR, col, o.alpha * 0.18);
      // core
      fillCircle(o.x, o.y, coreR, col, o.alpha * 0.92);
    }

    function stepOrbs(nowMs) {
      for (const o of orbs) {
        if (!reduceMotion) {
          o.x += o.vx;
          o.y += o.vy;

          const pad = o.r * 3;
          if (o.x < -pad) o.x = w + pad;
          if (o.x > w + pad) o.x = -pad;
          if (o.y < -pad) o.y = h + pad;
          if (o.y > h + pad) o.y = -pad;

          o.phase += o.pulseSpd;
        }

        drawOrb(o, nowMs || 0);
      }
    }

    // --- RENDER LOOP --------------------------------------------------------
    let rafId = 0;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(nowMs) {
      ctx.clearRect(0, 0, w, h);
      drawStars();

      if (mode === "menu") {
        stepOrbs(nowMs);
      }
    }

    function loop(nowMs) {
      rafId = 0;
      draw(nowMs);
      if (!reduceMotion && mode === "menu") rafId = requestAnimationFrame(loop);
    }

    function initAll() {
      buildStars();
      initOrbs();
    }

    readInitialMode();
    resize();
    initAll();

    // Start loop only if menu+motion
    draw(performance.now());
    if (!reduceMotion && mode === "menu") rafId = requestAnimationFrame(loop);

    window.addEventListener(
      "resize",
      () => {
        resize();
        initAll();
        draw(performance.now());
        if (!reduceMotion && mode === "menu" && !rafId) rafId = requestAnimationFrame(loop);
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();