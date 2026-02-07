import { describe, it, expect, vi } from "vitest";
import { GameSceneBridge } from "../../../src/ecs/bridges/GameSceneBridge";
import type GameScene from "../../../src/scenes/GameScene";

describe("GameSceneBridge", () => {
  it("initializes world and updates time", () => {
    const scene = {
      id: "scene",
      getCastleEidByFaction: () => null,
      getEntityX: () => null,
      handleEntityCleanup: () => {}
    } as unknown as GameScene;
    const bridge = new GameSceneBridge(scene);
    const runSpy = vi.spyOn(bridge.scheduler, "run").mockReturnValue(bridge.world);

    expect(bridge.world.scene).toBe(scene);

    bridge.update(0.5, 1234);

    expect(bridge.world.time.delta).toBe(0.5);
    expect(bridge.world.time.elapsed).toBe(0.5);
    expect(bridge.world.time.now).toBe(1234);
    expect(runSpy).toHaveBeenCalledWith(bridge.world);
  });

  it("clears stores and resets world on destroy", () => {
    const scene = {
      id: "scene",
      getCastleEidByFaction: () => null,
      getEntityX: () => null,
      handleEntityCleanup: () => {}
    } as unknown as GameScene;
    const bridge = new GameSceneBridge(scene);
    const renderSpy = vi.spyOn(bridge.renderStore, "clear");
    const poolSpy = vi.spyOn(bridge.unitPool, "clear");

    bridge.update(0.2, 900);
    bridge.destroy();

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(poolSpy).toHaveBeenCalledTimes(1);
    expect(bridge.world.time.delta).toBe(0);
    expect(bridge.world.time.elapsed).toBe(0);
    expect(bridge.world.time.now).toBe(0);
    expect(bridge.world.scene).toBeNull();
  });
});
