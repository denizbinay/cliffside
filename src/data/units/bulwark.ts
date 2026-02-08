import type { UnitTypeConfig } from "../../types";

export const bulwarkConfig: UnitTypeConfig = {
    id: "bulwark",
    name: "Bulwark",
    role: "frontline",
    summary: "Heavy front anchor",
    special: "Very high presence",
    tier: 3,
    stageMin: 2,
    tags: ["frontline", "anchor"],
    shopWeight: 0.6,
    hp: 260,
    dmg: 12,
    range: 26,
    speed: 12,
    attackRate: 1.3,
    cost: 7,
    presence: 1.6,
    color: 0x6b7a8d
  };
