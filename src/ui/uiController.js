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

export default class UIController {
  constructor(game) {
    this.game = game;
    this.scene = null;
    this.state = null;
    this.activeSlot = "mid";
    this.activeSlotIndex = null;
    this.waveSlotsSignature = "";

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
            <div class="hp-block">
              <div class="hp-label">Castle</div>
              <div class="hp-bar">
                <div class="hp-fill" data-ui="player-hp-fill"></div>
              </div>
              <div class="hp-text" data-ui="player-hp-text">--</div>
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
            <div class="hp-block">
              <div class="hp-label">Enemy</div>
              <div class="hp-bar enemy">
                <div class="hp-fill" data-ui="ai-hp-fill"></div>
              </div>
              <div class="hp-text" data-ui="ai-hp-text">--</div>
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
              <div>
                <div class="panel-title">Wave Builder</div>
                <div class="panel-subtitle" data-ui="wave-auto">Auto --</div>
              </div>
            </div>
            <div class="wave-queue" data-ui="wave-queue">Queue: --</div>
            <div class="stance-row">
              <div class="stance-label">Stance</div>
              <div class="stance-buttons" data-ui="stance-buttons"></div>
            </div>
            <div class="wave-rows" data-ui="wave-rows"></div>
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
        <div class="ui-gameover" data-ui="gameover"></div>
      </div>
    `;

    this.root = root;
    this.layer = root.querySelector(".ui-layer");

    this.refs = {
      resources: root.querySelector("[data-ui='resources']"),
      income: root.querySelector("[data-ui='income']"),
      playerHpFill: root.querySelector("[data-ui='player-hp-fill']"),
      aiHpFill: root.querySelector("[data-ui='ai-hp-fill']"),
      playerHpText: root.querySelector("[data-ui='player-hp-text']"),
      aiHpText: root.querySelector("[data-ui='ai-hp-text']"),
      waveLabel: root.querySelector("[data-ui='wave-label']"),
      wavePhase: root.querySelector("[data-ui='wave-phase']"),
      waveCountdown: root.querySelector("[data-ui='wave-countdown']"),
      waveRing: root.querySelector("[data-ui='wave-ring']"),
      controlPips: Array.from(root.querySelectorAll("[data-ui='control-pips'] .pip")),
      reroll: root.querySelector("[data-ui='reroll']"),
      rerollCost: root.querySelector("[data-ui='reroll-cost']"),
      shopList: root.querySelector("[data-ui='shop-list']"),
      waveAuto: root.querySelector("[data-ui='wave-auto']"),
      waveQueue: root.querySelector("[data-ui='wave-queue']"),
      stanceButtons: root.querySelector("[data-ui='stance-buttons']"),
      waveRows: root.querySelector("[data-ui='wave-rows']"),
      abilityList: root.querySelector("[data-ui='ability-list']"),
      tooltip: root.querySelector("[data-ui='tooltip']"),
      tooltipText: root.querySelector("[data-ui='tooltip-text']"),
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
      const card = document.createElement("button");
      card.className = "ui-card";
      card.type = "button";
      card.dataset.index = `${i}`;
      card.dataset.tooltipType = "shop";
      card.innerHTML = `
        <div class="ui-card-role">-</div>
        <div class="ui-card-body">
          <div class="ui-card-title">No offer</div>
          <div class="ui-card-subtitle">--</div>
        </div>
      `;

      card.addEventListener("click", () => this.handleShopClick(card));
      card.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
      card.addEventListener("mouseleave", () => this.hideTooltip());

      this.refs.shopList.appendChild(card);
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
    const labels = { normal: "N", defensive: "D", aggressive: "A" };
    order.forEach((id) => {
      const stance = STANCES[id];
      const btn = document.createElement("button");
      btn.className = "ui-mini-button";
      btn.type = "button";
      btn.dataset.id = id;
      btn.dataset.tooltipType = "stance";
      btn.dataset.tooltipId = id;
      btn.textContent = labels[id] || "?";
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

    this.waveRowButtons = new Map();
    this.waveSlotButtons = [];
    this.refs.waveRows.innerHTML = "";

    const rows = [
      { id: "front", label: "Front", color: "#5f7685" },
      { id: "mid", label: "Mid", color: "#a67f5d" },
      { id: "rear", label: "Rear", color: "#8fbf99" }
    ];

    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "wave-row";

      const labelBtn = document.createElement("button");
      labelBtn.className = "wave-row-label";
      labelBtn.type = "button";
      labelBtn.textContent = row.label;
      labelBtn.style.borderColor = row.color;
      labelBtn.addEventListener("click", () => this.handleRowSelect(row.id));

      const slots = document.createElement("div");
      slots.className = "wave-slots";

      const slotCount = waveSlots?.[row.id] || 0;
      for (let i = 0; i < slotCount; i += 1) {
        const slotBtn = document.createElement("button");
        slotBtn.className = "wave-slot";
        slotBtn.type = "button";
        slotBtn.dataset.row = row.id;
        slotBtn.dataset.index = `${i}`;
        slotBtn.dataset.tooltipType = "unit";
        slotBtn.innerHTML = `<span class="wave-slot-icon">+</span>`;
        slotBtn.addEventListener("click", () => this.handleSlotClick(slotBtn));
        slotBtn.addEventListener("mouseenter", (event) => this.showTooltip(event.currentTarget));
        slotBtn.addEventListener("mouseleave", () => this.hideTooltip());
        slots.appendChild(slotBtn);
        this.waveSlotButtons.push(slotBtn);
      }

      rowEl.appendChild(labelBtn);
      rowEl.appendChild(slots);
      this.refs.waveRows.appendChild(rowEl);
      this.waveRowButtons.set(row.id, labelBtn);
    });
  }

  render(state) {
    if (!state) return;
    this.state = state;
    this.ensureWaveSlots(state.waveSlots);

    this.refs.resources.textContent = `${state.playerResources.toFixed(1)}`;
    this.refs.income.textContent = `+${state.playerIncome.toFixed(2)} /s`;

    const playerRatio = state.playerCastle.maxHp > 0 ? state.playerCastle.hp / state.playerCastle.maxHp : 0;
    const aiRatio = state.aiCastle.maxHp > 0 ? state.aiCastle.hp / state.aiCastle.maxHp : 0;
    this.refs.playerHpFill.style.width = `${Math.max(0, Math.min(1, playerRatio)) * 100}%`;
    this.refs.aiHpFill.style.width = `${Math.max(0, Math.min(1, aiRatio)) * 100}%`;
    this.refs.playerHpText.textContent = `Castle: ${Math.ceil(state.playerCastle.hp)}`;
    this.refs.aiHpText.textContent = `Enemy: ${Math.ceil(state.aiCastle.hp)}`;

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
      const title = card.querySelector(".ui-card-title");
      const subtitle = card.querySelector(".ui-card-subtitle");
      const roleTag = card.querySelector(".ui-card-role");

      if (id && UNIT_TYPES[id]) {
        const unit = UNIT_TYPES[id];
        title.textContent = unit.name;
        subtitle.textContent = `${ROLE_LABELS[unit.role]} | Buy ${unit.cost}`;
        roleTag.textContent = ROLE_TAGS[unit.role] || "?";
        roleTag.style.background = ROLE_COLORS[unit.role] || "#3a4150";
        card.dataset.unitId = unit.id;
        card.dataset.tooltipId = unit.id;
        const enabled = state.playerResources >= unit.cost && !state.isGameOver && !state.wave.locked;
        card.classList.toggle("is-disabled", !enabled);
      } else {
        title.textContent = "No offer";
        subtitle.textContent = "--";
        roleTag.textContent = "-";
        roleTag.style.background = "#3a4150";
        card.dataset.unitId = "";
        card.dataset.tooltipId = "";
        card.classList.add("is-disabled");
      }
    });

    this.refs.rerollCost.textContent = `Cost ${state.shop.rerollCost}`;
    this.refs.reroll.classList.toggle("is-disabled", !state.shop.canReroll);
  }

  updateWaveBuilder(state) {
    const draft = state.waveDraft || { front: [], mid: [], rear: [] };
    const waveSupply = state.waveSupply || 0;
    const interval = Math.round(state.wave.interval || 0);
    const locked = state.wave.locked;

    const slotIds = [...draft.front, ...draft.mid, ...draft.rear].filter(Boolean);
    const totalQueued = slotIds.length;
    const lockLabel = locked ? " | Locked" : "";
    this.refs.waveQueue.textContent = `Queue: ${totalQueued} | Supply: ${slotIds.length}/${waveSupply} | Auto ${interval}s${lockLabel}`;
    this.refs.waveAuto.textContent = `Auto ${interval}s`;

    const currentStance = state.waveStance || "normal";
    this.stanceButtons.forEach((btn, id) => {
      btn.classList.toggle("is-active", id === currentStance);
      btn.classList.toggle("is-disabled", locked);
    });

    this.waveRowButtons.forEach((btn, id) => {
      btn.classList.toggle("is-active", id === this.activeSlot);
      btn.classList.toggle("is-disabled", locked);
    });

    this.waveSlotButtons.forEach((slotBtn) => {
      const row = slotBtn.dataset.row;
      const index = Number(slotBtn.dataset.index || 0);
      const list = draft[row] || [];
      const unitId = list[index];
      const icon = slotBtn.querySelector(".wave-slot-icon");

      slotBtn.dataset.unitId = unitId || "";
      slotBtn.dataset.tooltipId = unitId || "";
      slotBtn.classList.toggle("is-selected", this.activeSlot === row && this.activeSlotIndex === index);
      slotBtn.classList.toggle("is-disabled", locked);

      if (unitId && UNIT_TYPES[unitId]) {
        const unit = UNIT_TYPES[unitId];
        slotBtn.style.background = unit.color;
        icon.textContent = unit.name.charAt(0);
        icon.style.color = "#f7f2e6";
      } else {
        slotBtn.style.background = "#1c202a";
        icon.textContent = "+";
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
    const locked = state.wave.locked || state.isGameOver;
    this.refs.reroll.classList.toggle("is-disabled", !state.shop.canReroll);
    this.refs.waveQueue.classList.toggle("is-locked", locked);
  }

  handleShopClick(card) {
    if (!this.scene || card.classList.contains("is-disabled")) return;
    if (this.state?.isGameOver || this.state?.wave.locked) return;
    const unitId = card.dataset.unitId;
    if (!unitId) return;
    const payload = { id: unitId, slot: this.activeSlot, fromShop: true };
    if (this.activeSlotIndex !== null) payload.index = this.activeSlotIndex;
    this.scene.events.emit("queue-add", payload);
    this.activeSlotIndex = null;
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

  handleRowSelect(rowId) {
    if (!this.scene || this.state?.wave.locked) return;
    this.activeSlot = rowId;
    this.activeSlotIndex = null;
  }

  handleSlotClick(slotBtn) {
    if (!this.scene || this.state?.wave.locked) return;
    const row = slotBtn.dataset.row;
    const index = Number(slotBtn.dataset.index || 0);
    const unitId = slotBtn.dataset.unitId;

    this.activeSlot = row;
    if (unitId) {
      this.scene.events.emit("queue-remove", { id: unitId, slot: row, index });
      this.activeSlotIndex = null;
    } else {
      this.activeSlotIndex = index;
    }
  }

  showTooltip(target) {
    const type = target?.dataset?.tooltipType;
    if (!type) return;
    const id = target?.dataset?.tooltipId || null;
    const text = this.getTooltipText(type, id);
    if (!text) return;

    this.refs.tooltipText.textContent = text;
    this.refs.tooltip.style.display = "block";
    this.positionTooltip(target);
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
    this.refs.tooltip.style.display = "none";
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
