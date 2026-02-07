import type { UnitTypeConfig } from "../../types";

export const oracleConfig: UnitTypeConfig = {
    id: "oracle",
    name: "Oracle",
    role: "support",
    summary: "Far sighted",
    special: "Long range heals",
    tier: 3,
    stageMin: 2,
    tags: ["support", "healer"],
    shopWeight: 0.6,
    hp: 110,
    dmg: 0,
    range: 180,
    speed: 30,
    attackRate: 1.5,
    cost: 7,
    presence: 0.8,
    color: 0x86b799,
    healAmount: 40
  };
