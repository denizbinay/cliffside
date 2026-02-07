import type { UnitTypeConfig } from "../../types";

export const clericConfig: UnitTypeConfig = {
    id: "cleric",
    name: "Cleric",
    role: "support",
    summary: "Heals allies",
    special: "Heals lowest health ally",
    tier: 1,
    stageMin: 0,
    tags: ["support", "healer"],
    shopWeight: 1.0,
    hp: 110,
    dmg: 0,
    range: 120,
    speed: 34,
    attackRate: 1.2,
    cost: 4,
    presence: 0.7,
    color: 0x8fbf99,
    healAmount: 22
  };
