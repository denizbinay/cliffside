/**
 * GameContext - Container object holding all game infrastructure.
 * Passed to systems instead of the Phaser Scene.
 * Provides access to GameState, EventBus, and registered systems.
 */

import GameState from "./GameState.js";
import EventBus from "./EventBus.js";

export default class GameContext {
  constructor() {
    this.state = new GameState();
    this.events = new EventBus();

    // Systems registry - populated during initialization
    this.systems = {};

    // Managers registry - populated during initialization
    this.managers = {};

    // Scene reference - set when GameContext is bound to a Phaser scene
    // This is the ONLY place the scene should be accessed, and only for rendering
    this.scene = null;

    // Time tracking (independent of Phaser for testability)
    this.time = {
      now: 0,
      delta: 0,
      elapsed: 0
    };
  }

  /**
   * Bind to a Phaser scene. Only call this once during scene creation.
   * @param {Phaser.Scene} scene - The Phaser scene
   */
  bindScene(scene) {
    this.scene = scene;
  }

  /**
   * Register a system by name.
   * @param {string} name - System identifier
   * @param {Object} system - System instance
   */
  registerSystem(name, system) {
    this.systems[name] = system;
  }

  /**
   * Get a registered system by name.
   * @param {string} name - System identifier
   * @returns {Object|null} System instance or null
   */
  getSystem(name) {
    return this.systems[name] || null;
  }

  /**
   * Register a manager by name.
   * @param {string} name - Manager identifier
   * @param {Object} manager - Manager instance
   */
  registerManager(name, manager) {
    this.managers[name] = manager;
  }

  /**
   * Get a registered manager by name.
   * @param {string} name - Manager identifier
   * @returns {Object|null} Manager instance or null
   */
  getManager(name) {
    return this.managers[name] || null;
  }

  /**
   * Update the time tracking. Called each frame.
   * @param {number} now - Current timestamp in ms
   * @param {number} delta - Delta time in ms
   */
  updateTime(now, delta) {
    this.time.now = now;
    this.time.delta = delta;
    this.time.elapsed += delta;
  }

  /**
   * Reset the context for a new game.
   */
  reset() {
    this.state.reset();
    this.events.clear();
    this.time = { now: 0, delta: 0, elapsed: 0 };
    // Note: Systems and managers are NOT reset - they persist across games
  }

  /**
   * Destroy the context and cleanup.
   */
  destroy() {
    this.events.clear();
    this.systems = {};
    this.managers = {};
    this.scene = null;
  }

  // --- Convenience Accessors ---

  /**
   * Shorthand for state access.
   */
  get units() {
    return this.state.units;
  }

  get playerUnits() {
    return this.state.getUnits("player");
  }

  get aiUnits() {
    return this.state.getUnits("ai");
  }

  get playerCastle() {
    return this.state.getCastle("player");
  }

  get aiCastle() {
    return this.state.getCastle("ai");
  }

  get isGameOver() {
    return this.state.isGameOver;
  }

  get matchTime() {
    return this.state.matchTime;
  }

  get waveNumber() {
    return this.state.waveNumber;
  }
}
