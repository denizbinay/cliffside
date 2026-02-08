import type { UnitTypeConfig } from "../../types";

export const ballistaConfig: UnitTypeConfig = {
    id: "ballista",
    name: "Ballista",
    role: "damage",
    summary: "Siege bolts",
    special: "Massive range, slow fire",
    tier: 3,
    stageMin: 2,
    tags: ["damage", "ranged"],
    shopWeight: 0.5,
    hp: 120,
    dmg: 40,
    range: 230,
    speed: 10,
    attackRate: 2.0,
    cost: 8,
    presence: 0.9,
    color: 0x8c6446
  };
