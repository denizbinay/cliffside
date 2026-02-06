export const STANCES = {
  normal: {
    id: "normal",
    name: "Normal",
    summary: "No modifiers",
    modifiers: {
      hpMult: 1,
      dmgMult: 1,
      rangeMult: 1,
      speedMult: 1,
      attackRateMult: 1,
      healMult: 1,
      presenceMult: 1
    }
  },
  defensive: {
    id: "defensive",
    name: "Defensive",
    summary: "Slower, less damage, tankier",
    modifiers: {
      hpMult: 1.15,
      dmgMult: 0.9,
      rangeMult: 1,
      speedMult: 0.9,
      attackRateMult: 1.05,
      healMult: 1,
      presenceMult: 1
    }
  },
  aggressive: {
    id: "aggressive",
    name: "Aggressive",
    summary: "Faster, more damage, less tanky",
    modifiers: {
      hpMult: 0.9,
      dmgMult: 1.1,
      rangeMult: 1,
      speedMult: 1.1,
      attackRateMult: 0.95,
      healMult: 1,
      presenceMult: 1
    }
  }
};
