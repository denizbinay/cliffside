import type { UnitTypeConfig } from "../../types";

export const vanguardConfig: UnitTypeConfig = {
    id: "vanguard",
    name: "Vanguard",
    role: "frontline",
    summary: "Fast engager",
    special: "Quick to contact",
    tier: 2,
    stageMin: 1,
    tags: ["frontline", "skirmish"],
    shopWeight: 0.9,
    hp: 140,
    dmg: 20,
    range: 28,
    speed: 40,
    attackRate: 0.95,
    cost: 5,
    presence: 1.0,
    color: 0x7f8a8f
  };
