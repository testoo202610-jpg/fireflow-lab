import {
  Project as EpanetProject,
  NodeProperty,
  LinkProperty,
  InitHydOption,
  AnalysisStatistic,
} from "epanet-js";
import { Workspace } from "epanet-js/slim";
import { EpanetEngine } from "epanet-js/engines/v2.2";
import { toInp } from "../adapters/inp";
import { validateModel, disconnectedNodes } from "../validation";
import {
  hydraulicSignature,
  modelOf,
  newId,
  type HydraulicModel,
  type SimulationResult,
} from "../../types/network";
import { ENGINE_NAME } from "./version";
export { ENGINE_NAME } from "./version";
export async function simulate(
  input: HydraulicModel,
  wasmBinary?: Uint8Array,
): Promise<SimulationResult> {
  const m = modelOf(input);
  const result: SimulationResult = {
    id: newId("R"),
    createdAt: new Date().toISOString(),
    engine: ENGINE_NAME,
    status: "invalid",
    signature: hydraulicSignature(m),
    input: m,
    issues: validateModel(m),
    disconnected: disconnectedNodes(m),
    nodes: [],
    links: [],
    iterations: 0,
    relativeError: 0,
    report: "",
  };
  if (result.issues.some((i) => i.severity === "error")) return result;
  let model: EpanetProject | undefined,
    opened = false,
    hydOpen = false;
  try {
    const ws = new Workspace();
    await ws.loadModuleVersion(() =>
      EpanetEngine(wasmBinary ? { wasmBinary } : undefined),
    );
    ws.writeFile("network.inp", toInp(m));
    model = new EpanetProject(ws);
    model.open("network.inp", "report.rpt", "output.bin");
    opened = true;
    model.openH();
    hydOpen = true;
    model.initH(InitHydOption.SaveAndInit);
    model.runH();
    result.iterations = model.getStatistic(AnalysisStatistic.Iterations);
    result.relativeError = model.getStatistic(AnalysisStatistic.RelativeError);
    for (const n of m.nodes) {
      const index = model.getNodeIndex(n.id);
      result.nodes.push({
        id: n.id,
        headM: model.getNodeValue(index, NodeProperty.Head),
        pressureM: model.getNodeValue(index, NodeProperty.Pressure),
        demandLps: model.getNodeValue(index, NodeProperty.Demand),
      });
    }
    const heads = new Map(result.nodes.map((n) => [n.id, n.headM]));
    for (const l of m.links) {
      const index = model.getLinkIndex(l.id);
      result.links.push({
        id: l.id,
        flowLps: model.getLinkValue(index, LinkProperty.Flow),
        velocityMps: model.getLinkValue(index, LinkProperty.Velocity),
        headlossM: (heads.get(l.from) ?? 0) - (heads.get(l.to) ?? 0),
        status: model.getLinkValue(index, LinkProperty.Status),
      });
    }
    model.closeH();
    hydOpen = false;
    model.close();
    opened = false;
    result.report = ws.readFile("report.rpt");
    if (
      !Number.isFinite(result.relativeError) ||
      result.relativeError > 0.001 ||
      /unbalanced|cannot solve/i.test(result.report)
    )
      throw new Error(
        `Hydraulics did not converge (relative error ${result.relativeError})`,
      );
    if (
      result.nodes.some(
        (n) => !Number.isFinite(n.pressureM) || !Number.isFinite(n.headM),
      ) ||
      result.links.some((l) => !Number.isFinite(l.flowLps))
    )
      throw new Error("Non-finite hydraulic result");
    // EPANET reports warning text; preserve it in the result rather than silently suppress it.
    for (const warning of result.report
      .split("\n")
      .filter((line) => /WARNING/i.test(line)))
      result.issues.push({
        severity: "warning",
        code: "epanet_warning",
        message: warning.trim(),
      });
    for (const n of result.nodes)
      if (
        n.pressureM < 0 &&
        m.nodes.find((x) => x.id === n.id)?.type !== "reservoir"
      )
        result.issues.push({
          severity: "warning",
          code: "negative_pressure",
          elementId: n.id,
          message: `Negative gauge pressure ${n.pressureM.toFixed(3)} m / ضغط سالب`,
        });
    result.status = "calculated";
  } catch (error) {
    result.status = "solver_failed";
    result.nodes = [];
    result.links = [];
    result.issues.push({
      severity: "error",
      code: "solver",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (hydOpen)
      try {
        model?.closeH();
      } catch {
        /* original failure retained */
      }
    if (opened)
      try {
        model?.close();
      } catch {
        /* original failure retained */
      }
  }
  return result;
}
