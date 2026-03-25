// systems/gesture-lock.js
// iOS Safari gesture lockdown (best-effort; system gestures can't be fully blocked in Safari)
(() => {
  "use strict";

  // 1) Disable iOS Safari "gesturestart" pinch
  // (works in many versions; safe no-op otherwise)
  document.addEventListener("gesturestart", (e) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("gesturechange", (e) => {
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("gestureend", (e) => {
    e.preventDefault();
  }, { passive: false });

  // 2) Disable double-tap to zoom (best effort)
  let lastTouchEnd = 0;
  document.addEventListener("touchend", (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  // 3) Try to block Safari back/forward swipe by intercepting edge touches
  // This is "best effort" and depends on iOS version.
  // Behavior: first edge-swipe shows a subtle hint and absorbs, second within window lets it happen.
  let edgeArmed = false;
  let edgeArmTimer = 0;

  function showEdgeHint() {
    // tiny hint, self-cleaning, doesn't block UI
    const id = "psEdgeHint";
    if (document.getElementById(id)) return;

    const d = document.createElement("div");
    d.id = id;
    d.textContent = "Wischen am Rand: nochmal, um Safari zu verlassen";
    d.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: calc(18px + env(safe-area-inset-bottom));
      transform: translateX(-50%);
      z-index: 999999;
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(0,0,0,0.55);
      color: rgba(255,255,255,0.92);
      font: 12px/1.2 -apple-system, system-ui, sans-serif;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      pointer-events: none;
    `;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function armEdgeOnce() {
    edgeArmed = true;
    clearTimeout(edgeArmTimer);
    edgeArmTimer = setTimeout(() => { edgeArmed = false; }, 1200);
  }

  // Only act when the app is in a "game-like" full-screen context:
  // - while playing (body.inGame)
  // - OR overlay open (menus), still ok to reduce accidental nav
  function shouldLock() {
    return true; // keep simple: always on for Safari session
  }

  const EDGE_PX = 18; // touch within 18px of left/right edge

  let edgeSwipeActive = false;

  document.addEventListener("touchstart", (e) => {
    if (!shouldLock()) return;
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    const x = t.clientX;
    const w = window.innerWidth;

    const atLeft = x <= EDGE_PX;
    const atRight = x >= (w - EDGE_PX);
    if (!atLeft && !atRight) {
      edgeSwipeActive = false;
      return;
    }

    // first attempt: absorb
    if (!edgeArmed) {
      edgeSwipeActive = true;
      armEdgeOnce();
      showEdgeHint();
      e.preventDefault();
    } else {
      // second attempt within 1.2s: allow OS/browser gesture
      edgeSwipeActive = false;
      edgeArmed = false;
      clearTimeout(edgeArmTimer);
    }
  }, { passive: false, capture: true });

  document.addEventListener("touchmove", (e) => {
    if (!shouldLock()) return;
    if (!edgeSwipeActive) return;
    e.preventDefault();
  }, { passive: false, capture: true });

  document.addEventListener("touchend", () => {
    edgeSwipeActive = false;
  }, { passive: true });

})();