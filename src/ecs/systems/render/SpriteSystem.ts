import { defineQuery } from "bitecs";
import { Death, EntityType, Faction, Health, Position, Render, FACTION } from "../../components";
import { ENTITY_TYPE } from "../../constants";
import type { GameWorld } from "../../world";
import type { RenderStore } from "../../stores/RenderStore";

const spriteEntities = defineQuery([Position, Render, Health, Death, Faction, EntityType]);

export function createSpriteSystem(renderStore: RenderStore): (world: GameWorld) => GameWorld {
  return function spriteSystem(world: GameWorld): GameWorld {
    const entities = spriteEntities(world);

    for (const eid of entities) {
      const storeIndex = Render.storeIndex[eid];
      if (!storeIndex) continue;

      const renderData = renderStore.get(storeIndex);
      if (!renderData) continue;

      renderData.container.setPosition(Position.x[eid], Position.y[eid]);

      const visible = Render.visible[eid] === 1 && Death.started[eid] === 0;
      renderData.container.setVisible(visible);

      if (renderData.mainSprite?.setFlipX && EntityType.value[eid] & ENTITY_TYPE.UNIT) {
        renderData.mainSprite.setFlipX(Faction.value[eid] === FACTION.AI);
      }
    }

    return world;
  };
}
