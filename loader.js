/* loader.js — Planet Star dynamic loader (build.json driven) */

(function () {
  const BUILD_FALLBACK = "dev-" + Date.now();

  // Helper: load scripts in order (important!)
  function loadScriptsSequential(urls, build, done) {
    let i = 0;

    function next() {
      if (i >= urls.length) return done && done();

      const src = urls[i++] + "?v=" + encodeURIComponent(build);
      const s = document.createElement("script");
      s.src = src;
      s.defer = true;

      s.onload = next;
      s.onerror = function () {
        console.error("[loader] failed:", src);
      };

      document.head.appendChild(s);
    }

    next();
  }

  // Keep this list in EXACT order
  const scripts = [
    "systems/events.js",
    "systems/difficulty.js",
    "systems/event-names.js",
    "systems/audio-controller.js",
    "systems/bg.js",

    "config.js",
    "levels.js",
    "systems/levels-normalize.js",

    "systems/save.js",
    "systems/audio.js",
    "systems/spawn.js",
    "systems/collisions.js",
    "systems/input.js",
    "systems/gesture-lock.js",

    "entities/player.js",
    "entities/planet.js",
    "entities/star.js",

    "ui/hud.js",
    "game-core.js",
    "ui/menu.js",

    "ui/diag-overlay.js"
  ];

  // 1) Try build.json
  fetch("build.json?v=" + encodeURIComponent(BUILD_FALLBACK), { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const build = (data && data.build && String(data.build)) || BUILD_FALLBACK;

      // Expose build for DIAG etc.
      window.__PS_BUILD = build;

      // Optional: also cache-bust CSS if present
      const css = document.getElementById("ps-css");
      if (css) css.href = "style.css?v=" + encodeURIComponent(build);

      loadScriptsSequential(scripts, build, function () {
        window.__PS_LOADED = true;
      });
    })
    .catch(() => {
      // Fallback: still start game
      const build = BUILD_FALLBACK;
      window.__PS_BUILD = build;

      const css = document.getElementById("ps-css");
      if (css) css.href = "style.css?v=" + encodeURIComponent(build);

      loadScriptsSequential(scripts, build, function () {
        window.__PS_LOADED = true;
      });
    });
})();