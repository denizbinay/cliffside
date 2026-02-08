import { UNIT_SIZE, DEPTH } from "../../config/GameConfig";
import { UNIT_ANIMATION_PROFILES } from "../../data/unitAnimationProfiles";
import { Position, Render, UnitConfig } from "../components";
import type { RenderStore } from "../stores/RenderStore";
import type { StatusDotsContainer } from "../stores/RenderStore";
import type { Side, UnitAnimationProfile, UnitTypeConfig } from "../../types";

interface ShapeResult {
  main: Phaser.GameObjects.Shape;
  extras: Phaser.GameObjects.Shape[];
}

function resolveAnimatedProfile(scene: Phaser.Scene, config: UnitTypeConfig): UnitAnimationProfile | null {
  const profile = UNIT_ANIMATION_PROFILES[config.id];
  if (!profile?.textureKey) return null;
  if (!scene.textures.exists(profile.textureKey)) return null;
  return profile;
}

function buildShape(scene: Phaser.Scene, config: UnitTypeConfig, size: number): ShapeResult {
  const color = config.color;
  if (config.id === "guard") {
    const body = scene.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
    const shield = scene.add.rectangle(-size * 0.2, 0, size * 0.35, size * 0.6, 0xd6c8a7);
    return { main: body, extras: [shield] };
  }
  if (config.id === "archer") {
    const body = scene.add.rectangle(0, 0, size * 0.7, size * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
    const bow = scene.add.rectangle(size * 0.35, 0, size * 0.15, size * 0.9, 0xe7d9b8);
    return { main: body, extras: [bow] };
  }
  if (config.id === "cleric") {
    const body = scene.add.circle(0, 0, size * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
    const halo = scene.add.circle(0, -size * 0.55, size * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
    return { main: body, extras: [halo] };
  }

  return { main: scene.add.rectangle(0, 0, size, size, color), extras: [] };
}

function buildStatusDots(scene: Phaser.Scene): StatusDotsContainer {
  const group = scene.add.container(0, 0) as StatusDotsContainer;
  const stun = scene.add.circle(-12, 0, 4, 0x8cb7ff, 1);
  const slow = scene.add.circle(0, 0, 4, 0x9bd6ff, 1);
  const buff = scene.add.circle(12, 0, 4, 0xf1d08f, 1);
  group.add([stun, slow, buff]);
  group.setAlpha(0.9);
  group.setVisible(false);
  group.status = { stun, slow, buff };
  return group;
}

export function createUnitVisuals(
  scene: Phaser.Scene,
  eid: number,
  config: UnitTypeConfig,
  side: Side,
  renderStore: RenderStore
): void {
  const size = UnitConfig.size[eid] || UNIT_SIZE[config.role] || UNIT_SIZE.default;
  const x = Position.x[eid];
  const y = Position.y[eid];
  const depth = Render.depth[eid] || DEPTH.UNITS;

  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const animatedProfile = resolveAnimatedProfile(scene, config);
  let mainSprite: Phaser.GameObjects.Sprite | null = null;
  let mainShape: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite;

  if (animatedProfile) {
    mainSprite = scene.add.sprite(0, 0, animatedProfile.textureKey, 0);
    const sizeScale = animatedProfile.sizeScale || 2;
    const widthScale = animatedProfile.widthScale || 1;
    const heightScale = animatedProfile.heightScale || 1;

    // Fix: Use setScale instead of setDisplaySize to preserve aspect ratio.
    // The source frame is 768x448. We scale based on height to match target size.
    const FRAME_HEIGHT = 448;
    const targetHeight = size * sizeScale * heightScale;
    const scale = targetHeight / FRAME_HEIGHT;

    mainSprite.setScale(scale * widthScale, scale * heightScale);
    mainSprite.setOrigin(animatedProfile.originX ?? 0.5, animatedProfile.originY ?? 0.7);
    mainSprite.setFlipX(side === "ai");
    container.add(mainSprite);
    mainShape = mainSprite;
  } else {
    const shapeData = buildShape(scene, config, size);
    mainShape = shapeData.main;
    container.add([shapeData.main, ...shapeData.extras]);
  }

  const statusDots = buildStatusDots(scene);
  container.add(statusDots);

  const healthBarOffsetY = Number.isFinite(animatedProfile?.healthBarOffsetY)
    ? animatedProfile!.healthBarOffsetY!
    : -30;
  const healthBar = scene.add.rectangle(x, y + healthBarOffsetY, size, 5, 0x2d2f38);
  const healthFill = scene.add.rectangle(x, y + healthBarOffsetY, size, 5, 0x76c27a);
  healthBar.setDepth(DEPTH.UNIT_HP);
  healthFill.setDepth(DEPTH.UNIT_HP);

  const storeIndex = renderStore.create({
    container,
    mainShape,
    mainSprite,
    healthBar,
    healthFill,
    healthBarOffsetX: 0,
    healthBarOffsetY,
    statusDots
  });

  Render.storeIndex[eid] = storeIndex;
  Render.visible[eid] = 1;
}
