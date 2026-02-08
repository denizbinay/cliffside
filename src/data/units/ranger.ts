import type { UnitTypeConfig } from "../../types";

export const rangerConfig: UnitTypeConfig = {
    id: "ranger",
    name: "Ranger",
    role: "damage",
    summary: "Longer reach",
    special: "Balanced range damage",
    tier: 2,
    stageMin: 1,
    tags: ["damage", "ranged"],
    shopWeight: 0.9,
    hp: 100,
    dmg: 22,
    range: 170,
    speed: 10,
    attackRate: 1.1,
    cost: 5,
    presence: 0.8,
    color: 0xa17657
  };
