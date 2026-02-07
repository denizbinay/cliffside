/**
 * CommandQueue - Manages command execution and history.
 * Provides optional undo/redo and replay capabilities.
 */

export default class CommandQueue {
  /**
   * @param {GameContext} ctx - The game context
   * @param {Object} options - { maxHistory, enableUndo }
   */
  constructor(ctx, options = {}) {
    this.ctx = ctx;
    this.maxHistory = options.maxHistory || 100;
    this.enableUndo = options.enableUndo ?? true;

    // Command history for undo
    this.history = [];
    this.undoneStack = [];

    // Pending commands (for batch execution)
    this.pending = [];

    // Execution stats
    this.stats = {
      executed: 0,
      failed: 0,
      undone: 0
    };
  }

  /**
   * Execute a command immediately.
   * @param {Command} command - The command to execute
   * @returns {boolean} Success
   */
  execute(command) {
    if (!command.canExecute()) {
      this.stats.failed += 1;
      return false;
    }

    const success = command.execute();

    if (success) {
      this.stats.executed += 1;

      if (this.enableUndo) {
        this.history.push(command);

        // Trim history if needed
        if (this.history.length > this.maxHistory) {
          this.history.shift();
        }

        // Clear undo stack (new action invalidates redo)
        this.undoneStack = [];
      }
    } else {
      this.stats.failed += 1;
    }

    return success;
  }

  /**
   * Queue a command for batch execution.
   * @param {Command} command - The command to queue
   */
  queue(command) {
    this.pending.push(command);
  }

  /**
   * Execute all pending commands.
   * @returns {number} Number of successful executions
   */
  flush() {
    let successCount = 0;

    for (const command of this.pending) {
      if (this.execute(command)) {
        successCount += 1;
      }
    }

    this.pending = [];
    return successCount;
  }

  /**
   * Undo the last command.
   * @returns {boolean} Success
   */
  undo() {
    if (!this.enableUndo || this.history.length === 0) {
      return false;
    }

    const command = this.history.pop();
    const success = command.undo();

    if (success) {
      this.stats.undone += 1;
      this.undoneStack.push(command);
    } else {
      // Failed to undo - put it back
      this.history.push(command);
    }

    return success;
  }

  /**
   * Redo the last undone command.
   * @returns {boolean} Success
   */
  redo() {
    if (!this.enableUndo || this.undoneStack.length === 0) {
      return false;
    }

    const command = this.undoneStack.pop();
    return this.execute(command);
  }

  /**
   * Check if undo is available.
   * @returns {boolean}
   */
  canUndo() {
    return this.enableUndo && this.history.length > 0;
  }

  /**
   * Check if redo is available.
   * @returns {boolean}
   */
  canRedo() {
    return this.enableUndo && this.undoneStack.length > 0;
  }

  /**
   * Clear all history.
   */
  clear() {
    this.history = [];
    this.undoneStack = [];
    this.pending = [];
  }

  /**
   * Get execution statistics.
   * @returns {Object} Stats
   */
  getStats() {
    return {
      ...this.stats,
      historySize: this.history.length,
      pendingSize: this.pending.length,
      undoStackSize: this.undoneStack.length
    };
  }

  /**
   * Get command history for debugging/replay.
   * @returns {Command[]}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Replay all commands from history (for debugging).
   * Note: This assumes game state has been reset.
   * @returns {number} Number of successful replays
   */
  replay() {
    const commands = [...this.history];
    this.clear();

    let successCount = 0;
    for (const command of commands) {
      // Reset executed state for replay
      command.executed = false;
      if (this.execute(command)) {
        successCount += 1;
      }
    }

    return successCount;
  }
}
