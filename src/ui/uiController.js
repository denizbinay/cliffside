import { UNIT_TYPES } from "../data/units.js";
import { ABILITIES } from "../data/abilities.js";
import { SHOP_CONFIG } from "../data/shop.js";
import { STANCES } from "../data/stances.js";

const ROLE_TAGS = {
  frontline: "F",
  damage: "D",
  support: "S",
  disruptor: "X"
};

const ROLE_COLORS = {
  frontline: "#5f7685",
  damage: "#a67f5d",
  support: "#8fbf99",
  disruptor: "#b35f5f"
};

const PHASE_LABELS = ["Early", "Mid", "Late", "Final"];

function getUnitPortraitPath(unitId) {
  return `/assets/units/portrait-large-${unitId}.jpg`;
}

export default class UIController {
  constructor(game) {
    this.game = game;
    this.scene = null;
    this.state = null;
    this.waveSlotsSignature = "";
    this.dragSource = null;
    this.tooltipShowDelay = 1000;
    this.tooltipHideDelay = 100;
    this.tooltipShowTimer = null;
    this.tooltipHideTimer = null;
    this.pendingTooltipTarget = null;

    this.buildDOM();
    this.bindScene();
    this.updateLayout();

    window.addEventListener("resize", () => this.updateLayout());
    if (this.game?.scale) {
      this.game.scale.on("resize", () => this.updateLayout());
    }
  }

  buildDOM() {
    const root = document.getElementById("ui-root") || document.createElement("div");
    root.id = "ui-root";
    root.className = "ui-root";
    if (!root.parentElement) document.body.appendChild(root);

    root.innerHTML = `
      <div class="ui-layer">
        <div class="ui-panel ui-top">
          <div class="top-left">
            <div class="resource-block">
              <div class="resource-title">Resources</div>
              <div class="resource-value" data-ui="resources">--</div>
            </div>
            <div class="income-block">
              <div class="income-title">Income</div>
              <div class="income-value" data-ui="income">--</div>
              <button class="ui-info" data-tooltip-type="interest">i</button>
            </div>
          </div>
          <div class="top-center">
            <div class="wave-meta">
              <div class="wave-label" data-ui="wave-label">Wave --</div>
              <div class="wave-timer">
                <svg class="wave-ring" viewBox="0 0 40 40" data-ui="wave-ring">
                  <circle class="wave-ring-bg" cx="20" cy="20" r="14" />
                  <circle class="wave-ring-progress" cx="20" cy="20" r="14" />
                </svg>
                <div class="wave-countdown" data-ui="wave-countdown">--</div>
              </div>
              <div class="wave-phase" data-ui="wave-phase">--</div>
            </div>
            <div class="control-pips" data-ui="control-pips">
              <span class="pip"></span>
              <span class="pip"></span>
              <span class="pip"></span>
              <span class="pip"></span>
              <span class="pip"></span>
            </div>
          </div>
          <div class="top-right">
            <div class="resource-block is-enemy">
              <div class="resource-title">Enemy Resources</div>
              <div class="resource-value" data-ui="enemy-resources">--</div>
            </div>
            <div class="income-block is-enemy">
              <div class="income-title">Enemy Income</div>
              <div class="income-value" data-ui="enemy-income">--</div>
            </div>
          </div>
        </div>
        <div class="ui-panel ui-bottom">
          <div class="panel-col shop-panel">
            <div class="panel-header">
              <div>
                <div class="panel-title">Shop</div>
                <div class="panel-subtitle">Buy into the wave</div>
              </div>
              <div class="reroll-block">
                <button class="ui-mini-button" data-ui="reroll">R</button>
                <div class="reroll-text">
                  <div class="reroll-label">Reroll</div>
                  <div class="reroll-cost" data-ui="reroll-cost">Cost --</div>
                </div>
              </div>
            </div>
            <div class="shop-grid" data-ui="shop-list"></div>
          </div>
          <div class="panel-col wave-panel">
            <div class="panel-header">
              <div class="panel-title">Wave Builder</div>
            </div>
              <div class="wave-layout">
                <div class="wave-grid" data-ui="wave-grid"></div>
                <div class="stance-column">
                  <div class="stance-list" data-ui="stance-buttons"></div>
                </div>
              </div>
          </div>
          <div class="panel-col ability-panel">
            <div class="panel-header">
              <div>
                <div class="panel-title">Castle Abilities</div>
                <div class="panel-subtitle">Cooldown only</div>
              </div>
            </div>
            <div class="ability-list" data-ui="ability-list"></div>
          </div>
        </div>
        <div class="ui-tooltip" data-ui="tooltip">
          <div class="ui-tooltip-text" data-ui="tooltip-text"></div>
        </div>
        <div class="wave-warning" data-ui="wave-warning">
          <div class="wave-warning-label">WAVE IN</div>
          <div class="wave-warning-count" data-ui="wave-warning-count">5</div>
        </div>
        <div class="ui-gameover" data-ui="gameover"></div>
      </div>
    `;

    this.root = root;
    this.layer = root.querySelector(".ui-layer");

    this.refs = {
      resources: root.querySelector("[data-ui='resources']"),
      income: root.querySelector("[data-ui='income']"),
      enemyResources: root.querySelector("[data-ui='enemy-resources']"),
      enemyIncome: root.querySelector("[data-ui='enemy-income']"),
      waveLabel: root.querySelector("[data-ui='wave-label']"),
      wavePhase: root.querySelector("[data-ui='wave-phase']"),
      waveCountdown: root.querySelector("[data-ui='wave-countdown']"),
      waveRing: root.querySelector("[data-ui='wave-ring']"),
      controlPips: Array.from(root.querySelectorAll("[data-ui='control-pips'] .pip")),
      reroll: root.querySelector("[data-ui='reroll']"),
      rerollCost: root.querySelector("[data-ui='reroll-cost']"),
      shopList: root.querySelector("[data-ui='shop-list']"),
      stanceButtons: root.querySelector("[data-ui='stance-buttons']"),
      waveGrid: root.querySelector("[data-ui='wave-grid']"),
      abilityList: root.querySelector("[data-ui='ability-list']"),
      tooltip: root.querySelector("[data-ui='tooltip']"),
      tooltipText: root.querySelector("[data-ui='tooltip-text']"),
      waveWarning: root.querySelector("[data-ui='wave-warning']"),
      waveWarningCount: root.querySelector("[data-ui='wave-warning-count']"),
      gameover: root.querySelector("[data-ui='gameover']")
    };

    this.refs.reroll.addEventListener("click", () => this.handleReroll());

    const infoBtn = root.querySelector(".ui-info");
    infoBtn.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
    infoBtn.addEventListener("mouseleave", () => this.hideTooltip());

    this.buildShopCards();
    this.buildAbilityButtons();
    this.buildStanceButtons();
  }

