import { describe, it, expect } from "vitest";
import { addComponent, addEntity } from "bitecs";
import { createGameWorld } from "../../../src/ecs/world";
import { StatusEffects } from "../../../src/ecs/components";

function tickStatus(eid: number, delta: number) {
  if (StatusEffects.stunTimer[eid] > 0) {
    StatusEffects.stunTimer[eid] = Math.max(0, StatusEffects.stunTimer[eid] - delta);
  }
  if (StatusEffects.slowTimer[eid] > 0) {
    StatusEffects.slowTimer[eid] = Math.max(0, StatusEffects.slowTimer[eid] - delta);
    if (StatusEffects.slowTimer[eid] === 0) {
      StatusEffects.slowPower[eid] = 1;
    }
  }
  if (StatusEffects.buffTimer[eid] > 0) {
    StatusEffects.buffTimer[eid] = Math.max(0, StatusEffects.buffTimer[eid] - delta);
    if (StatusEffects.buffTimer[eid] === 0) {
      StatusEffects.buffPower[eid] = 1;
    }
  }
}

describe("StatusEffects component", () => {
  it("ticks down timers and resets modifiers", () => {
    const world = createGameWorld();
    const eid = addEntity(world);

    addComponent(world, StatusEffects, eid);
    StatusEffects.stunTimer[eid] = 2;
    StatusEffects.slowTimer[eid] = 1;
    StatusEffects.slowPower[eid] = 0.6;
    StatusEffects.buffTimer[eid] = 0.5;
    StatusEffects.buffPower[eid] = 1.4;

    tickStatus(eid, 0.75);
    expect(StatusEffects.stunTimer[eid]).toBeCloseTo(1.25);
    expect(StatusEffects.slowTimer[eid]).toBeCloseTo(0.25);
    expect(StatusEffects.slowPower[eid]).toBeCloseTo(0.6);
    expect(StatusEffects.buffTimer[eid]).toBe(0);
    expect(StatusEffects.buffPower[eid]).toBe(1);

    tickStatus(eid, 0.5);
    expect(StatusEffects.slowTimer[eid]).toBe(0);
    expect(StatusEffects.slowPower[eid]).toBe(1);
  });
});
