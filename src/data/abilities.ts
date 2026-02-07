import type { AbilitiesMap } from "../types";

export const ABILITIES: AbilitiesMap = {
  healWave: {
    id: "healWave",
    name: "Heal Wave",
    cost: 0,
    cooldown: 14,
    radius: 999,
    amount: 60
  },
  pulse: {
    id: "pulse",
    name: "Defensive Pulse",
    cost: 0,
    cooldown: 18,
    radius: 120,
    pushStrength: 120,
    stunDuration: 0.8
  }
};
