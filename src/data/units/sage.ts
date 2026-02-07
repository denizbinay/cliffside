import type { UnitTypeConfig } from "../../types";

export const sageConfig: UnitTypeConfig = {
    id: "sage",
    name: "Sage",
    role: "support",
    summary: "Deep healer",
    special: "Large, slower heals",
    tier: 2,
    stageMin: 1,
    tags: ["support", "healer"],
    shopWeight: 0.7,
    hp: 120,
    dmg: 0,
    range: 130,
    speed: 30,
    attackRate: 1.6,
    cost: 5,
    presence: 0.8,
    color: 0x95c2a5,
    healAmount: 34
  };
