import { describe, it, expect } from "vitest";
import { createTestWorld } from "../../src/sim/TestUtils";

describe("Simulation Determinism", () => {
  it("RNG sequence is deterministic given the same seed", () => {
    const world1 = createTestWorld({ seed: 12345 });
    const world2 = createTestWorld({ seed: 12345 });
    const world3 = createTestWorld({ seed: 67890 });

    const seq1 = [];
    const seq2 = [];
    const seq3 = [];

    for (let i = 0; i < 100; i++) {
      seq1.push(world1.sim.rng.nextFloat());
      seq2.push(world2.sim.rng.nextFloat());
      seq3.push(world3.sim.rng.nextFloat());
    }

    expect(seq1).toEqual(seq2);
    expect(seq1).not.toEqual(seq3);
  });

  it("RNG state is separate from global Math.random", () => {
    const world = createTestWorld({ seed: 12345 });
    const val1 = world.sim.rng.nextFloat();
    Math.random(); // Burn a global random
    const val2 = world.sim.rng.nextFloat();

    // Recreate world
    const worldB = createTestWorld({ seed: 12345 });
    const val1B = worldB.sim.rng.nextFloat();
    const val2B = worldB.sim.rng.nextFloat();

    expect(val1).toBe(val1B);
    expect(val2).toBe(val2B);
  });
});
