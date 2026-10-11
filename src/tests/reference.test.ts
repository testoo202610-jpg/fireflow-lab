import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import {
  Project,
  NodeProperty,
  LinkProperty,
  InitHydOption,
  TimeParameter,
} from "epanet-js";
import { Workspace } from "epanet-js/slim";
import { EpanetEngine } from "epanet-js/engines/v2.2";
it("regresses official OWA Net1 against its independently published binary output", async () => {
  const ws = new Workspace();
  await ws.loadModuleVersion(() =>
    EpanetEngine({
      wasmBinary: new Uint8Array(readFileSync("public/epanet-2.2.wasm")),
    }),
  );
  expect(ws.version).toBe(20200);
  const reference = readFileSync("src/tests/fixtures/net1.out");
  const count = (i: number) => reference.readInt32LE(i * 4);
  expect(count(0)).toBe(516114521);
  const n = count(2),
    t = count(3),
    l = count(4),
    p = count(5),
    idsOffset = 60 + 240 + 260 + 260 + 32 + 32;
  const readID = (offset: number) =>
    reference
      .subarray(offset, offset + 32)
      .toString()
      .split("\0")[0];
  const dataOffset =
    idsOffset + 32 * (n + l) + 12 * l + 8 * t + 4 * n + 8 * l + 28 * p + 4;
  ws.writeFile("net1.inp", readFileSync("src/tests/fixtures/net1.inp"));
  const model = new Project(ws);
  model.open("net1.inp", "net1.rpt", "net1.bin");
  model.setTimeParameter(TimeParameter.Duration, 0);
  model.openH();
  model.initH(InitHydOption.InitFlow);
  model.runH();
  try {
    for (let i = 0; i < n; i++) {
      const id = readID(idsOffset + 32 * i),
        expected = reference.readFloatLE(dataOffset + 8 * n + 4 * i),
        actual = model.getNodeValue(
          model.getNodeIndex(id),
          NodeProperty.Pressure,
        );
      expect(Math.abs(actual - expected), `Pressure ${id} (psi)`).toBeLessThan(
        0.15,
      );
    }
    for (let i = 0; i < l; i++) {
      const id = readID(idsOffset + 32 * n + 32 * i),
        expected = reference.readFloatLE(dataOffset + 16 * n + 4 * i),
        actual = model.getLinkValue(model.getLinkIndex(id), LinkProperty.Flow);
      expect(Math.abs(actual - expected), `Flow ${id} (GPM)`).toBeLessThan(2);
    }
  } finally {
    model.closeH();
    model.close();
  }
});
