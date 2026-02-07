import type { UnitTypeConfig, UnitAnimationAsset, UnitAnimationProfile } from "../../types";

export const arbalistConfig: UnitTypeConfig = {
  id: "arbalist",
  name: "Arbalist",
  role: "damage",
  summary: "Long-range shot",
  special: "High damage, slow fire",
  tier: 3,
  stageMin: 2,
  tags: ["damage", "ranged"],
  shopWeight: 0.6,
  hp: 100,
  dmg: 34,
  range: 200,
  speed: 30,
  attackRate: 1.8,
  cost: 7,
  presence: 0.8,
  color: 0x9a6f4f
};

export const arbalistAnimAsset: UnitAnimationAsset = {
  sheets: {
    run: {
      sheetKey: "arbalist_walk_sheet",
      sheetFile: "arbalist/animations/walk/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      startFrame: 0,
      endFrame: 27,
      fps: 12,
      repeat: -1
    },
    attack: {
      sheetKey: "arbalist_attack_sheet",
      sheetFile: "arbalist/animations/melee/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      startFrame: 0,
      endFrame: 31,
      fps: 16,
      repeat: 0
    },
    death: {
      sheetKey: "arbalist_death_sheet",
      sheetFile: "arbalist/animations/death/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      startFrame: 0,
      endFrame: 31,
      fps: 16,
      repeat: 0
    },
    idle: {
      sheetKey: "arbalist_walk_sheet",
      sheetFile: "arbalist/animations/walk/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      frameSequence: [0, 1, 2, 3, 2, 1],
      fps: 8,
      repeat: -1
    },
    hit: {
      sheetKey: "arbalist_attack_sheet",
      sheetFile: "arbalist/animations/melee/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      frameSequence: [0, 1],
      fps: 12,
      repeat: 0
    }
  }
};

export const arbalistAnimProfile: UnitAnimationProfile = {
  textureKey: "arbalist_walk_sheet",
  sizeScale: 3,
  originX: 0.5,
  originY: 0.7,
  actions: {
    idle: { key: "arbalist_idle" },
    run: { key: "arbalist_run" },
    attack: { key: "arbalist_attack" },
    hit: { key: "arbalist_hit" },
    death: { key: "arbalist_death", lock: true }
  },
  fallback: {
    run: ["idle"],
    attack: ["run", "idle"],
    hit: ["attack", "idle"],
    death: ["idle"]
  }
};
