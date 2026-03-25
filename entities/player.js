/* Planet Star – entities/player.js
   Player entity (data + small helpers). The main update loop remains in game-core.js for now.
   Future: move movement & rendering into this entity.
*/
(() => {
  "use strict";
  window.PS = window.PS || {};
  window.PS.entities = window.PS.entities || {};

  window.PS.entities.createPlayer = function createPlayer({ x, y, r }) {
    return { x, y, tx: x, ty: y, r };
  };
})();