import { defineQuery, enterQuery, exitQuery } from "bitecs";
import { EntityType, Faction, Health, Position } from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

export const aliveUnitsQuery = defineQuery([Position, Health, Faction, EntityType]);
export const unitEnterQuery = enterQuery(aliveUnitsQuery);
export const unitExitQuery = exitQuery(aliveUnitsQuery);

const CACHE_WINDOW_MS = 16;
let cachedEntities: number[] = [];
let cachedAt = -Infinity;

function getCachedAliveEntities(world: GameWorld): number[] {
  if (world.time.now - cachedAt > CACHE_WINDOW_MS) {
    cachedEntities = aliveUnitsQuery(world);
    cachedAt = world.time.now;
  }
  return cachedEntities;
}

export function isAliveUnit(eid: number): boolean {
  return (EntityType.value[eid] & ENTITY_TYPE.UNIT) !== 0 && Health.current[eid] > 0;
}

export function getAliveUnitsByFaction(world: GameWorld, faction: number): number[] {
  const entities = getCachedAliveEntities(world);
  const results: number[] = [];

  for (const eid of entities) {
    if (!isAliveUnit(eid)) continue;
    if (Faction.value[eid] !== faction) continue;
    results.push(eid);
  }

  return results;
}

export function countAliveUnits(world: GameWorld, faction: number): number {
  return getAliveUnitsByFaction(world, faction).length;
}
