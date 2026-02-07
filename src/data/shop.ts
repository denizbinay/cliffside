import type { ShopConfig } from "../types";

export const SHOP_CONFIG: ShopConfig = {
  offersPerWave: 4,
  baseRerollCost: 2,
  rerollCostGrowth: 1,
  stageTierCaps: [1, 2, 3],
  earlyRoleGuarantees: ["frontline", "support"]
};
