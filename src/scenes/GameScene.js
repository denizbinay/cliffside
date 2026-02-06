import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units.js";
import { ABILITIES } from "../data/abilities.js";
import { SHOP_CONFIG } from "../data/shop.js";
import { STANCES } from "../data/stances.js";

const SIDE = {
  PLAYER: "player",
  AI: "ai"
};

class Unit {
  constructor(scene, config, side, x, y, modifiers = {}) {
    this.scene = scene;
    this.config = config;
    this.side = side;
    this.role = config.role;

    const hpMult = modifiers.hpMult || 1;
    const dmgMult = modifiers.dmgMult || 1;
    const rangeMult = modifiers.rangeMult || 1;
    const speedMult = modifiers.speedMult || 1;
    const attackRateMult = modifiers.attackRateMult || 1;
    const healMult = modifiers.healMult || 1;

    this.maxHp = config.hp * hpMult;
    this.hp = this.maxHp;
    this.dmg = config.dmg * dmgMult;
    this.range = config.range * rangeMult;
    this.baseSpeed = config.speed * speedMult;
    this.attackRate = config.attackRate * attackRateMult;
    this.attackCooldown = 0;
    this.healAmount = (config.healAmount || 0) * healMult;

    this.status = {
      stun: 0,
      slow: 0,
      slowPower: 1,
      buff: 0,
      buffPower: 1
    };

    this.size = this.role === "frontline" ? 40 : this.role === "damage" ? 32 : 34;
    this.body = scene.add.container(x, y);
    this.baseColor = config.color;
    const shapeData = this.buildShape(config.id, config.color);
    this.mainShape = shapeData.main;
    this.body.add([shapeData.main, ...shapeData.extras]);

    this.roleBadge = this.buildRoleBadge(this.role);
    this.body.add(this.roleBadge);

    this.statusDots = this.buildStatusDots();
    this.body.add(this.statusDots);

    this.healthBar = scene.add.rectangle(x, y - 30, this.size, 5, 0x2d2f38);
    this.healthFill = scene.add.rectangle(x, y - 30, this.size, 5, 0x76c27a);
  }

  isAlive() {
    return this.hp > 0;
  }

  update(delta, enemies, allies, enemyCastle) {
    if (!this.isAlive()) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.status.stun = Math.max(0, this.status.stun - delta);
    this.status.slow = Math.max(0, this.status.slow - delta);
    this.status.buff = Math.max(0, this.status.buff - delta);

    const isStunned = this.status.stun > 0;
    const speed = this.baseSpeed * (this.status.slow > 0 ? this.status.slowPower : 1);
    const buffMult = this.status.buff > 0 ? this.status.buffPower : 1;

    if (!isStunned) {
      if (this.role === "support") {
        const ally = this.findHealTarget(allies);
        if (ally && this.attackCooldown === 0) {
          ally.heal(this.healAmount * buffMult);
          this.attackCooldown = this.attackRate;
          this.flash(0xc9f5c7);
        } else if (!ally) {
          this.move(speed, delta, enemyCastle.x);
        }
      } else {
        const target = this.findTarget(enemies);
        if (target) {
          if (this.attackCooldown === 0) {
            target.takeDamage(this.dmg * buffMult);
            if (this.config.statusOnHit) {
              target.applyStatus(this.config.statusOnHit, this.side);
            }
            this.attackCooldown = this.attackRate;
            this.flash(0xffffff);
          }
        } else if (this.inCastleRange(enemyCastle.x)) {
          if (this.attackCooldown === 0) {
            enemyCastle.takeDamage(this.dmg * buffMult);
            this.attackCooldown = this.attackRate;
            this.flash(0xffe6a8);
          }
        } else {
          this.move(speed, delta, enemyCastle.x);
        }
      }
    }

    this.syncBars();
  }

  move(speed, delta, enemyCastleX) {
    const dir = this.side === SIDE.PLAYER ? 1 : -1;
    this.body.x += dir * speed * delta;

    const stopX = enemyCastleX + (this.side === SIDE.PLAYER ? -40 : 40);
    if ((dir === 1 && this.body.x > stopX) || (dir === -1 && this.body.x < stopX)) {
      this.body.x = stopX;
    }
  }

