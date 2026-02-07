export const UNIT_ANIMATION_ASSETS = {
  breaker: {
    preprocess: "keyed-strip",
    sheets: {
      idle: {
        sourceKey: "breaker_idle_strip",
        sourceFile: "breaker-idle-sheet.png",
        outputKey: "breaker_idle_sheet",
        fps: 8,
        repeat: -1
      },
      run: {
        sourceKey: "breaker_walk_strip",
        sourceFile: "breaker-walk-sheet.png",
        outputKey: "breaker_walk_sheet",
        fps: 16,
        repeat: -1
      },
      attack: {
        sourceKey: "breaker_attack_strip",
        sourceFile: "breaker-attack-sheet.png",
        outputKey: "breaker_attack_sheet",
        fps: 14,
        repeat: 0
      },
      hit: {
        sourceKey: "breaker_hit_strip",
        sourceFile: "breaker-hit-sheet.png",
        outputKey: "breaker_hit_sheet",
        fps: 12,
        repeat: 0
      },
      death: {
        sourceKey: "breaker_death_strip",
        sourceFile: "breaker-death-sheet.png",
        outputKey: "breaker_death_sheet",
        fps: 10,
        repeat: 0
      }
    }
  },
  adept: {
    preprocess: "atlas",
    sheets: {
      run: {
        sheetKey: "adept_walk_sheet",
        sheetFile: "adept-walk-sheet.png",
        frameWidth: 768,
        frameHeight: 448,
        startFrame: 0,
        endFrame: 27,
        fps: 12,
        repeat: -1
      },
      attack: {
        sheetKey: "adept_attack_sheet",
        sheetFile: "adept-attack-sheet.png",
        frameWidth: 768,
        frameHeight: 448,
        startFrame: 0,
        endFrame: 28,
        fps: 16,
        repeat: 0
      },
      death: {
        sheetKey: "adept_death_sheet",
        sheetFile: "adept-death-sheet.png",
        frameWidth: 768,
        frameHeight: 448,
        startFrame: 0,
        endFrame: 28,
        fps: 16,
        repeat: 0
      },
      idle: {
        sheetKey: "adept_walk_sheet",
        sheetFile: "adept-walk-sheet.png",
        frameWidth: 768,
        frameHeight: 448,
        frameSequence: [0, 1, 2, 3, 2, 1],
        fps: 16,
        repeat: -1
      },
      hit: {
        sheetKey: "adept_attack_sheet",
        sheetFile: "adept-attack-sheet.png",
        frameWidth: 768,
        frameHeight: 448,
        frameSequence: [3, 4, 5],
        fps: 16,
        repeat: 0
      }
    }
  }
};

export const UNIT_ANIMATION_PROFILES = {
  breaker: {
    textureKey: "breaker_idle_sheet",
    sizeScale: 2.05,
    originX: 0.5,
    originY: 0.7,
    actions: {
      idle: { key: "breaker_idle" },
      run: { key: "breaker_run" },
      attack: { key: "breaker_attack" },
      hit: { key: "breaker_hit" },
      death: { key: "breaker_death", lock: true }
    },
    fallback: {
      run: ["idle"],
      attack: ["run", "idle"],
      hit: ["attack", "idle"],
      death: ["idle"]
    }
  },
  adept: {
    textureKey: "adept_walk_sheet",
    sizeScale: 4,
    widthScale: 1.7142857143,
    healthBarOffsetY: -35,
    originX: 0.5,
    originY: 0.64,
    actions: {
      idle: { key: "adept_idle" },
      run: { key: "adept_run" },
      attack: { key: "adept_attack" },
      hit: { key: "adept_hit" },
      death: { key: "adept_death", lock: true }
    },
    fallback: {
      run: ["idle"],
      attack: ["run", "idle"],
      hit: ["attack", "idle"],
      death: ["idle"]
    }
  }
};