  bindScene() {
    const tryBind = () => {
      const scene = this.game?.scene?.getScene("Game");
      if (scene && scene.sys && scene.sys.isActive()) {
        this.attachScene(scene);
        return true;
      }
      return false;
    };

    if (!tryBind()) {
      this.bindTimer = window.setInterval(() => {
        if (tryBind()) window.clearInterval(this.bindTimer);
      }, 120);
    }
  }

  attachScene(scene) {
    this.scene = scene;
    scene.events.on("ui-state", (state) => this.render(state));
    scene.events.on("game-over", (winner) => this.showGameOver(winner));
    scene.events.on("shutdown", () => this.clearScene());
  }

  clearScene() {
    this.scene = null;
  }

  updateLayout() {
    if (!this.game?.canvas || !this.root) return;
    const rect = this.game.canvas.getBoundingClientRect();
    this.root.style.left = `${rect.left}px`;
    this.root.style.top = `${rect.top}px`;
    this.root.style.width = `${rect.width}px`;
    this.root.style.height = `${rect.height}px`;
    this.root.style.borderRadius = getComputedStyle(this.game.canvas).borderRadius || "14px";
  }

  buildShopCards() {
    this.shopCards = [];
    this.refs.shopList.innerHTML = "";
    for (let i = 0; i < SHOP_CONFIG.offersPerWave; i += 1) {
      const slot = document.createElement("div");
      slot.className = "shop-slot";
      slot.dataset.index = `${i}`;

      const card = document.createElement("button");
      card.className = "ui-card ui-card--shop";
      card.type = "button";
      card.dataset.index = `${i}`;
      card.dataset.tooltipType = "shop";
      card.innerHTML = `
        <div class="ui-card-image"></div>
        <div class="ui-card-main">
          <div class="ui-card-title">No offer</div>
          <div class="ui-card-meta">
            <div class="ui-card-class">-</div>
            <div class="ui-card-price">--</div>
          </div>
        </div>
      `;

      const placeholder = document.createElement("div");
      placeholder.className = "shop-slot-placeholder";
      placeholder.innerHTML = `
        <div class="shop-slot-label">Sold</div>
      `;

      card.addEventListener("click", () => this.handleShopClick(card));
      card.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
      card.addEventListener("mouseleave", () => this.hideTooltip());

      slot.appendChild(card);
      slot.appendChild(placeholder);
      this.refs.shopList.appendChild(slot);
      this.shopCards.push(card);
    }
  }

