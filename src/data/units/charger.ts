import type { UnitTypeConfig } from "../../types";

export const chargerConfig: UnitTypeConfig = {
    id: "charger",
    name: "Charger",
    role: "disruptor",
    summary: "Breaks lines",
    special: "Hits push enemies back",
    tier: 2,
    stageMin: 1,
    tags: ["disruptor", "push"],
    shopWeight: 0.9,
    hp: 130,
    dmg: 20,
    range: 30,
    speed: 52,
    attackRate: 1.4,
    cost: 5,
    presence: 1.0,
    color: 0xb35f5f,
    statusOnHit: { type: "pushback", strength: 32 }
  };
