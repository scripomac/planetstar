/* Planet Star – systems/collisions.js
   Central collision helpers (low-risk refactor step).
   - Player ↔ Planets (eat + callbacks)
   - Player ↔ Star (catch + callback)

   This file contains NO UI, NO saving, NO spawning.
*/
(() => {
  "use strict";

  window.PS = window.PS || {};
  window.PS.systems = window.PS.systems || {};

  function defaultDist(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.hypot(dx, dy);
  }

  /**
   * Checks for eaten planets and removes them from the array.
   * @param {Object} args
   * @param {{x:number,y:number,r:number}} args.player
   * @param {Array<{x:number,y:number,r:number}>} args.planets  (mutated: eaten planets removed)
   * @param {Object} args.cfg  GAME_CONFIG-like object
   * @param {(ax:number,ay:number,bx:number,by:number)=>number} [args.dist]
   * @param {(planet:Object)=>void} [args.onEat] called for each eaten planet (after removal)
   * @returns {number} eaten count in this check
   */
  function eatPlanets({ player, planets, cfg, dist = defaultDist, onEat }) {
    if (!player || !planets || !Array.isArray(planets) || planets.length === 0) return 0;

    const pad = cfg?.planet?.eatDistancePadding ?? 0;
    let eaten = 0;

    for (let i = planets.length - 1; i >= 0; i--) {
      const p = planets[i];
      if (!p) continue;

      if (dist(player.x, player.y, p.x, p.y) <= player.r + p.r + pad) {
        planets.splice(i, 1);
        eaten++;
        if (typeof onEat === "function") onEat(p);
      }
    }
    return eaten;
  }

  /**
   * Checks if star is caught by player.
   * @param {Object} args
   * @param {{x:number,y:number,r:number}} args.player
   * @param {{x:number,y:number,r:number}|null} args.star
   * @param {(ax:number,ay:number,bx:number,by:number)=>number} [args.dist]
   * @param {()=>void} [args.onCatch]
   * @returns {boolean} caught?
   */
  function catchStar({ player, star, dist = defaultDist, onCatch }) {
    if (!player || !star) return false;
    if (dist(player.x, player.y, star.x, star.y) <= player.r + star.r) {
      if (typeof onCatch === "function") onCatch();
      return true;
    }
    return false;
  }

  window.PS.systems.collisions = { eatPlanets, catchStar };
})();
