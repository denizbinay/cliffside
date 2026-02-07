import { defineQuery } from "bitecs";
import { Combat, Health } from "../components";
import type { GameWorld } from "../world";

const combatEntities = defineQuery([Combat, Health]);

export function createCooldownSystem(): (world: GameWorld) => GameWorld {
  return function cooldownSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = combatEntities(world);

    for (const eid of entities) {
      if (Health.current[eid] <= 0) continue;

      if (Combat.cooldown[eid] > 0) {
        Combat.cooldown[eid] = Math.max(0, Combat.cooldown[eid] - delta);
      }
    }

    return world;
  };
}
