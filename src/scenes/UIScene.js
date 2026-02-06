import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units.js";
import { ABILITIES } from "../data/abilities.js";
import { SHOP_CONFIG } from "../data/shop.js";
import { STANCES } from "../data/stances.js";

const ROLE_LABELS = {
  frontline: "Frontline",
  damage: "Damage",
  support: "Support",
  disruptor: "Disruptor"
};

export default class UIScene extends Phaser.Scene {
  constructor() {
    super("UI");
  }

  create() {
    this.gameScene = this.scene.get("Game");
    this.activeSlot = "mid";
    this.activeSlotIndex = null;

    this.panelColor = 0x1f232d;
    this.panelStroke = 0x454c5b;
    this.accent = 0xe2d2b3;

    this.createPanels();
    this.layoutTopBar();
    this.createBottomLayout();
    this.createTopBar();
    this.createShop();
    this.createAbilities();
    this.createWaveBuilder();
    this.createTooltip();

    this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, "", {
      fontFamily: "Cinzel",
      fontSize: "34px",
      color: "#f3ead7"
    });
    this.gameOverText.setOrigin(0.5, 0.5).setVisible(false);

    this.gameScene.events.on("game-over", (winner) => {
      this.gameOverText.setText(`${winner} wins`);
      this.gameOverText.setVisible(true);
    });

  }

  createPanels() {
    this.topPanel = this.add.rectangle(0, 0, this.scale.width, 84, this.panelColor).setOrigin(0, 0);
    this.topPanel.setStrokeStyle(2, this.panelStroke, 1);

    this.bottomPanel = this.add.rectangle(0, this.scale.height - 200, this.scale.width, 200, this.panelColor).setOrigin(0, 0);
    this.bottomPanel.setStrokeStyle(2, this.panelStroke, 1);
  }

  layoutTopBar() {
    const barHeight = 84;
    const barTop = 0;
    const centerX = this.scale.width / 2;
    const midY = barTop + barHeight / 2;
    const lineGap = 28;
    const line1Y = midY - lineGap / 2;
    const line2Y = midY + lineGap / 2;
    const ringRadius = 14;
    const labelGapX = 30;
    const pipGap = 22;
    const pipStartX = centerX - pipGap * 2;

    this.topBarLayout = {
      barHeight,
      barTop,
      centerX,
      midY,
      line1Y,
      line2Y,
      ringRadius,
      labelGapX,
      pipGap,
      pipStartX
    };
  }

  createBottomLayout() {
    const bottomY = this.scale.height - 200;
    const contentY = bottomY + 14;
    const contentHeight = 172;
    const safeWidth = this.scale.width - 48;
    const gap = 16;

    const columnWidth = Math.floor((safeWidth - gap * 2) / 3);
    const leftWidth = columnWidth;
    const midWidth = columnWidth;
    const rightWidth = safeWidth - gap * 2 - leftWidth - midWidth;

    const leftX = 24;
    const midX = leftX + leftWidth + gap;
    const rightX = midX + midWidth + gap;

    this.bottomLayout = {
      y: bottomY,
      contentY,
      contentHeight,
      leftX,
      leftWidth,
      midX,
      midWidth,
      rightX,
      rightWidth,
      gap
    };

    const dividerHeight = contentHeight + 6;
    const dividerY = contentY - 3;
    this.add.rectangle(midX - gap / 2, dividerY, 1, dividerHeight, 0x3d4554, 0.9).setOrigin(0, 0);
    this.add.rectangle(rightX - gap / 2, dividerY, 1, dividerHeight, 0x3d4554, 0.9).setOrigin(0, 0);
  }

  createTopBar() {
    const layout = this.topBarLayout;

    this.resourceText = this.add.text(24, 10, "Resources", {
      fontFamily: "Alegreya Sans",
      fontSize: "20px",
      color: "#f0e6d6"
    });
    this.incomeText = this.add.text(24, 30, "Income", {
      fontFamily: "Alegreya Sans",
      fontSize: "14px",
      color: "#b8c1d1"
    });

    const infoX = 172;
    this.incomeInfoBg = this.add.circle(infoX, 36, 8, 0x2c313c).setStrokeStyle(1, 0x5b616e, 1);
    this.incomeInfoText = this.add.text(infoX, 36, "i", {
      fontFamily: "Cinzel",
      fontSize: "12px",
      color: "#e7e2d8"
    });
    this.incomeInfoText.setOrigin(0.5, 0.5);
    this.incomeInfoBg.setInteractive({ useHandCursor: true });
    this.incomeInfoBg.on("pointerover", () => {
      this.showTooltip(infoX + 12, 10, { meta: { type: "interest" } });
    });
    this.incomeInfoBg.on("pointerout", () => this.hideTooltip());

    this.controlPips = [];
    const pipStart = layout.pipStartX;
    for (let i = 0; i < 5; i += 1) {
      const pip = this.add.circle(pipStart + i * layout.pipGap, layout.line2Y, 6, 0x3a3f4f, 0.9).setStrokeStyle(1, 0x5b616e, 1);
      this.controlPips.push(pip);
    }

    this.createWaveTimer();

    this.playerHpBar = this.createBar(24, 60, 220, 10, 0x5f7685);
    this.aiHpBar = this.createBar(this.scale.width - 244, 60, 220, 10, 0x8a5a5a);
    this.playerHpText = this.add.text(24, 72, "Castle", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#b8c1d1"
    });
    this.aiHpText = this.add.text(this.scale.width - 244, 72, "Enemy", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#b8c1d1"
    });
  }

  createWaveTimer() {
    const layout = this.topBarLayout;
    const centerX = layout.centerX;
    const ringY = layout.line1Y;
    const radius = layout.ringRadius;

    this.waveRingBg = this.add.graphics();
    this.waveRing = this.add.graphics();

    this.waveCountdownText = this.add.text(centerX, ringY, "--", {
      fontFamily: "Cinzel",
      fontSize: "12px",
      color: "#f3ead7"
    });
    this.waveCountdownText.setOrigin(0.5, 0.5);

    this.waveLabelText = this.add.text(centerX - layout.labelGapX, ringY, "Wave 1", {
      fontFamily: "Alegreya Sans",
      fontSize: "10px",
      color: "#b8c1d1"
    });
    this.waveLabelText.setOrigin(1, 0.5);

    this.wavePhaseText = this.add.text(centerX + layout.labelGapX, ringY, "Early", {
      fontFamily: "Alegreya Sans",
      fontSize: "10px",
      color: "#b8c1d1"
    });
    this.wavePhaseText.setOrigin(0, 0.5);
  }

  createShop() {
    const layout = this.bottomLayout;
    const headerY = layout.contentY;

    this.add.text(layout.leftX, headerY, "Shop", {
      fontFamily: "Cinzel",
      fontSize: "18px",
      color: "#f0e6d6"
    });
    this.add.text(layout.leftX + 62, headerY + 2, "Buy into the wave", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#9aa6ba"
    });

    const rerollX = layout.leftX + layout.leftWidth - 64;
    this.shopRerollBtn = this.createMiniButton(rerollX, headerY + 2, 22, "R", () => {
      this.gameScene.events.emit("shop-reroll");
    });
    this.shopRerollLabel = this.add.text(rerollX + 28, headerY + 2, "Reroll", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#d4c7b0"
    });
    this.shopRerollCost = this.add.text(rerollX + 28, headerY + 16, "Cost 0", {
      fontFamily: "Alegreya Sans",
      fontSize: "10px",
      color: "#9aa6ba"
    });

    this.shopCards = [];
    const cols = 2;
    const colGap = 12;
    const rowGap = 10;
    const buttonHeight = 54;
    const buttonWidth = Math.floor((layout.leftWidth - colGap) / cols);
    const gridTop = headerY + 26;

    for (let i = 0; i < SHOP_CONFIG.offersPerWave; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = layout.leftX + col * (buttonWidth + colGap);
      const y = gridTop + row * (buttonHeight + rowGap);

      const btn = this.createButton(x, y, buttonWidth, buttonHeight, () => {});
      btn.meta = { type: "shop", id: null };

      btn.rect.on("pointerup", () => {
        if (this.isDraggingShop) return;
        if (this.gameScene.isGameOver || this.gameScene.waveLocked) return;
        if (!btn.meta.id) return;
        const payload = { id: btn.meta.id, slot: this.activeSlot, fromShop: true };
        if (this.activeSlotIndex !== null) payload.index = this.activeSlotIndex;
        this.gameScene.events.emit("queue-add", payload);
        this.activeSlotIndex = null;
      });

      this.input.setDraggable(btn.rect);
      this.shopCards.push(btn);
    }

    this.isDraggingShop = false;
    this.dragGhost = null;
    this.input.on("dragstart", (pointer, gameObject) => {
      if (!gameObject.meta || gameObject.meta.type !== "shop") return;
      if (!gameObject.meta.id) return;
      if (this.gameScene.waveLocked || this.gameScene.isGameOver) return;
      this.isDraggingShop = true;
      const unit = UNIT_TYPES[gameObject.meta.id];
      if (!unit) return;
      const ghost = this.add.container(pointer.x, pointer.y);
      const bg = this.add.rectangle(0, 0, 34, 34, unit.color, 0.8).setStrokeStyle(2, 0x1c1f27, 1);
      const text = this.add.text(0, 0, unit.name.charAt(0), {
        fontFamily: "Cinzel",
        fontSize: "16px",
        color: "#f7f2e6"
      });
      text.setOrigin(0.5, 0.5);
      ghost.add([bg, text]);
      ghost.setDepth(20);
      this.dragGhost = { container: ghost, id: unit.id };
    });

    this.input.on("drag", (pointer) => {
      if (!this.dragGhost) return;
      this.dragGhost.container.setPosition(pointer.x, pointer.y);
    });

    this.input.on("dragend", (pointer) => {
      if (!this.dragGhost) return;
      const dropped = this.findDropSlot(pointer.x, pointer.y);
      if (dropped) {
        const payload = { id: this.dragGhost.id, slot: dropped.row, index: dropped.index, fromShop: true };
        this.gameScene.events.emit("queue-add", payload);
        this.activeSlotIndex = null;
      }
      this.dragGhost.container.destroy();
      this.dragGhost = null;
      this.isDraggingShop = false;
    });
  }

  createAbilities() {
    const layout = this.bottomLayout;
    const headerY = layout.contentY;

    this.add.text(layout.rightX, headerY, "Castle Abilities", {
      fontFamily: "Cinzel",
      fontSize: "18px",
      color: "#f0e6d6"
    });
    this.add.text(layout.rightX + 170, headerY + 2, "Cooldown only", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#9aa6ba"
    });

    this.abilityButtons = [];
    const buttonHeight = 54;
    const rowGap = 10;
    let y = headerY + 24;
    Object.values(ABILITIES).forEach((ability) => {
      const btn = this.createButton(layout.rightX, y, layout.rightWidth, buttonHeight, () => {
        this.gameScene.events.emit("ability-request", ability.id);
      });
      btn.title.setText(ability.name);
      btn.subtitle.setText(`Cooldown ${ability.cooldown}s`);
      btn.meta = { type: "ability", id: ability.id };
      btn.roleTag.setText("A");
      btn.roleTagBg.setFillStyle(0xd3b27c);
      btn.cooldownText = this.add.text(btn.rect.x + layout.rightWidth - 70, btn.rect.y + 30, "", {
        fontFamily: "Alegreya Sans",
        fontSize: "12px",
        color: "#f3e6c6"
      });
      this.abilityButtons.push(btn);
      y += buttonHeight + rowGap;
    });
  }

  createWaveBuilder() {
    const layout = this.bottomLayout;
    const headerY = layout.contentY;
    const interval = Math.round(this.gameScene.getWaveInterval(0) || 45);
    this.add.text(layout.midX, headerY, "Wave Builder", {
      fontFamily: "Cinzel",
      fontSize: "18px",
      color: "#f0e6d6"
    });
    this.add.text(layout.midX + 120, headerY + 2, `Auto ${interval}s`, {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#9aa6ba"
    });

    const infoWidth = Math.max(120, layout.midWidth - 170);
    this.waveQueueText = this.add.text(layout.midX, headerY + 24, "Queue: 0", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#b8c1d1",
      wordWrap: { width: infoWidth }
    });

    const stanceLabelY = headerY + 44;
    this.add.text(layout.midX, stanceLabelY, "Stance", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#9aa6ba"
    });

    const stanceIds = ["normal", "defensive", "aggressive"];
    const stanceLabel = { normal: "N", defensive: "D", aggressive: "A" };
    const stanceY = stanceLabelY + 16;
    const stanceStartX = layout.midX + 56;
    const stanceGap = 8;
    this.stanceButtons = {};
    stanceIds.forEach((id, index) => {
      const btn = this.createMiniButton(
        stanceStartX + index * (22 + stanceGap),
        stanceY,
        22,
        stanceLabel[id],
        () => {
          this.gameScene.events.emit("stance-select", { id });
        }
      );
      btn.rect.meta = { type: "stance", id };
      this.stanceButtons[id] = btn;
    });

    const rowSlots = this.gameScene.waveSlots || { front: 4, mid: 4, rear: 4 };
    const maxSlots = Math.max(rowSlots.front, rowSlots.mid, rowSlots.rear);
    const labelWidth = 54;
    const rowGap = 8;
    const gridTop = headerY + 86;
    const slotStartX = layout.midX + labelWidth + 10;
    const slotAreaWidth = layout.midWidth - labelWidth - 10;
    let slotGap = 8;
    let slotSize = Math.floor((slotAreaWidth - (maxSlots - 1) * slotGap) / maxSlots);
    if (slotSize < 28) {
      slotGap = 4;
      slotSize = Math.floor((slotAreaWidth - (maxSlots - 1) * slotGap) / maxSlots);
    }
    slotSize = Math.max(22, Math.min(30, slotSize));

    const rows = [
      { id: "front", label: "Front", color: 0x5f7685 },
      { id: "mid", label: "Mid", color: 0xa67f5d },
      { id: "rear", label: "Rear", color: 0x8fbf99 }
    ];

    this.slotTiles = [];
    this.rowButtons = {};

    rows.forEach((row, rowIndex) => {
      const rowY = gridTop + rowIndex * (slotSize + rowGap);
      const rowBg = this.add.rectangle(layout.midX, rowY, labelWidth, slotSize, 0x242a36).setOrigin(0, 0);
      rowBg.setStrokeStyle(1, row.color, 1);
      rowBg.setInteractive({ useHandCursor: true });
      rowBg.on("pointerdown", () => {
        if (this.gameScene.waveLocked) return;
        this.activeSlot = row.id;
        this.activeSlotIndex = null;
      });
      const rowText = this.add.text(layout.midX + labelWidth / 2, rowY + slotSize / 2, row.label, {
        fontFamily: "Cinzel",
        fontSize: "12px",
        color: "#e7e2d8"
      });
      rowText.setOrigin(0.5, 0.5);
      this.rowButtons[row.id] = { bg: rowBg, text: rowText, color: row.color };

      const slotsInRow = rowSlots[row.id] || 0;
      for (let i = 0; i < slotsInRow; i += 1) {
        const x = slotStartX + i * (slotSize + slotGap);
        const rect = this.add.rectangle(x, rowY, slotSize, slotSize, 0x2b303b).setOrigin(0, 0);
        rect.setStrokeStyle(1, 0x4a5160, 1);
        rect.setInteractive({ useHandCursor: true });
        const icon = this.add.rectangle(x + slotSize / 2, rowY + slotSize / 2, slotSize - 6, slotSize - 6, 0x1c202a);
        icon.setStrokeStyle(1, 0x3f4656, 1);
        const iconText = this.add.text(x + slotSize / 2, rowY + slotSize / 2, "+", {
          fontFamily: "Cinzel",
          fontSize: "14px",
          color: "#6f7a8c"
        });
        iconText.setOrigin(0.5, 0.5);

        rect.on("pointerdown", () => {
          if (this.gameScene.waveLocked) return;
          this.activeSlot = row.id;
          const draft = this.gameScene.playerDraft;
          const list = draft ? draft[row.id] || [] : [];
          const current = list[i];
          if (current) {
            this.gameScene.events.emit("queue-remove", { id: current, slot: row.id, index: i });
            this.activeSlotIndex = null;
          } else {
            this.activeSlotIndex = i;
          }
        });

        this.slotTiles.push({ row: row.id, index: i, rect, icon, iconText, color: row.color });
      }
    });

  }

  findDropSlot(x, y) {
    for (const tile of this.slotTiles || []) {
      const bounds = tile.rect.getBounds();
      if (Phaser.Geom.Rectangle.Contains(bounds, x, y)) {
        return tile;
      }
    }
    return null;
  }

  createTooltip() {
    this.tooltip = this.add.container(0, 0);
    this.tooltipBg = this.add.rectangle(0, 0, 240, 100, 0x1f232d, 0.95).setOrigin(0, 0);
    this.tooltipBg.setStrokeStyle(1, this.panelStroke, 1);
    this.tooltipText = this.add.text(10, 8, "", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#f0e6d6",
      wordWrap: { width: 220 }
    });
    this.tooltip.add([this.tooltipBg, this.tooltipText]);
    this.tooltip.setDepth(10);
    this.tooltip.setVisible(false);
  }

  createBar(x, y, width, height, color) {
    const bg = this.add.rectangle(x, y, width, height, 0x2d2f38).setOrigin(0, 0);
    const fill = this.add.rectangle(x, y, width, height, color).setOrigin(0, 0);
    return { bg, fill, width };
  }

  createButton(x, y, width, height, onClick) {
    const rect = this.add.rectangle(x, y, width, height, 0x2b303b).setOrigin(0, 0);
    rect.setStrokeStyle(2, 0x4a5160, 1);
    rect.setInteractive({ useHandCursor: true });

    const roleTagBg = this.add.rectangle(x + 16, y + 16, 24, 22, 0x5f7685).setOrigin(0.5, 0.5);
    roleTagBg.setStrokeStyle(1, 0x1c1f27, 1);
    const roleTag = this.add.text(x + 16, y + 16, "", {
      fontFamily: "Cinzel",
      fontSize: "12px",
      color: "#f3ead7"
    });
    roleTag.setOrigin(0.5, 0.5);

    const title = this.add.text(x + 40, y + 6, "", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#f0e6d6"
    });
    const subtitle = this.add.text(x + 40, y + 28, "", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#b8c1d1"
    });

    rect.on("pointerover", () => {
      rect.setFillStyle(0x3a4150);
      this.showTooltip(rect.x + width + 10, rect.y, rect.meta);
    });
    rect.on("pointerout", () => {
      rect.setFillStyle(0x2b303b);
      this.hideTooltip();
    });
    rect.on("pointerdown", () => onClick());

    const button = { rect, title, subtitle, roleTag, roleTagBg, meta: null };
    rect.meta = button;
    return button;
  }

  createMiniButton(x, y, size, label, onClick) {
    const rect = this.add.rectangle(x, y, size, size, 0x2b303b).setOrigin(0, 0);
    rect.setStrokeStyle(1, 0x4a5160, 1);
    rect.setInteractive({ useHandCursor: true });
    const text = this.add.text(x + size / 2, y + size / 2, label, {
      fontFamily: "Cinzel",
      fontSize: "12px",
      color: "#f3ead7"
    });
    text.setOrigin(0.5, 0.5);
    rect.on("pointerover", () => {
      rect.setFillStyle(0x3a4150);
      this.showTooltip(rect.x + size + 8, rect.y, { meta: rect.meta });
    });
    rect.on("pointerout", () => {
      rect.setFillStyle(0x2b303b);
      this.hideTooltip();
    });
    rect.on("pointerdown", () => onClick());
    return { rect, text };
  }

  showTooltip(x, y, button) {
    if (!button || !button.meta) return;
    const meta = button.meta;
    if (meta.type === "unit" || meta.type === "shop") {
      if (!meta.id) return;
      const unit = UNIT_TYPES[meta.id];
      this.tooltipText.setText(
        `${unit.name}\n${unit.summary}\n${unit.special}\nHP ${unit.hp} | DMG ${unit.dmg}\nRange ${unit.range} | Speed ${unit.speed}`
      );
    } else if (meta.type === "stance") {
      const stance = STANCES[meta.id];
      if (!stance) return;
      this.tooltipText.setText(`${stance.name}\n${stance.summary}`);
    } else if (meta.type === "ability") {
      const ability = ABILITIES[meta.id];
      const desc = ability.id === "healWave" ? "Heals all allies across the board." : "Pushes and stuns enemies on your platform.";
      this.tooltipText.setText(`${ability.name}\n${desc}\nCooldown ${ability.cooldown}s`);
    } else if (meta.type === "interest") {
      const details = this.gameScene.getIncomeDetails("player");
      const cap = this.gameScene.interestCap;
      const rate = Math.round(this.gameScene.interestRate * 100);
      this.tooltipText.setText(
        `Income Breakdown\nBase +${details.base.toFixed(2)}/s\nPoints +${details.pointBonus.toFixed(2)}/s\nEnemy Points +${details.enemyBonus.toFixed(2)}/s\nInterest ${rate}% (cap ${cap})\nSavings +${details.interest.toFixed(2)}/s`
      );
    }
    this.tooltipBg.height = this.tooltipText.height + 18;
    this.tooltipBg.width = 240;
    const maxX = this.scale.width - this.tooltipBg.width - 12;
    const maxY = this.scale.height - this.tooltipBg.height - 12;
    this.tooltip.setPosition(Math.min(x, maxX), Math.min(y, maxY));
    this.tooltip.setVisible(true);
  }

  hideTooltip() {
    this.tooltip.setVisible(false);
  }

  update() {
    const playerRes = this.gameScene.playerResources;
    const incomeDetails = this.gameScene.getIncomeDetails("player");
    this.resourceText.setText(`Resources: ${playerRes.toFixed(1)}`);
    this.incomeText.setText(`Income: +${incomeDetails.total.toFixed(2)} /s`);

    const controlPoints = this.gameScene.controlPoints || [];
    const totalPoints = controlPoints.length || 5;
    const playerCount = controlPoints.filter((p) => p.owner === "player").length;
    const zoneOwner = this.gameScene.zoneOwner;

    for (let i = 0; i < this.controlPips.length; i += 1) {
      const point = controlPoints[i];
      const tint =
        point && point.owner === "player"
          ? 0x6fa3d4
          : point && point.owner === "ai"
          ? 0xb36a6a
          : 0x3a3f4f;
      this.controlPips[i].setFillStyle(tint, 0.9);
    }

    const playerHpRatio = this.gameScene.playerCastle.hp / this.gameScene.playerCastle.maxHp;
    const aiHpRatio = this.gameScene.aiCastle.hp / this.gameScene.aiCastle.maxHp;
    this.playerHpBar.fill.width = this.playerHpBar.width * playerHpRatio;
    this.aiHpBar.fill.width = this.aiHpBar.width * aiHpRatio;
    this.playerHpText.setText(`Castle: ${Math.ceil(this.gameScene.playerCastle.hp)}`);
    this.aiHpText.setText(`Enemy: ${Math.ceil(this.gameScene.aiCastle.hp)}`);

    const shopOffers = this.gameScene.shop?.player?.offers || [];
    for (let i = 0; i < this.shopCards.length; i += 1) {
      const card = this.shopCards[i];
      const id = shopOffers[i] || null;
      if (id) {
        const unit = UNIT_TYPES[id];
        card.title.setText(unit.name);
        card.subtitle.setText(`${ROLE_LABELS[unit.role]} | Buy ${unit.cost}`);
        card.meta = { type: "shop", id: unit.id, cost: unit.cost };
        card.roleTag.setText(unit.role === "frontline" ? "F" : unit.role === "damage" ? "D" : unit.role === "support" ? "S" : "X");
        card.roleTagBg.setFillStyle(unit.role === "frontline" ? 0x5f7685 : unit.role === "damage" ? 0xa67f5d : unit.role === "support" ? 0x8fbf99 : 0xb35f5f);
        const enabled = playerRes >= unit.cost && !this.gameScene.isGameOver && !this.gameScene.waveLocked;
        card.rect.setAlpha(enabled ? 1 : 0.45);
      } else {
        card.title.setText("No offer");
        card.subtitle.setText("--");
        card.meta = { type: "shop", id: null, cost: 0 };
        card.roleTag.setText("-");
        card.roleTagBg.setFillStyle(0x3a4150);
        card.rect.setAlpha(0.35);
      }
    }

    const draft = this.gameScene.playerDraft || { front: [], mid: [], rear: [] };
    const waveSupply = this.gameScene.waveSupply || 0;
    const waveCountdown = Math.max(0, this.gameScene.waveCountdown || 0);
    const interval = Math.round(this.gameScene.getWaveInterval(this.gameScene.matchTime || 0));
    const locked = this.gameScene.waveLocked;

    const slotIds = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    const totalQueued = slotIds.length;
    const sendCount = Math.min(slotIds.length, waveSupply);
    const lockLabel = locked ? " | Locked" : "";
    this.waveQueueText.setText(
      `Queue: ${totalQueued} | Supply: ${slotIds.length}/${waveSupply} | Auto ${interval}s${lockLabel}`
    );

    const rerollCost = this.gameScene.getRerollCost("player");
    const rerollEnabled = playerRes >= rerollCost && !this.gameScene.isGameOver && !this.gameScene.waveLocked;
    this.shopRerollBtn.rect.setAlpha(rerollEnabled ? 1 : 0.45);
    this.shopRerollBtn.text.setAlpha(rerollEnabled ? 1 : 0.45);
    this.shopRerollCost.setText(`Cost ${rerollCost}`);

    const currentStance = this.gameScene.waveStance?.player || "normal";
    Object.entries(this.stanceButtons || {}).forEach(([id, btn]) => {
      const isActive = currentStance === id;
      btn.rect.setFillStyle(isActive ? 0x3a4150 : 0x2b303b);
      btn.rect.setAlpha(locked ? 0.6 : 1);
      btn.text.setAlpha(locked ? 0.6 : 1);
    });

    Object.entries(this.rowButtons || {}).forEach(([slot, btn]) => {
      const isActive = this.activeSlot === slot;
      btn.bg.setFillStyle(isActive ? 0x2f3848 : 0x242a36);
      btn.text.setColor(isActive ? "#f8f0dc" : "#e7e2d8");
      btn.bg.setAlpha(locked ? 0.6 : 1);
      btn.text.setAlpha(locked ? 0.6 : 1);
    });

    for (const tile of this.slotTiles || []) {
      const list = draft[tile.row] || [];
      const unitId = list[tile.index];
      const isActive = this.activeSlot === tile.row && this.activeSlotIndex === tile.index;
      tile.rect.setStrokeStyle(isActive ? 2 : 1, isActive ? 0xe2d2b3 : 0x4a5160, 1);
      tile.rect.setAlpha(locked ? 0.6 : 1);
      tile.icon.setAlpha(locked ? 0.6 : 1);
      tile.iconText.setAlpha(locked ? 0.6 : 1);

      if (unitId) {
        const unit = UNIT_TYPES[unitId];
        tile.icon.setFillStyle(unit.color);
        tile.iconText.setText(unit.name.charAt(0));
        tile.iconText.setColor("#f7f2e6");
      } else {
        tile.icon.setFillStyle(0x1c202a);
        tile.iconText.setText("+");
        tile.iconText.setColor("#6f7a8c");
      }
    }


    for (const btn of this.abilityButtons) {
      const cd = this.gameScene.abilityCooldowns[btn.meta.id];
      const enabled = cd <= 0 && !this.gameScene.isGameOver;
      btn.rect.setAlpha(enabled ? 1 : 0.45);
      btn.cooldownText.setText(cd > 0 ? `${cd.toFixed(1)}s` : "Ready");
    }

    this.updateWaveTimer(waveCountdown, interval, locked);
  }

  updateWaveTimer(waveCountdown, interval, locked) {
    if (!this.waveRing || !this.waveRingBg) return;
    const layout = this.topBarLayout;
    const centerX = layout.centerX;
    const ringY = layout.line1Y;
    const radius = layout.ringRadius;
    const progress = Phaser.Math.Clamp(1 - waveCountdown / Math.max(1, interval), 0, 1);
    const pulse = waveCountdown <= 5 ? 0.6 + 0.4 * Math.sin(this.time.now / 120) : 1;
    const ringColor = locked ? 0xd6b37d : waveCountdown <= 5 ? 0xe09a6a : 0x7aa3c2;

    this.waveRingBg.clear();
    this.waveRingBg.lineStyle(2, 0x3a4252, 0.9);
    this.waveRingBg.strokeCircle(centerX, ringY, radius);

    this.waveRing.clear();
    this.waveRing.lineStyle(2, ringColor, pulse);
    const startAngle = Phaser.Math.DegToRad(-90);
    const endAngle = startAngle + Phaser.Math.DegToRad(360 * progress);
    this.waveRing.beginPath();
    this.waveRing.arc(centerX, ringY, radius, startAngle, endAngle, false);
    this.waveRing.strokePath();

    const countdownLabel = waveCountdown <= 0.1 ? "Now" : `${Math.ceil(waveCountdown)}`;
    this.waveCountdownText.setText(countdownLabel);

    const waveNumber = this.gameScene.waveNumber || 0;
    this.waveLabelText.setText(`Wave ${waveNumber + 1}`);

    const schedule = this.gameScene.waveSchedule || [];
    let stageIndex = 0;
    const matchTime = this.gameScene.matchTime || 0;
    for (let i = 0; i < schedule.length; i += 1) {
      if (matchTime >= schedule[i].time) stageIndex = i;
    }
    const phaseLabels = ["Early", "Mid", "Late", "Final"];
    const phaseLabel = phaseLabels[stageIndex] || `Phase ${stageIndex + 1}`;
    this.wavePhaseText.setText(phaseLabel);
  }
}
