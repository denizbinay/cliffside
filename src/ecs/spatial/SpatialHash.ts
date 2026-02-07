export class SpatialHash1D {
  private readonly cellSize: number;
  private buckets = new Map<number, number[]>();
  private scratch: number[] = [];

  constructor(cellSize: number) {
    this.cellSize = cellSize > 0 ? cellSize : 80;
  }

  clear(): void {
    this.buckets.clear();
    this.scratch = [];
  }

  insert(eid: number, x: number): void {
    const key = this.getCellKey(x);
    const bucket = this.buckets.get(key);
    if (bucket) {
      bucket.push(eid);
      return;
    }
    this.buckets.set(key, [eid]);
  }

  queryRadius(centerX: number, radius: number): number[] {
    const minX = centerX - radius;
    const maxX = centerX + radius;
    return this.queryRange(minX, maxX);
  }

  queryRange(minX: number, maxX: number): number[] {
    this.scratch = [];
    const minKey = this.getCellKey(minX);
    const maxKey = this.getCellKey(maxX);

    for (let key = minKey; key <= maxKey; key += 1) {
      const bucket = this.buckets.get(key);
      if (!bucket) continue;
      this.scratch.push(...bucket);
    }

    return this.scratch;
  }

  private getCellKey(x: number): number {
    return Math.floor(x / this.cellSize);
  }
}
