import { describe, it, expect, vi } from "vitest";
import { createGameWorld } from "../../../../src/ecs/world";
import { createSpriteSystem } from "../../../../src/ecs/systems/render/SpriteSystem";
import { createUnit } from "../../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../../src/ecs/stores/ConfigStore";
import { Death, Faction, Position, Render, FACTION } from "../../../../src/ecs/components";
import { RenderStore } from "../../../../src/ecs/stores/RenderStore";
import { UNIT_TYPES } from "../../../../src/data/units";

describe("SpriteSystem", () => {
  it("syncs position, visibility, and flip", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "ai",
      x: 120,
      y: 240,
      configStore
    });

    const renderStore = new RenderStore();
    const container = {
      setPosition: vi.fn(),
      setVisible: vi.fn()
    } as unknown as Phaser.GameObjects.Container;
    const mainSprite = {
      setFlipX: vi.fn()
    } as unknown as Phaser.GameObjects.Sprite;
    const dummyRect = {} as Phaser.GameObjects.Rectangle;
    const dummyDots = { setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;

    const storeIndex = renderStore.create({
      container,
      mainShape: mainSprite,
      mainSprite,
      healthBar: dummyRect,
      healthFill: dummyRect,
      statusDots: dummyDots
    });

    Render.storeIndex[eid] = storeIndex;
    Render.visible[eid] = 1;
    Death.started[eid] = 0;
    Faction.value[eid] = FACTION.AI;

    const system = createSpriteSystem(renderStore);
    system(world);

    expect(container.setPosition).toHaveBeenCalledWith(Position.x[eid], Position.y[eid]);
    expect(container.setVisible).toHaveBeenCalledWith(true);
    expect(mainSprite.setFlipX).toHaveBeenCalledWith(true);
  });

  it("hides when marked dead", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    const renderStore = new RenderStore();
    const container = {
      setPosition: vi.fn(),
      setVisible: vi.fn()
    } as unknown as Phaser.GameObjects.Container;
    const dummyRect = {} as Phaser.GameObjects.Rectangle;
    const dummyDots = { setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;

    const storeIndex = renderStore.create({
      container,
      mainShape: dummyRect as unknown as Phaser.GameObjects.Shape,
      healthBar: dummyRect,
      healthFill: dummyRect,
      statusDots: dummyDots
    });

    Render.storeIndex[eid] = storeIndex;
    Render.visible[eid] = 1;
    Death.started[eid] = 1;

    const system = createSpriteSystem(renderStore);
    system(world);

    expect(container.setVisible).toHaveBeenCalledWith(false);
  });
});
