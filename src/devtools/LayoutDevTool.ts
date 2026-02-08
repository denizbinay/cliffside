import Phaser from "phaser";
import { createDefaultLayoutProfile } from "../config/GameConfig";
import type GameScene from "../scenes/GameScene";

interface Handle {
  id: string;
  label: string;
  dot: Phaser.GameObjects.Arc;
  txt: Phaser.GameObjects.Text;
  get: () => { x: number; y: number };
  set: (x: number, y: number) => void;
  onWheel?: (dy: number) => void;
  readOnly?: boolean;
}

export default class LayoutDevTool {
  scene: GameScene;
  enabled: boolean;
  selectedId: string | null;
  handles: Handle[];
  pointerDown: boolean;
  dirty: boolean;
  toggleKey: Phaser.Input.Keyboard.Key | null;
  keys:
    | {
        shift: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
        up: Phaser.Input.Keyboard.Key;
        down: Phaser.Input.Keyboard.Key;
      }
    | Record<string, never>;
  panel: HTMLElement | null;

  constructor(scene: GameScene) {
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

  setup(): void {
    if (!this.scene.input?.keyboard) return;

    this.toggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keys = {
      shift: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      left: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      up: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    };

    this.scene.input.on("wheel", (_pointer: unknown, _objects: unknown, _dx: number, dy: number) => {
      if (!this.enabled) return;
      const selected = this.handles.find((h) => h.id === this.selectedId);
      if (!selected || !selected.onWheel || selected.readOnly) return;
      selected.onWheel(dy);
      this.commit();
    });

    this.createPanel();
  }

  handleInput(): void {
    if (this.toggleKey && Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.toggle();
    }
    if (!this.enabled || !this.scene.input?.keyboard) return;

    const keys = this.keys as {
      shift: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      up: Phaser.Input.Keyboard.Key;
      down: Phaser.Input.Keyboard.Key;
    };
    const nudge = keys.shift.isDown ? 5 : 1;
    const selected = this.handles.find((h) => h.id === this.selectedId);
    if (!selected || !selected.set || selected.readOnly) return;

    const pos = selected.get();
    let changed = false;
    if (this.scene.input.keyboard.checkDown(keys.left, 30)) {
      pos.x -= nudge;
      changed = true;
    }
    if (this.scene.input.keyboard.checkDown(keys.right, 30)) {
      pos.x += nudge;
      changed = true;
    }
    if (this.scene.input.keyboard.checkDown(keys.up, 30)) {
      pos.y -= nudge;
      changed = true;
    }
    if (this.scene.input.keyboard.checkDown(keys.down, 30)) {
      pos.y += nudge;
      changed = true;
    }
    if (changed) {
      selected.set(pos.x, pos.y);
      this.commit();
    }
  }

  toggle(): void {
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

  createPanel(): void {
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
      <div style="margin-bottom:8px; opacity:0.85;">Toggle: K. Drag handles to move, wheel to resize/scale selected.</div>
      <div data-layout-info style="margin-bottom:8px; min-height:48px;"></div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button data-layout-copy type="button">Copy JSON</button>
        <button data-layout-save type="button">Save</button>
        <button data-layout-reset type="button">Reset</button>
        <label style="display:flex; align-items:center; gap:4px;">
          <input data-layout-mirror type="checkbox" checked /> Mirror
        </label>
      </div>
    `;
    document.body.appendChild(panel);

    const copyBtn = panel.querySelector("[data-layout-copy]");
    const saveBtn = panel.querySelector("[data-layout-save]");
    const resetBtn = panel.querySelector("[data-layout-reset]");
    const mirrorBox = panel.querySelector("[data-layout-mirror]") as HTMLInputElement;

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
      this.scene.layoutProfile.mirrorMode = Boolean((event.target as HTMLInputElement)?.checked);
      this.commit();
    });

    this.panel = panel;
  }

  syncPanel(): void {
    if (!this.panel) return;
    this.panel.style.display = this.enabled ? "block" : "none";
    const info = this.panel.querySelector("[data-layout-info]");
    const mirror = this.panel.querySelector("[data-layout-mirror]") as HTMLInputElement;
    if (mirror) mirror.checked = Boolean(this.scene.layoutProfile?.mirrorMode);
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
    // Show scale for bridge sprite handles
    if (selected.id === "bridge-sprite-1") {
      const scale = this.scene.layoutProfile.bridgeSprite1.scale;
      info.textContent = `${selected.label}  x:${Math.round(pos.x)} y:${Math.round(pos.y)} scale:${scale.toFixed(3)}`;
    } else if (selected.id === "bridge-sprite-2") {
      const scale = this.scene.layoutProfile.bridgeSprite2.scale;
      info.textContent = `${selected.label}  x:${Math.round(pos.x)} y:${Math.round(pos.y)} scale:${scale.toFixed(3)}`;
    } else if (selected.readOnly) {
      info.textContent = `${selected.label} (mirrored)  x:${Math.round(pos.x)} y:${Math.round(pos.y)}`;
    } else {
      info.textContent = `${selected.label}  x:${Math.round(pos.x)} y:${Math.round(pos.y)}`;
    }
  }

  setupHandles(): void {
    this.destroyHandles();
    const scene = this.scene;
    const profile = scene.layoutProfile;
    const mirrorCenterX = scene.width / 2;
    const mirrorX = (x: number) => mirrorCenterX * 2 - x;

    const makeHandle = (
      id: string,
      label: string,
      color: number,
      get: () => { x: number; y: number },
      set: (x: number, y: number) => void,
      onWheel?: (dy: number) => void,
      readOnly = false
    ) => {
      const p = get();
      // Read-only markers are smaller, dimmer, and have dashed stroke
      const radius = readOnly ? 6 : 9;
      const alpha = readOnly ? 0.5 : 0.95;
      const dot = scene.add.circle(p.x, p.y, radius, color, alpha).setDepth(100).setStrokeStyle(2, 0x10131b, 1);
      const txt = scene.add
        .text(p.x + 12, p.y - 8, label, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: readOnly ? "#8899aa" : "#f0f4ff"
        })
        .setDepth(101)
        .setAlpha(readOnly ? 0.5 : 1);

      if (!readOnly) {
        dot.setInteractive({ draggable: true, useHandCursor: true });
        scene.input.setDraggable(dot);
      }

      const handle: Handle = { id, label, dot, txt, get, set, onWheel, readOnly };

      dot.on("pointerdown", () => {
        this.selectedId = id;
        this.refreshHandles();
        this.syncPanel();
      });

      if (!readOnly) {
        dot.on("drag", (_pointer: unknown, dragX: number, dragY: number) => {
          set(dragX, dragY);
          this.commit();
        });
      }

      this.handles.push(handle);
    };

    // --- Castle ---
    makeHandle(
      "castle-player",
      "Castle",
      0x7bb1d8,
      () => ({ x: profile.castle.playerX, y: profile.castle.anchorY }),
      (x, y) => {
        profile.castle.playerX = x;
        profile.castle.anchorY = y;
      },
      (dy) => {
        const mult = dy > 0 ? 0.98 : 1.02;
        profile.castle.baseWidth = Phaser.Math.Clamp(profile.castle.baseWidth * mult, 40, 800);
        profile.castle.baseHeight = Phaser.Math.Clamp(profile.castle.baseHeight * mult, 30, 600);
        profile.castle.towerWidth = Phaser.Math.Clamp(profile.castle.towerWidth * mult, 20, 400);
        profile.castle.towerHeight = Phaser.Math.Clamp(profile.castle.towerHeight * mult, 15, 300);
      }
    );

    makeHandle(
      "castle-hp",
      "Castle HP",
      0x95d79a,
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
        profile.castle.hpWidth = Phaser.Math.Clamp(profile.castle.hpWidth * mult, 60, 420);
        profile.castle.hpHeight = Phaser.Math.Clamp(profile.castle.hpHeight * mult, 6, 48);
      }
    );

    // --- Bridge Sprites (independent) ---
    makeHandle(
      "bridge-sprite-1",
      "Bridge 1",
      0xd4a574,
      () => ({ x: profile.bridgeSprite1.x, y: profile.bridgeSprite1.y }),
      (x, y) => {
        profile.bridgeSprite1.x = x;
        profile.bridgeSprite1.y = y;
      },
      (dy) => {
        const mult = dy > 0 ? 0.98 : 1.02;
        profile.bridgeSprite1.scale = Phaser.Math.Clamp(profile.bridgeSprite1.scale * mult, 0.1, 2.0);
      }
    );

    makeHandle(
      "bridge-sprite-2",
      "Bridge 2",
      0xc49564,
      () => ({ x: profile.bridgeSprite2.x, y: profile.bridgeSprite2.y }),
      (x, y) => {
        profile.bridgeSprite2.x = x;
        profile.bridgeSprite2.y = y;
      },
      (dy) => {
        const mult = dy > 0 ? 0.98 : 1.02;
        profile.bridgeSprite2.scale = Phaser.Math.Clamp(profile.bridgeSprite2.scale * mult, 0.1, 2.0);
      }
    );

    // --- Lane (3 handles: Start, End, Y-level) ---
    makeHandle(
      "lane-start",
      "Lane Start",
      0xe2a58a,
      () => ({ x: profile.lane.startX, y: profile.lane.y }),
      (x, y) => {
        profile.lane.startX = x;
        profile.lane.y = y;
      }
    );

    makeHandle(
      "lane-end",
      "Lane End",
      0x888888,
      () => ({ x: mirrorX(profile.lane.startX), y: profile.lane.y }),
      () => {},
      undefined,
      true
    );

    // --- Spawn Points ---
    makeHandle(
      "spawn-player",
      "Spawn Player",
      0xa6c98f,
      () => ({ x: profile.spawn.playerX, y: profile.lane.y }),
      (x, _y) => {
        profile.spawn.playerX = x;
      }
    );

    makeHandle(
      "spawn-ai",
      "Spawn AI",
      0x888888,
      () => ({ x: mirrorX(profile.spawn.playerX), y: profile.lane.y }),
      () => {},
      undefined,
      true
    );

    // --- Control Points (3 handles: Start, End, Y-level) ---
    makeHandle(
      "control-start",
      "Control Start",
      0xc99ce4,
      () => ({ x: profile.control.startX, y: profile.control.y }),
      (x, y) => {
        profile.control.startX = x;
        profile.control.y = y;
      },
      (dy) => {
        profile.control.zoneWidth = Phaser.Math.Clamp(profile.control.zoneWidth + (dy > 0 ? -4 : 4), 40, 220);
      }
    );

    makeHandle(
      "control-end",
      "Control End",
      0x888888,
      () => ({ x: mirrorX(profile.control.startX), y: profile.control.y }),
      () => {},
      undefined,
      true
    );

    // --- Turret (absolute position, mirrored) ---
    makeHandle(
      "turret",
      "Turret",
      0x84c5c0,
      () => ({ x: profile.turret.x, y: profile.turret.y }),
      (x, y) => {
        profile.turret.x = x;
        profile.turret.y = y;
      },
      (dy) => {
        const mult = dy > 0 ? 0.96 : 1.04;
        profile.turret.baseWidth = Phaser.Math.Clamp(profile.turret.baseWidth * mult, 20, 120);
        profile.turret.baseHeight = Phaser.Math.Clamp(profile.turret.baseHeight * mult, 16, 100);
        profile.turret.headWidth = Phaser.Math.Clamp(profile.turret.headWidth * mult, 18, 140);
        profile.turret.headHeight = Phaser.Math.Clamp(profile.turret.headHeight * mult, 18, 140);
      }
    );

    // Mirrored turret (read-only marker)
    makeHandle(
      "turret-mirror",
      "Turret",
      0x888888,
      () => ({ x: mirrorX(profile.turret.x), y: profile.turret.y }),
      () => {},
      undefined,
      true
    );

    makeHandle(
      "turret-hp",
      "Turret HP",
      0x8fd6ff,
      () => ({
        x: profile.turret.x + profile.turret.hpOffsetX,
        y: profile.turret.y + profile.turret.hpOffsetY
      }),
      (x, y) => {
        profile.turret.hpOffsetX = x - profile.turret.x;
        profile.turret.hpOffsetY = y - profile.turret.y;
      },
      (dy) => {
        const mult = dy > 0 ? 0.97 : 1.03;
        profile.turret.hpWidth = Phaser.Math.Clamp(profile.turret.hpWidth * mult, 20, 140);
        profile.turret.hpHeight = Phaser.Math.Clamp(profile.turret.hpHeight * mult, 3, 24);
      }
    );

    this.refreshHandles();
  }

  refreshHandles(): void {
    for (const handle of this.handles) {
      const p = handle.get();
      handle.dot.setPosition(p.x, p.y);
      handle.txt.setPosition(p.x + 12, p.y - 8);
      if (!handle.readOnly) {
        handle.dot.setScale(this.selectedId === handle.id ? 1.2 : 1);
        handle.txt.setAlpha(this.selectedId === handle.id ? 1 : 0.7);
      }
    }
  }

  destroyHandles(): void {
    for (const handle of this.handles) {
      handle.dot.destroy();
      handle.txt.destroy();
    }
    this.handles = [];
    this.selectedId = null;
  }

  commit(): void {
    this.scene.computeBoardLayout();
    this.scene.rebuildLayoutVisuals();
    this.refreshHandles();
    this.scene.saveLayoutProfile();
    this.syncPanel();
  }

  destroy(): void {
    this.destroyHandles();
    if (this.panel?.parentElement) {
      this.panel.parentElement.removeChild(this.panel);
    }
    this.panel = null;
  }
}
