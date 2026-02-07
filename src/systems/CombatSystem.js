import { SIDE, WAVE_CONFIG } from "../config/GameConfig.js";

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  update(delta) {
    const playerUnitEnemies = [...this.scene.aiUnits, ...this.scene.aiTurrets.filter((t) => t && t.isAlive())];
    const aiUnitEnemies = [...this.scene.playerUnits, ...this.scene.playerTurrets.filter((t) => t && t.isAlive())];

    for (const unit of this.scene.playerUnits) {
      unit.update(delta, playerUnitEnemies, this.scene.playerUnits, this.scene.aiCastle);
    }
    for (const unit of this.scene.aiUnits) {
      unit.update(delta, aiUnitEnemies, this.scene.aiUnits, this.scene.playerCastle);
    }

    for (const turret of this.scene.playerTurrets) {
      if (!turret) continue;
      turret.update(delta, this.scene.aiUnits);
      if (turret.isAlive()) turret.syncBars();
    }
    for (const turret of this.scene.aiTurrets) {
      if (!turret) continue;
      turret.update(delta, this.scene.playerUnits);
      if (turret.isAlive()) turret.syncBars();
    }
  }

  cleanupUnits() {
    const beforePlayer = this.scene.playerUnits.length;
    const beforeAi = this.scene.aiUnits.length;

    this.scene.playerUnits = this.scene.playerUnits.filter((unit) => {
      if (unit.isAlive() || !unit.isReadyForCleanup()) return true;
      unit.destroy();
      return false;
    });

    this.scene.aiUnits = this.scene.aiUnits.filter((unit) => {
      if (unit.isAlive() || !unit.isReadyForCleanup()) return true;
      unit.destroy();
      return false;
    });

    const deadPlayer = beforePlayer - this.scene.playerUnits.length;
    const deadAi = beforeAi - this.scene.aiUnits.length;
    this.scene.economy.addKillBounty(SIDE.AI, deadPlayer);
    this.scene.economy.addKillBounty(SIDE.PLAYER, deadAi);
  }

  applyWaveLock(countdown) {
    this.scene.waveManager.waveLocked = countdown <= WAVE_CONFIG.lockSeconds;
  }

  checkGameOver() {
    if (this.scene.playerCastle.hp <= 0 || this.scene.aiCastle.hp <= 0) {
      this.scene.isGameOver = true;
      const winner = this.scene.playerCastle.hp <= 0 ? "AI" : "Player";
      this.scene.events.emit("game-over", winner);
      this.scene.time.addEvent({
        delay: 100,
        callback: () => {
          this.scene.playerUnits.forEach((unit) => unit.destroy());
          this.scene.aiUnits.forEach((unit) => unit.destroy());
        }
      });
    }
  }
}
