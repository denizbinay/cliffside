import { defineQuery } from "bitecs";
import {
  Animation,
  ANIM_ACTION,
  EntityType,
  Faction,
  FACTION,
  Health,
  Position,
  Role,
  ROLE,
  StatusEffects,
  Target,
  Velocity
} from "../components";
import { ENTITY_TYPE } from "../constants";
import type { GameWorld } from "../world";

const movableUnits = defineQuery([
  Position,
  Velocity,
  Health,
  Faction,
  StatusEffects,
  Target,
  Role,
  EntityType,
  Animation
]);

export function createMovementSystem(
  getCastleX: (faction: number) => number | null,
  castleStopOffset: number = 40
): (world: GameWorld) => GameWorld {
  return function movementSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = movableUnits(world);

    for (const eid of entities) {
      if (!(EntityType.value[eid] & ENTITY_TYPE.UNIT)) continue;
      if (Health.current[eid] <= 0) continue;
      if (Role.value[eid] === ROLE.SUPPORT) continue;
      if (StatusEffects.stunTimer[eid] > 0) continue;
      if (Target.entityId[eid] !== 0) continue;

      let speed = Velocity.baseSpeed[eid];
      if (StatusEffects.slowTimer[eid] > 0) {
        speed *= StatusEffects.slowPower[eid];
      }

      const myFaction = Faction.value[eid];
      const enemyFaction = myFaction === FACTION.PLAYER ? FACTION.AI : FACTION.PLAYER;
      const enemyCastleX = getCastleX(enemyFaction);
      if (enemyCastleX === null || Number.isNaN(enemyCastleX)) continue;

      const direction = myFaction === FACTION.PLAYER ? 1 : -1;
      const stopX = enemyCastleX + (direction === 1 ? -castleStopOffset : castleStopOffset);

      Position.x[eid] += direction * speed * delta;

      if ((direction === 1 && Position.x[eid] > stopX) || (direction === -1 && Position.x[eid] < stopX)) {
        Position.x[eid] = stopX;
      }

      Animation.currentAction[eid] = ANIM_ACTION.RUN;
    }

    return world;
  };
}
