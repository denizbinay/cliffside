import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createStatusSystem } from "../../../src/ecs/systems/StatusSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { StatusEffects } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("StatusSystem", () => {
  it("ticks down timers and resets powers", () => {
    const world = createGameWorld();
    world.time.delta = 0.5;

    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0,
      configStore
    });

    StatusEffects.stunTimer[eid] = 0.2;
    StatusEffects.slowTimer[eid] = 0.3;
    StatusEffects.slowPower[eid] = 0.4;
    StatusEffects.buffTimer[eid] = 0.1;
    StatusEffects.buffPower[eid] = 1.6;

    const system = createStatusSystem();
    system(world);

    expect(StatusEffects.stunTimer[eid]).toBe(0);
    expect(StatusEffects.slowTimer[eid]).toBe(0);
    expect(StatusEffects.slowPower[eid]).toBe(1);
    expect(StatusEffects.buffTimer[eid]).toBe(0);
    expect(StatusEffects.buffPower[eid]).toBe(1);
  });
});
