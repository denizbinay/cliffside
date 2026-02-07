import { addComponent } from "bitecs";
import { Death, EntityType, Faction, Health, Position, Render } from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

export function createCastleArchetype(world: GameWorld, eid: number): void {
  addComponent(world, Position, eid);
  addComponent(world, Health, eid);
  addComponent(world, Faction, eid);
  addComponent(world, Render, eid);
  addComponent(world, Death, eid);
  addComponent(world, EntityType, eid);

  EntityType.value[eid] = ENTITY_TYPE.CASTLE;
}
