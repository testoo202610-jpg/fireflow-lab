import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { createDemo } from "../demo/projects";
import { simulate } from "../hydraulic/epanet/engine";
describe("EPANET real engine smoke", () => {
  for (let i = 0; i < 3; i++)
    it(`solves demo ${i}`, async () => {
      const result = await simulate(
        createDemo(i),
        new Uint8Array(readFileSync("public/epanet-2.2.wasm")),
      );
      if (result.status !== "calculated") console.log(result.issues);
      expect(result.status).toBe("calculated");
      expect(result.nodes.length).toBeGreaterThan(4);
      expect(
        result.links.find((l) => l.id === "PUMP_1")?.flowLps,
      ).toBeGreaterThan(0);
    });
});
