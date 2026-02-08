import type { UnitTypeConfig } from "../../types";

export const warderConfig: UnitTypeConfig = {
    id: "warder",
    name: "Warder",
    role: "support",
    summary: "Sturdy healer",
    special: "High HP, slower heals",
    tier: 2,
    stageMin: 1,
    tags: ["support", "healer"],
    shopWeight: 0.8,
    hp: 150,
    dmg: 0,
    range: 110,
    speed: 6,
    attackRate: 1.3,
    cost: 5,
    presence: 0.9,
    color: 0x7aa48c,
    healAmount: 24
  };
