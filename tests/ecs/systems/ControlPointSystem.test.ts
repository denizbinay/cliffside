import { describe, expect, it, vi } from "vitest";
import { createGameWorld, updateWorldTime } from "../../../src/ecs/world";
import { createControlPointSystem } from "../../../src/ecs/systems/ControlPointSystem";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { createControlPoint } from "../../../src/ecs/factories/createControlPoint";
import { ConfigStore } from "../../../src/ecs/stores/ConfigStore";
import { Faction, FACTION } from "../../../src/ecs/components";
import { UNIT_TYPES } from "../../../src/data/units";
import type { ControlPoint } from "../../../src/types";

describe("ControlPointSystem", () => {
  it("updates ownership from unit presence and emits callbacks", () => {
    const world = createGameWorld();
    const configStore = new ConfigStore(UNIT_TYPES);

    createUnit(world, {
      config: UNIT_TYPES.guard,
      side: "player",
      x: 100,
      y: 100,
      configStore
    });

    const controlPointEid = createControlPoint(world, {
      x: 100,
      y: 100,
      owner: "neutral"
    });

    const points: ControlPoint[] = [
      {
        index: 0,
        x: 100,
        y: 100,
        owner: "neutral",
        progress: 0,
        glow: null,
        rune: null,
        marker: {} as Phaser.GameObjects.Arc,
        core: {} as Phaser.GameObjects.Arc,
        zone: { x: 50, y: 50, width: 120, height: 120 } as Phaser.Geom.Rectangle
      }
    ];

    const onPointOwnerChanged = vi.fn();
    const onZoneOwnerChanged = vi.fn();

    const system = createControlPointSystem({
      getControlPoints: () => points,
      getControlPointEids: () => [controlPointEid],
      onPointOwnerChanged,
      onZoneOwnerChanged,
      checkInterval: 0.05
    });

    for (let i = 0; i < 20; i += 1) {
      updateWorldTime(world, 0.5, 500 + i * 500);
      system(world);
    }

    expect(points[0].owner).toBe("player");
    expect(Faction.value[controlPointEid]).toBe(FACTION.PLAYER);
    expect(onPointOwnerChanged).toHaveBeenCalledTimes(1);
    expect(onZoneOwnerChanged).toHaveBeenCalledWith("player", "neutral");
  });
});
