import { Position, Render } from "../components";
import type { RenderStore } from "../stores/RenderStore";
import type { CastleMode, LayoutProfile, Side } from "../../types";
import { DEPTH } from "../../config/GameConfig";
import type { RenderStoreEntry, StatusDotsContainer } from "../stores/RenderStore";

interface CastleVariantInfo {
  useTwinMirror: boolean;
  baseKey: string;
  label: string;
}

export interface CreateCastleVisualsOptions {
  scene: Phaser.Scene;
  eid: number;
  side: Side;
  layoutProfile: LayoutProfile;
  baseColor: number;
  renderStore: RenderStore;
  castleMode: CastleMode;
  getCastleVariant: () => CastleVariantInfo;
}

function createEmptyStatusDots(scene: Phaser.Scene): StatusDotsContainer {
  const container = scene.add.container(0, 0) as StatusDotsContainer;
  container.setVisible(false);
  container.status = {};
  return container;
}

export function createCastleVisuals(options: CreateCastleVisualsOptions): number {
  const { scene, eid, side, layoutProfile, baseColor, renderStore, castleMode, getCastleVariant } = options;
  const x = Position.x[eid];
  const y = Position.y[eid];
  const castleVariant = getCastleVariant();

  // Determine which texture to use based on castle mode
  let castleKey: string;
  if (castleMode === "unified") {
    // New unified mode: same asset for both sides
    castleKey = "castle_unified";
  } else {
    // Legacy mode: variant base or fallback to player base
    castleKey = castleVariant.useTwinMirror ? castleVariant.baseKey : "castle_base_player";
  }
  const hasCastleBase = scene.textures.exists(castleKey);

  const baseCenterYOffset = layoutProfile.castle.baseCenterYOffset;
  const baseWidth = layoutProfile.castle.baseWidth;
  const baseHeight = layoutProfile.castle.baseHeight;
  const hpWidth = layoutProfile.castle.hpWidth;
  const hpHeight = layoutProfile.castle.hpHeight;
  const hpOffsetX = layoutProfile.castle.hpOffsetX;
  const hpOffsetY = layoutProfile.castle.hpOffsetY;

  const container = scene.add.container(x, y);
  container.setDepth(DEPTH.CASTLE);

  let mainShape: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  const mainSprite: Phaser.GameObjects.Sprite | null = null;

  if (hasCastleBase) {
    const base = scene.add.image(0, baseCenterYOffset, castleKey).setDisplaySize(baseWidth, baseHeight);
    base.setFlipX(side === "player");
    // Only apply team tint in legacy mode
    if (castleMode === "legacy") {
      const teamTint = side === "player" ? 0xb5cee6 : 0xe1bbbb;
      base.setTint(teamTint);
    }
    container.add(base);
    mainShape = base;
  } else {
    const base = scene.add.rectangle(0, 0, 92, 120, baseColor).setStrokeStyle(3, 0x20242f, 1);
    const keep = scene.add.rectangle(0, 22, 36, 48, 0x2a211e).setStrokeStyle(2, 0x161414, 1);
    const roof = scene.add.triangle(0, -90, -36, 20, 36, 20, 0, -20, 0x2a2f3a).setStrokeStyle(2, 0x1b1e27, 1);
    container.add([base, keep, roof]);
    mainShape = base;
  }

  const healthBar = scene.add.rectangle(0, 0, hpWidth, hpHeight, 0x10151f, 0.92).setStrokeStyle(1, 0xe4d6b8, 0.9);
  const healthFill = scene.add.rectangle(0, 0, hpWidth, Math.max(2, hpHeight - 4), 0x79d27e);
  healthBar.setDepth(DEPTH.CASTLE_HP);
  healthFill.setDepth(DEPTH.CASTLE_HP + 1);

  const statusDots = createEmptyStatusDots(scene);

  const entry: RenderStoreEntry = {
    container,
    mainShape,
    mainSprite,
    healthBar,
    healthFill,
    healthBarOffsetX: side === "player" ? hpOffsetX : -hpOffsetX,
    healthBarOffsetY: hpOffsetY,
    statusDots
  };

  const storeIndex = renderStore.create(entry);
  Render.storeIndex[eid] = storeIndex;
  Render.visible[eid] = 1;
  return storeIndex;
}
