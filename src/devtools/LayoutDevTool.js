import Phaser from "phaser";
import { createDefaultLayoutProfile } from "../config/GameConfig.js";

export default class LayoutDevTool {
  constructor(scene) {
    this.scene = scene;
    this.enabled = false;
    this.selectedId = null;
    this.handles = [];
    this.pointerDown = false;
    this.dirty = false;
    this.toggleKey = null;
    this.keys = {};
    this.panel = null;
  }

  setup() {
    if (!this.scene.input?.keyboard) return;

    this.toggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keys = {
      shift: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      left: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    };

    this.scene.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      if (!this.enabled) return;
      const selected = this.handles.find((h) => h.id === this.selectedId);
      if (!selected || !selected.onWheel) return;
      selected.onWheel(dy);
      this.commit();
    });

    this.createPanel();
  }

  handleInput() {
    if (this.toggleKey && Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.toggle();
    }
    if (!this.enabled || !this.scene.input?.keyboard) return;

    const nudge = this.keys.shift.isDown ? 5 : 1;
    const selected = this.handles.find((h) => h.id === this.selectedId);
    if (!selected || !selected.set) return;

    const pos = selected.get();
    let changed = false;
    if (this.scene.input.keyboard.checkDown(this.keys.left, 30)) {
      pos.x -= nudge;
      changed = true;
    }
    if (this.scene.input.keyboard.checkDown(this.keys.right, 30)) {
      pos.x += nudge;
      changed = true;
    }
    if (this.scene.input.keyboard.checkDown(this.keys.up, 30)) {
      pos.y -= nudge;
      changed = true;
    }
    if (this.scene.input.keyboard.checkDown(this.keys.down, 30)) {
      pos.y += nudge;
      changed = true;
    }
    if (changed) {
      selected.set(pos.x, pos.y);
      this.commit();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.scene.clearCombatUnits();
      this.setupHandles();
      this.selectedId = this.handles[0]?.id || null;
      this.syncPanel();
      return;
    }
    this.destroyHandles();
    this.syncPanel();
  }

  createPanel() {
    if (typeof document === "undefined") return;
    const panel = document.createElement("div");
    panel.id = "layout-dev-panel";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.top = "16px";
    panel.style.width = "300px";
    panel.style.padding = "10px";
    panel.style.background = "rgba(11, 14, 20, 0.88)";
    panel.style.border = "1px solid rgba(180, 188, 204, 0.35)";
    panel.style.borderRadius = "8px";
    panel.style.color = "#e8edf7";
    panel.style.font = "12px/1.4 monospace";
    panel.style.zIndex = "9999";
    panel.style.display = "none";
    panel.innerHTML = `
      <div style="margin-bottom:6px; font-weight:700;">Layout Dev Tool</div>
      <div style="margin-bottom:8px; opacity:0.85;">Toggle: K. Drag handles to move, wheel to resize selected.</div>
      <div data-layout-info style="margin-bottom:8px; min-height:48px;"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button data-layout-copy type="button">Copy JSON</button>
        <button data-layout-save type="button">Save</button>
        <button data-layout-reset type="button">Reset</button>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-mirror type="checkbox" checked /> Mirror
        </label>
      </div>
      <div style="display:flex; gap:10px; margin-top:8px; flex-wrap:wrap;">
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-pillars type="checkbox" /> Pillars
        </label>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-ropes type="checkbox" /> Ropes
        </label>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-controlfx type="checkbox" /> Control FX
        </label>
      </div>
    `;
    document.body.appendChild(panel);

    const copyBtn = panel.querySelector("[data-layout-copy]");
    const saveBtn = panel.querySelector("[data-layout-save]");
    const resetBtn = panel.querySelector("[data-layout-reset]");
    const mirrorBox = panel.querySelector("[data-layout-mirror]");
    const pillarsBox = panel.querySelector("[data-layout-pillars]");
    const ropesBox = panel.querySelector("[data-layout-ropes]");
    const controlFxBox = panel.querySelector("[data-layout-controlfx]");

    copyBtn?.addEventListener("click", () => this.scene.exportLayoutProfile());
    saveBtn?.addEventListener("click", () => this.scene.saveLayoutProfile());
    resetBtn?.addEventListener("click", () => {
      this.scene.layoutProfile = createDefaultLayoutProfile();
      this.scene.computeBoardLayout();
      this.scene.rebuildLayoutVisuals();
      this.setupHandles();
      this.scene.saveLayoutProfile();
      this.syncPanel();
    });
    mirrorBox?.addEventListener("change", (event) => {
      this.scene.layoutProfile.mirrorMode = Boolean(event.target?.checked);
      this.commit();
    });
    pillarsBox?.addEventListener("change", (event) => {
      this.scene.layoutProfile.bridge.showPillars = Boolean(event.target?.checked);
      this.commit();
    });
    ropesBox?.addEventListener("change", (event) => {
      this.scene.layoutProfile.bridge.showRopes = Boolean(event.target?.checked);
      this.commit();
    });
    controlFxBox?.addEventListener("change", (event) => {
      this.scene.layoutProfile.bridge.showControlFx = Boolean(event.target?.checked);
      this.commit();
    });

    this.panel = panel;
  }

  syncPanel() {
    if (!this.panel) return;
    this.panel.style.display = this.enabled ? "block" : "none";
    const info = this.panel.querySelector("[data-layout-info]");
    const mirror = this.panel.querySelector("[data-layout-mirror]");
    const pillars = this.panel.querySelector("[data-layout-pillars]");
    const ropes = this.panel.querySelector("[data-layout-ropes]");
    const controlFx = this.panel.querySelector("[data-layout-controlfx]");
    if (mirror) mirror.checked = Boolean(this.scene.layoutProfile?.mirrorMode);
    if (pillars) pillars.checked = Boolean(this.scene.layoutProfile?.bridge?.showPillars);
    if (ropes) ropes.checked = Boolean(this.scene.layoutProfile?.bridge?.showRopes);
    if (controlFx) controlFx.checked = Boolean(this.scene.layoutProfile?.bridge?.showControlFx);
    if (!info) return;
    if (!this.enabled) {
      info.textContent = "";
      return;
    }
    const selected = this.handles.find((h) => h.id === this.selectedId);
    if (!selected) {
      info.textContent = "No selection";
      return;
    }
    const pos = selected.get();
    info.textContent = `${selected.label}  x:${Math.round(pos.x)} y:${Math.round(pos.y)}`;
  }

  setupHandles() {
    this.destroyHandles();
    const scene = this.scene;
    const profile = scene.layoutProfile;

    const makeHandle = (id, label, color, get, set, onWheel) => {
      const p = get();
      const dot = scene.add.circle(p.x, p.y, 9, color, 0.95).setDepth(100).setStrokeStyle(2, 0x10131b, 1);
      const txt = scene.add.text(p.x + 12, p.y - 8, label, {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#f0f4ff"
      }).setDepth(101);
      dot.setInteractive({ draggable: true, useHandCursor: true });
      scene.input.setDraggable(dot);
      const handle = { id, label, dot, txt, get, set, onWheel };
      dot.on("pointerdown", () => {
        this.selectedId = id;
        this.refreshHandles();
        this.syncPanel();
      });
      dot.on("drag", (_pointer, dragX, dragY) => {
        set(dragX, dragY);
        this.commit();
      });
      this.handles.push(handle);
    };

    makeHandle("castle-player", "Castle", 0x7bb1d8,
      () => ({ x: profile.castle.playerX, y: profile.castle.anchorY }),
      (x, y) => { profile.castle.playerX = x; profile.castle.anchorY = y; },
      (dy) => {
        const mult = dy > 0 ? 0.98 : 1.02;
        profile.castle.baseWidth = Phaser.Math.Clamp(profile.castle.baseWidth * mult, 80, 260);
        profile.castle.baseHeight = Phaser.Math.Clamp(profile.castle.baseHeight * mult, 110, 320);
        profile.castle.towerWidth = Phaser.Math.Clamp(profile.castle.towerWidth * mult, 40, 180);
        profile.castle.towerHeight = Phaser.Math.Clamp(profile.castle.towerHeight * mult, 30, 150);
      }
    );

    makeHandle("castle-hp", "HP Bar", 0x95d79a,
      () => ({
        x: scene.castleXLeft + profile.castle.hpOffsetX,
        y: profile.castle.anchorY + profile.castle.hpOffsetY
      }),
      (x, y) => {
        profile.castle.hpOffsetX = x - scene.castleXLeft;
        profile.castle.hpOffsetY = y - profile.castle.anchorY;
      },
      (dy) => {
        const mult = dy > 0 ? 0.97 : 1.03;
        profile.castle.hpWidth = Phaser.Math.Clamp(profile.castle.hpWidth * mult, 120, 420);
        profile.castle.hpHeight = Phaser.Math.Clamp(profile.castle.hpHeight * mult, 10, 48);
      }
    );

    makeHandle("foundation-left-start", "Found L", 0x9aa7ba,
      () => ({ x: profile.decks.foundation.leftStart, y: profile.decks.foundation.topY }),
      (x, y) => { profile.decks.foundation.leftStart = x; profile.decks.foundation.topY = y; },
      (dy) => {
        profile.decks.foundation.height = Phaser.Math.Clamp(profile.decks.foundation.height + (dy > 0 ? -2 : 2), 30, 160);
      }
    );

    makeHandle("foundation-left-end", "Found R", 0x9aa7ba,
      () => ({ x: profile.decks.foundation.leftEnd, y: profile.decks.foundation.topY }),
      (x, y) => {
        profile.decks.foundation.leftEnd = Math.max(x, profile.decks.foundation.leftStart + 20);
        profile.decks.foundation.topY = y;
      }
    );

    makeHandle("spawn-left-start", "Spawn L", 0xd9bf8b,
      () => ({ x: profile.decks.spawn.leftStart, y: profile.decks.spawn.topY }),
      (x, y) => { profile.decks.spawn.leftStart = x; profile.decks.spawn.topY = y; },
      (dy) => {
        profile.decks.spawn.height = Phaser.Math.Clamp(profile.decks.spawn.height + (dy > 0 ? -2 : 2), 24, 140);
      }
    );

    makeHandle("spawn-left-end", "Spawn R", 0xd9bf8b,
      () => ({ x: profile.decks.spawn.leftEnd, y: profile.decks.spawn.topY }),
      (x, y) => {
        profile.decks.spawn.leftEnd = Math.max(x, profile.decks.spawn.leftStart + 20);
        profile.decks.spawn.topY = y;
      }
    );

    makeHandle("bridge-left", "Bridge L", 0xb6c6a2,
      () => ({ x: profile.decks.spawn.leftEnd, y: profile.bridge.topY }),
      (x, y) => { profile.decks.spawn.leftEnd = x; profile.bridge.topY = y; },
      (dy) => {
        profile.bridge.thickness = Phaser.Math.Clamp(profile.bridge.thickness + (dy > 0 ? -2 : 2), 18, 100);
      }
    );

    makeHandle("bridge-thickness", "Bridge H", 0x9ed592,
      () => ({ x: scene.width / 2, y: profile.bridge.topY + profile.bridge.plankOffsetY + profile.bridge.thickness / 2 }),
      (_x, y) => {
        profile.bridge.thickness = Phaser.Math.Clamp((y - (profile.bridge.topY + profile.bridge.plankOffsetY)) * 2, 14, 120);
      },
      (dy) => {
        profile.bridge.thickness = Phaser.Math.Clamp(profile.bridge.thickness + (dy > 0 ? -2 : 2), 14, 120);
      }
    );

    makeHandle("turret-player", "Turret", 0x84c5c0,
      () => ({ x: scene.platformLeftEnd - profile.turret.sideInset, y: scene.spawnDeckY + profile.turret.yOffset }),
      (x, y) => {
        profile.turret.sideInset = scene.platformLeftEnd - x;
        profile.turret.yOffset = y - scene.spawnDeckY;
      },
      (dy) => {
        const mult = dy > 0 ? 0.96 : 1.04;
        profile.turret.baseWidth = Phaser.Math.Clamp(profile.turret.baseWidth * mult, 20, 120);
        profile.turret.baseHeight = Phaser.Math.Clamp(profile.turret.baseHeight * mult, 16, 100);
        profile.turret.headWidth = Phaser.Math.Clamp(profile.turret.headWidth * mult, 18, 140);
        profile.turret.headHeight = Phaser.Math.Clamp(profile.turret.headHeight * mult, 18, 140);
      }
    );

    makeHandle("turret-hp", "Turret HP", 0x8fd6ff,
      () => ({
        x: scene.platformLeftEnd - profile.turret.sideInset + profile.turret.hpOffsetX,
        y: scene.spawnDeckY + profile.turret.yOffset + profile.turret.hpOffsetY
      }),
      (x, y) => {
        const turretX = scene.platformLeftEnd - profile.turret.sideInset;
        const turretY = scene.spawnDeckY + profile.turret.yOffset;
        profile.turret.hpOffsetX = x - turretX;
        profile.turret.hpOffsetY = y - turretY;
      },
      (dy) => {
        const mult = dy > 0 ? 0.97 : 1.03;
        profile.turret.hpWidth = Phaser.Math.Clamp(profile.turret.hpWidth * mult, 20, 140);
        profile.turret.hpHeight = Phaser.Math.Clamp(profile.turret.hpHeight * mult, 3, 24);
      }
    );

    makeHandle("unit-spawn-player", "Unit Spawn", 0xe2a58a,
      () => ({ x: scene.platformLeftStart + profile.units.spawnInset, y: profile.units.laneY }),
      (x, y) => {
        profile.units.spawnInset = x - scene.platformLeftStart;
        profile.units.laneY = y;
      }
    );

    makeHandle("control-line", "Control", 0xc99ce4,
      () => ({ x: scene.width / 2, y: profile.control.y }),
      (_x, y) => { profile.control.y = y; },
      (dy) => {
        profile.control.zoneWidth = Phaser.Math.Clamp(profile.control.zoneWidth + (dy > 0 ? -4 : 4), 40, 220);
      }
    );

    this.refreshHandles();
  }

  refreshHandles() {
    for (const handle of this.handles) {
      const p = handle.get();
      handle.dot.setPosition(p.x, p.y);
      handle.txt.setPosition(p.x + 12, p.y - 8);
      handle.dot.setScale(this.selectedId === handle.id ? 1.2 : 1);
      handle.txt.setAlpha(this.selectedId === handle.id ? 1 : 0.7);
    }
  }

  destroyHandles() {
    for (const handle of this.handles) {
      handle.dot.destroy();
      handle.txt.destroy();
    }
    this.handles = [];
    this.selectedId = null;
  }

  commit() {
    this.scene.computeBoardLayout();
    this.scene.rebuildLayoutVisuals();
    this.refreshHandles();
    this.scene.saveLayoutProfile();
    this.syncPanel();
  }

  destroy() {
    this.destroyHandles();
    if (this.panel?.parentElement) {
      this.panel.parentElement.removeChild(this.panel);
    }
    this.panel = null;
  }
}