  findTarget(enemies) {
    let closest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Math.abs(enemy.body.x - this.body.x);
      if (dist <= this.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  findHealTarget(allies) {
    let best = null;
    let missing = 0;
    for (const ally of allies) {
      if (!ally.isAlive()) continue;
      const dist = Math.abs(ally.body.x - this.body.x);
      const deltaHp = ally.maxHp - ally.hp;
      if (dist <= this.range && deltaHp > missing) {
        missing = deltaHp;
        best = ally;
      }
    }
    return best;
  }

  inCastleRange(castleX) {
    const dist = Math.abs(castleX - this.body.x);
    return dist <= 50;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.flash(0xffc2c2);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.flash(0xc9f5c7);
  }

  applyStatus(status, attackerSide) {
    if (status.type === "stun") {
      this.status.stun = Math.max(this.status.stun, status.duration);
      this.flash(0xb5c7ff);
    }
    if (status.type === "slow") {
      this.status.slow = Math.max(this.status.slow, status.duration);
      this.status.slowPower = status.power;
      this.flash(0x9fd6ff);
    }
    if (status.type === "pushback") {
      const dir = attackerSide === SIDE.PLAYER ? 1 : -1;
      this.body.x += dir * status.strength;
      this.status.stun = Math.max(this.status.stun, 0.3);
      this.flash(0xffe6a8);
    }
    if (status.type === "buff") {
      this.status.buff = Math.max(this.status.buff, status.duration);
      this.status.buffPower = status.power;
      this.flash(0xf1d08f);
    }
  }

  flash(color) {
    this.mainShape.setFillStyle(color);
    this.scene.time.delayedCall(100, () => {
      if (!this.isAlive()) return;
      this.mainShape.setFillStyle(this.baseColor);
    });
  }

  syncBars() {
    this.healthBar.x = this.body.x;
    this.healthFill.x = this.body.x;
    this.healthBar.y = this.body.y - 30;
    this.healthFill.y = this.body.y - 30;

    this.roleBadge.x = 0;
    this.roleBadge.y = -this.size * 0.65;

    this.statusDots.x = 0;
    this.statusDots.y = -this.size * 0.85;
    this.updateStatusDots();

    const ratio = this.hp / this.maxHp;
    this.healthFill.width = this.healthBar.width * ratio;
    this.healthFill.x = this.healthBar.x - (this.healthBar.width - this.healthFill.width) / 2;
    this.healthFill.setVisible(ratio > 0.02);
  }

  destroy() {
    this.body.destroy();
    this.healthBar.destroy();
    this.healthFill.destroy();
  }

  buildShape(id, color) {
    const s = this.size;
    if (id === "guard") {
      const body = this.scene.add.rectangle(0, 0, s, s, color).setStrokeStyle(2, 0x1c1f27, 1);
      const shield = this.scene.add.rectangle(-s * 0.2, 0, s * 0.35, s * 0.6, 0xd6c8a7);
      return { main: body, extras: [shield] };
    }
    if (id === "archer") {
      const body = this.scene.add.rectangle(0, 0, s * 0.7, s * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
      const bow = this.scene.add.rectangle(s * 0.35, 0, s * 0.15, s * 0.9, 0xe7d9b8);
      return { main: body, extras: [bow] };
    }
    if (id === "cleric") {
      const body = this.scene.add.circle(0, 0, s * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
      const halo = this.scene.add.circle(0, -s * 0.55, s * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
      return { main: body, extras: [halo] };
    }
    if (id === "charger") {
      const body = this.scene.add.triangle(0, 0, -s * 0.6, s * 0.5, s * 0.6, s * 0.5, 0, -s * 0.6, color).setStrokeStyle(2, 0x1c1f27, 1);
      const horn = this.scene.add.rectangle(0, -s * 0.1, s * 0.6, s * 0.12, 0xf0d39a);
      return { main: body, extras: [horn] };
    }
    return { main: this.scene.add.rectangle(0, 0, s, s, color), extras: [] };
  }

  buildRoleBadge(role) {
    const label = role === "frontline" ? "F" : role === "damage" ? "D" : role === "support" ? "S" : "X";
    const badge = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(0, 0, 18, 16, 0x1b1e27).setStrokeStyle(1, 0xe2d2b3, 1);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: "Cinzel",
      fontSize: "12px",
      color: "#e7e2d8"
    });
    text.setOrigin(0.5, 0.5);
    badge.add([bg, text]);
    return badge;
  }

  buildStatusDots() {
    const group = this.scene.add.container(0, 0);
    const stun = this.scene.add.circle(-12, 0, 4, 0x8cb7ff, 1);
    const slow = this.scene.add.circle(0, 0, 4, 0x9bd6ff, 1);
    const buff = this.scene.add.circle(12, 0, 4, 0xf1d08f, 1);
    group.add([stun, slow, buff]);
    group.setAlpha(0.9);
    group.setVisible(false);
    group.status = { stun, slow, buff };
    return group;
  }

  updateStatusDots() {
    const any = this.status.stun > 0 || this.status.slow > 0 || this.status.buff > 0;
    this.statusDots.setVisible(any);
    if (!any) return;
    this.statusDots.status.stun.setVisible(this.status.stun > 0);
    this.statusDots.status.slow.setVisible(this.status.slow > 0);
    this.statusDots.status.buff.setVisible(this.status.buff > 0);
  }
}

class Turret {
  constructor(scene, side, x, y) {
    this.scene = scene;
    this.side = side;
    this.x = x;
    this.y = y;
    this.maxHp = 260;
    this.hp = 260;
    this.range = 160;
    this.dmg = 14;
    this.attackRate = 0.9;
    this.attackCooldown = 0;
    this.status = { stun: 0 };

    this.body = scene.add.container(x, y);
    const base = scene.add.rectangle(0, 0, 36, 26, side === SIDE.PLAYER ? 0x5a6b7a : 0x7a5a5a).setStrokeStyle(2, 0x1c1f27, 1);
    const tower = scene.add.rectangle(0, -16, 24, 22, 0x2b303b).setStrokeStyle(2, 0x1c1f27, 1);
    const head = scene.add.triangle(0, -30, -8, 6, 8, 6, 0, -6, 0xe2d2b3).setStrokeStyle(1, 0x1c1f27, 1);
    this.body.add([base, tower, head]);
    this.base = base;

    this.healthBar = scene.add.rectangle(x, y - 28, 44, 5, 0x2d2f38);
    this.healthFill = scene.add.rectangle(x, y - 28, 44, 5, 0x9ec9f0);
  }

  isAlive() {
    return this.hp > 0;
  }

  update(delta, enemies) {
    if (!this.isAlive()) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.status.stun = Math.max(0, this.status.stun - delta);
    if (this.status.stun > 0) return;

    const target = this.findTarget(enemies);
    if (target && this.attackCooldown === 0) {
      this.attackCooldown = this.attackRate;
      target.takeDamage(this.dmg);
      this.fireArrow(target.body.x, target.body.y);
      this.flash(0xffe6a8);
    }
  }

  findTarget(enemies) {
    let closest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      if (!enemy.isAlive()) continue;
      const dist = Math.abs(enemy.body.x - this.x);
      if (dist <= this.range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  fireArrow(tx, ty) {
    const arrow = this.scene.add.rectangle(this.x, this.y - 22, 12, 2, 0xf3ead7);
    arrow.setRotation(Math.atan2(ty - this.y, tx - this.x));
    this.scene.tweens.add({
      targets: arrow,
      x: tx,
      y: ty,
      alpha: 0.2,
      duration: 260,
      onComplete: () => arrow.destroy()
    });
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.flash(0xffc2c2);
    if (!this.isAlive()) {
      this.scene.events.emit("log", { type: "turret", side: this.side });
      this.destroy();
    }
  }

  applyStatus(status) {
    if (status.type === "stun") {
      this.status.stun = Math.max(this.status.stun, status.duration);
    }
  }

  flash(color) {
    this.base.setFillStyle(color);
    this.scene.time.delayedCall(100, () => {
      if (!this.isAlive()) return;
      this.base.setFillStyle(this.side === SIDE.PLAYER ? 0x5a6b7a : 0x7a5a5a);
    });
  }

  syncBars() {
    this.healthBar.x = this.x;
    this.healthFill.x = this.x;
    this.healthBar.y = this.y - 28;
    this.healthFill.y = this.y - 28;
    const ratio = this.hp / this.maxHp;
    this.healthFill.width = this.healthBar.width * ratio;
    this.healthFill.x = this.healthBar.x - (this.healthBar.width - this.healthFill.width) / 2;
  }

  destroy() {
    this.body.destroy();
    this.healthBar.destroy();
    this.healthFill.destroy();
  }
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  create() {
    this.width = this.scale.width;
    this.height = this.scale.height;
    this.uiLeft = 0;
    this.uiTop = 84;
    this.uiBottom = 200;
    this.playArea = {
      x: this.uiLeft,
      y: this.uiTop,
      width: this.width - this.uiLeft,
      height: this.height - this.uiTop - this.uiBottom
    };

    this.createBackground();
    this.createBridge();
    this.createCastles();
    this.createTurrets();

    this.playerUnits = [];
    this.aiUnits = [];
    this.playerTurrets = [this.playerTurret];
    this.aiTurrets = [this.aiTurret];

    this.isGameOver = false;
    this.lastCastleHitLog = { player: 0, ai: 0 };

    this.zoneOwner = "neutral";
    this.zoneCheckTimer = 0;

    this.baseIncome = 1.1;
    this.zoneBonus = 1.2;
    this.pointBonus = 0.35;
    this.enemyPointBonus = 0.25;
    this.killBonus = 0.6;

    this.interestRate = 0.05;
    this.interestCap = 12;
    this.interestTick = 1;

    this.playerResources = 6;
    this.aiResources = 6;

    this.abilityCooldowns = {
      healWave: 0,
      pulse: 0
    };

    this.matchTime = 0;
    this.waveLockSeconds = 6;
    this.waveSupply = 12;
    this.waveSize = this.waveSupply;
    this.waveSlots = { front: 4, mid: 4, rear: 4 };
    this.waveStagger = 0.2;
    this.waveSchedule = [
      { time: 0, interval: 45 },
      { time: 180, interval: 35 },
      { time: 420, interval: 25 }
    ];
    this.waveCountdown = this.getWaveInterval(this.matchTime);
    this.waveLocked = false;
    this.waveNumber = 0;

    this.playerDraft = this.createWaveDraft();
    this.aiDraft = this.createWaveDraft();

    this.shop = {
      player: { offers: [], rerolls: 0 },
      ai: { offers: [], rerolls: 0 }
    };
    this.rollShopOffers(SIDE.PLAYER, true);
    this.rollShopOffers(SIDE.AI, true);

    this.waveStance = { player: "normal", ai: "normal" };

    this.ghostAlpha = 0.35;
    this.createGhostFormation();

    this.resourceAccumulator = 0;
    this.emitResourceUpdate();

    this.time.addEvent({
      delay: 1400,
      loop: true,
      callback: () => this.aiDecision()
    });

    this.events.on("spawn-request", (type) => this.requestSpawn(type));
    this.events.on("queue-add", (payload) => this.queueUnit(payload, SIDE.PLAYER));
    this.events.on("queue-remove", (payload) => this.removeQueuedUnit(payload, SIDE.PLAYER));
    this.events.on("shop-reroll", () => this.requestShopReroll(SIDE.PLAYER));
    this.events.on("stance-select", (payload) => this.selectStance(payload, SIDE.PLAYER));
    this.events.on("ability-request", (id) => this.requestAbility(id));
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;

    if (this.isGameOver) return;

    this.matchTime += delta;

    this.resourceAccumulator += delta;
    while (this.resourceAccumulator >= this.interestTick) {
      this.resourceAccumulator -= this.interestTick;
      this.gainResources();
    }

    this.abilityCooldowns.healWave = Math.max(0, this.abilityCooldowns.healWave - delta);
    this.abilityCooldowns.pulse = Math.max(0, this.abilityCooldowns.pulse - delta);

    this.waveCountdown -= delta;
    while (this.waveCountdown <= 0) {
      this.waveNumber += 1;
      this.sendWave(SIDE.PLAYER);
      this.sendWave(SIDE.AI);
      this.rollShopOffers(SIDE.PLAYER, true);
      this.rollShopOffers(SIDE.AI, true);
      this.waveCountdown += this.getWaveInterval(this.matchTime);
    }
    this.waveLocked = this.waveCountdown <= this.waveLockSeconds;

    const playerUnitEnemies = [...this.aiUnits, ...this.aiTurrets.filter((t) => t && t.isAlive())];
    const aiUnitEnemies = [...this.playerUnits, ...this.playerTurrets.filter((t) => t && t.isAlive())];

    for (const unit of this.playerUnits) {
      unit.update(delta, playerUnitEnemies, this.playerUnits, this.aiCastle);
    }
    for (const unit of this.aiUnits) {
      unit.update(delta, aiUnitEnemies, this.aiUnits, this.playerCastle);
    }

    for (const turret of this.playerTurrets) {
      if (!turret) continue;
      turret.update(delta, this.aiUnits);
      if (turret.isAlive()) turret.syncBars();
    }
    for (const turret of this.aiTurrets) {
      if (!turret) continue;
      turret.update(delta, this.playerUnits);
      if (turret.isAlive()) turret.syncBars();
    }

    this.cleanupUnits();

    this.updateGhostFormation();

    this.zoneCheckTimer += delta;
    if (this.zoneCheckTimer >= 0.3) {
      this.zoneCheckTimer = 0;
      this.updateControlPoints();
    }

    this.checkGameOver();
  }

  createBackground() {
    this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x151922);
    const far = this.add.rectangle(this.width / 2, this.height * 0.35, this.width, this.height * 0.6, 0x273145);
    const mid = this.add.rectangle(this.width / 2, this.height * 0.52, this.width, this.height * 0.6, 0x1f2a3b);
    const near = this.add.rectangle(this.width / 2, this.height * 0.72, this.width, this.height * 0.6, 0x202733);

    const cliffs = this.add.graphics();
    cliffs.fillStyle(0x2e3a4b, 1);
    cliffs.beginPath();
    cliffs.moveTo(0, this.height * 0.25);
    cliffs.lineTo(160, this.height * 0.3);
    cliffs.lineTo(190, this.height * 0.55);
    cliffs.lineTo(0, this.height * 0.62);
    cliffs.closePath();
    cliffs.fillPath();

    cliffs.fillStyle(0x3a4658, 1);
    cliffs.beginPath();
    cliffs.moveTo(this.width, this.height * 0.25);
    cliffs.lineTo(this.width - 160, this.height * 0.3);
    cliffs.lineTo(this.width - 190, this.height * 0.55);
    cliffs.lineTo(this.width, this.height * 0.62);
    cliffs.closePath();
    cliffs.fillPath();

    const haze = this.add.rectangle(this.width / 2, this.height * 0.4, this.width, this.height * 0.3, 0x1c2330, 0.35);
    const vignette = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x0d1016, 0.15);
    vignette.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.tweens.add({
      targets: [far, mid, haze],
      x: "+=12",
      duration: 7000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: [near],
      x: "-=16",
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  createBridge() {
    const bridgeY = this.playArea.y + this.playArea.height * 0.62;
    this.bridgeY = bridgeY;

    const platformLength = 140;
    const platformHeight = 56;
    const bridgeMargin = 60;

    this.platformLeftStart = this.playArea.x + bridgeMargin;
    this.platformLeftEnd = this.platformLeftStart + platformLength;
    this.platformRightEnd = this.playArea.x + this.playArea.width - bridgeMargin;
    this.platformRightStart = this.platformRightEnd - platformLength;

    this.bridgeLeft = this.platformLeftEnd;
    this.bridgeRight = this.platformRightStart;
    const bridgeWidth = this.bridgeRight - this.bridgeLeft;
    const bridgeCenter = this.playArea.x + this.playArea.width / 2;

    const platformLeft = this.add.rectangle((this.platformLeftStart + this.platformLeftEnd) / 2, bridgeY, platformLength, platformHeight, 0x3a3430);
    platformLeft.setStrokeStyle(2, 0x241b18, 1);
    const platformRight = this.add.rectangle((this.platformRightStart + this.platformRightEnd) / 2, bridgeY, platformLength, platformHeight, 0x3a3430);
    platformRight.setStrokeStyle(2, 0x241b18, 1);

    const deck = this.add.rectangle(bridgeCenter, bridgeY, bridgeWidth, 42, 0x3c312c).setStrokeStyle(2, 0x241b18, 1);
    const railTop = this.add.rectangle(bridgeCenter, bridgeY - 20, bridgeWidth - 16, 6, 0x2a211e);
    const railBottom = this.add.rectangle(bridgeCenter, bridgeY + 20, bridgeWidth - 16, 6, 0x2a211e);

    for (let x = this.bridgeLeft + 20; x <= this.bridgeRight - 20; x += 90) {
      this.add.rectangle(x, bridgeY, 10, 38, 0x2d2522);
    }

    const rope = this.add.graphics();
    rope.lineStyle(3, 0x1b1f27, 0.9);
    this.drawRope(rope, this.bridgeLeft, this.bridgeRight, bridgeY - 26, 10);
    this.drawRope(rope, this.bridgeLeft, this.bridgeRight, bridgeY + 26, 10);

    this.controlPoints = [];
    const pointCount = 5;
    const spacing = bridgeWidth / (pointCount + 1);
    for (let i = 0; i < pointCount; i += 1) {
      const x = this.bridgeLeft + spacing * (i + 1);
      const marker = this.add.circle(x, bridgeY, 10, 0x323844, 0.8).setStrokeStyle(2, 0x5b616e, 1);
      const core = this.add.circle(x, bridgeY, 5, 0x7b8598, 0.9);
      this.controlPoints.push({
        index: i,
        x,
        y: bridgeY,
        owner: "neutral",
        progress: 0,
        marker,
        core,
        zone: new Phaser.Geom.Rectangle(x - 60, bridgeY - 26, 120, 52)
      });
    }
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

  createCastles() {
    const y = this.bridgeY - 30;
    this.playerCastle = this.createCastle(this.playArea.x + 42, y, SIDE.PLAYER, 0x5f7685);
    this.aiCastle = this.createCastle(this.playArea.x + this.playArea.width - 42, y, SIDE.AI, 0x8a5a5a);
  }

  createTurrets() {
    const offset = 18;
    this.playerTurret = new Turret(this, SIDE.PLAYER, this.platformLeftEnd - offset, this.bridgeY - 6);
    this.aiTurret = new Turret(this, SIDE.AI, this.platformRightStart + offset, this.bridgeY - 6);
  }

  createCastle(x, y, side, color) {
    const base = this.add.rectangle(x, y, 92, 120, color).setStrokeStyle(3, 0x20242f, 1);
    const gate = this.add.rectangle(x, y + 22, 36, 48, 0x2a211e).setStrokeStyle(2, 0x161414, 1);
    const tower = this.add.rectangle(x, y - 62, 64, 42, 0x4a5b6a).setStrokeStyle(3, 0x20242f, 1);
    const roof = this.add.triangle(x, y - 90, -36, 20, 36, 20, 0, -20, 0x2a2f3a).setStrokeStyle(2, 0x1b1e27, 1);
    const banner = this.add.rectangle(x, y - 46, 64, 8, 0xe2d2b3, 1);
    return {
      side,
      x,
      y,
      maxHp: 900,
      hp: 900,
      base,
      banner,
      takeDamage: (amount) => {
        const castle = side === SIDE.PLAYER ? this.playerCastle : this.aiCastle;
        castle.hp = Math.max(0, castle.hp - amount);
        base.setFillStyle(0xffe0a3);
        this.time.delayedCall(120, () => base.setFillStyle(color));
        this.cameras.main.shake(80, 0.004);

        const key = side === SIDE.PLAYER ? "player" : "ai";
        const now = this.time.now;
        if (now - this.lastCastleHitLog[key] > 1600) {
          this.lastCastleHitLog[key] = now;
          this.events.emit("log", { type: "castle-hit", side });
        }
      }
    };
  }

  requestSpawn(type) {
    this.queueUnit({ id: type, fromShop: true }, SIDE.PLAYER);
  }

  createWaveDraft() {
    return {
      front: Array(this.waveSlots.front).fill(null),
      mid: Array(this.waveSlots.mid).fill(null),
      rear: Array(this.waveSlots.rear).fill(null)
    };
  }

  createGhostFormation() {
    const rows = ["front", "mid", "rear"];
    this.ghostFormation = { rows: {} };
    for (const row of rows) {
      const count = this.waveSlots[row] || 0;
      this.ghostFormation.rows[row] = [];
      for (let i = 0; i < count; i += 1) {
        const container = this.add.container(0, 0);
        container.setAlpha(this.ghostAlpha);
        container.setDepth(1);
        container.setVisible(false);
        this.ghostFormation.rows[row].push({ container, currentType: null });
      }
    }
  }

  updateGhostFormation() {
    if (!this.ghostFormation) return;
    const draft = this.playerDraft;
    const zone = this.getPlatformZone(SIDE.PLAYER, 0);
    const rows = ["front", "mid", "rear"];

    const rowX = {
      rear: zone.x + zone.width * 0.22,
      mid: zone.x + zone.width * 0.5,
      front: zone.x + zone.width * 0.78
    };

    for (const row of rows) {
      const slots = this.waveSlots[row] || 0;
      const padding = 8;
      const step = slots > 0 ? (zone.height - padding * 2) / slots : 0;
      const list = draft[row] || [];
      const ghosts = this.ghostFormation.rows[row] || [];
      for (let i = 0; i < ghosts.length; i += 1) {
        const ghost = ghosts[i];
        const typeId = list[i];
        const x = rowX[row];
        const y = zone.y + padding + step * (i + 0.5);
        ghost.container.setPosition(x, y);
        if (!typeId) {
          ghost.container.setVisible(false);
          ghost.currentType = null;
          continue;
        }
        if (ghost.currentType !== typeId) {
          ghost.container.removeAll(true);
          const shapes = this.buildGhostShapes(typeId);
          ghost.container.add(shapes);
          ghost.currentType = typeId;
        }
        ghost.container.setVisible(true);
      }
    }
  }

  buildGhostShapes(typeId) {
    const config = UNIT_TYPES[typeId];
    if (!config) return [];
    const role = config.role;
    const size = role === "frontline" ? 40 : role === "damage" ? 32 : 34;
    const color = config.color;
    const shapes = [];

    if (typeId === "guard") {
      const body = this.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
      const shield = this.add.rectangle(-size * 0.2, 0, size * 0.35, size * 0.6, 0xd6c8a7);
      shapes.push(body, shield);
      return shapes;
    }
    if (typeId === "archer") {
      const body = this.add.rectangle(0, 0, size * 0.7, size * 1.1, color).setStrokeStyle(2, 0x1c1f27, 1);
      const bow = this.add.rectangle(size * 0.35, 0, size * 0.15, size * 0.9, 0xe7d9b8);
      shapes.push(body, bow);
      return shapes;
    }
    if (typeId === "cleric") {
      const body = this.add.circle(0, 0, size * 0.5, color).setStrokeStyle(2, 0x1c1f27, 1);
      const halo = this.add.circle(0, -size * 0.55, size * 0.28, 0xf2e6c7, 0.2).setStrokeStyle(2, 0xf2e6c7, 1);
      shapes.push(body, halo);
      return shapes;
    }
    if (typeId === "charger") {
      const body = this.add.triangle(0, 0, -size * 0.6, size * 0.5, size * 0.6, size * 0.5, 0, -size * 0.6, color);
      body.setStrokeStyle(2, 0x1c1f27, 1);
      const horn = this.add.rectangle(0, -size * 0.1, size * 0.6, size * 0.12, 0xf0d39a);
      shapes.push(body, horn);
      return shapes;
    }

    const body = this.add.rectangle(0, 0, size, size, color).setStrokeStyle(2, 0x1c1f27, 1);
    shapes.push(body);
    return shapes;
  }

  getWaveInterval(elapsed) {
    let interval = this.waveSchedule[0].interval;
    for (const stage of this.waveSchedule) {
      if (elapsed >= stage.time) interval = stage.interval;
    }
    return interval;
  }

  getStageIndex(elapsed = this.matchTime) {
    let stageIndex = 0;
    for (let i = 0; i < this.waveSchedule.length; i += 1) {
      if (elapsed >= this.waveSchedule[i].time) stageIndex = i;
    }
    return stageIndex;
  }

  getTierCap() {
    const stageIndex = this.getStageIndex();
    const caps = SHOP_CONFIG.stageTierCaps;
    return caps[Math.min(stageIndex, caps.length - 1)];
  }

  getEligibleShopUnits() {
    const stageIndex = this.getStageIndex();
    const tierCap = this.getTierCap();
    return Object.values(UNIT_TYPES).filter(
      (unit) => unit.stageMin <= stageIndex && unit.tier <= tierCap
    );
  }

  pickWeighted(units) {
    const total = units.reduce((sum, unit) => sum + (unit.shopWeight || 1), 0);
    let roll = Phaser.Math.FloatBetween(0, total);
    for (const unit of units) {
      roll -= unit.shopWeight || 1;
      if (roll <= 0) return unit;
    }
    return units[units.length - 1];
  }

  rollShopOffers(side, resetRerolls = false) {
    const shop = this.shop[side];
    if (!shop) return;
    if (resetRerolls) shop.rerolls = 0;

    const eligible = this.getEligibleShopUnits();
    if (eligible.length === 0) {
      shop.offers = [];
      return;
    }

    const offers = [];
    let pool = [...eligible];
    const stageIndex = this.getStageIndex();
    const guarantees = stageIndex === 0 ? SHOP_CONFIG.earlyRoleGuarantees : [];

    for (const role of guarantees) {
      const rolePool = pool.filter((unit) => unit.role === role);
      if (rolePool.length === 0) continue;
      const pick = this.pickWeighted(rolePool);
      offers.push(pick.id);
      pool = pool.filter((unit) => unit.id !== pick.id);
    }

    while (offers.length < SHOP_CONFIG.offersPerWave && pool.length > 0) {
      const pick = this.pickWeighted(pool);
      offers.push(pick.id);
      pool = pool.filter((unit) => unit.id !== pick.id);
    }

    while (offers.length < SHOP_CONFIG.offersPerWave) {
      const pick = this.pickWeighted(eligible);
      offers.push(pick.id);
    }

    shop.offers = offers;
  }

  getRerollCost(side) {
    const shop = this.shop[side];
    if (!shop) return SHOP_CONFIG.baseRerollCost;
    return SHOP_CONFIG.baseRerollCost + shop.rerolls * SHOP_CONFIG.rerollCostGrowth;
  }

  requestShopReroll(side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;
    const cost = this.getRerollCost(side);
    if (side === SIDE.PLAYER) {
      if (this.playerResources < cost) return false;
      this.playerResources -= cost;
    } else {
      if (this.aiResources < cost) return false;
      this.aiResources -= cost;
    }
    this.shop[side].rerolls += 1;
    this.rollShopOffers(side, false);
    this.emitResourceUpdate();
    return true;
  }

  isShopUnitAvailable(side, type) {
    const shop = this.shop[side];
    if (!shop) return false;
    return shop.offers.includes(type);
  }

  claimShopOffer(side, type) {
    const shop = this.shop[side];
    if (!shop) return false;
    const index = shop.offers.indexOf(type);
    if (index === -1) return false;
    shop.offers.splice(index, 1);
    return true;
  }

  selectStance(payload, side) {
    if (this.isGameOver) return false;
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

  getFirstAvailableSlot(draft) {
    if (draft.front.includes(null)) return "front";
    if (draft.mid.includes(null)) return "mid";
    if (draft.rear.includes(null)) return "rear";
    return null;
  }

  queueUnit(payload, side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;

    const type = typeof payload === "string" ? payload : payload.id;
    const fromShop = typeof payload === "object" && payload.fromShop === true;
    let slot = typeof payload === "string" ? null : payload.slot || null;
    const index = typeof payload === "string" ? null : payload.index;

    const config = UNIT_TYPES[type];
    if (!config) return false;
    const cost = config.cost;
    const draft = this.getDraft(side);
    const requiresShop = side === SIDE.PLAYER || side === SIDE.AI;
    if (requiresShop && !fromShop) return false;
    if (requiresShop && !this.isShopUnitAvailable(side, type)) return false;
    if (!slot) slot = this.getFirstAvailableSlot(draft) || "mid";
    const slotList = this.getDraftSlotList(draft, slot);
    if (!slotList) return false;

    const filledCount = this.getDraftSlotCount(draft);
    let targetIndex = null;

    if (filledCount >= this.waveSupply) {
      return false;
    } else if (typeof index === "number") {
      if (index < 0 || index >= slotList.length) return false;
      if (slotList[index] !== null) return false;
      targetIndex = index;
    } else {
      const openIndex = slotList.indexOf(null);
      if (openIndex === -1) return false;
      targetIndex = openIndex;
    }

    if (side === SIDE.PLAYER) {
      if (this.playerResources < cost) return false;
    } else {
      if (this.aiResources < cost) return false;
    }

    if (requiresShop && !this.claimShopOffer(side, type)) return false;

    if (side === SIDE.PLAYER) {
      this.playerResources -= cost;
    } else {
      this.aiResources -= cost;
    }

    slotList[targetIndex] = type;

    this.emitResourceUpdate();
    return true;
  }

  removeQueuedUnit(payload, side) {
    if (this.isGameOver) return false;
    if (this.waveLocked) return false;

    const type = typeof payload === "string" ? payload : payload.id;
    const slot = typeof payload === "string" ? null : payload.slot || null;
    const index = typeof payload === "string" ? null : payload.index;
    const config = UNIT_TYPES[type];
    if (!config) return false;
    const draft = this.getDraft(side);

    const removeFrom = (list) => {
      const slotIndex = list.lastIndexOf(type);
      if (slotIndex === -1) return false;
      list[slotIndex] = null;
      return true;
    };

    let removed = false;
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
    if (!removed) return false;

    return true;
  }

  sendWave(side) {
    if (this.isGameOver) return;
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
      const extra = Math.max(0, roleCounts[role] - 3);
      roleMult[role] = Math.max(0.6, 1 - extra * 0.1);
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
      this.time.delayedCall(delay, () => {
        this.spawnUnit(type, side, { payCost: false, offset, presenceMult, modifiers: stanceMods });
      });
    });

    this.events.emit("log", { type: "wave", side, count });
  }

  spawnUnit(type, side, options = {}) {
    if (this.isGameOver) return false;
    const { payCost = true, offset = 0, presenceMult = 1, modifiers = {} } = options;
    const config = UNIT_TYPES[type];
    if (!config) return false;
    const cost = config.cost;
    if (payCost) {
      if (side === SIDE.PLAYER) {
        if (this.playerResources < cost) return false;
        this.playerResources -= cost;
      } else {
        if (this.aiResources < cost) return false;
        this.aiResources -= cost;
      }
    }

    const spawnX =
      side === SIDE.PLAYER ? this.platformLeftStart + 40 : this.platformRightEnd - 40;
    const unit = new Unit(this, config, side, spawnX + offset, this.bridgeY, modifiers);
    unit.presenceMult = presenceMult;
    if (side === SIDE.PLAYER) {
      this.playerUnits.push(unit);
    } else {
      this.aiUnits.push(unit);
    }

    this.spawnPulse(spawnX + offset, this.bridgeY, config.color);
    this.spawnCallout(spawnX + offset, this.bridgeY - 40, config.name, side);
    this.events.emit("log", { type: "spawn", side, name: config.name });
    if (payCost) this.emitResourceUpdate();
    return true;
  }

  spawnPulse(x, y, color) {
    const ring = this.add.circle(x, y, 10, color, 0.4);
    this.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 450,
      onComplete: () => ring.destroy()
    });
  }

  spawnCallout(x, y, text, side) {
    const label = this.add.text(x, y, text, {
      fontFamily: "Cinzel",
      fontSize: "14px",
      color: side === SIDE.PLAYER ? "#e7e2d8" : "#f4d2c4"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: y - 18,
      alpha: 0,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => label.destroy()
    });
  }

  requestAbility(id) {
    if (this.isGameOver) return;
    const ability = ABILITIES[id];
    if (!ability) return;
    if (this.abilityCooldowns[id] > 0) return;
    this.abilityCooldowns[id] = ability.cooldown;

    if (id === "healWave") {
      this.castleHealWave(this.playerCastle, ability);
    }
    if (id === "pulse") {
      this.castlePulse(this.playerCastle, ability);
    }
    this.events.emit("log", { type: "ability", name: ability.name });
  }

  castleHealWave(castle, ability) {
    const radius = Math.max(this.playArea.width, this.playArea.height) * 0.75;
    const wave = this.add.circle(castle.x, castle.y, 20, 0x9fd6aa, 0.5);
    this.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: 500,
      onComplete: () => wave.destroy()
    });

    const label = this.add.text(castle.x, castle.y - 90, "Heal Wave", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#dff1da"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });

    for (const unit of this.playerUnits) {
      unit.heal(ability.amount);
    }
  }

  castlePulse(castle, ability) {
    const zone = this.getPlatformZone(SIDE.PLAYER, 40);
    const centerX = zone.x + zone.width / 2;
    const pulse = this.add.circle(centerX, castle.y, 30, 0xffd58a, 0.4);
    this.tweens.add({
      targets: pulse,
      radius: zone.width * 0.6,
      alpha: 0,
      duration: 420,
      onComplete: () => pulse.destroy()
    });

    const label = this.add.text(castle.x, castle.y - 90, "Defensive Pulse", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#f2ddae"
    });
    label.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: label,
      y: label.y - 20,
      alpha: 0,
      duration: 900,
      onComplete: () => label.destroy()
    });

    for (const unit of this.aiUnits) {
      if (Phaser.Geom.Rectangle.Contains(zone, unit.body.x, unit.body.y)) {
        unit.applyStatus({ type: "stun", duration: ability.stunDuration }, SIDE.PLAYER);
        unit.applyStatus({ type: "pushback", strength: ability.pushStrength }, SIDE.PLAYER);
      }
    }
  }

