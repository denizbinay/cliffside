import Phaser from "phaser";
import { UNIT_TYPES } from "../data/units";
import { SIDE } from "../config/GameConfig";
import type { Side } from "../types";
import type GameScene from "../scenes/GameScene";

export default class UnitDevTool {
  scene: GameScene;
  enabled: boolean;
  selectedUnitId: string | null;
  selectedSide: Side;
  spawnCount: number;
  unitIds: string[];
  panel: HTMLElement | null;
  toggleKey: Phaser.Input.Keyboard.Key | null;
  keys:
    | {
        enter: Phaser.Input.Keyboard.Key;
        left: Phaser.Input.Keyboard.Key;
        right: Phaser.Input.Keyboard.Key;
        p: Phaser.Input.Keyboard.Key;
        o: Phaser.Input.Keyboard.Key;
      }
    | Record<string, never>;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.enabled = false;
    this.selectedUnitId = null;
    this.selectedSide = SIDE.PLAYER;
    this.spawnCount = 1;
    this.unitIds = [];
    this.panel = null;
    this.toggleKey = null;
    this.keys = {};
  }

  setup(): void {
    if (!this.scene.input?.keyboard) return;

    this.unitIds = Object.values(UNIT_TYPES)
      .sort((a, b) => (a.tier || 0) - (b.tier || 0) || (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name))
      .map((unit) => unit.id);

    this.selectedUnitId = this.unitIds.includes("breaker") ? "breaker" : this.unitIds[0] || null;

    this.toggleKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.keys = {
      enter: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      left: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      p: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
      o: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O)
    };

    this.createPanel();
  }

  handleInput(): void {
    if (this.toggleKey && Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.toggle();
    }
    if (!this.enabled || !this.scene.input?.keyboard || this.isTypingInInput()) return;

    const keys = this.keys as {
      enter: Phaser.Input.Keyboard.Key;
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      p: Phaser.Input.Keyboard.Key;
      o: Phaser.Input.Keyboard.Key;
    };

    if (keys.left && Phaser.Input.Keyboard.JustDown(keys.left)) {
      this.cycleSelection(-1);
    }
    if (keys.right && Phaser.Input.Keyboard.JustDown(keys.right)) {
      this.cycleSelection(1);
    }
    if (keys.p && Phaser.Input.Keyboard.JustDown(keys.p)) {
      this.selectedSide = SIDE.PLAYER;
      this.syncPanel();
    }
    if (keys.o && Phaser.Input.Keyboard.JustDown(keys.o)) {
      this.selectedSide = SIDE.AI;
      this.syncPanel();
    }
    if (keys.enter && Phaser.Input.Keyboard.JustDown(keys.enter)) {
      this.spawn();
    }
  }

  isTypingInInput(): boolean {
    if (typeof document === "undefined") return false;
    const active = document.activeElement;
    if (!active) return false;
    const tag = (active.tagName || "").toLowerCase();
    return tag === "input" || tag === "select" || tag === "textarea";
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.syncPanel();
  }

  cycleSelection(step: number): void {
    if (!this.unitIds?.length) return;
    const current = Math.max(0, this.unitIds.indexOf(this.selectedUnitId!));
    const next = (current + step + this.unitIds.length) % this.unitIds.length;
    this.selectedUnitId = this.unitIds[next];
    this.syncPanel();
  }

  spawn(side: Side = this.selectedSide): void {
    if (!this.selectedUnitId) return;
    this.scene.spawnDevUnits(this.selectedUnitId, side || SIDE.PLAYER, this.spawnCount || 1);
  }

  createPanel(): void {
    if (typeof document === "undefined") return;
    const panel = document.createElement("div");
    panel.id = "unit-dev-panel";
    panel.style.position = "fixed";
    panel.style.right = "16px";
    panel.style.top = "336px";
    panel.style.width = "300px";
    panel.style.padding = "10px";
    panel.style.background = "rgba(13, 17, 24, 0.9)";
    panel.style.border = "1px solid rgba(177, 198, 240, 0.35)";
    panel.style.borderRadius = "8px";
    panel.style.color = "#e8edf7";
    panel.style.font = "12px/1.4 monospace";
    panel.style.zIndex = "9999";
    panel.style.display = "none";

    panel.innerHTML = `
      <div style="margin-bottom:6px; font-weight:700;">Unit Dev Spawn</div>
      <div style="margin-bottom:8px; opacity:0.85;">Toggle: U. Enter spawn. <-/-> cycle unit. P player, O enemy.</div>
      <div style="display:grid; gap:8px; margin-bottom:8px;">
        <label style="display:grid; gap:4px;">
          <span>Unit</span>
          <select data-unitdev-unit style="padding:4px;"></select>
        </label>
        <label style="display:grid; gap:4px;">
          <span>Side</span>
          <select data-unitdev-side style="padding:4px;">
            <option value="player">Player</option>
            <option value="ai">AI</option>
          </select>
        </label>
        <label style="display:grid; gap:4px;">
          <span>Count</span>
          <input data-unitdev-count type="number" min="1" max="24" step="1" value="1" style="padding:4px;" />
        </label>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:6px;">
        <button data-unitdev-spawn type="button">Spawn</button>
        <button data-unitdev-spawn-player type="button">Spawn Player</button>
        <button data-unitdev-spawn-ai type="button">Spawn AI</button>
      </div>
      <div data-unitdev-info style="min-height:18px; opacity:0.9;"></div>
    `;
    document.body.appendChild(panel);

    const unitSelect = panel.querySelector("[data-unitdev-unit]") as HTMLSelectElement;
    const sideSelect = panel.querySelector("[data-unitdev-side]") as HTMLSelectElement;
    const countInput = panel.querySelector("[data-unitdev-count]") as HTMLInputElement;
    const spawnBtn = panel.querySelector("[data-unitdev-spawn]");
    const spawnPlayerBtn = panel.querySelector("[data-unitdev-spawn-player]");
    const spawnAiBtn = panel.querySelector("[data-unitdev-spawn-ai]");

    this.unitIds.forEach((id) => {
      const unit = UNIT_TYPES[id];
      if (!unit || !unitSelect) return;
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${unit.name} (${id})`;
      unitSelect.appendChild(option);
    });

    unitSelect?.addEventListener("change", (event) => {
      this.selectedUnitId = (event.target as HTMLSelectElement)?.value || this.selectedUnitId;
      this.syncPanel();
    });
    sideSelect?.addEventListener("change", (event) => {
      const value = (event.target as HTMLSelectElement)?.value;
      this.selectedSide = value === SIDE.AI ? SIDE.AI : SIDE.PLAYER;
      this.syncPanel();
    });
    countInput?.addEventListener("change", (event) => {
      this.spawnCount = Phaser.Math.Clamp(Number((event.target as HTMLInputElement)?.value) || 1, 1, 24);
      this.syncPanel();
    });
    spawnBtn?.addEventListener("click", () => this.spawn());
    spawnPlayerBtn?.addEventListener("click", () => this.spawn(SIDE.PLAYER));
    spawnAiBtn?.addEventListener("click", () => this.spawn(SIDE.AI));

    this.panel = panel;
    this.syncPanel();
  }

  syncPanel(): void {
    if (!this.panel) return;
    this.panel.style.display = this.enabled ? "block" : "none";

    const unitSelect = this.panel.querySelector("[data-unitdev-unit]") as HTMLSelectElement;
    const sideSelect = this.panel.querySelector("[data-unitdev-side]") as HTMLSelectElement;
    const countInput = this.panel.querySelector("[data-unitdev-count]") as HTMLInputElement;
    const info = this.panel.querySelector("[data-unitdev-info]");

    if (unitSelect) unitSelect.value = this.selectedUnitId || "";
    if (sideSelect) sideSelect.value = this.selectedSide || SIDE.PLAYER;
    if (countInput) countInput.value = `${this.spawnCount || 1}`;
    if (info) {
      const unitName = UNIT_TYPES[this.selectedUnitId!]?.name || this.selectedUnitId || "none";
      info.textContent = `Spawning ${this.spawnCount}x ${unitName} for ${this.selectedSide}`;
    }
  }

  destroy(): void {
    if (this.panel?.parentElement) {
      this.panel.parentElement.removeChild(this.panel);
    }
    this.panel = null;
  }
}
