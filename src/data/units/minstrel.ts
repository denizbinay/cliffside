import type { UnitTypeConfig } from "../../types";

export const minstrelConfig: UnitTypeConfig = {
    id: "minstrel",
    name: "Minstrel",
    role: "support",
    summary: "Quick healing",
    special: "Fast, small heals",
    tier: 1,
    stageMin: 0,
    tags: ["support", "healer"],
    shopWeight: 1.1,
    hp: 90,
    dmg: 0,
    range: 100,
    speed: 8,
    attackRate: 0.8,
    cost: 3,
    presence: 0.6,
    color: 0x86b89f,
    healAmount: 16
  };
