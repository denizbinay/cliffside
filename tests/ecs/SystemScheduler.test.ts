import { describe, it, expect } from "vitest";
import { SystemScheduler } from "../../src/ecs/systems/SystemScheduler";
import { createGameWorld } from "../../src/ecs/world";
import type { System } from "../../src/ecs/types";

describe("SystemScheduler", () => {
  it("runs systems in priority order", () => {
    const scheduler = new SystemScheduler();
    const calls: string[] = [];

    const low: System = (world) => {
      calls.push("low");
      return world;
    };

    const high: System = (world) => {
      calls.push("high");
      return world;
    };

    scheduler.register("high", high, 20);
    scheduler.register("low", low, 10);

    scheduler.run(createGameWorld());
    expect(calls).toEqual(["low", "high"]);
  });

  it("can enable and disable systems", () => {
    const scheduler = new SystemScheduler();
    const calls: string[] = [];

    const system: System = (world) => {
      calls.push("run");
      return world;
    };

    scheduler.register("toggle", system, 10);
    scheduler.disable("toggle");
    scheduler.run(createGameWorld());
    expect(calls).toEqual([]);

    scheduler.enable("toggle");
    scheduler.run(createGameWorld());
    expect(calls).toEqual(["run"]);
  });

  it("returns registered system names", () => {
    const scheduler = new SystemScheduler();
    scheduler.register("alpha", (world) => world, 5);
    scheduler.register("beta", (world) => world, 10);

    expect(scheduler.getSystemNames()).toEqual(["alpha", "beta"]);
  });
});
