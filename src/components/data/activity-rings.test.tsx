/**
 * ActivityRings — T01 AC2: arc length caps at 100% when current > target
 * AND capAtTarget=true (default). Snapshot-style assertion on the
 * stroke-dasharray attribute since we don't have RTL/jsdom yet.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityRings } from "./activity-rings";

describe("ActivityRings capAtTarget", () => {
  it("clamps stroke-dasharray to one full circle when current=105 target=100", () => {
    const html = renderToStaticMarkup(
      <ActivityRings
        rings={[{ id: "easy", label: "Easy", current: 105, target: 100 }]}
        size={160}
        strokeWidth={12}
      />,
    );
    // Largest ring uses r = size/2 - strokeWidth/2 - 2 = 72.
    // Circumference = 2π × 72 ≈ 452.39.
    const m = html.match(/stroke-dasharray:([^;"]+)/);
    expect(m).not.toBeNull();
    if (!m) return;
    const [dashLen, full] = m[1].split(" ").map((s) => Number(s.trim()));
    expect(dashLen).toBeCloseTo(full, 1);
  });

  it("draws partial arc when current=50 target=100", () => {
    const html = renderToStaticMarkup(
      <ActivityRings
        rings={[{ id: "volume", label: "Volume", current: 50, target: 100 }]}
        size={160}
        strokeWidth={12}
      />,
    );
    const m = html.match(/stroke-dasharray:([^;"]+)/);
    expect(m).not.toBeNull();
    if (!m) return;
    const [dashLen, full] = m[1].split(" ").map((s) => Number(s.trim()));
    expect(dashLen).toBeCloseTo(full / 2, 1);
  });

  it("allows over-fill when capAtTarget=false", () => {
    const html = renderToStaticMarkup(
      <ActivityRings
        rings={[{ id: "strength", label: "Strength", current: 200, target: 100 }]}
        size={160}
        strokeWidth={12}
        capAtTarget={false}
      />,
    );
    const m = html.match(/stroke-dasharray:([^;"]+)/);
    expect(m).not.toBeNull();
    if (!m) return;
    const [dashLen, full] = m[1].split(" ").map((s) => Number(s.trim()));
    expect(dashLen).toBeGreaterThan(full); // 2× circumference
  });

  it("renders all three concentric rings when given three inputs", () => {
    const html = renderToStaticMarkup(
      <ActivityRings
        rings={[
          { id: "easy", label: "Easy", current: 30, target: 60 },
          { id: "volume", label: "Volume", current: 50, target: 100 },
          { id: "strength", label: "Strength", current: 1, target: 2 },
        ]}
      />,
    );
    // 3 rings × 2 circles each (track + progress) = 6 <circle> elements.
    expect((html.match(/<circle/g) ?? []).length).toBe(6);
  });
});
