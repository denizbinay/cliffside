export interface StatusDotsContainer extends Phaser.GameObjects.Container {
  status?: {
    stun?: Phaser.GameObjects.Arc;
    slow?: Phaser.GameObjects.Arc;
    buff?: Phaser.GameObjects.Arc;
  };
}

export interface RenderStoreEntry {
  container: Phaser.GameObjects.Container;
  mainShape: Phaser.GameObjects.Shape | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  mainSprite?: Phaser.GameObjects.Sprite | null;
  healthBar: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
  healthBarOffsetX?: number;
  healthBarOffsetY?: number;
  statusDots: StatusDotsContainer;
}

export class RenderStore {
  private objects: Map<number, RenderStoreEntry> = new Map();
  private nextIndex = 1;

  create(data: RenderStoreEntry): number {
    const index = this.nextIndex++;
    this.objects.set(index, data);
    return index;
  }

  get(index: number): RenderStoreEntry | undefined {
    return this.objects.get(index);
  }

  delete(index: number): void {
    const obj = this.objects.get(index);
    if (!obj) return;
    this.destroyEntry(obj);
    this.objects.delete(index);
  }

  clear(): void {
    for (const obj of this.objects.values()) {
      this.destroyEntry(obj);
    }
    this.objects.clear();
    this.nextIndex = 1;
  }

  private destroyEntry(entry: RenderStoreEntry): void {
    entry.container.destroy();
    entry.healthBar.destroy();
    entry.healthFill.destroy();
    entry.statusDots.destroy();
  }
}
