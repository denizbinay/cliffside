import { describe, it, expect, vi } from "vitest";
import { RenderStore } from "../../../src/ecs/stores/RenderStore";

function createEntry() {
  const container = { destroy: vi.fn() } as unknown as Phaser.GameObjects.Container;
  const mainShape = { destroy: vi.fn() } as unknown as Phaser.GameObjects.Shape;
  const healthBar = { destroy: vi.fn() } as unknown as Phaser.GameObjects.Rectangle;
  const healthFill = { destroy: vi.fn() } as unknown as Phaser.GameObjects.Rectangle;
  const statusDots = { destroy: vi.fn() } as unknown as Phaser.GameObjects.Container;

  return {
    entry: {
      container,
      mainShape,
      healthBar,
      healthFill,
      statusDots
    },
    spies: { container, mainShape, healthBar, healthFill, statusDots }
  };
}

describe("RenderStore", () => {
  it("creates and retrieves entries", () => {
    const store = new RenderStore();
    const { entry } = createEntry();

    const index = store.create(entry);
    expect(index).toBe(1);
    expect(store.get(index)).toBe(entry);
  });

  it("deletes entries and destroys objects", () => {
    const store = new RenderStore();
    const { entry, spies } = createEntry();

    const index = store.create(entry);
    store.delete(index);

    expect(spies.container.destroy).toHaveBeenCalledTimes(1);
    expect(spies.healthBar.destroy).toHaveBeenCalledTimes(1);
    expect(spies.healthFill.destroy).toHaveBeenCalledTimes(1);
    expect(spies.statusDots.destroy).toHaveBeenCalledTimes(1);
    expect(store.get(index)).toBeUndefined();
  });

  it("clears all entries and resets indices", () => {
    const store = new RenderStore();
    const first = createEntry();
    const second = createEntry();

    store.create(first.entry);
    store.create(second.entry);
    store.clear();

    expect(first.spies.container.destroy).toHaveBeenCalledTimes(1);
    expect(second.spies.container.destroy).toHaveBeenCalledTimes(1);

    const thirdIndex = store.create(createEntry().entry);
    expect(thirdIndex).toBe(1);
  });
});
