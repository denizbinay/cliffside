import { describe, it, expect, vi } from "vitest";
import { hasComponent } from "bitecs";
import { createGameWorld } from "../../../src/ecs/world";
import { createCleanupSystem } from "../../../src/ecs/systems/CleanupSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Death, Health, Render } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("CleanupSystem", () => {
  it("removes ready entities and calls cleanup hook", () => {
    const world = createGameWorld();
    world.time.now = 2000;

    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    Death.started[eid] = 1;
    Death.animDone[eid] = 1;

    const onCleanup = vi.fn();
    const system = createCleanupSystem(onCleanup);
    system(world);

    expect(onCleanup).toHaveBeenCalledWith(eid);
    expect(hasComponent(world, Health, eid)).toBe(false);
    expect(hasComponent(world, Render, eid)).toBe(false);
  });
});
