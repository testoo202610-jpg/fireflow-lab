import { describe, it, expect } from "vitest";
import {
  pressureFromM,
  pressureToM,
  flowFromLps,
  flowToLps,
  diameterFromMm,
  diameterToMm,
  pressureAtElevation,
} from "../hydraulic/units";
describe("central SI unit conversions", () => {
  it("converts 1 bar using standard gravity and psi definition", () => {
    expect(pressureToM(1, "bar")).toBeCloseTo(10.19716213, 7);
    expect(pressureFromM(pressureToM(1, "bar"), "psi")).toBeCloseTo(
      14.50377377,
      7,
    );
    expect(pressureFromM(pressureToM(42, "psi"), "psi")).toBeCloseTo(42, 10);
  });
  it("converts all flow units consistently, including signed reverse flow", () => {
    expect(flowFromLps(1, "L/min")).toBe(60);
    expect(flowFromLps(-10, "m3/h")).toBe(-36);
    expect(flowToLps(72, "m3/h")).toBe(20);
    expect(flowToLps(120, "L/min")).toBe(2);
  });
  it("converts internal pipe diameters, not nominal diameter tables", () => {
    expect(diameterToMm(4, "inch")).toBe(101.6);
    expect(diameterFromMm(152.4, "inch")).toBeCloseTo(6, 10);
  });
  it("derives gauge pressure as hydraulic head minus elevation", () => {
    expect(pressureAtElevation(100, 70)).toBe(30);
    expect(pressureAtElevation(100, 75) - pressureAtElevation(100, 70)).toBe(
      -5,
    );
    expect(pressureAtElevation(8, 10)).toBe(-2);
  });
});
