import { defineQuery } from "bitecs";
import { EntityType, Faction, Position, FACTION } from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";
import type { Side } from "../../types";

export const controlPointsQuery = defineQuery([Position, Faction, EntityType]);

const CACHE_WINDOW_MS = 16;
let cachedEntities: number[] = [];
let cachedAt = -Infinity;

function getCachedControlPoints(world: GameWorld): number[] {
  if (world.time.now - cachedAt > CACHE_WINDOW_MS) {
    cachedEntities = controlPointsQuery(world);
    cachedAt = world.time.now;
  }
  return cachedEntities;
}

function toOwner(value: number): Side | "neutral" {
  if (value === FACTION.PLAYER) return "player";
  if (value === FACTION.AI) return "ai";
  return "neutral";
}

export function getControlPointEntities(world: GameWorld): number[] {
  const entities = getCachedControlPoints(world);
  return entities.filter((eid) => (EntityType.value[eid] & ENTITY_TYPE.CONTROL_POINT) !== 0);
}

export function getControlPointOwners(world: GameWorld): (Side | "neutral")[] {
  const entities = getControlPointEntities(world).sort((a, b) => Position.x[a] - Position.x[b]);
  return entities.map((eid) => toOwner(Faction.value[eid]));
}

export function countControlPointsByOwner(world: GameWorld, owner: Side | "neutral"): number {
  const owners = getControlPointOwners(world);
  return owners.filter((value) => value === owner).length;
}
