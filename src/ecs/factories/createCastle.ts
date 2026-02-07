import { addEntity } from "bitecs";
import { createCastleArchetype } from "../archetypes/castleArchetype";
import { Death, Faction, Health, Position, Render, FACTION } from "../components";
import { CASTLE_CONFIG } from "../../config/GameConfig";
import type { GameWorld } from "../world";
import type { Side } from "../../types";

export interface CreateCastleOptions {
  side: Side;
  x: number;
  y: number;
  maxHp?: number;
}

export function createCastle(world: GameWorld, options: CreateCastleOptions): number {
  const { side, x, y, maxHp = CASTLE_CONFIG.maxHp } = options;

  const eid = addEntity(world);
  createCastleArchetype(world, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;

  Health.max[eid] = maxHp;
  Health.current[eid] = maxHp;

  Faction.value[eid] = side === "player" ? FACTION.PLAYER : FACTION.AI;

  Death.started[eid] = 0;
  Death.animDone[eid] = 0;
  Death.cleanupAt[eid] = 0;

  Render.storeIndex[eid] = 0;
  Render.visible[eid] = 1;
  Render.depth[eid] = 6;

  return eid;
}
