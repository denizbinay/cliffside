/**
 * ActiveEffectsSystem - ticks all active effects and handles expiration.
 */

import { defineQuery } from "bitecs";
import { Health } from "../components/Health";
import { activeEffectsStore } from "../stores/ActiveEffectsStore";
import { tickActiveEffect, triggerEffect, EFFECT_STAGE, type EffectContext } from "../../sim/EffectSystem";
import type { GameWorld } from "../world";

const aliveEntities = defineQuery([Health]);

export function createActiveEffectsSystem(): (world: GameWorld) => GameWorld {
  return function activeEffectsSystem(world: GameWorld): GameWorld {
    const delta = world.time.delta;
    const entities = aliveEntities(world);

    for (const eid of entities) {
      const effects = activeEffectsStore.get(eid);
      if (effects.length === 0) continue;

      // Tick effects and collect expired ones
      const expiredIds: number[] = [];

      for (const effect of effects) {
        // 1. Tick duration
        const stillActive = tickActiveEffect(effect, delta);

        // 2. Trigger ON_TICK handler
        // We construct a context for the tick
        const ctx: Omit<EffectContext, "stage"> = {
          world,
          sourceEid: effect.sourceEid,
          targetEid: effect.targetEid,
          effect: effect.def,
          cancelled: false,
          result: 0
        };
        // If effect tracks stacks locally, we might want to expose it

        triggerEffect(ctx, EFFECT_STAGE.ON_TICK);

        if (!stillActive) {
          expiredIds.push(effect.instanceId);
          // 3. Trigger ON_EXPIRE handler
          triggerEffect(ctx, EFFECT_STAGE.ON_EXPIRE);
        }
      }

      // Remove expired effects
      for (const instanceId of expiredIds) {
        activeEffectsStore.remove(eid, instanceId);
      }
    }

    return world;
  };
}
