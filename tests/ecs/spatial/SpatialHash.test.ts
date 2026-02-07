import { describe, expect, it } from "vitest";
import { SpatialHash1D } from "../../../src/ecs/spatial/SpatialHash";

describe("SpatialHash1D", () => {
  it("returns nearby ids for radius queries", () => {
    const hash = new SpatialHash1D(50);
    hash.insert(1, 10);
    hash.insert(2, 90);
    hash.insert(3, 130);

    expect(hash.queryRadius(100, 45)).toEqual([2, 3]);
    expect(hash.queryRadius(15, 10)).toEqual([1]);
  });
});
