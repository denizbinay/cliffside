import { addEntity } from "bitecs";
import { createControlPointArchetype } from "../archetypes/controlPointArchetype";
import { Faction, Position, FACTION } from "../components";
import type { GameWorld } from "../world";
import type { Side } from "../../types";

export interface CreateControlPointOptions {
  x: number;
  y: number;
  owner?: Side | "neutral";
}

export function createControlPoint(world: GameWorld, options: CreateControlPointOptions): number {
  const { x, y, owner = "neutral" } = options;

  const eid = addEntity(world);
  createControlPointArchetype(world, eid);

  Position.x[eid] = x;
  Position.y[eid] = y;

  Faction.value[eid] = owner === "player" ? FACTION.PLAYER : owner === "ai" ? FACTION.AI : FACTION.NEUTRAL;

  return eid;
}
