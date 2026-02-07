import type { UnitTypeConfig } from "../../types";

export const pikemanConfig: UnitTypeConfig = {
    id: "pikeman",
    name: "Pikeman",
    role: "frontline",
    summary: "Reach fighter",
    special: "Longer melee range",
    tier: 2,
    stageMin: 1,
    tags: ["frontline", "reach"],
    shopWeight: 0.9,
    hp: 150,
    dmg: 18,
    range: 46,
    speed: 34,
    attackRate: 1.15,
    cost: 4,
    presence: 1.0,
    color: 0x7c8f93
  };
