interface SimClockOptions {
  stepMs?: number;
  maxFrameMs?: number;
}

export class SimClock {
  readonly stepMs: number;
  readonly maxFrameMs: number;

  private accumulatorMs = 0;
  private _elapsedMs = 0;

  constructor(options: SimClockOptions = {}) {
    this.stepMs = options.stepMs && options.stepMs > 0 ? options.stepMs : 50;
    this.maxFrameMs = options.maxFrameMs && options.maxFrameMs > 0 ? options.maxFrameMs : 250;
  }

  get elapsedMs(): number {
    return this._elapsedMs;
  }

  get stepSeconds(): number {
    return this.stepMs / 1000;
  }

  pushFrame(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    const clamped = Math.min(deltaMs, this.maxFrameMs);
    this.accumulatorMs += clamped;
  }

  consumeTick(): boolean {
    if (this.accumulatorMs < this.stepMs) return false;
    this.accumulatorMs -= this.stepMs;
    this._elapsedMs += this.stepMs;
    return true;
  }

  reset(): void {
    this.accumulatorMs = 0;
    this._elapsedMs = 0;
  }
}
