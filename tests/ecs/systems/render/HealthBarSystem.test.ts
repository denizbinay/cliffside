import { describe, it, expect, vi } from "vitest";
import { createGameWorld } from "../../../../src/ecs/world";
import { createHealthBarSystem } from "../../../../src/ecs/systems/render/HealthBarSystem";
import { createUnit } from "../../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../../src/ecs/stores/ConfigStore";
import { Health, Render } from "../../../../src/ecs/components";
import { RenderStore } from "../../../../src/ecs/stores/RenderStore";
import { UNIT_TYPES } from "../../../../src/data/units";

describe("HealthBarSystem", () => {
  it("updates health fill width and position", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 100,
      y: 200,
      configStore
    });

    Health.max[eid] = 100;
    Health.current[eid] = 50;

    const renderStore = new RenderStore();
    const healthBar = {
      width: 40,
      setPosition: vi.fn(function (this: any, x: number, y: number) {
        this.x = x;
        this.y = y;
      }),
      setVisible: vi.fn()
    } as unknown as Phaser.GameObjects.Rectangle;
    const healthFill = {
      width: 40,
      setPosition: vi.fn(function (this: any, x: number, y: number) {
        this.x = x;
        this.y = y;
      }),
      setVisible: vi.fn()
    } as unknown as Phaser.GameObjects.Rectangle;
    const container = { setPosition: vi.fn(), setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;
    const dummyDots = { setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;

    const storeIndex = renderStore.create({
      container,
      mainShape: healthBar as unknown as Phaser.GameObjects.Shape,
      healthBar,
      healthFill,
      statusDots: dummyDots
    });

    Render.storeIndex[eid] = storeIndex;

    const system = createHealthBarSystem(renderStore, -30);
    system(world);

    expect(healthFill.width).toBe(20);
    expect(healthFill.setPosition).toHaveBeenCalledWith(100 - (40 - 20) / 2, 200 - 30);
  });

  it("hides fill for near-empty health", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    Health.max[eid] = 100;
    Health.current[eid] = 1;

    const renderStore = new RenderStore();
    const healthBar = {
      width: 40,
      setPosition: vi.fn(),
      setVisible: vi.fn()
    } as unknown as Phaser.GameObjects.Rectangle;
    const healthFill = {
      width: 40,
      setPosition: vi.fn(),
      setVisible: vi.fn()
    } as unknown as Phaser.GameObjects.Rectangle;
    const container = { setPosition: vi.fn(), setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;
    const dummyDots = { setVisible: vi.fn() } as unknown as Phaser.GameObjects.Container;

    const storeIndex = renderStore.create({
      container,
      mainShape: healthBar as unknown as Phaser.GameObjects.Shape,
      healthBar,
      healthFill,
      statusDots: dummyDots
    });

    Render.storeIndex[eid] = storeIndex;

    const system = createHealthBarSystem(renderStore, -30);
    system(world);

    expect(healthFill.setVisible).toHaveBeenCalledWith(false);
  });
});
