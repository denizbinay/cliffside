import { describe, expect, it } from "vitest";
import { Rng } from "../../src/sim/Rng";

describe("Rng", () => {
  it("produces identical sequences for identical seeds", () => {
    const a = new Rng(42);
    const b = new Rng(42);

    const seqA = [a.nextFloat(), a.nextFloat(), a.nextFloat(), a.nextFloat()];
    const seqB = [b.nextFloat(), b.nextFloat(), b.nextFloat(), b.nextFloat()];

    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 20; i += 1) {
      const value = rng.nextFloat();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
