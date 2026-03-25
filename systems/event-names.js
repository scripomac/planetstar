// systems/event-names.js
(() => {
  "use strict";

  window.PS = window.PS || {};

  window.PS.EVT = {
    GAME_START: "GAME_START",
    GAME_PAUSE: "GAME_PAUSE",
    GAME_RESUME: "GAME_RESUME",
    LEVEL_COMPLETE: "LEVEL_COMPLETE",
    GAME_OVER: "GAME_OVER",
    PAYWALL: "PAYWALL",

    // Optional helpers (future)
    STATE: "STATE",
    HUD: "HUD",
  };
})();