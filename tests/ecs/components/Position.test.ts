import { describe, it, expect } from "vitest";
import { addComponent, addEntity } from "bitecs";
import { createGameWorld } from "../../../src/ecs/world";
import { Position } from "../../../src/ecs/components";

describe("Position component", () => {
  it("stores x/y values for an entity", () => {
    const world = createGameWorld();
    const eid = addEntity(world);

    addComponent(world, Position, eid);
    expect(Position.x[eid]).toBe(0);
    expect(Position.y[eid]).toBe(0);

    Position.x[eid] = 12.5;
    Position.y[eid] = -7.25;
    expect(Position.x[eid]).toBe(12.5);
    expect(Position.y[eid]).toBe(-7.25);
  });
});