  buildAbilityButtons() {
    this.abilityButtons = new Map();
    this.refs.abilityList.innerHTML = "";
    Object.values(ABILITIES).forEach((ability) => {
      const btn = document.createElement("button");
      btn.className = "ui-card";
      btn.type = "button";
      btn.dataset.id = ability.id;
      btn.dataset.tooltipType = "ability";
      btn.dataset.tooltipId = ability.id;
      btn.innerHTML = `
        <div class="ui-card-role ability-tag">A</div>
        <div class="ui-card-body">
          <div class="ui-card-title">${ability.name}</div>
          <div class="ui-card-subtitle">Cooldown ${ability.cooldown}s</div>
        </div>
        <div class="ui-card-side" data-ui="cooldown">--</div>
      `;

      btn.addEventListener("click", () => this.handleAbilityClick(ability.id));
      btn.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
      btn.addEventListener("mouseleave", () => this.hideTooltip());

      this.refs.abilityList.appendChild(btn);
      this.abilityButtons.set(ability.id, btn);
    });
  }

  buildStanceButtons() {
    this.stanceButtons = new Map();
    this.refs.stanceButtons.innerHTML = "";
    const order = ["normal", "defensive", "aggressive"];
    const labels = {
      normal: "Normal",
      defensive: "Defensive",
      aggressive: "Aggressive"
    };
    order.forEach((id) => {
      const stance = STANCES[id];
      const btn = document.createElement("button");
      btn.className = "stance-item";
      btn.type = "button";
      btn.dataset.id = id;
      btn.dataset.tooltipType = "stance";
      btn.dataset.tooltipId = id;
      btn.innerHTML = `
        <div class="stance-icon" aria-hidden="true">${labels[id]?.[0] || "?"}</div>
        <div class="stance-name">${labels[id] || stance?.name || "Unknown"}</div>
      `;
      btn.addEventListener("click", () => this.handleStanceClick(id));
      btn.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
      btn.addEventListener("mouseleave", () => this.hideTooltip());

      if (!stance) btn.disabled = true;
      this.refs.stanceButtons.appendChild(btn);
      this.stanceButtons.set(id, btn);
    });
  }

  ensureWaveSlots(waveSlots) {
    const signature = JSON.stringify(waveSlots || {});
    if (signature === this.waveSlotsSignature) return;
    this.waveSlotsSignature = signature;

    this.waveSlotButtons = [];
    this.refs.waveGrid.innerHTML = "";

    const rows = ["front", "mid", "rear"];
    rows.forEach((row) => {
      const slotCount = waveSlots?.[row] || 0;
      for (let i = 0; i < slotCount; i += 1) {
        const slotBtn = document.createElement("button");
        slotBtn.className = "wave-slot";
        slotBtn.type = "button";
        slotBtn.dataset.row = row;
        slotBtn.dataset.index = `${i}`;
        slotBtn.dataset.tooltipType = "unit";
        slotBtn.innerHTML = `<span class="wave-slot-icon">+</span>`;
        slotBtn.addEventListener("click", () => this.handleSlotClick(slotBtn));
        slotBtn.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
        slotBtn.addEventListener("mouseleave", () => this.hideTooltip());
        slotBtn.addEventListener("dragstart", (event) => this.handleDragStart(event, slotBtn));
        slotBtn.addEventListener("dragover", (event) => this.handleDragOver(event));
        slotBtn.addEventListener("drop", (event) => this.handleDrop(event, slotBtn));
        slotBtn.addEventListener("dragend", () => this.handleDragEnd(slotBtn));
        this.refs.waveGrid.appendChild(slotBtn);
        this.waveSlotButtons.push(slotBtn);
      }
    });
  }

