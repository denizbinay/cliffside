import { describe, expect, it } from "vitest";
import { SimClock } from "../../src/sim/SimClock";

describe("SimClock", () => {
  it("consumes fixed ticks from accumulated frame time", () => {
    const clock = new SimClock({ stepMs: 50 });
    clock.pushFrame(120);

    let ticks = 0;
    while (clock.consumeTick()) {
      ticks += 1;
    }

    expect(ticks).toBe(2);
    expect(clock.elapsedMs).toBe(100);
  });

  it("clamps oversized frame delta", () => {
    const clock = new SimClock({ stepMs: 50, maxFrameMs: 80 });
    clock.pushFrame(1000);

    let ticks = 0;
    while (clock.consumeTick()) {
      ticks += 1;
    }

    expect(ticks).toBe(1);
    expect(clock.elapsedMs).toBe(50);
  });
});
