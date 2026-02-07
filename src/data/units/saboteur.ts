import type { UnitTypeConfig } from "../../types";

export const saboteurConfig: UnitTypeConfig = {
    id: "saboteur",
    name: "Saboteur",
    role: "disruptor",
    summary: "Harasses and slows",
    special: "Applies short slow",
    tier: 1,
    stageMin: 0,
    tags: ["disruptor", "slow"],
    shopWeight: 1.0,
    hp: 90,
    dmg: 10,
    range: 30,
    speed: 50,
    attackRate: 1.0,
    cost: 3,
    presence: 0.7,
    color: 0xb06a6a,
    statusOnHit: { type: "slow", duration: 1.2, power: 0.6 }
  };
