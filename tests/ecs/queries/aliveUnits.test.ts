import { describe, it, expect } from "vitest";
import { removeEntity } from "bitecs";
import { createGameWorld } from "../../../src/ecs/world";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { FACTION, Health } from "../../../src/ecs/components";
import { countAliveUnits, unitEnterQuery, unitExitQuery } from "../../../src/ecs/queries/aliveUnits";
import { UNIT_TYPES } from "../../../src/data/units";

describe("aliveUnits queries", () => {
  it("counts alive units by faction", () => {
    const world = createGameWorld();

    const playerUnit = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0
    });
    const aiUnit = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "ai",
      x: 0,
      y: 0
    });

    Health.current[aiUnit] = 0;

    expect(countAliveUnits(world, FACTION.PLAYER)).toBe(1);
    expect(countAliveUnits(world, FACTION.AI)).toBe(0);
    expect(countAliveUnits(world, FACTION.NEUTRAL)).toBe(0);

    Health.current[playerUnit] = 0;
    expect(countAliveUnits(world, FACTION.PLAYER)).toBe(0);
  });

  it("tracks enter and exit events", () => {
    const world = createGameWorld();
    const unit = createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 0,
      y: 0
    });

    const entered = unitEnterQuery(world);
    expect(entered).toContain(unit);

    unitEnterQuery(world);
    unitExitQuery(world);

    removeEntity(world, unit);
    const exited = unitExitQuery(world);
    expect(exited).toContain(unit);
  });
});
