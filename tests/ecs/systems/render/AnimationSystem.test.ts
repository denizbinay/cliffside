import { describe, it, expect, vi } from "vitest";
import { createGameWorld } from "../../../../src/ecs/world";
import { createAnimationSystem } from "../../../../src/ecs/systems/render/AnimationSystem";
import { createUnit } from "../../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../../src/ecs/stores/ConfigStore";
import { Animation, ANIM_ACTION, Render } from "../../../../src/ecs/components";
import { RenderStore } from "../../../../src/ecs/stores/RenderStore";
import { UNIT_TYPES } from "../../../../src/data/units";

describe("AnimationSystem", () => {
  it("plays resolved animation on action change", () => {
    const world = createGameWorld();
    world.time.now = 1000;
    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    const renderStore = new RenderStore();
    const mainSprite = {
      anims: {},
      play: vi.fn()
    } as unknown as Phaser.GameObjects.Sprite;
    const container = { setPosition: vi.fn(), setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;
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
    Animation.currentAction[eid] = ANIM_ACTION.RUN;
    Animation.locked[eid] = 0;
    Animation.lockUntil[eid] = 0;

    const resolveAnimKey = vi.fn(() => ({ key: "unit_run", isFallback: false }));
    const playFallbackVfx = vi.fn();
    const system = createAnimationSystem(renderStore, resolveAnimKey, playFallbackVfx);
    system(world);
    system(world);

    expect(resolveAnimKey).toHaveBeenCalledWith(eid, "run");
    expect(mainSprite.play).toHaveBeenCalledTimes(1);
    expect(mainSprite.play).toHaveBeenCalledWith("unit_run", true);
  });
});
