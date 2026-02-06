import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units.js";
import { ABILITIES } from "../data/abilities.js";

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

    this.panelColor = 0x1f232d;
    this.panelStroke = 0x454c5b;
    this.accent = 0xe2d2b3;

    this.createPanels();
    this.createBottomLayout();
    this.createTopBar();
    this.createRoster();
    this.createAbilities();
    this.createBriefing();
    this.createFeed();
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

    this.gameScene.events.on("log", (entry) => this.pushFeed(entry));
  }

  createPanels() {
    this.topPanel = this.add.rectangle(0, 0, this.scale.width, 84, this.panelColor).setOrigin(0, 0);
    this.topPanel.setStrokeStyle(2, this.panelStroke, 1);

    this.bottomPanel = this.add.rectangle(0, this.scale.height - 200, this.scale.width, 200, this.panelColor).setOrigin(0, 0);
    this.bottomPanel.setStrokeStyle(2, this.panelStroke, 1);
  }

  createBottomLayout() {
    const bottomY = this.scale.height - 200;
    const contentY = bottomY + 14;
    const contentHeight = 172;
    const safeWidth = this.scale.width - 48;
    const gap = 16;

    let leftWidth = Math.floor((safeWidth - gap * 2) * 0.56);
    let midWidth = Math.floor((safeWidth - gap * 2) * 0.26);
    let rightWidth = safeWidth - gap * 2 - leftWidth - midWidth;
    const minRight = 200;

    if (rightWidth < minRight) {
      const deficit = minRight - rightWidth;
      leftWidth = Math.max(320, leftWidth - Math.ceil(deficit * 0.6));
      midWidth = Math.max(220, midWidth - Math.ceil(deficit * 0.4));
      rightWidth = safeWidth - gap * 2 - leftWidth - midWidth;
    }

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

    this.zoneLabel = this.add.text(this.scale.width / 2 - 80, 10, "Bridge Control", {
      fontFamily: "Cinzel",
      fontSize: "16px",
      color: "#e7e2d8"
    });

    this.zoneMeterBg = this.add.rectangle(this.scale.width / 2, 38, 200, 10, 0x2c313c).setOrigin(0.5, 0.5);
    this.zoneMeter = this.add.rectangle(this.scale.width / 2, 38, 80, 10, 0x6fa3d4).setOrigin(0.5, 0.5);
    this.zoneText = this.add.text(this.scale.width / 2 - 26, 50, "Neutral", {
      fontFamily: "Alegreya Sans",
      fontSize: "14px",
      color: "#b8c1d1"
    });

    this.momentumText = this.add.text(this.scale.width / 2 + 70, 50, "Momentum: --", {
      fontFamily: "Alegreya Sans",
      fontSize: "14px",
      color: "#b8c1d1"
    });

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

  createRoster() {
    const layout = this.bottomLayout;
    const headerY = layout.contentY;

    this.add.text(layout.leftX, headerY, "Troops", {
      fontFamily: "Cinzel",
      fontSize: "18px",
      color: "#f0e6d6"
    });
    this.add.text(layout.leftX + 90, headerY + 2, "Deploy to the bridge", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#9aa6ba"
    });

    this.buttons = [];
    const cols = 2;
    const colGap = 12;
    const rowGap = 10;
    const buttonHeight = 52;
    const buttonWidth = Math.floor((layout.leftWidth - colGap) / cols);
    const gridTop = headerY + 24;

    Object.values(UNIT_TYPES).forEach((unit, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = layout.leftX + col * (buttonWidth + colGap);
      const y = gridTop + row * (buttonHeight + rowGap);

      const btn = this.createButton(x, y, buttonWidth, buttonHeight, () => {
        this.gameScene.events.emit("spawn-request", unit.id);
      });

      btn.title.setText(unit.name);
      btn.subtitle.setText(`${ROLE_LABELS[unit.role]} | Cost ${unit.cost}`);
      btn.meta = { type: "unit", id: unit.id, cost: unit.cost };
      btn.roleTag.setText(unit.role === "frontline" ? "F" : unit.role === "damage" ? "D" : unit.role === "support" ? "S" : "X");
      btn.roleTagBg.setFillStyle(unit.role === "frontline" ? 0x5f7685 : unit.role === "damage" ? 0xa67f5d : unit.role === "support" ? 0x8fbf99 : 0xb35f5f);

      this.buttons.push(btn);
    });
  }

  createAbilities() {
    const layout = this.bottomLayout;
    const headerY = layout.contentY;

    this.add.text(layout.midX, headerY, "Castle Abilities", {
      fontFamily: "Cinzel",
      fontSize: "18px",
      color: "#f0e6d6"
    });
    this.add.text(layout.midX + 170, headerY + 2, "Cooldown only", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#9aa6ba"
    });

    this.abilityButtons = [];
    const buttonHeight = 54;
    const rowGap = 10;
    let y = headerY + 24;
    Object.values(ABILITIES).forEach((ability) => {
      const btn = this.createButton(layout.midX, y, layout.midWidth, buttonHeight, () => {
        this.gameScene.events.emit("ability-request", ability.id);
      });
      btn.title.setText(ability.name);
      btn.subtitle.setText(`Cooldown ${ability.cooldown}s`);
      btn.meta = { type: "ability", id: ability.id };
      btn.roleTag.setText("A");
      btn.roleTagBg.setFillStyle(0xd3b27c);
      btn.cooldownText = this.add.text(btn.rect.x + layout.midWidth - 70, btn.rect.y + 30, "", {
        fontFamily: "Alegreya Sans",
        fontSize: "12px",
        color: "#f3e6c6"
      });
      this.abilityButtons.push(btn);
      y += buttonHeight + rowGap;
    });
  }

  createBriefing() {
    const layout = this.bottomLayout;
    const headerY = layout.contentY;
    this.add.text(layout.rightX, headerY, "Command Brief", {
      fontFamily: "Cinzel",
      fontSize: "18px",
      color: "#f0e6d6"
    });

    this.instructions = this.add.text(layout.rightX, headerY + 24, "Goal: destroy the enemy castle.\nHold the bridge to gain income.\nUnits auto-fight once deployed.", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#b8c1d1",
      wordWrap: { width: layout.rightWidth }
    });
  }

  createFeed() {
    this.feed = [];
    this.feedPanel = this.add.rectangle(this.scale.width / 2 - 150, 58, 300, 26, 0x1b1f28, 0.8).setOrigin(0, 0);
    this.feedPanel.setStrokeStyle(1, 0x3d4554, 1);
    this.feedText = this.add.text(this.scale.width / 2 - 140, 62, "", {
      fontFamily: "Alegreya Sans",
      fontSize: "12px",
      color: "#c4ccda"
    });
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

  showTooltip(x, y, button) {
    if (!button || !button.meta) return;
    const meta = button.meta;
    if (meta.type === "unit") {
      const unit = UNIT_TYPES[meta.id];
      this.tooltipText.setText(
        `${unit.name}\n${unit.summary}\n${unit.special}\nHP ${unit.hp} | DMG ${unit.dmg}\nRange ${unit.range} | Speed ${unit.speed}`
      );
    } else if (meta.type === "ability") {
      const ability = ABILITIES[meta.id];
      const desc = ability.id === "healWave" ? "Heals nearby allies." : "Pushes and stuns enemies.";
      this.tooltipText.setText(`${ability.name}\n${desc}\nCooldown ${ability.cooldown}s`);
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

  pushFeed(entry) {
    const text = this.formatFeed(entry);
    if (!text) return;
    this.feed.unshift(text);
    if (this.feed.length > 3) this.feed.pop();
    this.feedText.setText(this.feed.join("\n"));
  }

  formatFeed(entry) {
    if (entry.type === "zone") {
      if (entry.owner === "neutral") return "Bridge zone is neutral";
      return entry.owner === "player" ? "Player controls the bridge" : "Enemy controls the bridge";
    }
    if (entry.type === "spawn") {
      return entry.side === "player" ? `Player deployed ${entry.name}` : `Enemy deployed ${entry.name}`;
    }
    if (entry.type === "ability") {
      return `Ability used: ${entry.name}`;
    }
    if (entry.type === "castle-hit") {
      return entry.side === "player" ? "Your castle is under attack" : "Enemy castle is under attack";
    }
    return "";
  }

  update() {
    const playerRes = this.gameScene.playerResources;
    const playerIncome = this.gameScene.baseIncome + (this.gameScene.zoneOwner === "player" ? this.gameScene.zoneBonus : 0);
    this.resourceText.setText(`Resources: ${playerRes.toFixed(1)}`);
    this.incomeText.setText(`Income: +${playerIncome.toFixed(1)} /s`);

    const zoneOwner = this.gameScene.zoneOwner;
    this.zoneText.setText(zoneOwner === "neutral" ? "Neutral" : zoneOwner === "player" ? "Player" : "Enemy");
    this.zoneText.setColor(zoneOwner === "player" ? "#9ec9f0" : zoneOwner === "ai" ? "#f0b5b5" : "#b8c1d1");
    this.zoneMeter.setFillStyle(zoneOwner === "player" ? 0x6fa3d4 : zoneOwner === "ai" ? 0xb36a6a : 0x4a5160, 1);
    this.zoneMeter.width = zoneOwner === "neutral" ? 60 : 140;

    const momentum = zoneOwner === "player" ? "->" : zoneOwner === "ai" ? "<-" : "--";
    this.momentumText.setText(`Momentum: ${momentum}`);

    const playerHpRatio = this.gameScene.playerCastle.hp / this.gameScene.playerCastle.maxHp;
    const aiHpRatio = this.gameScene.aiCastle.hp / this.gameScene.aiCastle.maxHp;
    this.playerHpBar.fill.width = this.playerHpBar.width * playerHpRatio;
    this.aiHpBar.fill.width = this.aiHpBar.width * aiHpRatio;
    this.playerHpText.setText(`Castle: ${Math.ceil(this.gameScene.playerCastle.hp)}`);
    this.aiHpText.setText(`Enemy: ${Math.ceil(this.gameScene.aiCastle.hp)}`);

    for (const btn of this.buttons) {
      const enabled = playerRes >= btn.meta.cost && !this.gameScene.isGameOver;
      btn.rect.setAlpha(enabled ? 1 : 0.45);
    }

    for (const btn of this.abilityButtons) {
      const cd = this.gameScene.abilityCooldowns[btn.meta.id];
      const enabled = cd <= 0 && !this.gameScene.isGameOver;
      btn.rect.setAlpha(enabled ? 1 : 0.45);
      btn.cooldownText.setText(cd > 0 ? `${cd.toFixed(1)}s` : "Ready");
    }
  }
}
