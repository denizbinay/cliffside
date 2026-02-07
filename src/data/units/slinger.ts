import type { UnitTypeConfig } from "../../types";

export const slingerConfig: UnitTypeConfig = {
    id: "slinger",
    name: "Slinger",
    role: "damage",
    summary: "Cheap pressure",
    special: "Fast attacks, short range",
    tier: 1,
    stageMin: 0,
    tags: ["damage", "ranged"],
    shopWeight: 1.3,
    hp: 70,
    dmg: 12,
    range: 110,
    speed: 42,
    attackRate: 0.75,
    cost: 2,
    presence: 0.6,
    color: 0xb18c6c
  };
