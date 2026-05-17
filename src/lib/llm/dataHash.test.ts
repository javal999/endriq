import { describe, expect, it } from "vitest";
import { dataHash } from "./dataHash";

describe("dataHash", () => {
  it("is deterministic across runs for the same input", () => {
    const a = dataHash({ b: 2, a: 1, nested: { y: "y", x: "x" } });
    const b = dataHash({ a: 1, nested: { x: "x", y: "y" }, b: 2 });
    expect(a).toBe(b);
  });

  it("changes when any field changes", () => {
    const base = dataHash({ a: 1, b: 2 });
    expect(dataHash({ a: 1, b: 3 })).not.toBe(base);
    expect(dataHash({ a: 1 })).not.toBe(base);
    expect(dataHash({ a: 1, b: 2, c: 0 })).not.toBe(base);
  });

  it("preserves array order (order is meaningful)", () => {
    const x = dataHash({ items: [1, 2, 3] });
    const y = dataHash({ items: [3, 2, 1] });
    expect(x).not.toBe(y);
  });

  it("returns a 64-char hex string (sha256)", () => {
    expect(dataHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashes primitives and nulls", () => {
    expect(dataHash(null)).toMatch(/^[0-9a-f]{64}$/);
    expect(dataHash("str")).toMatch(/^[0-9a-f]{64}$/);
    expect(dataHash(42)).toMatch(/^[0-9a-f]{64}$/);
  });
});
