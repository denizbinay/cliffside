import { addComponent } from "bitecs";
import {
  Animation,
  Collision,
  Combat,
  Death,
  EntityType,
  Faction,
  Health,
  Position,
  Presence,
  Render,
  Role,
  StatusEffects,
  Target,
  UnitConfig,
  Velocity
} from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

export const UNIT_COMPONENTS = [
  Position,
  Velocity,
  Health,
  Combat,
  StatusEffects,
  Faction,
  Role,
  Target,
  Animation,
  Render,
  UnitConfig,
  Presence,
  Death,
  EntityType,
  Collision
];

export function createUnitArchetype(world: GameWorld, eid: number): void {
  for (const component of UNIT_COMPONENTS) {
    addComponent(world, component, eid);
  }

  EntityType.value[eid] = ENTITY_TYPE.UNIT;
}
