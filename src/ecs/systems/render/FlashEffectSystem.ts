import { defineQuery } from "bitecs";
import { Health, Render, UnitConfig } from "../../components";
import { COMBAT_CONFIG } from "../../../config/GameConfig";
import type { GameWorld } from "../../world";
import type { RenderStore } from "../../stores/RenderStore";

const flashEntities = defineQuery([Health, Render, UnitConfig]);

export function createFlashEffectSystem(renderStore: RenderStore): (world: GameWorld) => GameWorld {
  const lastHealth = new Map<number, number>();

  return function flashEffectSystem(world: GameWorld): GameWorld {
    const entities = flashEntities(world);
    const scene = world.scene;

    for (const eid of entities) {
      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData) continue;

      const current = Health.current[eid];
      const previous = lastHealth.get(eid);
      lastHealth.set(eid, current);

      if (previous === undefined || current === previous) continue;

      const delta = current - previous;
      const flashColor = delta > 0 ? 0xc9f5c7 : 0xffc2c2;
      const mainShape = renderData.mainShape as Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite;

      if ((mainShape as Phaser.GameObjects.Shape).setFillStyle) {
        (mainShape as Phaser.GameObjects.Shape).setFillStyle(flashColor);
        if (scene?.time?.delayedCall) {
          const baseColor = UnitConfig.color[eid];
          scene.time.delayedCall(COMBAT_CONFIG.flashDuration, () => {
            if (Health.current[eid] <= 0) return;
            (mainShape as Phaser.GameObjects.Shape).setFillStyle(baseColor);
          });
        } else {
          (mainShape as Phaser.GameObjects.Shape).setFillStyle(UnitConfig.color[eid]);
        }
        continue;
      }

      if ((mainShape as Phaser.GameObjects.Sprite).setTintFill) {
        (mainShape as Phaser.GameObjects.Sprite).setTintFill(flashColor);
        if (scene?.time?.delayedCall) {
          scene.time.delayedCall(COMBAT_CONFIG.flashDuration, () => {
            if (Health.current[eid] <= 0) return;
            (mainShape as Phaser.GameObjects.Sprite).clearTint();
          });
        } else if ((mainShape as Phaser.GameObjects.Sprite).clearTint) {
          (mainShape as Phaser.GameObjects.Sprite).clearTint();
        }
      }
    }

    return world;
  };
}
