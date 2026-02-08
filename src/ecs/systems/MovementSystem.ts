import { defineQuery } from "bitecs";
import {
  Animation,
  ANIM_ACTION,
  Collision,
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
import { isDisplaced, isDashing, setLaneMovement, tickMovement, MOVE_TYPE } from "../../sim/Movement";

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

      // If displaced or dashing, let DisplacementSystem handle it
      // actually, we can try to set lane movement, and if it fails (due to priority), we do nothing
      // this way we respect the priority system centrally

      if (StatusEffects.stunTimer[eid] > 0) continue;
      if (Target.entityId[eid] !== 0) continue;

      // Check if blocked by enemy collision
      if (Collision.blockedBy[eid] !== 0) {
        Animation.currentAction[eid] = ANIM_ACTION.IDLE;
        continue;
      }

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

      // Set intent (will fail if knocked back/dashing due to priority)
      const intent = setLaneMovement(eid, stopX, speed);

      // Only process if we successfully set/kept lane intent
      if (intent.type === MOVE_TYPE.LANE) {
        // Update intent parameters in case they changed (slows, target moved)
        intent.speed = speed;
        intent.targetX = stopX;

        tickMovement(eid, delta);
        Animation.currentAction[eid] = ANIM_ACTION.RUN;
      }
    }

    return world;
  };
}
