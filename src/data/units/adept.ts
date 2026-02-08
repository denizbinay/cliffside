import type { UnitTypeConfig } from "../../types";

export const adeptConfig: UnitTypeConfig = {
  id: "adept",
  name: "Adept",
  role: "support",
  summary: "Light healer",
  special: "Quick, small heals",
  tier: 1,
  stageMin: 0,
  tags: ["support", "healer"],
  shopWeight: 1.2,
  hp: 85,
  dmg: 0,
  range: 110,
  speed: 15,
  attackRate: 0.9,
  cost: 3,
  presence: 0.6,
  color: 0x7fb59a,
  healAmount: 14
};
