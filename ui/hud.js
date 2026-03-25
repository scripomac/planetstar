/* Planet Star – ui/hud.js
   HUD updates happen ONLY via events from game-core:
     planetstar:hud { level, eaten, total }
*/
(() => {
  "use strict";

  const hudLevel = document.getElementById("hudLevel");
  const hudPlanets = document.getElementById("hudPlanets");

  function setHudText({ level, eaten, total }) {
    if (hudLevel) hudLevel.textContent = `Level ${level}`;
    if (hudPlanets) hudPlanets.textContent = `Planeten ${eaten}/${total}`;
  }

  // Initial clear (optional)
  setHudText({ level: 1, eaten: 0, total: 0 });

  window.addEventListener("planetstar:hud", (e) => {
    if (!e?.detail) return;
    setHudText(e.detail);
  });
})();