  render(state) {
    if (!state) return;
    this.state = state;
    this.ensureWaveSlots(state.waveSlots);

    this.refs.resources.textContent = `${state.playerResources.toFixed(1)}`;
    this.refs.income.textContent = `+${state.playerIncome.toFixed(2)} /s`;
    this.refs.enemyResources.textContent = `${state.aiResources.toFixed(1)}`;
    this.refs.enemyIncome.textContent = `+${state.aiIncome.toFixed(2)} /s`;

    this.refs.waveLabel.textContent = `Wave ${state.wave.number + 1}`;
    this.refs.wavePhase.textContent = state.wave.phaseLabel || PHASE_LABELS[state.wave.stageIndex] || "Phase";
    const countdownLabel = state.wave.countdown <= 0.1 ? "Now" : `${Math.ceil(state.wave.countdown)}`;
    this.refs.waveCountdown.textContent = countdownLabel;
    this.updateWaveRing(state.wave.countdown, state.wave.interval, state.wave.locked);

    this.updateControlPips(state.controlPoints || []);
    this.updateShop(state);
    this.updateWaveBuilder(state);
    this.updateAbilities(state);
    this.updateDisabledStates(state);
    this.updateWaveWarning(state.wave.countdown, state.isGameOver);
  }

  updateWaveWarning(countdown, isGameOver) {
    if (!this.refs.waveWarning || !this.refs.waveWarningCount) return;
    const remaining = Math.ceil(Math.max(0, countdown || 0));
    const show = !isGameOver && remaining > 0 && countdown <= 5;
    this.refs.waveWarning.classList.toggle("is-visible", show);
    if (!show) return;
    this.refs.waveWarningCount.textContent = `${remaining}`;
  }

  updateWaveRing(countdown, interval, locked) {
    const ring = this.refs.waveRing.querySelector(".wave-ring-progress");
    const progress = Math.max(0, Math.min(1, 1 - countdown / Math.max(1, interval)));
    const radius = 14;
    const circumference = 2 * Math.PI * radius;
    const dash = circumference * (1 - progress);
    ring.style.strokeDasharray = `${circumference}`;
    ring.style.strokeDashoffset = `${dash}`;
    ring.style.stroke = locked ? "#d6b37d" : countdown <= 5 ? "#e09a6a" : "#7aa3c2";
    ring.style.opacity = countdown <= 5 ? "0.9" : "1";
    this.refs.waveRing.classList.toggle("is-urgent", countdown <= 5);
  }

  updateControlPips(controlPoints) {
    this.refs.controlPips.forEach((pip, index) => {
      const owner = controlPoints[index] || "neutral";
      pip.classList.remove("pip-player", "pip-ai", "pip-neutral");
      pip.classList.add(owner === "player" ? "pip-player" : owner === "ai" ? "pip-ai" : "pip-neutral");
    });
  }

  updateShop(state) {
    const offers = state.shop.offers || [];
    this.shopCards.forEach((card, index) => {
      const id = offers[index] || null;
      const slot = card.parentElement;
      const placeholder = slot?.querySelector(".shop-slot-placeholder");
      const title = card.querySelector(".ui-card-title");
      const roleTag = card.querySelector(".ui-card-class");
      const price = card.querySelector(".ui-card-price");
      const image = card.querySelector(".ui-card-image");

      if (id && UNIT_TYPES[id]) {
        const unit = UNIT_TYPES[id];
        if (placeholder) placeholder.classList.remove("is-visible");
        title.textContent = unit.name;
        roleTag.textContent = ROLE_TAGS[unit.role] || "?";
        roleTag.style.background = ROLE_COLORS[unit.role] || "#3a4150";
        price.textContent = `${unit.cost}`;
        if (image) {
          image.style.backgroundImage = `linear-gradient(rgba(16, 18, 24, 0.18), rgba(16, 18, 24, 0.55)), url("${getUnitPortraitPath(unit.id)}")`;
        }
        card.dataset.unitId = unit.id;
        card.dataset.tooltipId = unit.id;
        const enabled = state.playerResources >= unit.cost && !state.isGameOver && !state.wave.locked;
        card.classList.toggle("is-disabled", !enabled);
        card.style.display = "";
      } else {
        if (placeholder) placeholder.classList.add("is-visible");
        title.textContent = "No offer";
        roleTag.textContent = "-";
        roleTag.style.background = "#3a4150";
        price.textContent = "--";
        if (image) {
          image.style.backgroundImage = "";
        }
        card.dataset.unitId = "";
        card.dataset.tooltipId = "";
        card.classList.add("is-disabled");
        card.style.display = "none";
      }
    });

    this.refs.rerollCost.textContent = `Cost ${state.shop.rerollCost}`;
    this.refs.reroll.classList.toggle("is-disabled", !state.shop.canReroll);
  }

