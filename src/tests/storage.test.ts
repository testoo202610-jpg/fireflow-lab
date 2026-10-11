import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { createDemo } from "../demo/projects";
import {
  saveProject,
  loadProject,
  restoreActive,
  exportProject,
  parseProject,
  deleteProject,
  duplicateProject,
} from "../storage/projects";
import {
  snapshotScenario,
  duplicateScenario,
  compareScenarios,
} from "../features/scenarios/scenarios";
import { hydraulicSignature } from "../types/network";
describe("durable project and input snapshots", () => {
  it("saves, restores, reopens and deletes in IndexedDB", async () => {
    const p = createDemo(2);
    await saveProject(p);
    const read = await loadProject(p.id);
    expect(read?.nodes.find((n) => n.id === "FLOOR_9")?.fieldPressureBar).toBe(
      6.6,
    );
    expect((await restoreActive())?.id).toBe(p.id);
    await deleteProject(p.id);
    expect(await loadProject(p.id)).toBeNull();
  });
  it("round-trips complete project JSON with explicit schema version", () => {
    const p = createDemo();
    p.scenarios = [snapshotScenario("baseline", p, null)];
    expect(parseProject(exportProject(p))).toEqual(p);
  });
  it("rejects malformed import and incompatible schema versions", () => {
    expect(() => parseProject("{")).toThrow();
    expect(() =>
      parseProject(JSON.stringify({ ...createDemo(), schemaVersion: 2 })),
    ).toThrow(/schema/);
    expect(() =>
      parseProject(
        JSON.stringify({ ...createDemo(), nodes: [{ id: "<script>" }] }),
      ),
    ).toThrow();
  });
  it("duplicates a scenario without aliasing original inputs", () => {
    const p = createDemo();
    const s = snapshotScenario("baseline", p, null),
      copy = duplicateScenario(s);
    copy.input.links[0].diameter = 500;
    expect(s.input.links[0].diameter).toBe(200);
    expect(copy.id).not.toBe(s.id);
    expect(
      compareScenarios(s, copy).nodes.every(
        (n) => n.a === null && n.b === null,
      ),
    ).toBe(true);
  });
  it("duplicates a project with a new identity and independent nested data", () => {
    const p = createDemo(),
      copy = duplicateProject(p);
    copy.nodes[0].level = 9;
    expect(p.nodes[0].level).toBe(5);
    expect(copy.id).not.toBe(p.id);
  });
  it("does not invalidate hydraulics when only position or display unit changes", () => {
    const p = createDemo(),
      signature = hydraulicSignature(p);
    p.nodes[0].position.x = 500;
    p.settings.pressureUnit = "psi";
    expect(hydraulicSignature(p)).toBe(signature);
    p.nodes[1].elevation = 20;
    expect(hydraulicSignature(p)).not.toBe(signature);
  });
});
