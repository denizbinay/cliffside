import type { UnitTypeConfig } from "../../types";

export const lancerConfig: UnitTypeConfig = {
    id: "lancer",
    name: "Lancer",
    role: "disruptor",
    summary: "Knockback strikes",
    special: "Pushes on hit",
    tier: 2,
    stageMin: 1,
    tags: ["disruptor", "push"],
    shopWeight: 0.8,
    hp: 120,
    dmg: 18,
    range: 36,
    speed: 44,
    attackRate: 1.2,
    cost: 5,
    presence: 0.9,
    color: 0xa85f5f,
    statusOnHit: { type: "pushback", strength: 24 }
  };