  updateWaveBuilder(state) {
    const draft = state.waveDraft || { front: [], mid: [], rear: [] };
    const locked = state.wave.locked;
    const unlockedColumns = Number(state.wave?.unlockedColumns ?? 4);

    const currentStance = state.waveStance || "normal";
    this.stanceButtons.forEach((btn, id) => {
      btn.classList.toggle("is-active", id === currentStance);
      btn.classList.toggle("is-disabled", locked);
    });

    this.waveSlotButtons.forEach((slotBtn) => {
      const row = slotBtn.dataset.row;
      const index = Number(slotBtn.dataset.index || 0);
      const list = draft[row] || [];
      const unitId = list[index];
      const columnLocked = index >= unlockedColumns;
      const icon = slotBtn.querySelector(".wave-slot-icon");

      slotBtn.dataset.unitId = unitId || "";
      slotBtn.dataset.tooltipId = unitId || "";
      slotBtn.dataset.columnLocked = columnLocked ? "1" : "0";
      slotBtn.classList.toggle("is-locked-column", columnLocked);
      slotBtn.classList.toggle("is-disabled", locked || columnLocked);
      slotBtn.draggable = Boolean(unitId) && !locked && !columnLocked;

      if (unitId && UNIT_TYPES[unitId]) {
        const unit = UNIT_TYPES[unitId];
        slotBtn.style.backgroundColor = "#1c202a";
        slotBtn.style.backgroundImage = `linear-gradient(rgba(12, 14, 20, 0.2), rgba(12, 14, 20, 0.55)), url("${getUnitPortraitPath(unit.id)}")`;
        slotBtn.style.backgroundSize = "cover";
        slotBtn.style.backgroundPosition = "center";
        slotBtn.style.backgroundRepeat = "no-repeat";
        icon.textContent = "";
      } else {
        slotBtn.style.background = columnLocked ? "#151a23" : "#1c202a";
        slotBtn.style.backgroundImage = "";
        icon.textContent = columnLocked ? "" : "+";
        icon.style.color = "#6f7a8c";
      }
    });
  }

  updateAbilities(state) {
    Object.entries(state.abilityCooldowns || {}).forEach(([id, cd]) => {
      const btn = this.abilityButtons.get(id);
      if (!btn) return;
      const cooldown = btn.querySelector("[data-ui='cooldown']");
      const enabled = cd <= 0 && !state.isGameOver;
      btn.classList.toggle("is-disabled", !enabled);
      cooldown.textContent = cd > 0 ? `${cd.toFixed(1)}s` : "Ready";
    });
  }

  updateDisabledStates(state) {
    this.refs.reroll.classList.toggle("is-disabled", !state.shop.canReroll);
  }

  handleShopClick(card) {
    if (!this.scene || card.classList.contains("is-disabled")) return;
    if (this.state?.isGameOver || this.state?.wave.locked) return;
    const unitId = card.dataset.unitId;
    if (!unitId) return;
    const payload = { id: unitId, fromShop: true };
    this.scene.events.emit("queue-add", payload);
  }

  handleReroll() {
    if (!this.scene || this.refs.reroll.classList.contains("is-disabled")) return;
    this.scene.events.emit("shop-reroll");
  }

  handleAbilityClick(id) {
    if (!this.scene) return;
    const btn = this.abilityButtons.get(id);
    if (btn?.classList.contains("is-disabled")) return;
    this.scene.events.emit("ability-request", id);
  }

  handleStanceClick(id) {
    if (!this.scene || this.state?.wave.locked) return;
    this.scene.events.emit("stance-select", { id });
  }

  handleSlotClick(slotBtn) {
    if (!this.scene || this.state?.wave.locked) return;
    if (slotBtn.dataset.columnLocked === "1") return;
    const row = slotBtn.dataset.row;
    const index = Number(slotBtn.dataset.index || 0);
    const unitId = slotBtn.dataset.unitId;
    if (unitId) {
      this.scene.events.emit("queue-remove", { id: unitId, slot: row, index });
    }
  }

