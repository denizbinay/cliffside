import { addComponent } from "bitecs";
import {
  Animation,
  Combat,
  Death,
  EntityType,
  Faction,
  Health,
  Position,
  Render,
  Role,
  StatusEffects,
  Target
} from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

export function createTurretArchetype(world: GameWorld, eid: number): void {
  addComponent(world, Position, eid);
  addComponent(world, Health, eid);
  addComponent(world, Combat, eid);
  addComponent(world, StatusEffects, eid);
  addComponent(world, Faction, eid);
  addComponent(world, Role, eid);
  addComponent(world, Target, eid);
  addComponent(world, Animation, eid);
  addComponent(world, Render, eid);
  addComponent(world, Death, eid);
  addComponent(world, EntityType, eid);

  EntityType.value[eid] = ENTITY_TYPE.TURRET;
}
