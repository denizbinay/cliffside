/**
 * LevelManager - Handles level layout, background, and static visuals.
 * Moved from GameScene to separate concerns.
 */

import Phaser from "phaser";
import {
  SIDE,
  CASTLE_VARIANTS,
  CASTLE_METRICS,
  CONTROL_POINT_CONFIG,
  LAYOUT_STORAGE_KEY,
  createDefaultLayoutProfile
} from "../config/GameConfig.js";

export default class LevelManager {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {GameContext} ctx - Game context
   */
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx;

    this.width = scene.scale.width;
    this.height = scene.scale.height;

    // UI bounds
    this.uiLeft = 0;
    this.uiTop = 84;
    this.uiBottom = 200;
    this.playArea = {
      x: this.uiLeft,
      y: this.uiTop,
      width: this.width - this.uiLeft,
      height: this.height - this.uiTop - this.uiBottom
    };

    // Layout profile
    this.layoutProfile = createDefaultLayoutProfile();
    this.loadLayoutProfile();

    // Castle variants
    this.castleVariants = CASTLE_VARIANTS;
    this.castleVariantIndex = this.resolveInitialCastleVariantIndex();

    // Bridge visuals array (for cleanup)
    this.bridgeVisuals = [];

    // Board layout computed values
    this.boardLayout = {};
  }

  // --- Initialization ---

  initialize() {
    this.computeBoardLayout();
    this.createBackground();
    this.createBridge();
  }

  // --- Castle Variant ---

  resolveInitialCastleVariantIndex() {
    const max = CASTLE_VARIANTS.length;
    if (typeof window !== "undefined") {
      try {
        const query = new URLSearchParams(window.location.search).get("castleVariant");
        const numeric = Number(query);
        if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= max) {
          return numeric - 1;
        }
      } catch {
        // ignore invalid query
      }

      try {
        const stored = Number(window.localStorage.getItem("castleVariantIndex"));
        if (!Number.isNaN(stored) && stored >= 0 && stored < max) {
          return stored;
        }
      } catch {
        // ignore storage issues
      }
    }
    return 0;
  }

  getCastleVariant() {
    const variant = this.castleVariants[this.castleVariantIndex] || this.castleVariants[0];
    const hasVariantBase = variant && this.scene.textures.exists(variant.baseKey);
    const hasVariantTower = variant && this.scene.textures.exists(variant.towerKey);
    return {
      label: hasVariantBase ? variant.label : "Legacy",
      baseKey: hasVariantBase ? variant.baseKey : "castle_base_player",
      towerKey: hasVariantTower ? variant.towerKey : "castle_tower",
      useTwinMirror: hasVariantBase
    };
  }

  // --- Layout Computation ---

  computeBoardLayout() {
    const profile = this.layoutProfile;
    const mirrorCenterX = this.playArea.x + this.playArea.width / 2;
    const mirrorX = (x) => mirrorCenterX * 2 - x;

    if (profile.mirrorMode) {
      profile.castle.aiX = mirrorX(profile.castle.playerX);
      profile.decks.foundation.rightStart = mirrorX(profile.decks.foundation.leftEnd);
      profile.decks.foundation.rightEnd = mirrorX(profile.decks.foundation.leftStart);
      profile.decks.spawn.rightStart = mirrorX(profile.decks.spawn.leftEnd);
      profile.decks.spawn.rightEnd = mirrorX(profile.decks.spawn.leftStart);
    }

    profile.decks.foundation.leftEnd = Math.max(profile.decks.foundation.leftEnd, profile.decks.foundation.leftStart + 30);
    profile.decks.spawn.leftEnd = Math.max(profile.decks.spawn.leftEnd, profile.decks.spawn.leftStart + 30);
    profile.decks.foundation.rightEnd = Math.max(profile.decks.foundation.rightEnd, profile.decks.foundation.rightStart + 30);
    profile.decks.spawn.rightEnd = Math.max(profile.decks.spawn.rightEnd, profile.decks.spawn.rightStart + 30);

    this.castleXLeft = profile.castle.playerX;
    this.castleXRight = profile.castle.aiX;
    this.castleAnchorY = profile.castle.anchorY;

    this.castleBaseWidth = profile.castle.baseWidth;
    this.castleBaseHeight = profile.castle.baseHeight;
    this.castleBaseCenterYOffset = profile.castle.baseCenterYOffset;

    this.castleFootY =
      this.castleAnchorY +
      this.castleBaseCenterYOffset +
      this.castleBaseHeight / 2 -
      CASTLE_METRICS.baseFootInset;

    this.foundationDeckY = profile.decks.foundation.topY;
    this.foundationDeckHeight = profile.decks.foundation.height;
    this.spawnDeckY = profile.decks.spawn.topY;
    this.spawnDeckHeight = profile.decks.spawn.height;
    this.bridgeY = profile.bridge.topY;

    this.bridgePlankY = profile.bridge.topY + profile.bridge.plankOffsetY;
    this.bridgeThickness = profile.bridge.thickness;
    this.bridgeShowPillars = Boolean(profile.bridge.showPillars);
    this.bridgeShowRopes = Boolean(profile.bridge.showRopes);
    this.bridgeShowControlFx = Boolean(profile.bridge.showControlFx);
    this.bridgeRopeTopY = profile.bridge.topY + profile.bridge.ropeTopOffset;
    this.bridgeRopeBottomY = profile.bridge.topY + profile.bridge.ropeBottomOffset;
    this.bridgePillarY = profile.bridge.topY + profile.bridge.pillarOffsetY;
    this.bridgePillarHeight = profile.bridge.pillarHeight;
    this.bridgePillarStep = profile.bridge.pillarStep;

    this.turretSideInset = profile.turret.sideInset;
    this.turretY = this.spawnDeckY + profile.turret.yOffset;

    this.unitSpawnInset = profile.units.spawnInset;
    this.unitLaneY = profile.units.laneY;
    this.unitCalloutOffsetY = profile.units.calloutOffsetY;

    this.controlY = profile.control.y;
    this.controlZoneWidth = profile.control.zoneWidth;
    this.controlZoneHeight = profile.control.zoneHeight;

    this.boardLayout = {
      leftFoundationStart: profile.decks.foundation.leftStart,
      leftFoundationEnd: profile.decks.foundation.leftEnd,
      rightFoundationStart: profile.decks.foundation.rightStart,
      rightFoundationEnd: profile.decks.foundation.rightEnd,
      leftSpawnStart: profile.decks.spawn.leftStart,
      leftSpawnEnd: profile.decks.spawn.leftEnd,
      rightSpawnStart: profile.decks.spawn.rightStart,
      rightSpawnEnd: profile.decks.spawn.rightEnd,
      bridgeLeft: profile.decks.spawn.leftEnd,
      bridgeRight: profile.decks.spawn.rightStart
    };

    // Set platform boundaries
    this.platformLeftStart = this.boardLayout.leftSpawnStart;
    this.platformLeftEnd = this.boardLayout.leftSpawnEnd;
    this.platformRightStart = this.boardLayout.rightSpawnStart;
    this.platformRightEnd = this.boardLayout.rightSpawnEnd;
    this.bridgeLeft = this.boardLayout.bridgeLeft;
    this.bridgeRight = this.boardLayout.bridgeRight;
  }

  // --- Background ---

  createBackground() {
    const hasBgSky = this.scene.textures.exists("bg_sky");

    this.scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x151922).setDepth(-20);

    const sky = hasBgSky
      ? this.scene.add.image(this.width / 2, this.height / 2, "bg_sky")
      : this.scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x273145);

    if (hasBgSky) {
      const frame = this.scene.textures.get("bg_sky").getSourceImage();
      const scale = Math.max((this.width + 8) / frame.width, (this.height + 8) / frame.height);
      sky.setScale(scale);
    }
    sky.setDepth(-18);

    const vignette = this.scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x0d1016, 0.15).setDepth(4);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  // --- Bridge ---

  createBridge() {
    this.clearBridgeVisuals();

    const bridgeY = this.controlY;
    const bridgeThickness = this.bridgeThickness;
    const bridgePlankY = this.bridgePlankY;
    const ropeTopY = this.bridgeRopeTopY;
    const ropeBottomY = this.bridgeRopeBottomY;

    const bridgeWidth = this.bridgeRight - this.bridgeLeft;
    const bridgeCenter = this.playArea.x + this.playArea.width / 2;

    const hasPlatform = this.scene.textures.exists("platform_stone");
    const hasBridgePlank = this.scene.textures.exists("bridge_plank");
    const hasBridgePillar = this.scene.textures.exists("bridge_pillar");
    const hasBridgeRope = this.scene.textures.exists("bridge_rope");

    // Draw platform segments
    this.drawDeckSegment(this.boardLayout.leftFoundationStart, this.boardLayout.leftFoundationEnd, this.foundationDeckY, this.foundationDeckHeight, 1, hasPlatform);
    this.drawDeckSegment(this.boardLayout.rightFoundationStart, this.boardLayout.rightFoundationEnd, this.foundationDeckY, this.foundationDeckHeight, 1, hasPlatform);
    this.drawDeckSegment(this.platformLeftStart, this.platformLeftEnd, this.spawnDeckY, this.spawnDeckHeight, 2, hasPlatform);
    this.drawDeckSegment(this.platformRightStart, this.platformRightEnd, this.spawnDeckY, this.spawnDeckHeight, 2, hasPlatform);

    // Draw bridge planks
    if (hasBridgePlank) {
      const segmentCount = 6;
      const segmentWidth = bridgeWidth / segmentCount;
      for (let i = 0; i < segmentCount; i += 1) {
        const x = this.bridgeLeft + segmentWidth * (i + 0.5);
        this.addBridgeVisual(this.scene.add.image(x, bridgePlankY, "bridge_plank").setDisplaySize(segmentWidth + 2, bridgeThickness).setDepth(2));
      }
    } else {
      this.addBridgeVisual(this.scene.add.rectangle(bridgeCenter, bridgePlankY, bridgeWidth, bridgeThickness - 6, 0x3c312c).setStrokeStyle(2, 0x241b18, 1).setDepth(2));
      this.addBridgeVisual(this.scene.add.rectangle(bridgeCenter, bridgePlankY - bridgeThickness * 0.4, bridgeWidth - 16, 6, 0x2a211e).setDepth(2));
      this.addBridgeVisual(this.scene.add.rectangle(bridgeCenter, bridgePlankY + bridgeThickness * 0.4, bridgeWidth - 16, 6, 0x2a211e).setDepth(2));
    }

    // Draw pillars
    if (this.bridgeShowPillars) {
      for (let x = this.bridgeLeft + 20; x <= this.bridgeRight - 20; x += this.bridgePillarStep) {
        if (hasBridgePillar) {
          this.addBridgeVisual(this.scene.add.image(x, this.bridgePillarY, "bridge_pillar").setDisplaySize(18, this.bridgePillarHeight).setDepth(2));
        } else {
          this.addBridgeVisual(this.scene.add.rectangle(x, this.bridgePillarY, 10, this.bridgePillarHeight - 4, 0x2d2522).setDepth(2));
        }
      }
    }

    // Draw ropes
    if (this.bridgeShowRopes) {
      if (hasBridgeRope) {
        this.addBridgeVisual(this.scene.add.tileSprite(bridgeCenter, ropeTopY, bridgeWidth, 12, "bridge_rope").setDepth(3).setAlpha(0.9));
        this.addBridgeVisual(this.scene.add.tileSprite(bridgeCenter, ropeBottomY, bridgeWidth, 12, "bridge_rope").setDepth(3).setAlpha(0.9));
      } else {
        const rope = this.addBridgeVisual(this.scene.add.graphics().setDepth(3));
        rope.lineStyle(3, 0x1b1f27, 0.9);
        this.drawRope(rope, this.bridgeLeft, this.bridgeRight, ropeTopY - 2, 10);
        this.drawRope(rope, this.bridgeLeft, this.bridgeRight, ropeBottomY + 2, 10);
      }
    }

    // Create control point visuals
    this.createControlPointVisuals(bridgeY, bridgeWidth);
  }

  createControlPointVisuals(bridgeY, bridgeWidth) {
    const hasControlRune = this.scene.textures.exists("control_rune");
    const hasControlGlow = this.scene.textures.exists("control_glow");
    const pointCount = CONTROL_POINT_CONFIG.count;
    const spacing = bridgeWidth / (pointCount + 1);

    this.controlPointVisuals = [];

    for (let i = 0; i < pointCount; i += 1) {
      const x = this.bridgeLeft + spacing * (i + 1);

      const glow = this.bridgeShowControlFx && hasControlGlow
        ? this.addBridgeVisual(this.scene.add.image(x, bridgeY, "control_glow").setDisplaySize(36, 36).setAlpha(0.45).setDepth(3))
        : null;

      const rune = this.bridgeShowControlFx && hasControlRune
        ? this.addBridgeVisual(this.scene.add.image(x, bridgeY, "control_rune").setDisplaySize(26, 26).setAlpha(0.85).setDepth(4))
        : null;

      const marker = this.addBridgeVisual(this.scene.add.circle(x, bridgeY, 10, 0x323844, 0.8).setStrokeStyle(2, 0x5b616e, 1));
      const core = this.addBridgeVisual(this.scene.add.circle(x, bridgeY, 5, 0x7b8598, 0.9));
      marker.setDepth(4);
      core.setDepth(5);

      this.controlPointVisuals.push({
        index: i,
        x,
        y: bridgeY,
        glow,
        rune,
        marker,
        core
      });
    }
  }

  drawDeckSegment(startX, endX, topY, height, depth, hasPlatformTexture) {
    const width = endX - startX;
    const centerX = (startX + endX) / 2;
    const centerY = topY + height / 2;

    if (hasPlatformTexture) {
      this.addBridgeVisual(this.scene.add.image(centerX, centerY, "platform_stone").setDisplaySize(width + 16, height).setDepth(depth));
      return;
    }
    this.addBridgeVisual(this.scene.add.rectangle(centerX, centerY, width, height, 0x3a3430).setStrokeStyle(2, 0x241b18, 1).setDepth(depth));
  }

  drawRope(graphics, x1, x2, y, sag) {
    const steps = 18;
    graphics.beginPath();
    graphics.moveTo(x1, y);
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const x = Phaser.Math.Linear(x1, x2, t);
      const yOffset = Math.sin(t * Math.PI) * sag;
      graphics.lineTo(x, y + yOffset);
    }
    graphics.strokePath();
  }

  addBridgeVisual(obj) {
    this.bridgeVisuals.push(obj);
    return obj;
  }

  clearBridgeVisuals() {
    for (const obj of this.bridgeVisuals || []) {
      obj.destroy();
    }
    this.bridgeVisuals = [];
  }

  // --- Spawn Position Helpers ---

  getPlayerSpawnX() {
    return this.platformLeftStart + this.unitSpawnInset;
  }

  getAiSpawnX() {
    return this.platformRightEnd - this.unitSpawnInset;
  }

  getUnitLaneY() {
    return this.unitLaneY;
  }

  getPlayerCastlePosition() {
    return { x: this.castleXLeft, y: this.castleAnchorY };
  }

  getAiCastlePosition() {
    return { x: this.castleXRight, y: this.castleAnchorY };
  }

  getPlayerTurretPosition() {
    return { x: this.platformLeftEnd - this.turretSideInset, y: this.turretY };
  }

  getAiTurretPosition() {
    return { x: this.platformRightStart + this.turretSideInset, y: this.turretY };
  }

  // --- Platform Zone ---

  getPlatformZone(side, extra = 0) {
    const height = 90;
    if (side === SIDE.PLAYER) {
      return new Phaser.Geom.Rectangle(
        this.platformLeftStart,
        this.unitLaneY - height / 2,
        this.platformLeftEnd - this.platformLeftStart + extra,
        height
      );
    }
    return new Phaser.Geom.Rectangle(
      this.platformRightStart - extra,
      this.unitLaneY - height / 2,
      this.platformRightEnd - this.platformRightStart + extra,
      height
    );
  }

  // --- Control Point Configs ---

  getControlPointConfigs() {
    const bridgeWidth = this.bridgeRight - this.bridgeLeft;
    const pointCount = CONTROL_POINT_CONFIG.count;
    const spacing = bridgeWidth / (pointCount + 1);

    const configs = [];
    for (let i = 0; i < pointCount; i += 1) {
      configs.push({
        index: i,
        x: this.bridgeLeft + spacing * (i + 1),
        y: this.controlY,
        zoneWidth: this.controlZoneWidth,
        zoneHeight: this.controlZoneHeight
      });
    }
    return configs;
  }

  // --- Layout Profile Persistence ---

  loadLayoutProfile() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      this.layoutProfile = {
        ...this.layoutProfile,
        ...parsed,
        castle: { ...this.layoutProfile.castle, ...(parsed.castle || {}) },
        decks: {
          foundation: { ...this.layoutProfile.decks.foundation, ...(parsed.decks?.foundation || {}) },
          spawn: { ...this.layoutProfile.decks.spawn, ...(parsed.decks?.spawn || {}) }
        },
        bridge: { ...this.layoutProfile.bridge, ...(parsed.bridge || {}) },
        turret: { ...this.layoutProfile.turret, ...(parsed.turret || {}) },
        units: { ...this.layoutProfile.units, ...(parsed.units || {}) },
        control: { ...this.layoutProfile.control, ...(parsed.control || {}) }
      };
    } catch {
      // ignore malformed layout storage
    }
  }

  saveLayoutProfile() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(this.layoutProfile));
    } catch {
      // ignore storage limits
    }
  }

  exportLayoutProfile() {
    const text = JSON.stringify(this.layoutProfile, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    return text;
  }

  // --- Rebuild ---

  rebuildVisuals() {
    this.clearBridgeVisuals();
    this.computeBoardLayout();
    this.createBridge();
  }

  destroy() {
    this.clearBridgeVisuals();
  }
}
