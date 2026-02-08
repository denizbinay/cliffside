import Phaser from "phaser";
import { UNIT_ANIMATION_ASSETS } from "../data/unitAnimationProfiles";
import type { AnimationSheetDef, KeyedStripSheetDef, SpritesheetDef, AtlasSheetDef } from "../types";

function isKeyedStrip(def: AnimationSheetDef): def is KeyedStripSheetDef {
  return "sourceKey" in def && "outputKey" in def;
}

function isSpritesheet(def: AnimationSheetDef): def is SpritesheetDef {
  return "sheetKey" in def && "frameWidth" in def;
}

function isAtlas(def: AnimationSheetDef): def is AtlasSheetDef {
  return "atlasKey" in def;
}

interface FrameConfig {
  frameWidth: number;
  frameHeight: number;
  margin: number;
  spacing: number;
  startFrame: number;
  endFrame: number;
}

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  preload(): void {
    // Environment
    this.load.setPath("assets/environment/");
    this.load.image("bg_sky", "bg_sky_mountains.png");
    this.load.image("bg_mid", "bg_mid_hills.png");
    this.load.image("bg_front", "bg_foreground_cliffs.png");
    this.load.image("platform_stone", "platform_stone.png");
    this.load.image("bridge_plank", "bridge_plank_segment.png");
    this.load.image("bridge_rope", "bridge_rope_texture.png");
    this.load.image("bridge_pillar", "bridge_pillar.png");

    // Structures
    this.load.setPath("assets/structures/");
    this.load.image("castle_base_player", "castle_player_base.png");
    this.load.image("castle_base_ai", "castle_ai_base.png");
    this.load.image("castle_tower", "castle_tower_addon.png");
    this.load.image("castle_twin_base_v1", "castle_twin_base_v1.png");
    this.load.image("castle_twin_tower_v1", "castle_twin_tower_v1.png");
    this.load.image("castle_twin_base_v2", "castle_twin_base_v2.png");
    this.load.image("castle_twin_tower_v2", "castle_twin_tower_v2.png");
    this.load.image("castle_twin_base_v3", "castle_twin_base_v3.png");
    this.load.image("castle_twin_tower_v3", "castle_twin_tower_v3.png");
    this.load.spritesheet("flag_anim", "flag_animated_sheet.png", {
      frameWidth: 48,
      frameHeight: 64
    });
    this.load.image("turret_base", "turret_base_stone.png");
    this.load.image("turret_head", "turret_head_bow.png");
    this.load.image("turret_head_raw", "turret_head_bow_raw.jpg");

    // UI / Markers
    this.load.setPath("assets/ui/");
    this.load.image("control_rune", "control_point_rune.png");
    this.load.image("control_glow", "control_point_glow.png");

    // Units
    this.load.setPath("assets/units/");
    const loadedImages = new Set<string>();
    const loadedJson = new Set<string>();
    const loadedAtlases = new Set<string>();
    const loadedSheets = new Set<string>();
    Object.values(UNIT_ANIMATION_ASSETS).forEach((unitDef) => {
      Object.values(unitDef.sheets || {}).forEach((sheetDef) => {
        if (isSpritesheet(sheetDef) && !loadedSheets.has(sheetDef.sheetKey)) {
          this.load.spritesheet(sheetDef.sheetKey, sheetDef.sheetFile, {
            frameWidth: sheetDef.frameWidth,
            frameHeight: sheetDef.frameHeight
          });
          loadedSheets.add(sheetDef.sheetKey);
          return;
        }

        if (isAtlas(sheetDef) && !loadedAtlases.has(sheetDef.atlasKey)) {
          this.load.atlas(sheetDef.atlasKey, sheetDef.atlasTextureFile, sheetDef.atlasDataFile);
          loadedAtlases.add(sheetDef.atlasKey);
          return;
        }

        if (isKeyedStrip(sheetDef)) {
          if (sheetDef.sourceKey && sheetDef.sourceFile && !loadedImages.has(sheetDef.sourceKey)) {
            this.load.image(sheetDef.sourceKey, sheetDef.sourceFile);
            loadedImages.add(sheetDef.sourceKey);
          }
          if (sheetDef.boxesKey && sheetDef.boxesFile && !loadedJson.has(sheetDef.boxesKey)) {
            this.load.json(sheetDef.boxesKey, sheetDef.boxesFile);
            loadedJson.add(sheetDef.boxesKey);
          }
        }
      });
    });
  }

  create(): void {
    this.createTurretHeadKeyedTexture();

    // Create minimal placeholder texture for missing assets
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("pixel", 2, 2);
    g.destroy();

    // Create animations
    this.anims.create({
      key: "flag_wave",
      frames: this.anims.generateFrameNumbers("flag_anim", { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1
    });

    this.createUnitAnimationSheets();
    this.createUnitAnimations();

    const isDevMode = new URLSearchParams(window.location.search).has("dev");
    this.scene.start(isDevMode ? "Game" : "Title");
  }

  createTurretHeadKeyedTexture(): void {
    if (!this.textures.exists("turret_head_raw")) return;
    const sourceImage = this.textures.get("turret_head_raw").getSourceImage() as HTMLImageElement;
    if (!sourceImage?.width || !sourceImage?.height) return;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const keyed = this.textures.createCanvas("turret_head_keyed", width, height);
    if (!keyed) return;

    const ctx = keyed.context;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sourceImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height - 1) * width + (width - 1)) * 4];
    let keyR = 0;
    let keyG = 0;
    let keyB = 0;
    for (const idx of corners) {
      keyR += data[idx];
      keyG += data[idx + 1];
      keyB += data[idx + 2];
    }
    keyR /= corners.length;
    keyG /= corners.length;
    keyB /= corners.length;

    const hardThreshold = 76;
    const softThreshold = 128;
    const greenExcessCutoff = 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - keyR;
      const dg = g - keyG;
      const db = b - keyB;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      const greenExcess = g - Math.max(r, b);

      if (distance <= hardThreshold && greenExcess > greenExcessCutoff) {
        data[i + 3] = 0;
        continue;
      }

      if (distance < softThreshold && greenExcess > 0) {
        const keep = Phaser.Math.Clamp((distance - hardThreshold) / (softThreshold - hardThreshold), 0, 1);
        data[i + 3] = Math.min(data[i + 3], Math.round(255 * keep));
        const edgeStrength = 1 - keep;
        if (g > r && g > b) {
          const targetG = Math.max(r, b) + (g - Math.max(r, b)) * (1 - edgeStrength * 0.9);
          data[i + 1] = Math.round(targetG);
        }
      } else if (greenExcess > 0 && data[i + 3] > 0) {
        data[i + 1] = Math.round(g - greenExcess * 0.35);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    keyed.refresh();
  }

  createUnitAnimations(): void {
    Object.entries(UNIT_ANIMATION_ASSETS).forEach(([unitId, unitDef]) => {
      Object.entries(unitDef.sheets || {}).forEach(([action, sheetDef]) => {
        const textureKey = isKeyedStrip(sheetDef)
          ? sheetDef.outputKey
          : isSpritesheet(sheetDef)
            ? sheetDef.sheetKey
            : isAtlas(sheetDef)
              ? sheetDef.atlasKey
              : null;
        if (!textureKey || !this.textures.exists(textureKey)) return;
        const key = `${unitId}_${action}`;
        if (this.anims.exists(key)) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sheetAny = sheetDef as any;
        const hasFrameSequence =
          (isSpritesheet(sheetDef) || isKeyedStrip(sheetDef)) && Array.isArray(sheetAny.frameSequence);
        const frames = hasFrameSequence
          ? sheetAny.frameSequence!.map((frame: number) => ({
              key: textureKey,
              frame: isAtlas(sheetDef) ? String(frame) : frame
            }))
          : isAtlas(sheetDef)
            ? this.anims.generateFrameNames(textureKey, {
                start: sheetDef.startFrame ?? 0,
                end: sheetDef.endFrame ?? this.getSpriteSheetFrameCount(textureKey) - 1,
                prefix: sheetDef.framePrefix ?? "",
                suffix: sheetDef.frameSuffix ?? ""
              })
            : this.anims.generateFrameNumbers(textureKey, {
                start:
                  (isSpritesheet(sheetDef) ? sheetDef.startFrame : isKeyedStrip(sheetDef) ? undefined : undefined) ?? 0,
                end:
                  (isSpritesheet(sheetDef) ? sheetDef.endFrame : undefined) ??
                  this.getSpriteSheetFrameCount(textureKey) - 1
              });

        if (!frames?.length) return;

        const yoyo =
          (isSpritesheet(sheetDef) || isAtlas(sheetDef)) && "yoyo" in sheetDef ? sheetDef.yoyo === true : false;

        this.anims.create({
          key,
          frames,
          frameRate: sheetDef.fps ?? 10,
          repeat: sheetDef.repeat ?? 0,
          yoyo
        });
      });
    });
  }

  createUnitAnimationSheets(): void {
    Object.values(UNIT_ANIMATION_ASSETS).forEach((unitDef) => {
      Object.values(unitDef.sheets || {}).forEach((sheetDef) => {
        if (!isKeyedStrip(sheetDef)) return;
        const sourceKey = sheetDef.sourceKey;
        const outputKey = sheetDef.outputKey;
        if (isAtlas(sheetDef as AnimationSheetDef)) return;
        if (!sourceKey || !outputKey || this.textures.exists(outputKey)) return;

        if (unitDef.preprocess === "bbox-aligned-rgba") {
          this.createAlignedSpriteSheetFromBoxes(sourceKey, sheetDef.boxesKey!, outputKey);
          return;
        }

        const frameConfig = this.getAutoSheetFrameConfig(sourceKey);
        if (!frameConfig) return;
        this.createKeyedSpriteSheet(sourceKey, outputKey, frameConfig);
      });
    });
  }

  createAlignedSpriteSheetFromBoxes(sourceKey: string, boxesKey: string, outputKey: string): void {
    if (!this.textures.exists(sourceKey) || this.textures.exists(outputKey)) return;
    const rawBoxes = this.cache.json.get(boxesKey);
    if (!Array.isArray(rawBoxes) || rawBoxes.length === 0) return;

    const sourceImage = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    if (!sourceImage?.width || !sourceImage?.height) return;

    // Fixed grid layout: 4 columns x 7 rows, 768x448 per frame
    // These sprite sheets always have this structure with alpha transparency
    const FRAME_WIDTH = 768;
    const FRAME_HEIGHT = Math.floor(sourceImage.height / 7); // Calculate from actual height

    // The boxes generally correspond 1:1 to the grid frames in order
    // We can directly use the source image as the spritesheet texture
    // instead of creating a new canvas and copying pixels.
    this.textures.addSpriteSheet(outputKey, sourceImage, {
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      margin: 0,
      spacing: 0,
      startFrame: 0,
      endFrame: rawBoxes.length - 1
    });
  }

  getSpriteSheetFrameCount(textureKey: string): number {
    if (!this.textures.exists(textureKey)) return 0;
    const texture = this.textures.get(textureKey);
    if (!texture?.frames) return 0;
    return Object.keys(texture.frames).filter((name) => name !== "__BASE").length;
  }

  getAutoSheetFrameConfig(sourceKey: string): FrameConfig | null {
    if (!this.textures.exists(sourceKey)) return null;
    const sourceImage = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    if (!sourceImage?.width || !sourceImage?.height) return null;

    const width = sourceImage.width;
    const height = sourceImage.height;

    const minFrames = 4;
    const maxFrames = 24;

    let best: { frames: number; frameWidth: number; score: number } | null = null;
    for (let frames = minFrames; frames <= maxFrames; frames += 1) {
      if (width % frames !== 0) continue;
      const fw = width / frames;
      if (fw < 96 || fw > 768) continue;

      const score = Math.abs(fw - height);
      if (!best || score < best.score) {
        best = { frames, frameWidth: fw, score };
      }
    }

    if (!best) return null;

    return {
      frameWidth: best.frameWidth,
      frameHeight: height,
      margin: 0,
      spacing: 0,
      startFrame: 0,
      endFrame: best.frames - 1
    };
  }

  createKeyedSpriteSheet(sourceKey: string, outputKey: string, frameConfig: FrameConfig): void {
    if (!this.textures.exists(sourceKey)) return;
    if (this.textures.exists(outputKey)) return;

    const sourceImage = this.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
    if (!sourceImage?.width || !sourceImage?.height) return;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const canvasKey = `${outputKey}_canvas`;
    const keyedCanvas = this.textures.createCanvas(canvasKey, width, height);
    if (!keyedCanvas) return;

    const ctx = keyedCanvas.context;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(sourceImage, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const hardThreshold = 70;
    const softThreshold = 120;
    const keyR = 0;
    const keyG = 255;
    const keyB = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dr = r - keyR;
      const dg = g - keyG;
      const db = b - keyB;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db);
      const greenDominant = g > r * 1.15 && g > b * 1.15;

      if (greenDominant && distance <= hardThreshold) {
        data[i + 3] = 0;
        continue;
      }

      if (greenDominant && distance < softThreshold) {
        const keep = Phaser.Math.Clamp((distance - hardThreshold) / (softThreshold - hardThreshold), 0, 1);
        data[i + 3] = Math.min(data[i + 3], Math.round(255 * keep));
        if (data[i + 3] > 0) {
          const excess = g - Math.max(r, b);
          data[i + 1] = Math.max(0, Math.round(g - excess * 0.45));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    keyedCanvas.refresh();

    this.textures.addSpriteSheet(outputKey, keyedCanvas.getSourceImage() as any, frameConfig);
  }
}
