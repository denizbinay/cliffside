import type { UnitTypeConfig } from "../../types";

export const hammererConfig: UnitTypeConfig = {
    id: "hammerer",
    name: "Hammerer",
    role: "disruptor",
    summary: "Stuns on impact",
    special: "Brief single-target stun",
    tier: 2,
    stageMin: 1,
    tags: ["disruptor", "stun"],
    shopWeight: 0.8,
    hp: 140,
    dmg: 16,
    range: 28,
    speed: 5,
    attackRate: 1.5,
    cost: 5,
    presence: 1.0,
    color: 0xa65f5f,
    statusOnHit: { type: "stun", duration: 0.6 }
  };
