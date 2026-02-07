import { describe, it, expect, beforeEach } from "vitest";
import GameState, { resetEntityIdCounter } from "../src/core/GameState.js";
import { SIDE, ECONOMY_CONFIG, WAVE_CONFIG } from "../src/config/GameConfig.js";

describe("GameState", () => {
  let state;

  beforeEach(() => {
    resetEntityIdCounter();
    state = new GameState();
  });

  describe("initialization", () => {
    it("initializes with empty unit array", () => {
      expect(state.units).toEqual([]);
    });

    it("initializes with empty castles object", () => {
      expect(state.castles).toEqual({});
    });

    it("initializes with starting resources for both sides", () => {
      expect(state.resources[SIDE.PLAYER]).toBe(ECONOMY_CONFIG.startingResources);
      expect(state.resources[SIDE.AI]).toBe(ECONOMY_CONFIG.startingResources);
    });

    it("initializes with wave number 0", () => {
      expect(state.waveNumber).toBe(0);
    });

    it("initializes with isGameOver false", () => {
      expect(state.isGameOver).toBe(false);
    });

    it("initializes with empty drafts for both sides", () => {
      expect(state.drafts[SIDE.PLAYER]).toBeDefined();
      expect(state.drafts[SIDE.AI]).toBeDefined();
      expect(state.drafts[SIDE.PLAYER].front.length).toBe(WAVE_CONFIG.slots.front);
    });
  });

  describe("unit management", () => {
    it("addUnit adds a unit and assigns an id", () => {
      const unit = { type: "knight", side: SIDE.PLAYER, hp: 100 };
      const added = state.addUnit(unit);
      
      expect(added.id).toBeDefined();
      expect(state.units.length).toBe(1);
      expect(state.units[0]).toBe(added);
    });

    it("addUnit preserves existing id if provided", () => {
      const unit = { id: "custom_id", type: "knight", side: SIDE.PLAYER };
      const added = state.addUnit(unit);
      
      expect(added.id).toBe("custom_id");
    });

    it("getUnit returns the correct unit by id", () => {
      const unit = state.addUnit({ type: "knight", side: SIDE.PLAYER });
      
      expect(state.getUnit(unit.id)).toBe(unit);
    });

    it("getUnit returns null for non-existent id", () => {
      expect(state.getUnit("nonexistent")).toBeNull();
    });

    it("getUnits returns all units when no side specified", () => {
      state.addUnit({ type: "knight", side: SIDE.PLAYER });
      state.addUnit({ type: "archer", side: SIDE.AI });
      
      expect(state.getUnits().length).toBe(2);
    });

    it("getUnits filters by side", () => {
      state.addUnit({ type: "knight", side: SIDE.PLAYER });
      state.addUnit({ type: "archer", side: SIDE.AI });
      state.addUnit({ type: "mage", side: SIDE.PLAYER });
      
      expect(state.getUnits(SIDE.PLAYER).length).toBe(2);
      expect(state.getUnits(SIDE.AI).length).toBe(1);
    });

    it("getAliveUnits filters by hp > 0", () => {
      state.addUnit({ type: "knight", side: SIDE.PLAYER, hp: 100 });
      state.addUnit({ type: "archer", side: SIDE.PLAYER, hp: 0 });
      
      expect(state.getAliveUnits(SIDE.PLAYER).length).toBe(1);
    });

    it("removeUnit removes and returns the unit", () => {
      const unit = state.addUnit({ type: "knight", side: SIDE.PLAYER });
      const removed = state.removeUnit(unit.id);
      
      expect(removed).toBe(unit);
      expect(state.units.length).toBe(0);
    });

    it("removeUnit returns null for non-existent id", () => {
      expect(state.removeUnit("nonexistent")).toBeNull();
    });
  });

  describe("castle management", () => {
    it("setCastle sets castle for a side", () => {
      const castle = { hp: 1000, maxHp: 1000 };
      const added = state.setCastle(SIDE.PLAYER, castle);
      
      expect(added.id).toBeDefined();
      expect(state.getCastle(SIDE.PLAYER)).toBe(added);
    });

    it("getCastle returns null for unset side", () => {
      expect(state.getCastle(SIDE.PLAYER)).toBeNull();
    });
  });

  describe("turret management", () => {
    it("addTurret adds turret to the correct side", () => {
      const turret = { hp: 200, maxHp: 200 };
      const added = state.addTurret(SIDE.PLAYER, turret);
      
      expect(added.id).toBeDefined();
      expect(state.getTurrets(SIDE.PLAYER).length).toBe(1);
    });

    it("getAliveTurrets filters by hp > 0", () => {
      state.addTurret(SIDE.PLAYER, { hp: 200, maxHp: 200 });
      state.addTurret(SIDE.PLAYER, { hp: 0, maxHp: 200 });
      
      expect(state.getAliveTurrets(SIDE.PLAYER).length).toBe(1);
    });
  });

  describe("resource management", () => {
    it("getResources returns correct value", () => {
      expect(state.getResources(SIDE.PLAYER)).toBe(ECONOMY_CONFIG.startingResources);
    });

    it("setResources updates the value", () => {
      state.setResources(SIDE.PLAYER, 50);
      expect(state.getResources(SIDE.PLAYER)).toBe(50);
    });

    it("addResources increases the value", () => {
      const before = state.getResources(SIDE.PLAYER);
      state.addResources(SIDE.PLAYER, 10);
      expect(state.getResources(SIDE.PLAYER)).toBe(before + 10);
    });

    it("spendResources deducts when affordable", () => {
      state.setResources(SIDE.PLAYER, 100);
      const result = state.spendResources(SIDE.PLAYER, 30);
      
      expect(result).toBe(true);
      expect(state.getResources(SIDE.PLAYER)).toBe(70);
    });

    it("spendResources fails when not affordable", () => {
      state.setResources(SIDE.PLAYER, 10);
      const result = state.spendResources(SIDE.PLAYER, 30);
      
      expect(result).toBe(false);
      expect(state.getResources(SIDE.PLAYER)).toBe(10);
    });

    it("canAfford checks correctly", () => {
      state.setResources(SIDE.PLAYER, 50);
      
      expect(state.canAfford(SIDE.PLAYER, 50)).toBe(true);
      expect(state.canAfford(SIDE.PLAYER, 51)).toBe(false);
    });
  });

  describe("draft management", () => {
    it("getDraft returns the draft for a side", () => {
      const draft = state.getDraft(SIDE.PLAYER);
      expect(draft.front).toBeDefined();
      expect(draft.mid).toBeDefined();
      expect(draft.rear).toBeDefined();
    });

    it("setDraft updates the draft", () => {
      const newDraft = { front: ["knight"], mid: [], rear: [] };
      state.setDraft(SIDE.PLAYER, newDraft);
      expect(state.getDraft(SIDE.PLAYER)).toBe(newDraft);
    });

    it("clearDraft resets to empty draft", () => {
      state.setDraft(SIDE.PLAYER, { front: ["knight"], mid: [], rear: [] });
      state.clearDraft(SIDE.PLAYER);
      
      const draft = state.getDraft(SIDE.PLAYER);
      expect(draft.front.every((slot) => slot === null)).toBe(true);
    });
  });

  describe("stance management", () => {
    it("getStance returns default stance", () => {
      expect(state.getStance(SIDE.PLAYER)).toBe("normal");
    });

    it("setStance updates the stance", () => {
      state.setStance(SIDE.PLAYER, "aggressive");
      expect(state.getStance(SIDE.PLAYER)).toBe("aggressive");
    });
  });

  describe("game flow", () => {
    it("endGame sets isGameOver and winner", () => {
      state.endGame(SIDE.PLAYER);
      
      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe(SIDE.PLAYER);
    });

    it("reset clears all state", () => {
      state.addUnit({ type: "knight", side: SIDE.PLAYER });
      state.setResources(SIDE.PLAYER, 999);
      state.waveNumber = 5;
      state.endGame(SIDE.AI);
      
      state.reset();
      
      expect(state.units.length).toBe(0);
      expect(state.getResources(SIDE.PLAYER)).toBe(ECONOMY_CONFIG.startingResources);
      expect(state.waveNumber).toBe(0);
      expect(state.isGameOver).toBe(false);
      expect(state.winner).toBeNull();
    });
  });

  describe("serialization", () => {
    it("toJSON captures all state", () => {
      state.waveNumber = 3;
      state.matchTime = 120;
      state.addUnit({ type: "knight", side: SIDE.PLAYER, hp: 100 });
      
      const json = state.toJSON();
      
      expect(json.waveNumber).toBe(3);
      expect(json.matchTime).toBe(120);
      expect(json.units.length).toBe(1);
    });

    it("fromJSON restores state", () => {
      const data = {
        waveNumber: 5,
        matchTime: 200,
        isGameOver: true,
        winner: SIDE.AI
      };
      
      state.fromJSON(data);
      
      expect(state.waveNumber).toBe(5);
      expect(state.matchTime).toBe(200);
      expect(state.isGameOver).toBe(true);
      expect(state.winner).toBe(SIDE.AI);
    });
  });
});
