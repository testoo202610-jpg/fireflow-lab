import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { simulate } from "../hydraulic/epanet/engine";
import { createDemo } from "../demo/projects";
import {
  makeNode,
  makeLink,
  defaultSettings,
  type HydraulicModel,
} from "../types/network";
import { pressureFromM, pressureToM } from "../hydraulic/units";
const binary = new Uint8Array(readFileSync("public/epanet-2.2.wasm"));
const run = (m: HydraulicModel) => simulate(m, binary);
function analyticalNetwork(): HydraulicModel {
  const source = { ...makeNode("reservoir"), id: "SOURCE", head: 100 };
  const end = { ...makeNode("demand"), id: "END", elevation: 10, demand: 10 };
  const pipe = {
    ...makeLink("pipe", "SOURCE", "END"),
    id: "PIPE",
    length: 1000,
    diameter: 200,
    roughness: 120,
  };
  return {
    nodes: [source, end],
    links: [pipe],
    pumpCurves: [],
    settings: { ...defaultSettings, demandModel: "DDA" },
  };
}
describe("real EPANET hydraulic integration", () => {
  it("matches an independently evaluated Hazen-Williams reference and SI pressure units", async () => {
    const m = analyticalNetwork(),
      r = await run(m);
    expect(r.status).toBe("calculated");
    const independentLoss =
      (10.67 * 1000 * 0.01 ** 1.852) / (120 ** 1.852 * 0.2 ** 4.8704);
    const end = r.nodes.find((n) => n.id === "END")!;
    expect(end.pressureM).toBeCloseTo(100 - 10 - independentLoss, 2);
    expect(r.links[0].flowLps).toBeCloseTo(10, 5);
    expect(pressureToM(pressureFromM(end.pressureM, "bar"), "bar")).toBeCloseTo(
      end.headM - 10,
      8,
    );
  });
  it("responds to demand changes with friction loss rather than elevation alone", async () => {
    const m = analyticalNetwork(),
      a = await run(m);
    m.nodes[1].demand = 20;
    const b = await run(m);
    expect(b.status).toBe("calculated");
    expect(b.links[0].flowLps).toBeCloseTo(20, 4);
    expect(b.nodes.find((n) => n.id === "END")!.pressureM).toBeLessThan(
      a.nodes.find((n) => n.id === "END")!.pressureM,
    );
    expect(b.links[0].headlossM / a.links[0].headlossM).toBeCloseTo(
      2 ** 1.852,
      2,
    );
  });
  it("matches results by element identity when visual and array ordering changes", async () => {
    const m = createDemo(),
      a = await run(m);
    m.nodes.reverse();
    m.links.reverse();
    m.nodes.forEach((n) => (n.position.x += 200));
    const b = await run(m);
    for (const n of a.nodes)
      expect(b.nodes.find((x) => x.id === n.id)!.pressureM).toBeCloseTo(
        n.pressureM,
        5,
      );
    for (const l of a.links)
      expect(b.links.find((x) => x.id === l.id)!.flowLps).toBeCloseTo(
        l.flowLps,
        5,
      );
  });
  it("calculates the remaining parallel pump instead of inventing an equal split", async () => {
    const m = createDemo(1),
      a = await run(m);
    m.links.find((l) => l.id === "PUMP_1")!.status = "closed";
    const b = await run(m);
    expect(b.status).toBe("calculated");
    expect(b.links.find((l) => l.id === "PUMP_1")!.flowLps).toBeCloseTo(0, 7);
    expect(b.links.find((l) => l.id === "PUMP_2")!.flowLps).toBeGreaterThan(
      a.links.find((l) => l.id === "PUMP_2")!.flowLps,
    );
  });
  it("responds to the actual pump curve", async () => {
    const m = createDemo(),
      a = await run(m);
    m.pumpCurves[0].points.forEach((p) => (p.head += 20));
    const b = await run(m);
    expect(b.status).toBe("calculated");
    expect(b.nodes.find((n) => n.id === "DISCHARGE")!.headM).toBeGreaterThan(
      a.nodes.find((n) => n.id === "DISCHARGE")!.headM + 10,
    );
  });
  it("does not manufacture PRV outlet pressure when source head is insufficient", async () => {
    const m = createDemo();
    m.links.find((l) => l.type === "prv")!.setting = 200;
    const r = await run(m);
    expect(r.status).toBe("calculated");
    const out = r.nodes.find((n) => n.id === "PRV_OUT")!,
      up = r.nodes.find((n) => n.id === "PRV_IN")!;
    expect(out.pressureM).toBeLessThan(200);
    expect(out.headM).toBeLessThanOrEqual(up.headM + 0.001);
  });
  it("returns no pressure or flow numbers for an invalid disconnected network", async () => {
    const m = createDemo();
    m.links.find((l) => l.type === "pump")!.status = "closed";
    const r = await run(m);
    expect(r.status).toBe("invalid");
    expect(r.disconnected).toContain("FLOOR_2");
    expect(r.nodes).toEqual([]);
    expect(r.links).toEqual([]);
  });
  it("records real solver failures without reusing earlier results", async () => {
    const m = createDemo(),
      a = await run(m);
    expect(a.status).toBe("calculated");
    const impossible: HydraulicModel = {
      nodes: m.nodes
        .slice(0, 2)
        .map((n) => ({ ...n, type: "reservoir" as const })),
      links: [
        {
          ...m.links[0],
          from: "SOURCE",
          to: "SUCTION",
          type: "prv",
          setting: 20,
        },
      ],
      pumpCurves: [],
      settings: m.settings,
    };
    // By-pass no validation: this invalid PRV is correctly rejected before the toolkit.
    const invalid = await run(impossible);
    expect(invalid.status).toBe("invalid");
    expect(invalid.nodes).toHaveLength(0);
    // A two-node network without a junction is structurally reachable but rejected by EPANET itself.
    impossible.links[0].type = "pipe";
    const failed = await run(impossible);
    expect(failed.status).toBe("solver_failed");
    expect(failed.issues.some((i) => i.code === "solver")).toBe(true);
    expect(failed.nodes).toHaveLength(0);
    expect(failed.links).toHaveLength(0);
  });
  it("computes both static and residual states from identical equipment inputs", async () => {
    const m = createDemo();
    m.settings.mode = "static";
    const a = await run(m);
    m.settings.mode = "residual";
    const b = await run(m);
    expect(a.status).toBe("calculated");
    expect(b.status).toBe("calculated");
    expect(
      a.nodes
        .filter((n) => n.id.startsWith("FLOOR"))
        .every((n) => Math.abs(n.demandLps) < 1e-7),
    ).toBe(true);
    expect(
      b.nodes
        .filter((n) => n.id.startsWith("FLOOR"))
        .every((n) => n.demandLps > 0),
    ).toBe(true);
  });
});
