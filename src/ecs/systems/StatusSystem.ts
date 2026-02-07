import { defineQuery } from "bitecs";
import { Health, StatusEffects } from "../components";
import type { GameWorld } from "../world";

const statusEntities = defineQuery([StatusEffects, Health]);

export function createStatusSystem(): (world: GameWorld) => GameWorld {
  return function statusSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = statusEntities(world);

    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;

      if (StatusEffects.stunTimer[eid] > 0) {
        StatusEffects.stunTimer[eid] = Math.max(0, StatusEffects.stunTimer[eid] - delta);
      }

      if (StatusEffects.slowTimer[eid] > 0) {
        StatusEffects.slowTimer[eid] = Math.max(0, StatusEffects.slowTimer[eid] - delta);
        if (StatusEffects.slowTimer[eid] === 0) {
          StatusEffects.slowPower[eid] = 1;
        }
      }

      if (StatusEffects.buffTimer[eid] > 0) {
        StatusEffects.buffTimer[eid] = Math.max(0, StatusEffects.buffTimer[eid] - delta);
        if (StatusEffects.buffTimer[eid] === 0) {
          StatusEffects.buffPower[eid] = 1;
        }
      }
    }

    return world;
  };
}
