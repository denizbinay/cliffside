import { defineQuery } from "bitecs";
import { Health, Position, Render } from "../../components";
import { COMBAT_CONFIG } from "../../../config/GameConfig";
import type { GameWorld } from "../../world";
import type { RenderStore } from "../../stores/RenderStore";

const spawnEntities = defineQuery([Render, Position, Health]);

export function createSpawnEffectSystem(renderStore: RenderStore): (world: GameWorld) => GameWorld {
  const spawned = new Set<number>();

  return function spawnEffectSystem(world: GameWorld): GameWorld {
    const entities = spawnEntities(world);
    const scene = world.scene;

    for (const eid of entities) {
      if (spawned.has(eid)) continue;

      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData) continue;

      spawned.add(eid);

      // Spawn animation temporarily disabled to prevent castle pop-in
      // Re-enable or customize for specific unit types if needed
      /*
      const container = renderData.container;
      container.setAlpha(0);
      if (container.setScale) {
        container.setScale(0.85);
      }

      if (scene?.tweens) {
        scene.tweens.add({
          targets: container,
          alpha: 1,
          scale: 1,
          duration: COMBAT_CONFIG.spawnPulseDuration,
          ease: "Back.Out"
        });
      } else {
        container.setAlpha(1);
        if (container.setScale) {
          container.setScale(1);
        }
      }
      */
    }

    return world;
  };
}
