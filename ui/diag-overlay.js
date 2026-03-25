(() => {
  "use strict";

  const qs = new URLSearchParams(location.search);

  // Optional: Reset collapsed state once via URL
  if (qs.get("diagreset") === "1") {
    try { localStorage.removeItem("ps_diag_collapsed"); } catch {}
  }

  const initialOn =
    qs.get("debug") === "1" ||
    qs.get("diag") === "1" ||
    (localStorage.getItem("ps_diag_on") === "1");

  let isOn = !!initialOn;
  let mounted = false;

  let lastHud = null;
  let lastCore = null;
  let lastState = null;
  let lastError = null;

  let overlayRoot = null; // full-screen wrapper (never blocks touches)
  let panel = null;       // small box (touchable)
  let bodyPre = null;
  let badge = null;
  let maxBtn = null;
    let levelInput = null;
  let lastCoreDebug = null;
  let pendingLevelStart = null;

  const el = (tag, props = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "style") n.style.cssText = v;
      else if (k === "className") n.className = v;
      else n.setAttribute(k, v);
    }
    for (const c of children) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  };

  function bindTap(node, fn) {
    // iPad-safe: touchend + click fallback
    node.addEventListener("touchend", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    }, { passive: false });

    node.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  }

  function yesNo(v) { return v ? "OK" : "MISSING"; }
  
    // Track core debug snapshots (planetsLen etc.)
  window.addEventListener("planetstar:core-debug", (e) => {
    lastCoreDebug = e?.detail || null;
    // only rerender when diag is open to keep it light
    if (isOn) render();
  });

  // If DIAG triggers start before core is ready, retry once core is ready
  window.addEventListener("planetstar:core-ready", () => {
    try {
      if (pendingLevelStart != null && window.Game?.start) {
        const lvl = pendingLevelStart;
        pendingLevelStart = null;
        window.Game.start(lvl);
        render();
      }
    } catch (err) {
      lastError = String(err?.message || err);
      render();
    }
  });

  function render() {
    if (!mounted || !bodyPre) return;

    const lines = [];
    lines.push(`Game:         ${yesNo(!!window.Game)}  (window.Game)`);
    lines.push(`PS.Game:      ${yesNo(!!window.PS?.Game)}  (window.PS.Game)`);
    lines.push(`PS.game:      ${yesNo(!!window.PS?.game)}  (window.PS.game)`);
    lines.push("");
    lines.push(`PS:           ${yesNo(!!window.PS)}`);
    lines.push(`PS.events:    ${yesNo(!!window.PS?.events)}`);
    lines.push(`spawn:        ${yesNo(!!window.PS?.systems?.spawn)}`);
    lines.push(`entity:planet ${yesNo(!!window.PS?.entities?.planet)}`);
    lines.push(`entity:star   ${yesNo(!!window.PS?.entities?.star)}`);
    lines.push("");
    lines.push(`CORE probe:   ${window.__PS_CORE_LOADED ? "YES" : "NO"}`);
    lines.push(`BUILD:        ${window.__PS_BUILD || "(unknown)"}`);
    lines.push("");
    lines.push(`Last error:   ${lastError || "(none)"}`);
    lines.push(`State evt:    ${lastState ? JSON.stringify(lastState) : "(none yet)"}`);
    lines.push("");
    lines.push(`HUD payload:  ${lastHud ? JSON.stringify(lastHud) : "(none yet)"}`);
    lines.push(`CORE debug:   ${lastCore ? JSON.stringify(lastCore) : "(none yet)"}`);

    bodyPre.textContent = lines.join("\n");
  }

  function applyVisibility() {
    if (!overlayRoot) return;
    overlayRoot.style.display = isOn ? "block" : "none";
    if (badge) badge.textContent = isOn ? "ON" : "OFF";
  }

  function setDiagOn(next) {
    isOn = !!next;
    try { localStorage.setItem("ps_diag_on", isOn ? "1" : "0"); } catch {}
    if (isOn) ensureMounted();
    applyVisibility();
  }

  function toggleDiag() {
    setDiagOn(!isOn);
  }

  function setCollapsed(collapsed) {
    if (!bodyPre || !maxBtn) return;

    // ✅ Inline-style: iOS-safe, cannot be overridden by random CSS
    bodyPre.style.display = collapsed ? "none" : "block";
    maxBtn.textContent = collapsed ? "Max" : "Min";
    try { localStorage.setItem("ps_diag_collapsed", collapsed ? "1" : "0"); } catch {}
  }

  function ensureMounted() {
    if (mounted) return;

    overlayRoot = el("div", {
      id: "psDiagOverlayRoot",
      style: `
        position: fixed;
        inset: 0;
        z-index: 999999;
        pointer-events: none;
      `,
    });

    panel = el("div", {
      id: "psDiagOverlay",
      style: `
        position: absolute;
        left: 12px;
        top: 110px;
        max-width: min(92vw, 520px);
        padding: 12px;
        border-radius: 14px;
        background: rgba(0,0,0,0.55);
        color: rgba(255,255,255,0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        font: 12px/1.35 -apple-system, system-ui, sans-serif;
        user-select: text;
        -webkit-user-select: text;
        pointer-events: auto;
        touch-action: manipulation;
      `,
    });

    const headerRow = el("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:8px;" });
    const title = el("div", { style: "font-weight:700;letter-spacing:0.2px;" }, ["Planet Star – DIAG"]);
    badge = el("div", {
      style: "margin-left:auto;padding:3px 8px;border-radius:999px;font-weight:700;background:rgba(255,255,255,0.10);"
    }, ["ON"]);

    const btnStyle = `
      appearance:none;border:0;border-radius:10px;padding:8px 10px;
      background:rgba(255,255,255,0.10);color:rgba(255,255,255,0.92);
      font:12px/1 -apple-system, system-ui, sans-serif;font-weight:600;
    `;

    const buttonsRow = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;" });
	
	        levelInput = el("input", {
      type: "number",
      inputmode: "numeric",
      min: "1",
      step: "1",
      value: "1",
      style: `
        width: 86px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(0,0,0,0.25);
        color: rgba(255,255,255,0.92);
        font: 12px/1 -apple-system, system-ui, sans-serif;
        font-weight: 700;
        outline: none;
      `
    });

    const btnCheck = el("button", { type:"button", style:btnStyle }, ["Self-Check"]);
    bindTap(btnCheck, () => render());

            const btnStart = el("button", { type:"button", style:btnStyle }, ["Start Level"]);
    bindTap(btnStart, () => {
      try {
        const lvl = Math.max(1, parseInt(levelInput?.value || "1", 10) || 1);

        if (window.Game?.start) {
          window.Game.start(lvl);
        } else {
          // core not ready yet → retry once "planetstar:core-ready" fires
          pendingLevelStart = lvl;
          throw new Error("Core not ready yet (Game.start missing). Try again or wait 1s.");
        }
      } catch (e) {
        lastError = String(e?.message || e);
      }
      render();
    });

    const btnSpawnPlanet = el("button", { type:"button", style:btnStyle }, ["+ Planet"]);
    bindTap(btnSpawnPlanet, () => {
      try {
        const sp = window.PS?.systems?.spawn;

        // Try common spawn system patterns
        if (sp?.spawnPlanet) sp.spawnPlanet();
        else if (sp?.spawnOnePlanet) sp.spawnOnePlanet();
        else if (sp?.debugSpawnPlanet) sp.debugSpawnPlanet();
        else if (window.PS?.events?.emit) window.PS.events.emit("DIAG_SPAWN_PLANET", {});
        else throw new Error("No planet spawn function found (spawn.spawnPlanet / spawn.spawnOnePlanet / spawn.debugSpawnPlanet).");
      } catch (e) {
        lastError = String(e?.message || e);
      }
      render();
    });

    const btnSpawnStar = el("button", { type:"button", style:btnStyle }, ["+ Star"]);
    bindTap(btnSpawnStar, () => {
      try {
        const sp = window.PS?.systems?.spawn;

        // Try common spawn system patterns
        if (sp?.spawnStar) sp.spawnStar();
        else if (sp?.debugSpawnStar) sp.debugSpawnStar();
        else if (window.PS?.events?.emit) window.PS.events.emit("DIAG_SPAWN_STAR", {});
        else throw new Error("No star spawn function found (spawn.spawnStar / spawn.debugSpawnStar).");
      } catch (e) {
        lastError = String(e?.message || e);
      }
      render();
    });

    maxBtn = el("button", { type:"button", style:`${btnStyle}border-radius:999px;padding:8px 12px;` }, ["Max"]);
    bindTap(maxBtn, () => {
      const collapsed = bodyPre.style.display === "none";
      setCollapsed(!collapsed);
    });

    headerRow.appendChild(title);
    headerRow.appendChild(badge);

            buttonsRow.appendChild(btnCheck);
    buttonsRow.appendChild(levelInput);
    buttonsRow.appendChild(btnStart);
    buttonsRow.appendChild(maxBtn);

    bodyPre = el("pre", {
      style: `
        margin:0;
        white-space:pre-wrap;
        word-break:break-word;
        padding:10px;
        border-radius:12px;
        background:rgba(255,255,255,0.06);
      `
    });

    panel.appendChild(headerRow);
    panel.appendChild(buttonsRow);
    panel.appendChild(bodyPre);

    overlayRoot.appendChild(panel);

    const mount = () => {
      document.body.appendChild(overlayRoot);
      mounted = true;

      const saved = localStorage.getItem("ps_diag_collapsed") === "1";
      setCollapsed(saved);

      applyVisibility();
      render();
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once:true });
    } else {
      mount();
    }

    window.addEventListener("error", (e) => { lastError = e?.message ? `error: ${e.message}` : "error"; render(); });
    window.addEventListener("unhandledrejection", (e) => { lastError = e?.reason ? `promise: ${String(e.reason)}` : "promise"; render(); });
    window.addEventListener("planetstar:state", (e) => { lastState = e.detail || null; render(); });
    window.addEventListener("planetstar:hud", (e) => { lastHud = e.detail || null; render(); });
    window.addEventListener("planetstar:core-debug", (e) => { lastCore = e.detail || null; render(); });
  }

  if (isOn) ensureMounted();

  // 3-finger tap toggle
  let touchCandidate = null;

  window.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 3) { touchCandidate = null; return; }
    touchCandidate = { time: performance.now() };
  }, { passive:true });

  window.addEventListener("touchend", (e) => {
    if (!touchCandidate) return;
    const dt = performance.now() - touchCandidate.time;
    if (dt <= 320) toggleDiag();
    touchCandidate = null;
  }, { passive:true });
})();