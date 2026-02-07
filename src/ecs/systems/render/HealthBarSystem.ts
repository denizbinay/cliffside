import { defineQuery } from "bitecs";
import { Death, Health, Position, Render } from "../../components";
import type { GameWorld } from "../../world";
import type { RenderStore } from "../../stores/RenderStore";

const healthBarEntities = defineQuery([Position, Health, Render, Death]);

export function createHealthBarSystem(
  renderStore: RenderStore,
  defaultOffsetY: number = -30
): (world: GameWorld) => GameWorld {
  return function healthBarSystem(world: GameWorld): GameWorld {
    const entities = healthBarEntities(world);

    for (const eid of entities) {
      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData?.healthBar || !renderData?.healthFill) continue;

      const offsetX = renderData.healthBarOffsetX ?? 0;
      const offsetY = renderData.healthBarOffsetY ?? defaultOffsetY;
      const x = Position.x[eid] + offsetX;
      const y = Position.y[eid] + offsetY;
      const maxHp = Health.max[eid];
      const ratio = maxHp > 0 ? Math.max(0, Math.min(1, Health.current[eid] / maxHp)) : 0;

      renderData.healthBar.setPosition(x, y);

      const barWidth = renderData.healthBar.width;
      const fillWidth = barWidth * ratio;
      renderData.healthFill.width = fillWidth;
      renderData.healthFill.setPosition(x - (barWidth - fillWidth) / 2, y);

      const isDead = Death.started[eid] === 1;
      renderData.healthBar.setVisible(!isDead);
      renderData.healthFill.setVisible(!isDead && ratio > 0.02);
    }

    return world;
  };
}
