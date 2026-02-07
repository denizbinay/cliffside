import { UNIT_TYPES } from "../data/units.js";
import { STANCES } from "../data/stances.js";
import { SIDE, WAVE_CONFIG, PHASE_LABELS } from "../config/GameConfig.js";

export default class WaveManager {
  constructor(scene) {
    this.scene = scene;
    this.waveSupply = WAVE_CONFIG.supply;
    this.waveSize = WAVE_CONFIG.supply;
    this.waveSlots = { ...WAVE_CONFIG.slots };
    this.waveStagger = WAVE_CONFIG.stagger;
    this.waveSchedule = WAVE_CONFIG.schedule;
    this.waveCountdown = this.getWaveInterval(0);
    this.waveLocked = false;
    this.waveNumber = 0;

    this.playerDraft = this.createDraft();
    this.aiDraft = this.createDraft();

    this.waveStance = { [SIDE.PLAYER]: "normal", [SIDE.AI]: "normal" };
  }

  createDraft() {
    return {
      front: Array(this.waveSlots.front).fill(null),
      mid: Array(this.waveSlots.mid).fill(null),
      rear: Array(this.waveSlots.rear).fill(null)
    };
  }

  getWaveInterval(elapsed) {
    let interval = this.waveSchedule[0].interval;
    for (const stage of this.waveSchedule) {
      if (elapsed >= stage.time) interval = stage.interval;
    }
    return interval;
  }

  getStageIndex(elapsed) {
    let stageIndex = 0;
    for (let i = 0; i < this.waveSchedule.length; i += 1) {
      if (elapsed >= this.waveSchedule[i].time) stageIndex = i;
    }
    return stageIndex;
  }

  getPhaseLabel(elapsed) {
    const stageIndex = this.getStageIndex(elapsed);
    return PHASE_LABELS[stageIndex] || `Phase ${stageIndex + 1}`;
  }

  getUnlockedColumns(stageIndex) {
    const maxColumns = Math.max(1, this.waveSlots?.front || 4);
    return Math.max(0, Math.min(maxColumns, WAVE_CONFIG.baseUnlockedColumns + stageIndex));
  }

  selectStance(payload, side) {
    if (this.scene.isGameOver) return false;
    if (this.waveLocked) return false;
    const id = typeof payload === "string" ? payload : payload.id;
    if (!STANCES[id]) return false;
    this.waveStance[side] = id;
    return true;
  }

  getStance(side) {
    const id = this.waveStance[side] || "normal";
    return STANCES[id] || STANCES.normal;
  }

  getDraft(side) {
    return side === SIDE.PLAYER ? this.playerDraft : this.aiDraft;
  }

  getDraftSlotCount(draft) {
    return [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean).length;
  }

  getDraftSlotList(draft, slot) {
    if (slot === "front") return draft.front;
    if (slot === "rear") return draft.rear;
    return draft.mid;
  }

  getFirstAvailableSlot(draft, unlockedColumns) {
    const rows = ["front", "mid", "rear"];
    const maxColumns = Math.max(0, unlockedColumns || 0);
    for (const row of rows) {
      const list = this.getDraftSlotList(draft, row);
      if (!list) continue;
      const limit = Math.min(list.length, maxColumns);
      for (let i = 0; i < limit; i += 1) {
        if (list[i] === null) return { slot: row, index: i };
      }
    }
    return null;
  }

  queueUnit(payload, side, economy, shop, stageIndex) {
    if (this.scene.isGameOver) return false;
    if (this.waveLocked) return false;

    const type = typeof payload === "string" ? payload : payload.id;
    const fromShop = typeof payload === "object" && payload.fromShop === true;
    let slot = typeof payload === "string" ? null : payload.slot || null;
    const index = typeof payload === "string" ? null : payload.index;

    const unitConfig = UNIT_TYPES[type];
    if (!unitConfig) return false;
    const cost = unitConfig.cost;
    const draft = this.getDraft(side);
    const unlockedColumns = this.getUnlockedColumns(stageIndex);
    const requiresShop = side === SIDE.PLAYER || side === SIDE.AI;
    if (requiresShop && !fromShop) return false;
    if (requiresShop && !shop.isUnitAvailable(side, type)) return false;

    if (!slot) {
      const target = this.getFirstAvailableSlot(draft, unlockedColumns);
      if (!target) return false;
      slot = target.slot;
    }
    const slotList = this.getDraftSlotList(draft, slot);
    if (!slotList) return false;
    const unlockedInRow = Math.min(unlockedColumns, slotList.length);
    const filledCount = this.getDraftSlotCount(draft);

    let targetIndex;
    if (filledCount >= this.waveSupply) {
      return false;
    } else if (typeof index === "number") {
      if (index < 0 || index >= slotList.length) return false;
      if (index >= unlockedInRow) return false;
      if (slotList[index] !== null) return false;
      targetIndex = index;
    } else {
      let openIndex = -1;
      for (let i = 0; i < unlockedInRow; i += 1) {
        if (slotList[i] === null) {
          openIndex = i;
          break;
        }
      }
      if (openIndex === -1) return false;
      targetIndex = openIndex;
    }

    if (!economy.canAfford(side, cost)) return false;
    if (requiresShop && !shop.claimOffer(side, type)) return false;

    economy.spend(side, cost);
    slotList[targetIndex] = type;
    if (requiresShop && shop.isSoldOut(side)) {
      shop.rollOffers(side, stageIndex, false);
    }

    economy.emitResourceUpdate();
    return true;
  }

