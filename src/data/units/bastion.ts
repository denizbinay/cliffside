import type { UnitTypeConfig } from "../../types";

export const bastionConfig: UnitTypeConfig = {
    id: "bastion",
    name: "Bastion",
    role: "frontline",
    summary: "Heavy shield bearer",
    special: "High durability",
    tier: 3,
    stageMin: 2,
    tags: ["frontline", "anchor"],
    shopWeight: 0.6,
    hp: 240,
    dmg: 18,
    range: 28,
    speed: 22,
    attackRate: 1.2,
    cost: 7,
    presence: 1.5,
    color: 0x627280
  };
