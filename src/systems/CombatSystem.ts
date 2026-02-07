import { SIDE, WAVE_CONFIG } from "../config/GameConfig";
import type Unit from "../entities/Unit";
import type Turret from "../entities/Turret";
import type Castle from "../entities/Castle";
import type EconomySystem from "./EconomySystem";
import type WaveManager from "./WaveManager";

interface CombatScene {
  playerUnits: Unit[];
  aiUnits: Unit[];
  playerTurrets: (Turret | null)[];
  aiTurrets: (Turret | null)[];
  playerCastle: Castle;
  aiCastle: Castle;
  economy: EconomySystem;
  waveManager: WaveManager;
  isGameOver: boolean;
  time: Phaser.Time.Clock;
  events: Phaser.Events.EventEmitter;
}

export default class CombatSystem {
  scene: CombatScene;

  constructor(scene: CombatScene) {
    this.scene = scene;
  }

  update(delta: number): void {
    const playerUnitEnemies = [
      ...this.scene.aiUnits,
      ...this.scene.aiTurrets.filter((t): t is Turret => t !== null && t.isAlive())
    ];
    const aiUnitEnemies = [
      ...this.scene.playerUnits,
      ...this.scene.playerTurrets.filter((t): t is Turret => t !== null && t.isAlive())
    ];

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

  cleanupUnits(): void {
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

  applyWaveLock(countdown: number): void {
    this.scene.waveManager.waveLocked = countdown <= WAVE_CONFIG.lockSeconds;
  }

  checkGameOver(): void {
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
