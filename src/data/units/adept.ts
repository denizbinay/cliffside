import type { UnitTypeConfig, UnitAnimationAsset, UnitAnimationProfile } from "../../types";

export const adeptConfig: UnitTypeConfig = {
  id: "adept",
  name: "Adept",
  role: "support",
  summary: "Light healer",
  special: "Quick, small heals",
  tier: 1,
  stageMin: 0,
  tags: ["support", "healer"],
  shopWeight: 1.2,
  hp: 85,
  dmg: 0,
  range: 110,
  speed: 20,
  attackRate: 0.9,
  cost: 3,
  presence: 0.6,
  color: 0x7fb59a,
  healAmount: 14
};

export const adeptAnimAsset: UnitAnimationAsset = {
  sheets: {
    run: {
      sheetKey: "adept_walk_sheet",
      sheetFile: "adept/animations/walk/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      startFrame: 0,
      endFrame: 27,
      fps: 12,
      repeat: -1
    },
    magic: {
      sheetKey: "adept_magic_sheet",
      sheetFile: "adept/animations/cast/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      startFrame: 0,
      endFrame: 28,
      fps: 16,
      repeat: 0
    },
    death: {
      sheetKey: "adept_death_sheet",
      sheetFile: "adept/animations/death/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      startFrame: 0,
      endFrame: 28,
      fps: 16,
      repeat: 0
    },
    idle: {
      sheetKey: "adept_walk_sheet",
      sheetFile: "adept/animations/walk/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      frameSequence: [0, 1, 2, 3, 2, 1],
      fps: 16,
      repeat: -1
    },
    hit: {
      sheetKey: "adept_magic_sheet",
      sheetFile: "adept/animations/cast/spritesheet.png",
      frameWidth: 768,
      frameHeight: 448,
      frameSequence: [3, 4, 5],
      fps: 16,
      repeat: 0
    }
  }
};

export const adeptAnimProfile: UnitAnimationProfile = {
  textureKey: "adept_walk_sheet",
  sizeScale: 4,
  widthScale: 1.7142857143,
  healthBarOffsetY: -35,
  originX: 0.5,
  originY: 0.64,
  actions: {
    idle: { key: "adept_idle" },
    run: { key: "adept_run" },
    attack: { key: "adept_magic" },
    hit: { key: "adept_hit" },
    death: { key: "adept_death", lock: true }
  },
  fallback: {
    run: ["idle"],
    attack: ["run", "idle"],
    hit: ["attack", "idle"],
    death: ["idle"]
  }
};
