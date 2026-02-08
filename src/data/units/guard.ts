import type { UnitTypeConfig } from "../../types";

export const guardConfig: UnitTypeConfig = {
    id: "guard",
    name: "Guard",
    role: "frontline",
    summary: "Frontline blocker",
    special: "High presence on zone",
    tier: 1,
    stageMin: 0,
    tags: ["frontline", "anchor"],
    shopWeight: 1.2,
    hp: 180,
    dmg: 14,
    range: 28,
    speed: 15,
    attackRate: 1.1,
    cost: 3,
    presence: 1.2,
    color: 0x7d8a99
  };
