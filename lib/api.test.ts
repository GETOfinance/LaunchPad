import { describe, expect, it } from "vitest";
import { boundedInt } from "./api";

describe("boundedInt", () => {
  it("uses defaults and bounds expensive pagination", () => {
    expect(boundedInt(null, 50, 100)).toBe(50);
    expect(boundedInt("999999", 50, 100)).toBe(100);
    expect(boundedInt("-3", 50, 100)).toBe(0);
  });
});
