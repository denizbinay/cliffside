import { Health, StatusEffects } from "../components";
import type { GameWorld } from "../world";
import type GameScene from "../../scenes/GameScene";

type StatusType = "stun" | "slow" | "buff";

interface ApplyDamagePayload {
  target: number;
  amount: number;
}

interface ApplyStatusPayload {
  target: number;
  type: StatusType;
  duration: number;
  power?: number;
}

export class EventBridge {
  private scene: GameScene;
  private world: GameWorld;

  constructor(scene: GameScene, world: GameWorld) {
    this.scene = scene;
    this.world = world;
  }

  setup(): void {
    if (!this.scene?.events) return;
    this.scene.events.on("ecs-apply-damage", this.handleApplyDamage);
    this.scene.events.on("ecs-apply-status", this.handleApplyStatus);
  }

  destroy(): void {
    if (!this.scene?.events) return;
    this.scene.events.off("ecs-apply-damage", this.handleApplyDamage);
    this.scene.events.off("ecs-apply-status", this.handleApplyStatus);
  }

  applyDamage(targetEid: number, amount: number): void {
    if (!targetEid || amount <= 0) return;
    Health.current[targetEid] = Math.max(0, Health.current[targetEid] - amount);
  }

  applyStatus(targetEid: number, type: StatusType, duration: number, power: number = 1): void {
    if (!targetEid || duration <= 0) return;

    if (type === "stun") {
      StatusEffects.stunTimer[targetEid] = Math.max(StatusEffects.stunTimer[targetEid], duration);
    } else if (type === "slow") {
      StatusEffects.slowTimer[targetEid] = Math.max(StatusEffects.slowTimer[targetEid], duration);
      StatusEffects.slowPower[targetEid] = power;
    } else if (type === "buff") {
      StatusEffects.buffTimer[targetEid] = Math.max(StatusEffects.buffTimer[targetEid], duration);
      StatusEffects.buffPower[targetEid] = power;
    }
  }

  private handleApplyDamage = (payload?: ApplyDamagePayload): void => {
    if (!payload) return;
    this.applyDamage(payload.target, payload.amount);
  };

  private handleApplyStatus = (payload?: ApplyStatusPayload): void => {
    if (!payload) return;
    this.applyStatus(payload.target, payload.type, payload.duration, payload.power ?? 1);
  };
}
