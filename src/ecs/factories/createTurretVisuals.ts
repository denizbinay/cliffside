import { Position, Render } from "../components";
import type { RenderStore } from "../stores/RenderStore";
import type { LayoutTurretProfile, Side } from "../../types";
import { DEPTH } from "../../config/GameConfig";
import type { RenderStoreEntry, StatusDotsContainer } from "../stores/RenderStore";

export interface CreateTurretVisualsOptions {
  scene: Phaser.Scene;
  eid: number;
  side: Side;
  metrics: Partial<LayoutTurretProfile>;
  renderStore: RenderStore;
}

function createEmptyStatusDots(scene: Phaser.Scene): StatusDotsContainer {
  const container = scene.add.container(0, 0) as StatusDotsContainer;
  container.setVisible(false);
  container.status = {};
  return container;
}

export function createTurretVisuals(options: CreateTurretVisualsOptions): number {
  const { scene, eid, side, metrics, renderStore } = options;
  const x = Position.x[eid];
  const y = Position.y[eid];

  const container = scene.add.container(x, y);
  container.setDepth(DEPTH.TURRETS);

  const hasTurretBase = scene.textures.exists("turret_base");
  const turretHeadKey = scene.textures.exists("turret_head_keyed")
    ? "turret_head_keyed"
    : scene.textures.exists("turret_head")
      ? "turret_head"
      : null;
  const hasTurretHead = Boolean(turretHeadKey);

  const showBase = metrics.showBase === true;
  const baseWidth = metrics.baseWidth || 44;
  const baseHeight = metrics.baseHeight || 34;
  const headWidth = metrics.headWidth || 28;
  const headHeight = metrics.headHeight || 28;

  let mainShape: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | null = null;
  const mainSprite: Phaser.GameObjects.Sprite | null = null;

  if (showBase && hasTurretBase) {
    const base = scene.add.image(0, 0, "turret_base").setDisplaySize(baseWidth, baseHeight);
    const teamTint = side === "player" ? 0xb5cee6 : 0xe1bbbb;
    base.setTint(teamTint);
    container.add(base);
    mainShape = base;
  } else {
    const base = scene.add
      .rectangle(0, 0, 36, 26, side === "player" ? 0x5a6b7a : 0x7a5a5a)
      .setStrokeStyle(2, 0x1c1f27, 1);
    const tower = scene.add.rectangle(0, -16, 24, 22, 0x2b303b).setStrokeStyle(2, 0x1c1f27, 1);
    if (showBase) {
      container.add([base, tower]);
      mainShape = base;
    }
  }

  const headY = showBase ? -24 : -headHeight * 0.5;
  if (hasTurretHead && turretHeadKey) {
    const head = scene.add.image(0, headY, turretHeadKey).setDisplaySize(headWidth, headHeight);
    head.setFlipX(side === "ai");
    container.add(head);
    if (!mainShape) {
      mainShape = head;
    }
  } else {
    const head = scene.add.triangle(0, headY - 6, -8, 6, 8, 6, 0, -6, 0xe2d2b3).setStrokeStyle(1, 0x1c1f27, 1);
    container.add(head);
    if (!mainShape) {
      mainShape = head;
    }
  }

  const healthBarWidth = metrics.hpWidth || 44;
  const healthBarHeight = metrics.hpHeight || 5;
  const turretTopY = Math.min(showBase ? -baseHeight * 0.5 : Number.POSITIVE_INFINITY, headY - headHeight * 0.5);
  const healthBarOffsetX = metrics.hpOffsetX || 0;
  const healthBarOffsetY = Number.isFinite(metrics.hpOffsetY!)
    ? metrics.hpOffsetY!
    : turretTopY - healthBarHeight * 1.4;

  const healthBar = scene.add.rectangle(0, 0, healthBarWidth, healthBarHeight, 0x2d2f38);
  const healthFill = scene.add.rectangle(0, 0, healthBarWidth, Math.max(2, healthBarHeight - 1), 0x9ec9f0);
  healthBar.setDepth(DEPTH.TURRET_HP);
  healthFill.setDepth(DEPTH.TURRET_HP);

  const statusDots = createEmptyStatusDots(scene);

  const entry: RenderStoreEntry = {
    container,
    mainShape: mainShape || healthBar,
    mainSprite,
    healthBar,
    healthFill,
    healthBarOffsetX,
    healthBarOffsetY,
    statusDots
  };

  const storeIndex = renderStore.create(entry);
  Render.storeIndex[eid] = storeIndex;
  Render.visible[eid] = 1;
  return storeIndex;
}
