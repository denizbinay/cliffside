import type { UnitTypeConfig } from "../../types";

export const sentinelConfig: UnitTypeConfig = {
    id: "sentinel",
    name: "Sentinel",
    role: "frontline",
    summary: "Steady shield line",
    special: "Reliable frontline",
    tier: 1,
    stageMin: 0,
    tags: ["frontline", "anchor"],
    shopWeight: 1.1,
    hp: 160,
    dmg: 16,
    range: 30,
    speed: 7,
    attackRate: 1.0,
    cost: 3,
    presence: 1.1,
    color: 0x788899
  };
