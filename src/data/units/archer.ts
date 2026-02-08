import type { UnitTypeConfig } from "../../types";

export const archerConfig: UnitTypeConfig = {
    id: "archer",
    name: "Archer",
    role: "damage",
    summary: "Ranged damage",
    special: "Arrows apply slow",
    tier: 1,
    stageMin: 0,
    tags: ["damage", "ranged", "slow"],
    shopWeight: 1.1,
    hp: 90,
    dmg: 18,
    range: 150,
    speed: 12,
    attackRate: 1.0,
    cost: 4,
    presence: 0.8,
    color: 0xa67f5d,
    statusOnHit: { type: "slow", duration: 1.8, power: 0.5 }
  };
