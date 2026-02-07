import { describe, it, expect } from "vitest";
import {
  SIDE,
  CASTLE_VARIANTS,
  CASTLE_CONFIG,
  TURRET_CONFIG,
  ECONOMY_CONFIG,
  WAVE_CONFIG,
  CONTROL_POINT_CONFIG,
  AI_CONFIG,
  PHASE_LABELS,
  createDefaultLayoutProfile
} from "../src/config/GameConfig";

describe("GameConfig", () => {
  it("SIDE has player and ai", () => {
    expect(SIDE.PLAYER).toBe("player");
    expect(SIDE.AI).toBe("ai");
  });

  it("CASTLE_VARIANTS has at least one variant", () => {
    expect(CASTLE_VARIANTS.length).toBeGreaterThan(0);
    for (const variant of CASTLE_VARIANTS) {
      expect(variant.id).toBeTruthy();
      expect(variant.baseKey).toBeTruthy();
      expect(variant.towerKey).toBeTruthy();
    }
  });

  it("CASTLE_CONFIG has valid maxHp", () => {
    expect(CASTLE_CONFIG.maxHp).toBeGreaterThan(0);
  });

  it("TURRET_CONFIG has valid stats", () => {
    expect(TURRET_CONFIG.maxHp).toBeGreaterThan(0);
    expect(TURRET_CONFIG.damage).toBeGreaterThan(0);
    expect(TURRET_CONFIG.range).toBeGreaterThan(0);
    expect(TURRET_CONFIG.attackRate).toBeGreaterThan(0);
  });

  it("ECONOMY_CONFIG has valid values", () => {
    expect(ECONOMY_CONFIG.startingResources).toBeGreaterThan(0);
    expect(ECONOMY_CONFIG.baseIncome).toBeGreaterThan(0);
    expect(ECONOMY_CONFIG.interestRate).toBeGreaterThan(0);
    expect(ECONOMY_CONFIG.interestRate).toBeLessThan(1);
    expect(ECONOMY_CONFIG.interestCap).toBeGreaterThan(0);
  });

  it("WAVE_CONFIG has valid schedule", () => {
    expect(WAVE_CONFIG.schedule.length).toBeGreaterThan(0);
    expect(WAVE_CONFIG.schedule[0].time).toBe(0);
    for (let i = 1; i < WAVE_CONFIG.schedule.length; i++) {
      expect(WAVE_CONFIG.schedule[i].time).toBeGreaterThan(WAVE_CONFIG.schedule[i - 1].time);
    }
  });

  it("WAVE_CONFIG slots are all positive", () => {
    expect(WAVE_CONFIG.slots.front).toBeGreaterThan(0);
    expect(WAVE_CONFIG.slots.mid).toBeGreaterThan(0);
    expect(WAVE_CONFIG.slots.rear).toBeGreaterThan(0);
  });

  it("CONTROL_POINT_CONFIG has valid thresholds", () => {
    expect(CONTROL_POINT_CONFIG.ownershipThreshold).toBeGreaterThan(0);
    expect(CONTROL_POINT_CONFIG.ownershipThreshold).toBeLessThan(1);
    expect(CONTROL_POINT_CONFIG.count).toBeGreaterThan(0);
  });

  it("AI_CONFIG has positive decision interval", () => {
    expect(AI_CONFIG.decisionInterval).toBeGreaterThan(0);
  });

  it("PHASE_LABELS has at least 3 labels", () => {
    expect(PHASE_LABELS.length).toBeGreaterThanOrEqual(3);
  });

  it("createDefaultLayoutProfile returns a valid profile", () => {
    const profile = createDefaultLayoutProfile();
    expect(profile.mirrorMode).toBe(true);
    expect(profile.castle).toBeDefined();
    expect(profile.castle.playerX).toBeGreaterThan(0);
    expect(profile.decks).toBeDefined();
    expect(profile.bridge).toBeDefined();
    expect(profile.turret).toBeDefined();
    expect(profile.units).toBeDefined();
    expect(profile.control).toBeDefined();
  });
});
