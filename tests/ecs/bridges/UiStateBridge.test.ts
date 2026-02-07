import { describe, it, expect } from "vitest";
import { createGameWorld } from "../../../src/ecs/world";
import { createUnit } from "../../../src/ecs/factories/createUnit";
import { createControlPoint } from "../../../src/ecs/factories/createControlPoint";
import { UiStateBridge } from "../../../src/ecs/bridges/UiStateBridge";
import { UNIT_TYPES } from "../../../src/data/units";
import type { UiState } from "../../../src/types";

describe("UiStateBridge", () => {
  it("combines legacy state with ECS stats", () => {
    const world = createGameWorld();

    createControlPoint(world, { x: 300, y: 0, owner: "player" });
    createControlPoint(world, { x: 100, y: 0, owner: "neutral" });

    createUnit(world, { config: UNIT_TYPES.guard, side: "player", x: 0, y: 0 });
    createUnit(world, { config: UNIT_TYPES.guard, side: "ai", x: 0, y: 0 });

    const baseState: UiState = {
      playerResources: 10,
      playerIncome: 2,
      aiResources: 8,
      aiIncome: 1.5,
      playerCastle: { hp: 100, maxHp: 200 },
      aiCastle: { hp: 90, maxHp: 200 },
      controlPoints: [],
      wave: {
        countdown: 4,
        interval: 12,
        locked: false,
        number: 1,
        phaseLabel: "Early",
        stageIndex: 0,
        unlockedColumns: 3
      },
      shop: {
        offers: [],
        rerollCost: 2,
        canReroll: true
      },
      waveDraft: { front: [], mid: [], rear: [] },
      waveSupply: 5,
      waveSlots: { front: 2, mid: 2, rear: 2 },
      waveStance: "normal",
      abilityCooldowns: { healWave: 0, pulse: 0 },
      isGameOver: false
    };

    const bridge = new UiStateBridge(world);
    const state = bridge.buildState(baseState);

    expect(state.playerAliveUnits).toBe(1);
    expect(state.aiAliveUnits).toBe(1);
    expect(state.playerPresence).toBeCloseTo(1.2, 4);
    expect(state.aiPresence).toBeCloseTo(1.2, 4);
    expect(state.controlPoints).toEqual(["neutral", "player"]);
  });
});
