import { describe, it, expect, beforeEach } from "vitest";
import { SIDE, WAVE_CONFIG, PHASE_LABELS } from "../src/config/GameConfig.js";
import WaveManager from "../src/systems/WaveManager.js";

function createMockScene() {
  return {
    isGameOver: false,
    matchTime: 0,
    time: {
      delayedCall(_delay, callback) { callback(); }
    },
    events: { emit() {} }
  };
}

describe("WaveManager", () => {
  let wm;
  let scene;

  beforeEach(() => {
    scene = createMockScene();
    wm = new WaveManager(scene);
  });

  it("initializes with correct defaults", () => {
    expect(wm.waveSupply).toBe(WAVE_CONFIG.supply);
    expect(wm.waveNumber).toBe(0);
    expect(wm.waveLocked).toBe(false);
  });

  it("createDraft returns correct structure with null slots", () => {
    const draft = wm.createDraft();
    expect(draft.front.length).toBe(WAVE_CONFIG.slots.front);
    expect(draft.mid.length).toBe(WAVE_CONFIG.slots.mid);
    expect(draft.rear.length).toBe(WAVE_CONFIG.slots.rear);
    expect(draft.front.every((v) => v === null)).toBe(true);
  });

  it("getWaveInterval returns correct interval by elapsed time", () => {
    expect(wm.getWaveInterval(0)).toBe(45);
    expect(wm.getWaveInterval(180)).toBe(35);
    expect(wm.getWaveInterval(420)).toBe(25);
    expect(wm.getWaveInterval(999)).toBe(25);
  });

  it("getStageIndex returns correct stage for elapsed time", () => {
    expect(wm.getStageIndex(0)).toBe(0);
    expect(wm.getStageIndex(100)).toBe(0);
    expect(wm.getStageIndex(180)).toBe(1);
    expect(wm.getStageIndex(300)).toBe(1);
    expect(wm.getStageIndex(420)).toBe(2);
  });

  it("getPhaseLabel returns correct label", () => {
    expect(wm.getPhaseLabel(0)).toBe(PHASE_LABELS[0]);
    expect(wm.getPhaseLabel(200)).toBe(PHASE_LABELS[1]);
    expect(wm.getPhaseLabel(500)).toBe(PHASE_LABELS[2]);
  });

  it("getUnlockedColumns increases with stage", () => {
    const stage0 = wm.getUnlockedColumns(0);
    const stage1 = wm.getUnlockedColumns(1);
    const stage2 = wm.getUnlockedColumns(2);
    expect(stage0).toBe(WAVE_CONFIG.baseUnlockedColumns);
    expect(stage1).toBe(WAVE_CONFIG.baseUnlockedColumns + 1);
    expect(stage2).toBe(WAVE_CONFIG.baseUnlockedColumns + 2);
  });

  it("selectStance changes stance for the side", () => {
    expect(wm.waveStance[SIDE.PLAYER]).toBe("normal");
    wm.selectStance({ id: "aggressive" }, SIDE.PLAYER);
    expect(wm.waveStance[SIDE.PLAYER]).toBe("aggressive");
  });

  it("selectStance rejects invalid stance", () => {
    const result = wm.selectStance({ id: "nonexistent" }, SIDE.PLAYER);
    expect(result).toBe(false);
    expect(wm.waveStance[SIDE.PLAYER]).toBe("normal");
  });

  it("selectStance rejects when game is over", () => {
    scene.isGameOver = true;
    const result = wm.selectStance({ id: "aggressive" }, SIDE.PLAYER);
    expect(result).toBe(false);
  });

  it("getDraft returns correct draft for each side", () => {
    expect(wm.getDraft(SIDE.PLAYER)).toBe(wm.playerDraft);
    expect(wm.getDraft(SIDE.AI)).toBe(wm.aiDraft);
  });

  it("getDraftSlotCount counts non-null slots", () => {
    const draft = wm.playerDraft;
    expect(wm.getDraftSlotCount(draft)).toBe(0);
    draft.front[0] = "guard";
    draft.mid[1] = "archer";
    expect(wm.getDraftSlotCount(draft)).toBe(2);
  });

  it("getFirstAvailableSlot finds first empty slot", () => {
    const draft = wm.playerDraft;
    const slot = wm.getFirstAvailableSlot(draft, 2);
    expect(slot).toEqual({ slot: "front", index: 0 });
  });

  it("getFirstAvailableSlot respects unlocked columns", () => {
    const draft = wm.playerDraft;
    draft.front[0] = "guard";
    draft.front[1] = "guard";
    // With 2 unlocked columns in front row full, should go to mid
    const slot = wm.getFirstAvailableSlot(draft, 2);
    expect(slot).toEqual({ slot: "mid", index: 0 });
  });

  it("removeQueuedUnit removes the unit from the draft", () => {
    wm.playerDraft.front[0] = "guard";
    const result = wm.removeQueuedUnit({ id: "guard", slot: "front", index: 0 }, SIDE.PLAYER);
    expect(result).toBe(true);
    expect(wm.playerDraft.front[0]).toBeNull();
  });

  it("removeQueuedUnit fails on empty slot", () => {
    const result = wm.removeQueuedUnit({ id: "guard", slot: "front", index: 0 }, SIDE.PLAYER);
    expect(result).toBe(false);
  });

  it("moveQueuedUnit swaps two slots", () => {
    wm.playerDraft.front[0] = "guard";
    wm.playerDraft.mid[0] = "archer";
    scene.matchTime = 0;
    const result = wm.moveQueuedUnit({
      from: { row: "front", index: 0 },
      to: { row: "mid", index: 0 }
    }, SIDE.PLAYER);
    expect(result).toBe(true);
    expect(wm.playerDraft.front[0]).toBe("archer");
    expect(wm.playerDraft.mid[0]).toBe("guard");
  });
});