  gainResources() {
    const playerIncome = this.getIncomeDetails(SIDE.PLAYER);
    const aiIncome = this.getIncomeDetails(SIDE.AI);

    this.playerResources += playerIncome.total;
    this.aiResources += aiIncome.total;
    this.emitResourceUpdate();
  }

  emitResourceUpdate() {
    this.events.emit("resource-update", {
      player: this.playerResources,
      ai: this.aiResources,
      playerIncome: this.getIncomeDetails(SIDE.PLAYER).total,
      aiIncome: this.getIncomeDetails(SIDE.AI).total
    });
  }

  updateControlPoints() {
    let playerCount = 0;
    let aiCount = 0;

    for (const point of this.controlPoints) {
      let playerPresence = 0;
      let aiPresence = 0;

      for (const unit of this.playerUnits) {
        if (!unit.isAlive()) continue;
        if (Phaser.Geom.Rectangle.Contains(point.zone, unit.body.x, unit.body.y)) {
          playerPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }
      for (const unit of this.aiUnits) {
        if (!unit.isAlive()) continue;
        if (Phaser.Geom.Rectangle.Contains(point.zone, unit.body.x, unit.body.y)) {
          aiPresence += unit.config.presence * (unit.presenceMult || 1);
        }
      }

      const diff = playerPresence - aiPresence;
      if (Math.abs(diff) <= 0.2) {
        point.progress *= 0.9;
      } else {
        point.progress = Phaser.Math.Clamp(point.progress + diff * 0.12, -1, 1);
      }

      const prevOwner = point.owner;
      if (point.progress >= 0.4) point.owner = SIDE.PLAYER;
      else if (point.progress <= -0.4) point.owner = SIDE.AI;
      else point.owner = "neutral";

      if (point.owner !== prevOwner) {
        this.events.emit("log", { type: "point", index: point.index, owner: point.owner });
        this.tweens.add({ targets: [point.marker], alpha: 0.95, duration: 140, yoyo: true });
      }

      if (point.owner === SIDE.PLAYER) playerCount += 1;
      if (point.owner === SIDE.AI) aiCount += 1;

      const tint =
        point.owner === SIDE.PLAYER
          ? 0x6fa3d4
          : point.owner === SIDE.AI
          ? 0xb36a6a
          : 0x3a3f4f;
      point.marker.setFillStyle(tint, 0.65);
      const coreTint = point.owner === SIDE.PLAYER ? 0x9ec9f0 : point.owner === SIDE.AI ? 0xf0b5b5 : 0x7b8598;
      point.core.setFillStyle(coreTint, 0.9);
    }

    let newOwner = "neutral";
    if (playerCount > aiCount) newOwner = SIDE.PLAYER;
    if (aiCount > playerCount) newOwner = SIDE.AI;

    if (newOwner !== this.zoneOwner) {
      this.zoneOwner = newOwner;
      this.events.emit("zone-update", this.zoneOwner);
      this.events.emit("log", { type: "zone", owner: this.zoneOwner });
      this.cameras.main.shake(120, 0.002);
    }
  }

  getIncomeDetails(side) {
    const ownedPoints = this.controlPoints.filter((point) => point.owner === side);
    const base = this.baseIncome;
    let pointBonus = ownedPoints.length * this.pointBonus;
    let enemyBonus = 0;

    for (const point of ownedPoints) {
      if (this.isEnemyPoint(side, point.index)) {
        enemyBonus += this.enemyPointBonus;
      }
    }

    const resources = side === SIDE.PLAYER ? this.playerResources : this.aiResources;
    const interestBase = Math.min(resources, this.interestCap);
    const interest = interestBase * this.interestRate * this.interestTick;
    const total = base + pointBonus + enemyBonus + interest;

    return { base, pointBonus, enemyBonus, interest, total };
  }

  isEnemyPoint(side, index) {
    if (side === SIDE.PLAYER) return index >= 3;
    return index <= 1;
  }

  getPlatformZone(side, extra = 0) {
    const height = 90;
    if (side === SIDE.PLAYER) {
      return new Phaser.Geom.Rectangle(
        this.platformLeftStart,
        this.bridgeY - height / 2,
        this.platformLeftEnd - this.platformLeftStart + extra,
        height
      );
    }
    return new Phaser.Geom.Rectangle(
      this.platformRightStart - extra,
      this.bridgeY - height / 2,
      this.platformRightEnd - this.platformRightStart + extra,
      height
    );
  }

  cleanupUnits() {
    const beforePlayer = this.playerUnits.length;
    const beforeAi = this.aiUnits.length;

    this.playerUnits = this.playerUnits.filter((unit) => {
      if (unit.isAlive()) return true;
      unit.destroy();
      return false;
    });

    this.aiUnits = this.aiUnits.filter((unit) => {
      if (unit.isAlive()) return true;
      unit.destroy();
      return false;
    });

    const deadPlayer = beforePlayer - this.playerUnits.length;
    const deadAi = beforeAi - this.aiUnits.length;
    if (deadPlayer > 0) {
      this.aiResources += this.killBonus * deadPlayer;
    }
    if (deadAi > 0) {
      this.playerResources += this.killBonus * deadAi;
    }
    if (deadPlayer > 0 || deadAi > 0) {
      this.emitResourceUpdate();
    }
  }

  checkGameOver() {
    if (this.playerCastle.hp <= 0 || this.aiCastle.hp <= 0) {
      this.isGameOver = true;
      const winner = this.playerCastle.hp <= 0 ? "AI" : "Player";
      this.events.emit("game-over", winner);
      this.time.addEvent({
        delay: 100,
        callback: () => {
          this.playerUnits.forEach((unit) => unit.destroy());
          this.aiUnits.forEach((unit) => unit.destroy());
        }
      });
    }
  }

  aiDecision() {
    if (this.isGameOver) return;
    if (this.waveLocked) return;
    const aiPoints = this.controlPoints.filter((point) => point.owner === SIDE.AI).length;
    const playerPoints = this.controlPoints.filter((point) => point.owner === SIDE.PLAYER).length;
    let stanceId = "normal";
    if (this.aiCastle.hp < this.playerCastle.hp * 0.85) stanceId = "defensive";
    else if (aiPoints < playerPoints) stanceId = "aggressive";
    this.selectStance({ id: stanceId }, SIDE.AI);
    const offers = this.shop.ai?.offers || [];
    if (offers.length === 0) return;

    const draft = this.aiDraft || { front: [], mid: [], rear: [] };
    const queued = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    const queuedRoles = queued.reduce(
      (acc, id) => {
        const role = UNIT_TYPES[id]?.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      },
      { frontline: 0, damage: 0, support: 0, disruptor: 0 }
    );

    const pickOffer = (role) => offers.find((id) => UNIT_TYPES[id]?.role === role);
    const pickAffordable = () => {
      const affordable = offers.filter((id) => UNIT_TYPES[id]?.cost <= this.aiResources);
      if (affordable.length === 0) return null;
      return affordable.sort((a, b) => UNIT_TYPES[a].cost - UNIT_TYPES[b].cost)[0];
    };

    const needsFrontline = queuedRoles.frontline < 1;
    const needsSupport = queuedRoles.support < 1;

    if (needsFrontline) {
      const id = pickOffer("frontline");
      if (id && this.queueUnit({ id, fromShop: true }, SIDE.AI)) return;
    }

    if (needsSupport) {
      const id = pickOffer("support");
      if (id && this.queueUnit({ id, fromShop: true }, SIDE.AI)) return;
    }

    const disruptor = pickOffer("disruptor");
    if (disruptor && this.queueUnit({ id: disruptor, fromShop: true }, SIDE.AI)) return;

    const damage = pickOffer("damage");
    if (damage && this.queueUnit({ id: damage, fromShop: true }, SIDE.AI)) return;

    const fallback = pickAffordable();
    if (fallback) {
      this.queueUnit({ id: fallback, fromShop: true }, SIDE.AI);
      return;
    }

    const rerollCost = this.getRerollCost(SIDE.AI);
    if (this.aiResources >= rerollCost + 2) {
      this.requestShopReroll(SIDE.AI);
    }
  }
}