  removeQueuedUnit(payload, side) {
    if (this.scene.isGameOver) return false;
    if (this.waveLocked) return false;

    const type = typeof payload === "string" ? payload : payload.id;
    const slot = typeof payload === "string" ? null : payload.slot || null;
    const index = typeof payload === "string" ? null : payload.index;
    if (!UNIT_TYPES[type]) return false;
    const draft = this.getDraft(side);

    const removeFrom = (list) => {
      const slotIndex = list.lastIndexOf(type);
      if (slotIndex === -1) return false;
      list[slotIndex] = null;
      return true;
    };

    let removed;
    if (typeof index === "number" && slot) {
      const list = this.getDraftSlotList(draft, slot);
      if (!list || index < 0 || index >= list.length) return false;
      if (!list[index]) return false;
      list[index] = null;
      removed = true;
    } else if (slot === "front") removed = removeFrom(draft.front);
    else if (slot === "rear") removed = removeFrom(draft.rear);
    else if (slot === "mid") removed = removeFrom(draft.mid);
    else {
      removed = removeFrom(draft.rear) || removeFrom(draft.mid) || removeFrom(draft.front);
    }
    return removed;
  }

  moveQueuedUnit(payload, side) {
    if (this.scene.isGameOver) return false;
    if (this.waveLocked) return false;
    if (!payload?.from || !payload?.to) return false;

    const draft = this.getDraft(side);
    const stageIndex = this.getStageIndex(this.scene.matchTime || 0);
    const unlockedColumns = this.getUnlockedColumns(stageIndex);
    const fromRow = payload.from.row;
    const toRow = payload.to.row;
    const fromIndex = Number(payload.from.index);
    const toIndex = Number(payload.to.index);

    const fromList = this.getDraftSlotList(draft, fromRow);
    const toList = this.getDraftSlotList(draft, toRow);
    if (!fromList || !toList) return false;
    if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return false;
    if (fromIndex < 0 || fromIndex >= fromList.length) return false;
    if (toIndex < 0 || toIndex >= toList.length) return false;
    if (toIndex >= Math.min(unlockedColumns, toList.length)) return false;

    const fromId = fromList[fromIndex];
    if (!fromId) return false;
    const toId = toList[toIndex];

    fromList[fromIndex] = toId || null;
    toList[toIndex] = fromId;
    return true;
  }

  sendWave(side, spawnCallback) {
    if (this.scene.isGameOver) return;
    const draft = this.getDraft(side);
    const waveUnits = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    if (waveUnits.length === 0) return;

    const count = Math.min(waveUnits.length, this.waveSupply);
    const ordered = waveUnits.slice(0, count);
    const spread = 12;
    const roleCounts = ordered.reduce((acc, id) => {
      const role = UNIT_TYPES[id]?.role || "unknown";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});
    const roleMult = {};
    Object.keys(roleCounts).forEach((role) => {
      const extra = Math.max(0, roleCounts[role] - WAVE_CONFIG.roleDiminishingThreshold);
      roleMult[role] = Math.max(WAVE_CONFIG.roleDiminishingFloor, 1 - extra * WAVE_CONFIG.roleDiminishingStep);
    });

    const stance = this.getStance(side);
    const stanceMods = stance.modifiers || {};
    const stancePresence = stanceMods.presenceMult || 1;

    draft.front = Array(this.waveSlots.front).fill(null);
    draft.mid = Array(this.waveSlots.mid).fill(null);
    draft.rear = Array(this.waveSlots.rear).fill(null);

    ordered.forEach((type, index) => {
      const offset = (index - (count - 1) / 2) * spread;
      const delay = index * this.waveStagger * 1000;
      const presenceMult = (roleMult[UNIT_TYPES[type]?.role || "unknown"] || 1) * stancePresence;
      this.scene.time.delayedCall(delay, () => {
        spawnCallback(type, side, { payCost: false, offset, presenceMult, modifiers: stanceMods });
      });
    });

    this.scene.events.emit("log", { type: "wave", side, count });
  }
}
