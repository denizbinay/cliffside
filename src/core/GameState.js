/**
 * GameState - Central state store for all game data.
 * This is a pure data container with no Phaser dependencies.
 * All game systems read/write state through this object.
 */

import { SIDE, ECONOMY_CONFIG, WAVE_CONFIG, CASTLE_CONFIG, TURRET_CONFIG } from "../config/GameConfig.js";

let entityIdCounter = 0;

function generateEntityId() {
  entityIdCounter += 1;
  return `entity_${entityIdCounter}`;
}

export function resetEntityIdCounter() {
  entityIdCounter = 0;
}

export default class GameState {
  constructor() {
    // --- Entity Collections ---
    this.units = [];         // Array of UnitData
    this.castles = {};       // { [SIDE.PLAYER]: CastleData, [SIDE.AI]: CastleData }
    this.turrets = {};       // { [SIDE.PLAYER]: TurretData[], [SIDE.AI]: TurretData[] }
    this.controlPoints = []; // Array of ControlPointData

    // --- Resources ---
    this.resources = {
      [SIDE.PLAYER]: ECONOMY_CONFIG.startingResources,
      [SIDE.AI]: ECONOMY_CONFIG.startingResources
    };

    // --- Wave/Match State ---
    this.waveNumber = 0;
    this.waveCountdown = 0;
    this.waveLocked = false;
    this.matchTime = 0;

    // --- Drafts (units queued for next wave) ---
    this.drafts = {
      [SIDE.PLAYER]: this.createEmptyDraft(),
      [SIDE.AI]: this.createEmptyDraft()
    };

    // --- Stances ---
    this.stances = {
      [SIDE.PLAYER]: "normal",
      [SIDE.AI]: "normal"
    };

    // --- Ability Cooldowns ---
    this.abilityCooldowns = {
      healWave: 0,
      pulse: 0
    };

    // --- Zone Control ---
    this.zoneOwner = "neutral";

    // --- Game Flow ---
    this.isGameOver = false;
    this.winner = null;

    // --- Economy Accumulator ---
    this.resourceAccumulator = 0;
  }

  createEmptyDraft() {
    return {
      front: Array(WAVE_CONFIG.slots.front).fill(null),
      mid: Array(WAVE_CONFIG.slots.mid).fill(null),
      rear: Array(WAVE_CONFIG.slots.rear).fill(null)
    };
  }

  // --- Unit CRUD ---

  addUnit(unitData) {
    if (!unitData.id) {
      unitData.id = generateEntityId();
    }
    this.units.push(unitData);
    return unitData;
  }

  removeUnit(unitId) {
    const index = this.units.findIndex((u) => u.id === unitId);
    if (index !== -1) {
      const removed = this.units.splice(index, 1)[0];
      return removed;
    }
    return null;
  }

  getUnit(unitId) {
    return this.units.find((u) => u.id === unitId) || null;
  }

  getUnits(side = null) {
    if (side === null) return this.units;
    return this.units.filter((u) => u.side === side);
  }

  getAliveUnits(side = null) {
    return this.getUnits(side).filter((u) => u.hp > 0);
  }

  // --- Castle CRUD ---

  setCastle(side, castleData) {
    if (!castleData.id) {
      castleData.id = generateEntityId();
    }
    this.castles[side] = castleData;
    return castleData;
  }

  getCastle(side) {
    return this.castles[side] || null;
  }

  // --- Turret CRUD ---

  addTurret(side, turretData) {
    if (!turretData.id) {
      turretData.id = generateEntityId();
    }
    if (!this.turrets[side]) {
      this.turrets[side] = [];
    }
    this.turrets[side].push(turretData);
    return turretData;
  }

  getTurrets(side) {
    return this.turrets[side] || [];
  }

  getAliveTurrets(side) {
    return this.getTurrets(side).filter((t) => t.hp > 0);
  }

  // --- Resource Management ---

  getResources(side) {
    return this.resources[side] || 0;
  }

