// config.js
// Zentrale Quelle für alle Balancing-Werte (keine Magic Numbers mehr in game.js)

window.GAME_CONFIG = {
  meta: {
    maxLevel: 100,
    areaEvery: 10,
    variationEvery: 5,
  },

  levels: {
    l1to10: {
      planetsPerLevel: 5,
      maxPlanets: 50
    }
  },

  mechanics: {
    advancedPlanets: { from: 5, to: 10 },

    // Deine aktuell verwendeten Werte aus game.js (Zone B)
    shyPlanets: {
      active: true,
      chance: 0.7,
      zoneBRadiusBase: 150,
      zoneBRadiusPerLvl: 12,
      fleeBase: 190,
      fleePerLvl: 260,
      fleeStrength: 1.0
    }
  },

  growth: {
    maxRadius: 42,
    baseFromPlanetRadius: 0.10,
    minGrowth: 0.25
  },

  player: {
    baseRadius: 12,
    baseSpeed: 260,
    speedPerLevel: 6,
    smoothing: 0.14,
    growthPerPlanet: 0.65,
    growthPerFragment: 0.35,
  },

  planet: {
    baseRadius: 7,
    baseSpeed: 40,
    eatDistancePadding: 0,
	advancedPhysics: {
  edgeMargin: 46,
  edgeStrengthBase: 55,
  edgeStrengthPerLvl: 45,

  maxSpeedBase: 92,
  maxSpeedPerLvl: 68,
  maxSpeedShyMul: 1.18,
  maxSpeedNormalMul: 1.02
},

trail: {
  maxParticles: 220,
  trimCount: 40
},
    colors: {
      normalL1to10: "#C9A6FF",
      normalL11plus: "#FF63C6",
    }
  },

  star: {
    baseRadius: 9,
    baseSpeed: 190,
    speedPerLevel: 22,
  },

  starAI: {
  curveMaxLevel: 10,

  safety: {
    lookAhead: 0.35,
    safeRadiusMul: 2.1,
    safeRadiusAdd: 24,
    movingTowardDot: 0.6,
    dodgeForce: 378,
    fleeForce: 468,

    final: {
      safeAdd: 10,
      towardSpeedThreshold: 35,
      pushBaseMul: 1.0,
      pushExtra: 1.5,
      sideForce: 180,
      forwardForce: 260
    }
  },

  dist: {
    calmFrom: 320, calmTo: 240,
    nearFrom: 220, nearTo: 240,
    panicFrom: 150, panicTo: 180
  },

  speedMul: {
    maxFrom: 0.80, maxTo: 1.02,
    calmFrom: 0.42, calmTo: 0.52,
    panicBoostFrom: 1.00, panicBoostTo: 1.28
  },

  turning: {
    powerFrom: 5.2, powerTo: 7.4,
    sideFrom: 0.40, sideTo: 0.50
  },

  feint: {
    chanceFrom: 0.08, chanceTo: 0.26,
    durFrom: 0.12, durTo: 0.32,
    cooldownFrom: 0.97, cooldownTo: 0.42,
    strengthFrom: 0.85, strengthTo: 1.20
  },

  bounds: {
    marginFrom: 90, marginTo: 125,
    wallStrengthFrom: 1.05, wallStrengthTo: 1.30,
    centerStrengthFrom: 0.90, centerStrengthTo: 1.45
  },

  particles: {
    speedThreshold: 80,
    emitDenom: 220,
    rateBase: 20,
    rateExtra: 35,
    rateMulFrom: 0.7, rateMulTo: 1.1,
    maxParticles: 240,
    trimCount: 60
  }
},

  fog: {
    slowMultiplier: 0.55,
    driftSpeed: 18,
    defaultCount: 0,
  },

  fragments: {
    splitCount: 2,
    childRadiusMultiplier: 0.45,
    childSpeedMultiplier: 1.35,
    baseCount: 0,
  }
};

growth: {
  maxPlanetsForGrowth: 10,
  baseFromPlanetRadius: 0.10,
  maxRadius: 999
}