/**
 * Command - Base class for the Command pattern.
 * Commands encapsulate actions and can be executed/undone.
 */

export default class Command {
  /**
   * @param {GameContext} ctx - The game context
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.executed = false;
    this.timestamp = Date.now();
  }

  /**
   * Execute the command.
   * @returns {boolean} Success
   */
  execute() {
    throw new Error("Command.execute() must be implemented by subclass");
  }

  /**
   * Undo the command (optional).
   * @returns {boolean} Success
   */
  undo() {
    // Default: no undo support
    return false;
  }

  /**
   * Check if the command can be executed.
   * @returns {boolean} Can execute
   */
  canExecute() {
    return true;
  }

  /**
   * Get a description of the command for logging/debugging.
   * @returns {string} Description
   */
  describe() {
    return this.constructor.name;
  }
}
