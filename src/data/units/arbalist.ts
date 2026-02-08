import type { UnitTypeConfig } from "../../types";

export const arbalistConfig: UnitTypeConfig = {
  id: "arbalist",
  name: "Arbalist",
  role: "damage",
  summary: "Long-range shot",
  special: "High damage, slow fire",
  tier: 3,
  stageMin: 2,
  tags: ["damage", "ranged"],
  shopWeight: 0.6,
  hp: 100,
  dmg: 34,
  range: 200,
  speed: 30,
  attackRate: 1.8,
  cost: 7,
  presence: 0.8,
  color: 0x9a6f4f
};
