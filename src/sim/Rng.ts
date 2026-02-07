const UINT32_MAX = 0x100000000;

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  const normalized = seed >>> 0;
  return normalized === 0 ? 1 : normalized;
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = normalizeSeed(seed);
  }

  nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / UINT32_MAX;
  }

  reseed(seed: number): void {
    this.state = normalizeSeed(seed);
  }
}
