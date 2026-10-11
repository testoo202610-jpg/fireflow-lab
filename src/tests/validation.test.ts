import { describe, it, expect } from "vitest";
import { createDemo } from "../demo/projects";
import { validateModel, curveValid } from "../hydraulic/validation";
describe("engineering input validation", () => {
  it("accepts complete educational pump inputs", () => {
    const p = createDemo();
    expect(curveValid(p.pumpCurves[0])).toBe(true);
    expect(validateModel(p).filter((i) => i.severity === "error")).toEqual([]);
  });
  it("rejects missing or nondecreasing pump curves", () => {
    const p = createDemo();
    p.pumpCurves[0].points[1].head = 110;
    expect(validateModel(p).some((i) => i.code === "pump")).toBe(true);
    p.pumpCurves = [];
    expect(validateModel(p).some((i) => i.code === "pump")).toBe(true);
  });
  it("rejects negative PRV pressure and storage endpoints", () => {
    const p = createDemo();
    const prv = p.links.find((l) => l.type === "prv")!;
    prv.setting = -1;
    prv.from = "SOURCE";
    const issues = validateModel(p);
    expect(issues.some((i) => i.code === "prv_setting")).toBe(true);
    expect(issues.some((i) => i.code === "prv_storage")).toBe(true);
  });
  it("detects missing source, invalid pipe data and negative demand", () => {
    const p = createDemo();
    p.nodes[0].type = "junction";
    p.links[0].diameter = 0;
    p.links[0].length = -3;
    p.nodes.at(-1)!.demand = -1;
    const codes = validateModel(p).map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "no_source",
        "diameter",
        "length",
        "negative_demand",
      ]),
    );
  });
  it("detects active supply loss when the only pump is stopped", () => {
    const p = createDemo();
    p.links.find((l) => l.type === "pump")!.status = "closed";
    expect(
      validateModel(p).some(
        (i) => i.code === "disconnected" && i.elementId === "FLOOR_2",
      ),
    ).toBe(true);
  });
  it("keeps the second parallel pump as a valid supply path", () => {
    const p = createDemo(1);
    p.links.find((l) => l.id === "PUMP_1")!.status = "closed";
    expect(validateModel(p).some((i) => i.code === "disconnected")).toBe(false);
  });
});
