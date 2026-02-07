/**
 * EventBus - Global event emitter for cross-system communication.
 * Standalone implementation (no Phaser dependency).
 * Systems emit and subscribe to events through this bus.
 */

export default class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @param {Object} context - Optional context for the callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const entry = { callback, context };
    this.listeners.get(event).push(entry);

    // Return unsubscribe function
    return () => this.off(event, callback, context);
  }

  /**
   * Subscribe to an event once (auto-unsubscribes after first call).
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @param {Object} context - Optional context for the callback
   * @returns {Function} Unsubscribe function
   */
  once(event, callback, context = null) {
    const wrapper = (...args) => {
      this.off(event, wrapper, context);
      callback.apply(context, args);
    };
    return this.on(event, wrapper, context);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Handler function to remove
   * @param {Object} context - Optional context
   */
  off(event, callback, context = null) {
    if (!this.listeners.has(event)) return;

    const handlers = this.listeners.get(event);
    const filtered = handlers.filter(
      (entry) => entry.callback !== callback || entry.context !== context
    );

    if (filtered.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, filtered);
    }
  }

  /**
   * Emit an event with optional data.
   * @param {string} event - Event name
   * @param  {...any} args - Arguments to pass to handlers
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) return;

    const handlers = this.listeners.get(event).slice(); // Copy to avoid mutation issues
    for (const entry of handlers) {
      try {
        entry.callback.apply(entry.context, args);
      } catch (error) {
        console.error(`EventBus: Error in handler for "${event}"`, error);
      }
    }
  }

  /**
   * Remove all listeners for a specific event, or all events.
   * @param {string} event - Optional event name. If omitted, clears all.
   */
  clear(event = null) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the count of listeners for an event.
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(event) {
    return this.listeners.has(event) ? this.listeners.get(event).length : 0;
  }

  /**
   * Get all registered event names.
   * @returns {string[]} Array of event names
   */
  eventNames() {
    return Array.from(this.listeners.keys());
  }
}

// --- Event Name Constants ---
// Centralized event names to avoid typos and enable autocomplete

export const GameEvents = {
  // Entity lifecycle
  ENTITY_CREATED: "entity-created",
  ENTITY_DESTROYED: "entity-destroyed",
  ENTITY_UPDATED: "entity-updated",

  // Unit events
  UNIT_SPAWNED: "unit-spawned",
  UNIT_DAMAGED: "unit-damaged",
  UNIT_HEALED: "unit-healed",
  UNIT_DIED: "unit-died",
  UNIT_STATUS_APPLIED: "unit-status-applied",

  // Castle events
  CASTLE_DAMAGED: "castle-damaged",
  CASTLE_DESTROYED: "castle-destroyed",

  // Turret events
  TURRET_FIRED: "turret-fired",
  TURRET_DESTROYED: "turret-destroyed",

  // Combat events
  ATTACK_PERFORMED: "attack-performed",

  // Economy events
  RESOURCES_CHANGED: "resources-changed",
  INCOME_TICK: "income-tick",

  // Wave events
  WAVE_COUNTDOWN_TICK: "wave-countdown-tick",
  WAVE_SENT: "wave-sent",
  WAVE_LOCKED: "wave-locked",
  WAVE_UNLOCKED: "wave-unlocked",

  // Draft events
  DRAFT_UNIT_ADDED: "draft-unit-added",
  DRAFT_UNIT_REMOVED: "draft-unit-removed",
  DRAFT_UNIT_MOVED: "draft-unit-moved",

  // Shop events
  SHOP_REROLLED: "shop-rerolled",
  SHOP_OFFER_CLAIMED: "shop-offer-claimed",

  // Control point events
  CONTROL_POINT_UPDATED: "control-point-updated",
  ZONE_OWNER_CHANGED: "zone-owner-changed",

  // Ability events
  ABILITY_CAST: "ability-cast",
  ABILITY_COOLDOWN_UPDATED: "ability-cooldown-updated",

  // Game flow events
  GAME_STARTED: "game-started",
  GAME_OVER: "game-over",
  GAME_PAUSED: "game-paused",
  GAME_RESUMED: "game-resumed",

  // UI events
  UI_STATE_UPDATED: "ui-state-updated",

  // Effect events (for rendering)
  EFFECT_SPAWN_PULSE: "effect-spawn-pulse",
  EFFECT_CALLOUT: "effect-callout",
  EFFECT_FLASH: "effect-flash",
  EFFECT_ABILITY_VISUAL: "effect-ability-visual",

  // Log events
  LOG: "log"
};
