import { defineQuery } from "bitecs";
import { Render, StatusEffects, UnitConfig } from "../../components";
import type { GameWorld } from "../../world";
import type { RenderStore } from "../../stores/RenderStore";

const statusEntities = defineQuery([StatusEffects, Render, UnitConfig]);

export function createStatusDotSystem(renderStore: RenderStore): (world: GameWorld) => GameWorld {
  return function statusDotSystem(world: GameWorld): GameWorld {
    const entities = statusEntities(world);

    for (const eid of entities) {
      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData?.statusDots) continue;

      const statusDots = renderData.statusDots;
      const hasStun = StatusEffects.stunTimer[eid] > 0;
      const hasSlow = StatusEffects.slowTimer[eid] > 0;
      const hasBuff = StatusEffects.buffTimer[eid] > 0;

      const hasAnyStatus = hasStun || hasSlow || hasBuff;
      statusDots.setVisible(hasAnyStatus);

      if (statusDots.status) {
        statusDots.status.stun?.setVisible(hasStun);
        statusDots.status.slow?.setVisible(hasSlow);
        statusDots.status.buff?.setVisible(hasBuff);
      }

      statusDots.setPosition(0, -UnitConfig.size[eid] * 0.85);
    }

    return world;
  };
}
