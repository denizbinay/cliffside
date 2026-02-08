import type { UnitAnimationAsset, UnitAnimationProfile } from "../types";

export const UNIT_ANIMATION_ASSETS: Record<string, UnitAnimationAsset> = {};

export const UNIT_ANIMATION_PROFILES: Record<string, UnitAnimationProfile> = {};

const ALL_UNIT_IDS = [
  "guard",
  "sentinel",
  "bulwark",
  "bastion",
  "pikeman",
  "vanguard",
  "archer",
  "skirmisher",
  "slinger",
  "ranger",
  "ballista",
  "cleric",
  "minstrel",
  "warder",
  "oracle",
  "saboteur",
  "hammerer",
  "lancer",
  "adept",
  "arbalist"
];

ALL_UNIT_IDS.forEach((id) => {
  if (UNIT_ANIMATION_ASSETS[id]) return;

  // Asset Definition
  UNIT_ANIMATION_ASSETS[id] = {
    preprocess: "bbox-aligned-rgba",
    sheets: {
      walk: {
        sourceKey: `${id}_walk_source`,
        sourceFile: `${id}/animations/walk/spritesheet.png`,
        outputKey: `${id}_walk_sheet`,
        boxesKey: `${id}_walk_boxes`,
        boxesFile: `${id}/animations/walk/collision-bounding-boxes.json`,
        fps: 12,
        repeat: -1
      }
    }
  };

  // Profile Definition
  UNIT_ANIMATION_PROFILES[id] = {
    textureKey: `${id}_walk_sheet`,
    sizeScale: 4,
    originX: 0.5,
    originY: 0.7,
    actions: {
      idle: { key: `${id}_walk` },
      run: { key: `${id}_walk` }
    },
    fallback: {
      idle: ["run"],
      run: ["idle"],
      attack: ["run", "idle"],
      hit: ["run", "idle"],
      death: ["run", "idle"]
    }
  };
});
