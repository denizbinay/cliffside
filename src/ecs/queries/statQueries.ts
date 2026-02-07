import { defineQuery } from "bitecs";
import { EntityType, Faction, Health, Presence, FACTION } from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

export const presenceTotalsQuery = defineQuery([Presence, Health, Faction, EntityType]);

const CACHE_WINDOW_MS = 16;
let cachedTotals: PresenceTotals = { player: 0, ai: 0, neutral: 0 };
let cachedAt = -Infinity;

export interface PresenceTotals {
  player: number;
  ai: number;
  neutral: number;
}

export function getPresenceTotals(world: GameWorld): PresenceTotals {
  if (world.time.now - cachedAt <= CACHE_WINDOW_MS) {
    return cachedTotals;
  }

  const totals: PresenceTotals = { player: 0, ai: 0, neutral: 0 };
  const entities = presenceTotalsQuery(world);

  for (const eid of entities) {
    if ((EntityType.value[eid] & ENTITY_TYPE.UNIT) === 0) continue;
    if (Health.current[eid] <= 0) continue;

    const presence = Presence.baseValue[eid] * Presence.multiplier[eid];
    if (Faction.value[eid] === FACTION.PLAYER) {
      totals.player += presence;
    } else if (Faction.value[eid] === FACTION.AI) {
      totals.ai += presence;
    } else {
      totals.neutral += presence;
    }
  }

  cachedTotals = totals;
  cachedAt = world.time.now;
  return cachedTotals;
}
