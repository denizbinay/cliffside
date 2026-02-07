import { defineQuery } from "bitecs";
import { Animation, ANIM_ACTION, Death, Health } from "../components";
import type { GameWorld } from "../world";

const healthEntities = defineQuery([Health, Death, Animation]);

export function createHealthSystem(): (world: GameWorld) => GameWorld {
  return function healthSystem(world: GameWorld): GameWorld {
    const now = world.time.now;
    const entities = healthEntities(world);

    for (const eid of entities) {
      if (Health.current[eid] > 0) continue;

      Health.current[eid] = Math.max(0, Health.current[eid]);

      if (Death.started[eid] === 0) {
        Death.started[eid] = 1;
        Death.cleanupAt[eid] = now + 500;
        Animation.currentAction[eid] = ANIM_ACTION.DEATH;
        Animation.locked[eid] = 1;
        Animation.lockUntil[eid] = Death.cleanupAt[eid];
      }
    }

    return world;
  };
}