  handleDragStart(event, slotBtn) {
    if (!this.scene || this.state?.wave.locked) return;
    if (slotBtn.dataset.columnLocked === "1") {
      event.preventDefault();
      return;
    }
    const unitId = slotBtn.dataset.unitId;
    if (!unitId) {
      event.preventDefault();
      return;
    }
    this.dragSource = {
      row: slotBtn.dataset.row,
      index: Number(slotBtn.dataset.index || 0)
    };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${this.dragSource.row}:${this.dragSource.index}`);
    slotBtn.classList.add("is-dragging");
  }

  handleDragOver(event) {
    if (!this.dragSource || this.state?.wave.locked) return;
    if (event.currentTarget?.dataset?.columnLocked === "1") return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  handleDrop(event, slotBtn) {
    if (!this.scene || !this.dragSource || this.state?.wave.locked) return;
    if (slotBtn.dataset.columnLocked === "1") return;
    event.preventDefault();
    const targetRow = slotBtn.dataset.row;
    const targetIndex = Number(slotBtn.dataset.index || 0);
    if (targetRow === this.dragSource.row && targetIndex === this.dragSource.index) return;
    this.scene.events.emit("queue-move", {
      from: { row: this.dragSource.row, index: this.dragSource.index },
      to: { row: targetRow, index: targetIndex }
    });
    this.dragSource = null;
  }

  handleDragEnd(slotBtn) {
    slotBtn.classList.remove("is-dragging");
    this.dragSource = null;
  }

  showTooltip(target) {
    const type = target?.dataset?.tooltipType;
    if (!type) return;
    if (this.tooltipHideTimer) {
      window.clearTimeout(this.tooltipHideTimer);
      this.tooltipHideTimer = null;
    }
    this.pendingTooltipTarget = target;
    if (this.tooltipShowTimer) window.clearTimeout(this.tooltipShowTimer);
    this.tooltipShowTimer = window.setTimeout(() => {
      this.tooltipShowTimer = null;
      const currentTarget = this.pendingTooltipTarget;
      this.pendingTooltipTarget = null;
      const currentType = currentTarget?.dataset?.tooltipType;
      if (!currentType) return;
      const id = currentTarget?.dataset?.tooltipId || null;
      const text = this.getTooltipText(currentType, id);
      if (!text) return;

      this.refs.tooltipText.textContent = text;
      this.refs.tooltip.style.display = "block";
      this.positionTooltip(currentTarget);
    }, this.tooltipShowDelay);
  }

  positionTooltip(target) {
    const rootRect = this.root.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const tooltip = this.refs.tooltip;

    const padding = 12;
    const tooltipRect = tooltip.getBoundingClientRect();
    let x = rect.right - rootRect.left + 12;
    let y = rect.top - rootRect.top;

    if (x + tooltipRect.width > rootRect.width - padding) {
      x = rect.left - rootRect.left - tooltipRect.width - 12;
    }
    if (y + tooltipRect.height > rootRect.height - padding) {
      y = rootRect.height - tooltipRect.height - padding;
    }
    if (y < padding) y = padding;

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    if (this.tooltipShowTimer) {
      window.clearTimeout(this.tooltipShowTimer);
      this.tooltipShowTimer = null;
    }
    this.pendingTooltipTarget = null;
    if (this.tooltipHideTimer) window.clearTimeout(this.tooltipHideTimer);
    this.tooltipHideTimer = window.setTimeout(() => {
      this.tooltipHideTimer = null;
      this.refs.tooltip.style.display = "none";
    }, this.tooltipHideDelay);
  }

  getTooltipText(type, id) {
    if (type === "shop" || type === "unit") {
      const unit = UNIT_TYPES[id];
      if (!unit) return "";
      return `${unit.name}\n${unit.summary}\n${unit.special}\nHP ${unit.hp} | DMG ${unit.dmg}\nRange ${unit.range} | Speed ${unit.speed}`;
    }
    if (type === "stance") {
      const stance = STANCES[id];
      if (!stance) return "";
      return `${stance.name}\n${stance.summary}`;
    }
    if (type === "ability") {
      const ability = ABILITIES[id];
      if (!ability) return "";
      const desc = ability.id === "healWave" ? "Heals all allies across the board." : "Pushes and stuns enemies on your platform.";
      return `${ability.name}\n${desc}\nCooldown ${ability.cooldown}s`;
    }
    if (type === "interest") {
      if (!this.scene?.getIncomeDetails) return "";
      const details = this.scene.getIncomeDetails("player");
      const cap = this.scene.interestCap;
      const rate = Math.round(this.scene.interestRate * 100);
      return `Income Breakdown\nBase +${details.base.toFixed(2)}/s\nPoints +${details.pointBonus.toFixed(2)}/s\nEnemy Points +${details.enemyBonus.toFixed(2)}/s\nInterest ${rate}% (cap ${cap})\nSavings +${details.interest.toFixed(2)}/s`;
    }
    return "";
  }

  showGameOver(winner) {
    if (!this.refs.gameover) return;
    this.refs.gameover.textContent = `${winner} wins`;
    this.refs.gameover.classList.add("is-visible");
  }
}