  setResources(side, amount) {
    this.resources[side] = amount;
  }

  addResources(side, amount) {
    this.resources[side] = (this.resources[side] || 0) + amount;
  }

  spendResources(side, amount) {
    if (this.resources[side] < amount) return false;
    this.resources[side] -= amount;
    return true;
  }

  canAfford(side, amount) {
    return this.resources[side] >= amount;
  }

  // --- Draft Management ---

  getDraft(side) {
    return this.drafts[side];
  }

  setDraft(side, draft) {
    this.drafts[side] = draft;
  }

  clearDraft(side) {
    this.drafts[side] = this.createEmptyDraft();
  }

  // --- Stance Management ---

  getStance(side) {
    return this.stances[side] || "normal";
  }

  setStance(side, stanceId) {
    this.stances[side] = stanceId;
  }

  // --- Control Points ---

  setControlPoints(points) {
    this.controlPoints = points;
  }

  getControlPoints() {
    return this.controlPoints;
  }

  getControlPointsByOwner(owner) {
    return this.controlPoints.filter((p) => p.owner === owner);
  }

  // --- Game Flow ---

  endGame(winner) {
    this.isGameOver = true;
    this.winner = winner;
  }

  reset() {
    resetEntityIdCounter();
    this.units = [];
    this.castles = {};
    this.turrets = { [SIDE.PLAYER]: [], [SIDE.AI]: [] };
    this.controlPoints = [];
    this.resources = {
      [SIDE.PLAYER]: ECONOMY_CONFIG.startingResources,
      [SIDE.AI]: ECONOMY_CONFIG.startingResources
    };
    this.waveNumber = 0;
    this.waveCountdown = 0;
    this.waveLocked = false;
    this.matchTime = 0;
    this.drafts = {
      [SIDE.PLAYER]: this.createEmptyDraft(),
      [SIDE.AI]: this.createEmptyDraft()
    };
    this.stances = {
      [SIDE.PLAYER]: "normal",
      [SIDE.AI]: "normal"
    };
    this.abilityCooldowns = { healWave: 0, pulse: 0 };
    this.zoneOwner = "neutral";
    this.isGameOver = false;
    this.winner = null;
    this.resourceAccumulator = 0;
  }

  // --- Serialization (for save/load or debugging) ---

  toJSON() {
    return {
      units: this.units,
      castles: this.castles,
      turrets: this.turrets,
      controlPoints: this.controlPoints,
      resources: this.resources,
      waveNumber: this.waveNumber,
      waveCountdown: this.waveCountdown,
      waveLocked: this.waveLocked,
      matchTime: this.matchTime,
      drafts: this.drafts,
      stances: this.stances,
      abilityCooldowns: this.abilityCooldowns,
      zoneOwner: this.zoneOwner,
      isGameOver: this.isGameOver,
      winner: this.winner
    };
  }

  fromJSON(data) {
    if (data.units) this.units = data.units;
    if (data.castles) this.castles = data.castles;
    if (data.turrets) this.turrets = data.turrets;
    if (data.controlPoints) this.controlPoints = data.controlPoints;
    if (data.resources) this.resources = data.resources;
    if (typeof data.waveNumber === "number") this.waveNumber = data.waveNumber;
    if (typeof data.waveCountdown === "number") this.waveCountdown = data.waveCountdown;
    if (typeof data.waveLocked === "boolean") this.waveLocked = data.waveLocked;
    if (typeof data.matchTime === "number") this.matchTime = data.matchTime;
    if (data.drafts) this.drafts = data.drafts;
    if (data.stances) this.stances = data.stances;
    if (data.abilityCooldowns) this.abilityCooldowns = data.abilityCooldowns;
    if (data.zoneOwner) this.zoneOwner = data.zoneOwner;
    if (typeof data.isGameOver === "boolean") this.isGameOver = data.isGameOver;
    if (data.winner !== undefined) this.winner = data.winner;
  }
}
