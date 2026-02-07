import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createMovementSystem } from "../../../src/ecs/systems/MovementSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { FACTION, Position, StatusEffects, Target, Velocity } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";

describe("MovementSystem", () => {
  it("moves toward enemy castle and clamps at stop offset", () => {
    const world = createGameWorld();
    world.time.delta = 1;

    const configStore = new ConfigStore(UNIT_TYPES);
    const eid = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 100,
      y: 0,
      configStore
    });

    Velocity.baseSpeed[eid] = 100;
    StatusEffects.stunTimer[eid] = 0;
    StatusEffects.slowTimer[eid] = 0;
    Target.entityId[eid] = 0;

    const system = createMovementSystem((faction) => (faction === FACTION.AI ? 200 : 0));
    system(world);

    expect(Position.x[eid]).toBe(160);
  });
});
