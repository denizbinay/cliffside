import type { UnitTypeConfig } from "../../types";

export const skirmisherConfig: UnitTypeConfig = {
    id: "skirmisher",
    name: "Skirmisher",
    role: "damage",
    summary: "Fast darting fire",
    special: "High rate, short range",
    tier: 1,
    stageMin: 0,
    tags: ["damage", "ranged"],
    shopWeight: 1.2,
    hp: 80,
    dmg: 16,
    range: 90,
    speed: 20,
    attackRate: 0.7,
    cost: 3,
    presence: 0.6,
    color: 0xb18966
  };
