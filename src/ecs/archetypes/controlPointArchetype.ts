import { addComponent } from "bitecs";
import { EntityType, Faction, Position } from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

export function createControlPointArchetype(world: GameWorld, eid: number): void {
  addComponent(world, Position, eid);
  addComponent(world, Faction, eid);
  addComponent(world, EntityType, eid);

  EntityType.value[eid] = ENTITY_TYPE.CONTROL_POINT;
}
